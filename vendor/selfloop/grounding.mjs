#!/usr/bin/env node
/**
 * grounding.mjs — P7 (NARROW, honest): the neuro<->symbolic interface, measured.
 *
 * The unsolved problem in neuro-symbolic AI is GROUNDING: tying a continuous, sub-symbolic
 * signal to discrete symbols in a way that LEARNS. General grounding is open; nobody has it.
 * This builds ONE narrow, measurable instance and reports the truth:
 *
 *   Symbolic side: an association rule A=>B with a MARGINAL strength (lift / P(B|A)) — blind to
 *     confounders (A and B may both ride on a third gate C; the rule looks strong but is spurious).
 *   Neuro side: a learned logistic regression predicting B from ALL other gates gives a CONDITIONAL
 *     weight on A — A's direct contribution to B controlling for every other gate. That continuous
 *     learned weight GROUNDS the discrete symbol "A=>B": high conditional weight = a real direct
 *     link; high marginal lift but low conditional weight = a confounded (spurious) coupling.
 *
 * MEASURABLE CRITERION (held-out): across candidate couplings, does the neuro CONDITIONAL weight
 * correlate with out-of-sample generalization (holdout confidence) BETTER than the symbolic
 * MARGINAL lift does? If yes, grounding adds real value (it catches couplings that won't hold up).
 * If no, it's an honest negative. We report both correlations; we never assume the win.
 *
 * CPU-viable, deterministic (zero-init logreg), recomputable.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { proposeFromCorpus } from '../mcp/atomic-edit/hypothesis-generator.mjs';

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function gateSets(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    .map((r) => new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : [])))
    .filter((s) => s.size > 0);
}

// Train logreg to predict target gate B from all other gates; return weight map (conditional).
function conditionalWeights(sets, target, allGates, { iters = 300, lr = 0.5, l2 = 1e-3 } = {}) {
  const feats = allGates.filter((g) => g !== target);
  const fidx = new Map(feats.map((f, i) => [f, i]));
  const X = sets.map((s) => { const x = new Float64Array(feats.length); for (const g of s) if (g !== target && fidx.has(g)) x[fidx.get(g)] = 1; return x; });
  const Y = sets.map((s) => (s.has(target) ? 1 : 0));
  const F = feats.length; const w = new Float64Array(F); let b = 0; const N = X.length || 1;
  for (let it = 0; it < iters; it += 1) {
    const gw = new Float64Array(F); let gb = 0;
    for (let n = 0; n < X.length; n += 1) { let z = b; const x = X[n]; for (let j = 0; j < F; j += 1) z += w[j] * x[j]; const e = sigmoid(z) - Y[n]; for (let j = 0; j < F; j += 1) gw[j] += e * x[j]; gb += e; }
    for (let j = 0; j < F; j += 1) w[j] -= lr * (gw[j] / N + l2 * w[j]); b -= lr * (gb / N);
  }
  const out = new Map(); feats.forEach((f, i) => out.set(f, w[i])); return out;
}

function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n; const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i += 1) { const dx = xs[i] - mx; const dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export function evaluateGrounding(repoRoot) {
  const sets = gateSets(repoRoot);
  const train = sets.filter((_, i) => i % 2 === 0);
  const allGates = [...new Set(train.flatMap((s) => [...s]))].sort();
  const proposal = proposeFromCorpus(repoRoot, {});
  const couplings = (proposal.candidates ?? []).filter((c) => c.informative && typeof c.holdoutConfidence === 'number');
  // group target consequents to train one logreg per B (cache).
  const byB = new Map();
  for (const c of couplings) { if (!byB.has(c.consequent)) byB.set(c.consequent, conditionalWeights(train, c.consequent, allGates)); }
  const rows = [];
  for (const c of couplings) {
    const w = byB.get(c.consequent);
    const neuroW = w && w.has(c.antecedent) ? w.get(c.antecedent) : 0;
    rows.push({ lift: c.lift, neuroW, holdout: c.holdoutConfidence });
  }
  const corrLiftHoldout = pearson(rows.map((r) => r.lift), rows.map((r) => r.holdout));
  const corrNeuroHoldout = pearson(rows.map((r) => r.neuroW), rows.map((r) => r.holdout));
  const grounds = corrNeuroHoldout !== null && corrLiftHoldout !== null && Math.abs(corrNeuroHoldout) > Math.abs(corrLiftHoldout);
  // BIDIRECTIONAL grounding at the SELECTION level: rank candidates two ways and measure which
  // top-K generalizes better out-of-sample. Symbolic = lift only. Neuro-grounded = lift gated by
  // the learned conditional weight (confounded couplings — high lift, low/neg neuroW — get demoted).
  const K = Math.min(20, rows.length);
  const meanHoldout = (arr) => (arr.length ? arr.reduce((s, r) => s + r.holdout, 0) / arr.length : 0);
  const symTop = [...rows].sort((a, b) => b.lift - a.lift).slice(0, K);
  const neuroTop = [...rows].sort((a, b) => (b.lift * Math.max(0, b.neuroW)) - (a.lift * Math.max(0, a.neuroW))).slice(0, K);
  const symTopHoldout = Number(meanHoldout(symTop).toFixed(4));
  const neuroTopHoldout = Number(meanHoldout(neuroTop).toFixed(4));
  return {
    couplings: rows.length,
    corr_symbolicLift_vs_holdout: corrLiftHoldout === null ? null : Number(corrLiftHoldout.toFixed(4)),
    corr_neuroConditional_vs_holdout: corrNeuroHoldout === null ? null : Number(corrNeuroHoldout.toFixed(4)),
    neuroGroundsBetter: grounds,
    topK: K,
    symbolicTopK_meanHoldout: symTopHoldout,
    neuroGroundedTopK_meanHoldout: neuroTopHoldout,
    groundedSelectionBetter: neuroTopHoldout > symTopHoldout + 1e-9,
    verdict: grounds
      ? 'the neuro conditional weight predicts out-of-sample generalization BETTER than symbolic lift — narrow grounding adds measured value (P7-narrow criterion met)'
      : 'the neuro conditional weight does NOT beat symbolic lift at predicting generalization here — honest negative; narrow grounding criterion NOT met on this corpus',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(evaluateGrounding(repoRoot), null, 2));
}
