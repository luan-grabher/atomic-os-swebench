#!/usr/bin/env node
/**
 * record-completeness.mjs — PARADIGM PART D A-G7: the Engineering Record Completeness theorem.
 *
 * Nidus names "Engineering Record Completeness" — the audit trail is provably complete. atomic has
 * chain-hashed traces (.atomic/traces: chainHash + parentSha256) and a brain-spine audit pattern, but no
 * COMPLETENESS theorem. This generalizes "every capability ⇒ a spine event" to the load-bearing form:
 *
 *   THEOREM (record completeness): every PERSISTED write ⇒ a chain-verified trace, with NO gap.
 *   = COMPLETE (no write without a trace)  ∧  CHAIN-INTACT (the trace chain links gap-free).
 *
 * Pure: in-memory; no spawn, no Date.now/random.
 */

/**
 * COMPLETE — every persisted write has a trace whose afterSha256 matches. Returns the writes with NO trace.
 * @param {Array<{writeId:any, afterSha256:string}>} writes
 * @param {Array<{operationId:any, afterSha256:string}>} traces
 */
export function missingTraces(writes, traces) {
  const traced = new Set(traces.map((t) => t.afterSha256));
  return writes.filter((w) => !traced.has(w.afterSha256)).map((w) => w.writeId);
}

/**
 * CHAIN-INTACT — the ordered trace chain links gap-free: each trace's parentSha256 == the previous trace's
 * chainHash (or null for the genesis). Returns the index of the first break, or -1 if intact.
 * @param {Array<{parentSha256:string|null, chainHash:string}>} orderedTraces
 */
export function firstChainGap(orderedTraces) {
  let prev = null;
  for (let i = 0; i < orderedTraces.length; i += 1) {
    const t = orderedTraces[i];
    if ((t.parentSha256 ?? null) !== (prev ?? null)) return i;
    prev = t.chainHash;
  }
  return -1;
}

/**
 * THE THEOREM: the record is provably complete iff COMPLETE ∧ CHAIN-INTACT.
 * @returns {{complete:boolean, chainIntact:boolean, proven:boolean, missing:any[], firstGap:number}}
 */
export function recordCompleteness(writes, orderedTraces) {
  const missing = missingTraces(writes, orderedTraces);
  const firstGap = firstChainGap(orderedTraces);
  const complete = missing.length === 0;
  const chainIntact = firstGap === -1;
  return { complete, chainIntact, proven: complete && chainIntact, missing, firstGap };
}
