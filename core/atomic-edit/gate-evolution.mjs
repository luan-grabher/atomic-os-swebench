#!/usr/bin/env node
/**
 * gate-evolution.mjs — PARADIGM Phase 3 (genetic), bounded + honest.
 *
 * A DETERMINISTIC evolutionary algorithm over candidate invariant-SETS drawn from the mined
 * informative couplings: it evolves a population of consequent-invariant sets by selection +
 * crossover + mutation, with fitness = (distinct antecedent wall-hits covered) − penalty ×
 * (set size). It converges toward a small high-coverage set — the same set-cover objective
 * the greedy planner and the z3 prover address, reached here by evolution. Deterministic
 * (seeded LCG, no Math.random) so it is reproducible and gate-provable.
 *
 * HONEST: this is an EA over a set-cover objective — an optimizer, NOT cognition, and it is
 * deliberately REDUNDANT with planner.mjs (fast near-optimum) and z3-constraint-finder.mjs
 * (proven optimum). It is included for completeness of the phase set and to show the same
 * objective is reachable by evolution; it adds no capability the planner/z3 lack.
 */
import { proposeFromCorpus } from './hypothesis-generator.mjs';

// Deterministic LCG (numerical recipes constants); no Math.random so runs are reproducible.
function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export function evolveCover(report, opts = {}) {
  const penalty = opts.penalty ?? 0.5;
  const popSize = opts.popSize ?? 16;
  const generations = opts.generations ?? 40;
  const rand = lcg(opts.seed ?? 12345);
  const cov = new Map();
  for (const c of (report.candidates ?? []).filter((x) => x.informative)) {
    if (!cov.has(c.consequent)) cov.set(c.consequent, new Set());
    cov.get(c.consequent).add(c.antecedent);
  }
  const genes = [...cov.keys()].sort();
  const universe = new Set();
  for (const s of cov.values()) for (const a of s) universe.add(a);
  if (genes.length === 0) return { best: [], coverage: 0, universe: 0, fitness: 0, generations: 0 };
  const fitness = (set) => {
    const covered = new Set();
    for (const g of set) for (const a of cov.get(g)) covered.add(a);
    return covered.size - penalty * set.length;
  };
  let pop = Array.from({ length: popSize }, () => genes.filter(() => rand() < 0.5));
  let best = pop[0];
  let bestFit = fitness(best);
  for (let gen = 0; gen < generations; gen += 1) {
    const scored = pop.map((ind) => ({ ind, f: fitness(ind) })).sort((a, b) => b.f - a.f);
    if (scored[0].f > bestFit) { bestFit = scored[0].f; best = scored[0].ind; } // elitism: best only improves
    const elite = scored.slice(0, Math.max(2, popSize >> 2)).map((x) => x.ind);
    const next = [...elite];
    while (next.length < popSize) {
      const pa = elite[Math.floor(rand() * elite.length)];
      const pb = elite[Math.floor(rand() * elite.length)];
      let child = genes.filter((g) => ((pa.includes(g) || pb.includes(g)) ? rand() < 0.7 : rand() < 0.1));
      if (rand() < 0.3) {
        const g = genes[Math.floor(rand() * genes.length)];
        child = child.includes(g) ? child.filter((x) => x !== g) : [...child, g];
      }
      next.push(child);
    }
    pop = next;
  }
  const covered = new Set();
  for (const g of best) for (const a of cov.get(g)) covered.add(a);
  return { best: [...best].sort(), coverage: covered.size, universe: universe.size, fitness: bestFit, generations };
}

export function evolveFromCorpus(repoRoot, opts = {}) {
  return evolveCover(proposeFromCorpus(repoRoot, opts), opts);
}

// CLI: `node gate-evolution.mjs [repoRoot]` — evolve a high-coverage invariant set from the corpus.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(evolveFromCorpus(repoRoot, {}), null, 2));
}
