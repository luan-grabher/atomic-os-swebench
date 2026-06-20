#!/usr/bin/env node
/** Proves the public package test command stays green. */
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const command = 'npm test -- --run --pool=threads --maxWorkers=1';
const newline = String.fromCharCode(10);

function tail(text, max = 6000) {
  if (!text) return '';
  return text.length > max ? text.slice(text.length - max) : text;
}

const result = spawnSync('npm', ['test', '--', '--run', '--pool=threads', '--maxWorkers=1'], {
  cwd: sourceDir,
  encoding: 'utf8',
  timeout: 120000,
  maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, CI: '1' },
});

const ok = result.status === 0;
const payload = {
  ok,
  gate: 'vitest-package-suite',
  command,
  status: result.status,
  signal: result.signal,
  error: result.error ? result.error.message : null,
  stdoutTail: tail(result.stdout),
  stderrTail: tail(result.stderr),
};

if (jsonMode) process.stdout.write(JSON.stringify(payload, null, 2) + newline);
else {
  process.stdout.write((ok ? 'PASS' : 'FAIL') + ' ' + command + newline);
  if (!ok) process.stdout.write(JSON.stringify(payload, null, 2) + newline);
}
process.exit(ok ? 0 : 1);
