#!/usr/bin/env node
/**
 * meta-evaluation.mjs — PARADIGM Phases 5+6, bounded + honest.
 *
 * Phase 6 (meta-goals): scoreGates evaluates each invariant AS A GATE from the corpus —
 * its base rate (how often it fires) and its best lift as a coupling consequent. A near-
 * universal, low-lift invariant is "noise-like" (fires on everything, predicts little); a
 * selective, high-lift one is "informative". The system grading its own gates.
 *
 * Phase 5 (self-model): parameterSensitivity predicts how the system's OWN knobs (minLift,
 * minConfidence) change its proposal output, by deterministic recompute over the same hits.
 * Genuine sensitivity analysis of its parameters — NOT a "self" in any cognitive sense.
 */
import { readWitnesses, readTriples, corpusToHits, generateHypotheses } from './hypothesis-generator.mjs';

export function scoreGates(report) {
  const baseRate = new Map();
  const bestLift = new Map();
  for (const c of report.candidates ?? []) {
    if (typeof c.consequentBaseRate === 'number') baseRate.set(c.consequent, c.consequentBaseRate);
    if (typeof c.lift === 'number') bestLift.set(c.consequent, Math.max(bestLift.get(c.consequent) ?? 0, c.lift));
  }
  const gates = [];
  for (const inv of new Set([...baseRate.keys(), ...bestLift.keys()])) {
    const br = baseRate.has(inv) ? baseRate.get(inv) : null;
    const lift = bestLift.has(inv) ? bestLift.get(inv) : null;
    const classification = (br !== null && br >= 0.7 && (lift === null || lift < 1.1))
      ? 'noise-like'
      : (lift !== null && lift >= 1.1 ? 'informative' : 'neutral');
    gates.push({ invariant: inv, baseRate: br, bestLiftAsConsequent: lift, classification });
  }
  gates.sort((a, b) => (b.bestLiftAsConsequent ?? 0) - (a.bestLiftAsConsequent ?? 0));
  return {
    gates,
    noiseLike: gates.filter((g) => g.classification === 'noise-like').map((g) => g.invariant),
    informative: gates.filter((g) => g.classification === 'informative').map((g) => g.invariant),
  };
}

export function parameterSensitivity(hits, sweeps) {
  const grid = sweeps ?? [{ minLift: 1.1 }, { minLift: 2 }, { minLift: 5 }, { minLift: 10 }];
  return grid.map((opts) => {
    const r = generateHypotheses(hits, opts);
    return { opts, proposed: r.summary.proposed, informative: r.summary.informative, lawsMined: r.summary.lawsMined };
  });
}

export function sensitivityFromCorpus(repoRoot, sweeps) {
  const hits = corpusToHits([...readWitnesses(repoRoot), ...readTriples(repoRoot)]);
  return parameterSensitivity(hits, sweeps);
}

// CLI: `node meta-evaluation.mjs [repoRoot]` — score the system's own gates + knob sensitivity.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  const hits = corpusToHits([...readWitnesses(repoRoot), ...readTriples(repoRoot)]);
  const report = generateHypotheses(hits, {});
  console.log(JSON.stringify({ gateScores: scoreGates(report), sensitivity: parameterSensitivity(hits) }, null, 2));
}
