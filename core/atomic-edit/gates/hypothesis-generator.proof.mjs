// hypothesis-generator.proof.mjs — adversarial gate for the generative loop-closer (PART E).
// PROVES: generateHypotheses emits a candidate ONLY for a held-out-VALIDATED meta-law, and
// DISCRIMINATES — a train-only spurious correlation is REFUSED (anti-overfit), a
// self-implication is impossible, an empty corpus yields zero candidates (no fabrication),
// and a missing corpus file reads as []. NO ORACLE: the "truth" is the deterministic even/odd
// held-out split metaLaws already computes; the proof verifies LOGIC, not a memorized answer.
import { generateHypotheses, corpusToHits, readTriples, proposeFromCorpus } from '../hypothesis-generator.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

// (1) Robust law: A co-occurs with B in EVERY generation (train AND holdout) => PROPOSED.
const robust = [];
for (let g = 0; g < 8; g += 1) { robust.push({ generation: `g${g}`, invariantId: 'A' }); robust.push({ generation: `g${g}`, invariantId: 'B' }); }
let r = generateHypotheses(robust, { minSupport: 2, minConfidence: 0.8 });
check('robust A=>B is PROPOSED (held-out validated)', r.candidates.some((c) => c.antecedent === 'A' && c.consequent === 'B' && c.holdoutConfidence >= 0.8));
check('candidate carries an honest numeric held-out confidence', r.candidates.every((c) => typeof c.holdoutConfidence === 'number'));

// (2) Spurious: A=>B only in TRAIN (even gens); in HOLDOUT (odd) A appears with C, not B => REFUSED.
const spurious = [];
for (let g = 0; g < 8; g += 1) {
  spurious.push({ generation: `g${g}`, invariantId: 'A' });
  spurious.push({ generation: `g${g}`, invariantId: g % 2 === 0 ? 'B' : 'C' });
}
r = generateHypotheses(spurious, { minSupport: 2, minConfidence: 0.8 });
check('spurious train-only A=>B is REFUSED (anti-overfit)', !r.candidates.some((c) => c.antecedent === 'A' && c.consequent === 'B'));
check('the refusal is recorded honestly in rejected[]', r.rejected.length > 0);

// (3) No self-implication ever.
check('no self-implication candidate (A=>A impossible)', !r.candidates.some((c) => c.antecedent === c.consequent));

// (4) Empty corpus => zero candidates (the generator never fabricates).
r = generateHypotheses([], {});
check('empty hits -> zero candidates (no fabrication)', r.candidates.length === 0 && r.summary.proposed === 0);

// (5) corpusToHits maps repair->locus proxy, commute-couple->couple, witness->verbatim.
const hits = corpusToHits([
  { kind: 'repair', payload: { appliedSplice: { file: 'x.ts' }, redBefore: 1, redAfter: 0 } },
  { kind: 'commute', payload: { commute: false, sharedLocus: 'y.ts:1-2' } },
  { kind: 'atomic-disproof-witness-record', invariantId: 'WALL_Z', generation: 'g0' },
]);
check('corpusToHits derives repair:/couple:/verbatim invariantIds', hits.some((h) => h.invariantId === 'repair:x.ts') && hits.some((h) => h.invariantId.startsWith('couple:')) && hits.some((h) => h.invariantId === 'WALL_Z'));

// (6) Missing corpus file reads as [] (fresh checkout is a no-op, not a crash).
check('readTriples on a non-existent root -> []', Array.isArray(readTriples('/nonexistent-xyz-987')) && readTriples('/nonexistent-xyz-987').length === 0);
check('proposeFromCorpus on empty root fabricates nothing', proposeFromCorpus('/nonexistent-xyz-987', {}).candidates.length === 0);

// (7) corpusToHits reads the verdictCodes co-firing set, not just the primary invariantId.
const coHits = corpusToHits([{ kind: 'atomic-disproof-witness-record', recordSha256: 'cand1', invariantId: 'GATE_X', verdictCodes: ['GATE_X', 'GATE_Y', 'GATE_Z'] }]);
check('corpusToHits emits one hit per verdictCode under one shared generation', coHits.length === 3 && new Set(coHits.map((h) => h.generation)).size === 1 && coHits.some((h) => h.invariantId === 'GATE_Y'));

// (8)+(9) lift: candidates carry numeric lift/baseRate, and an INFORMATIVE coupling (A=>C, C
// selective) outranks a TRIVIAL high-base-rate one (A=>B, B near-universal).
const liftHits = [];
for (let g = 0; g < 8; g += 1) { liftHits.push({ generation: `g${g}`, invariantId: 'B' }); if (g < 6) { liftHits.push({ generation: `g${g}`, invariantId: 'A' }); liftHits.push({ generation: `g${g}`, invariantId: 'C' }); } }
const lr = generateHypotheses(liftHits, { minSupport: 2, minConfidence: 0.8 });
const ab = lr.candidates.find((c) => c.antecedent === 'A' && c.consequent === 'B');
const ac = lr.candidates.find((c) => c.antecedent === 'A' && c.consequent === 'C');
check('candidates carry numeric lift + consequentBaseRate', lr.candidates.every((c) => typeof c.lift === 'number' && typeof c.consequentBaseRate === 'number'));
check('lift ranks informative A=>C above trivial high-base-rate A=>B', !!ab && !!ac && ac.lift > ab.lift);

// (10) writeProposalLedger makes a proposal a durable, hash-chained, recomputable event.
{
  const fs2 = await import('node:fs');
  const os2 = await import('node:os');
  const path2 = await import('node:path');
  const { writeProposalLedger, verifyProposalLedger } = await import('../hypothesis-generator.mjs');
  const tmp = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'hypo-ledger-'));
  try {
    const rep = { corpusSize: 2, hitCount: 4, summary: { proposed: 1, informative: 1 }, candidates: [{ id: 'abc', antecedent: 'X', consequent: 'Y', lift: 3.2, holdoutConfidence: 1, support: 5, informative: true }] };
    const r1 = writeProposalLedger(tmp, rep);
    const r2 = writeProposalLedger(tmp, rep);
    check('ledger record has recordSha256 + null first previousRecordSha256', typeof r1.recordSha256 === 'string' && r1.previousRecordSha256 === null);
    check('ledger is an append-only hash chain (rec2 links to rec1)', r2.previousRecordSha256 === r1.recordSha256);
    const v = verifyProposalLedger(tmp);
    check('verifyProposalLedger re-derives the chain', v.ok === true && v.records === 2);
    fs2.appendFileSync(path2.join(tmp, '.atomic', 'hypothesis-ledger.jsonl'), JSON.stringify({ kind: 'atomic-hypothesis-proposal', schemaVersion: 1, previousRecordSha256: 'WRONG', recordSha256: 'tampered' }) + '\n');
    check('verifyProposalLedger detects a tampered/broken chain', verifyProposalLedger(tmp).ok === false);
  } finally {
    fs2.rmSync(tmp, { recursive: true, force: true });
  }
}

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'hypothesis-generator' }));
else console.log(failures === 0 ? '\nOK — hypothesis-generator proof (0 failures)' : `\nFAIL — hypothesis-generator proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
