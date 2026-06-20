/**
 * gates/supply-chain-gate.ts — the exoneration-free SUPPLY-CHAIN fact.
 *
 * connection-gate.ts judges the RELATIVE half of every import edge and explicitly
 * leaves the bare half out (`if (!spec.startsWith('.')) return true`). This gate
 * is the missing half: it judges the BARE specifiers — packages and builtins —
 * by the same byte floor.
 *
 * THE FACT (no language server, no daemon, no version solving, no lockfile parse):
 *   A bare specifier terminates at a real installed part, or it dangles.
 *   - A Node builtin (`node:fs`, `fs`, `fs/promises`, …) terminates — true.
 *   - A package X terminates iff Node's own walk-up resolution finds a
 *     byte-existing `node_modules/X/package.json` (X = first segment, or the
 *     `@scope/name` pair; subpaths `X/sub` resolve at the package root). This is
 *     exactly the algorithm `node` uses (validated against the real installed
 *     tree: web-tree-sitter resolves in the MCP's own node_modules, zod resolves
 *     at the repo root via walk-up, a fabricated name resolves to null).
 *   - A tsconfig path-alias (`@/...`, `~/...`) is NOT a node_modules package —
 *     it is the relative/alias gate's concern — so it is skipped, never reddened.
 *
 * NEW-bare-import-only semantics (mirrors connection-gate / the byte-write floor):
 *   only specifiers present in the candidate's NEW content but absent from its
 *   prior on-disk content are this write's claim. A pre-existing unresolved import
 *   in a legacy file never blocks an unrelated edit — but no write may INTRODUCE
 *   an import of a package not present in the installed tree.
 *
 * L07 (PARADIGM-ELEVATION): Multi-language support via lang-supply-chain.mjs.
 *   Go: go.mod + GOROOT (dot-heuristic for stdlib)
 *   Rust: Cargo.toml + cargo metadata
 *   Python: pip + site-packages (exhaustive stdlib)
 *   Java: pom.xml + maven classpath
 *
 * Mutation Firewall: perception LOCATES (the import-specifier spans via real
 * import/require AST nodes, the byte-existence of package.json); this gate only
 * ASSERTS a fact. It never writes. The import specifiers come from the ONE
 * perception organ (importSpecs → token-correct tree-sitter selection), and the
 * supply-chain resolution stays pure node:path + node:module.isBuiltin over the
 * shared GateContext — same shape as the connection-gate seed so it composes into
 * convergeStatic and the byte floor.
 */
