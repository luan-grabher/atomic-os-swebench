/**
 * gates/contract.ts — the FROZEN gate interface.
 *
 * Every dissolvable protocol becomes ONE GateModule of this exact shape, so the
 * convergence crivo runs them uniformly in two directions:
 *   - WRITE direction (atomic_converge / atomicWrite floor): refuse the red.
 *   - READ direction (the lens): report the red over the whole repo.
 *
 * A gate states ONE exoneration-free fact: a wire resolves to a real thing, or it
 * dangles. No language server, no daemon, no human. `static` gates are pure
 * byte/edge facts; `dynamic` gates need execution and are honestly deferred.
 * A gate that cannot decide from the bytes it has returns `unjudged: true` —
 * never red-by-guess, never green-by-assumption.
 *
 * ALL gates use makeContext() below so resolution semantics never diverge.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
/**
 * The ONE shared context builder. Every gate consumes this, so the meaning of
 * "exists" / "resolves" is identical across all 9 gates and across both directions.
 */
export function makeContext(repoRoot, overlay, changedFiles, lensMode = false) {
    const norm = (p) => p.replaceAll('\\', '/');
    const priorOf = (rel) => {
        if (lensMode)
            return ''; // lens judges committed bytes absolutely — no prior
        try {
            return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
        }
        catch {
            return ''; // brand-new file → no prior → every wire is this write's claim
        }
    };
    const existsInTree = (rel) => overlay.has(norm(rel)) || fs.existsSync(path.join(repoRoot, rel));
    const readFile = (rel) => {
        const o = overlay.get(norm(rel));
        if (o !== undefined)
            return o;
        try {
            return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
        }
        catch {
            return null;
        }
    };
    // The candidate-extension probe, shared by the `.`-relative branch AND the
    // tsconfig path-alias branch so "resolves" means exactly one thing. `base` is a
    // repo-relative posix path with NO extension assumed; we try it verbatim then
    // the .ts/.tsx/.js/.jsx/.mjs/.cjs/.json + /index.* shapes a TS/bundler resolver
    // would, plus the .js→.ts/.tsx rewrite (TS lets you import a sibling .ts via a
    // '.js' specifier). Returns the FIRST candidate that exists in overlay-or-disk,
    // else null. This is the SAME list the relative branch always used — extracting
    // it is behaviour-preserving for `.` specifiers (byte-identical candidate set).
    const probeBase = (base) => {
        const cands = [
            base, `${base}.ts`, `${base}.tsx`, `${base}.mts`, `${base}.cts`,
            `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, `${base}.json`,
            `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.mts`, `${base}/index.cts`,
            `${base}/index.js`, `${base}/index.jsx`, `${base}/index.mjs`, `${base}/index.cjs`,
        ];
        // allowImportingTsExtensions / moduleResolution bundler|node16: an explicit
        // .js/.jsx/.mjs/.cjs specifier may resolve to the corresponding TS source on disk.
        const rewrite = {
            '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'],
        };
        for (const [from, tos] of Object.entries(rewrite)) {
            if (base.endsWith(from))
                for (const to of tos)
                    cands.push(`${base.slice(0, -from.length)}${to}`);
        }
        return cands.find((c) => existsInTree(c)) ?? null;
    };
    // Find the package root (frontend/backend/worker) the importing file lives under,
    // for the KLOEL '@/*' -> '<package>/src/*' convention. null if the file is not
    // inside one of the three workspace packages (then '@/' cannot be expanded by
    // convention and only an explicit tsconfig `paths` entry can resolve it).
    const kloelPkgRoot = (fromRel) => {
        for (const pkg of ['frontend', 'backend', 'worker']) {
            if (fromRel.startsWith(`${pkg}/`))
                return pkg;
        }
        return null;
    };
    // Read the nearest tsconfig.json's compilerOptions.paths, walking UP from the
    // importing file's directory to repoRoot. Returns the parsed paths map (alias
    // pattern -> string[] of substitution patterns), each substitution made
    // repo-relative by joining it onto the tsconfig's own directory (+ baseUrl,
    // default '.'). Tolerant JSON parse (strips // /* */ comments and trailing
    // commas) so a real-but-comment-bearing tsconfig still yields its paths; a
    // tsconfig we cannot parse contributes NO aliases (→ unresolvable, not red).
    // #11 — memoize the walk-up + tolerant JSON parse by starting directory. Without
    // this, a lens over N files re-walked + re-parsed the tsconfig tree once per import
    // specifier (O(files × imports × depth) JSON.parse). The tree is stable within one
    // makeContext run, so caching by start dir is sound and turns it O(distinct dirs).
    const tsconfigPathsCache = new Map();
    const tsconfigPathsFor = (fromRel) => {
        const startDir = path.posix.dirname(norm(fromRel));
        const cached = tsconfigPathsCache.get(startDir);
        if (cached)
            return cached;
        let dir = startDir;
        const stop = '.'; // repoRoot in posix-relative space
        // Walk up: fromDir, parent, ... until repoRoot.
        const visited = new Set();
        for (;;) {
            if (visited.has(dir))
                break;
            visited.add(dir);
            // B4: also honor jsconfig.json (pure-JS projects) — identical compilerOptions.paths/
            // baseUrl schema. Read tsconfig.json first; fall back to jsconfig.json only when absent,
            // so TS projects are unaffected (additive — cannot regress existing resolution).
            const tsCfgRel = dir === stop ? 'tsconfig.json' : `${dir}/tsconfig.json`;
            const jsCfgRel = dir === stop ? 'jsconfig.json' : `${dir}/jsconfig.json`;
            const raw = readFile(tsCfgRel) ?? readFile(jsCfgRel);
            if (raw !== null) {
                try {
                    const stripped = raw
                        .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
                        .replace(/(^|[^:])\/\/[^\n]*/g, '$1') // line comments (avoid http://)
                        .replace(/,(\s*[}\]])/g, '$1'); // trailing commas
                    const parsed = JSON.parse(stripped);
                    const co = parsed.compilerOptions ?? {};
                    if (co.paths && typeof co.paths === 'object') {
                        const baseUrl = typeof co.baseUrl === 'string' ? co.baseUrl : '.';
                        const cfgDir = dir === stop ? '' : dir;
                        const out = {};
                        for (const [pat, subs] of Object.entries(co.paths)) {
                            if (!Array.isArray(subs))
                                continue;
                            out[pat] = subs
                                .filter((s) => typeof s === 'string')
                                .map((s) => path.posix.normalize(path.posix.join(cfgDir, baseUrl, s)));
                        }
                        tsconfigPathsCache.set(startDir, out);
                        return out;
                    }
                }
                catch {
                    // unparseable tsconfig → no aliases from here; keep walking up
                }
            }
            if (dir === stop)
                break;
            const parent = path.posix.dirname(dir);
            dir = parent === '' || parent === '.' ? stop : parent;
        }
        const empty = {};
        tsconfigPathsCache.set(startDir, empty);
        return empty;
    };
    // Expand a tsconfig `paths` alias for `spec`. Supports the two TS forms: an
    // exact key (no '*') and a single-'*' prefix pattern ("@/*": ["./src/*"]). The
    // '*' capture is substituted into each target; we probe targets in declared
    // order and return the first that resolves. Non-matching → null.
    const resolveTsconfigAlias = (fromRel, spec) => {
        const paths = tsconfigPathsFor(fromRel);
        for (const [pat, subs] of Object.entries(paths)) {
            const star = pat.indexOf('*');
            if (star === -1) {
                if (pat !== spec)
                    continue;
                for (const sub of subs) {
                    const hit = probeBase(sub);
                    if (hit)
                        return hit;
                }
                continue;
            }
            const prefix = pat.slice(0, star);
            const suffix = pat.slice(star + 1);
            if (!spec.startsWith(prefix) || !spec.endsWith(suffix))
                continue;
            const captured = spec.slice(prefix.length, spec.length - suffix.length);
            for (const sub of subs) {
                const target = path.posix.normalize(sub.replace('*', captured));
                const hit = probeBase(target);
                if (hit)
                    return hit;
            }
        }
        return null;
    };
    const resolveRelImport = (fromRel, spec) => {
        if (!spec.startsWith('.')) {
            // NON-'.' specifier. Was green-by-skip (return null). Now: try tsconfig
            // path-alias resolution (red class #6) BEFORE giving up. Two sources:
            //   (1) the nearest tsconfig.json's compilerOptions.paths — the general,
            //       config-driven truth (handles any project's alias, not just '@/').
            //   (2) KLOEL's '@/*' -> '<package>/src/*' convention — applied when tsconfig
            //       paths did not resolve it (backend/worker use '@/' by convention with
            //       no explicit `paths` entry). Keyed off the importing file's package.
            // If neither expands+probes to a real file, fall through to null. null now
            // means BOTH "bare package specifier (supply-chain's concern)" AND "alias
            // that expands to nothing (dangling — the connection gate will red it)". The
            // caller distinguishes by whether the spec is alias-shaped; here we only
            // state the resolution fact: an alias to a real file resolves, else null.
            const viaTsconfig = resolveTsconfigAlias(fromRel, spec);
            if (viaTsconfig !== null)
                return viaTsconfig;
            if (spec.startsWith('@/')) {
                const pkg = kloelPkgRoot(norm(fromRel));
                const rest = spec.slice(2);
                // Inside a package → that package's src. Outside (e.g. a script) → try all
                // three packages' src (sound: the '@/' could legitimately mean any of them
                // depending on which tsconfig governs the file's compilation).
                const roots = pkg ? [`${pkg}/src`] : ['frontend/src', 'backend/src', 'worker/src'];
                for (const r of roots) {
                    const hit = probeBase(path.posix.normalize(`${r}/${rest}`));
                    if (hit)
                        return hit;
                }
            }
            return null; // bare specifier OR unresolvable alias → not a resolved relative fact
        }
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(norm(fromRel)), spec));
        return probeBase(base);
    };
    return { repoRoot, overlay, changedFiles, lensMode, existsInTree, readFile, resolveRelImport, priorOf };
}
