#!/usr/bin/env node
/**
 * funnel-humaneval.mjs — PARADIGM PART F.4 layer-2: HumanEval adapter + deterministic verifier.
 *
 * HumanEval: 164 Python function-completion tasks, each with a `test` (a check() of asserts) — a DETERMINISTIC
 * verifier. The answer unit is the whole function (atomic), so the funnel's lever here is the GRANULAR error
 * feedback (which assert / exception) — the recomputable disproof fed back to the proposer on retry. The four
 * arms differ only in WHAT feedback the retry gets (none / scalar / granular).
 *
 * Safety: the LLM-generated code runs in an ISOLATED python subprocess — fresh tmpdir, hard timeout, and a
 * SCRUBBED environment (no inherited secrets/keys), so a runaway or env-reading completion cannot harm the host.
 */
import * as fs from 'node:fs';
import { runPythonAsync } from './funnel-pyexec.mjs';

export function loadHumanEval(jsonlPath) {
  return fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/** Strip markdown fences / prose and keep the python code (best-effort; the verifier is the real judge). */
export function extractCode(content) {
  const fence = content.match(/```(?:python)?\s*([\s\S]*?)```/i);
  let code = fence ? fence[1] : content;
  return code.trim();
}

export function buildPrompt(task, feedback) {
  const base = `Complete the following Python function. Return ONLY the complete function definition (starting with \`def\`), no explanation, no markdown.\n\n${task.prompt}`;
  if (!feedback) return [{ role: 'user', content: base }];
  // granular feedback = the exact failing assert / exception from the previous attempt
  return [
    { role: 'user', content: base },
    { role: 'assistant', content: feedback.lastCode },
    { role: 'user', content: `That attempt FAILED the hidden tests:\n${feedback.detail}\nFix ONLY what is wrong and return the corrected complete function (def ...), no explanation.` },
  ];
}

/**
 * Run the candidate function against the task's hidden tests in an isolated subprocess.
 * @returns {{pass:boolean, detail:string}}  detail = the failing assertion / exception (granular feedback)
 */
export async function verifyHumanEval(task, completion, { timeoutMs = 12000 } = {}) {
  const code = `${completion}\n\n${task.test}\n\ncheck(${task.entry_point})\nprint("__ATOMIC_PASS__")\n`;
  // ASYNC isolated subprocess (scrubbed env, group-SIGKILL on timeout) — never blocks the event loop.
  const r = await runPythonAsync(['-c', code], '', { timeoutMs, env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' } });
  if (r.timedOut) return { pass: false, detail: 'timeout (possible infinite loop)' };
  if ((r.stdout || '').includes('__ATOMIC_PASS__') && r.status === 0) return { pass: true, detail: '' };
  const err = (r.stderr || '').trim().split('\n');
  const detail = err.slice(-4).join('\n').slice(0, 600) || `exit ${r.status}, no output`;
  return { pass: false, detail };
}
