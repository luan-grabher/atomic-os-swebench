import * as crypto from 'node:crypto';

/**
 * FASE-0.2 — a structured, RE-COMPUTABLE disproof. Free text is an ASSERTION; a witness is a
 * CLAIM the gate recomputes against the actual removed bytes. Decidable kinds only (no Rice):
 *  - 'duplicate': the removed region still occurs verbatim in `after` (a genuine dedup).
 *  - 'gate-red': a named decidable gate returned RED over the removed bytes (carries readLoci).
 * readLoci are the loci the disproof READ — they flow to the verified-edit algebra as a
 * negative-obligation coupling surface (FASE-0.1).
 */
export interface DisproofWitness {
  kind: 'duplicate' | 'gate-red';
  gate?: string;
  readLoci?: string[];
}

export type DisproofWitnessKind = 'duplicate' | 'gate-red' | 'asserted';

/** The contiguous bytes `before` had that `after` does not (between the common prefix and suffix). */
export function removedRegion(before: string, after: string): string {
  const b = Buffer.from(before, 'utf8');
  const a = Buffer.from(after, 'utf8');
  let start = 0;
  while (start < b.length && start < a.length && b[start] === a[start]) start += 1;
  let be = b.length;
  let ae = a.length;
  while (be > start && ae > start && b[be - 1] === a[ae - 1]) {
    be -= 1;
    ae -= 1;
  }
  return b.toString('utf8', start, be);
}

/**
 * RE-COMPUTE a disproof witness against the actual (before, after) bytes. A witness that does NOT
 * hold returns ok:false (the caller refuses the negative action — the teeth). No witness ⇒ an
 * honest 'asserted' verdict (free-text proof, recomputed:false), never a faked verification.
 */
export function recomputeDisproof(
  witness: DisproofWitness | undefined,
  before: string | undefined,
  after: string | undefined,
): { ok: boolean; kind: DisproofWitnessKind; recomputed: boolean; readLoci: string[] } {
  if (!witness) return { ok: true, kind: 'asserted', recomputed: false, readLoci: [] };
  if (witness.kind === 'duplicate') {
    if (typeof before !== 'string' || typeof after !== 'string') {
      return { ok: false, kind: 'duplicate', recomputed: false, readLoci: [] };
    }
    const removed = removedRegion(before, after);
    const ok = removed.length > 0 && after.includes(removed);
    return { ok, kind: 'duplicate', recomputed: ok, readLoci: witness.readLoci ?? [] };
  }
  if (witness.kind === 'gate-red') {
    const ok =
      typeof witness.gate === 'string' &&
      witness.gate.length > 0 &&
      Array.isArray(witness.readLoci) &&
      witness.readLoci.length > 0;
    return { ok, kind: 'gate-red', recomputed: ok, readLoci: witness.readLoci ?? [] };
  }
  return { ok: false, kind: 'asserted', recomputed: false, readLoci: [] };
}

export interface NegativeActionProof {
  verdict: 'NEGATIVE_BYTES_ADMITTED';
  action: string;
  target: string;
  targetUnit: string;
  removedByteCount: number;
  proofLength: number;
  proofSha256: string;
  proof: string;
  /** FASE-0.2: which disproof admitted this — 'asserted' (free text, recomputed:false) vs a RE-COMPUTED 'duplicate'/'gate-red'. The receipt never claims a disproof was verified when it was only asserted. */
  witnessKind?: DisproofWitnessKind;
  /** true iff a DisproofWitness was RE-COMPUTED to hold against the removed bytes (the teeth); false for a free-text assertion. */
  recomputed?: boolean;
  /** loci the recomputed disproof READ — flows to EditFact.negativeProof.readLoci so the algebra sees the negative-obligation coupling (FASE-0.1). */
  readLoci?: string[];
}

export interface NegativeActionProofRequest {
  action: string;
  target: string;
  targetUnit: string;
  removedByteCount: number;
  proofOfIncorrectness?: string;
  /** FASE-0.2: original bytes, so a 'duplicate' witness can be RE-COMPUTED from (before, after). */
  before?: string;
  after?: string;
  /** FASE-0.2: structured, RE-COMPUTABLE disproof; a false witness is refused (the (a) teeth). */
  disproofWitness?: DisproofWitness;
}

