/**
 * gates/algebra.ts — the VERIFIED-EDIT ALGEBRA: commute modulo invariant.
 *
 * The convergence gates decide whether ONE write is admissible. This decides a
 * RELATION between TWO verified edits: do they interfere?  Not "do their text
 * spans overlap" (git/Darcs/Pijul, OT/CRDT all stop there) but "does either edit
 * touch a locus the other's gate-facts READ to be discharged" — a semantic
 * independence judged over the same resolution machinery the gates use.
 *
 * THEOREM (sound confluence). For verified patches P₁,P₂ with edited spans
 * spans(Pᵢ) and resolution-closure Cl(Pᵢ) (the loci every gate read to discharge
 * Pᵢ's obligations — here over-approximated as the file plus its transitive
 * relative/`@`-alias import closure):
 *
 *   commute(P₁,P₂) ⟺ spans(P₁)∩spans(P₂)=∅ ∧ spans(P₁)∩Cl(P₂)=∅ ∧ spans(P₂)∩Cl(P₁)=∅
 *
 * ⟹ apply(apply(S,P₁),P₂) = apply(apply(S,P₂),P₁) and both discharge Σ(P₁)∪Σ(P₂).
 * The verified patches under `commute` form a partial commutative monoid on the
 * green manifold; its identity is the empty splice.
 *
 * SOUNDNESS direction. Cl is an OVER-approximation (file + full transitive import
 * closure, including the `@/` path alias the connection gate treats as bare). A
 * coarser-than-true closure can only ADD coupling, never hide it, so `commute`
 * never falsely claims independence — it can only be too conservative (refuse a
 * merge that was actually safe). It never green-lights an unsafe merge. Where an
 * import cannot be resolved statically (dynamic require, reflective call), the
 * closure simply does not contain that edge — the conservative cost is paid by
 * the per-FILE granularity, which is strictly larger than the per-symbol truth.
 *
 * Operating it (the CLI block at the bottom): point this at .atomic/traces and it
 * reports the commute rate, the real coupling edges, and a greedy concurrent-batch
 * coloring — the multi-agent concurrency primitive ("which edits may merge without
 * an integration test") AND the label-free training signal ("these two are coupled
 * at locus X") in one object.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
// ── CACHE PERSISTENCE FOR CLOSURE COMPUTATION (CRIT-011) ────────────────────
// Persistent on-disk cache for import resolution to improve performance on large repos.
// Cache is stored per-repo and keyed by file path + mtime for invalidation.
const CACHE_DIR_NAME = '.atomic-closure-cache';
function getCacheDir(repoRoot) {
    return path.join(repoRoot, CACHE_DIR_NAME);
}
function getCachePath(repoRoot) {
    return path.join(getCacheDir(repoRoot), 'closure-cache.json');
}
/**
 * Load persistent cache from disk for a repository.
 * Returns null if cache doesn't exist or is invalid.
 */
function loadPersistentCache(repoRoot) {
    const cachePath = getCachePath(repoRoot);
    if (!fs.existsSync(cachePath))
        return null;
    try {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (data.version !== 1)
            return null; // Version mismatch
        const cache = new Map();
        for (const [rel, entry] of Object.entries(data.files)) {
            const absPath = path.join(repoRoot, rel);
            // Invalidate if file was modified since cache was written
            if (fs.existsSync(absPath)) {
                try {
                    const currentMtime = fs.statSync(absPath).mtimeMs;
                    if (currentMtime > entry.mtime)
                        continue; // File modified, invalidate
                }
                catch {
                    continue; // Can't stat, skip
                }
            }
            cache.set(rel, new Set(entry.imports));
        }
        return cache;
    }
    catch {
        return null; // Corrupted cache, ignore
    }
}
/**
 * Save cache to disk for persistence across calls.
 * Only saves entries that are still valid (file exists and mtime matches).
 */
