#!/usr/bin/env node
/**
 * swebench-funnel-verifier.mjs — the HONEST SWE-bench verifier adapter for the universal truth funnel (PART F).
 *
 * Maps SWE-bench reality onto the funnel's verifier interface
 * `(answer:Map) => {units:Array<{id,verdict}>, deterministic:boolean}|null` (truth-funnel.mjs:65), with ONE
 * load-bearing guarantee: the HIDDEN target tests (FAIL_TO_PASS) are NEVER read during generation. Only the
 * VISIBLE signal gates the funnel:
 *   - PASS_TO_PASS  — the repo's existing regression tests (a patch must NOT break them).
 *   - self-derived  — a reproduction test the MODEL wrote from the PUBLIC problem statement (extra honest signal).
 * FAIL_TO_PASS is computed ONLY by the official harness AFTER generation, for SCORING — never here. This is the
 * difference between "extracts the model's ceiling honestly" and the benchmark loophole (using the target tests
 * to guide the patch), which would be instantly refutable.
 *
 * Honest boundary (recorded, not hidden): the funnel's byte-positive *answer-unit freeze* (truth-funnel.mjs:52)
 * is structurally WEAKER here than on HumanEval/ARC, because a SWE-bench answer is a MONOLITHIC patch (one
 * answer-unit), not decomposable per test. What survives is the GRANULAR feedback (which visible tests fail) —
 * the scalar→granular differentiator. Per-hunk freeze (mapping hunks→tests via the (a)+(e) closure) is the
 * future refinement (dossier N1); this adapter ships the honest granular-feedback core.
 *
 * Pure: `applyAndTest` (apply the patch in the instance env, run the given tests) is INJECTED — real in the
 * Modal container, a deterministic mock in the proof. No spawn here.
 */

export const LEAK = 'FAIL_TO_PASS_LEAK'; // thrown if the visible set is ever asked to include a hidden target test

/** The answer Map carries the candidate patch under this key (a SWE-bench answer is one monolithic unit). */
export const PATCH_KEY = 'patch';

/**
 * Build a funnel-compatible verifier for ONE SWE-bench instance.
 * @param {{
 *   applyAndTest: (patch:string, testIds:string[]) => {applied:boolean, results:Record<string,'pass'|'fail'>, deterministic?:boolean},
 *   passToPass?:  string[],   // visible regression tests (must stay green)
 *   selfDerived?: string[],   // visible reproduction tests the model wrote from the PUBLIC problem statement
 *   failToPass?:  string[],   // the HIDDEN target — passed in ONLY so we can REFUSE to ever expose it
 * }} spec
 * @returns {(answer:Map) => {units:Array<{id,verdict}>, deterministic:boolean}|null}
 */
export function buildSWEBenchVerifier({ applyAndTest, passToPass = [], selfDerived = [], failToPass = [] }) {
  if (typeof applyAndTest !== 'function') throw new Error('applyAndTest must be a function');
  const hidden = new Set(failToPass);
  const visible = [...passToPass, ...selfDerived];
  // HONESTY TRAP (discriminating): the visible signal must be DISJOINT from the hidden target. If any
  // FAIL_TO_PASS id leaked into the visible set, refuse to build — a wrong answer would be made representable.
  for (const id of visible) {
    if (hidden.has(id)) throw new Error(`${LEAK}: visible test '${id}' is a FAIL_TO_PASS target`);
  }
  return function verify(answer) {
    const patch = answer.get(PATCH_KEY);
    if (typeof patch !== 'string') return null; // no candidate yet → abstain (UNJUDGED), never fake a verdict
    const res = applyAndTest(patch, visible); // ONLY visible tests are ever executed during generation
    if (!res || res.deterministic === false) return null; // non-deterministic env → abstain (Rice/honesty)
    if (!res.applied) {
      // patch does not apply → every visible unit is rejected (the cleanest possible disproof)
      return { deterministic: true, units: visible.map((id) => ({ id, verdict: 'reject' })) };
    }
    const units = visible.map((id) => ({ id, verdict: res.results[id] === 'pass' ? 'accept' : 'reject' }));
    // DEFENSE IN DEPTH: never let a hidden id appear in the verdicts we return to the funnel.
    for (const u of units) if (hidden.has(u.id)) throw new Error(`${LEAK}: hidden id '${u.id}' in verdicts`);
    return { deterministic: true, units };
  };
}

/** Audit helper for proofs/callers: assert a funnel artifact (units or feedback.rejected) leaks no hidden id. */
export function assertNoHiddenLeak(ids, failToPass) {
  const hidden = new Set(failToPass);
  for (const id of ids ?? []) if (hidden.has(id)) throw new Error(`${LEAK}: '${id}' is a hidden FAIL_TO_PASS target`);
  return true;
}
