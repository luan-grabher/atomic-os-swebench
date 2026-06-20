#!/usr/bin/env node
/**
 * psr-witness.mjs — PARADIGM N2 + PART D A-G5: Proximal-Disproof-Reinforcement (PSR) interface, and the
 * proof that atomic's witness ⊇ Nidus's UNSAT-core (strictly more recomputable information).
 *
 * A-G5 (generalize PSR): Nidus names "Proximal Spec Reinforcement" — the spec/verdict shapes the model at
 * INFERENCE time (vs RLVR at training time). atomic has disproof-as-signal as a SPECIFIC instance; this
 * module lifts it into a GENERAL interface `psrFeedback(witness, mode)` so the disproof shape that feeds
 * generation is a first-class, swappable object — and proves atomic's shape is a strict REFINEMENT, not a
 * re-implementation.
 *
 * N2 (the differentiator vs Nidus): Nidus PSR returns the UNSAT-core (WHICH obligation broke). atomic returns
 * a RECOMPUTABLE BYTE-LEVEL witness (the counterexample over the actual rejected bytes, digest-bound). The
 * witness CONTAINS the core (the core is a projection of the witness) AND carries strictly more: the removed
 * region + per-fact digests that the core alone cannot reconstruct. So atomic's PSR ⊇ Nidus's PSR.
 *
 * Pure: in-memory; no spawn, no Date.now/random.
 */
import { createHash } from 'node:crypto';

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

/** Nidus PSR form — the UNSAT-core: the SET of obligations whose conjunction is unsatisfiable. */
export function unsatCore(witness) {
  const facts = witness?.counterexample?.failedProofFacts ?? [];
  return { obligationIds: [...new Set(facts.map((f) => String(f.command)))].sort() };
}

/** atomic PSR form — the recomputable byte-level witness (a strict superset of the core). */
export function witnessInformation(witness) {
  const core = unsatCore(witness);
  const facts = witness?.counterexample?.failedProofFacts ?? [];
  return {
    obligationIds: core.obligationIds,                                   // ⊇ the core (the projection)
    removedRegion: typeof witness?.removedRegion === 'string' ? witness.removedRegion : null, // the ACTUAL rejected bytes
    factDigests: facts.map((f) => ({ command: String(f.command), stdoutSha256: String(f.stdoutSha256 ?? ''), stderrSha256: String(f.stderrSha256 ?? '') })),
    kind: witness?.kind ?? null,                                          // 'duplicate' | 'gate-red'
    recomputed: witness?.recomputed === true,
  };
}

/** Recompute a digest over bytes — the recomputability the bare core lacks. */
export function recomputeFactDigest(bytes) { return sha256(bytes); }

/**
 * The general PSR feedback package that feeds generation.
 * @param {object} witness
 * @param {'core'|'witness'} mode  'core' = Nidus UNSAT-core form; 'witness' = atomic recomputable-witness form.
 */
export function psrFeedback(witness, mode = 'witness') {
  if (mode === 'core') return { kind: 'obligation-id', payload: unsatCore(witness) };
  return { kind: 'recomputable-witness', payload: witnessInformation(witness) };
}

/** Is feedback A a (non-strict) refinement of feedback B — i.e. A carries ⊇ the information of B? */
export function refines(a, b) {
  // both must agree on the obligation ids (A keeps the core); A may add the byte-level layer.
  const aCore = a.payload.obligationIds ?? [];
  const bCore = b.payload.obligationIds ?? [];
  const sameCore = aCore.length === bCore.length && aCore.every((x, i) => x === bCore[i]);
  const aHasBytes = a.kind === 'recomputable-witness' && (a.payload.removedRegion !== null || (a.payload.factDigests?.length ?? 0) > 0);
  const bHasBytes = b.kind === 'recomputable-witness' && (b.payload.removedRegion !== null || (b.payload.factDigests?.length ?? 0) > 0);
  return sameCore && (aHasBytes || !bHasBytes);
}

/**
 * Ablation — repair-localization power. The byte-level witness localizes the fix to the actual region; the
 * obligation-id core can only point at WHICH gate, so its search is the whole file. Returns the size of the
 * region a repair must search given the feedback (smaller = more localizing = strictly more useful signal).
 */
export function repairSearchSize(feedback, fileLength) {
  if (feedback.kind === 'obligation-id') return fileLength;
  const region = feedback.payload.removedRegion;
  return typeof region === 'string' ? region.length : fileLength;
}