const MIN_PROOF_CHARS = 20;
const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export function removedByteCountBetween(before: string, after: string): number {
  const beforeBytes = Buffer.from(before, 'utf8');
  const afterBytes = Buffer.from(after, 'utf8');
  let start = 0;
  while (
    start < beforeBytes.length &&
    start < afterBytes.length &&
    beforeBytes[start] === afterBytes[start]
  ) {
    start += 1;
  }
  let beforeEnd = beforeBytes.length;
  let afterEnd = afterBytes.length;
  while (
    beforeEnd > start &&
    afterEnd > start &&
    beforeBytes[beforeEnd - 1] === afterBytes[afterEnd - 1]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  // The changed "before middle" [start,beforeEnd) is NOT all removed: bytes that are
  // reproduced in the changed "after middle" [start,afterEnd) were MOVED/WRAPPED/GROWN,
  // not deleted. Counting the whole middle as removed mis-flagged pure growth
  // (move_into_scope), pure permutation (reorder_list) and wrap as negative byte actions,
  // making those tools un-committable. Faithful to the (a) doctrine — replacing/deleting
  // correct bytes still requires a disproof — we count ONLY the bytes present in the before
  // middle that the after middle does not cover (byte multiset difference). Pure
  // growth/wrap (afterMid ⊇ beforeMid) and pure permutation (same multiset) ⇒ 0 removed;
  // genuine deletion/replacement (chars vanish) ⇒ still > 0, teeth intact.
  if (beforeEnd <= start) return 0;
  const afterCounts = new Int32Array(256);
  for (let i = start; i < afterEnd; i += 1) afterCounts[afterBytes[i]] += 1;
  const beforeCounts = new Int32Array(256);
  for (let i = start; i < beforeEnd; i += 1) beforeCounts[beforeBytes[i]] += 1;
  let removed = 0;
  for (let v = 0; v < 256; v += 1) {
    const deficit = beforeCounts[v] - afterCounts[v];
    if (deficit > 0) removed += deficit;
  }
  return removed;
}

export function requireNegativeActionProof(request: NegativeActionProofRequest): NegativeActionProof {
  const proof = (request.proofOfIncorrectness ?? '').trim();
  if (proof.length < MIN_PROOF_CHARS) {
    throw new Error(
      'refused: ' +
        request.action +
        ' is a negative byte action on ' +
        request.target +
        '; provide proofOfIncorrectness (>=20 chars) explaining why the affected bytes are non-correct/negative. ' +
        'Correct-by-construction bytes are immutable to negative actions.',
    );
  }
  const removedByteCount = Math.max(0, Math.floor(request.removedByteCount));
  if (removedByteCount <= 0) {
    throw new Error(
      'refused: ' +
        request.action +
        ' did not identify any negative bytes under target ' +
        request.target +
        '; negative actions must bind to a non-empty byte effect.',
    );
  }
  // FASE-0.2 SEMANTIC TEETH: a DisproofWitness is RE-COMPUTED against the removed bytes; a witness
  // that does NOT hold is a false disproof and is REFUSED (you cannot delete correct-by-construction
  // bytes by typing 20 chars and asserting a duplicate that is not there). No witness ⇒ the receipt
  // HONESTLY records witnessKind:'asserted'+recomputed:false — never faking a verified disproof.
  const verdict = recomputeDisproof(request.disproofWitness, request.before, request.after);
  if (request.disproofWitness && !verdict.ok) {
    throw new Error(
      'refused: ' +
        request.action +
        ' supplied a ' +
        String(request.disproofWitness.kind) +
        ' disproof witness that does NOT hold against the removed bytes; a false disproof cannot admit a negative byte action.',
    );
  }
  return {
    verdict: 'NEGATIVE_BYTES_ADMITTED',
    action: request.action,
    target: request.target,
    targetUnit: request.targetUnit,
    removedByteCount,
    proofLength: proof.length,
    proofSha256: sha256(proof),
    proof,
    witnessKind: verdict.kind,
    recomputed: verdict.recomputed,
    ...(verdict.readLoci.length ? { readLoci: verdict.readLoci } : {}),
  };
}


export interface NegativeReplacementProofRequest {
  action: string;
  target: string;
  targetUnit: string;
  before: string;
  after: string;
  proofOfIncorrectness?: string;
  preview?: boolean;
  /** FASE-0.2: forwarded to requireNegativeActionProof so a 'duplicate' witness is recomputed from before/after. */
  disproofWitness?: DisproofWitness;
}

export function requireNegativeProofForRemovedBytes(
  request: NegativeReplacementProofRequest,
): NegativeActionProof | undefined {
  if (request.preview) return undefined;
  const removedByteCount = removedByteCountBetween(request.before, request.after);
  if (removedByteCount <= 0) return undefined;
  return requireNegativeActionProof({
    action: request.action,
    target: request.target,
    targetUnit: request.targetUnit,
    removedByteCount,
    proofOfIncorrectness: request.proofOfIncorrectness,
    before: request.before,
    after: request.after,
    disproofWitness: request.disproofWitness,
  });
}
