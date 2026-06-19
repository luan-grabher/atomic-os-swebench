#!/usr/bin/env node
/**
 * neuro.mjs — P6: the CONNECTIONIST half, CPU-viable and honest.
 *
 * A small LEARNED model (logistic regression, pure JS, no GPU) trained on the system's OWN
 * corpus to predict whether a target gate co-fires on a candidate, given which OTHER gates
 * fired. This is the "neuro" of neuro-symbolic: continuous weights learned from data, in
 * contrast to the symbolic association rule. The honest test the prompt sets: does the learned
 * model BEAT the hard-coded heuristic on a HELD-OUT split?
 *
 * STRICT HONESTY: a learned model is NOT guaranteed to win. On co-occurrence data, logistic
 * regression and a best-single-feature rule are often close. We train, evaluate on holdout,
 * and report `beatsHeuristic` truthfully — including when it is FALSE. A negative result is a
 * real result; faking a win would destroy the project (anti-Goodhart, anti-self-deception).
 *
 * CPU-viable by construction: ~89 features, ~256 samples, batch gradient descent, deterministic
 * (zero-init, no randomness) so the result is recomputable by a third party.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const DEFAULT_TARGET = 'gate.node gates/compiled-mcp-y-certificate.proof.mjs --json'; // ~46% base rate

function readCorpus(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** Build labelled samples: x = multi-hot of all gates except target; y = 1 if target fired. */
function locusShape(r) {
  const f = String(r.locus?.file ?? '');
  const ext = f.includes('.') ? f.slice(f.lastIndexOf('.')) : '(none)';
  const region = String(r.locus?.region ?? '');
  const kind = region.includes(':') ? region.slice(0, region.indexOf(':')) : (region ? 'region' : 'whole');
  return 'locus:' + ext + '#' + kind;
}
function buildDataset(recs, target) {
  // Richer features (P6 deepening): co-firing gates PLUS the candidate's locus-shape
  // (file-extension # region-kind) — some gates fire more on certain file shapes, a signal the
  // gate-only model could not see. Measured honestly against the prior gate-only result.
  const samples = recs.map((r) => ({
    set: new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : [])),
    shape: locusShape(r),
  })).filter((s) => s.set.size > 0);
  const gateFeats = [...new Set(samples.flatMap((s) => [...s.set]))].filter((g) => g !== target);
  const locusFeats = [...new Set(samples.map((s) => s.shape))];
  const features = [...gateFeats, ...locusFeats].sort();
  const fidx = new Map(features.map((f, i) => [f, i]));
  const X = []; const Y = [];
  for (const s of samples) {
    const x = new Float64Array(features.length);
    for (const g of s.set) { if (g !== target && fidx.has(g)) x[fidx.get(g)] = 1; }
    if (fidx.has(s.shape)) x[fidx.get(s.shape)] = 1;
    X.push(x); Y.push(s.set.has(target) ? 1 : 0);
  }
  return { X, Y, features };
}

function trainLogReg(X, Y, { iters = 400, lr = 0.5, l2 = 1e-3 } = {}) {
  const F = X[0]?.length ?? 0;
  const w = new Float64Array(F); let b = 0;
  const N = X.length || 1;
  for (let it = 0; it < iters; it += 1) {
    const gw = new Float64Array(F); let gb = 0;
    for (let n = 0; n < X.length; n += 1) {
      let z = b; const x = X[n];
      for (let j = 0; j < F; j += 1) z += w[j] * x[j];
      const e = sigmoid(z) - Y[n];
      for (let j = 0; j < F; j += 1) gw[j] += e * x[j];
      gb += e;
    }
    for (let j = 0; j < F; j += 1) w[j] -= lr * (gw[j] / N + l2 * w[j]);
    b -= lr * (gb / N);
  }
  return { w, b };
}

const predict = (model, x) => { let z = model.b; for (let j = 0; j < x.length; j += 1) z += model.w[j] * x[j]; return sigmoid(z); };

function auc(scores, labels) {
  const pos = []; const neg = [];
  for (let i = 0; i < scores.length; i += 1) (labels[i] ? pos : neg).push(scores[i]);
  if (!pos.length || !neg.length) return null;
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

export function trainAndEvaluate(repoRoot, target = DEFAULT_TARGET) {
  const { X, Y, features } = buildDataset(readCorpus(repoRoot), target);
  if (X.length < 8) return { ok: false, reason: 'not enough samples', samples: X.length };
  const tr = X.map((_, i) => i).filter((i) => i % 2 === 0);
  const ho = X.map((_, i) => i).filter((i) => i % 2 === 1);
  const Xtr = tr.map((i) => X[i]); const Ytr = tr.map((i) => Y[i]);
  const Xho = ho.map((i) => X[i]); const Yho = ho.map((i) => Y[i]);
  const model = trainLogReg(Xtr, Ytr);
  // learned holdout metrics
  const scores = Xho.map((x) => predict(model, x));
  const learnedAcc = Yho.reduce((a, y, i) => a + ((scores[i] >= 0.5 ? 1 : 0) === y ? 1 : 0), 0) / (Yho.length || 1);
  const learnedAuc = auc(scores, Yho);
  // baseline 1: majority class (the hard-coded "always guess the common case")
  const trPos = Ytr.reduce((a, b) => a + b, 0); const majority = trPos >= Ytr.length / 2 ? 1 : 0;
  const majAcc = Yho.reduce((a, y) => a + (majority === y ? 1 : 0), 0) / (Yho.length || 1);
  // baseline 2: best single-feature symbolic rule (presence of one other gate predicts target)
  let bestFeatAcc = 0; let bestFeat = null;
  for (let j = 0; j < features.length; j += 1) {
    const acc = Yho.reduce((a, y, i) => a + ((Xho[i][j] >= 0.5 ? 1 : 0) === y ? 1 : 0), 0) / (Yho.length || 1);
    if (acc > bestFeatAcc) { bestFeatAcc = acc; bestFeat = features[j]; }
  }
  const heuristicAcc = Math.max(majAcc, bestFeatAcc);
  return {
    ok: true,
    target,
    samples: X.length,
    features: features.length,
    holdout: Yho.length,
    learned: { accuracy: Number(learnedAcc.toFixed(4)), auc: learnedAuc === null ? null : Number(learnedAuc.toFixed(4)) },
    baselineMajority: Number(majAcc.toFixed(4)),
    baselineBestFeature: Number(bestFeatAcc.toFixed(4)),
    beatsHeuristic: learnedAcc > heuristicAcc + 1e-9,
    verdict: learnedAcc > heuristicAcc + 1e-9
      ? 'learned model BEATS the heuristic on holdout (P6 criterion met)'
      : 'learned model does NOT beat the heuristic on holdout (honest negative — P6 criterion NOT met)',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(trainAndEvaluate(repoRoot), null, 2));
}