import * as path from 'node:path';
import { isBuiltin } from 'node:module';
import { importSpecs } from './perception.js';
// ============================================================================
// Multi-language supply-chain resolver (inline copy from lang-supply-chain.mjs)
// This provides per-language present-vs-dangling dependency resolution.
// ============================================================================
// Go standard library modules
const GO_STDLIB = new Set([
    'fmt', 'strings', 'os', 'io', 'errors', 'bytes', 'time', 'sync', 'context', 'net',
    'sort', 'math', 'bufio', 'encoding', 'regexp', 'strconv', 'path', 'log', 'flag',
    'testing', 'reflect', 'unicode', 'crypto', 'hash', 'container', 'runtime', 'syscall'
]);
// Rust standard library crates
const RUST_BUILTIN = new Set(['std', 'core', 'alloc', 'proc_macro', 'test']);
const RUST_LOCAL = new Set(['crate', 'self', 'super', 'Self']);
// Python standard library (exhaustive cross-version set)
const PY_STDLIB = new Set([
    'abc', 'aifc', 'annotationlib', 'antigravity', 'argparse', 'array', 'ast', 'asynchat',
    'asyncio', 'asyncore', 'atexit', 'audioop', 'base64', 'bdb', 'binascii', 'binhex',
    'bisect', 'builtins', 'bz2', 'cProfile', 'calendar', 'cgi', 'cgitb', 'chunk',
    'cmath', 'cmd', 'code', 'codecs', 'codeop', 'collections', 'colorsys', 'compileall',
    'compression', 'concurrent', 'configparser', 'contextlib', 'contextvars', 'copy',
    'copyreg', 'crypt', 'csv', 'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm',
    'decimal', 'difflib', 'dis', 'distutils', 'doctest', 'email', 'encodings',
    'ensurepip', 'enum', 'errno', 'faulthandler', 'fcntl', 'filecmp', 'fileinput',
    'fnmatch', 'formatter', 'fractions', 'ftplib', 'functools', 'gc', 'genericpath',
    'getopt', 'getpass', 'gettext', 'glob', 'graphlib', 'grp', 'gzip', 'hashlib',
    'heapq', 'hmac', 'html', 'http', 'idlelib', 'imaplib', 'imghdr', 'imp',
    'importlib', 'inspect', 'io', 'ipaddress', 'itertools', 'json', 'keyword',
    'lib2to3', 'linecache', 'locale', 'logging', 'lzma', 'macpath', 'mailbox',
    'mailcap', 'marshal', 'math', 'mimetypes', 'mmap', 'modulefinder', 'msilib',
    'msvcrt', 'multiprocessing', 'netrc', 'nis', 'nntplib', 'nt', 'ntpath',
    'nturl2path', 'numbers', 'opcode', 'operator', 'optparse', 'os', 'ossaudiodev',
    'parser', 'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil',
    'platform', 'plistlib', 'poplib', 'posix', 'posixpath', 'pprint', 'profile',
    'pstats', 'pty', 'pwd', 'py_compile', 'pyclbr', 'pydoc', 'pydoc_data',
    'pyexpat', 'queue', 'quopri', 'random', 're', 'readline', 'reprlib',
    'resource', 'rlcompleter', 'runpy', 'sched', 'secrets', 'select', 'selectors',
    'shelve', 'shlex', 'shutil', 'signal', 'site', 'smtpd', 'smtplib', 'sndhdr',
    'socket', 'socketserver', 'spwd', 'sqlite3', 'sre_compile', 'sre_constants',
    'sre_parse', 'ssl', 'stat', 'statistics', 'string', 'stringprep', 'struct',
    'subprocess', 'sunau', 'symbol', 'symtable', 'sys', 'sysconfig', 'syslog',
    'tabnanny', 'tarfile', 'telnetlib', 'tempfile', 'termios', 'test', 'textwrap',
    'this', 'threading', 'time', 'timeit', 'tkinter', 'token', 'tokenize',
    'tomllib', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle', 'turtledemo',
    'types', 'typing', 'unicodedata', 'unittest', 'urllib', 'uu', 'uuid', 'venv',
    'warnings', 'wave', 'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref',
    'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib', 'zoneinfo'
]);
// Java JDK packages
const JAVA_JDK = ['java.', 'javax.', 'jdk.', 'sun.', 'com.sun.'];
const firstSeg = (spec, sep) => String(spec).split(sep)[0];
// Per-language manifest parsers
function goModRequires(goMod) {
    const out = new Set();
    if (!goMod)
        return out;
    for (const m of String(goMod).matchAll(/^\s*(?:require\s+)?([a-z0-9.\-]+\.[a-z0-9.\-]+)\s+v?\d/gim)) {
        out.add(m[1]);
    }
    return out;
}
function cargoDeps(cargoToml) {
    const out = new Set();
    if (!cargoToml)
        return out;
    const txt = String(cargoToml);
    const depIdx = txt.search(/^\s*\[(?:dependencies|dev-dependencies|build-dependencies)\]/im);
    if (depIdx < 0)
        return out;
    const tail = txt.slice(depIdx);
    for (const m of tail.matchAll(/^\s*([a-zA-Z0-9_-]+)\s*=/gim)) {
        out.add(m[1].replace(/-/g, '_'));
    }
    return out;
}
function pyRequires(requirements, pyproject) {
    const out = new Set();
    for (const m of String(requirements || '').matchAll(/^\s*([a-zA-Z0-9_.\-]+)/gim)) {
        out.add(m[1].toLowerCase().replace(/-/g, '_'));
    }
    for (const m of String(pyproject || '').matchAll(/["']([a-zA-Z0-9_.\-]+)\s*[><=~!]/g)) {
        out.add(m[1].toLowerCase().replace(/-/g, '_'));
    }
    return out;
}
function mavenDeps(pomOrGradle) {
    const out = new Set();
    if (!pomOrGradle)
        return out;
    for (const m of String(pomOrGradle).matchAll(/<groupId>\s*([a-zA-Z0-9_.\-]+)\s*<\/groupId>/g)) {
        out.add(m[1]);
    }
    for (const m of String(pomOrGradle).matchAll(/['"]([a-zA-Z0-9_.\-]+):[a-zA-Z0-9_.\-]+:/g)) {
        out.add(m[1]);
    }
    return out;
}
/**
 * Resolve a dependency for a given language.
 * @param lang - The language: 'go', 'rust', 'python', 'java'
 * @param spec - The import specifier
 * @param manifestCtx - Context with manifest files (goMod, cargoToml, etc.)
 * @returns 'present' | 'dangling' | 'unjudged'
 */
function resolveDependency(lang, spec, manifestCtx = {}) {
    const s = String(spec || '').replace(/^["']|["']$/g, '');
    if (!s)
        return 'unjudged';
    switch (lang) {
        case 'go': {
            const root = s.split('/')[0];
            if (GO_STDLIB.has(root) || !root.includes('.'))
                return 'present';
            const req = goModRequires(manifestCtx.goMod);
            if (req.size === 0)
                return 'unjudged';
            for (const r of req)
                if (s === r || s.startsWith(r + '/'))
                    return 'present';
            return 'dangling';
        }
        case 'rust': {
            const root = firstSeg(s, '::').replace(/-/g, '_');
            if (RUST_BUILTIN.has(root) || RUST_LOCAL.has(firstSeg(s, '::')))
                return 'present';
            const deps = cargoDeps(manifestCtx.cargoToml);
            if (deps.size === 0)
                return 'unjudged';
            return deps.has(root) ? 'present' : 'dangling';
        }
        case 'python': {
            if (s.startsWith('.'))
                return 'present';
            const root = firstSeg(s, '.');
            if (PY_STDLIB.has(root))
                return 'present';
            const req = pyRequires(manifestCtx.requirements, manifestCtx.pyproject);
            if (req.size === 0)
                return 'unjudged';
            return req.has(root.toLowerCase().replace(/-/g, '_')) ? 'present' : 'dangling';
        }
        case 'java': {
            if (JAVA_JDK.some((p) => s.startsWith(p)))
                return 'present';
            const root = firstSeg(s, '.');
            const deps = mavenDeps(manifestCtx.maven);
            if (deps.size === 0)
                return 'unjudged';
            return [...deps].some((g) => s.startsWith(g)) ? 'present' : 'dangling';
        }
        default:
            return 'unjudged';
    }
}
const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|go|rs|py|java|c|cpp|h|hpp)$/;
/**
 * Detect language from file extension.
 * Returns 'js' for JavaScript/TypeScript, 'go', 'rust', 'python', 'java', 'c', or null.
 */
function detectLanguage(rel) {
    const ext = /\.([a-z0-9]+)$/i.exec(rel)?.[1]?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
            return 'js';
        case 'go':
            return 'go';
        case 'rs':
            return 'rust';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'c':
        case 'cpp':
        case 'h':
        case 'hpp':
            return 'c';
        default:
            return null;
    }
}
/**
 * Get the dependency manifest context for a file based on its language.
 * Walks up from the file to find the nearest manifest file.
 */
function getManifestContext(ctx, rel, lang) {
    const norm = (p) => p.replaceAll('\\', '/');
    let dir = path.posix.dirname(norm(rel));
    switch (lang) {
        case 'go': {
            // Look for go.mod walking up
            while (dir !== '' && dir !== '.') {
                const goModPath = dir === '' ? 'go.mod' : `${dir}/go.mod`;
                const goMod = ctx.readFile(goModPath);
                if (goMod !== null) {
                    return { goMod };
                }
                const parent = path.posix.dirname(dir);
                if (parent === dir)
                    break;
                dir = parent;
            }
            // Check root
            const goMod = ctx.readFile('go.mod');
            if (goMod !== null) {
                return { goMod };
            }
            return { goMod: null };
        }
        case 'rust': {
            // Look for Cargo.toml walking up
            while (dir !== '' && dir !== '.') {
                const cargoPath = dir === '' ? 'Cargo.toml' : `${dir}/Cargo.toml`;
                const cargoToml = ctx.readFile(cargoPath);
                if (cargoToml !== null) {
                    return { cargoToml };
                }
                const parent = path.posix.dirname(dir);
                if (parent === dir)
                    break;
                dir = parent;
            }
            const cargoToml = ctx.readFile('Cargo.toml');
            if (cargoToml !== null) {
                return { cargoToml };
            }
            return { cargoToml: null };
        }
        case 'python': {
            // Look for requirements.txt and pyproject.toml walking up
            let requirements = null;
            let pyproject = null;
            while (dir !== '' && dir !== '.') {
                const reqPath = dir === '' ? 'requirements.txt' : `${dir}/requirements.txt`;
                const req = ctx.readFile(reqPath);
                if (req !== null && requirements === null) {
                    requirements = req;
                }
                const ppPath = dir === '' ? 'pyproject.toml' : `${dir}/pyproject.toml`;
                const pp = ctx.readFile(ppPath);
                if (pp !== null && pyproject === null) {
                    pyproject = pp;
                }
                if (requirements !== null && pyproject !== null)
                    break;
                const parent = path.posix.dirname(dir);
                if (parent === dir)
                    break;
                dir = parent;
            }
            // Check root
            if (requirements === null) {
                const req = ctx.readFile('requirements.txt');
                if (req !== null)
                    requirements = req;
            }
            if (pyproject === null) {
                const pp = ctx.readFile('pyproject.toml');
                if (pp !== null)
                    pyproject = pp;
            }
            return { requirements, pyproject };
        }
        case 'java': {
            // Look for pom.xml or build.gradle walking up
            while (dir !== '' && dir !== '.') {
                const pomPath = dir === '' ? 'pom.xml' : `${dir}/pom.xml`;
                const pom = ctx.readFile(pomPath);
                if (pom !== null) {
                    return { maven: pom };
                }
                const gradlePath = dir === '' ? 'build.gradle' : `${dir}/build.gradle`;
                const gradle = ctx.readFile(gradlePath);
                if (gradle !== null) {
                    return { maven: gradle };
                }
                const parent = path.posix.dirname(dir);
                if (parent === dir)
                    break;
                dir = parent;
            }
            const pom = ctx.readFile('pom.xml');
            if (pom !== null) {
                return { maven: pom };
            }
            const gradle = ctx.readFile('build.gradle');
            if (gradle !== null) {
                return { maven: gradle };
            }
            return { maven: null };
        }
        default:
            return {};
    }
}
// Import specifiers are read through the ONE perception organ (importSpecs), which
// SELECTS real import_statement / call_expression AST nodes by tree-sitter type —
// so a `require("m")` / `from 'm'` written inside a string, template literal, or
// comment is a string/template/comment node, never an import edge, and is never
// extracted. This replaces the old comment-blanking regex extractor, whose
// documented residual (a specifier embedded in a TEMPLATE/STRING literal) produced
// false bare-import reds. importSpecs returns null when no grammar is available, so
// this gate degrades to unjudged rather than guessing.
/**
 * The package root a bare specifier resolves against:
 *   - `@scope/name/sub` → `@scope/name`
 *   - `name/sub`        → `name`
 * Returns null for an empty-scope alias (`@/...`) — that is NOT a real scoped
 * package, it is a tsconfig path alias, so it has no supply-chain fact.
 */
function packageRoot(spec) {
    if (spec.startsWith('@')) {
        const parts = spec.split('/');
        const scope = parts[0]; // "@scope" — for "@/..." this is exactly "@"
        if (scope === '@' || scope.length < 2)
            return null; // empty scope → path alias
        if (parts.length < 2 || parts[1] === '')
            return null; // "@scope" with no name
        return `${parts[0]}/${parts[1]}`;
    }
    return spec.split('/')[0];
}
/** Strip a path-alias pattern's trailing wildcard: "@/*" → "@/", "~/*" → "~/". */
function aliasPrefix(pattern) {
    return pattern.endsWith('/*') ? pattern.slice(0, -1) : pattern;
}
/**
 * Best-effort tsconfig `paths` alias check, walking up from the importing file to
 * the repo root. A spec that matches a configured alias prefix is NOT a
 * node_modules package, so this gate must not redden it. Lenient by design: the
 * keys are extracted by regex so JSON-with-comments tsconfigs still parse; an
 * unreadable tsconfig simply yields no alias info (the empty-scope check already
 * covers this repo's `@/*` alias on its own).
 */
function matchesTsconfigAlias(ctx, fromRel, spec) {
    const norm = (p) => p.replaceAll('\\', '/');
    let dir = path.posix.dirname(norm(fromRel));
    for (;;) {
        const tsconfigRel = dir === '' || dir === '.' ? 'tsconfig.json' : `${dir}/tsconfig.json`;
        const text = ctx.readFile(tsconfigRel);
        if (text !== null) {
            // grab the "paths" block, then every quoted key inside it
            const block = /"paths"\s*:\s*\{([\s\S]*?)\}/.exec(text);
            if (block) {
                const keyRe = /"([^"]+)"\s*:/g;
                let km;
                while ((km = keyRe.exec(block[1])) !== null) {
                    const pre = aliasPrefix(km[1]);
                    if (spec === km[1].replace(/\/\*$/, '') || spec === pre || spec.startsWith(pre)) {
                        return true;
                    }
                }
            }
        }
        if (dir === '' || dir === '.')
            break;
        const parent = path.posix.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return false;
}
/**
 * Node's bare-import walk-up resolution, in repo-relative space, by BYTE existence
 * of `<dir>/node_modules/<pkg>/package.json`. Overlay-aware via ctx.existsInTree
 * so a package.json created in the same atomic transaction also resolves — the
 * shared meaning of "exists" never diverges from the other gates.
 */
function resolvesBare(ctx, fromRel, pkg) {
    const norm = (p) => p.replaceAll('\\', '/');
    let dir = path.posix.dirname(norm(fromRel));
    for (;;) {
        const base = dir === '' || dir === '.' ? 'node_modules' : `${dir}/node_modules`;
        if (ctx.existsInTree(`${base}/${pkg}/package.json`))
            return true;
        if (dir === '' || dir === '.')
            break;
        const parent = path.posix.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return false;
}
/**
 * True when the dependency substrate itself is visible on the same walk-up path
 * Node would search. When no node_modules directory exists anywhere on that path,
 * package absence is an environment proof debt, not a code-level dangling edge.
 */
function hasObservableNodeModulesSubstrate(ctx, fromRel) {
    const norm = (p) => p.replaceAll('\\', '/');
    let dir = path.posix.dirname(norm(fromRel));
    for (;;) {
        const base = dir === '' || dir === '.' ? 'node_modules' : `${dir}/node_modules`;
        if (ctx.existsInTree(base))
            return true;
        if (dir === '' || dir === '.')
            break;
        const parent = path.posix.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return false;
}
const supplyChainGate = {
    name: 'supply-chain',
    kind: 'static',
    appliesTo(rel) {
        return SOURCE_RE.test(rel);
    },
    async run(ctx) {
        const reds = [];
        const note = 'every NEW bare import resolves to a builtin or an installed dependency (node_modules for JS, go.mod for Go, Cargo.toml for Rust, requirements.txt/pyproject.toml for Python, pom.xml for Java)';
        let unjudgedReason = null;
        for (const rel of ctx.changedFiles) {
            if (!SOURCE_RE.test(rel))
                continue;
            const newText = ctx.overlay.get(rel.replaceAll('\\', '/')) ?? ctx.readFile(rel);
            if (newText === null)
                continue;
            const lang = detectLanguage(rel);
            // Token-correct extraction: importSpecs SELECTS real import_statement /
            // call_expression nodes, so a specifier living in a string/template/comment
            // is never returned. A null here = no grammar for this source language → the
            // bare-import fact is undecidable from the bytes we can reach, so we degrade
            // to unjudged (neither red-by-guess nor green-by-assumption).
            const newSpecs = await importSpecs(newText, rel);
            const priorSpecs = await importSpecs(ctx.priorOf(rel), rel);
            if (newSpecs === null || priorSpecs === null) {
                unjudgedReason ??= `cannot judge imports in ${rel}: no tree-sitter grammar available for this language`;
                continue;
            }
            const before = new Set(priorSpecs);
            // Get manifest context for multi-language resolution
            const manifestCtx = lang ? getManifestContext(ctx, rel, lang) : {};
            for (const spec of newSpecs) {
                if (before.has(spec))
                    continue; // unchanged wire — not this write's claim
                // Relative imports are connection-gate's concern
                if (spec.startsWith('.'))
                    continue;
                // For JavaScript/TypeScript: use existing Node.js logic
                if (lang === 'js') {
                    if (isBuiltin(spec))
                        continue; // builtin terminates
                    const pkg = packageRoot(spec);
                    if (pkg === null)
                        continue; // empty-scope alias (@/...) — not a node_modules package
                    if (matchesTsconfigAlias(ctx, rel, spec))
                        continue; // configured path alias — not ours
                    if (resolvesBare(ctx, rel, pkg))
                        continue; // installed part exists on disk/overlay
                    if (!hasObservableNodeModulesSubstrate(ctx, rel)) {
                        unjudgedReason ??=
                            `cannot judge NEW bare import '${spec}' from ${rel}: no node_modules dependency substrate is observable on the Node walk-up path; install dependencies or provide a package-resolver substrate before treating package absence as a dangling edge`;
                        continue;
                    }
                    reds.push({
                        file: rel,
                        locus: `bare:${spec}`,
                        fact: `bare import '${spec}' resolves to no installed node_modules/${pkg}/package.json (would introduce a dangling dependency edge)`,
                    });
                }
                // For other languages: use inline multi-language resolver
                else if (lang && lang !== 'c') { // C/C++ support is partial, skip for now
                    const result = resolveDependency(lang, spec, manifestCtx);
                    if (result === 'present')
                        continue; // resolves correctly
                    if (result === 'unjudged') {
                        unjudgedReason ??= `cannot judge NEW bare import '${spec}' from ${rel} (${lang}): no manifest found or incomplete manifest context`;
                        continue;
                    }
                    // result === 'dangling'
                    reds.push({
                        file: rel,
                        locus: `bare:${spec}`,
                        fact: `bare import '${spec}' does not resolve to a declared dependency in ${lang} manifest (would introduce a dangling dependency edge)`,
                    });
                }
            }
        }
        if (reds.length === 0 && unjudgedReason !== null) {
            return { gate: this.name, green: true, reds: [], note, unjudged: true, unjudgedReason };
        }
        return { gate: this.name, green: reds.length === 0, reds, note };
    },
};
export default supplyChainGate;
