/**
 * connection-gate.ts — the exoneration-free CONNECTION fact, at the byte floor.
 *
 * A relative import resolves to a real file, or it dangles. That is a FACT, not a
 * heuristic — no language server, no gate config, no guessing, no language bias.
 * This module is the single source of that truth, consumed by BOTH the static
 * convergence engine (overlay-aware, pre-write) and the byte-write floor in
 * server-helpers-io (disk + pending-set aware, AT write). Pure fs+path: zero
 * heavy deps, so the leaf io module can import it without pulling the tree-sitter
 * engine into every write.
 *
 * Semantics (universal, works on any repo with or without gates):
 *  - Only SOURCE files are judged (.ts/.tsx/.js/.jsx/.mjs/.cjs). Everything else
 *    (json, locks, traces, css) has no relative-import fact to assert → green.
 *  - Only NEW wires are this write's claim: a specifier present in the new content
 *    but NOT in the file's prior content. A pre-existing dangling import in a
 *    legacy file never blocks an unrelated edit — but no write may INTRODUCE one.
 *  - Bare specifiers (packages/builtins) are out of scope: not a dangling-wire
 *    fact we can assert from the filesystem alone.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isBuiltin } from 'node:module';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);

function findRepoRoot(start: string): string {
  let d = path.resolve(start);
  while (true) {
    try { if (fs.statSync(path.join(d, '.git')).isDirectory()) return d; } catch {}
    const p = path.dirname(d);
    if (p === d) return start;
    d = p;
  }
}

const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|rs|java|c|cc|cpp)$/;

// The node_modules supply-chain fact (a bare specifier resolves to an installed
// `node_modules/<pkg>/package.json`, with `isBuiltin` covering Node core) is
// MEANINGFUL ONLY for JS/TS. Go stdlib (`strings`, `fmt`), Rust crates
// (`std`/Cargo), Python site-packages, Java classpath, and C/C++ includes never
// resolve through node_modules, so judging their bare imports by this fact
// falsely reddens every NEW standard-library import and refuses the write. The
// async supply-chain-gate.ts restricts to exactly this JS/TS set for the same
// reason; the sync byte-floor twin below must match it (the relative half —
// checkConnectionByteFloor — stays multi-language because sibling-file
// resolution IS cross-language).
const JS_SUPPLY_CHAIN_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/**
 * Files about to exist within the current multi-file atomic transaction. The
 * byte-floor gate consults this so a pre-approved set that wires A→B (e.g.
 * atomic_converge creating B and importing it from A) is not false-reddened by
 * the order the firewall happens to write them. Single-file writes leave it empty.
 */
const pending = new Set<string>();
export function registerPendingWrites(absPaths: string[]): void {
  for (const p of absPaths) pending.add(path.resolve(p));
}
export function clearPendingWrites(): void {
  pending.clear();
}
/**
 * Count of files currently registered as pending in the active multi-file atomic
 * set (0 when no transaction is in flight). The byte-floor type-soundness gate
 * consults this: a per-file in-memory compile cannot see the sibling candidates of
 * a multi-file A→B set (only their disk bytes), so when a multi-file set is in
 * flight it bails UNJUDGED at the floor and defers to convergeStatic, which type-
 * checks the full overlay. Single-file writes (count ≤ 1) type-check fully here.
 */
export function pendingWriteCount(): number {
  return pending.size;
}

/**
 * Length-preserving blanking of //, /* * / and # comments ONLY (never string literals).
 * String literals are SKIPPED OVER (preserved) so a `//` inside a URL string is not
 * mistaken for a comment. This removes comment-embedded false matches like a
 * `from './x'` written in a doc comment. Supports both JS/TS/C/Go (//) and
 * Python/Ruby/Shell (#) comment styles generically.
 */
