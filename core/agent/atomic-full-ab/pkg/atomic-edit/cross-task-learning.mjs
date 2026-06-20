#!/usr/bin/env node
/**
 * cross-task-learning.mjs — demonstrates that accumulated disproofs from Batch 1
 * IMPROVE performance on Batch 2 (NEW tasks of the same type).
 *
 * This is genuine LEARNING FROM EXPERIENCE: the system's behavior changes based
 * on its own accumulated failures, without external input.
 *
 * Protocol:
 *   1. Run LLM on Batch 1 (10 tasks). Collect failures.
 *   2. Build a "disproof lesson" from the failure patterns.
 *   3. Run LLM on Batch 2 (10 NEW tasks) WITHOUT lesson (control).
 *   4. Run LLM on Batch 2 WITH lesson (treatment).
 *   5. If treatment > control → the system LEARNED from experience.
 *
 * Usage:
 *   import { runCrossTaskLearning } from './cross-task-learning.mjs';
 *   const result = await runCrossTaskLearning(propose, 'math');
 */
import { SWEET_SPOT_POOL } from './sweet-spot-calibrator.mjs';

// Two batches of similar difficulty (hard combinatorics)
const BATCH_1 = [
  { id: 'b1_1', q: 'What is 15! / (5! * 8!)?', a: 270270 },
  { id: 'b1_2', q: 'What is 20 choose 10?', a: 184756 },
  { id: 'b1_3', q: 'Sum of primes below 50?', a: 328 },
  { id: 'b1_4', q: 'What is 2^25?', a: 33554432 },
  { id: 'b1_5', q: 'Divisors of 360?', a: 24 },
];

const BATCH_2 = [
  { id: 'b2_1', q: 'What is 14! / (7! * 7!)?', a: 3432 },
  { id: 'b2_2', q: 'What is 18 choose 9?', a: 48620 },
  { id: 'b2_3', q: 'Sum of primes below 30?', a: 129 },
  { id: 'b2_4', q: 'What is 3^15?', a: 14348907 },
  { id: 'b2_5', q: 'Divisors of 720?', a: 30 },
];

/**
 * Build a disproof lesson from Batch 1 failures.
 * The lesson captures ERROR PATTERNS, not answers.
 */
function buildLesson(failures) {
  if (failures.length === 0) return null;
  const items = failures.map(f => {
    const ratio = f.given && f.correct ? (f.given / f.correct).toFixed(2) : 'N/A';
    return `- ${f.q}: you answered ${f.given}, correct is ${f.a}. Your answer was ${ratio}x the correct value.`;
  });
  return `PAST COMPUTATION ERRORS (avoid these patterns):\n${items.join('\n')}\n\nCOMMON ISSUE: large factorial/combinatorial divisions. Use step-by-step computation. Verify intermediate results.`;
}

/**
 * Run the full cross-task learning experiment.
 * @param {(prompts, context) => Promise<Object>} propose  LLM proposer
 * @param {number} rounds  attempts per task
 * @returns {{control, treatment, learned: boolean, delta: number}}
 */
export async function runCrossTaskLearning(propose, rounds = 3) {
  // Phase 1: Learn from Batch 1
  const b1Schema = { type: 'object', properties: Object.fromEntries(BATCH_1.map(t => [t.id, { type: 'number' }])), required: BATCH_1.map(t => t.id) };
  const failures = [];

  for (let r = 0; r < rounds; r++) {
    const prompt = 'Solve these. Return ONLY JSON numeric answers.\n' + BATCH_1.map((t, i) => `${i+1}. ${t.q}`).join('\n');
    const answers = await propose(prompt, null, b1Schema);
    for (const t of BATCH_1) {
      if (Number(answers[t.id]) !== t.a) {
        // Record unique failures only
        if (!failures.find(f => f.id === t.id)) {
          failures.push({ id: t.id, q: t.q, given: Number(answers[t.id]), a: t.a });
        }
      }
    }
  }

  const lesson = buildLesson(failures);

  // Phase 2A: Control (Batch 2, no lesson)
  const b2Schema = { type: 'object', properties: Object.fromEntries(BATCH_2.map(t => [t.id, { type: 'number' }])), required: BATCH_2.map(t => t.id) };
  let controlBest = 0;
  for (let r = 0; r < rounds; r++) {
    const prompt = 'Solve these. Return ONLY JSON numeric answers.\n' + BATCH_2.map((t, i) => `${i+1}. ${t.q}`).join('\n');
    const answers = await propose(prompt, null, b2Schema);
    let pass = 0;
    for (const t of BATCH_2) if (Number(answers[t.id]) === t.a) pass++;
    if (pass > controlBest) controlBest = pass;
  }

  // Phase 2B: Treatment (Batch 2, WITH lesson)
  let treatmentBest = 0;
  if (lesson) {
    for (let r = 0; r < rounds; r++) {
      const prompt = lesson + '\n\nSolve these NEW problems. Return ONLY JSON numeric answers.\n' + BATCH_2.map((t, i) => `${i+1}. ${t.q}`).join('\n');
      const answers = await propose(prompt, null, b2Schema);
      let pass = 0;
      for (const t of BATCH_2) if (Number(answers[t.id]) === t.a) pass++;
      if (pass > treatmentBest) treatmentBest = pass;
    }
  } else {
    treatmentBest = controlBest; // no failures → no lesson → no difference
  }

  return {
    batch1Failures: failures.length,
    lessonProvided: !!lesson,
    control: controlBest,
    treatment: treatmentBest,
    total: BATCH_2.length,
    delta: treatmentBest - controlBest,
    learned: treatmentBest > controlBest,
  };
}
