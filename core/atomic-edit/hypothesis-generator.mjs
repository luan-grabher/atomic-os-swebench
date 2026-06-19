#!/usr/bin/env node
/**
 * hypothesis-generator.mjs — PARADIGM PART E: the generative loop-closer.
 *
 * Atomic, as shipped, only VERIFIES edits (inward) and JUDGES interference (lateral).
 * The diagnosed missing piece is a GENERATOR: a component that, from the system's OWN
 * accumulated disproof corpus, PROPOSES candidate gate rules — closing the loop from
 * "react to walls" to "anticipate walls". This module is that generator, and it is
 * deliberately THIN and HONEST:
 *
 *   - It reuses the observatory's O4 metaLaws, which ALREADY mines "wall X => wall Y"
 *     implications WITH out-of-sample held-out validation. We do not re-derive that;
 *     we consume only its `validated === true` laws (the held-out split confirmed them).
 *   - A candidate rule is therefore never a fitted-to-noise artifact: its strength IS
 *     its held-out confidence, computed by the same deterministic even/odd split, with
 *     NO model, NO RNG, and NO human label anywhere in the path (same discipline as the
 *     corpus reward in gates/corpus.ts).
 *   - It PROPOSES; it never ADMITS. Admission into the ratchet remains the existing
 *     admitRule discipline. The output is a proposal list + an explicit rejection list,
 *     so the record shows what was tried AND refused, never an optimistic guess.
 *
 * AUTONOMY. Run directly (`node hypothesis-generator.mjs [repoRoot]`) with NO agent in
 * the loop: the script reads the real corpus and emits proposals to stdout. A scheduler
 * can invoke it unattended — the proposals are then events Atomic produced on its own.
 *
 * HONEST CEILING. A generated candidate predicts a CO-OCCURRENCE the corpus already
 * exhibits and held-out-confirms; it does NOT prove the rule is the RIGHT rule, only that
 * the corpus would have flagged the consequent wall whenever the antecedent fired, out of
 * sample. It is as honest — and as blind — as the corpus it mines (UNJUDGED reds never
 * entered the corpus, so they never enter a candidate). It is a HYPOTHESIS, named as such.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { metaLaws } from './emergence-observatory.mjs';

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

/** Repo-relative repair/commute corpus (mirrors gates/corpus.ts CORPUS_REL). */
export const CORPUS_REL = '.atomic/corpus/triples.jsonl';
/** Repo-relative disproof witness corpus (mirrors server-tools-self.ts). */
export const DISPROOF_CORPUS_REL = '.atomic/disproof-corpus.jsonl';

/** Read a JSONL file into parsed objects. [] if missing; blank/partial lines skipped. */
function readJsonl(absFile) {
  if (!fs.existsSync(absFile)) return [];
  const out = [];
  for (const line of fs.readFileSync(absFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* recoverable partial last line */ }
  }
  return out;
}

export function readTriples(repoRoot) { return readJsonl(path.join(repoRoot, CORPUS_REL)); }
export function readWitnesses(repoRoot) { return readJsonl(path.join(repoRoot, DISPROOF_CORPUS_REL)); }

/**
 * Map corpus records into the O4 `hits` shape {generation, invariantId}. A "generation"
 * groups walls that were live together; we use the most specific stable key present
 * (explicit generation, else session, else a deterministic batch by emission order).
 * invariantId is the wall identity: verbatim for a disproof witness record; a locus proxy
 * (`repair:<file>`) for a repair triple (the triple carries no invariantId, only a splice);
 * `couple:<sharedLocus>` for a non-commuting pair. We never INVENT an invariantId the
 * corpus did not record.
 */