export function blankComments(text: string): string {
  const out = text.split('');
  const n = text.length;
  let i = 0;
  const blankTo = (end: number): void => {
    for (let k = i; k < end && k < n; k += 1) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < n) {
    const c = text[i];
    const c2 = text[i + 1];
    if (c === '/' && c2 === '/') {
      let j = i + 2;
      while (j < n && text[j] !== '\n') j += 1;
      blankTo(j);
      i = j;
    } else if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j += 1;
      j = Math.min(j + 2, n);
      blankTo(j);
      i = j;
    } else if (c === '#') {
      let j = i + 1;
      while (j < n && text[j] !== '\n') j += 1;
      blankTo(j);
      i = j;
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1; // skip OVER the string (preserve it — specifiers live here)
      while (j < n && text[j] !== c) {
        if (text[j] === '\\') j += 1;
        j += 1;
      }
      i = Math.min(j + 1, n);
    } else {
      i += 1;
    }
  }
  return out.join('');
}

export function extractImportSpecifiers(content: string): string[] {
  const code = blankComments(content);
  const specs: string[] = [];
  const pushSpec = (value: string | undefined): void => {
    if (value && !specs.includes(value)) specs.push(value);
  };
  // JS/TS: from '...', require('...'), import '...'
  const jsRe = /\bfrom\s+['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = jsRe.exec(code)) !== null) pushSpec(m[1] ?? m[2] ?? m[3]);

  // Python: relative and bare imports. Bare imports feed the supply-chain gate;
  // relative imports feed the connection gate.
  const pyRelativeRe = /^\s*(?:from|import)\s+([.][a-zA-Z0-9_.]+)/gm;
  while ((m = pyRelativeRe.exec(code)) !== null) pushSpec(m[1]);
  const pyBareRe = /^\s*(?:from\s+([A-Za-z_][A-Za-z0-9_.]*)\s+import|import\s+([A-Za-z_][A-Za-z0-9_.]*))/gm;
  while ((m = pyBareRe.exec(code)) !== null) pushSpec((m[1] ?? m[2])?.split('.')[0]);

  // Java: import org.example.Type; / import static org.example.Type.member;
  const javaRe = /^\s*import\s+(?:static\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+)(?:\.\*)?\s*;/gm;
  while ((m = javaRe.exec(code)) !== null) pushSpec(m[1]);

  // Go/C/Generic: import "..." or #include "..." — ANCHORED to statement position (^\s*#?\s*).
  // CLASS-PROSE-IMPORT-FALSE-RED (R023): the old un-anchored /\b(?:import|include)\s+['"]/ matched the
  // ENGLISH WORD "include" inside a Python docstring (`"""... does not include 'b' (binary)."""`) and
  // extracted `b` as a bare dependency → the byte-floor convergence gate refused a CORRECT edit 8× with a
  // nonsensical "dangling dependency — b / install the package" message (measured: pytest-5262 atomic_replace
  // thrashed 9 calls / 8 refusals, swinging the round 3→17). A real Go/C import/include sits at statement
  // position (line start, optionally `#` for C); prose sits mid-line. Anchoring kills the false red while
  // keeping every real bare import (which is always line-start) → strictly monotonic, never a false GREEN
  // (the authoritative async AST gate is unaffected). Generalist: any language, any docstring/prose.
  const genRe = /^\s*#?\s*(?:import|include)\s+['"]([^'"]+)['"]/gm;
  while ((m = genRe.exec(code)) !== null) pushSpec(m[1]);

  return specs;
}

function candidatesFor(baseAbs: string): string[] {
  const c = [
    baseAbs,
    `${baseAbs}.ts`, `${baseAbs}.tsx`, `${baseAbs}.mts`, `${baseAbs}.cts`,
    `${baseAbs}.js`, `${baseAbs}.jsx`, `${baseAbs}.mjs`, `${baseAbs}.cjs`, `${baseAbs}.json`,
    `${baseAbs}.py`, `${baseAbs}.go`, `${baseAbs}.rb`, `${baseAbs}.rs`,
    `${baseAbs}.java`, `${baseAbs}.c`, `${baseAbs}.h`, `${baseAbs}.cc`, `${baseAbs}.cpp`,
    path.join(baseAbs, 'index.ts'), path.join(baseAbs, 'index.tsx'),
    path.join(baseAbs, 'index.mts'), path.join(baseAbs, 'index.cts'),
    path.join(baseAbs, 'index.js'), path.join(baseAbs, 'index.jsx'),
    path.join(baseAbs, 'index.mjs'), path.join(baseAbs, 'index.cjs'),
    path.join(baseAbs, '__init__.py'),
  ];
  // moduleResolution bundler/node16 + allowImportingTsExtensions: an explicit
  // .js/.jsx/.mjs/.cjs specifier may resolve to the corresponding TS source file
  // (the #1 config of modern TS projects — './x.js' on disk is './x.ts'). Without
  // these rewrites the connection gate falsely reddens valid imports and the agent
  // is forced into a bash bypass.
  const extRewrite: Record<string, string[]> = {
    '.js': ['.ts', '.tsx'],
    '.jsx': ['.tsx'],
    '.mjs': ['.mts'],
    '.cjs': ['.cts'],
  };
  for (const [from, tos] of Object.entries(extRewrite)) {
    if (baseAbs.endsWith(from)) {
      const stem = baseAbs.slice(0, -from.length);
      for (const to of tos) c.push(`${stem}${to}`);
    }
  }
  return c;
}

export const candidatesForSpecifier = candidatesFor;

/** Resolve a RELATIVE specifier against dirname(fromAbs), consulting pending+disk.
 *  JS/TS use './x' or '../x' (path.resolve handles those). Python uses leading dots
 *  WITHOUT a slash — '.errors' (same package), '..pkg.mod' (parent) — where
 *  path.resolve(dir, '.errors') would WRONGLY yield a dotfile (dir/.errors) and never
 *  match dir/errors.py, false-reddening every NEW Python sibling relative import. Strip
 *  the leading dots, ascend (dots-1) dirs, and map the dotted module tail to path segments. */
function relativeImportResolvesAbs(fromAbs: string, spec: string): boolean {
  if (!spec.startsWith('.')) return true; // bare specifier → package/builtin → not judged
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const baseAbs = path.resolve(path.dirname(fromAbs), spec);
    return candidatesFor(baseAbs).some((cand) => {
      const r = path.resolve(cand);
      return pending.has(r) || fs.existsSync(cand);
    });
  }
  const m = /^(\.+)(.*)$/.exec(spec);
  const dots = m ? m[1].length : 1;
  const rest = m ? m[2] : spec;
  let dir = path.dirname(fromAbs);
  for (let k = 1; k < dots; k += 1) dir = path.dirname(dir);
  const baseAbs = rest ? path.resolve(dir, rest.replace(/\./g, '/')) : dir;
  return candidatesFor(baseAbs).some((cand) => {
    const r = path.resolve(cand);
    return pending.has(r) || fs.existsSync(cand);
  });
}

