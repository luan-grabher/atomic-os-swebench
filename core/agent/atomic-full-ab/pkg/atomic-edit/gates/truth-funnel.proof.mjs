#!/usr/bin/env node
/**
 * truth-funnel.proof.mjs — PARADIGM PART F: the universal truth funnel (P9/P10) machine-checked, plus the
 * F.4 mechanism-level arm comparison (no LLM — a deterministic synthetic proposer; the real-LLM number is the
 * separate F.4 layer 2, runnable with the DeepSeek key).
 *
 *   P9-a GATE        — an answer with a rejected unit is NOT submitted; one with rejected=∅ IS submitted.
 *   P9-b UNJUDGED    — a non-deterministic / absent verifier ABSTAINS (the funnel never fakes a verdict).
 *   P10-a FREEZE     — the byte-positive merge NEVER mutates a frozen accepted unit (immutability).
 *   P10-b MONOTONE   — across funnel iterations, an accepted unit never regresses; rejected set strictly shrinks.
 *   F4-a CONVERGE    — with P>0 per unit (finite difficulty), the unified funnel CONVERGES to rejected=∅.
 *   F4-b CEILING     — with P=0 for a unit (infinite difficulty), the funnel HONESTLY does NOT converge
 *                      (atomic does not create intelligence — the named boundary).
 *   F4-c ACCELERATION— the unified byte-positive funnel converges in STRICTLY fewer iterations than blind-retry
 *                      on a multi-unit task (the byte-positive freeze is the mechanism, not just retry).
 *
 * Pure: in-memory, deterministic. Belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const F = await import(path.join(root, 'truth-funnel.mjs'));
const { funnelGate, mergeBytePositive, runFunnel, makeSyntheticTask, runArm } = F;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// ── P9-a: GATE ──
{
  const rejectedOne = { deterministic: true, units: [{ id: 'u1', verdict: 'accept' }, { id: 'u2', verdict: 'reject' }] };
  const allAccept = { deterministic: true, units: [{ id: 'u1', verdict: 'accept' }, { id: 'u2', verdict: 'accept' }] };
  check('P9-a: an answer with a REJECTED unit is NOT submitted; one with rejected=∅ IS submitted',
    funnelGate(rejectedOne).submit === false && funnelGate(allAccept).submit === true,
    { withReject: funnelGate(rejectedOne), allAccept: funnelGate(allAccept) });
}

// ── P9-b: UNJUDGED — non-deterministic / absent verifier abstains ──
{
  const nondet = { deterministic: false, units: [{ id: 'u1', verdict: 'accept' }] };
  check('P9-b: a non-deterministic / absent verifier ABSTAINS (UNJUDGED — never a faked verdict)',
    funnelGate(nondet).unjudged === true && funnelGate(null).unjudged === true && funnelGate(nondet).submit === false, {});
}

// ── P10-a: FREEZE — merge never mutates a frozen accepted unit ──
{
  const prev = new Map([['u1', 'correct:u1'], ['u2', 'wrong:u2']]);
  const frozen = new Set(['u1']);
  const reDerived = new Map([['u1', 'MALICIOUS-OVERWRITE'], ['u2', 'correct:u2']]);
  const merged = mergeBytePositive(prev, frozen, reDerived);
  check('P10-a: byte-positive merge NEVER mutates a frozen accepted unit (u1 preserved), only re-derives rejected (u2)',
    merged.get('u1') === 'correct:u1' && merged.get('u2') === 'correct:u2', { merged: [...merged] });
}

// ── P10-b: MONOTONE — accepted never regresses, rejected never grows ──
{
  const P = new Map([['u1', 0.5], ['u2', 0.4], ['u3', 0.6]]); // capability per unit
  const task = makeSyntheticTask(P);
  const r = runArm('unified-funnel', task, P, 100);
  // re-run capturing history via the raw funnel for the audit
  const attempts = new Map([...task.unitIds].map((id) => [id, 0]));
  const raw = runFunnel({
    propose: (_p, feedback, frozen) => {
      const ids = feedback ? feedback.rejected : task.unitIds.filter((id) => !frozen.has(id));
      return new Map(ids.map((id) => { attempts.set(id, attempts.get(id) + 1); return [id, task.attemptCorrect(id, attempts.get(id)) ? task.truth.get(id) : `w:${id}:${attempts.get(id)}`]; }));
    }, verify: task.verify, budget: 100,
  });
  let neverGrows = true;
  for (let i = 1; i < raw.history.length; i += 1) if (raw.history[i].rejected > raw.history[i - 1].rejected) neverGrows = false;
  check('P10-b: across iterations an accepted unit never regresses (monotone) and the rejected set never GROWS',
    r.monotone === true && raw.monotone === true && neverGrows === true && raw.converged === true,
    { monotone: r.monotone, neverGrows, iterations: raw.iterations });
}

// ── F4-a: CONVERGE with P>0 ──
{
  const P = new Map([['u1', 0.5], ['u2', 0.4], ['u3', 0.7], ['u4', 0.3]]);
  const task = makeSyntheticTask(P);
  const r = runArm('unified-funnel', task, P, 200);
  check('F4-a: with P>0 per unit, the unified funnel CONVERGES to rejected=∅', r.converged === true && r.monotone === true, { iterations: r.iterations });
}

// ── F4-b: CEILING — P=0 unit ⇒ honest non-convergence ──
{
  const P = new Map([['u1', 0.5], ['u2', 0]]); // u2 is unsolvable (P=0)
  const task = makeSyntheticTask(P);
  const r = runArm('unified-funnel', task, P, 200);
  check('F4-b: with a P=0 unit (capability ceiling), the funnel HONESTLY does NOT converge (atomic does not create intelligence)',
    r.converged === false, { iterations: r.iterations });
}

// ── F4-c: ACCELERATION — unified funnel ≪ blind-retry, averaged over seeds (robust, not a lucky seed) ──
{
  // 6 independent units, each P=0.5. Blind/scalar need ALL 6 correct in ONE round (∏P = 0.5^6 ≈ 1/64);
  // the unified funnel freezes each unit as it lands (~max of 6 geometric draws). Averaged over 8 deterministic
  // seeds so the result reflects the STRUCTURAL gap (blind ~exponential in unit-count, funnel ~logarithmic),
  // not one favorable draw.
  const P = new Map(Array.from({ length: 6 }, (_, i) => [`u${i}`, 0.5]));
  const seeds = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7'];
  let uSum = 0, bSum = 0, uAllConverged = true, unifiedNeverWorse = true;
  for (const s of seeds) {
    const u = runArm('unified-funnel', makeSyntheticTask(P, s), P, 5000);
    const b = runArm('blind-retry', makeSyntheticTask(P, s), P, 5000);
    if (!u.converged) uAllConverged = false;
    const uIt = u.iterations ?? 5000, bIt = b.iterations ?? 5000;
    uSum += uIt; bSum += bIt;
    if (uIt > bIt) unifiedNeverWorse = false;
  }
  const uMean = uSum / seeds.length, bMean = bSum / seeds.length;
  check('F4-c: averaged over 8 seeds, the unified funnel converges in FEWER iterations than blind-retry AND never worse on any seed (the byte-positive freeze, not luck)',
    uAllConverged && unifiedNeverWorse && uMean < bMean,
    { unifiedMean: uMean.toFixed(1), blindMean: bMean.toFixed(1), speedup: (bMean / uMean).toFixed(1) + 'x' });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
