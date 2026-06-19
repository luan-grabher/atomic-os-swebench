#!/usr/bin/env node
/**
 * swebench-funnel-runner.mjs — the SWE-bench prediction generator with a real ON/OFF switch (the arm the
 * dossier claimed but never executed). For ONE instance it produces a patch prediction in two modes:
 *
 *   - mode 'baseline' (atomic OFF): a single proposer shot → extract patch → done. This is today's score.
 *   - mode 'atomic'   (atomic ON):  the universal truth funnel (PART F) drives the patch byte-positively
 *                                   against the HONEST visible signal — PASS_TO_PASS regression + a
 *                                   self-derived reproduction test the model writes from the PUBLIC problem
 *                                   statement — with GRANULAR feedback (which visible tests fail). The HIDDEN
 *                                   FAIL_TO_PASS target is NEVER read here (scoring only), enforced by
 *                                   swebench-funnel-verifier's anti-leak trap.
 *
 * The delta(ON, OFF) — same model, same prompt, only the verified-edit backend changes — is 100% attributable
 * to atomic (the §F.4 protocol). Honest limit: a SWE-bench answer is a MONOLITHIC patch (one answer-unit), so
 * the funnel's byte-positive answer-unit FREEZE does not apply; only the GRANULAR feedback survives (per-hunk
 * freeze via the (a)+(e) closure is the dossier-N1 refinement). atomic helps EXECUTION, not the model's
 * reasoning — where the proposer can never pass the self-test (P=0), atomic does NOT converge and does NOT
 * fake it (the F.2 ceiling).
 *
 * The funnel loop here is INLINE+async (a real DeepSeek proposer is async; truth-funnel.mjs's runFunnel is
 * sync) but uses the IDENTICAL primitives — funnelGate / decompose / mergeBytePositive — so the semantics are
 * the proven ones, not a re-implementation. Proposer + applyAndTest are INJECTED (real DeepSeek/container in
 * prod, deterministic mocks in the proof).
 */

import { funnelGate, decompose, mergeBytePositive } from '../atomic-edit-evolution/truth-funnel.mjs';
import { buildSWEBenchVerifier, assertNoHiddenLeak, PATCH_KEY } from './swebench-funnel-verifier.mjs';

/**
 * Generate a patch prediction for one instance.
 * @param {{
 *   instance: object,
 *   mode?: 'baseline'|'atomic',
 *   budget?: number,
 *   propose: (feedback:{rejected:string[]}|null, priorPatch:string) => Promise<string>|string,  // → patch
 *   applyAndTest: (patch:string, testIds:string[]) => {applied:boolean, results:Record<string,'pass'|'fail'>, deterministic?:boolean},
 *   proposeSelfTest?: (instance:object) => Promise<string[]>|string[],  // self-derived repro test ids (atomic only)
 *   passToPass?: string[],
 *   failToPass?: string[],   // the HIDDEN target — passed only so the verifier can REFUSE to expose it
 * }} opts
 * @returns {Promise<{patch:string, mode:string, converged:(boolean|null), iterations:number, selfDerived:string[], feedbackIds:string[], unjudged:boolean}>}
 */
export async function generatePrediction(opts) {
  const { instance, mode = 'atomic', budget = 6, propose, applyAndTest, proposeSelfTest,
    passToPass = [], failToPass = [] } = opts;
  if (typeof propose !== 'function') throw new Error('propose must be a function');

  if (mode === 'baseline') {
    // atomic OFF — one shot, no funnel, no feedback. The honest baseline arm.
    const patch = await propose(null, '');
    return { patch: String(patch ?? ''), mode, converged: null, iterations: 1, selfDerived: [], feedbackIds: [], unjudged: false };
  }
  if (mode !== 'atomic') throw new Error(`unknown mode: ${mode}`);

  // atomic ON — the funnel. First, the model writes a reproduction test from the PUBLIC problem statement.
  const selfDerived = proposeSelfTest ? [...(await proposeSelfTest(instance) ?? [])] : [];
  const verify = buildSWEBenchVerifier({ applyAndTest, passToPass, selfDerived, failToPass });

  let answer = new Map();
  const frozen = new Set();
  let feedback = null;
  const feedbackIds = [];
  let converged = false;
  let unjudged = false;
  let iterations = 0;

  for (let i = 0; i < budget; i += 1) {
    iterations = i + 1;
    const priorPatch = answer.get(PATCH_KEY) ?? '';
    const patch = String((await propose(feedback, priorPatch)) ?? '');
    // identical primitive: merge byte-positively (the monolithic 'patch' answer-unit is never frozen — only
    // the verification test-units freeze; this is the documented honest limit, not a bug).
    answer = mergeBytePositive(answer, frozen, new Map([[PATCH_KEY, patch]]));
    const verification = verify(answer);
    const gate = funnelGate(verification);
    if (gate.unjudged) { unjudged = true; break; } // no patch / non-deterministic env → abstain (Rice/honesty)
    const { accepted } = decompose(verification);
    for (const id of accepted) frozen.add(id); // freeze accepted visible tests (monotone P10)
    if (gate.submit) { converged = true; break; }
    feedback = { rejected: gate.rejected }; // GRANULAR recomputable feedback — which visible tests still fail
    feedbackIds.push(...gate.rejected);
    assertNoHiddenLeak(gate.rejected, failToPass); // defense in depth: feedback never names a hidden target
  }

  return { patch: answer.get(PATCH_KEY) ?? '', mode, converged, iterations, selfDerived, feedbackIds, unjudged };
}

// ───────────────────────── real-wiring (exercised by the smoke, not the proof) ─────────────────────────

/** Turn granular funnel feedback (which visible tests failed) into a prose revision instruction. */
export function feedbackToPrompt(rejected = []) {
  if (!rejected.length) return '';
  return [
    'After your previous patch, these VISIBLE tests still fail:',
    ...rejected.map((id) => `  - ${id}`),
    'Revise the unified diff so they pass WITHOUT breaking any currently-passing test.',
    'Return only a unified git diff that starts with diff --git.',
  ].join('\n');
}

/**
 * Build a real DeepSeek-backed proposer for prod. Reuses the existing prompt builders + diff extractor (DRY).
 * Lazy-imports the heavy modules so the pure core above stays importable without them.
 */
export async function makeDeepSeekProposer(instance, { includeHints = false, repoContext = '' } = {}) {
  const { buildSwebenchPrompt, extractUnifiedDiff } = await import('./swebench-deepseek-prediction-runner.mjs');
  const { deepseekChat } = await import('./funnel-deepseek.mjs');
  const basePrompt = buildSwebenchPrompt(instance, { includeHints, repoContext });
  return async function propose(feedback, priorPatch) {
    const messages = [{ role: 'user', content: basePrompt }];
    if (priorPatch) messages.push({ role: 'assistant', content: priorPatch });
    const fb = feedbackToPrompt(feedback?.rejected);
    if (fb) messages.push({ role: 'user', content: fb });
    const content = await deepseekChat(messages, { maxTokens: 8192 });
    const extracted = extractUnifiedDiff(content);
    return extracted.ok ? extracted.patch : '';
  };
}
