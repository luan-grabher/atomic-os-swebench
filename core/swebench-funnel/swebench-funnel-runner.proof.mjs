#!/usr/bin/env node
/**
 * swebench-funnel-runner.proof.mjs — proves the ON/OFF prediction generator:
 *  RN1  baseline (OFF) = exactly ONE proposer shot, no funnel (converged=null)
 *  RN2  atomic (ON) converges via GRANULAR feedback, writes a self-derived test, >1 shot
 *  RN3  the DELTA: same proposer, baseline's final patch fails the self-test; atomic's passes all visible
 *  RN4  honesty: the funnel feedback NEVER names a hidden FAIL_TO_PASS target
 *  RN5  ceiling honesty (F.2): a P=0 proposer does NOT converge and does NOT fake (returns best-effort)
 *  RN6  abstain: a non-deterministic env makes the funnel UNJUDGED, never a faked verdict
 */
import assert from 'node:assert';
import { generatePrediction } from './swebench-funnel-runner.mjs';

let passed = 0, failed = 0;
const ok = (name, fn) => {
  return Promise.resolve().then(fn).then(
    () => { passed += 1; console.log(`  ok  ${name}`); },
    (e) => { failed += 1; console.log(`FAIL  ${name}: ${e.message}`); },
  );
};

const INSTANCE = { instance_id: 'repo__proj-1', problem_statement: 'a bug' };
const P2P = ['repo::test_reg_a', 'repo::test_reg_b'];
const SELF = ['repo::test_repro_self'];
const F2P = ['repo::test_hidden_target'];

function makeApplyAndTest() {
  return (patch, testIds) => {
    if (patch.includes('NOAPPLY')) return { applied: false, results: {}, deterministic: true };
    if (patch.includes('NONDET')) return { applied: true, results: {}, deterministic: false };
    const passSet = new Set((patch.match(/PASS=([^\n]*)/)?.[1] ?? '').split(',').filter(Boolean));
    const breaks = patch.includes('BROKEN');
    const results = {};
    for (const id of testIds) {
      if (P2P.includes(id)) results[id] = breaks ? 'fail' : 'pass';
      else results[id] = passSet.has(id) ? 'pass' : 'fail';
    }
    return { applied: true, results, deterministic: true };
  };
}
const proposeSelfTest = () => [...SELF];

await ok('RN1 baseline = one shot, no funnel', async () => {
  let calls = 0;
  const propose = () => { calls += 1; return 'PASS='; };
  const r = await generatePrediction({ instance: INSTANCE, mode: 'baseline', propose, applyAndTest: makeApplyAndTest(), passToPass: P2P, failToPass: F2P });
  assert.equal(calls, 1);
  assert.equal(r.converged, null);
  assert.equal(r.iterations, 1);
  assert.equal(r.patch, 'PASS=');
});

await ok('RN2 atomic converges via granular feedback + self-derived test', async () => {
  let calls = 0;
  const propose = (feedback) => { calls += 1; return feedback ? 'PASS=repo::test_repro_self' : 'PASS='; };
  const r = await generatePrediction({ instance: INSTANCE, mode: 'atomic', budget: 6, propose, applyAndTest: makeApplyAndTest(), proposeSelfTest, passToPass: P2P, failToPass: F2P });
  assert.equal(r.converged, true);
  assert.ok(r.iterations >= 2, `iterations=${r.iterations}`);
  assert.ok(calls >= 2, `calls=${calls}`);
  assert.deepEqual(r.selfDerived, SELF);
});

await ok('RN3 the DELTA: baseline incomplete, atomic complete (same proposer)', async () => {
  const apply = makeApplyAndTest();
  const propose = (feedback) => (feedback ? 'PASS=repo::test_repro_self' : 'PASS=');
  const off = await generatePrediction({ instance: INSTANCE, mode: 'baseline', propose, applyAndTest: apply, passToPass: P2P, failToPass: F2P });
  const on = await generatePrediction({ instance: INSTANCE, mode: 'atomic', budget: 6, propose, applyAndTest: apply, proposeSelfTest, passToPass: P2P, failToPass: F2P });
  // the self-derived test is the mechanism's proxy for "fixed the bug": OFF fails it, ON passes it.
  const offSelf = apply(off.patch, SELF).results['repo::test_repro_self'];
  const onSelf = apply(on.patch, SELF).results['repo::test_repro_self'];
  assert.equal(offSelf, 'fail');
  assert.equal(onSelf, 'pass');
});

await ok('RN4 funnel feedback never names a hidden FAIL_TO_PASS target', async () => {
  const propose = (feedback) => (feedback ? 'PASS=repo::test_repro_self' : 'PASS=');
  const r = await generatePrediction({ instance: INSTANCE, mode: 'atomic', budget: 6, propose, applyAndTest: makeApplyAndTest(), proposeSelfTest, passToPass: P2P, failToPass: F2P });
  assert.ok(r.feedbackIds.length > 0);                          // feedback WAS exercised
  for (const id of r.feedbackIds) assert.ok(!F2P.includes(id)); // and NEVER leaked the hidden target
});

await ok('RN5 ceiling honesty: P=0 proposer does not converge and does not fake', async () => {
  const propose = () => 'PASS='; // can never make the self-test pass — the capability ceiling
  const r = await generatePrediction({ instance: INSTANCE, mode: 'atomic', budget: 4, propose, applyAndTest: makeApplyAndTest(), proposeSelfTest, passToPass: P2P, failToPass: F2P });
  assert.equal(r.converged, false);
  assert.equal(r.iterations, 4);     // exhausted budget honestly
  assert.equal(r.patch, 'PASS=');    // returns best-effort, never a faked "resolved"
});

await ok('RN6 abstain on a non-deterministic env (UNJUDGED, never faked)', async () => {
  const propose = () => 'NONDET';
  const r = await generatePrediction({ instance: INSTANCE, mode: 'atomic', budget: 4, propose, applyAndTest: makeApplyAndTest(), proposeSelfTest, passToPass: P2P, failToPass: F2P });
  assert.equal(r.unjudged, true);
  assert.equal(r.converged, false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
