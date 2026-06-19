#!/usr/bin/env node
/**
 * funnel-pyexec.mjs — robust ASYNC python execution for the funnel verifiers.
 *
 * Replaces spawnSync (which BLOCKS the node event loop — one looping LLM program freezes ALL concurrent
 * workers). The LLM programs we run (`python3 -c …`) do NOT spawn children, so a simple SIGKILL on the child
 * reaps a runaway loop reliably — no detached process group needed (that variant leaked/handing after ~dozens
 * of calls). Pipes are drained and the child is unref'd so a stuck child never keeps the loop alive.
 */
import { spawn } from 'node:child_process';

export function runPythonAsync(args, stdin = '', { timeoutMs = 8000, env, cwd } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('python3', args, { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ stdout: '', stderr: String(e), status: null, timedOut: false });
      return;
    }
    let out = '', err = '', done = false;
    const finish = (r) => {
      if (done) return; done = true;
      clearTimeout(timer);
      try { child.stdout.destroy(); child.stderr.destroy(); child.stdin.destroy(); } catch { /* */ }
      resolve(r);
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* */ }
      finish({ stdout: out, stderr: err + '\n[timeout]', status: null, timedOut: true });
    }, timeoutMs);
    child.on('error', (e) => finish({ stdout: out, stderr: String(e), status: null, timedOut: false }));
    child.stdout.on('data', (d) => {
      out += d;
      if (out.length > 2_000_000) { try { child.kill('SIGKILL'); } catch { /* */ } }
    });
    child.stderr.on('data', (d) => { err += d; if (err.length > 500_000) err = err.slice(-200_000); });
    child.on('close', (code) => finish({ stdout: out, stderr: err, status: code, timedOut: false }));
    try { child.stdin.on('error', () => {}); child.stdin.write(stdin); child.stdin.end(); } catch { /* */ }
    try { child.unref(); } catch { /* */ }
  });
}
