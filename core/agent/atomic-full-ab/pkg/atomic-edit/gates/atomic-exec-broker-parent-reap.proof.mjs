#!/usr/bin/env node
/**
 * atomic-exec-broker-parent-reap.proof.mjs — proves the broker's PARENT-DEATH
 * REAPER (atomic-exec-broker.mjs). The broker is always a child of the host
 * launcher / supervisor that owns its lifetime; on an ABNORMAL parent death
 * (SIGKILL, crash, a timeout-killed gate) no SIGTERM is delivered and the broker,
 * which reads no stdin, would otherwise be reparented to launchd (ppid 1) and
 * listen forever. Hundreds of such orphans were the dominant atomic-edit RAM leak —
 * and the 53-validator lattice had ZERO process/resource-lifetime coverage, so the
 * leak was invisible to it. This gate closes that class.
 *
 *   CONTROL — while the owning parent stays alive, the broker keeps serving.
 *   REAP    — when the owning parent is SIGKILLed, the broker self-terminates
 *             within the poll window (no launchd orphan left behind).
 *
 * Pure: spawns into os.tmpdir(), kills only its own descendants, self-cleans.
 * Run: node scripts/mcp/atomic-edit/gates/atomic-exec-broker-parent-reap.proof.mjs [--json]
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const BROKER = path.join(dir, '..', 'atomic-exec-broker.mjs');
const jsonMode = process.argv.includes('--json');
const results = [];
let pass = 0;
let fail = 0;
function check(name, cond, detail = {}) {
  const ok = Boolean(cond);
  results.push({ name, ok, detail });
  if (ok) { pass += 1; if (!jsonMode) console.log('  PASS ', name); }
  else { fail += 1; if (!jsonMode) console.log('  FAIL ', name, JSON.stringify(detail)); }
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeoutMs, stepMs = 100) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { if (await fn()) return true; await sleep(stepMs); }
  return false;
}

// An intermediate "owner" process that spawns the broker as ITS child and reports
// the broker pid on stdout, then idles. SIGKILLing this owner orphans the broker —
// exactly the abnormal death the reaper must catch. --no-sandbox so the proof runs
// without macOS sandbox-exec semantics (the reaper is sandbox-agnostic). The file
// endpoint must live within ATOMIC_EXEC_BROKER_ROOT, so the root is pinned to tmp.
function ownerScript(socketDir, rootDir) {
  return [
    'const { spawn } = require("node:child_process");',
    `const b = spawn(process.execPath, [${JSON.stringify(BROKER)}, "--no-sandbox", ${JSON.stringify('file://' + socketDir)}], { stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, ATOMIC_EXEC_BROKER_ROOT: ${JSON.stringify(rootDir)} } });`,
    'process.stdout.write("BROKER_PID " + b.pid + "\\n");',
    'b.stdout.on("data", () => {});',
    'setInterval(() => {}, 1 << 30);',
  ].join('\n');
}

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-broker-reap-'));
  const socketDir = path.join(tmp, 'ep');
  let owner = null;
  let brokerPid = null;
  try {
    owner = spawn(process.execPath, ['-e', ownerScript(socketDir, tmp)], { stdio: ['ignore', 'pipe', 'ignore'] });
    let buf = '';
    owner.stdout.on('data', (d) => {
      buf += String(d);
      const m = buf.match(/BROKER_PID (\d+)/);
      if (m && brokerPid === null) brokerPid = Number(m[1]);
    });

    const gotPid = await waitFor(() => brokerPid !== null, 8000);
    check('broker spawned under owner (pid reported)', gotPid && brokerPid > 1, { brokerPid });
    if (!gotPid) return;

    const becameAlive = await waitFor(() => alive(brokerPid), 8000);
    check('broker process is alive under living owner', becameAlive, { brokerPid });

    // CONTROL: broker must NOT reap while its owner is alive.
    await sleep(3000); // > one 2s poll interval
    check('CONTROL: broker still alive after 3s with owner alive (no false reap)', alive(brokerPid), { brokerPid });

    // REAP: kill the owner abnormally; the broker is now orphaned (parent gone).
    const ownerPid = owner.pid;
    try { process.kill(ownerPid, 'SIGKILL'); } catch { /* already gone */ }
    const ownerGone = await waitFor(() => !alive(ownerPid), 4000);
    check('owner SIGKILLed (abnormal death simulated)', ownerGone, { ownerPid });

    // Reaper polls every 2s; allow generous slack for scheduling under load.
    const reaped = await waitFor(() => !alive(brokerPid), 9000);
    check('REAP: orphaned broker self-terminated within poll window', reaped, { brokerPid });

    if (!reaped) {
      try { process.kill(brokerPid, 'SIGKILL'); } catch { /* noop */ }
    }
  } finally {
    try { if (owner && alive(owner.pid)) process.kill(owner.pid, 'SIGKILL'); } catch { /* noop */ }
    try { if (brokerPid && alive(brokerPid)) process.kill(brokerPid, 'SIGKILL'); } catch { /* noop */ }
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

await run();
if (jsonMode) {
  console.log(JSON.stringify({ ok: fail === 0, passed: pass, failed: fail, results }, null, 2));
} else {
  console.log(`\n${pass} passed, ${fail} failed`);
}
process.exitCode = fail === 0 ? 0 : 1;
