#!/usr/bin/env node
/**
 * atomic-headless-apply.mjs — H.5 / H.8.3 deliverable.
 *
 * Dogfood atomic's OWN convergence floor + self-expansion admission WITHOUT the stdio MCP server.
 * (The live MCP is rooted at ~/kloel, which is under continuous concurrent surgery → it hot-reload-flaps
 * and cannot write the isolated elevation worktree. This harness, run with
 * ATOMIC_EDIT_REPO_ROOT=<worktree>, routes every write through the SAME machinery the MCP uses.)
 *
 * It mirrors atomic_expand_self's discipline EXACTLY — apply, then prove, then keep-or-rollback:
 *   1. capture the before-state of every target file.
 *   2. apply each write through atomicWrite() under withSelfExpansionAdmission() — the IDENTICAL
 *      inescapable floor (byte-floor connection + supply-chain + sync WRITE_GATES + admitted-registry
 *      gates) and (a) negative-byte-default (requireNegativeProofForRemovedBytes) the MCP uses. A write
 *      that would not converge green never reaches disk.
 *   3. rebuild (node build.mjs) so the proof lattice sees the NEW bytes.
 *   4. run every named proofCommand (the monotonic-admission lattice).
 *   5. if build OR any proof is RED → ROLLBACK (delete created files, restore modified ones) and REFUSE.
 *      else → keep, emit a receipt (per-file before/after sha + proof verdicts).
 * This IS atomic developing atomic; only the receipt/genealogy ceremony differs from the MCP handler.
 *
 * BOOTSTRAP NOTE (honest, anti-facade): this harness FILE is edited with the editor's plain writer,
 * not through atomicWrite — you cannot dogfood the tool that bootstraps dogfooding. Every edit it
 * APPLIES, however, goes through the full floor + proof lattice above.
 *
 * Usage:
 *   ATOMIC_EDIT_REPO_ROOT=<root> node atomic-headless-apply.mjs <spec.json> [--dry]
 * spec.json = {
 *   intent?: string,
 *   proofCommands: string[],   // run AFTER the writes + rebuild; all must be green or the batch rolls back
 *   files: [ { op: 'create'|'replace'|'replace_text', file, content?, oldText?, newText?,
 *              proofOfIncorrectness?, expectedSha256? } ]
 * }
 *   --dry : validate the CURRENT tree (build + proofs), apply NOTHING.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start) {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const REPO_ROOT = process.env.ATOMIC_EDIT_REPO_ROOT
  ? path.resolve(process.env.ATOMIC_EDIT_REPO_ROOT)
  : findRepoRoot(HERE);
const SELF_DIR = HERE;
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function fail(msg, extra) {
  console.error(`\n✗ REFUSED — ${msg}`);
  if (extra) console.error(String(extra).slice(-3000));
  process.exit(1);
}
function runBuild() {
  const r = spawnSync(process.execPath, ['build.mjs'], { cwd: SELF_DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}
function runProof(command) {
  const r = spawnSync('bash', ['-lc', command], { cwd: SELF_DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ATOMIC_EDIT_REPO_ROOT: REPO_ROOT } });
  let ok = r.status === 0;
  if (ok && /--json/.test(command)) {
    const m = (r.stdout || '').match(/\{[\s\S]*\}\s*$/);
    if (m) { try { if (JSON.parse(m[0]).ok === false) ok = false; } catch { /* keep exit-code verdict */ } }
  }
  return { command, ok, out: (r.stdout || '').slice(-2000) + (r.stderr || '').slice(-2000) };
}

const specPath = process.argv[2];
const dry = process.argv.includes('--dry');
if (!specPath) fail('usage: node atomic-headless-apply.mjs <spec.json> [--dry]');
let spec;
try { spec = JSON.parse(fs.readFileSync(specPath, 'utf8')); } catch (e) { fail(`cannot read/parse spec: ${specPath}`, e); }
if (!Array.isArray(spec.files) || spec.files.length === 0) fail('spec.files must be a non-empty array');
const proofCommands = Array.isArray(spec.proofCommands) ? spec.proofCommands : [];

console.error(`atomic-headless-apply :: REPO_ROOT=${REPO_ROOT}`);
console.error(`  intent: ${spec.intent ?? '(none)'}`);
console.error(`  files:  ${spec.files.map((f) => `${f.op} ${f.file}`).join(', ')}`);
console.error(`  proofs: ${proofCommands.length}${dry ? '  (DRY — validate current tree, no writes)' : ''}`);

// ── DRY: validate the current tree only ───────────────────────────────────────────────────────────
if (dry) {
  console.error('\n▶ build …'); const b = runBuild(); console.error(b.ok ? '  build GREEN' : '  build RED');
  if (!b.ok) fail('build RED', b.out);
  const pr = [];
  for (const c of proofCommands) { process.stderr.write(`▶ proof ${c} … `); const r = runProof(c); console.error(r.ok ? 'GREEN' : 'RED'); pr.push(r); if (!r.ok) fail(`proof RED — ${c}`, r.out); }
  console.error(`\n✓ PREFLIGHT GREEN (current tree). No writes (--dry).`);
  console.log(JSON.stringify({ ok: true, dry: true, proofs: pr.map((p) => ({ command: p.command, ok: p.ok })) }, null, 2));
  process.exit(0);
}

