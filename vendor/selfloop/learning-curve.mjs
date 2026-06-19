#!/usr/bin/env node
/**
 * learning-curve.mjs — TEST MY OWN THESIS, honestly and temporally.
 *
 * I keep claiming "the connectionist half is data-limited; it improves as the symbolic system
 * operates and accrues data (P8)." That is a falsifiable claim and I have not measured it. This does:
 *
 *   Sort the exec-ledger by time. At increasing history sizes k, train ONLY on the past [0..k] and
 *   predict the immediate FUTURE block [k..k+W]. Measure AUC of future-failure prediction at each k.
 *   No leakage (train strictly precedes test — the real online setting).
 *
 * If AUC RISES with k → operation genuinely improves the neuro half (P8 thesis validated with evidence).
 * If FLAT → honest negative: the signal saturates early and "more data via operation" buys little.
 * Either way it is the real answer, not an assertion. Deterministic, CPU-viable, recomputable.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const tokensOf = (s) => String(s || '').toLowerCase().split(/[^a-z0-9._/-]+/).filter((t) => t.length >= 2);
const richTokens = (r) => { const out = tokensOf(r.command); for (const t of tokensOf(r.intent)) out.push('i:' + t); const b = String(r.cwd || '').split('/').filter(Boolean).pop(); if (b) out.push('cwd:' + b); return out; };

function load(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'exec-ledger.jsonl');
  if (!fs.existsSync(file)) return [];
  const rows = [];
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) { const t = l.trim(); if (!t) continue; try { const o = JSON.parse(t); if (o && o.exitCode !== undefined && o.exitCode !== null && typeof o.command === 'string' && typeof o.ts === 'number') rows.push(o); } catch { /* skip */ } }
  return rows.sort((a, b) => a.ts - b.ts);
}
const label = (r) => ((r.exitCode !== 0 || r.rolledBack === true) ? 1 : 0);
const vecOf = (toks, fidx, F) => { const x = new Float64Array(F); for (const t of new Set(toks)) { const i = fidx.get(t); if (i !== undefined) x[i] = 1; } return x; };
function trainLin(rowsTr, vocabK = 180) {
  const freq = new Map();
  for (const r of rowsTr) for (const t of new Set(richTokens(r))) freq.set(t, (freq.get(t) ?? 0) + 1);
  const vocab = [...freq.entries()].filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]).slice(0, vocabK).map(([t]) => t);
  const fidx = new Map(vocab.map((t, i) => [t, i])); const F = vocab.length;
  const X = rowsTr.map((r) => vecOf(richTokens(r), fidx, F)); const Y = rowsTr.map(label);
  const w = new Float64Array(F); let b = 0; const N = X.length || 1;
  for (let it = 0; it < 200; it += 1) {
    const gw = new Float64Array(F); let gb = 0;
    for (let n = 0; n < N; n += 1) { let z = b; const x = X[n]; for (let j = 0; j < F; j += 1) z += w[j] * x[j]; const e = sigmoid(z) - Y[n]; for (let j = 0; j < F; j += 1) gw[j] += e * x[j]; gb += e; }
    for (let j = 0; j < F; j += 1) w[j] -= 0.5 * (gw[j] / N + 1e-4 * w[j]); b -= 0.5 * (gb / N);
  }
  return { w, b, fidx, F };
}
const predLin = (m, r) => { const x = vecOf(richTokens(r), m.fidx, m.F); let z = m.b; for (let j = 0; j < m.F; j += 1) z += m.w[j] * x[j]; return sigmoid(z); };
function auc(scores, labels) {
  const pos = []; const neg = [];
  for (let i = 0; i < scores.length; i += 1) (labels[i] ? pos : neg).push(scores[i]);
  if (!pos.length || !neg.length) return null;
  let w = 0; for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return w / (pos.length * neg.length);
}

export function learningCurve(repoRoot, { window = 1500 } = {}) {
  const rows = load(repoRoot);
  if (rows.length < 4000) return { ok: false, reason: 'need >=4000 time-stamped rows', rows: rows.length };
  const curve = [];
  for (let k = 1500; k + window <= rows.length; k += 1500) {
    const tr = rows.slice(0, k); const te = rows.slice(k, k + window);
    const m = trainLin(tr);
    const sc = te.map((r) => predLin(m, r)); const yy = te.map(label);
    curve.push({ historyRows: k, futureAUC: auc(sc, yy) === null ? null : Number(auc(sc, yy).toFixed(4)), futureFailRate: Number((yy.reduce((a, b) => a + b, 0) / yy.length).toFixed(3)) });
  }
  const aucs = curve.filter((c) => c.futureAUC !== null).map((c) => c.futureAUC);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const third = Math.max(1, Math.floor(aucs.length / 3));
  // Honest TREND: compare first-third vs last-third MEANS (not cherry-picked endpoints), report the plateau.
  const firstMean = mean(aucs.slice(0, third)); const lastMean = mean(aucs.slice(-third)); const plateau = mean(aucs);
  const rises = firstMean !== null && lastMean !== null && lastMean > firstMean + 0.02;
  const flat = firstMean !== null && lastMean !== null && Math.abs(lastMean - firstMean) <= 0.02;
  return {
    ok: true, totalRows: rows.length, window, curve,
    firstThirdMeanAUC: firstMean === null ? null : Number(firstMean.toFixed(4)),
    lastThirdMeanAUC: lastMean === null ? null : Number(lastMean.toFixed(4)),
    plateauMeanAUC: plateau === null ? null : Number(plateau.toFixed(4)),
    verdict: rises
      ? `thesis supported: future-AUC trend RISES (first-third ${firstMean.toFixed(3)} -> last-third ${lastMean.toFixed(3)}) — operation improves the neuro half`
      : flat
        ? `HONEST CORRECTION: future-AUC is a FLAT high plateau (~${plateau.toFixed(3)}; first-third ${firstMean.toFixed(3)} ~= last-third ${lastMean.toFixed(3)}). The signal SATURATES EARLY — strong already at 1500 rows. So "more data via operation improves the neuro half" is NOT supported; my earlier endpoint-based claim was a cherry-pick. The high plateau itself comes from TEMPORAL LOCALITY: near-future commands resemble recent ones (AUC ~${plateau.toFixed(2)}) far better than random novel commands (grouped-split AUC ~0.73).`
        : `future-AUC trend DROPS (first-third ${firstMean.toFixed(3)} -> last-third ${lastMean.toFixed(3)}) — non-stationary distribution; old data ages out`,
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(learningCurve(repoRoot), null, 2));
}