export function corpusToHits(records, batchSize = 4) {
  const hits = [];
  let i = 0;
  for (const r of records) {
    i += 1;
    // The generation groups walls that were live together. For a disproof witness record
    // the natural unit is the ONE self-expansion candidate (uniquely keyed by recordSha256
    // / proposalDigest), and the co-occurring walls are ALL the gates that rejected it
    // (verdictCodes) — NOT just the primary invariantId. Reading only invariantId discards
    // the corpus's own co-firing evidence and starves the meta-law miner.
    const gen = r.recordSha256 ?? r.proposalDigest ?? r.generation ?? r.payload?.generation ??
      r.session ?? r.sessionId ?? `batch:${Math.floor((i - 1) / batchSize)}`;
    const walls = [];
    if (Array.isArray(r.verdictCodes) && r.verdictCodes.length) walls.push(...r.verdictCodes);
    else if (r.invariantId) walls.push(r.invariantId);
    else if (r.kind === 'repair') walls.push(`repair:${r.payload?.appliedSplice?.file ?? '?'}`);
    else if (r.kind === 'commute' && r.payload?.commute === false) walls.push(`couple:${r.payload?.sharedLocus ?? '?'}`);
    for (const w of walls) if (w) hits.push({ generation: String(gen), invariantId: String(w) });
  }
  return hits;
}

/**
 * The generator. Given O4-shaped hits, produce candidate gate rules from ONLY the
 * held-out-validated meta-laws. Each candidate is a PROPOSAL, ranked by its honest
 * held-out confidence. Returns {candidates, rejected, summary}.
 */
export function generateHypotheses(hits, opts = {}) {
  const minSupport = opts.minSupport ?? 2;
  const minConfidence = opts.minConfidence ?? 0.8;
  const minLift = opts.minLift ?? 1.1;
  // Base rate of each invariant = fraction of generations it appears in. lift =
  // confidence / baseRate(consequent): lift ~ 1 means the consequent is simply COMMON
  // (a near-universal wall like proofCoverage.regression) so the law, while true, is
  // UNINFORMATIVE; lift > 1 is a genuine, non-trivial coupling. Without lift a generator
  // brags about thousands of trivially-true rules — the honest signal is lift, not count.
  const byGen = new Map();
  for (const h of hits) {
    const g = String(h.generation);
    if (!byGen.has(g)) byGen.set(g, new Set());
    byGen.get(g).add(h.invariantId);
  }
  const totalGens = byGen.size;
  const genFreq = new Map();
  for (const set of byGen.values()) for (const inv of set) genFreq.set(inv, (genFreq.get(inv) ?? 0) + 1);
  const baseRate = (inv) => (totalGens ? (genFreq.get(inv) ?? 0) / totalGens : 0);
  const { laws, trainGens, holdoutGens } = metaLaws(hits, { minSupport, minConfidence });
  const candidates = [];
  const rejected = [];
  for (const law of laws) {
    const cBase = baseRate(law.consequent);
    const lift = cBase > 0 ? law.confidence / cBase : null;
    const base = {
      antecedent: law.antecedent,
      consequent: law.consequent,
      support: law.support,
      confidence: law.confidence,
      holdoutConfidence: law.holdoutConfidence,
      consequentBaseRate: cBase,
      lift,
      informative: lift !== null && lift >= minLift,
    };
    if (law.validated) {
      candidates.push({
        id: sha256(`${law.antecedent}=>${law.consequent}`).slice(0, 16),
        kind: 'candidate-gate-rule',
        ...base,
        proposedGate:
          `when invariant "${law.antecedent}" is implicated by a write, ALSO require the ` +
          `"${law.consequent}" check (held-out confidence ${Number(law.holdoutConfidence).toFixed(3)}, ` +
          `lift ${lift === null ? 'n/a' : lift.toFixed(2)})`,
      });
    } else {
      rejected.push({
        ...base,
        reason: law.holdoutConfidence === null
          ? 'antecedent absent from held-out split'
          : `held-out confidence ${Number(law.holdoutConfidence).toFixed(3)} < ${minConfidence}`,
      });
    }
  }
  candidates.sort((a, b) => (Number(b.lift ?? 0) - Number(a.lift ?? 0)) || (b.holdoutConfidence - a.holdoutConfidence) || (b.confidence - a.confidence));
  return { candidates, rejected, summary: { trainGens, holdoutGens, lawsMined: laws.length, proposed: candidates.length, refused: rejected.length, informative: candidates.filter((c) => c.informative).length } };
}

