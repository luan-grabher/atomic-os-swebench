#!/usr/bin/env node
/**
 * truth-funnel-bench.mjs — PARADIGM PART F.4 layer-2 harness: the universal truth funnel on a REAL-FORMAT
 * benchmark (ARC-style grid transformation), with a PLUGGABLE proposer (deterministic mock now; an LLM
 * proposer — DeepSeek — is a drop-in, gated behind explicit authorization because it spends credits + sends
 * data to an external API).
 *
 * This is the concrete ARC case the operator discussed: an ARC task's output is a grid of cells; the verifier
 * compares cell-by-cell (deterministic, SAFE — no arbitrary code execution); the UNITS are the cells. The
 * byte-positive funnel freezes the cells already correct and re-derives ONLY the wrong ones — so the model
 * re-reasons over the 15% wrong cells, not the whole grid. This is verifier-agnostic and has NO per-task
 * hand-coded solution: the verifier is the benchmark's own ground-truth comparison.
 *
 * Pure: in-memory; the proposer is injected. No spawn, no Date.now/random (the mock uses an FNV hash).
 */
import { runFunnel, funnelGate } from './truth-funnel.mjs';

/** Build an ARC-style task from an output grid (the ground truth). Units = cells (row,col). Verifier compares
 * the proposed answer's cells to the truth — deterministic, no code execution. */
export function arcTask(outputGrid) {
  const truth = new Map();
  for (let r = 0; r < outputGrid.length; r += 1) for (let c = 0; c < outputGrid[r].length; c += 1) truth.set(`${r},${c}`, outputGrid[r][c]);
  const verify = (answer) => ({
    deterministic: true,
    units: [...truth.keys()].map((id) => ({ id, verdict: answer.get(id) === truth.get(id) ? 'accept' : 'reject' })),
  });
  return { truth, verify, unitIds: [...truth.keys()], cells: truth.size };
}

/** Deterministic [0,1) hash — reproducible pseudo-randomness, no Math.random/Date.now. */
function h01(s) { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

/**
 * A MOCK grid solver with per-cell capability P: on each attempt at a cell it emits the correct value iff
 * h01(seed:cell:attempt) < P. Models a model that, given granular feedback (which cells are wrong), eventually
 * gets each cell right (P>0). This is the stand-in the LLM proposer replaces.
 */
export function mockGridSolver(task, P, seed = 'arc') {
  const attempts = new Map([...task.unitIds].map((id) => [id, 0]));
  return (_prev, feedback, frozen) => {
    const ids = feedback ? feedback.rejected : task.unitIds.filter((id) => !frozen.has(id));
    return new Map(ids.map((id) => {
      attempts.set(id, attempts.get(id) + 1);
      return [id, h01(`${seed}:${id}:${attempts.get(id)}`) < P ? task.truth.get(id) : `wrong:${attempts.get(id)}`];
    }));
  };
}

/** Run the byte-positive funnel on one ARC task with a given proposer; returns convergence + iterations. */
export function solveArc(task, proposer, budget = 100) {
  return runFunnel({ propose: proposer, verify: task.verify, budget });
}

/**
 * The 4-arm comparison on a SET of ARC tasks (the F.4 protocol, mechanism level). Returns per-arm solve-rate
 * + mean iterations. `makeProposer(task, arm)` supplies the proposer for each (task, arm).
 */
export function runArcBenchmark(tasks, makeProposer, budget = 200) {
  const arms = ['first-attempt', 'blind-retry', 'unified-funnel'];
  const out = {};
  for (const arm of arms) {
    let solved = 0, iterSum = 0;
    for (const task of tasks) {
      if (arm === 'unified-funnel') {
        const r = solveArc(task, makeProposer(task, arm), budget);
        if (r.converged) { solved += 1; iterSum += r.iterations; }
      } else {
        // no freeze: re-derive the whole grid each round; needs every cell correct in ONE round
        const propose = makeProposer(task, arm);
        let converged = false, iters = 0;
        const rounds = arm === 'first-attempt' ? 1 : budget;
        for (let i = 1; i <= rounds; i += 1) {
          iters = i;
          const answer = propose(new Map(), null, new Set()); // whole grid, fresh
          if (funnelGate(task.verify(answer)).submit) { converged = true; break; }
        }
        if (converged) { solved += 1; iterSum += iters; }
      }
    }
    out[arm] = { solveRate: solved / tasks.length, solved, total: tasks.length, meanIterations: solved ? iterSum / solved : null };
  }
  return out;
}

/** DeepSeek proposer slot — wired but NOT auto-invoked. Building it does not spend credits; CALLING it does.
 * Returns null if no key / not explicitly enabled, so the harness stays free until authorized. */
export function deepseekProposerAvailable() {
  return typeof process.env.DEEPSEEK_API_KEY === 'string' && process.env.DEEPSEEK_API_KEY.length > 0;
}
