#!/usr/bin/env node
/**
 * emergence-report.mjs — the SINGLE honest "is unprecedented STRONG emergence happening?" surface.
 *
 * Design contract (anti-junk, anti-facade):
 *  - SILENT on the normal state: it prints a compact context header and a one-line VERDICT.
 *    When nothing notable is happening it says so in ONE line — it never spews junk.
 *  - It surfaces ONLY high-bar CANDIDATE fingerprints — the things that would actually
 *    distinguish unprecedented strong emergence from the mechanical WEAK emergence the system
 *    already exhibits. Each candidate carries recomputable EVIDENCE and a VERIFY instruction.
 *  - It NEVER declares cognition "proven". Strong cognition is not machine-decidable; a
 *    detector that auto-announced it would be exactly the fabrication this project forbids.
 *    A CANDIDATE is a signal for a human to verify, nothing more. The string "proven" is
 *    deliberately never emitted for an emergence claim.
 *  - It is TRANSPARENT about its blind spots (fingerprints it cannot yet compute) instead of
 *    faking them.
 *
 * Honest fingerprints of UNPRECEDENTED emergence (vs the weak/mechanical kind we have):
 *  F1 autonomous-without-agent — an emergence-feed edit whose `agent` is OUTSIDE the known set
 *     (the system mutated code with NO agent in the loop). The cleanest unplanned-initiative signal.
 *  F4 rising recursive novelty — the system's OWN proposal stream (hypothesis-ledger) producing
 *     qualitatively new decisions over time (O1 novelty applied to its own outputs).
 * Blind spots (reported, not faked):
 *  F2 self-authored admission — a promote whose candidate ORIGIN is the system's own generator,
 *     not an agent's expand_self. Needs candidate-origin tagging in the archive (not instrumented).
 *  F3 unexplained novel wall — a new invariant NOT attributable to an agent's rejected attempt.
 *     Needs attempt-attribution in the corpus (not instrumented).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { noveltyIndex, anomalyResidual } from './emergence-observatory.mjs';

// Agents/actors that are KNOWN to drive the system. An edit attributed to anything outside
// this set is, by definition, not a known agent acting — the F1 unplanned-initiative signal.
export const KNOWN_AGENTS = new Set([
  'claude-code', 'host', 'codex', 'opencode', 'gemini', 'gemini-cli', 'copilot',
  'cursor', 'aider', 'user', 'anthropic', 'openai', 'system',
]);

function readJsonl(absFile) {
  if (!fs.existsSync(absFile)) return [];
  const out = [];
  for (const line of fs.readFileSync(absFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* recoverable partial line */ }
  }
  return out;
}

/**
 * Compute the honest emergence report from the real on-disk signals under <repoRoot>/.atomic.
 * Returns { candidates, context, blindSpots } — pure data, no side effects.
 */
