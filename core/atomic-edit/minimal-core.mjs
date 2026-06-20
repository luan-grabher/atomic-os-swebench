#!/usr/bin/env node
/**
 * minimal-core.mjs — PARADIGM PART D A-G3 + E2: the MINIMAL recomputable disproof.
 *
 * A-G3 (absorb Nidus's minimal-UNSAT-core): on a multi-red verdict, delta-debug over the enforced obligation
 * set to compute the MINIMAL failing subset — "which link in the chain actually broke", not every red.
 * E2 (the emergent fusion): stamp that minimal core INTO atomic's recomputable byte-level witness ⇒ a
 * MINIMAL RECOMPUTABLE COUNTEREXAMPLE — both FINER than Nidus's core (delta-debugged to 1-minimal) AND
 * RICHER than it (the actual rejected bytes + per-fact digests). Neither atomic-alone (no minimization) nor
 * Nidus-alone (no byte-level recomputable witness) has this.
 *
 * Pure: in-memory; the oracle is injected by the caller. No spawn, no Date.now/random.
 */

/**
 * Delta-debug an obligation set to a 1-MINIMAL failing subset: a subset that still fails, but removing ANY
 * single element makes it pass. Sound (the returned subset genuinely fails) by construction.
 * @param {string[]} obligations
 * @param {(subset:string[])=>boolean} fails  oracle: does the conjunction of `subset` still fail/red?
 * @returns {string[]}  a 1-minimal failing subset (empty if the full set does not fail)
 */
export function minimalFailingCore(obligations, fails) {
  if (!fails(obligations)) return [];
  let core = [...obligations];
  let changed = true;
  while (changed) {
    changed = false;
    for (const o of [...core]) {
      const reduced = core.filter((x) => x !== o);
      if (reduced.length > 0 && fails(reduced)) { core = reduced; changed = true; }
    }
  }
  return core;
}

/**
 * E2: build the MINIMAL RECOMPUTABLE counterexample — atomic's byte-level witness stamped with the
 * delta-debugged minimal core. Finer (minimal) AND richer (byte-level) than an UNSAT-core.
 * @param {object} witness    the recomputable byte-level witness (removedRegion + counterexample facts)
 * @param {string[]} obligations  the full red obligation set
 * @param {(subset:string[])=>boolean} fails  the oracle over obligation subsets
 */
export function minimalRecomputableDisproof(witness, obligations, fails) {
  const core = minimalFailingCore(obligations, fails);
  return {
    ...witness,
    core,                                   // the 1-minimal failing subset (the A-G3 addition)
    coreIsMinimal: true,
    fullObligationCount: obligations.length,
    // the byte-level layer is inherited from `witness` (removedRegion + counterexample), so this object is
    // simultaneously minimal (core ⊆ obligations, 1-minimal) and recomputable (the witness facts).
  };
}