/** Read the REAL corpus and propose. No corpus => zero candidates (never fabricates). */
export function proposeFromCorpus(repoRoot, opts = {}) {
  const records = [...readWitnesses(repoRoot), ...readTriples(repoRoot)];
  const hits = corpusToHits(records, opts.batchSize);
  const r = generateHypotheses(hits, opts);
  return { corpusSize: records.length, hitCount: hits.length, ...r };
}

/** Repo-relative own ledger of autonomous proposals (distinct from the lesson consumer). */
export const LEDGER_REL = '.atomic/hypothesis-ledger.jsonl';

/** Canonical JSON (recursively sorted keys) — deterministic, for the ledger hash chain. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

/**
 * Append the proposal report as ONE hash-chained, append-only ledger record under
 * <repoRoot>/.atomic/hypothesis-ledger.jsonl. This makes an autonomous proposal a DURABLE,
 * RECOMPUTABLE event: the body carries no wall-clock (it is keyed by corpus size/hits +
 * the informative candidate set), recordSha256 = sha256(canonical(body)) chains to the prior
 * record via previousRecordSha256, and verifyProposalLedger re-derives the whole chain.
 */
export function writeProposalLedger(repoRoot, report) {
  const file = path.join(repoRoot, LEDGER_REL);
  const prior = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];
  const previousRecordSha256 = prior.length ? prior[prior.length - 1].recordSha256 : null;
  const topInformative = (report.candidates ?? []).filter((c) => c.informative).slice(0, 16)
    .map((c) => ({ id: c.id, antecedent: c.antecedent, consequent: c.consequent, lift: c.lift, holdoutConfidence: c.holdoutConfidence, support: c.support }));
  const body = {
    kind: 'atomic-hypothesis-proposal',
    schemaVersion: 1,
    corpusSize: report.corpusSize ?? 0,
    hitCount: report.hitCount ?? 0,
    summary: report.summary ?? {},
    topInformative,
    previousRecordSha256,
  };
  const record = { ...body, recordSha256: sha256(canonical(body)) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

/** Re-derive the ledger hash chain (tamper-evidence + third-party recomputability). */
export function verifyProposalLedger(repoRoot) {
  const file = path.join(repoRoot, LEDGER_REL);
  if (!fs.existsSync(file)) return { ok: true, records: 0, headSha: null };
  const records = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let prev = null;
  for (const rec of records) {
    if ((rec.previousRecordSha256 ?? null) !== (prev ?? null)) return { ok: false, error: 'previousRecordSha256 break', at: rec.recordSha256 };
    const { recordSha256, ...body } = rec;
    if (sha256(canonical(body)) !== recordSha256) return { ok: false, error: 'recordSha256 mismatch', at: recordSha256 };
    prev = recordSha256;
  }
  return { ok: true, records: records.length, headSha: prev };
}

// CLI: `node hypothesis-generator.mjs [repoRoot] [--ledger]` — an autonomous proposal pass
// over the real corpus, no agent in the loop. Prints the JSON report to stdout; with
// --ledger it ALSO appends the proposal as a durable hash-chained ledger record, so the act
// of proposing is recomputable evidence rather than ephemeral output.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const repoRoot = argv.find((a) => !a.startsWith('--')) || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  const report = proposeFromCorpus(repoRoot, {});
  if (argv.includes('--ledger')) report.ledgerRecord = writeProposalLedger(repoRoot, report);
  console.log(JSON.stringify(report, null, 2));
}
