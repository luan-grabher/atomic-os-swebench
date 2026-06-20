#!/usr/bin/env node
/**
 * sweet-spot-calibrator.mjs — measures a model's P per task type and identifies
 * the emergence sweet-spot (tasks where 0 < P < 1).
 *
 * Given a pool of tasks of varying difficulty and a proposer function, runs each
 * task K times and reports the per-task success probability P. Tasks with P ∈ (0,1)
 * are SWEET-SPOT candidates for the emergence benchmark.
 *
 * Usage (standalone, synthetic calibration):
 *   node sweet-spot-calibrator.mjs --synthetic
 *
 * Usage (imported, live LLM calibration):
 *   import { calibrate, SWEET_SPOT_POOL } from './sweet-spot-calibrator.mjs';
 *   const result = await calibrate(myPropose, 3); // 3 rounds per task
 *   // result.sweetSpot = [{ id, p, status }, ...]
 */
import { runArm, makeSyntheticTask } from './truth-funnel.mjs';

// ── Task pool spanning difficulty from trivial (P≈1) to hard (P≈0) ──
export const SWEET_SPOT_POOL = {
  math: [
    { id: 'easy_2plus2', q: 'What is 2+2?', a: 4, difficulty: 'trivial' },
    { id: 'easy_7times8', q: 'What is 7*8?', a: 56, difficulty: 'trivial' },
    { id: 'med_sqrt144', q: 'Square root of 144?', a: 12, difficulty: 'easy' },
    { id: 'med_fib10', q: '10th Fibonacci number?', a: 55, difficulty: 'easy' },
    { id: 'med_prime50', q: 'How many primes below 50?', a: 15, difficulty: 'medium' },
    { id: 'hard_2pow20', q: 'What is 2^20?', a: 1048576, difficulty: 'medium' },
    { id: 'hard_15fact', q: 'What is 15!/(5!*8!)?', a: 270270, difficulty: 'hard' },
    { id: 'hard_20c10', q: 'What is 20 choose 10?', a: 184756, difficulty: 'hard' },
    { id: 'hard_primes200', q: 'How many primes below 200?', a: 46, difficulty: 'hard' },
    { id: 'vhard_sumprimes100', q: 'Sum of all primes below 100?', a: 1060, difficulty: 'hard' },
  ],
};

/**
 * Calibrate a proposer's P per task.
 * @param {(task: {id, q, a}) => Promise<any>} propose  returns the model's answer
 * @param {number} rounds  how many times to attempt each task
 * @param {string} family  which task family ('math')
 * @returns {{tasks: Array<{id, p, status: 'trivial'|'easy'|'sweet'|'hard'|'impossible'}>, sweetSpotCount: number}}
 */
export async function calibrate(propose, rounds = 3, family = 'math') {
  const pool = SWEET_SPOT_POOL[family] || SWEET_SPOT_POOL.math;
  const results = [];

  for (const task of pool) {
    let successes = 0;
    for (let r = 0; r < rounds; r++) {
      try {
        const answer = await propose(task);
        if (Number(answer) === task.a) successes++;
      } catch { /* count as failure */ }
    }
    const p = successes / rounds;
    let status;
    if (p >= 0.95) status = 'trivial';
    else if (p >= 0.8) status = 'easy';
    else if (p >= 0.2) status = 'sweet'; // SWEET-SPOT: emergence opportunity
    else if (p > 0) status = 'hard';
    else status = 'impossible';

    results.push({ id: task.id, p: +p.toFixed(3), status, difficulty: task.difficulty });
  }

  const sweetSpotCount = results.filter(r => r.status === 'sweet').length;
  return { tasks: results, sweetSpotCount, rounds, family };
}

/**
 * Select tasks from the pool that are in the sweet-spot for emergence testing.
 * @param {Array} calibration  output of calibrate()
 * @returns {Array}  task IDs in the sweet-spot
 */
export function selectSweetSpot(calibration) {
  return calibration.tasks
    .filter(t => t.status === 'sweet')
    .map(t => t.id);
}

// ── CLI ──
const isCLI = process.argv[1] && import.meta.url === `file://${new URL(process.argv[1], 'file:///').pathname}`;
if (isCLI) {
  if (process.argv.includes('--synthetic')) {
    // Synthetic calibration: simulate different model capabilities
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     SWEET-SPOT CALIBRATOR (synthetic demo)      ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    for (const [modelLabel, pProfile] of [
      ['weak model (smol)', { trivial: 0.9, easy: 0.7, medium: 0.4, hard: 0.1 }],
      ['default model', { trivial: 1.0, easy: 0.95, medium: 0.8, hard: 0.15 }],
      ['strong model', { trivial: 1.0, easy: 1.0, medium: 0.95, hard: 0.5 }],
    ]) {
      const sim = SWEET_SPOT_POOL.math.map(t => {
        const p = pProfile[t.difficulty] ?? 0.5;
        let status = p >= 0.95 ? 'trivial' : p >= 0.8 ? 'easy' : p >= 0.2 ? 'sweet' : p > 0 ? 'hard' : 'impossible';
        return { id: t.id, p, status, difficulty: t.difficulty };
      });
      const sweet = sim.filter(s => s.status === 'sweet').length;
      console.log(`${modelLabel}: ${sweet} sweet-spot tasks`);
      for (const s of sim) {
        const bar = '█'.repeat(Math.round(s.p * 20)).padEnd(20);
        console.log(`  ${s.id.padEnd(20)} ${bar} P=${s.p.toFixed(2)} [${s.status}]`);
      }
      console.log();
    }

    console.log('For live calibration, import calibrate() and pass your LLM proposer.');
  } else {
    console.log('Usage: node sweet-spot-calibrator.mjs --synthetic');
    console.log('       (live mode requires importing calibrate() with a proposer)');
  }
}
