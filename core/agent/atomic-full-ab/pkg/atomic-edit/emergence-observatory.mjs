#!/usr/bin/env node
/**
 * emergence-observatory.mjs — PARADIGM PART D.6: observability of the UNFORMALIZABLE.
 *
 * The dossier's OBJECTIVE is to CAUSE, observe and MEASURE an emergence — a capability the unified system
 * exhibits that no constituent can. You cannot PROVE what you have not named, but you CAN measure DEVIATION
 * from the expected, and a genuine unplanned emergence shows up FIRST as a residual the formal model did not
 * predict. This module instruments the loop for the unnameable, fed by the disproof corpus + the friction
 * ledger (N3) + the trace chain. Each signal measures deviation, not magic; none is interpreted as emergence
 * without surviving the same recompute / held-out / death-condition discipline as the rest of atomic.
 *
 *   O1 Novelty index   — 1 − Jaccard over n-grams of normalized diffs; a sustained rise/fall is a structural
 *                        shift nobody coded (generalizes the darwin-godel M5 to a live signal).
 *   O2 Agent-niche     — per-agent distribution over invariants; a spontaneous SPECIALIZATION (one agent
 *                        becoming the expert of a wall because friction routed it there) is coordination-layer
 *                        emergence, recomputable from the friction ledger.
 *   O3 Wall-topology   — cluster the corpus by (invariantId, locus-shape); a cluster whose invariant maps to
 *                        NO named taxonomy class is a dimension the theory has not yet named (feeds L05/L17).
 *   O4 Meta-laws       — mine "wall X ⇒ wall Y" implications (antecedent one wall, consequent a DIFFERENT
 *                        wall), out-of-sample validated — the corpus predicting failure modes it has not seen.
 *   O5 Anomaly residual— the headline detector: every event the formal expectation did NOT predict, as an
 *                        append-only, hash-chained, recomputable stream. Where an unformalizable emergence
 *                        appears before we have words for it.
 *
 * Pure: in-memory; no spawn, no Date.now/random. Honest: O1–O5 measure deviation; the caller applies the
 * death-condition discipline before calling any signal "emergence".
 */
import { createHash } from 'node:crypto';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// ── O1: Novelty index ──────────────────────────────────────────────────────────
/** n-gram set of a normalized string. */
function ngrams(text, n) {
  const t = String(text).toLowerCase().replace(/\s+/g, ' ').trim();
  const out = new Set();
  for (let i = 0; i + n <= t.length; i += 1) out.add(t.slice(i, i + n));
  return out;
}
function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}
/**
 * Novelty of each diff vs the PRECEDING one: 1 − Jaccard(n-grams). High = structurally new.
 * @returns {{series:number[], mean:number}}
 */
export function noveltyIndex(diffSeq, n = 3) {
  const grams = diffSeq.map((d) => ngrams(d, n));
  const series = [];
  for (let i = 1; i < grams.length; i += 1) series.push(1 - jaccard(grams[i - 1], grams[i]));
  const mean = series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0;
  return { series, mean };
}

// ── O2: Agent-niche emergence ───────────────────────────────────────────────────
/**
 * From a friction ledger (N3 state), per-agent distribution over invariants and a niche detection:
 * an agent is SPECIALIZED on an invariant if a dominant fraction (>= threshold) of its hits concentrate there.
 * @param {{ledger:Map}} state  buildFrictionLedger output
 */
export function agentNiches(state, threshold = 0.6) {
  const perAgent = new Map(); // agent -> Map(invariantId -> hits)
  for (const e of state.ledger.values()) {
    if (!perAgent.has(e.agent)) perAgent.set(e.agent, new Map());
    perAgent.get(e.agent).set(e.invariantId, (perAgent.get(e.agent).get(e.invariantId) ?? 0) + e.hits);
  }
  const niches = [];
  for (const [agent, dist] of perAgent) {
    const total = [...dist.values()].reduce((a, b) => a + b, 0);
    let top = null, topN = 0;
    for (const [inv, h] of dist) if (h > topN) { topN = h; top = inv; }
    const concentration = total ? topN / total : 0;
    if (concentration >= threshold) niches.push({ agent, invariantId: top, concentration, hits: topN, total });
  }
  return { niches, agentCount: perAgent.size };
}