// ── Load the REAL atomic floor primitives from dist (after honoring the worktree root) ─────────────
process.env.ATOMIC_EDIT_REPO_ROOT = REPO_ROOT;
const io = await import(path.join(SELF_DIR, 'dist/server-helpers-io.js'));
const adm = await import(path.join(SELF_DIR, 'dist/server-helpers-self-expansion.js'));
const neg = await import(path.join(SELF_DIR, 'dist/server-helpers-negative-proof.js'));
const { atomicWrite, readUtf8 } = io;
const { withSelfExpansionAdmission } = adm;
const { requireNegativeProofForRemovedBytes } = neg;

// ── Step 1: snapshot before-state (for rollback) ───────────────────────────────────────────────────
const targets = spec.files.map((entry) => {
  const abs = path.resolve(REPO_ROOT, entry.file);
  const existed = fs.existsSync(abs) && fs.statSync(abs).isFile();
  return { entry, abs, existed, before: existed ? readUtf8(abs) : null };
});
function rollback() {
  for (const t of targets) {
    try {
      if (t.before === null) { if (fs.existsSync(t.abs)) fs.unlinkSync(t.abs); }
      else fs.writeFileSync(t.abs, t.before);
    } catch (e) { console.error(`  rollback warning for ${t.entry.file}: ${String(e?.message ?? e)}`); }
  }
}

// ── Step 2: apply every write through the floor under self-expansion admission ─────────────────────
const applied = [];
try {
  withSelfExpansionAdmission(() => {
    for (const t of targets) {
      const { entry, abs, before } = t;
      if (entry.expectedSha256 && before !== null && sha256(before) !== entry.expectedSha256)
        throw new Error(`sha mismatch on ${entry.file}`);
      let after;
      if (entry.op === 'create') {
        if (before !== null && before.length > 0) throw new Error(`${entry.file} already exists; use op=replace`);
        after = entry.content ?? '';
      } else if (entry.op === 'replace') {
        if (before === null) throw new Error(`${entry.file} does not exist; use op=create`);
        if (entry.content === undefined) throw new Error(`${entry.file} replace requires content`);
        after = entry.content;
        requireNegativeProofForRemovedBytes({ action: 'headless:replace', target: entry.file, targetUnit: 'self-file', before, after, proofOfIncorrectness: entry.proofOfIncorrectness });
      } else if (entry.op === 'replace_text') {
        if (before === null) throw new Error(`${entry.file} does not exist`);
        if (!entry.oldText) throw new Error(`${entry.file} replace_text requires non-empty oldText`);
        if (entry.newText === undefined) throw new Error(`${entry.file} replace_text requires newText`);
        const first = before.indexOf(entry.oldText);
        if (first < 0) throw new Error(`${entry.file}: oldText not found`);
        if (before.indexOf(entry.oldText, first + 1) >= 0) throw new Error(`${entry.file}: oldText ambiguous (>1 match)`);
        after = before.slice(0, first) + entry.newText + before.slice(first + entry.oldText.length);
        if (after.length < before.length || !after.includes(before.slice(first, first + entry.oldText.length)))
          requireNegativeProofForRemovedBytes({ action: 'headless:replace_text', target: entry.file, targetUnit: 'self-file', before, after, proofOfIncorrectness: entry.proofOfIncorrectness });
      } else throw new Error(`unknown op: ${entry.op}`);
      atomicWrite(abs, after); // ← the inescapable floor; throws on any RED
      applied.push({ file: entry.file, op: entry.op, beforeSha256: before === null ? null : sha256(before), afterSha256: sha256(after) });
    }
  });
} catch (e) {
  rollback();
  fail(`floor/admission rejected a write (rolled back) — ${String(e?.message ?? e)}`);
}

// ── Step 3: rebuild so the proof lattice sees the new bytes ────────────────────────────────────────
console.error('\n▶ build (post-write) …');
const b = runBuild();
console.error(b.ok ? '  build GREEN' : '  build RED');
if (!b.ok) { rollback(); fail('build RED after writes (rolled back)', b.out); }

// ── Step 4: run the monotonic-admission proof lattice; rollback the whole batch on any RED ─────────
const proofResults = [];
for (const c of proofCommands) {
  process.stderr.write(`▶ proof ${c} … `);
  const r = runProof(c);
  console.error(r.ok ? 'GREEN' : 'RED');
  proofResults.push({ command: c, ok: r.ok });
  if (!r.ok) { rollback(); fail(`proof RED — ${c} (whole batch rolled back, rebuilding clean)`, r.out); }
}
if (proofResults.some((p) => !p.ok)) { rollback(); fail('a proof was RED'); }

// rebuild once more so dist reflects the kept state cleanly
runBuild();
console.error(`\n✓ ADMITTED ${applied.length} write(s): floor green at write-time + build green + ${proofResults.length} proof(s) green.`);
console.log(JSON.stringify({ ok: true, intent: spec.intent ?? null, applied, proofs: proofResults }, null, 2));