/**
 * Resolve a KLOEL `@/...` path alias using the `<pkg>/src/` convention derived from the
 * importing file's absolute path — I/O-free beyond the existing candidate existsSync probe
 * (NO tsconfig read on the byte floor). The repo maps `@/*` → `<frontend|backend|worker>/src/*`.
 * Returns: true (resolves), false (the package-src root is locatable but the target is absent
 * → a NEW dangling alias = a real connection red), or null (the `<pkg>/src` root cannot be
 * located from the path → honestly NOT judged here, never red-by-guess).
 */
function aliasResolvesAbs(fromAbs: string, spec: string): boolean | null {
  if (!spec.startsWith('@/')) return null;
  const m = fromAbs.replaceAll('\\', '/').match(/^(.*\/(?:frontend|backend|worker)\/src)\//);
  if (!m) return null; // cannot locate the package src root → unjudged (not our fact here)
  const baseAbs = path.join(m[1], spec.slice(2));
  return candidatesFor(baseAbs).some((cand) => {
    const r = path.resolve(cand);
    return pending.has(r) || fs.existsSync(cand);
  });
}

export interface ConnectionVerdict {
  green: boolean;
  reds: string[];
}

/**
 * Byte-floor connection fact for a single file write. Reads the file's prior
 * content (if any) so only NEW relative imports are judged. A brand-new file is
 * all-new, so every relative import in it must resolve.
 */
export function checkConnectionByteFloor(absPath: string, content: string): ConnectionVerdict {
  if (!SOURCE_RE.test(absPath)) return { green: true, reds: [] };
  let beforeSpecs: Set<string>;
  try {
    beforeSpecs = new Set(extractImportSpecifiers(fs.readFileSync(absPath, 'utf8')));
  } catch {
    beforeSpecs = new Set(); // file does not exist yet → every wire is new
  }
  const reds: string[] = [];
  for (const spec of extractImportSpecifiers(content)) {
    if (beforeSpecs.has(spec)) continue; // unchanged wire — not this write's claim
    if (spec.startsWith('@/')) {
      // path alias: resolve via the <pkg>/src convention. A located-but-absent target is a
      // NEW dangling alias (red); a non-locatable src root is honestly NOT judged here.
      if (aliasResolvesAbs(absPath, spec) === false) reds.push(spec);
      continue;
    }
    if (!relativeImportResolvesAbs(absPath, spec)) reds.push(spec);
  }
  return { green: reds.length === 0, reds };
}

/** Walk up node_modules from a file, true iff the package's package.json byte-exists. */
/**
 * L07 — Per-language supply-chain resolver.
 *
 * Resolves bare import specifiers against each language's package manager:
 *   JS/TS: node_modules
 *   Go:    go.mod + GOROOT stdlib
 *   Rust:  Cargo.toml
 *   Python: site-packages / pip list
 *   Java:  classpath jars
 *
 * Returns true if the specifier resolves to an installed package.
 */
function resolveLanguagePackage(repoRoot: string, absPath: string, spec: string): boolean {
  const ext = absPath.slice(absPath.lastIndexOf('.')).toLowerCase();
  // Start findUp from the FILE's directory, not repoRoot. Many repos have
  // their manifest in a subdirectory (e.g. Go's cli/go.mod, Rust's
  // server/Cargo.toml, Python's pkg/pyproject.toml). Walking up from the
  // file location finds the nearest enclosing manifest; walking from
  // repoRoot misses it entirely and the convergence check falsely reports
  // a dangling dependency. Generalist fix (Gap D in LEDGER).
  const fileDir = path.dirname(absPath);

  // Go
  if (ext === '.go') {
    // Go stdlib: check if package is in GOROOT
    if (isGoStdlib(spec)) return true;
    // Check go.mod for module dependencies — walk up from the FILE's dir.
    return goModHasPackage(fileDir, spec);
  }

  // Rust
  if (ext === '.rs') {
    return cargoTomlHasCrate(fileDir, spec);
  }

  // Python
  if (ext === '.py') {
    return isPythonPackageAvailable(spec);
  }

  // Java
  if (ext === '.java') {
    return isJavaPackageAvailable(repoRoot, absPath, spec);
  }

  // Default: check node_modules (for JS/TS)
  return bareResolves(absPath, spec);
}

function javaPackageGroupCandidates(spec: string): string[] {
  const parts = spec.split('.').filter(Boolean);
  const candidates: string[] = [];
  for (let end = Math.min(parts.length - 1, 4); end >= 2; end -= 1) candidates.push(parts.slice(0, end).join('.'));
  return candidates;
}

function isJavaPackageAvailable(repoRoot: string, absPath: string, spec: string): boolean {
  if (spec.startsWith('java.') || spec.startsWith('javax.')) return true;
  const groupCandidates = javaPackageGroupCandidates(spec);
  if (groupCandidates.length === 0) return true;
  const manifestRoots = [path.dirname(absPath), repoRoot];
  const manifestPaths = Array.from(
    new Set(
      manifestRoots
        .flatMap((root) => [findUp(root, 'pom.xml'), findUp(root, 'build.gradle'), findUp(root, 'build.gradle.kts')])
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (manifestPaths.length === 0) return true;
  const manifests = manifestPaths.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  return groupCandidates.some((group) =>
    manifests.includes(`<groupId>${group}</groupId>`) ||
    manifests.includes(`'${group}:`) ||
    manifests.includes(`"${group}:`) ||
    manifests.includes(`${group}:`),
  );
}

function isGoStdlib(spec: string): boolean {
  // Go stdlib packages don't have a domain in their import path
  const stdlibPrefixes = [
    'fmt', 'os', 'io', 'net', 'sync', 'time', 'strings', 'bytes',
    'errors', 'math', 'sort', 'context', 'encoding', 'flag', 'log',
    'path', 'reflect', 'regexp', 'runtime', 'strconv', 'testing',
    'unicode', 'archive', 'bufio', 'builtin', 'cmp', 'compress',
    'container', 'crypto', 'database', 'debug', 'embed', 'expvar',
    'hash', 'html', 'image', 'index', 'internal', 'maps', 'mime',
  ];
  const topLevel = spec.split('/')[0];
  return stdlibPrefixes.includes(topLevel) && !topLevel.includes('.');
}

function goModHasPackage(repoRoot: string, spec: string): boolean {
  try {
    const gomodPath = findUp(repoRoot, 'go.mod');
    if (!gomodPath) return true;
    const gomod = fs.readFileSync(gomodPath, 'utf8');
    const moduleMatch = gomod.match(/^module\s+(\S+)/m);
    if (moduleMatch && spec.startsWith(moduleMatch[1])) return true;
    for (const line of gomod.split('\n')) {
      const req = line.match(/^\s*require\s+(\S+)/);
      if (req && spec.startsWith(req[1])) return true;
    }
    return false;
  } catch { return true; }
}

function cargoTomlHasCrate(repoRoot: string, spec: string): boolean {
  try {
    const cargoPath = findUp(repoRoot, 'Cargo.toml');
    if (!cargoPath) return true;
    const cargo = fs.readFileSync(cargoPath, 'utf8');
    const depMatch = cargo.match(/\[dependencies\]([\s\S]*?)(?:\[|\Z)/);
    if (depMatch && (depMatch[1].includes(`"${spec}"`) || depMatch[1].includes(`${spec} =`))) return true;
    const rustStdlib = ['std', 'core', 'alloc', 'proc_macro', 'test'];
    if (rustStdlib.includes(spec)) return true;
    return false;
  } catch { return true; }
}

function isPythonPackageAvailable(spec: string): boolean {
  const moduleName = spec.split('.')[0];
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(moduleName)) return false;
  try {
    const cp = nodeRequire('child_process') as typeof import('node:child_process');
    cp.execFileSync(
      'python3',
      ['-c', 'import importlib.util, sys; sys.exit(0 if importlib.util.find_spec(sys.argv[1]) else 1)', moduleName],
      { timeout: 5000, stdio: 'ignore' },
    );
    return true;
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: unknown }).status : undefined;
    if (status === 1) return false;
    return true;
  }
}

function findUp(startDir: string, filename: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, filename);
    try { if (fs.statSync(candidate).isFile()) return candidate; } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function bareResolves(fromAbs: string, spec: string): boolean {
  const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : (spec.split('/')[0] ?? spec);
  let dir = path.dirname(fromAbs);
  for (let i = 0; i < 40; i += 1) {
    if (fs.existsSync(path.join(dir, 'node_modules', pkg, 'package.json'))) return true;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return false;
}

/**
 * Byte-floor SYNC supply-chain check — the dependency twin of the connection gate,
 * kept synchronous so it survives at the byte floor even though the full
 * perception-based supply-chain gate is async. A NEW bare import to a package that
 * is neither a Node builtin nor present in the installed tree (nor an @/-alias) is
 * a dangling dependency wire. Relative imports are the connection gate's concern.
 */
export function checkSupplyChainByteFloor(absPath: string, content: string): ConnectionVerdict {
  // Multi-language supply-chain: resolve bare imports against each
  // language's package manager. Non-JS files were previously a blind
  // "green" return (honest ceiling). Now we resolve Go/Rust/Python/Java.
  const isJs = JS_SUPPLY_CHAIN_RE.test(absPath);
  let beforeSpecs: Set<string>;
  try {
    beforeSpecs = new Set(extractImportSpecifiers(fs.readFileSync(absPath, 'utf8')));
  } catch {
    beforeSpecs = new Set();
  }
  const reds: string[] = [];
  const repoRoot = findRepoRoot(absPath);

  for (const spec of extractImportSpecifiers(content)) {
    if (beforeSpecs.has(spec)) continue;
    if (spec.startsWith('.')) continue;
    if (spec.startsWith('@/') || isBuiltin(spec)) continue;

    // Use per-language resolver for all languages
    if (isJs) {
      if (!bareResolves(absPath, spec)) reds.push(spec);
    } else {
      // Non-JS: use the multi-language resolver
      if (!resolveLanguagePackage(repoRoot, absPath, spec)) {
        reds.push(spec);
      }
    }
  }
  return { green: reds.length === 0, reds };
}