function savePersistentCache(repoRoot, cache) {
    const cacheDir = getCacheDir(repoRoot);
    const cachePath = getCachePath(repoRoot);
    try {
        // Ensure cache directory exists
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        const manifest = {
            version: 1,
            files: {}
        };
        // Convert cache to serializable format with mtime validation
        for (const [rel, imports] of cache) {
            const absPath = path.join(repoRoot, rel);
            if (!fs.existsSync(absPath))
                continue; // File no longer exists
            try {
                const mtime = fs.statSync(absPath).mtimeMs;
                manifest.files[rel] = {
                    imports: Array.from(imports),
                    mtime
                };
            }
            catch {
                // Can't stat, skip this entry
            }
        }
        fs.writeFileSync(cachePath, JSON.stringify(manifest, null, 2), 'utf8');
    }
    catch {
        // Silently ignore write failures (permissions, etc.)
    }
}
const IMPORT_RE = /(?:from\s*|require\(\s*|import\(\s*|import\s+)['"]([^'"]+)['"]/g;
function tryBase(repoRoot, base) {
    const b = base.replaceAll('\\', '/');
    const cands = [
        b, `${b}.ts`, `${b}.tsx`, `${b}.js`, `${b}.jsx`, `${b}.mjs`, `${b}.cjs`, `${b}.json`,
        `${b}/index.ts`, `${b}/index.tsx`, `${b}/index.js`,
    ];
    if (b.endsWith('.js'))
        cands.push(`${b.slice(0, -3)}.ts`, `${b.slice(0, -3)}.tsx`);
    return cands.find((c) => fs.existsSync(path.join(repoRoot, c))) ?? null;
}
/**
 * Resolve a relative or `@/`-alias import to a repo-relative file. Mirrors
 * gates/contract.ts makeContext.resolveRelImport for the `.`-relative case, and
 * additionally resolves KLOEL's `@/*` -> `<package>/src/*` alias so the closure
 * is a SOUND over-approximation (the connection gate intentionally treats `@/`
 * as bare; for interference we want the larger, safer closure).
 */
export function resolveImport(repoRoot, fromRel, spec) {
    if (spec.startsWith('@/')) {
        const rest = spec.slice(2);
        const roots = fromRel.startsWith('frontend/')
            ? ['frontend/src/']
            : fromRel.startsWith('backend/')
                ? ['backend/src/']
                : fromRel.startsWith('worker/')
                    ? ['worker/src/']
                    : ['frontend/src/', 'backend/src/', 'worker/src/'];
        for (const r of roots) {
            const hit = tryBase(repoRoot, r + rest);
            if (hit)
                return hit;
        }
        return null;
    }
    if (!spec.startsWith('.'))
        return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel.replaceAll('\\', '/')), spec));
    return tryBase(repoRoot, base);
}
function fileImports(repoRoot, rel, cache) {
    const hit = cache.get(rel);
    if (hit)
        return hit;
    const out = new Set();
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        try {
            const txt = fs.readFileSync(abs, 'utf8');
            for (const m of txt.matchAll(IMPORT_RE)) {
                const t = resolveImport(repoRoot, rel, m[1]);
                if (t)
                    out.add(t);
            }
        }
        catch {
            /* unreadable → empty closure for this node (conservative direction is handled by per-file granularity) */
        }
    }
    cache.set(rel, out);
    return out;
}
/** Transitive import closure of `rel`, capped at maxNodes (capped=true ⇒ closure is a lower bound). */
export function closureOf(repoRoot, rel, cache = new Map(), maxNodes = 10000) {
    // CRIT-011: Load persistent cache if no cache provided
    if (cache.size === 0) {
        const persistentCache = loadPersistentCache(repoRoot);
        if (persistentCache) {
            // Merge persistent cache with provided cache
            for (const [key, value] of persistentCache) {
                if (!cache.has(key)) {
                    cache.set(key, new Set(value));
                }
            }
        }
    }
    const seen = new Set([rel]);
    const stack = [rel];
    let capped = false;
    while (stack.length) {
        const cur = stack.pop();
        for (const t of fileImports(repoRoot, cur, cache)) {
            if (!seen.has(t)) {
                if (seen.size >= maxNodes) {
                    capped = true;
                    break;
                }
                seen.add(t);
                stack.push(t);
            }
        }
        if (capped)
            break;
    }
    // CRIT-011: Save cache to disk for persistence across calls
    // Only save if we loaded persistent cache initially (indicates caller wants persistence)
    if (cache.size > 0) {
        savePersistentCache(repoRoot, cache);
    }
    return { set: seen, capped };
}
// ── PER-SYMBOL CLOSURE (precision tightening, soundness-preserving) ──────────
//
// closureOf above is the per-FILE closure: file + the transitive closure of EVERY
// import the file declares. That is sound but coarse — editing one byte of a file
// drags in the closure of imports the edit never touches, manufacturing FALSE
// couplings (e.g. two edits to unrelated functions in the same hub file that import
// dozens of modules are reported coupled to all of them). The per-SYMBOL closure
// tightens this: it scopes the closure to the import targets the EDITED byte-spans
// actually reference, computed with a read-only static read of the file at those
// spans. Fewer false couplings ⇒ a higher, TRUER commute rate.
//
// SOUNDNESS (the only thing that matters here). The per-symbol set is, by
// construction, a SUBSET of the per-file set: it is `{file} ∪ Cl(import targets whose
// bound name is referenced inside an edited span) ∪ {side-effect import targets}`,
// and every term is one the per-file closure already contains. A subset of the sound
// over-approximation is still sound for the SOUNDNESS direction the theorem needs
// (Cl over-approximates the loci the gates read), because removing an import target
// the edit provably does not reference can only DROP a coupling edge that was a false
// positive of the coarser granularity — it can never hide a real one. Whenever symbol
// resolution is UNCERTAIN (file unreadable, a namespace `import * as ns` binding is
// touched, a dynamic `import()`/`require()` sits inside an edited span, or any import
// specifier fails to resolve to a repo file), we DO NOT guess a tighter set — we fall
// straight back to the full per-file `closureOf`. Never under-approximate.
/** A `import {a, b as c}` / `import D` / `import * as N` / side-effect import, parsed. */
const NAMED_IMPORT_RE = /import\s+(?:type\s+)?(?:([A-Za-z_$][\w$]*)\s*,\s*)?(?:\*\s*as\s+([A-Za-z_$][\w$]*)|\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /(?:^|[\n;])\s*import\s+['"]([^'"]+)['"]/g;
const DEFAULT_ONLY_IMPORT_RE = /import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
const IDENT_RE = /[A-Za-z_$][\w$]*/g;
const DYNAMIC_IN_SPAN_RE = /\b(?:require|import)\s*\(/;
/**
 * Parse `rel`'s imports into a binding map. Returns `null` to signal "fall back to the
 * file-level closure" whenever the file cannot be read OR a `import * as ns` namespace
 * binding exists (a member access `ns.foo` cannot be pinned to a single symbol with a
 * regex read, so we conservatively decline the precision). The map's keys are the
 * locally-bound names; values are the resolved repo-relative target files. Side-effect
 * imports (no binding) are returned separately so ordering coupling is always retained.
 */
function importBindings(repoRoot, rel) {
    const abs = path.join(repoRoot, rel);
    let txt;
    try {
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile())
            return null;
        txt = fs.readFileSync(abs, 'utf8');
    }
    catch {
        return null; // unreadable ⇒ uncertain ⇒ fall back to file-level closure
    }
    const byName = new Map();
    const sideEffects = new Set();
    // Named / default / namespace imports.
    for (const m of txt.matchAll(NAMED_IMPORT_RE)) {
        const leadingDefault = m[1];
        const namespaceBind = m[2];
        const namedBlock = m[3];
        const spec = m[4];
        if (namespaceBind)
            return null; // `import * as ns` — member access unpinnable ⇒ decline precision
        const target = resolveImport(repoRoot, rel, spec);
        if (!target)
            continue; // bare/package import (e.g. '@nestjs/...') has no repo file ⇒ no coupling edge
        if (leadingDefault)
            byName.set(leadingDefault, target);
        if (namedBlock) {
            for (const part of namedBlock.split(',')) {
                const name = part.trim();
                if (!name)
                    continue;
                // `orig as alias` ⇒ the LOCAL binding is the alias; `orig` alone ⇒ binding is orig
                const asMatch = /\bas\b\s+([A-Za-z_$][\w$]*)/.exec(name);
                const local = asMatch ? asMatch[1] : name.replace(/^type\s+/, '').trim();
                if (local)
                    byName.set(local, target);
            }
        }
    }
    // Bare `import 'x'` default-only forms the NAMED_IMPORT_RE may have skipped.
    for (const m of txt.matchAll(DEFAULT_ONLY_IMPORT_RE)) {
        const target = resolveImport(repoRoot, rel, m[2]);
        if (target && !byName.has(m[1]))
            byName.set(m[1], target);
    }
    // Side-effect-only imports: no binding, but the ordering of their side effects is a
    // real coupling locus, so we always keep their targets in the per-symbol closure.
    for (const m of txt.matchAll(SIDE_EFFECT_IMPORT_RE)) {
        const target = resolveImport(repoRoot, rel, m[1]);
        if (target)
            sideEffects.add(target);
    }
    // FASE-2 (T3 external-corpus finding): re-exports `export ... from './x'` are part of the file's
    // surface regardless of which symbol is edited — they MUST always couple. closureOf catches them
    // via the bare `from`; per-symbol missed them, causing FALSE INDEPENDENCE on re-export hubs (e.g.
    // zustand index.ts = `export * from './react'`). Retain re-export targets like side-effect imports
    // so per-symbol stays a sound subset of per-file (never under-approximates the read-set).
    const REEXPORT_RE = /export\s+(?:type\s+)?(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/g;
    for (const m of txt.matchAll(REEXPORT_RE)) {
        const target = resolveImport(repoRoot, rel, m[1]);
        if (target)
            sideEffects.add(target);
    }
    return { byName, sideEffects };
}
/**
 * Extract the identifiers the edit actually touched, from the file's bytes at the
 * edited spans. Reading the file at the byte offsets (not just the trace's text
 * samples) means the precision is computed against ground truth, and a `import()`/
 * `require()` literally inside an edited span flips the `dynamic` flag so the caller
 * declines precision (the edit could pull in an unresolved module). Returns `null`
 * when the file cannot be read (uncertain ⇒ fall back to file-level).
 */
function identifiersInSpans(repoRoot, rel, spans) {
    const abs = path.join(repoRoot, rel);
    let buf;
    try {
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile())
            return null;
        buf = fs.readFileSync(abs);
    }
    catch {
        return null;
    }
    const idents = new Set();
    let dynamic = false;
    for (const [s, e] of spans) {
        // Clamp to the post-edit buffer; widen by one byte each side so an identifier the
        // splice ends exactly on is still captured (over-capture only adds coupling — safe).
        const lo = Math.max(0, Math.min(s, buf.length) - 1);
        const hi = Math.max(lo, Math.min(e, buf.length) + 1);
        const slice = buf.toString('utf8', lo, hi);
        if (DYNAMIC_IN_SPAN_RE.test(slice))
            dynamic = true;
        for (const m of slice.matchAll(IDENT_RE))
            idents.add(m[0]);
    }
    return { idents, dynamic };
}
/**
 * Per-SYMBOL resolution closure of an edit to `rel` at `spans`. Sound by construction
 * (always a subset of `closureOf(repoRoot, rel)`); precise where it can be. Falls back
 * to the per-file closure on ANY uncertainty — see the section header. `capped` is
 * propagated from whichever closure was used (capped ⇒ lower bound ⇒ commute is an
 * upper bound, the conservative direction).
 */
export function perSymbolClosureOf(repoRoot, rel, spans, cache = new Map(), maxNodes = 10000) {
    const fileLevel = () => closureOf(repoRoot, rel, cache, maxNodes);
    if (!spans || spans.length === 0)
        return fileLevel(); // no span info ⇒ cannot scope ⇒ file-level
    const bindings = importBindings(repoRoot, rel);
    if (!bindings)
        return fileLevel(); // unreadable or namespace import ⇒ uncertain ⇒ file-level
    const touched = identifiersInSpans(repoRoot, rel, spans);
    if (!touched || touched.dynamic)
        return fileLevel(); // unreadable or dynamic import in span ⇒ file-level
    // The FIRST-HOP loci the edit directly reads: import targets whose bound name appears
    // in an edited span, plus side-effect import targets (ordering coupling is symbol-
    // independent, so always retained). NB: `rel` is deliberately NOT in this set — we
    // do not expand rel's OWN import closure (that would re-pull every sibling import and
    // collapse back to the per-file closure); rel enters `set` reflexively below instead.
    const firstHop = new Set([...bindings.sideEffects]);
    for (const id of touched.idents) {
        const target = bindings.byName.get(id);
        if (target)
            firstHop.add(target);
    }
    // set = {rel} ∪ ⋃_{t ∈ firstHop} closureOf(t). Since firstHop ⊆ imports(rel), this is
    // a SUBSET of closureOf(rel) = {rel} ∪ ⋃_{i ∈ imports(rel)} closureOf(i) — sound by
    // construction: it can only DROP a coupling edge the edit provably does not read.
    const set = new Set([rel]);
    let capped = false;
    for (const t of firstHop) {
        if (set.size >= maxNodes) {
            capped = true;
            break;
        }
        const sub = closureOf(repoRoot, t, cache, maxNodes);
        for (const x of sub.set) {
            if (set.size >= maxNodes) {
                capped = true;
                break;
            }
            set.add(x);
        }
        capped = capped || sub.capped;
    }
    return { set, capped };
}
/**
 * Build an EditFact from a parsed atomic trace JSON object. The closure is computed
 * at PER-SYMBOL precision (`perSymbolClosureOf`): it is scoped to the import targets
 * the edited byte-spans actually reference, and falls back to the full per-file
 * `closureOf` whenever symbol resolution is uncertain (no spans, unreadable file,
 * namespace import, dynamic import in a span). This tightens the over-approximation
 * — fewer false couplings, a truer commute rate — while remaining SOUND (the result
 * is always a subset of the per-file closure, so it can only drop false-positive
 * coupling edges, never hide a real one). When `modifiedZones` is absent the spans
 * are empty and the result is byte-for-byte the legacy per-file closure.
 */
export function buildEditFact(repoRoot, trace, cache = new Map(), closureProvider) {
    const file = String(trace.file ?? '').replaceAll('\\', '/');
    const spans = (trace.modifiedZones ?? [])
        .filter((z) => typeof z.byteStart === 'number' && typeof z.byteEnd === 'number')
        .map((z) => [z.byteStart, z.byteEnd]);
    // Default = TS-only per-symbol closure (preserves the empirical commute-rate band
    // every existing caller/proof asserts against). Pass a ClosureProvider (e.g.
    // closure-universal.makeUniversalClosureProvider()) to make commute language-universal
    // on demand - a SOUND superset over-approximation; spans are unused by the provider
    // path (it is per-file), so the universal path is conservative-but-correct.
    const { set, capped } = closureProvider
        ? closureProvider(repoRoot, file)
        : perSymbolClosureOf(repoRoot, file, spans, cache);
    // FASE-0.1: carry the (a) inverted-default receipt INTO the (e) algebra. A trace whose
    // negativeActionProof removed bytes contributes its proofSha256 + readLoci to the EditFact,
    // so commute() keeps the disproof obligation sound across a merge. No receipt => additive
    // edit => negativeProof: null (nothing to preserve).
    const np = trace.negativeActionProof;
    const negativeProof = np && typeof np.proofSha256 === 'string' && np.proofSha256.length > 0
        ? {
            proofSha256: np.proofSha256,
            removedByteCount: typeof np.removedByteCount === 'number' ? np.removedByteCount : 0,
            ...(Array.isArray(np.readLoci) && np.readLoci.length ? { readLoci: np.readLoci } : {}),
        }
        : null;
    // FASE-2b: carry the per-span identifier set so the same-file commute branch can decide intra-file
    // def-use coupling. identifiersInSpans returns null only when the file is unreadable => undefined =>
    // same-file independence is refused (UNJUDGED). It was already computed inside perSymbolClosureOf;
    // re-running it here is cheap (small files, OS-cached) and keeps buildEditFact the single source.
    const touchedForIdents = identifiersInSpans(repoRoot, file, spans);
    const spanIdents = touchedForIdents ? [...touchedForIdents.idents] : undefined;
    return { file, spans, closure: set, closureCapped: capped, negativeProof, spanIdents };
}
function spansOverlap(a, b) {
    for (const [s1, e1] of a)
        for (const [s2, e2] of b)
            if (s1 < e2 && s2 < e1)
                return true;
    return false;
}
/**
 * The relation. SAME file ⇒ commute iff byte-disjoint (intra-file binding coupling
 * is NOT modelled here — conservatively reported in the reason). DIFFERENT files ⇒
 * commute iff neither file lies in the other's resolution closure.
 *
 * B5 universal-closure injection — DONE (non-breaking): buildEditFact takes an
 * OPTIONAL `closureProvider`. Default = TS-only per-symbol closure, so every existing
 * caller/proof (and the empirical commute-rate band 0.50<r<0.99) is byte-identical —
 * no re-baseline needed. Pass closure-universal.makeUniversalClosureProvider() to make
 * commute language-universal (py/go/ruby/rust/java/c/cpp) on demand — a SOUND superset
 * over-approximation. The injection point the integrator deferred is now wired.
 */
export function commute(a, b) {
    if (a.file === b.file) {
        if (spansOverlap(a.spans, b.spans)) {
            return { commute: false, reason: 'same file, overlapping byte spans', sharedLocus: a.file };
        }
        // FASE-2b intra-file soundness: byte-disjoint is NOT enough — a rename in one span and a use of
        // that identifier in the other are byte-disjoint yet coupled. Use the per-span identifier sets:
        // SHARE an identifier ⇒ intra-file def-use coupling (refuse); DISJOINT (incl. both empty ⇒ no
        // identifier touched) ⇒ independent (sound modulo positional/non-identifier coupling, the
        // analogue of the cross-file dynamic-import residual); identifiers UNKNOWN (unreadable file) ⇒
        // UNJUDGED, never a guess.
        const ai = a.spanIdents;
        const bi = b.spanIdents;
        if (ai && bi) {
            if (ai.some((x) => bi.includes(x))) {
                return {
                    commute: false,
                    reason: 'same file, disjoint spans but shared identifier (intra-file def-use coupling)',
                    sharedLocus: a.file,
                };
            }
            return {
                commute: true,
                reason: 'same file, disjoint spans and disjoint span identifiers (intra-file independent)',
            };
        }
        return {
            commute: false,
            unjudged: true,
            reason: 'same file, disjoint spans but span identifiers unknown — intra-file independence not decidable; refused (UNJUDGED)',
        };
    }
    if (b.closure.has(a.file)) {
        return { commute: false, reason: `${b.file} reads ${a.file} (resolution-closure coupling)`, sharedLocus: a.file };
    }
    if (a.closure.has(b.file)) {
        return { commute: false, reason: `${a.file} reads ${b.file} (resolution-closure coupling)`, sharedLocus: b.file };
    }
    // FASE-0.1 NEGATIVE-OBLIGATION COUPLING: (a)'s disproof READ certain loci to justify the byte
    // removal (negativeProof.readLoci). If the OTHER edit touches one of those loci it can invalidate
    // the disproof even when the import closure is disjoint — a coupling (e) must see so the merge
    // keeps (a)'s justification sound. Dormant until FASE-0.2 populates readLoci.
    const aDisproofReads = a.negativeProof?.readLoci ?? [];
    const bDisproofReads = b.negativeProof?.readLoci ?? [];
    if (aDisproofReads.includes(b.file)) {
        return { commute: false, reason: `${a.file} disproof read ${b.file} (negative-obligation coupling)`, sharedLocus: b.file };
    }
    if (bDisproofReads.includes(a.file)) {
        return { commute: false, reason: `${b.file} disproof read ${a.file} (negative-obligation coupling)`, sharedLocus: a.file };
    }
    // FASE-0.3 SOUNDNESS GUARD: a capped closure is a LOWER bound, so reaching here under a
    // cap does NOT prove independence — the true (uncapped) closure may contain the coupling
    // edge we stopped before. Claiming commute:true would be a false-green. Refuse: UNJUDGED,
    // surfaced as commute:false so every consumer treats it conservatively (no merge / own batch).
    if (a.closureCapped || b.closureCapped) {
        return {
            commute: false,
            unjudged: true,
            reason: 'closure capped (lower bound) — independence not soundly decidable; refused (UNJUDGED)',
        };
    }
    const preservedDisproofs = [a.negativeProof?.proofSha256, b.negativeProof?.proofSha256].filter((s) => typeof s === 'string' && s.length > 0);
    return {
        commute: true,
        reason: 'disjoint files; neither lies in the other resolution closure',
        ...(preservedDisproofs.length ? { preservedDisproofs } : {}),
    };
}
/**
 * Greedy concurrent batches: a graph coloring of the NON-commute graph. Every
 * batch is a set of pairwise-commuting edits — safe to apply/merge concurrently
 * with a machine guarantee, no integration test. Returns arrays of indices into
 * `facts`. (Min-coloring is NP-hard; greedy gives valid, not minimal, batches.)
 */
export function concurrentBatches(facts) {
    const n = facts.length;
    const conflict = Array.from({ length: n }, () => new Array(n).fill(false));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (!commute(facts[i], facts[j]).commute) {
                conflict[i][j] = true;
                conflict[j][i] = true;
            }
        }
    }
    const color = new Array(n).fill(-1);
    const batches = [];
    for (let i = 0; i < n; i++) {
        const used = new Set();
        for (let j = 0; j < n; j++)
            if (conflict[i][j] && color[j] >= 0)
                used.add(color[j]);
        let c = 0;
        while (used.has(c))
            c++;
        color[i] = c;
        (batches[c] ??= []).push(i);
    }
    return batches;
}
/**
 * Idea #1 — produce the N-way certificate for a set of edits. `certified:true` is the machine-checked
 * guarantee the concurrentBatches docstring used to ASSERT with no proof behind it: every pair
 * commutes, so the whole set merges in any order with byte-confluence and all obligations (positive
 * and negative) preserved. UNJUDGED on any pair (honest abstention: capped closure or unknown
 * intra-file identifiers) makes certified:false — never green-by-assumption. The bounded N-way
 * executable confluence is machine-checked in gates/algebra-nway.proof.mjs; the UNBOUNDED inductive
 * metatheorem over a state-dependent read-set is future work (needs an external prover + a richer
 * model) and is deliberately NOT claimed here.
 */
