#!/usr/bin/env node
/**
 * funnel-run-humaneval.mjs — PARADIGM PART F.4 layer-2: the 4-arm HumanEval benchmark with DeepSeek + the
 * universal truth funnel. The number that turns "the funnel mechanism works" into "the funnel moves the
 * end-task score by N points" — mechanism-attributable because all four arms use the SAME model, SAME budget.
 *
 *   arm 1 first-attempt — 1 sample (today's pass@1).
 *   arm 2 blind-retry   — up to B independent samples, NO feedback (re-roll until one passes).
 *   arm 3 scalar-funnel — up to B samples, SCALAR feedback only ("it failed").
 *   arm 4 unified-funnel— up to B samples, GRANULAR recomputable feedback (the exact failing assert/exception).
 *
 * The headline delta = arm4 − arm1 (the funnel's lift over first-attempt); arm4 − arm2 isolates whether the
 * GRANULAR disproof helps beyond mere re-sampling. temperature>0 so retries actually vary (else deterministic).
 *
 * Usage: node funnel-run-humaneval.mjs [--n N] [--budget B] [--concurrency C] [--out file.json]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepseekChat, pool, costSoFar } from './funnel-deepseek.mjs';
import { loadHumanEval, extractCode, buildPrompt, verifyHumanEval } from './funnel-humaneval.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, def) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : def; };
const N = parseInt(arg('--n', '164'), 10);            // tasks (full = 164)
const BUDGET = parseInt(arg('--budget', '6'), 10);    // max attempts per arm
const CONC = parseInt(arg('--concurrency', '48'), 10);
const TEMP = parseFloat(arg('--temp', '0.7'));
const OUT = arg('--out', path.join(dir, 'funnel-humaneval-result.json'));
const DATA = arg('--data', '/tmp/HumanEval.jsonl');

const ARMS = ['first-attempt', 'blind-retry', 'scalar-funnel', 'unified-funnel'];

async function runArm(arm, task) {
  const maxAttempts = arm === 'first-attempt' ? 1 : BUDGET;
  let feedback = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // which feedback the prompt carries this attempt:
    let fb = null;
    if (attempt > 1) {
      if (arm === 'unified-funnel') fb = feedback;                                   // granular (the disproof)
      else if (arm === 'scalar-funnel') fb = { lastCode: feedback.lastCode, detail: 'the tests failed.' }; // scalar
      // blind-retry: fb stays null (re-roll from scratch, no memory)
    }
    const messages = buildPrompt(task, fb);
    let content;
    try { content = await deepseekChat(messages, { maxTokens: 3072, temperature: TEMP }); }
    catch (e) { return { solved: false, attempts: attempt, error: e instanceof Error ? e.message : String(e) }; }
    const code = extractCode(content);
    const v = await verifyHumanEval(task, code);
    if (v.pass) return { solved: true, attempts: attempt };
    feedback = { lastCode: code, detail: v.detail };
  }
  return { solved: false, attempts: maxAttempts };
}

(async () => {
  const allTasks = loadHumanEval(DATA).slice(0, N);
  console.log(`HumanEval funnel: ${allTasks.length} tasks × ${ARMS.length} arms × ≤${BUDGET} attempts, temp=${TEMP}, conc=${CONC}, model=${process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'}`);
  const jobs = [];
  for (const task of allTasks) for (const arm of ARMS) jobs.push({ task, arm });

  let done = 0;
  const t0 = Date.now();
  const results = await pool(jobs, async ({ task, arm }) => {
    const r = await runArm(arm, task);
    done += 1;
    if (done % 50 === 0) {
      const c = costSoFar();
      process.stderr.write(`  …${done}/${jobs.length} jobs | calls=${c.calls} | ~$${c.usd.toFixed(2)} | ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    return { taskId: task.task_id, arm, ...r };
  }, CONC);

  // aggregate per arm
  const byArm = {};
  for (const arm of ARMS) {
    const rs = results.filter((r) => r && r.arm === arm);
    const solved = rs.filter((r) => r.solved).length;
    const attemptsOfSolved = rs.filter((r) => r.solved).map((r) => r.attempts);
    byArm[arm] = {
      solveRate: solved / allTasks.length,
      solved, total: allTasks.length,
      meanAttemptsOfSolved: attemptsOfSolved.length ? (attemptsOfSolved.reduce((a, b) => a + b, 0) / attemptsOfSolved.length) : null,
    };
  }
  const cost = costSoFar();
  const summary = {
    benchmark: 'HumanEval', model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro', tasks: allTasks.length,
    budget: BUDGET, temperature: TEMP, byArm,
    headline: {
      firstAttempt: byArm['first-attempt'].solveRate,
      unifiedFunnel: byArm['unified-funnel'].solveRate,
      liftOverFirstAttempt_pp: ((byArm['unified-funnel'].solveRate - byArm['first-attempt'].solveRate) * 100),
      liftOverBlindRetry_pp: ((byArm['unified-funnel'].solveRate - byArm['blind-retry'].solveRate) * 100),
    },
    cost: { calls: cost.calls, promptTokens: cost.promptTokens, completionTokens: cost.completionTokens, usd: cost.usd, retries: cost.retries, failures: cost.failures },
    wallSeconds: (Date.now() - t0) / 1000,
  };
  fs.writeFileSync(OUT, JSON.stringify({ summary, results }, null, 2));
  console.log('\n=== RESULT ===');
  for (const arm of ARMS) console.log(`  ${arm.padEnd(15)} solve-rate ${(byArm[arm].solveRate * 100).toFixed(1)}% (${byArm[arm].solved}/${allTasks.length})  mean-attempts ${byArm[arm].meanAttemptsOfSolved?.toFixed(2) ?? '-'}`);
  console.log(`  HEADLINE: unified funnel ${(summary.headline.unifiedFunnel * 100).toFixed(1)}% vs first-attempt ${(summary.headline.firstAttempt * 100).toFixed(1)}% → +${summary.headline.liftOverFirstAttempt_pp.toFixed(1)}pp (vs blind-retry +${summary.headline.liftOverBlindRetry_pp.toFixed(1)}pp)`);
  console.log(`  cost: ${cost.calls} calls, ~$${cost.usd.toFixed(2)}, ${summary.wallSeconds.toFixed(0)}s → ${OUT}`);
})();
