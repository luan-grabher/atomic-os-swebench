#!/usr/bin/env node
/**
 * atomic-worker.mjs — universal atomic-MCP client runner.
 *
 * Spawns the rebuilt atomic-edit MCP server as a subprocess, binds it to a
 * caller-specified workspace (the task worktree), and exposes the full atomic
 * tool surface (123 tools) to any script — bypassing the opencode session
 * schema cap (Gap C: opencode exposes only ~15 atomic tools to the live
 * session; this client sees ALL tools because it queries tools/list fresh).
 *
 * GENERALIST capability (Constitution-aligned, not task-specific):
 *   - any benchmark / CI / loop can use this to dispatch atomic-only work
 *   - any script can call atomic tools without depending on a host CLI
 *   - captures receipts/traces for proof-of-work metrics
 *
 * Usage:
 *   node atomic-worker.mjs --workspace <abs-path> --task <task-spec.json>
 *   node atomic-worker.mjs --workspace <abs-path> --probe  # smoke test
 *
 * Task spec format (JSON file):
 *   {
 *     "description": "...",
 *     "steps": [
 *       { "tool": "code_outline", "args": { "file": "..." } },
 *       { "tool": "atomic_edit_symbol", "args": { ... } },
 *       ...
 *     ],
 *     "validation": [ { "tool": "atomic_exec", "args": { ... } } ]
 *   }
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, arr) => {
  if (cur.startsWith('--')) { acc.push([cur.slice(2), arr[i + 1]]); }
  return acc;
}, []));

const workspace = args.workspace;
const taskSpecPath = args.task;
const probe = args.probe === 'true' || process.argv.includes('--probe');
const serverJs = args.server || path.join(here, 'dist', 'server.js');

if (!workspace) {
  console.error('Usage: atomic-worker.mjs --workspace <abs-path> [--task spec.json | --probe] [--server path/to/dist/server.js]');
  process.exit(2);
}

if (!fs.existsSync(serverJs)) {
  console.error('atomic-worker: dist/server.js not found at', serverJs);
  console.error('Run node build.mjs in the atomic-edit source first.');
  process.exit(2);
}

// ── Spawn the rebuilt MCP server ────────────────────────────────────────────
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverJs],
  cwd: workspace,
  stderr: 'pipe',
  env: {
    ...process.env,
    ATOMIC_EDIT_REPO_ROOT: workspace,  // anchor here so bind is a no-op confirm
    ATOMIC_EDIT_MCP_SELF_HOSTED: '1',
    ATOMIC_EDIT_ALLOW_SELF_HOSTED: '1',
    ATOMIC_DISABLE_HOT_RELOAD: '1',
  },
});
const client = new Client({ name: 'atomic-worker', version: '1.0.0' }, { requestTimeout: 32 * 60 * 1000 });

// ── Tool-call helper with receipt capture ───────────────────────────────────
// Kernel tools (atomic_expand_self, atomic_self_evolution) run the full proof
// battery inside their own budget (~30min). The MCP SDK default request
// timeout is 60s — way too short. Per-call timeout is sized to the tool class.
const KERNEL_TOOLS = new Set(['atomic_expand_self', 'atomic_self_evolution', 'atomic_converge']);
const receipts = [];
async function callTool(name, toolArgs) {
  const t0 = Date.now();
  const timeout = KERNEL_TOOLS.has(name) ? 32 * 60 * 1000 : 5 * 60 * 1000;
  try {
    const r = await client.callTool({ name, arguments: toolArgs }, undefined, { timeout });
    const dt = Date.now() - t0;
    const text = Array.isArray(r?.content) ? r.content.map((c) => c?.text ?? '').join('\n') : JSON.stringify(r);
    const ok = !/^\s*\{\s*"ok":\s*false/i.test(text) && !/"error"\s*:\s*"/i.test(text);
    const receipt = { tool: name, args: toolArgs, ok, durationMs: dt, responseHead: text.slice(0, 800) };
    receipts.push(receipt);
    return { ok, text, receipt };
  } catch (e) {
    const dt = Date.now() - t0;
    const receipt = { tool: name, args: toolArgs, ok: false, durationMs: dt, error: e?.message ?? String(e) };
    receipts.push(receipt);
    return { ok: false, text: '', receipt };
  }
}

async function listTools() {
  const t = await client.listTools();
  return t.tools.map((x) => x.name).sort();
}

// ── Main ────────────────────────────────────────────────────────────────────
let exitCode = 0;
try {
  await client.connect(transport);
  const tools = await listTools();
  console.error(`[atomic-worker] connected; ${tools.length} tools exposed; workspace=${workspace}`);

  // Bind to workspace (idempotent — ATOMIC_EDIT_REPO_ROOT already anchors here,
  // but binding also proves the capability works for the proof record).
  const bindR = await callTool('atomic_workspace_bind', { root: workspace });
  console.error(`[atomic-worker] bind: ${bindR.ok ? 'OK' : 'FAILED'}`);

  if (probe) {
    // PROBE: do a few representative atomic ops + return metrics.
    // This proves the worker can ACTUALLY use the atomic surface end-to-end.
    const probePlan = [
      { tool: 'atomic_workspace_status', args: {} },
      { tool: 'code_outline', args: { file: path.join(workspace, 'cli/cmd/mcp.go') } },
      { tool: 'atomic_exec', args: {
          command: 'git status --porcelain',
          cwd: workspace,
          intent: 'probe: confirm worktree clean before A/B work',
          rollbackOnNonZero: false,
          proveEffect: false,
        } },
    ];
    for (const step of probePlan) {
      const r = await callTool(step.tool, step.args);
      console.error(`[atomic-worker] probe ${step.tool}: ${r.ok ? 'OK' : 'FAIL'} (${r.receipt.durationMs}ms)`);
      if (!r.ok) exitCode = 1;
    }
    // Print probe summary
    console.log(JSON.stringify({
      worker: 'atomic-worker probe',
      workspace,
      toolsExposed: tools.length,
      receipts,
      summary: {
        totalOps: receipts.length,
        okOps: receipts.filter((r) => r.ok).length,
        failOps: receipts.filter((r) => !r.ok).length,
        totalDurationMs: receipts.reduce((s, r) => s + r.durationMs, 0),
      },
    }, null, 2));
  } else if (taskSpecPath) {
    // TASK: execute a full task spec.
    const spec = JSON.parse(fs.readFileSync(taskSpecPath, 'utf8'));
    console.error(`[atomic-worker] task: ${spec.description ?? '(unnamed)'}`);
    let stepOk = 0, stepFail = 0;
    for (const step of spec.steps ?? []) {
      const r = await callTool(step.tool, step.args);
      console.error(`[atomic-worker] step ${step.tool}: ${r.ok ? 'OK' : 'FAIL'} (${r.receipt.durationMs}ms)`);
      if (r.ok) stepOk += 1; else stepFail += 1;
      if (!r.ok && step.required !== false) {
        console.error(`[atomic-worker] required step failed; aborting.`);
        exitCode = 1;
        break;
      }
    }
    if (exitCode === 0) {
      for (const v of spec.validation ?? []) {
        const r = await callTool(v.tool, v.args);
        console.error(`[atomic-worker] validation ${v.tool}: ${r.ok ? 'OK' : 'FAIL'} (${r.receipt.durationMs}ms)`);
        if (!r.ok) exitCode = 1;
      }
    }
    console.log(JSON.stringify({
      worker: 'atomic-worker task',
      task: spec.description,
      workspace,
      toolsExposed: tools.length,
      receipts,
      summary: {
        stepsOk: stepOk,
        stepsFail: stepFail,
        totalOps: receipts.length,
        totalDurationMs: receipts.reduce((s, r) => s + r.durationMs, 0),
      },
    }, null, 2));
  } else {
    // Just report tool list + bind status.
    console.log(JSON.stringify({
      worker: 'atomic-worker status',
      workspace,
      toolsExposed: tools.length,
      hasBind: tools.includes('atomic_workspace_bind'),
      hasExec: tools.includes('atomic_exec'),
      hasEditText: tools.includes('atomic_replace_text'),
      hasEditSymbol: tools.includes('atomic_edit_symbol'),
      hasAddImport: tools.includes('atomic_add_import'),
      hasCreateFile: tools.includes('atomic_create_file'),
      hasOutline: tools.includes('code_outline'),
      hasReadSymbol: tools.includes('code_read_symbol'),
      receipts,
    }, null, 2));
  }
} catch (e) {
  console.error('[atomic-worker] crashed:', e?.stack || e);
  exitCode = 2;
} finally {
  try { await client.close(); } catch {}
}

process.exit(exitCode);
