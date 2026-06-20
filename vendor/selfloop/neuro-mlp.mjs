#!/usr/bin/env node
/**
 * neuro-mlp.mjs — P6 deeper: a NONLINEAR connectionist model (tiny MLP, 1 hidden layer, pure JS,
 * CPU, deterministic seeded init). Research question, measured honestly: does nonlinearity capture
 * gate-interaction structure the LINEAR model (neuro.mjs logistic regression) cannot — i.e. does it
 * beat the heuristic on MORE gates than the 9/55 the linear model wins?
 *
 * HONEST: more capacity often does NOT help on small data (128 train rows) and can overfit. We
 * report the win count truthfully, including if it is <= the linear model's. A negative is a result.
 * CPU-viable: F~88, H=8, batch GD. Deterministic (seeded LCG init), so recomputable.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveAtomicRoot } from './atomic-root.mjs';

function recs(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function locusShape(r) {
  const f = String(r.locus?.file ?? ''); const ext = f.includes('.') ? f.slice(f.lastIndexOf('.')) : '(none)';
  const region = String(r.locus?.region ?? ''); const kind = region.includes(':') ? region.slice(0, region.indexOf(':')) : (region ? 'region' : 'whole');
  return 'locus:' + ext + '#' + kind;
}
function dataset(rs, target) {
  const samples = rs.map((r) => ({ set: new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : [])), shape: locusShape(r) })).filter((s) => s.set.size > 0);
  const feats = [...new Set([...samples.flatMap((s) => [...s.set]).filter((g) => g !== target), ...samples.map((s) => s.shape)])];
  const fidx = new Map(feats.map((f, i) => [f, i]));
  const X = samples.map((s) => { const x = new Float64Array(feats.length); for (const g of s.set) if (g !== target && fidx.has(g)) x[fidx.get(g)] = 1; if (fidx.has(s.shape)) x[fidx.get(s.shape)] = 1; return x; });
  const Y = samples.map((s) => (s.set.has(target) ? 1 : 0));
  return { X, Y, F: feats.length };
}
const lcg = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function trainMLP(X, Y, F, { H = 8, iters = 400, lr = 0.3, l2 = 1e-3, seed = 1234 } = {}) {
  const rnd = lcg(seed); const sw = () => (rnd() * 2 - 1) * 0.1;
  const W1 = Array.from({ length: H }, () => Float64Array.from({ length: F }, sw)); const b1 = new Float64Array(H);
  const W2 = Float64Array.from({ length: H }, sw); let b2 = 0; const N = X.length || 1;
  for (let it = 0; it < iters; it += 1) {
    const gW1 = Array.from({ length: H }, () => new Float64Array(F)); const gb1 = new Float64Array(H);
    const gW2 = new Float64Array(H); let gb2 = 0;
    for (let n = 0; n < X.length; n += 1) {
      const x = X[n]; const h = new Float64Array(H);
      for (let k = 0; k < H; k += 1) { let z = b1[k]; const w = W1[k]; for (let j = 0; j < F; j += 1) z += w[j] * x[j]; h[k] = Math.tanh(z); }
      let zo = b2; for (let k = 0; k < H; k += 1) zo += W2[k] * h[k];
      const o = sigmoid(zo); const dO = o - Y[n];
      for (let k = 0; k < H; k += 1) { gW2[k] += dO * h[k]; const dh = dO * W2[k] * (1 - h[k] * h[k]); gb1[k] += dh; const gw = gW1[k]; for (let j = 0; j < F; j += 1) gw[j] += dh * x[j]; }
      gb2 += dO;
    }
    for (let k = 0; k < H; k += 1) { W2[k] -= lr * (gW2[k] / N + l2 * W2[k]); b1[k] -= lr * (gb1[k] / N); const w = W1[k]; const gw = gW1[k]; for (let j = 0; j < F; j += 1) w[j] -= lr * (gw[j] / N + l2 * w[j]); }
    b2 -= lr * (gb2 / N);
  }
  return { W1, b1, W2, b2, H };
}
function predMLP(m, x) { let zo = m.b2; for (let k = 0; k < m.H; k += 1) { let z = m.b1[k]; const w = m.W1[k]; for (let j = 0; j < x.length; j += 1) z += w[j] * x[j]; zo += m.W2[k] * Math.tanh(z); } return sigmoid(zo); }

export function evalMLP(repoRoot, target) {
  const { X, Y, F } = dataset(recs(repoRoot), target);
  if (X.length < 8) return { ok: false };
  const tr = X.map((_, i) => i).filter((i) => i % 2 === 0); const ho = X.map((_, i) => i).filter((i) => i % 2 === 1);
  const m = trainMLP(tr.map((i) => X[i]), tr.map((i) => Y[i]), F);
  const acc = ho.reduce((a, i) => a + ((predMLP(m, X[i]) >= 0.5 ? 1 : 0) === Y[i] ? 1 : 0), 0) / (ho.length || 1);
  // heuristic baselines (same as neuro.mjs): majority + best-single-feature on holdout
  const trPos = tr.reduce((a, i) => a + Y[i], 0); const maj = trPos >= tr.length / 2 ? 1 : 0;
  const majAcc = ho.reduce((a, i) => a + (maj === Y[i] ? 1 : 0), 0) / (ho.length || 1);
  let bestFeat = 0; for (let j = 0; j < F; j += 1) { const fa = ho.reduce((a, i) => a + ((X[i][j] >= 0.5 ? 1 : 0) === Y[i] ? 1 : 0), 0) / (ho.length || 1); if (fa > bestFeat) bestFeat = fa; }
  const heur = Math.max(majAcc, bestFeat);
  return { ok: true, accuracy: Number(acc.toFixed(4)), heuristic: Number(heur.toFixed(4)), beatsHeuristic: acc > heur + 1e-9 };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = resolveAtomicRoot(process.argv[2]);
  const rs = recs(repoRoot);
  const sets = rs.map((r) => new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : []))).filter((s) => s.size > 0);
  const cnt = {}; sets.forEach((s) => [...s].forEach((g) => { cnt[g] = (cnt[g] || 0) + 1; })); const N = sets.length;
  const targets = Object.entries(cnt).filter(([, c]) => c / N >= 0.1 && c / N <= 0.9).map(([g]) => g);
  let wins = 0; let valid = 0;
  for (const t of targets) { const r = evalMLP(repoRoot, t); if (!r.ok) continue; valid += 1; if (r.beatsHeuristic) wins += 1; }
  console.log(JSON.stringify({ model: 'MLP (1 hidden, tanh)', targets: valid, beatsHeuristic: wins, linearBaselineWins: 9, nonlinearityHelps: wins > 9 }, null, 2));
}
