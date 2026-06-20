#!/usr/bin/env node
/**
 * agent-independence.proof.mjs — PARADIGM L16: the floor is a LAW obeyed by EVERY agent, not a
 * Claude-specific implementation. Claude, Codex and OpenCode each load the same atomic-only enforcement:
 * native / non-atomic mutations are DENIED, atomic_* tools are ALLOWED — so no agent can bypass the floor.
 *
 *   AI-claude  — atomic-only-hook.mjs DENIES a native Write, ALLOWS an atomic_* call.
 *   AI-codex   — codex-atomic-only-hook.mjs DENIES a native mutation, ALLOWS an atomic_* call (under the
 *                atomic-only sandbox env).
 *   AI-opencode— opencode-allin-atomic-only.config.json DENIES write/edit/bash, ALLOWS atomic_*.
 *   AI-LAW     — the SAME predicate (deny-native ∧ allow-atomic) holds across all three (agent-independence).
 *
 * Drives the real hooks via stdin (their PreToolUse protocol). Self-contained.
 */
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// Drive a hook with a tool-call payload; return { denied, out }.
function driveHook(hookRel, payload, env = {}) {
  const r = spawnSync('node', [path.join(root, hookRel)], {
    input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, ...env }, timeout: 30000,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const denied = /"permissionDecision"\s*:\s*"(deny|ask)"/.test(out);
  return { denied, out: out.slice(0, 200) };
}

const NATIVE_WRITE = { tool_name: 'Write', tool_input: { file_path: 'src/app.ts', content: 'export const x = 1;\n' } };
const ATOMIC_CALL = { tool_name: 'mcp__atomic-edit__atomic_replace_text', tool_input: { file: 'src/app.ts', oldText: 'a', newText: 'b' } };

// ── AI-claude ─────────────────────────────────────────────────────────────────
{
  const denyNative = driveHook('atomic-only-hook.mjs', NATIVE_WRITE);
  const allowAtomic = driveHook('atomic-only-hook.mjs', ATOMIC_CALL);
  check('AI-claude: atomic-only-hook DENIES native Write and ALLOWS atomic_* (floor obeyed)',
    denyNative.denied && !allowAtomic.denied, { nativeDenied: denyNative.denied, atomicDenied: allowAtomic.denied });
}

// ── AI-codex ──────────────────────────────────────────────────────────────────
{
  const codexEnv = { ATOMIC_HOST_SANDBOX: 'macos-sandbox-exec', ATOMIC_HOST_ATOMIC_ONLY: '1' };
  const denyNative = driveHook('codex-atomic-only-hook.mjs', NATIVE_WRITE, codexEnv);
  const allowAtomic = driveHook('codex-atomic-only-hook.mjs', ATOMIC_CALL, codexEnv);
  check('AI-codex: codex-atomic-only-hook DENIES native Write and ALLOWS atomic_* (floor obeyed)',
    denyNative.denied && !allowAtomic.denied, { nativeDenied: denyNative.denied, atomicDenied: allowAtomic.denied });
}

// ── AI-opencode ───────────────────────────────────────────────────────────────
{
  const cfg = JSON.parse(readFileSync(path.join(root, 'opencode-allin-atomic-only.config.json'), 'utf8'));
  const perm = cfg.permission ?? cfg;
  const nativeDenied = perm.write === 'deny' && perm.edit === 'deny' && perm.bash === 'deny' && perm['*'] === 'deny';
  const atomicAllowed = perm['atomic_*'] === 'allow' || perm['atomic-edit_*'] === 'allow' || perm['atomic_edit_*'] === 'allow';
  check('AI-opencode: permission policy DENIES write/edit/bash and ALLOWS atomic_* (floor obeyed)',
    nativeDenied && atomicAllowed, { nativeDenied, atomicAllowed });
}

// ── AI-LAW: the SAME predicate holds across all three (agent-independence) ──────
{
  const claudeOK = results.find((r) => r.name.startsWith('AI-claude'))?.ok;
  const codexOK = results.find((r) => r.name.startsWith('AI-codex'))?.ok;
  const opencodeOK = results.find((r) => r.name.startsWith('AI-opencode'))?.ok;
  check('AI-LAW: deny-native ∧ allow-atomic holds IDENTICALLY across Claude · Codex · OpenCode (agent-independent)',
    claudeOK && codexOK && opencodeOK, { claudeOK, codexOK, opencodeOK });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
