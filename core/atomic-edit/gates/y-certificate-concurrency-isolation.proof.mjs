#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(sourceDir, '..', '..');
const statePath = path.join(repoRoot, '.atomic', 'codex-broker-current.json');

function parseJson(stdout) {
  try {
    return JSON.parse(stdout || '{}');
  } catch (error) {
    return { parseError: error instanceof Error ? error.message : String(error), stdout: String(stdout).slice(0, 2000) };
  }
}

function runTask(name, args, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const proc = childProcess.spawn(process.execPath, args, {
      cwd: sourceDir,
      env: { ...process.env, ATOMIC_EXEC_BROKER_SOCKET: '', ATOMIC_EXEC_BROKER_ROOT: '', ATOMIC_USE_BROKER_STATE: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
      } catch {
        // best effort
      }
    }, timeoutMs);
    proc.stdout.on('data', (chunk) => { stdout += String(chunk); });
    proc.stderr.on('data', (chunk) => { stderr += String(chunk); });
    proc.on('exit', (status, signal) => {
      clearTimeout(timer);
      const parsed = parseJson(stdout);
      resolve({ name, status, signal, ok: status === 0 && parsed?.ok === true, parsed, stderr: stderr.slice(0, 2000) });
    });
    proc.on('error', (error) => {
      clearTimeout(timer);
      resolve({ name, status: null, signal: null, ok: false, error: error instanceof Error ? error.message : String(error), parsed: null, stderr });
    });
  });
}

function waitForBrokerState(proc, previousState, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      try {
        const payload = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (payload?.agent === 'codex' && payload?.socket && (!previousState || payload.socket !== previousState.socket)) {
          resolve({ ok: true, payload });
          return;
        }
      } catch {
        // not ready yet
      }
      if (proc.exitCode !== null || Date.now() > deadline) {
        resolve({ ok: false });
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

async function main() {
  let previousStateText = null;
  let previousState = null;
  try {
    previousStateText = fs.readFileSync(statePath, 'utf8');
    previousState = parseJson(previousStateText);
  } catch {
    previousStateText = null;
  }

  const holder = childProcess.spawn(
    process.execPath,
    [path.join(sourceDir, 'codex-atomic-host-launcher.mjs'), '--', process.execPath, '-e', 'setTimeout(() => {}, 15000)'],
    { cwd: sourceDir, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let holderStdout = '';
  let holderStderr = '';
  holder.stdout.on('data', (chunk) => { holderStdout += String(chunk); });
  holder.stderr.on('data', (chunk) => { holderStderr += String(chunk); });

  const brokerState = await waitForBrokerState(holder, previousState);
  if (!brokerState.ok) {
    try { holder.kill('SIGTERM'); } catch {}
    return { ok: false, reason: 'host launcher did not publish broker state in time', holderStdout, holderStderr };
  }

  try {
    const tasks = await Promise.all([
      runTask('bypass-observer-a', [path.join(sourceDir, 'gates/codex-bypass-observer-wiring.proof.mjs'), '--json'], 60000),
      runTask('bypass-observer-b', [path.join(sourceDir, 'gates/codex-bypass-observer-wiring.proof.mjs'), '--json'], 60000),
      runTask('atomic-exec-sandbox', [path.join(sourceDir, 'gates/atomic-exec-sandbox.proof.mjs'), '--json'], 120000),
      runTask('external-runtime-denial', [path.join(sourceDir, 'gates/external-runtime-denial.proof.mjs'), '--json'], 120000),
      runTask('compiled-mcp-y-certificate', [path.join(sourceDir, 'gates/compiled-mcp-y-certificate.proof.mjs'), '--json'], 180000),
    ]);
    return {
      ok: tasks.every((task) => task.ok),
      brokerStateObserved: true,
      taskCount: tasks.length,
      results: tasks.map((task) => ({
        name: task.name,
        ok: task.ok,
        status: task.status,
        signal: task.signal,
        parsedOk: task.parsed?.ok,
        stderr: task.ok ? '' : task.stderr,
        parsedSummary: task.ok ? undefined : task.parsed,
      })),
    };
  } finally {
    try { holder.kill('SIGTERM'); } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const current = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8') : '';
      const currentPayload = current ? parseJson(current) : null;
      if (previousStateText && (!currentPayload?.socket || currentPayload.socket === brokerState.payload.socket)) {
        fs.writeFileSync(statePath, previousStateText, { mode: 0o600 });
      }
    } catch {
      // best effort restoration only; the launcher normally clears its own state.
    }
  }
}

main()
  .then((payload) => {
    if (jsonMode || !payload.ok) console.log(JSON.stringify(payload, null, 2));
    process.exit(payload.ok ? 0 : 1);
  })
  .catch((error) => {
    console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exit(1);
  });
