#!/usr/bin/env node
/**
 * resource-lifetime.proof.mjs — the FIRST runtime/dynamic invariant in the lattice.
 *
 * Run:  node scripts/mcp/atomic-edit/gates/resource-lifetime.proof.mjs   (no build needed;
 *       it drives the SOURCE write-path router gates/lsp-router.mjs directly).
 *
 * WHY THIS EXISTS (paradigm increment L02 / L17 / L19):
 *   Every pre-existing gate is STATIC — it inspects bytes/AST/trace before a write. None
 *   observes RUNTIME resource lifetime, which is exactly the dimension where the engine
 *   leaked ~68 orphaned `tsserver` processes (~133 MB) while 134 static proofs stayed
 *   green. This is the lattice's first INVARIANT CLASS of a new KIND: an operation must
 *   leave NO orphaned child process behind. It strictly and monotonically adds the
 *   lifetime coverage the lattice did not have, and it is DISCRIMINATING (it can go red),
 *   so its admission is real, not green-by-assumption.
 *
 * TIER: this is an INTEGRATION/runtime proof (like lsp-mesh-e2e / lsp-semantic-delta) —
 *   it observes real process lifecycle, so it belongs to `verify:integration`, NOT the
 *   strict self-expansion admission sandbox (which denies /bin/ps and process spawning).
 *   RT-DETECT is engineered ps-FREE so the "can-go-red" guarantee survives even where the
 *   process table is unreadable; RT-REAL honest-skips when ps or a language server is absent.
 *
 * SELF-CLEANING: every deliberately-leaked child is reaped by the proof at the end —
 *   the proof itself leaks nothing.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn, execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));            // gates/
const router = path.join(dir, 'lsp-router.mjs');                     // the real write-path router

let pass = 0;
let fail = 0;
const results = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  if (ok) { pass += 1; } else { fail += 1; }
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
}

const alive = (pid) => { try { process.kill(Number(pid), 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function killPid(pid, grp) { try { process.kill(grp ? -Number(pid) : Number(pid), 'SIGKILL'); } catch { /* gone */ } }

// Is the process table readable here? (the admission sandbox denies /bin/ps.)
const psAvailable = (() => {
  try { execSync(`ps -o pid= -p ${process.pid}`, { stdio: ['ignore', 'pipe', 'ignore'] }); return true; }
  catch { return false; }
})();
function psRows() {
  return execSync('ps -eo pid,ppid,command', { encoding: 'utf8' })
    .split('\n').slice(1)
    .map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean)
    .map((m) => ({ pid: m[1], ppid: m[2], cmd: m[3] }));
}
function descendants(rootPid, re) {
  const rows = psRows();
  const kids = new Map();
  for (const r of rows) { if (!kids.has(r.ppid)) kids.set(r.ppid, []); kids.get(r.ppid).push(r); }
  const found = []; const stack = [String(rootPid)]; const seen = new Set();
  while (stack.length) {
    const p = stack.pop(); if (seen.has(p)) continue; seen.add(p);
    for (const c of kids.get(p) || []) { if (re.test(c.cmd)) found.push(c.pid); stack.push(c.pid); }
  }
  return found;
}
const LS_RE = /typescript-language-server|tsserver\.js/;
const CANARY = 'ATOMIC_RT_LEAK_CANARY';
const hasLS = spawnSync('typescript-language-server', ['--version'], { encoding: 'utf8' }).status === 0;

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-rt-proof-'));
const tsFile = path.join(work, 'probe.ts');
fs.writeFileSync(tsFile, 'export const greet = (n: string): string => n;\n');
const KNOWN = new Set([
  'probe.ts', 'leaker.mjs',
  'reaper-child.mjs', 'control-child.mjs', 'reaper-owner.mjs', 'control-owner.mjs',
]);

