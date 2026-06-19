#!/usr/bin/env node
/**
 * swebench-funnel-verifier.proof.mjs — proves the HONEST SWE-bench verifier adapter:
 *  SV1  visible pass/fail maps to accept/reject (correctness)
 *  SV2  HONESTY TRAP, discriminating: a FAIL_TO_PASS id in the visible set REFUSES (can go RED)
 *  SV3  a non-applying patch rejects every visible unit (cleanest disproof)
 *  SV4  abstains (UNJUDGED) when there is no patch / a non-deterministic env (never fakes a verdict)
 *  SV5  end-to-end with runFunnel: granular feedback NEVER leaks a hidden id; converges on a passing patch
 *  SV6  regression guard: a patch that breaks a PASS_TO_PASS test is NOT submitted (monotonicity)
 */
import assert from 'node:assert';
import { runFunnel, funnelGate } from '../atomic-edit-evolution/truth-funnel.mjs';
import { buildSWEBenchVerifier, assertNoHiddenLeak, LEAK, PATCH_KEY } from './swebench-funnel-verifier.mjs';

let passed = 0, failed = 0;
const ok = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (e) { failed += 1; console.log(`FAIL  ${name}: ${e.message}`); }
};

// A deterministic instance fixture: visible P2P regression + a self-derived repro test; hidden F2P target.
const P2P = ['repo::test_regression_a', 'repo::test_regression_b'];
const SELF = ['repo::test_repro_from_issue'];
const F2P = ['repo::test_hidden_target'];

// Mock env: a patch string encodes which visible tests pass (CSV after 'PASS='); 'BROKEN' breaks regression;
// 'NOAPPLY' fails to apply; 'NONDET' models a non-deterministic environment.
function mockApplyAndTest(patch, testIds) {
  if (patch.includes('NOAPPLY')) return { applied: false, results: {}, deterministic: true };
  if (patch.includes('NONDET')) return { applied: true, results: {}, deterministic: false };
  const passSet = new Set((patch.match(/PASS=([^\n]*)/)?.[1] ?? '').split(',').filter(Boolean));
  const breaksRegression = patch.includes('BROKEN');
  const results = {};
  for (const id of testIds) {
    if (P2P.includes(id)) results[id] = breaksRegression ? 'fail' : 'pass'; // regression green unless BROKEN
    else results[id] = passSet.has(id) ? 'pass' : 'fail';                   // repro passes only if patch says so
  }
  return { applied: true, results, deterministic: true };
}

// SV1
ok('SV1 visible pass/fail maps to accept/reject', () => {
  const verify = buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: P2P, selfDerived: SELF, failToPass: F2P });
  const v = verify(new Map([[PATCH_KEY, 'PASS=repo::test_repro_from_issue']]));
  assert.equal(v.deterministic, true);
  const byId = Object.fromEntries(v.units.map((u) => [u.id, u.verdict]));
  assert.equal(byId['repo::test_regression_a'], 'accept');
  assert.equal(byId['repo::test_repro_from_issue'], 'accept');
  assert.equal(v.units.length, 3);
});

// SV2 DISCRIMINATING honesty trap
ok('SV2 a FAIL_TO_PASS id in the visible set is REFUSED (can go RED)', () => {
  assert.throws(
    () => buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: [...P2P, 'repo::test_hidden_target'], failToPass: F2P }),
    (e) => e.message.startsWith(LEAK),
  );
  // control: the honest config does NOT throw
  buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: P2P, selfDerived: SELF, failToPass: F2P });
});

// SV3 non-applying patch
ok('SV3 a non-applying patch rejects every visible unit', () => {
  const verify = buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: P2P, selfDerived: SELF, failToPass: F2P });
  const v = verify(new Map([[PATCH_KEY, 'NOAPPLY']]));
  assert.equal(v.units.every((u) => u.verdict === 'reject'), true);
  assert.equal(funnelGate(v).submit, false);
});

// SV4 abstain
ok('SV4 abstains (null) on no-patch and on non-deterministic env', () => {
  const verify = buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: P2P, failToPass: F2P });
  assert.equal(verify(new Map()), null);                         // no patch → UNJUDGED
  assert.equal(verify(new Map([[PATCH_KEY, 'NONDET']])), null);  // non-deterministic → UNJUDGED
});

// SV5 end-to-end: no hidden leak in feedback; converges on a passing patch
ok('SV5 funnel converges + granular feedback never leaks a hidden id', () => {
  const verify = buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: P2P, selfDerived: SELF, failToPass: F2P });
  let round = 0;
  const seenFeedback = [];
  // proposer: round 1 emits a patch that fails the repro test; the granular feedback drives round 2 to fix it.
  const propose = (_prev, feedback) => {
    round += 1;
    if (feedback) { seenFeedback.push(...feedback.rejected); assertNoHiddenLeak(feedback.rejected, F2P); }
    const patch = round === 1 ? 'PASS=' : 'PASS=repo::test_repro_from_issue';
    return new Map([[PATCH_KEY, patch]]);
  };
  const r = runFunnel({ propose, verify, budget: 5 });
  assert.equal(r.converged, true);
  assert.equal(r.unjudged, false);
  assert.ok(seenFeedback.length > 0);             // feedback WAS used (granular differentiator exercised)
  assertNoHiddenLeak(seenFeedback, F2P);          // and it NEVER named the hidden target
});

// SV6 regression guard
ok('SV6 a patch that breaks a PASS_TO_PASS is NOT submitted', () => {
  const verify = buildSWEBenchVerifier({ applyAndTest: mockApplyAndTest, passToPass: P2P, selfDerived: SELF, failToPass: F2P });
  const v = verify(new Map([[PATCH_KEY, 'BROKEN PASS=repo::test_repro_from_issue']]));
  const gate = funnelGate(v);
  assert.equal(gate.submit, false);                          // regression rejected → never submitted
  assert.ok(gate.rejected.includes('repo::test_regression_a'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