export function batchCertificate(facts) {
    let pairs = 0;
    let coupled = 0;
    let unjudged = 0;
    for (let i = 0; i < facts.length; i++) {
        for (let j = i + 1; j < facts.length; j++) {
            pairs += 1;
            const v = commute(facts[i], facts[j]);
            if (v.unjudged)
                unjudged += 1;
            else if (!v.commute)
                coupled += 1;
        }
    }
    const certified = coupled === 0 && unjudged === 0;
    return {
        certified,
        pairs,
        coupled,
        unjudged,
        batches: concurrentBatches(facts),
        reason: certified
            ? 'every pair commutes => globally confluent and all obligations (positive+negative) preserved in any order'
            : `not certified: ${coupled} coupled pair(s), ${unjudged} unjudged pair(s)`,
    };
}
// ── CLI: operate the algebra on the real trace corpus ────────────────────────
const isMain = (() => {
    try {
        return path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
    }
    catch {
        return false;
    }
})();
if (isMain) {
    const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT ?? process.cwd();
    const dir = path.join(repoRoot, '.atomic', 'traces');
    const SCRATCH = /(^|\/)\.|\.smoke|\/\.atomic\//; // drop atomic's own scratch/smoke fixtures
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
    const cache = new Map();
    const facts = [];
    for (const f of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            const rel = String(d.file ?? '').replaceAll('\\', '/');
            if (!rel || SCRATCH.test(rel) || rel === 'a.ts' || rel === 'b.ts')
                continue;
            facts.push(buildEditFact(repoRoot, d, cache));
        }
        catch {
            /* skip unparseable */
        }
    }
    let pairs = 0;
    let comm = 0;
    const couplings = [];
    for (let i = 0; i < facts.length; i++) {
        for (let j = i + 1; j < facts.length; j++) {
            pairs++;
            const v = commute(facts[i], facts[j]);
            if (v.commute)
                comm++;
            else if (facts[i].file !== facts[j].file && couplings.length < 12) {
                couplings.push(`${facts[i].file}  ⟂  ${facts[j].file}   [${v.reason}]`);
            }
        }
    }
    const batches = concurrentBatches(facts);
    const rate = pairs ? comm / pairs : 0;
    process.stdout.write('VERIFIED-EDIT ALGEBRA — operated on real .atomic/traces\n');
    process.stdout.write(`  edits (real, fixtures dropped) : ${facts.length}\n`);
    process.stdout.write(`  pairs                          : ${pairs}\n`);
    process.stdout.write(`  commute rate                   : ${(rate * 100).toFixed(1)}%  (${comm}/${pairs})\n`);
    process.stdout.write(`  concurrent batches (greedy)    : ${batches.length}  (sizes ${batches.map((b) => b.length).join(',')})\n`);
    process.stdout.write(`  sample real coupling edges:\n`);
    for (const c of couplings)
        process.stdout.write(`    ${c}\n`);
}
