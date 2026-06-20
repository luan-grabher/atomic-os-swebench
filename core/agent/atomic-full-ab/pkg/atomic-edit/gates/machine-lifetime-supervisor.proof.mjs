#!/usr/bin/env node
/**
 * machine-lifetime-supervisor.proof.mjs — PARADIGM L15: K concurrent host instances bound total resource use.
 *
 *   ML-census      — the machine-wide census returns a structured view (procs, totalRssMB, orphans, hostStacks).
 *   ML-orphan-bound— the live atomic orphan count is BOUNDED (the unbounded term is reaped; steady-state small).
 *   ML-discriminate— a SYNTHETIC orphan is detected by the census and reaped (the supervisor can go red+act).
 *   ML-bound-K     — K=3 concurrent reaper-children, on simultaneous owner death, ALL self-reap → the canary
 *                    population returns to 0 (resource use is bounded by live hosts, never accumulates).
 *
 * Drives the real machine-lifetime-census.mjs + parent-death-reaper.mjs. Self-cleaning. ps-absent → honest skip.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { census, reapOrphans } from '../machine-lifetime-census.mjs';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));
const reaperAbs = path.join(dir, '..', 'parent-death-reaper.mjs');

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};
const alive = (pid) => { try { process.kill(Number(pid), 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CANARY = 'ATOMIC_ML_CANARY';
const CANARY_RE = new RegExp(CANARY);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-ml-proof-'));

try {
  // ── ML-census ────────────────────────────────────────────────────────────────
  const c0 = census();
  if (!c0.available) {
    check('ML: SKIPPED — ps unavailable (honest unjudged)', true, { available: false });
  } else {
    check('ML-census: machine-wide census returns a structured atomic-lifetime view',
      typeof c0.procs === 'number' && typeof c0.totalRssMB === 'number' && Array.isArray(c0.orphans) && typeof c0.hostStacks === 'number',
      { procs: c0.procs, totalRssMB: c0.totalRssMB, orphans: c0.orphans.length, hostStacks: c0.hostStacks });

    // ── ML-orphan-bound: the live atomic orphan count is bounded (reaper keeps it small) ──
    check('ML-orphan-bound: live atomic ppid=1 orphan count is bounded (reaper holds it; the unbounded term is reaped)',
      c0.orphans.length <= 2, { liveOrphans: c0.orphans.length });

    // ── ML-discriminate: a synthetic orphan IS detected + reaped ──────────────────
    {
      const canaryFile = path.join(work, 'canary.mjs');
      fs.writeFileSync(canaryFile, `process.title = ${JSON.stringify(CANARY)};\nsetInterval(() => {}, 1e9);\n`);
      const ownerFile = path.join(work, 'owner.mjs');
      fs.writeFileSync(ownerFile, [
        "import * as cp from 'node:child_process';",
        `const c = cp.spawn(process.execPath, ['-e', 'setInterval(()=>{},1e9)', ${JSON.stringify(CANARY)}], { detached: true, stdio: 'ignore' });`,
        "process.stdout.write('PID=' + c.pid + '\\n'); c.unref(); setTimeout(() => process.exit(0), 400);",
      ].join('\n'));
      const owner = spawn('node', [ownerFile], { stdio: ['ignore', 'pipe', 'ignore'] });
      let oo = '';
      const canaryPid = await new Promise((res) => { owner.stdout.on('data', (d) => { oo += d; const m = oo.match(/PID=(\d+)/); if (m) res(m[1]); }); setTimeout(() => res((oo.match(/PID=(\d+)/) || [])[1] || null), 4000); });
      await sleep(900); // owner exits → canary orphaned (ppid=1)
      const detected = census(CANARY_RE).orphans.map(String).includes(String(canaryPid));
      const reaped = reapOrphans(CANARY_RE).map(String).includes(String(canaryPid));
      if (canaryPid && alive(canaryPid)) { try { process.kill(Number(canaryPid), 'SIGKILL'); } catch { /* */ } }
      check('ML-discriminate: a synthetic orphan IS detected by the census and reaped (supervisor can act)',
        detected && reaped, { canaryPid: canaryPid ?? null, detected, reaped });
    }

    // ── ML-bound-K: K concurrent reaper-children all self-reap on owner death ──────
    {
      const K = 3;
      const child = path.join(work, 'kchild.mjs');
      fs.writeFileSync(child,
        `import { installParentDeathReaper } from ${JSON.stringify(reaperAbs)};\n` +
        `installParentDeathReaper({ intervalMs: 150, label: 'ml-k', onOrphaned: () => process.exit(0) });\n` +
        `process.stdout.write('C\\n'); setInterval(() => {}, 1e9); // ${CANARY}\n`);
      const ownerSrc = (i) => [
        "import * as cp from 'node:child_process';",
        `const c = cp.spawn(process.execPath, [${JSON.stringify(child)}, ${JSON.stringify(CANARY + '_' + i)}], { detached: true, stdio: ['ignore','pipe','ignore'] });`,
        "c.stdout.on('data', (d) => { if (String(d).includes('C')) process.stdout.write('UP='+c.pid+'\\n'); });",
        'c.unref(); setInterval(() => {}, 1e9);',
      ].join('\n');
      const owners = [], childPids = [];
      for (let i = 0; i < K; i += 1) {
        const of = path.join(work, `kowner${i}.mjs`); fs.writeFileSync(of, ownerSrc(i));
        const ow = spawn('node', [of], { stdio: ['ignore', 'pipe', 'ignore'] }); owners.push(ow);
        let buf = '';
        const pid = await new Promise((res) => { ow.stdout.on('data', (d) => { buf += d; const m = buf.match(/UP=(\d+)/); if (m) res(m[1]); }); setTimeout(() => res((buf.match(/UP=(\d+)/) || [])[1] || null), 5000); });
        if (pid) childPids.push(pid);
      }
      const spawnedK = childPids.length;
      for (const ow of owners) { try { ow.kill('SIGKILL'); } catch { /* */ } } // simultaneous abnormal death of all K owners
      let allReaped = false;
      for (let i = 0; i < 24 && !allReaped; i += 1) { await sleep(150); allReaped = childPids.every((p) => !alive(p)); }
      for (const p of childPids) if (alive(p)) { try { process.kill(Number(p), 'SIGKILL'); } catch { /* */ } }
      check(`ML-bound-K: ${K} concurrent reaper-children all self-reap on owner death → resource use bounded, no accumulation`,
        spawnedK === K && allReaped, { spawnedK, K, allReaped });
    }
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
