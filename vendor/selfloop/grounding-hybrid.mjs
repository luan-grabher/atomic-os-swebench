#!/usr/bin/env node
/**
 * grounding-hybrid.mjs — P7 frontier test: can a MOTIVATED hybrid ranker beat pure symbolic
 * top-K selection, resolving the head/tail paradox grounding.mjs surfaced?
 *
 * THE PARADOX (measured in grounding.mjs on the real corpus):
 *   corr(symbolic lift -> holdout)      ~ -0.00   (lift has ~ZERO global correlation with
 *                                                   out-of-sample co-firing)
 *   corr(neuro conditional w -> holdout) ~ +0.14  (neuro carries the WEAK global signal)
 *   BUT top-K selection:  symbolic 0.956  >  neuro-grounded 0.916
 * So lift owns the HEAD (rare high-precision couplings at the very top) while neuro owns the
 * BULK. The original neuro-grounded ranker was MULTIPLICATIVE (lift * max(0,neuroW)) — a small
 * neuroW could DESTROY a strong-lift head coupling. That over-aggression likely cost it the head.
 *
 * THIS TEST: rankers that COMBINE the two orderings without one annihilating the other —
 *   borda     : average of (lift-rank, neuroW-rank)            — symmetric, scale-free
 *   lexico    : lift primary (coarse bins), neuroW tie-break    — preserves symbolic head
 *   zblend    : z(lift)*(1-a) + z(neuroW)*a  for a in {.25,.5}  — additive, exploratory sweep
 *   veto      : symbolic order, but demote couplings neuroW<0   — only kills confounders
 *   mult      : original lift*max(0,neuroW)                     — reproduced for reference
 *
 * HONESTY GUARDS (anti-p-hacking, pre-registered):
 *   - The symbolic baseline is FIXED (depends only on lift+holdout, not on any split).
 *   - neuro weights are BAGGED across SPLITS deterministic train subsamples (stable estimate),
 *     and each ranker is ALSO scored per-split to test robustness.
 *   - Evaluated at K in {10,20,30}. A hybrid is a GENUINE WIN only if (bagged) it beats the
 *     symbolic baseline at ALL three K by margin > WIN_MARGIN, AND per-split it beats baseline
 *     on a MAJORITY of splits at K=20. Otherwise the honest verdict is: symbolic top-K is at the
 *     frontier and the connectionist signal adds NO top-K selection value (ceiling confirmed).
 *   - zblend is reported as EXPLORATORY (it sweeps a) and is NOT eligible to be declared a win.
 *
 * CPU-viable, deterministic (zero-init logreg, fixed splits), fully recomputable.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { proposeFromCorpus } from '../mcp/atomic-edit/hypothesis-generator.mjs';

const WIN_MARGIN = 0.005;
const Ks = [10, 20, 30];
// Deterministic train-split predicates (index -> in train?). Each holds ~half-to-two-thirds.
const SPLITS = [
  (i) => i % 2 === 0,
  (i) => i % 2 === 1,
  (i) => i % 3 === 0,
  (i) => i % 3 === 1,
  (i) => i % 3 === 2,
];

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function gateSets(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    .map((r) => new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : [])))
    .filter((s) => s.size > 0);
}

// logreg: predict target gate B from all other gates -> conditional weight map. Identical
// hyperparameters to grounding.mjs so neuroW is apples-to-apples with the prior measurement.
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

const meanHoldout = (arr) => (arr.length ? arr.reduce((s, r) => s + r.holdout, 0) / arr.length : 0);

// rank map: index -> ascending rank position by a key (higher key = better = lower rank index).
function rankByDesc(rows, keyFn) {
  const order = rows.map((r, i) => i).sort((a, b) => keyFn(rows[b]) - keyFn(rows[a]));
  const rank = new Array(rows.length);
  order.forEach((idx, pos) => { rank[idx] = pos; });
  return rank;
}

function zscores(vals) {
  const n = vals.length; const m = vals.reduce((a, b) => a + b, 0) / n;
  const v = vals.reduce((a, b) => a + (b - m) * (b - m), 0) / (n || 1);
  const sd = Math.sqrt(v) || 1;
  return vals.map((x) => (x - m) / sd);
}

// Given rows with {lift, neuroW, holdout}, produce top-K mean holdout for each ranker.
function scoreRankers(rows, K) {
  const symTop = [...rows].sort((a, b) => b.lift - a.lift).slice(0, K);
  const multTop = [...rows].sort((a, b) => (b.lift * Math.max(0, b.neuroW)) - (a.lift * Math.max(0, a.neuroW))).slice(0, K);
  // borda: average of lift-rank and neuroW-rank (lower = better)
  const liftRank = rankByDesc(rows, (r) => r.lift);
  const neuroRank = rankByDesc(rows, (r) => r.neuroW);
  const bordaTop = rows.map((r, i) => ({ r, key: liftRank[i] + neuroRank[i] }))
    .sort((a, b) => a.key - b.key).slice(0, K).map((x) => x.r);
  // lexico: coarse lift bins (round to 0.5), neuroW tie-break within bin
  const lexTop = [...rows].sort((a, b) => {
    const la = Math.round(a.lift * 2); const lb = Math.round(b.lift * 2);
    if (lb !== la) return lb - la; return b.neuroW - a.neuroW;
  }).slice(0, K);
  // veto: symbolic lift order, but couplings with neuroW<0 are demoted below all neuroW>=0
  const vetoTop = [...rows].sort((a, b) => {
    const va = a.neuroW < 0 ? 1 : 0; const vb = b.neuroW < 0 ? 1 : 0;
    if (va !== vb) return va - vb; return b.lift - a.lift;
  }).slice(0, K);
  // zblend exploratory: z(lift)*(1-a)+z(neuroW)*a
  const zl = zscores(rows.map((r) => r.lift)); const zn = zscores(rows.map((r) => r.neuroW));
  const zblend = (a) => rows.map((r, i) => ({ r, key: zl[i] * (1 - a) + zn[i] * a }))
    .sort((x, y) => y.key - x.key).slice(0, K).map((x) => x.r);
  return {
    symbolic: Number(meanHoldout(symTop).toFixed(4)),
    mult: Number(meanHoldout(multTop).toFixed(4)),
    borda: Number(meanHoldout(bordaTop).toFixed(4)),
    lexico: Number(meanHoldout(lexTop).toFixed(4)),
    veto: Number(meanHoldout(vetoTop).toFixed(4)),
    'zblend.25': Number(meanHoldout(zblend(0.25)).toFixed(4)),
    'zblend.5': Number(meanHoldout(zblend(0.5)).toFixed(4)),
  };
}

export function evaluateHybridGrounding(repoRoot) {
  const sets = gateSets(repoRoot);
  const proposal = proposeFromCorpus(repoRoot, {});
  const couplings = (proposal.candidates ?? []).filter((c) => c.informative && typeof c.holdoutConfidence === 'number');
  if (couplings.length < 10) return { error: 'too few couplings to test', couplings: couplings.length };

  // Per-split neuroW: train one logreg per consequent on that split's train sets.
  const distinctB = [...new Set(couplings.map((c) => c.consequent))];
  const perSplitNeuroW = SPLITS.map((pred) => {
    const train = sets.filter((_, i) => pred(i));
    const allGates = [...new Set(train.flatMap((s) => [...s]))].sort();
    const byB = new Map();
    for (const B of distinctB) byB.set(B, conditionalWeights(train, B, allGates));
    return couplings.map((c) => { const w = byB.get(c.consequent); return w && w.has(c.antecedent) ? w.get(c.antecedent) : 0; });
  });
  // Bagged neuroW = mean across splits.
  const baggedNeuroW = couplings.map((_, i) => perSplitNeuroW.reduce((s, arr) => s + arr[i], 0) / SPLITS.length);
  const baggedRows = couplings.map((c, i) => ({ lift: c.lift, neuroW: baggedNeuroW[i], holdout: c.holdoutConfidence }));

  const bagged = {}; for (const K of Ks) bagged[`K${K}`] = scoreRankers(baggedRows, K);

  // Per-split robustness at K=20: does each ranker beat the (fixed) symbolic baseline?
  const Krob = Math.min(20, couplings.length);
  const baseK20 = scoreRankers(baggedRows, Krob).symbolic; // symbolic is split-independent
  const perSplitWins = {};
  for (const name of ['mult', 'borda', 'lexico', 'veto']) perSplitWins[name] = 0;
  for (let s = 0; s < SPLITS.length; s += 1) {
    const rows = couplings.map((c, i) => ({ lift: c.lift, neuroW: perSplitNeuroW[s][i], holdout: c.holdoutConfidence }));
    const sc = scoreRankers(rows, Krob);
    for (const name of ['mult', 'borda', 'lexico', 'veto']) if (sc[name] > baseK20 + 1e-9) perSplitWins[name] += 1;
  }

  // Pre-registered win rule (zblend excluded — exploratory).
  const eligible = ['mult', 'borda', 'lexico', 'veto'];
  const winners = eligible.filter((name) => {
    const allK = Ks.every((K) => bagged[`K${K}`][name] > bagged[`K${K}`].symbolic + WIN_MARGIN);
    const majoritySplits = perSplitWins[name] >= Math.ceil(SPLITS.length / 2);
    return allK && majoritySplits;
  });

  const symBaseline = {}; for (const K of Ks) symBaseline[`K${K}`] = bagged[`K${K}`].symbolic;
  return {
    couplings: couplings.length,
    splits: SPLITS.length,
    winMargin: WIN_MARGIN,
    symbolicBaseline: symBaseline,
    baggedScores: bagged,
    perSplitWinsVsSymbolic_K20: perSplitWins,
    winners,
    verdict: winners.length
      ? `GENUINE hybrid win(s): ${winners.join(', ')} beat symbolic top-K at all K (margin>${WIN_MARGIN}) AND on a majority of splits — the connectionist signal adds measured top-K selection value. HUMAN-VERIFY before deploying.`
      : 'NO hybrid beats symbolic top-K robustly. CEILING CONFIRMED (stronger than the earlier naive-only negative): pure symbolic lift is at the top-K selection frontier on this corpus; the connectionist conditional weight adds NO top-K selection value. Honest negative.',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(evaluateHybridGrounding(repoRoot), null, 2));
}