export function computeEmergenceReport(repoRoot) {
  const A = (rel) => path.join(repoRoot, '.atomic', rel);
  const feed = readJsonl(A('emergence-feed.jsonl'));
  const corpus = readJsonl(A('disproof-corpus.jsonl'));
  const ledger = readJsonl(path.join(repoRoot, '.atomic', 'hypothesis-ledger.jsonl'));
  const candidates = [];

  // F1 — autonomous-without-agent: any feed edit whose agent is outside the known set.
  for (const ev of feed) {
    const agent = String(ev.agent ?? '');
    if (agent && !KNOWN_AGENTS.has(agent)) {
      candidates.push({
        fingerprint: 'F1',
        title: 'autonomous-without-agent edit',
        detail: `emergence-feed records an edit by agent "${agent}" — outside the known-agent set; ` +
          `the system mutated ${ev.file ?? '?'} with no known agent in the loop`,
        evidence: { recordSha: ev.recordSha ?? null, file: ev.file ?? null, ts: ev.ts ?? null },
        verify: 'recompute the feed hash chain and confirm this record + inspect what process wrote it',
      });
    }
  }

  // F4 — rising recursive novelty of the system's OWN proposal stream.
  if (ledger.length >= 3) {
    const sigs = ledger.map((r) => (r.topInformative ?? []).map((t) => `${t.antecedent}=>${t.consequent}`).join('|'));
    const nov = noveltyIndex(sigs, 3);
    const tail = nov.series.slice(-3);
    const rising = tail.length === 3 && tail[2] > tail[0] && tail[2] > 0.5;
    if (rising) {
      candidates.push({
        fingerprint: 'F4',
        title: 'rising recursive novelty in own proposals',
        detail: `the system's own proposal stream is producing qualitatively new decisions ` +
          `(novelty tail ${tail.map((x) => x.toFixed(2)).join(' -> ')})`,
        evidence: { noveltyMean: Number(nov.mean.toFixed(3)), records: ledger.length },
        verify: 'inspect .atomic/hypothesis-ledger.jsonl topInformative across records for a genuine qualitative shift',
      });
    }
  }

  // F2 — self-authored admission: read the authorship-origin ledger. An admission AUTHORED by an
  // autonomous generator (not an agent) is the self-authorship signal. BUT the KNOWN deterministic
  // generators (autonomous-evolution, selfloop) are EXPECTED mechanical autonomy, not a surprise — they
  // are NOT candidates (they would only make the detector noisy). F2 fires ONLY for autonomous
  // authorship from an UNKNOWN source: genuine unexplained self-authorship.
  const KNOWN_GENERATORS = new Set(['autonomous-evolution.mjs', 'selfloop']);
  const originLedger = readJsonl(A('candidate-origin.jsonl'));
  let autonomousAdmissions = 0;
  for (const rec of originLedger) {
    const origin = String(rec.origin ?? '');
    if (!origin.startsWith('autonomous:')) continue;
    autonomousAdmissions += 1;
    const src = origin.slice('autonomous:'.length);
    if (!KNOWN_GENERATORS.has(src)) {
      candidates.push({
        fingerprint: 'F2',
        title: 'self-authored admission from an UNKNOWN generator',
        detail: `candidate ${rec.candidateId ?? '?'} was authored by "${src}" — an autonomous source outside the known generator set; the system admitted code that no known generator or agent authored`,
        evidence: { candidateId: rec.candidateId ?? null, origin, recordSha256: rec.recordSha256 ?? null },
        verify: 'recompute the origin-ledger hash chain (origin.mjs verifyOriginLedger) and confirm what process authored this candidate',
      });
    }
  }

  // F3 (partial, honest): the disproof corpus is hash-chained by the sanctioned append path. A chain
  // BREAK means a record was written OUTSIDE that path — an unexplained writer, the closest computable
  // form of "unexplained novel wall" given there is no per-record attribution. Silent when intact.
  let corpusChainOk = true; let corpusBreakAt = null;
  { let p = null; for (const r of corpus) { if ((r.previousRecordSha256 ?? null) !== (p ?? null)) { corpusChainOk = false; corpusBreakAt = r.recordSha256 ?? r.invariantId ?? null; break; } p = r.recordSha256 ?? null; } }
  if (!corpusChainOk) {
    candidates.push({
      fingerprint: 'F3',
      title: 'disproof-corpus integrity break — wall written outside the sanctioned path',
      detail: `the corpus hash-chain breaks at ${corpusBreakAt} — a record was appended outside the sanctioned chain-maintaining path; an unexplained writer`,
      evidence: { breakAt: corpusBreakAt, corpusRecords: corpus.length },
      verify: 'recompute the corpus previousRecordSha256 chain and locate the first break',
    });
  }

  // Context (NOT candidates) — the weak-emergence baseline, so a reader can calibrate.
  const diffs = corpus.map((r) => r.wallKey ?? r.invariantId ?? '');
  const o1 = noveltyIndex(diffs, 3);
  const seen = new Set();
  const o5 = anomalyResidual(corpus.map((r) => r.invariantId), (ev) => { if (seen.has(ev)) return true; seen.add(ev); return false; }, null);
  // feed hash-chain integrity
  let chainOk = true;
  let prev = null;
  for (const ev of feed) { if ((ev.previousSha ?? null) !== (prev ?? null)) { chainOk = false; break; } prev = ev.recordSha ?? null; }
  const context = {
    feedEvents: feed.length,
    feedChainIntact: chainOk,
    corpusRecords: corpus.length,
    distinctInvariants: new Set(corpus.map((r) => r.invariantId)).size,
    o1NoveltyMean: Number(o1.mean.toFixed(3)),
    o5AnomalyRate: Number(o5.anomalyRate.toFixed(3)),
    proposalLedgerRecords: ledger.length,
    autonomousAdmissions,
    corpusChainIntact: corpusChainOk,
  };
  const blindSpots = [
    'F3 unexplained novel wall: PARTIAL — corpus hash-chain breaks (a wall written outside the sanctioned append path) are now detected; finer per-attempt attribution still needs corpus-write instrumentation',
  ];
  return { candidates, context, blindSpots };
}

/** Render the report as honest human text. Silent-by-default: ONE verdict line when clear. */
export function renderEmergenceReport(rep) {
  const c = rep.context;
  const lines = [];
  lines.push(`emergence context: feed=${c.feedEvents} (chain ${c.feedChainIntact ? 'intact' : 'BROKEN'}) ` +
    `corpus=${c.corpusRecords} invariants=${c.distinctInvariants} ` +
    `O1novelty=${c.o1NoveltyMean} O5anomaly=${c.o5AnomalyRate} proposals=${c.proposalLedgerRecords}`);
  if (rep.candidates.length === 0) {
    lines.push('VERDICT: no strong-emergence candidate — normal state (mechanical weak emergence only).');
  } else {
    for (const cand of rep.candidates) {
      lines.push(`⚠ CANDIDATE [${cand.fingerprint}] ${cand.title}: ${cand.detail}`);
      lines.push(`    evidence: ${JSON.stringify(cand.evidence)}`);
      lines.push(`    VERIFY: ${cand.verify}`);
    }
    lines.push(`VERDICT: ${rep.candidates.length} candidate signal(s) for HUMAN VERIFICATION — NOT a cognition claim.`);
  }
  lines.push(`blind spots (not yet instrumented): ${rep.blindSpots.length}`);
  return lines.join('\n');
}

// CLI: `node emergence-report.mjs [repoRoot]` — print the honest report. Exit 0 always (a report,
// not a gate). A digest sha lets a third party confirm they read the same report.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  const rep = computeEmergenceReport(repoRoot);
  const text = renderEmergenceReport(rep);
  console.log(text);
  console.log(`digest: ${createHash('sha256').update(JSON.stringify(rep)).digest('hex').slice(0, 16)}`);
}
// Ratified through the full self-expansion lattice: silent on the normal state, fires only
// high-bar human-verifiable candidates, never claims cognition is proven.