// ── O3: Wall-topology clustering ────────────────────────────────────────────────
/** locus-shape = a coarse signature of a locus (file extension + region kind), not the exact bytes. */
function locusShape(locus) {
  const file = String(locus?.file ?? '');
  const ext = file.includes('.') ? file.slice(file.lastIndexOf('.')) : '(none)';
  const region = String(locus?.region ?? '');
  const kind = region.includes(':') ? region.slice(0, region.indexOf(':')) : (region ? 'region' : 'whole');
  return `${ext}#${kind}`;
}
/**
 * Cluster witness records by (invariantId, locus-shape). A cluster whose invariantId maps to NO named
 * taxonomy class is an UNNAMED dimension — the closure-meta-gate's "the theory must grow" signal.
 * @param {object[]} records  disproof-corpus records
 * @param {(invariantId:string)=>boolean} isNamed  maps an invariantId to whether the taxonomy names it
 */
export function wallTopologyClusters(records, isNamed) {
  const clusters = new Map();
  for (const r of records) {
    if (r.kind !== 'atomic-disproof-witness-record') continue;
    const key = `${r.invariantId} :: ${locusShape(r.locus)}`;
    if (!clusters.has(key)) clusters.set(key, { invariantId: r.invariantId, shape: locusShape(r.locus), count: 0, named: isNamed(r.invariantId) });
    clusters.get(key).count += 1;
  }
  const all = [...clusters.values()];
  return { clusters: all, unnamed: all.filter((c) => !c.named) };
}

// ── O4: Meta-laws (walls-that-predict-walls) ────────────────────────────────────
/**
 * Mine implications "in a generation that hit wall X, wall Y was ALSO hit" with support/confidence, then
 * out-of-sample validate on a held-out split. Antecedent and consequent must be DIFFERENT walls.
 * @param {Array<{generation:any, invariantId:string}>} hits  per-(generation) wall hits
 */
export function metaLaws(hits, opts = {}) {
  const minSupport = opts.minSupport ?? 2;
  const minConfidence = opts.minConfidence ?? 0.8;
  // group invariants by generation
  const byGen = new Map();
  for (const h of hits) {
    const g = String(h.generation);
    if (!byGen.has(g)) byGen.set(g, new Set());
    byGen.get(g).add(h.invariantId);
  }
  const gens = [...byGen.values()];
  // split: even index = train, odd = holdout (deterministic, no randomness)
  const train = gens.filter((_, i) => i % 2 === 0);
  const holdout = gens.filter((_, i) => i % 2 === 1);
  const countCo = (sets, x, y) => sets.filter((s) => s.has(x) && s.has(y)).length;
  const countA = (sets, x) => sets.filter((s) => s.has(x)).length;
  const invariants = [...new Set(hits.map((h) => h.invariantId))];
  const laws = [];
  for (const x of invariants) for (const y of invariants) {
    if (x === y) continue;
    const support = countCo(train, x, y);
    const ax = countA(train, x);
    if (support < minSupport || ax === 0) continue;
    const confidence = support / ax;
    if (confidence < minConfidence) continue;
    // out-of-sample validate
    const hAx = countA(holdout, x);
    const hCo = countCo(holdout, x, y);
    const holdoutConfidence = hAx ? hCo / hAx : null;
    laws.push({ antecedent: x, consequent: y, support, confidence, holdoutConfidence, validated: holdoutConfidence !== null && holdoutConfidence >= minConfidence });
  }
  return { laws, trainGens: train.length, holdoutGens: holdout.length };
}

// ── O5: Anomaly residual (the headline detector) ────────────────────────────────
/**
 * The residual stream: every observed event the predictor did NOT expect, as an append-only hash chain.
 * @param {any[]} events
 * @param {(event:any)=>boolean} predicted  the formal expectation (true = expected/predicted)
 * @param {string|null} prevChainSha
 * @returns {{residual:Array, headSha:string|null, anomalyRate:number}}
 */
export function anomalyResidual(events, predicted, prevChainSha = null) {
  const residual = [];
  let chain = prevChainSha;
  for (const ev of events) {
    if (predicted(ev)) continue; // expected → not an anomaly
    const body = JSON.stringify({ event: ev, previousSha: chain });
    const recordSha = sha256(body);
    residual.push({ event: ev, previousSha: chain, recordSha });
    chain = recordSha;
  }
  return { residual, headSha: chain, anomalyRate: events.length ? residual.length / events.length : 0 };
}

/** Verify an anomaly-residual chain is intact (tamper-evident, recomputable). */
export function verifyResidualChain(residual, prevChainSha = null) {
  let chain = prevChainSha;
  for (const r of residual) {
    if ((r.previousSha ?? null) !== (chain ?? null)) return { ok: false, error: 'previousSha break' };
    const body = JSON.stringify({ event: r.event, previousSha: chain });
    if (sha256(body) !== r.recordSha) return { ok: false, error: 'recordSha mismatch' };
    chain = r.recordSha;
  }
  return { ok: true, headSha: chain };
}
