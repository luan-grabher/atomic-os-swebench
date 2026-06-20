#!/usr/bin/env node
/**
 * planner.mjs — PARADIGM Phase 7 (the planner), bounded + honest.
 *
 * Over the held-out-validated INFORMATIVE couplings the hypothesis generator mined from
 * Atomic's own corpus, computes a greedy MINIMAL-COVER plan: the smallest ordered set of
 * consequent invariants that, if enforced as preconditions, would have flagged the most
 * distinct antecedent wall-hits in the corpus. Real prioritization ("strengthen these K
 * checks first for the most historical coverage"), deterministic, no model, no RNG.
 *
 * HONEST CEILING: this is greedy weighted set-cover over real data — a planner in the
 * operations-research sense, NOT cognition. It chooses WHERE to focus; it does not "want".
 */
import { proposeFromCorpus } from './hypothesis-generator.mjs';

/**
 * Greedy minimal-cover plan. `report` = proposeFromCorpus output. Deterministic: candidates
 * iterated in sorted consequent order, strict-greater gain wins (stable first-max).
 */
export function planMinimalCover(report, opts = {}) {
  const maxSteps = opts.maxSteps ?? 12;
  const cov = new Map();
  for (const c of (report.candidates ?? []).filter((x) => x.informative)) {
    if (!cov.has(c.consequent)) cov.set(c.consequent, new Set());
    cov.get(c.consequent).add(c.antecedent);
  }
  const universe = new Set();
  for (const ants of cov.values()) for (const a of ants) universe.add(a);
  const covered = new Set();
  const plan = [];
  const entries = [...cov.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  while (plan.length < maxSteps && covered.size < universe.size) {
    let best = null;
    let bestGain = 0;
    for (const [inv, ants] of entries) {
      if (plan.some((p) => p.invariant === inv)) continue;
      let gain = 0;
      for (const a of ants) if (!covered.has(a)) gain += 1;
      if (gain > bestGain) { bestGain = gain; best = inv; }
    }
    if (!best || bestGain === 0) break;
    for (const a of cov.get(best)) covered.add(a);
    plan.push({ invariant: best, marginalCoverage: bestGain, cumulativeCoverage: covered.size });
  }
  return { plan, universeSize: universe.size, coveredByPlan: covered.size, steps: plan.length };
}

/** Read the REAL corpus, mine couplings, and return the minimal-cover plan. */
export function planFromCorpus(repoRoot, opts = {}) {
  return planMinimalCover(proposeFromCorpus(repoRoot, opts), opts);
}

// CLI: `node planner.mjs [repoRoot]` — an autonomous planning pass over the real corpus.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(planFromCorpus(repoRoot, {}), null, 2));
}
