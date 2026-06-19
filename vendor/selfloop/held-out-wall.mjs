#!/usr/bin/env node
/**
 * held-out-wall.mjs — the swarm's #2 survivor (adversarial-skeptic lens, highest honesty score).
 *
 * THE ONE SIGNAL ASSOCIATION-RULE MINING PROVABLY CANNOT FAKE: predict a NEW code-incorrectness
 * invariant (a wall) that has ZERO support in the corpus today, time-lock the prediction, and be
 * credited only when REAL later operation independently produces that exact invariant. Interpolation
 * (what the system already does) can only resurface invariants whose evidence already exists; a
 * confirmed held-out prediction is EXTRAPOLATION off the engine's failure manifold.
 *
 * HONEST SCOPING (grounded in the real corpus schema, 2026-06-19):
 *  - SEMANTIC signature = invariantId (the gate identity). There are 41 distinct invariantIds across
 *    256 rows; wallKey is per-record (content-hash region) so it is TRIVIALLY unique — using it would
 *    be the cosmetic-variant leak the skeptic warned about. A "new distinct invariant" = a new invariantId.
 *  - FREEZE S0 NOW, timestamped + hash-pinned to the corpus tip, so "unseen" is defined at a known time.
 *  - POWER is denominated in NEW DISTINCT INVARIANTS, not rows. With ~41 ever and glacial arrival, the
 *    harness will correctly ABSTAIN for a long time. Abstention is the honest state, not a failure.
 *  - TWO NAMED INSTRUMENTATION GAPS (like the exec-origin gap, reported not faked):
 *      (1) no extrapolative generator exists — the only available generator extrapolates existing
 *          patterns (structural adjacency), which is the BASELINE p0, so the pre-registered expectation
 *          with today's generator is the NULL.
 *      (2) corpus rows carry NO writer-pid/origin field, so the "confirmed by an INDEPENDENT writer"
 *          guard is not computable; until a writer field is added (gated, via expand_self), a confirmation
 *          cannot be audited against self-collusion and must be treated as UNVERIFIED.
 *  - F4 re-arming in emergence-report is intentionally NOT done here: it must fire only on a confirmed,
 *    powered, independent-writer hit, none of which exist. The judge stays silent.
 *
 * Recompute: node held-out-wall.mjs freeze <root>   ;   node held-out-wall.mjs score <root>
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

const FROZEN_REL = '.atomic/held-out-walls.jsonl';
const POWER_MIN_NEW_INVARIANTS = 15; // below this, ABSTAIN (binomial underpowered at alpha=0.05)
const K_PREDICTIONS = 10;
const sha = (s) => createHash('sha256').update(s).digest('hex');

function loadCorpus(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
const distinctInvariants = (rows) => [...new Set(rows.map((r) => r.invariantId).filter(Boolean))].sort();

// Honest BASELINE predictor (= the p0 structural-adjacency miner the real generator must BEAT).
// It extrapolates existing invariantId families (file-stem token + verdict family) into plausible
// not-yet-seen siblings. These are structural-adjacency guesses BY CONSTRUCTION — that is the point:
// a generator that only produces these cannot demonstrate extrapolation. Each prediction MUST have
// zero support in S0 (else it is pure interpolation and is dropped).
function baselinePredictions(s0) {
  const stems = new Set();
  for (const id of s0) {
    const m = id.match(/gates\/([a-z0-9-]+)\.proof/i);
    if (m) stems.add(m[1]);
  }
  const stemList = [...stems];
  const preds = [];
  // adjacency heuristic: combine existing stem fragments into new candidate gate identities.
  for (let i = 0; i < stemList.length && preds.length < K_PREDICTIONS; i += 1) {
    const a = stemList[i].split('-');
    const b = stemList[(i + 1) % stemList.length].split('-');
    const cand = `${a[0]}-${b[b.length - 1]}`;
    const sig = `gate.node gates/${cand}.proof.mjs --json`;
    if (!s0.includes(sig)) preds.push({ sig, basis: `structural-adjacency(${stemList[i]}|${stemList[(i + 1) % stemList.length]})` });
  }
  return preds;
}

function freeze(repoRoot) {
  const rows = loadCorpus(repoRoot);
  if (rows.length < 10) return { error: 'corpus too small to freeze', rows: rows.length };
  const s0 = distinctInvariants(rows);
  const tip = rows[rows.length - 1];
  const predictions = baselinePredictions(s0);
  const rec = {
    kind: 'held-out-wall-freeze',
    ts: Date.now(),
    s0Count: s0.length,
    s0Sha: sha(s0.join('\n')),
    corpusRows: rows.length,
    corpusTipSha: tip.recordSha256 ?? null,
    generator: 'baseline-structural-adjacency',
    preRegisteredExpectation: 'NULL — a structural-adjacency baseline cannot demonstrate extrapolation; it confirms at p0 by definition. A real win requires an EXTRAPOLATIVE generator (open frontier) beating this baseline.',
    predictions,
  };
  fs.appendFileSync(path.join(repoRoot, FROZEN_REL), JSON.stringify(rec) + '\n');
  return { frozen: true, s0Count: s0.length, predictions: predictions.length, corpusRows: rows.length, file: FROZEN_REL };
}

function score(repoRoot) {
  const frozenFile = path.join(repoRoot, FROZEN_REL);
  if (!fs.existsSync(frozenFile)) return { error: 'no freeze record — run `held-out-wall.mjs freeze` first' };
  const freezes = fs.readFileSync(frozenFile, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).filter((r) => r.kind === 'held-out-wall-freeze');
  // Use the freeze that pinned a corpus tip (the baseline freeze) as the "since freeze" cutoff.
  const f0 = freezes.find((f) => typeof f.corpusRows === 'number') ?? freezes[0];
  const rows = loadCorpus(repoRoot);
  const nowInvariants = distinctInvariants(rows);
  // new-distinct = invariants present NOW not present in the first f0.corpusRows rows (the frozen prefix).
  const cut = typeof f0.corpusRows === 'number' ? f0.corpusRows : 0;
  const preFreezeInv = new Set(rows.slice(0, cut).map((r) => r.invariantId));
  const newInvariants = nowInvariants.filter((id) => !preFreezeInv.has(id));
  // Group predictions BY GENERATOR across all freeze records, so extrapolator vs baseline is comparable.
  const byGen = new Map();
  for (const fr of freezes) { const g = fr.generator || 'unknown'; if (!byGen.has(g)) byGen.set(g, new Set()); for (const p of (fr.predictions ?? [])) byGen.get(g).add(p.sig); }
  const perGenerator = {};
  for (const [g, sigs] of byGen) { const hits = newInvariants.filter((id) => sigs.has(id)); perGenerator[g] = { predictions: sigs.size, confirmed: hits.length, confirmedInvariants: hits, rate: sigs.size ? Number((hits.length / sigs.size).toFixed(3)) : 0 }; }
  const confirmed = newInvariants.filter((id) => [...byGen.values()].some((s) => s.has(id)));
  const extrap = perGenerator['coverage-extrapolator-recency'];
  const base = perGenerator['baseline-structural-adjacency'];
  const extrapolatorBeatsBaseline = extrap && base ? extrap.rate > base.rate : null;

  // chain integrity over the whole corpus (a broken chain voids any confirmation)
  let chainIntact = true; let prev = null;
  for (const r of rows) { if ((r.previousRecordSha256 ?? null) !== (prev ?? null)) { chainIntact = false; break; } prev = r.recordSha256 ?? null; }
  const hasWriterField = rows.some((r) => typeof r.writerPid === 'number' || typeof r.origin === 'string');

  const powered = newInvariants.length >= POWER_MIN_NEW_INVARIANTS;
  return {
    frozenAt: f0.ts,
    s0Count: f0.s0Count,
    predictions: (f0.predictions ?? []).length,
    newDistinctInvariantsSinceFreeze: newInvariants.length,
    powerGate: { min: POWER_MIN_NEW_INVARIANTS, cleared: powered },
    perGenerator,
    extrapolatorBeatsBaseline,
    confirmedHits: confirmed.length,
    confirmedInvariants: confirmed,
    corpusChainIntact: chainIntact,
    independentWriterAuditable: hasWriterField,
    verdict: !powered
      ? `ABSTAIN — underpowered: only ${newInvariants.length}/${POWER_MIN_NEW_INVARIANTS} new distinct invariants since freeze. No verdict; the harness correctly refuses to score. (Honest: distinct invariants arrive glacially; this requires sustained P8 operation.)`
      : confirmed.length === 0
        ? 'NULL retained — the (baseline) generator confirmed ZERO held-out walls at adequate power. Strong-emergence claim earns NO candidate. Honest negative.'
        : !hasWriterField
          ? `UNVERIFIED — ${confirmed.length} confirmation(s) BUT corpus rows carry no writer field, so self-collusion cannot be ruled out. Not a candidate until writer attribution exists (named gap). Never declared.`
          : `CONFIRMED-CANDIDATE (for HUMAN verification only): ${confirmed.length} held-out wall(s) predicted-then-independently-confirmed at power. Re-check chain + writer independence + that the generator is genuinely extrapolative (not structural adjacency) before emergence-report F4 is allowed to surface this. NEVER a cognition claim.`,
    namedGaps: [
      'extrapolative generator now EXISTS (coverage-extrapolator-recency: predicts NEVER-FIRED gates, zero corpus support) but is UNTESTED — awaits P8 operation to accrue new distinct invariants so its confirm-rate can be compared to the structural-adjacency baseline (extrapolatorBeatsBaseline)',
      'corpus rows have no writer-pid/origin field — independent-writer confirmation is not auditable until added (gated, via expand_self), mirroring the exec-origin gap just closed',
    ],
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2];
  const repoRoot = process.argv[3] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  if (mode === 'freeze') console.log(JSON.stringify(freeze(repoRoot), null, 2));
  else if (mode === 'score') console.log(JSON.stringify(score(repoRoot), null, 2));
  else console.log('usage: node held-out-wall.mjs freeze <root> | score <root>');
}