try {
  // ── RT-DETECT (ps-FREE, deterministic, always runs) — the proof CAN go red ────
  // A teardown-less leaker spawns a long-lived child, REPORTS its pid, and exits WITHOUT
  // killing it (the pre-fix failure shape). Liveness is checked by signal-0, not /bin/ps,
  // so the anti-green-by-assumption guarantee holds even where the process table is denied.
  const leaker = path.join(work, 'leaker.mjs');
  fs.writeFileSync(leaker, [
    "import * as cp from 'node:child_process';",
    `const c = cp.spawn(process.execPath, ['-e', 'setInterval(()=>{},1e9)', '${CANARY}'], { stdio: 'ignore' });`,
    "process.stdout.write('CANARY_PID=' + c.pid + '\\n');",
    'setTimeout(() => process.exit(0), 500);  // exit WITHOUT killing the child',
  ].join('\n'));
  const lp = spawn('node', [leaker], { stdio: ['ignore', 'pipe', 'ignore'] });
  let lout = '';
  lp.stdout.on('data', (d) => { lout += d.toString(); });
  await new Promise((res) => lp.on('close', () => res()));
  const canaryPid = (lout.match(/CANARY_PID=(\d+)/) || [])[1];
  await sleep(700); // let the leaker fully exit; the child is now orphaned if it leaked
  const leaked = canaryPid ? alive(canaryPid) : false;
  if (canaryPid) killPid(canaryPid); // reap the deliberately-leaked child
  check('RT-DETECT: a teardown-less leaker abandoning a live child IS caught (proof can go red)',
    leaked, { canaryPid: canaryPid ?? null, aliveAfterLeakerDeath: leaked, psFree: true });

  // ── RT-REAL (ps-based; honest-skip without ps or a language server) ───────────
  // HONEST SCOPE: this verifies the language-server path stays clean — but the LSP
  // toolchain self-exits on stdin-EOF when the router dies, so this is a FUNCTIONALITY
  // + hygiene check, NOT the discriminating leak test. (Disabling the router teardown
  // still leaves zero orphans here — empirically verified.) The real ~242-proc leak was
  // the socket-driven broker, which has no EOF trigger; RT-REAP below is its discriminating
  // test against the production parent-death reaper.
  if (!psAvailable || !hasLS) {
    check('RT-REAL: SKIPPED — process table or language server unavailable (honest unjudged)', true,
      { skipped: true, psAvailable, hasLS });
  } else {
    const content = fs.readFileSync(tsFile, 'utf8');
    const stdin = JSON.stringify({ content, rootUri: `file://${path.dirname(tsFile)}` });
    async function driveAndCheck(sigterm) {
      const proc = spawn('node', [router, 'diagnostics', tsFile, 'typescript'], { stdio: ['pipe', 'pipe', 'pipe'] });
      try { proc.stdin.write(stdin); proc.stdin.end(); } catch { /* */ }
      let out = ''; proc.stdout.on('data', (d) => { out += d.toString(); }); proc.stderr.on('data', () => {});
      let ls = null;
      for (let i = 0; i < 90 && ls === null; i += 1) {
        await sleep(50); const d = descendants(proc.pid, LS_RE); if (d.length) ls = d[0];
        if (sigterm && ls !== null) { try { proc.kill('SIGTERM'); } catch { /* */ } }
      }
      await new Promise((res) => proc.on('close', () => res()));
      return { ls, ok: /"ok":true/.test(out) };
    }
    const r1 = await driveAndCheck(false);
    check('RT-REAL/normal: router answers (functionality intact)', r1.ok, { ok: r1.ok });
    if (r1.ls) { await sleep(2500); check('RT-REAL/normal: ZERO orphaned LS child after normal exit', !alive(r1.ls), { lsPid: r1.ls }); if (alive(r1.ls)) killPid(r1.ls); }
    else check('RT-REAL/normal: no orphaned LS child', true, { lsPid: null });
    const r3 = await driveAndCheck(true);
    if (r3.ls) { await sleep(2500); check('RT-REAL/sigterm: ZERO orphaned LS child after gate-timeout SIGTERM', !alive(r3.ls), { lsPid: r3.ls }); if (alive(r3.ls)) killPid(r3.ls); }
    else check('RT-REAL/sigterm: no orphaned LS child', true, { lsPid: null });
  }

  // ── RT-REAP (THE discriminating real-leak test) — drives the PRODUCTION reaper ──
  // The 242-proc/704MB leak was the socket-/poll-driven broker orphaned to ppid=1 on an
  // ABNORMAL owner death (SIGKILL — uncatchable, so no teardown handler can fire). This
  // imports the SAME parent-death-reaper.mjs the broker uses, installs it on a broker-shaped
  // child, then SIGKILLs the child's OWNER (the exact leak trigger) and asserts the child
  // self-reaps. A byte-identical child WITHOUT the reaper is run as a control: it MUST orphan,
  // which is what proves this check is discriminating (it can go red) rather than vacuous.
  const reaperAbs = path.join(dir, '..', 'parent-death-reaper.mjs');
  async function reapTrial(withReaper) {
    const tag = withReaper ? 'reaper' : 'control';
    const childFile = path.join(work, `${tag}-child.mjs`);
    fs.writeFileSync(childFile, (withReaper
      ? `import { installParentDeathReaper } from ${JSON.stringify(reaperAbs)};\n` +
        `installParentDeathReaper({ intervalMs: 150, label: 'rt-reap', onOrphaned: () => process.exit(0) });\n`
      : '') + "process.stdout.write('C\\n');\nsetInterval(() => {}, 1e9); // socket-broker shape: never self-exits\n");
    const ownerFile = path.join(work, `${tag}-owner.mjs`);
    fs.writeFileSync(ownerFile, [
      "import * as cp from 'node:child_process';",
      `const c = cp.spawn(process.execPath, [${JSON.stringify(childFile)}], { detached: true, stdio: ['ignore','pipe','ignore'] });`,
      "c.stdout.on('data', (d) => { if (String(d).includes('C')) process.stdout.write('CHILD_PID=' + c.pid + '\\n'); });",
      'c.unref();',
      'setInterval(() => {}, 1e9); // owner stays alive until the proof SIGKILLs it',
    ].join('\n'));
    const owner = spawn('node', [ownerFile], { stdio: ['ignore', 'pipe', 'ignore'] });
    let oout = '';
    const childPid = await new Promise((res) => {
      const done = (v) => res(v);
      owner.stdout.on('data', (d) => { oout += d.toString(); const m = oout.match(/CHILD_PID=(\d+)/); if (m) done(m[1]); });
      setTimeout(() => done((oout.match(/CHILD_PID=(\d+)/) || [])[1] || null), 5000);
    });
    try { owner.kill('SIGKILL'); } catch { /* */ } // ABNORMAL owner death — the leak trigger
    let aliveAfter = Boolean(childPid);
    if (childPid) { for (let i = 0; i < 24 && (aliveAfter = alive(childPid)); i += 1) await sleep(150); }
    if (childPid && alive(childPid)) killPid(childPid); // reap a survivor (control case leaves one)
    return { childPid: childPid ?? null, orphaned: childPid ? aliveAfter : null };
  }
  const reaped = await reapTrial(true);
  check('RT-REAP/positive: broker-shaped child with the production reaper self-reaps on abnormal owner death',
    Boolean(reaped.childPid) && reaped.orphaned === false, reaped);
  const ctrl = await reapTrial(false);
  check('RT-REAP/discriminates: a byte-identical child WITHOUT the reaper DOES orphan (proof can go red)',
    Boolean(ctrl.childPid) && ctrl.orphaned === true, ctrl);

  // ── RT-CLEAN (always) — no tree pollution (L03 seed) ─────────────────────────
  const stray = fs.readdirSync(work).filter((f) => !KNOWN.has(f));
  check('RT-CLEAN: router/leaker/reaper runs leak zero stray artifacts into the tree', stray.length === 0, { stray });
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, psAvailable, hasLS, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
