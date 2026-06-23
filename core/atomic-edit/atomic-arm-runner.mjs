#!/usr/bin/env node
/**
 * atomic-arm-runner.mjs — the ATOMIC arm of the omp-vs-Atomic A/B loop.
 *
 * Drives **DeepSeek V4 Pro** in an agent loop over a CURATED high-altitude atomic
 * surface, dispatching every mutation/execution to the REAL atomic MCP (123 tools)
 * via a long-lived stdio client. Orchestrator infrastructure (not atomic engine
 * source); the arm's mutations/executions all go through the real atomic MCP — no
 * native fallback, no third path. Every mutation leaves an atomic proof trace.
 *
 * Round-2 improvements (generalist, close the Round-1 loss classes):
 *  - CONTEXT COMPACTION: old tool results collapse to heads; recent stay verbatim.
 *    Kills the unbounded-history token blowup (Round-1 burned 190k prompt tokens).
 *  - CLEARER TOOL CONTRACT in the system prompt: prevents tool-misuse friction
 *    (code_read_symbol wants a SYMBOL name; atomic_create_file refuses existing files).
 *  - max-turns 25 + remaining-turns awareness so the model budgets and converges.
 *
 * Usage:
 *   node atomic-arm-runner.mjs --workspace <abs> --task <prompt|@file> \
 *     --acceptance "<cmd; exit 0 = pass>" [--model deepseek-v4-pro] [--max-turns 25] \
 *     [--server <dist/server.js>] [--metrics <out.json>]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const ATOMIC_ROOT = '/Users/danielpenin/atomic-os-swebench/core/atomic-edit';
const require = createRequire(ATOMIC_ROOT + '/');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const apiKey = process.env.DEEPSEEK_API_KEY;

// ── args ────────────────────────────────────────────────────────────────────
const A = Object.create(null);
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k.startsWith('--')) { A[k.slice(2)] = process.argv[++i]; }
}
const workspace = A.workspace;
const taskRaw = A.task;
const acceptanceCmd = A.acceptance;
const model = A.model || 'deepseek-v4-pro';
const maxTurns = parseInt(A['max-turns'] || '25', 10);
const serverJs = A.server || path.join(ATOMIC_ROOT, 'dist', 'server.js');
const metricsPath = A.metrics;

if (!workspace || !taskRaw || !acceptanceCmd) {
  console.error('Usage: atomic-arm-runner.mjs --workspace <abs> --task <prompt|@file> --acceptance <cmd> [--model deepseek-v4-pro] [--max-turns 25] [--metrics out.json]');
  process.exit(2);
}
if (!apiKey) { console.error('DEEPSEEK_API_KEY env missing'); process.exit(2); }

const task = taskRaw.startsWith('@') ? fs.readFileSync(taskRaw.slice(1), 'utf8') : taskRaw;

// ── atomic MCP client (long-lived) ──────────────────────────────────────────
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverJs],
  cwd: workspace,
  stderr: 'pipe',
  env: {
    ...process.env,
    ATOMIC_EDIT_REPO_ROOT: workspace,
    ATOMIC_EDIT_MCP_SELF_HOSTED: '1',
    ATOMIC_EDIT_ALLOW_SELF_HOSTED: '1',
    ATOMIC_DISABLE_HOT_RELOAD: '1',
  },
});
const client = new Client({ name: 'atomic-arm-runner', version: '1.0.0' }, { requestTimeout: 32 * 60 * 1000 });

async function callAtomic(name, args, timeoutMs) {
  const t0 = Date.now();
  try {
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: timeoutMs ?? 300000 });
    const text = Array.isArray(r?.content) ? r.content.map((c) => c?.text ?? '').join('\n') : JSON.stringify(r);
    const ok = !/^\s*\{\s*"ok"\s*:\s*false/i.test(text);
    return { ok, text, durationMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, text: String(e?.message ?? e), durationMs: Date.now() - t0 };
  }
}

// ── curated high-altitude surface (Round-1 lesson: 8 curated > 115 raw) ──────
const CURATED = ['code_outline', 'code_read_symbol', 'atomic_replace_text', 'atomic_create_file', 'atomic_edit_symbol', 'atomic_add_import', 'atomic_lens'];

function execSpec() {
  return {
    type: 'function',
    function: {
      name: 'atomic_exec',
      description: 'Run a shell command in the workspace (sandboxed, byte-proven). Use to run tests/builds and read output. Pass only command + a short intent.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command, run with cwd=workspace' },
          intent: { type: 'string', description: 'One-line purpose (e.g. "run pytest")' },
        },
        required: ['command'],
      },
    },
  };
}

function shallowSchema(tool) {
  const sch = tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : { type: 'object', properties: {} };
  return { type: 'function', function: { name: tool.name, description: (tool.description || '').slice(0, 400), parameters: sch } };
}

async function buildSurfaceSpecs() {
  const all = await client.listTools();
  const byName = new Map(all.tools.map((t) => [t.name, t]));
  const specs = [];
  for (const name of CURATED) {
    const t = byName.get(name);
    if (t) specs.push(shallowSchema(t));
    else console.error(`[atomic-arm] WARN: curated tool ${name} not exposed by MCP`);
  }
  specs.push(execSpec());
  return specs;
}

async function dispatch(toolName, args) {
  function rel(p) {
    if (!p || typeof p !== 'string') return p;
    if (path.isAbsolute(p)) return p;
    return path.join(workspace, p);
  }
  try {
    if (toolName === 'atomic_exec') {
      return await callAtomic('atomic_exec', {
        command: args.command, cwd: workspace, intent: args.intent || 'agent-driven',
        rollbackOnNonZero: false,
      }, 180000);
    }
    const mapped = { ...args };
    for (const k of ['file', 'path', 'fromFile', 'toFile']) if (mapped[k] !== undefined) mapped[k] = rel(mapped[k]);
    return await callAtomic(toolName, mapped);
  } catch (e) {
    return { ok: false, text: String(e?.message ?? e), durationMs: 0 };
  }
}

// ── DeepSeek chat completions ───────────────────────────────────────────────
async function callDeepSeek(messages, tools) {
  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, tools: tools.length ? tools : undefined, temperature: 0, max_tokens: 4096 }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek API ${resp.status}: ${err.slice(0, 400)}`);
  }
  const data = await resp.json();
  return { message: data.choices?.[0]?.message ?? { role: 'assistant', content: '' }, usage: data.usage ?? {} };
}

// ── CONTEXT COMPACTION (generalist; closes the unbounded-history loss class) ─
// Old tool results collapse to a short head; the most recent stay verbatim. Keeps
// the working set fresh and bounded so the model converges within the turn budget.
const RECENT_TOOL_KEEP = 6;
const RECENT_TOOL_CHARS = 1400;
const OLD_TOOL_CHARS = 160;
const ASSISTANT_TEXT_CHARS = 240;

function compactForApi(messages) {
  const toolIdx = [];
  messages.forEach((m, i) => { if (m.role === 'tool') toolIdx.push(i); });
  const recentTool = new Set(toolIdx.slice(-RECENT_TOOL_KEEP));
  return messages.map((m, i) => {
    if (m.role === 'system' || m.role === 'user') return m;
    if (m.role === 'tool') {
      const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return { ...m, content: recentTool.has(i) ? c.slice(0, RECENT_TOOL_CHARS) : `[older tool result] ${c.slice(0, OLD_TOOL_CHARS)}` };
    }
    if (m.role === 'assistant') {
      const c = typeof m.content === 'string' ? m.content : '';
      return { ...m, content: c.slice(0, ASSISTANT_TEXT_CHARS) };
    }
    return m;
  });
}

const SYSTEM_PROMPT = `You are the ATOMIC coding agent (DeepSeek V4 Pro) on the A/B loop.

GOAL: make the acceptance command exit 0 with the SMALLEST faithful change, then STOP (reply with text, no tool call).

TOOL USAGE CONTRACT (read carefully — misusing tools wastes your limited turns):
- code_read_symbol({file, selector}): \`selector\` is a SYMBOL NAME like "TaskQueue" or "add" — NEVER a file path. To see a whole file's structure use code_outline({file}) first.
- code_outline({file}): lists the symbols/structure of a file. Use this to READ before editing.
- atomic_create_file({file, content}): CREATES a NEW file only. It REFUSES if the file already exists and is non-empty. To change an existing file use atomic_replace_text or atomic_edit_symbol instead.
- atomic_replace_text({file, oldText, newText}): replace an EXACT text span. oldText must match verbatim (indentation included).
- atomic_edit_symbol({file, selector, code, ...}): edit a named symbol (function/class/method).
- atomic_exec({command, intent}): run a shell command (tests/imports) in the workspace.
- atomic_lens({file}): scan a file for red-like findings.

WORK LOOP (efficient):
1. code_outline the files you must change; read the spec tests.
2. Implement with atomic_replace_text / atomic_edit_symbol / atomic_create_file.
3. Run a CHEAP import/syntax check first: atomic_exec({command: "python3 -c 'import <pkg>'", intent:"import check"}) — catches NameError/missing-import in <0.1s.
4. Run the test suite: atomic_exec({command: "python3 -m pytest -q tests/", intent:"run tests"}). Read failures, fix, repeat.
5. When tests pass, STOP and write a one-line summary.

RULES: EVERY mutation via an atomic tool — never sed/patch/heredoc/echo-write. Use repo-relative paths. You have a LIMITED turn budget: prefer batched, correct edits over trial-and-error. Preserve everything not part of the intent.`;

// ── main loop ───────────────────────────────────────────────────────────────
const startedAt = Date.now();
let exitCode = 0;
const metrics = {
  arm: 'ATOMIC', model, workspace, task: task.slice(0, 400), acceptanceCmd,
  startedAt: new Date(startedAt).toISOString(),
  turns: 0, toolCalls: 0, atomicOk: 0, atomicFail: 0,
  promptTokens: 0, completionTokens: 0, receipts: [], finishReason: null, errors: [],
};

try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools.map((t) => t.name);
  console.error(`[atomic-arm] connected; ${tools.length} atomic tools; model=${model}; workspace=${workspace}; maxTurns=${maxTurns}`);
  const bindR = await callAtomic('atomic_workspace_bind', { root: workspace });
  console.error(`[atomic-arm] bind: ${bindR.ok ? 'OK' : 'FAILED'} ${bindR.text.slice(0, 120)}`);

  const surface = await buildSurfaceSpecs();
  console.error(`[atomic-arm] curated surface: ${surface.map((s) => s.function.name).join(', ')}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: task },
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    metrics.turns = turn + 1;
    if (turn === maxTurns - 4) {
      messages.push({ role: 'user', content: `[budget] ${maxTurns - turn - 1} turn(s) left. If tests are green, STOP now with a summary. Otherwise make the single most-correct fix.` });
    }
    let msg, usage;
    try {
      ({ message: msg, usage } = await callDeepSeek(compactForApi(messages), surface));
    } catch (e) {
      metrics.errors.push(`deepseek turn ${turn}: ${e.message}`);
      metrics.finishReason = 'api_error';
      break;
    }
    metrics.promptTokens += usage.prompt_tokens || 0;
    metrics.completionTokens += usage.completion_tokens || 0;
    messages.push(msg);
    const tcs = msg.tool_calls || [];
    console.error(`[atomic-arm] turn ${turn + 1}: ${tcs.length} tool call(s)${msg.content ? ' +text' : ''} (prompt=${usage.prompt_tokens || '?'})`);
    if (!tcs.length) {
      metrics.finishReason = 'model_done';
      metrics.finalText = typeof msg.content === 'string' ? msg.content.slice(0, 600) : '';
      break;
    }
    for (const tc of tcs) {
      metrics.toolCalls += 1;
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      const r = await dispatch(tc.function.name, args);
      metrics.receipts.push({ tool: tc.function.name, ok: r.ok, durationMs: r.durationMs, head: r.text.slice(0, 300) });
      r.ok ? (metrics.atomicOk += 1) : (metrics.atomicFail += 1);
      console.error(`[atomic-arm]   ${tc.function.name}: ${r.ok ? 'OK' : 'FAIL'} (${r.durationMs}ms) ${r.text.slice(0, 100).replace(/\n/g, ' ')}`);
      messages.push({ role: 'tool', tool_call_id: tc.id, content: r.text.slice(0, 4000) });
    }
    if (turn === maxTurns - 1) metrics.finishReason = 'max_turns';
  }

  // ── acceptance (objective, binary; orchestrator telemetry via governed exec) ─
  const probe = await callAtomic('atomic_exec', {
    command: `(${acceptanceCmd}) > /tmp/acc_out_$$.txt 2>&1; echo "EXIT=$?"; tail -n 15 /tmp/acc_out_$$.txt; rm -f /tmp/acc_out_$$.txt`,
    cwd: workspace, intent: 'A/B acceptance gate (captured exit code)', rollbackOnNonZero: false,
  }, 180000);
  const m = /EXIT=(\d+)/.exec(probe.text);
  const exitCode0 = m ? m[1] === '0' : false;
  metrics.acceptance = { cmd: acceptanceCmd, pass: exitCode0, exitCode: m ? m[1] : '?', output: probe.text.slice(0, 1500) };

  const diffStat = await callAtomic('atomic_exec', {
    command: 'git --no-pager diff --stat . && echo "---UNTRACKED---" && git status --porcelain',
    cwd: workspace, intent: 'capture diff surface for A/B metrics', rollbackOnNonZero: false,
  }, 60000);
  metrics.diffSurface = diffStat.text.slice(0, 2000);
} catch (e) {
  metrics.errors.push(`fatal: ${e?.stack || e}`);
  metrics.finishReason = 'crashed';
  exitCode = 1;
} finally {
  metrics.durationMs = Date.now() - startedAt;
  try { await client.close(); } catch {}
}

if (metricsPath) fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
process.stdout.write(JSON.stringify(metrics, null, 2) + '\n');
process.exit(exitCode);
