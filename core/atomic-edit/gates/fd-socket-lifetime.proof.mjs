#!/usr/bin/env node
/**
 * fd-socket-lifetime.proof.mjs — PARADIGM L04: no orphaned fd / unix-socket / endpoint survives its owner.
 *
 * Sibling to resource-lifetime (L02): the broker leaks not just a PROCESS but its ENDPOINT — a unix
 * socket or a file-broker dir (broker.json + requests/ + responses/). On a clean reap the broker's
 * shutdown() does fs.rmSync(endpoint); the question this gate answers discriminatingly is whether an
 * ABNORMAL owner death (SIGKILL) still leaves the endpoint cleaned (via the parent-death reaper → shutdown).
 *
 *   FD1 — the REAL broker, on abnormal owner death, removes its endpoint (no orphaned socket/dir). GREEN.
 *   FD2 — DISCRIMINATING: a model endpoint-holder WITHOUT a reaper leaves its endpoint behind on owner death
 *         (the pre-fix shape) — proving the check can go RED.
 *
 * Self-cleaning. Belongs in the mandatory lattice.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));
const brokerPath = path.join(dir, '..', 'atomic-exec-broker.mjs');

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};
const alive = (pid) => { try { process.kill(Number(pid), 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-fd-proof-'));
try {
  // ── FD1: the REAL broker removes its endpoint on abnormal owner death ──────────
  {
    const brk = path.join(work, 'brk');
    const ownerFile = path.join(work, 'owner.mjs');
    const brokerEnv = {
      ...process.env,
      ATOMIC_EXEC_BROKER_ROOT: work,
      ATOMIC_EXEC_BROKER_SOCKET: '',
      ATOMIC_HOST_SANDBOX: '',
      ATOMIC_HOST_ATOMIC_ONLY: '',
      ATOMIC_ALLOW_NESTED_PROOF_BROKER: '',
      ATOMIC_HOST_WRITE_ROOT: work,
      CODEX_PROJECT_DIR: work,
    };
    fs.writeFileSync(ownerFile, [
      "import * as cp from 'node:child_process';",
      "const brokerArgs = " + JSON.stringify([brokerPath, 'file://' + brk]) + ";",
      "const brokerEnv = { ...process.env, ATOMIC_EXEC_BROKER_ROOT: " + JSON.stringify(work) + ", ATOMIC_EXEC_BROKER_SOCKET: '', ATOMIC_HOST_SANDBOX: '', ATOMIC_HOST_ATOMIC_ONLY: '', ATOMIC_ALLOW_NESTED_PROOF_BROKER: '', ATOMIC_HOST_WRITE_ROOT: " + JSON.stringify(work) + ", CODEX_PROJECT_DIR: " + JSON.stringify(work) + " };",
      "const b = cp.spawn(process.execPath, brokerArgs, { stdio: ['ignore','pipe','pipe'], env: brokerEnv });",
      "let seen=false; const e=(s)=>{ if(!seen && String(s).includes('ATOMIC_BROKER_READY')){ seen=true; console.log('BROKER_PID='+b.pid); } };",
      "b.stdout.on('data', e); b.stderr.on('data', e); setInterval(() => {}, 1e9);",
    ].join('\n'));
    const owner = spawn('node', [ownerFile], { stdio: ['ignore', 'pipe', 'ignore'], env: brokerEnv });
    let oo = '';
    const brokerPid = await new Promise((res) => {
      owner.stdout.on('data', (d) => { oo += d.toString(); const m = oo.match(/BROKER_PID=(\d+)/); if (m) res(m[1]); });
      setTimeout(() => res((oo.match(/BROKER_PID=(\d+)/) || [])[1] || null), 20000);
    });
    let endpointUpBefore = false;
    for (let i = 0; i < 20 && !(endpointUpBefore = fs.existsSync(path.join(brk, 'broker.json'))); i += 1) await sleep(500);
    try { owner.kill('SIGKILL'); } catch { /* */ }
    let ownerGone = false;
    let endpointGone = false;
    for (let i = 0; i < 50; i += 1) {
      ownerGone = !alive(owner.pid);
      endpointGone = !fs.existsSync(path.join(brk, 'broker.json'));
      if (ownerGone && endpointGone) break;
      await sleep(500);
    }
    const brokerAliveAfterWait = brokerPid ? alive(brokerPid) : false;
    if (brokerPid && brokerAliveAfterWait) { try { process.kill(Number(brokerPid), 'SIGKILL'); } catch { /* */ } }
    check('FD1: the real broker was live (endpoint published) then reaped its endpoint on abnormal owner death',
      endpointUpBefore && endpointGone, { ownerPid: owner.pid ?? null, ownerGone, brokerPid: brokerPid ?? null, endpointUpBefore, endpointGoneAfterReap: endpointGone, brokerAliveAfterWait });
  }

  // ── FD2: DISCRIMINATING — a reaper-less endpoint-holder leaks its endpoint ──────
  {
    const ep = path.join(work, 'orphan-endpoint');
    const holderFile = path.join(work, 'holder.mjs');
    // a holder that creates an endpoint dir+marker and installs NO reaper/cleanup
    fs.writeFileSync(holderFile, [
      "import * as fs from 'node:fs';",
      `fs.mkdirSync(${JSON.stringify(ep)}, { recursive: true });`,
      `fs.writeFileSync(${JSON.stringify(path.join(ep, 'endpoint.marker'))}, 'live');`,
      "process.stdout.write('UP\\n'); setInterval(() => {}, 1e9); // no reaper, no cleanup",
    ].join('\n'));
    const ownerFile = path.join(work, 'owner2.mjs');
    fs.writeFileSync(ownerFile, [
      "import * as cp from 'node:child_process';",
      `const c = cp.spawn(process.execPath, [${JSON.stringify(holderFile)}], { detached: true, stdio: ['ignore','pipe','ignore'] });`,
      "c.stdout.on('data', (d) => { if (String(d).includes('UP')) process.stdout.write('CHILD='+c.pid+'\\n'); });",
      "c.unref(); setInterval(() => {}, 1e9);",
    ].join('\n'));
    const owner = spawn('node', [ownerFile], { stdio: ['ignore', 'pipe', 'ignore'] });
    let oo = '';
    const childPid = await new Promise((res) => {
      owner.stdout.on('data', (d) => { oo += d.toString(); const m = oo.match(/CHILD=(\d+)/); if (m) res(m[1]); });
      setTimeout(() => res((oo.match(/CHILD=(\d+)/) || [])[1] || null), 5000);
    });
    const markerUp = fs.existsSync(path.join(ep, 'endpoint.marker'));
    try { owner.kill('SIGKILL'); } catch { /* */ }
    await sleep(3000);
    const markerSurvives = fs.existsSync(path.join(ep, 'endpoint.marker'));
    if (childPid && alive(childPid)) { try { process.kill(Number(childPid), 'SIGKILL'); } catch { /* */ } }
    check('FD2: a reaper-less endpoint-holder LEAKS its endpoint on owner death (proof can go RED)',
      markerUp && markerSurvives, { childPid: childPid ?? null, markerUp, markerSurvivesOwnerDeath: markerSurvives });
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
