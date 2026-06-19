#!/usr/bin/env node
/**
 * funnel-arc.mjs — PARADIGM PART F.4 layer-2: ARC-AGI adapter via PROGRAM SYNTHESIS + the truth funnel.
 *
 * The honest ARC funnel: the test output is the hidden ANSWER, so a cell-level verifier would leak it. Instead
 * the model writes a program `def transform(grid)` and the funnel verifies it against the TRAIN pairs (whose
 * outputs ARE given) — the units are the train pairs (pass/fail), the granular feedback is "train pair K: got
 * X, expected Y" (legitimate, the train outputs are part of the puzzle). The funnel refines the program until
 * it passes ALL train pairs, THEN applies it to the test input and submits. Final score = transform(test_input)
 * == hidden test_output. This is exactly the SOTA program-synthesis approach, with the funnel as the loop.
 *
 * Safety: the LLM program runs in an ISOLATED python subprocess (scrubbed env, hard timeout).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runPythonAsync } from './funnel-pyexec.mjs';

export function loadArc(evalDir) {
  return fs.readdirSync(evalDir).filter((f) => f.endsWith('.json')).map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(evalDir, f), 'utf8'));
    return { id: f.replace('.json', ''), train: d.train, test: d.test };
  });
}

const gridStr = (g) => g.map((row) => row.join(' ')).join('\n');

export function buildArcPrompt(task, feedback) {
  let s = 'You are solving an ARC puzzle. Infer the transformation rule from the input→output examples and '
    + 'write a Python function `def transform(grid):` mapping any input grid (a list of lists of ints 0-9) to '
    + 'its output grid. Return ONLY the function code (def transform...), no explanation, no markdown.\n\n';
  task.train.forEach((p, i) => { s += `Example ${i + 1} INPUT:\n${gridStr(p.input)}\nExample ${i + 1} OUTPUT:\n${gridStr(p.output)}\n\n`; });
  s += `Test INPUT (your transform must handle it):\n${gridStr(task.test[0].input)}\n\nWrite transform(grid).`;
  const msgs = [{ role: 'user', content: s }];
  if (feedback) {
    msgs.push({ role: 'assistant', content: feedback.lastCode });
    msgs.push({ role: 'user', content: `Your transform was WRONG on these training examples:\n${feedback.detail}\nFix the rule and return the corrected complete transform(grid).` });
  }
  return msgs;
}

export function extractCode(content) {
  const fence = content.match(/```(?:python)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : content).trim();
}

/** Run the program on a list of grids in one isolated ASYNC subprocess; returns output grids (or {__error__}). */
async function runProgram(completion, grids, { timeoutMs = 8000 } = {}) {
  const code = `${completion}\n\nimport json,sys\n_in=json.loads(sys.stdin.read())\n_o=[]\nfor g in _in:\n    try:\n        r=transform(g)\n        _o.append(r if isinstance(r,list) else {"__error__":"non-list"})\n    except Exception as e:\n        _o.append({"__error__":str(e)[:120]})\nprint(json.dumps(_o))\n`;
  const r = await runPythonAsync(['-c', code], JSON.stringify(grids), {
    timeoutMs, env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' },
  });
  if (r.timedOut) return grids.map(() => ({ __error__: 'timeout (likely infinite loop)' }));
  if (r.status !== 0) return grids.map(() => ({ __error__: (r.stderr || 'exec error').trim().split('\n').slice(-1)[0].slice(0, 120) }));
  try { return JSON.parse(r.stdout); } catch { return grids.map(() => ({ __error__: 'bad output' })); }
}

const eqGrid = (a, b) => Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b);

/** Verify the program against the TRAIN pairs. Returns {allPass, passCount, detail (granular feedback)}. */
export async function verifyArcTrain(task, completion) {
  const outs = await runProgram(completion, task.train.map((p) => p.input));
  let pass = 0; const fails = [];
  task.train.forEach((p, i) => {
    if (eqGrid(outs[i], p.output)) pass += 1;
    else fails.push(`Example ${i + 1}: got ${JSON.stringify(outs[i]).slice(0, 120)}, expected ${JSON.stringify(p.output).slice(0, 120)}`);
  });
  return { allPass: pass === task.train.length, passCount: pass, total: task.train.length, detail: fails.join('\n').slice(0, 800) };
}

/** Apply the program to the test input and check against the hidden test output (the final ARC score). */
export async function checkArcTest(task, completion) {
  const out = (await runProgram(completion, [task.test[0].input]))[0];
  return eqGrid(out, task.test[0].output);
}
