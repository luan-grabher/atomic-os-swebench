#!/usr/bin/env node
/**
 * atomic-call-bootstrap.proof.mjs
 *
 * Proves the local Atomic Agent CLI wrapper does not assume generated dist/
 * exists in a clean checkout. The dynamic fixture copies atomic-call.mjs into
 * a temp package with no dist/server.js, provides an offline build.mjs that
 * writes a minimal MCP server, then calls a tool through the wrapper.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const atomicCallSource = path.join(sourceDir, 'atomic-call.mjs');
const results = [];

function record(name, ok, detail = {}) {
  results.push({ name, ok: Boolean(ok), detail });
}

function fakeServerSource() {
  return [
    "let buffer = '';",
    "process.stdin.on('data', (chunk) => {",
    "  buffer += String(chunk);",
    "  const line = buffer.split(/\\n/).find((entry) => entry.trim().startsWith('{'));",
    "  if (!line) return;",
    "  const request = JSON.parse(line);",
    "  const payload = { ok: true, tool: request.params.name, args: request.params.arguments };",
    "  process.stdout.write(JSON.stringify({",
    "    jsonrpc: '2.0',",
    "    id: request.id,",
    "    result: { content: [{ type: 'text', text: JSON.stringify(payload) }] },",
    "  }) + '\\n');",
    "});",
  ].join('\n') + '\n';
}

function fakeBuildSource() {
  return [
    "import * as fs from 'node:fs';",
    "import * as path from 'node:path';",
    "const countFile = path.join(process.cwd(), 'build-count.txt');",
    "const count = fs.existsSync(countFile) ? Number(fs.readFileSync(countFile, 'utf8')) : 0;",
    "fs.writeFileSync(countFile, String(count + 1));",
    "fs.mkdirSync(path.join(process.cwd(), 'dist'), { recursive: true });",
    "fs.writeFileSync(path.join(process.cwd(), 'dist', 'server.js'), " + JSON.stringify(fakeServerSource()) + ");",
  ].join('\n') + '\n';
}

function runFixtureCall(root, value) {
  return spawnSync(process.execPath, ['atomic-call.mjs', 'fixture_ping', JSON.stringify({ value })], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      ATOMIC_NODE_BIN: process.execPath,
      ATOMIC_CALL_BUILD_TIMEOUT_MS: '15000',
    },
  });
}

const source = fs.readFileSync(atomicCallSource, 'utf8');
const ensureIndex = source.indexOf('ensureServerBuilt();');
const toolIndex = source.indexOf('const tool = process.argv[2];');
record(
  'atomic-call has an offline lazy-build path for missing dist/server.js',
  source.includes("import { spawn, spawnSync } from 'node:child_process';") &&
    source.includes('function ensureServerBuilt()') &&
    source.includes("path.join(dir, 'build.mjs')") &&
    source.includes('ATOMIC_CALL_BUILD_TIMEOUT_MS') &&
    ensureIndex > 0 &&
    toolIndex > ensureIndex,
  {
    hasSpawnSync: source.includes("import { spawn, spawnSync } from 'node:child_process';"),
    hasEnsureServerBuilt: source.includes('function ensureServerBuilt()'),
    usesBuildScript: source.includes("path.join(dir, 'build.mjs')"),
    hasTimeoutEnv: source.includes('ATOMIC_CALL_BUILD_TIMEOUT_MS'),
    invokedBeforeToolCall: ensureIndex > 0 && toolIndex > ensureIndex,
  },
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-call-bootstrap-'));
try {
  fs.copyFileSync(atomicCallSource, path.join(root, 'atomic-call.mjs'));
  fs.writeFileSync(path.join(root, 'build.mjs'), fakeBuildSource());

  const first = runFixtureCall(root, 1);
  const firstOutput = String(first.stdout || '') + '\n' + String(first.stderr || '');
  record(
    'atomic-call builds dist/server.js and completes a tool call when started from a checkout without dist',
    first.status === 0 &&
      fs.existsSync(path.join(root, 'dist', 'server.js')) &&
      fs.readFileSync(path.join(root, 'build-count.txt'), 'utf8') === '1' &&
      firstOutput.includes('"ok": true') &&
      firstOutput.includes('"tool": "fixture_ping"'),
    { status: first.status, signal: first.signal, stdout: first.stdout, stderr: first.stderr },
  );

  const second = runFixtureCall(root, 2);
  const secondOutput = String(second.stdout || '') + '\n' + String(second.stderr || '');
  record(
    'atomic-call reuses existing dist/server.js instead of rebuilding on every call',
    second.status === 0 &&
      fs.readFileSync(path.join(root, 'build-count.txt'), 'utf8') === '1' &&
      secondOutput.includes('"value": 2'),
    { status: second.status, signal: second.signal, stdout: second.stdout, stderr: second.stderr },
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

const ok = results.every((entry) => entry.ok);
if (jsonMode) console.log(JSON.stringify({ ok, results }, null, 2));
else for (const entry of results) console.log((entry.ok ? 'PASS' : 'FAIL') + ' ' + entry.name);
process.exit(ok ? 0 : 1);
