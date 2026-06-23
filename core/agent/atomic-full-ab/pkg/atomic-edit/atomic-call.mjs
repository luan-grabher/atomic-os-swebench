#!/usr/bin/env node
/**
 * atomic-call.mjs — CLI wrapper that calls any kloel-atomic-edit MCP tool
 * via the running dist server. Formats args as JSON, sends a JSON-RPC
 * tools/call request over stdin, reads the response, and prints to stdout.
 *
 * Usage: node atomic-call.mjs <tool-name> [json-args-string]
 * Example: node atomic-call.mjs code_readcode '{"path":"src/foo.ts"}'
 */

import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

const nodeBin = process.env.ATOMIC_NODE_BIN || process.execPath;
const dir = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(dir, 'dist', 'server.js');

function ensureServerBuilt() {
  if (fs.existsSync(serverPath)) return;
  const buildPath = path.join(dir, 'build.mjs');
  if (!fs.existsSync(buildPath)) {
    process.stderr.write(`atomic-call: server not found at ${serverPath} and build script not found at ${buildPath}\n`);
    process.exit(1);
  }
  const res = spawnSync(nodeBin, [buildPath], {
    cwd: dir,
    env: { ...process.env, ATOMIC_DISABLE_HOT_RELOAD: '1' },
    encoding: 'utf8',
    timeout: Number(process.env.ATOMIC_CALL_BUILD_TIMEOUT_MS || 300000),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (res.status === 0 && fs.existsSync(serverPath)) return;
  const detail = `${res.stdout || ''}\n${res.stderr || ''}`.trim().slice(-2000);
  process.stderr.write(`atomic-call: failed to build ${serverPath}${detail ? `\n${detail}\n` : '\n'}`);
  process.exit(res.status || 1);
}

ensureServerBuilt();

const tool = process.argv[2];
if (!tool) {
  process.stderr.write('Usage: atomic-call.mjs <tool-name> [json-args]\n');
  process.exit(1);
}

let args = {};
if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    args = { path: process.argv[3] };
  }
}

const request = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: tool, arguments: args },
}) + '\n';

const server = spawn(nodeBin, [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ATOMIC_EDIT_MCP_SELF_HOSTED: '1', ATOMIC_EDIT_ALLOW_SELF_HOSTED: '1', ATOMIC_WORKSPACE_ROOT: '', ATOMIC_DECLARED_WORKSPACE_ROOT: '' },
});

let stdoutData = '';
let stderrData = '';

server.stdout.on('data', (d) => {
  stdoutData += d.toString();
  const allLines = stdoutData.split('\n');
  let jsonStr = '';
  for (const line of allLines) {
    if (line.startsWith('{')) {
      jsonStr = line;
    } else if (jsonStr && !line.startsWith('[')) {
      jsonStr += '\n' + line;
    }
  }
  if (jsonStr) {
    try {
      const response = JSON.parse(jsonStr);
      if (response.id === 1 || response.result || response.error) {
        if (response.error) {
          process.stderr.write(`atomic-call error: ${JSON.stringify(response.error)}\n`);
          process.exit(1);
        }
        const content = response.result?.content;
        // Print EVERY content item, not just content[0]. Tools like code_readcode/code_read_symbol
        // return a 2-item content: [0] a human summary ("Code is in the structured JSON payload") and
        // [1] the JSON payload that ACTUALLY HOLDS THE CODE. A CLI consumer (the agent dispatch) that
        // printed only content[0] was BLIND to the code and read-looped — a generalist representation
        // gap handicapping the whole atomic arm. Surfacing all items fixes it for every such tool.
        let printedText = false;
        if (Array.isArray(content) && content.length) {
          for (const item of content) {
            if (item && item.text != null) {
              try {
                console.log(JSON.stringify(JSON.parse(item.text), null, 2));
              } catch {
                console.log(item.text);
              }
              printedText = true;
            }
          }
        }
        const structured = response.result?.structuredContent;
        if (structured && typeof structured === 'object' && Object.keys(structured).length) {
          console.log(JSON.stringify(structured, null, 2));
          printedText = true;
        }
        if (!printedText) {
          console.log(JSON.stringify(response.result, null, 2));
        }
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      // Not fully buffered yet
    }
  }
});

server.stderr.on('data', (d) => {
  stderrData += d.toString();
  process.stderr.write(d); // Stream stderr to user
});

server.on('close', (code) => {
  if (code !== 0 && !stdoutData.includes('"result"')) {
    process.stderr.write(`atomic-call: server exited with code ${code}\n`);
    process.exit(1);
  }
});

server.stdin.write(request);
// Do NOT call server.stdin.end() so the server stays alive!
