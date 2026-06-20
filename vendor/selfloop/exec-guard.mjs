#!/usr/bin/env node
/**
 * exec-guard.mjs — DEPLOY the settled linear failure-risk ranker as an ADVISORY guard.
 *
 * The honest conclusion (exec-risk.mjs, tested twice): the connectionist half is best as a LINEAR
 * model, a useful risk RANKER (~3.2x lift @ top-decile on novel commands), NOT a classifier and NOT
 * cognition. This wires it for real use: train once on the exec-ledger, persist the model, and score
 * any command's failure-risk from features known BEFORE it runs (command + cwd + intent tokens).
 *
 * It is ADVISORY ONLY — a heads-up that a command resembles ones that historically failed. It NEVER
 * blocks. The lattice/gates remain the real safety surface; this is a learned hint layered on top.
 * Token-only features so it works standalone (no engine classifier needed at score time).
 *
 *   node exec-guard.mjs train [repoRoot]            # train + persist .atomic/exec-risk-model.json
 *   node exec-guard.mjs score "<command>" [repoRoot]   # advisory risk for one command
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveAtomicRoot } from './atomic-root.mjs';

const MODEL_REL = '.atomic/exec-risk-model.json';
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const tokensOf = (s) => String(s || '').toLowerCase().split(/[^a-z0-9._/-]+/).filter((t) => t.length >= 2);
const richTokens = (r) => {
  const out = tokensOf(r.command);
  for (const t of tokensOf(r.intent)) out.push('i:' + t);
  const base = String(r.cwd || '').split('/').filter(Boolean).pop();
  if (base) out.push('cwd:' + base);
  return out;
};
function load(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'exec-ledger.jsonl');
  if (!fs.existsSync(file)) return [];
  const rows = [];
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) { const t = l.trim(); if (!t) continue; try { const o = JSON.parse(t); if (o && o.exitCode !== undefined && o.exitCode !== null && typeof o.command === 'string') rows.push(o); } catch { /* skip */ } }
  return rows;
}
const vec = (toks, fidx, F) => { const x = new Float64Array(F); for (const t of new Set(toks)) { const i = fidx.get(t); if (i !== undefined) x[i] = 1; } return x; };

export function trainModel(repoRoot, { cap = 12000, vocabK = 200 } = {}) {
  let rows = load(repoRoot);
  if (rows.length < 50) throw new Error('exec-guard: too few exec rows to train');
  if (rows.length > cap) { const step = rows.length / cap; rows = Array.from({ length: cap }, (_, i) => rows[Math.floor(i * step)]); }
  const freq = new Map();
  for (const r of rows) for (const t of new Set(richTokens(r))) freq.set(t, (freq.get(t) ?? 0) + 1);
  const vocab = [...freq.entries()].filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]).slice(0, vocabK).map(([t]) => t);
  const fidx = new Map(vocab.map((t, i) => [t, i])); const F = vocab.length;
  const X = rows.map((r) => vec(richTokens(r), fidx, F));
  const Y = rows.map((r) => ((r.exitCode !== 0 || r.rolledBack === true) ? 1 : 0));
  const w = new Float64Array(F); let b = 0; const N = X.length;
  for (let it = 0; it < 250; it += 1) {
    const gw = new Float64Array(F); let gb = 0;
    for (let n = 0; n < N; n += 1) { let z = b; const x = X[n]; for (let j = 0; j < F; j += 1) z += w[j] * x[j]; const e = sigmoid(z) - Y[n]; for (let j = 0; j < F; j += 1) gw[j] += e * x[j]; gb += e; }
    for (let j = 0; j < F; j += 1) w[j] -= 0.5 * (gw[j] / N + 1e-4 * w[j]); b -= 0.5 * (gb / N);
  }
  const scores = X.map((x) => { let z = b; for (let j = 0; j < F; j += 1) z += w[j] * x[j]; return sigmoid(z); }).sort((a, c) => a - c);
  const threshold = scores[Math.floor(scores.length * 0.9)]; // top-decile risk cutoff
  const model = { kind: 'exec-risk-linear', vocab, w: Array.from(w), b, threshold, baseRate: Number((Y.reduce((a, c) => a + c, 0) / N).toFixed(4)), trainedRows: N };
  fs.writeFileSync(path.join(repoRoot, MODEL_REL), JSON.stringify(model));
  return model;
}

export function scoreCommand(repoRoot, { command, cwd, intent }) {
  const file = path.join(repoRoot, MODEL_REL);
  if (!fs.existsSync(file)) throw new Error('exec-guard: no model — run `node exec-guard.mjs train` first');
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fidx = new Map(m.vocab.map((t, i) => [t, i]));
  const x = vec(richTokens({ command, cwd, intent }), fidx, m.vocab.length);
  let z = m.b; for (let j = 0; j < m.vocab.length; j += 1) z += m.w[j] * x[j];
  const risk = sigmoid(z);
  const flagged = risk >= m.threshold;
  return {
    risk: Number(risk.toFixed(4)), flagged, threshold: Number(m.threshold.toFixed(4)), baseRate: m.baseRate,
    advisory: flagged
      ? `ADVISORY: this command resembles historically failure-prone ones (risk ${risk.toFixed(3)} >= top-decile ${m.threshold.toFixed(3)}). Heads-up only — NOT a block; the gates remain the real safety.`
      : `risk ${risk.toFixed(3)} below the top-decile cutoff ${m.threshold.toFixed(3)} — no advisory.`,
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2];
  if (mode === 'train') {
    const repoRoot = resolveAtomicRoot(process.argv[3]);
    const m = trainModel(repoRoot);
    console.log(JSON.stringify({ trained: true, rows: m.trainedRows, vocab: m.vocab.length, threshold: Number(m.threshold.toFixed(4)), baseRate: m.baseRate }, null, 2));
  } else if (mode === 'score') {
    const command = process.argv[3] || '';
    const repoRoot = resolveAtomicRoot(process.argv[4]);
    console.log(JSON.stringify(scoreCommand(repoRoot, { command }), null, 2));
  } else {
    console.log('usage: node exec-guard.mjs train [repoRoot] | score "<command>" [repoRoot]');
  }
}
