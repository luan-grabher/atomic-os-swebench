#!/usr/bin/env node
/**
 * funnel-run-arc.mjs — PARADIGM PART F.4 layer-2: the 4-arm ARC-AGI benchmark via program synthesis + funnel.
 *
 * Each arm proposes a Python `transform(grid)`, verifies it against the TRAIN pairs (granular, legitimate),
 * and applies the best program to the hidden test. The funnel refines until all train pairs pass. ARC is HARD
 * (blind re-sampling rarely finds the rule), so this is where the GRANULAR recomputable feedback (arm 4) is
 * hypothesized to separate from blind retry (arm 2) — unlike HumanEval where the model is already near ceiling.
 *
 * Usage: node funnel-run-arc.mjs --dir /tmp/arc1/data/evaluation [--n N] [--budget B] [--concurrency C] [--out f]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepseekChat, pool, costSoFar } from './funnel-deepseek.mjs';
import { loadArc, buildArcPrompt, extractCode, verifyArcTrain, checkArcTest } from './funnel-arc.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const DATADIR = arg('--dir', '/tmp/arc1/data/evaluation');
const N = parseInt(arg('--n', '400'), 10);
const BUDGET = parseInt(arg('--budget', '6'), 10);
const CONC = parseInt(arg('--concurrency', '48'), 10);
const TEMP = parseFloat(arg('--temp', '0.7'));
const LABEL = arg('--label', 'ARC-AGI-1');
const OUT = arg('--out', path.join(dir, 'funnel-arc-result.json'));
const ARMS = ['first-attempt', 'blind-retry', 'scalar-funnel', 'unified-funnel'];

// HEARTBEAT instrumentation: track each in-flight job's phase so a stall is visible.
const inflight = new Map();
const HB = process.argv.includes('--heartbeat');
if (HB) setInterval(() => {
  const now = Date.now();
  const rows = [...inflight.entries()].map(([k, v]) => `${k}:${v.phase}(${((now - v.since) / 1000).toFixed(0)}s)`);
  process.stderr.write(`  ♥ inflight=${inflight.size} [${rows.slice(0, 14).join(' ')}]\n`);
}, 8000).unref();

async function runArm(arm, task) {
  const key = `${task.id.slice(0, 6)}/${arm.slice(0, 5)}`;
  const setPhase = (p) => { if (HB) inflight.set(key, { phase: p, since: Date.now() }); };
  setPhase('start');
  const maxAttempts = arm === 'first-attempt' ? 1 : BUDGET;
  let feedback = null;
  let best = { code: null, passCount: -1 };
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let fb = null;
    if (attempt > 1) {
      if (arm === 'unified-funnel') fb = feedback;                                              // granular
      else if (arm === 'scalar-funnel') fb = { lastCode: feedback.lastCode, detail: 'it failed the training examples.' };
      // blind-retry: fb null
    }
    let content;
    setPhase(`api${attempt}`);
    try { content = await deepseekChat(buildArcPrompt(task, fb), { maxTokens: 4096, temperature: TEMP }); }
    catch { inflight.delete(key); return { solved: false, attempts: attempt, trainSolved: false }; }
    const code = extractCode(content);
    setPhase(`verify${attempt}`);
    const v = await verifyArcTrain(task, code);
    if (v.passCount > best.passCount) best = { code, passCount: v.passCount };
    if (v.allPass) {
      setPhase('checktest');
      const solved = await checkArcTest(task, code);
      inflight.delete(key);
      return { solved, attempts: attempt, trainSolved: true };
    }
    feedback = { lastCode: code, detail: v.detail };
  }
  setPhase('checkbest');
  const solved = best.code ? await checkArcTest(task, best.code) : false;
  inflight.delete(key);
  return { solved, attempts: maxAttempts, trainSolved: false };
}

(async () => {
  const tasks = loadArc(DATADIR).slice(0, N);
  console.log(`${LABEL} funnel: ${tasks.length} tasks × ${ARMS.length} arms × ≤${BUDGET}, temp=${TEMP}, conc=${CONC}`);
  const jobs = [];
  for (const task of tasks) for (const arm of ARMS) jobs.push({ task, arm });
  let done = 0; const t0 = Date.now();
  const results = await pool(jobs, async ({ task, arm }) => {
    const r = await runArm(arm, task);
    done += 1;
    if (done % 20 === 0) { const c = costSoFar(); process.stderr.write(`  …${done}/${jobs.length} | calls=${c.calls} | ~$${c.usd.toFixed(2)} | ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); }
    return { taskId: task.id, arm, ...r };
  }, CONC);

  const byArm = {};
  for (const arm of ARMS) {
    const rs = results.filter((r) => r && r.arm === arm);
    const solved = rs.filter((r) => r.solved).length;
    const trainSolved = rs.filter((r) => r.trainSolved).length;
    byArm[arm] = { solveRate: solved / tasks.length, solved, total: tasks.length, trainAllPassRate: trainSolved / tasks.length };
  }
  const cost = costSoFar();
  const summary = {
    benchmark: LABEL, model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro', tasks: tasks.length, budget: BUDGET, temperature: TEMP, byArm,
    headline: {
      firstAttempt: byArm['first-attempt'].solveRate, unifiedFunnel: byArm['unified-funnel'].solveRate,
      liftOverFirstAttempt_pp: (byArm['unified-funnel'].solveRate - byArm['first-attempt'].solveRate) * 100,
      liftOverBlindRetry_pp: (byArm['unified-funnel'].solveRate - byArm['blind-retry'].solveRate) * 100,
    },
    cost: { calls: cost.calls, usd: cost.usd, retries: cost.retries, failures: cost.failures }, wallSeconds: (Date.now() - t0) / 1000,
  };
  fs.writeFileSync(OUT, JSON.stringify({ summary, results }, null, 2));
  console.log('\n=== RESULT ===');
  for (const arm of ARMS) console.log(`  ${arm.padEnd(15)} test-solve ${(byArm[arm].solveRate * 100).toFixed(1)}% (${byArm[arm].solved}/${tasks.length})  train-allpass ${(byArm[arm].trainAllPassRate * 100).toFixed(1)}%`);
  console.log(`  HEADLINE: unified ${(summary.headline.unifiedFunnel * 100).toFixed(1)}% vs first-attempt ${(summary.headline.firstAttempt * 100).toFixed(1)}% → +${summary.headline.liftOverFirstAttempt_pp.toFixed(1)}pp (vs blind +${summary.headline.liftOverBlindRetry_pp.toFixed(1)}pp)`);
  console.log(`  cost: ${cost.calls} calls, ~$${cost.usd.toFixed(2)}, ${summary.wallSeconds.toFixed(0)}s → ${OUT}`);
})();
