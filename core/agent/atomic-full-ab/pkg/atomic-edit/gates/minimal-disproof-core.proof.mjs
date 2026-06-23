#!/usr/bin/env node
/**
 * minimal-disproof-core.proof.mjs — PARADIGM PART D A-G3 + E2: the minimal recomputable disproof is real.
 *
 *   AG3-a MINIMIZE     — delta-debugging reduces a multi-red set to the REAL cause (e.g. {A,B,C,D} where only
 *                        C fails → core = {C}).
 *   AG3-b CONJUNCTIVE  — when two obligations fail only TOGETHER (B∧D, neither alone), the core is {B,D}
 *                        (does not over-minimize — sound).
 *   AG3-c SOUND        — the returned core ⊆ the full set AND still fails; removing any element makes it pass
 *                        (1-minimal).
 *   E2-a  FUSION       — the minimal core is stamped INTO the recomputable byte-level witness ⇒ minimal
 *                        (core ⊊ obligations) AND recomputable (removedRegion + facts retained).
 *   E2-b  STRICT       — with redundant reds, the minimal core is STRICTLY smaller than the full set (the
 *                        finer-than-Nidus property), while still carrying the byte-level layer (richer-than-Nidus).
 *
 * Pure: in-memory; belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const M = await import(path.join(root, 'minimal-core.mjs'));
const { minimalFailingCore, minimalRecomputableDisproof } = M;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// ── AG3-a: single real cause among many reds ──
{
  const obligations = ['gateA', 'gateB', 'gateC', 'gateD'];
  // the conjunction fails iff gateC is present (gateC is the real cause; the others are noise reds)
  const fails = (subset) => subset.includes('gateC');
  const core = minimalFailingCore(obligations, fails);
  check('AG3-a: delta-debugging reduces {A,B,C,D} to the REAL cause {C}', core.length === 1 && core[0] === 'gateC', { core });
}

// ── AG3-b: conjunctive cause (B∧D fail only together) ──
{
  const obligations = ['gateA', 'gateB', 'gateC', 'gateD'];
  // fails iff BOTH gateB and gateD present (neither alone)
  const fails = (subset) => subset.includes('gateB') && subset.includes('gateD');
  const core = minimalFailingCore(obligations, fails);
  const set = new Set(core);
  check('AG3-b: a conjunctive cause (B∧D) yields the minimal {B,D} (not over-minimized)',
    core.length === 2 && set.has('gateB') && set.has('gateD'), { core });
}

// ── AG3-c: SOUND — core ⊆ full, still fails, 1-minimal ──
{
  const obligations = ['g1', 'g2', 'g3', 'g4', 'g5'];
  const fails = (subset) => subset.includes('g2') && subset.includes('g4');
  const core = minimalFailingCore(obligations, fails);
  const subsetOk = core.every((x) => obligations.includes(x));
  const stillFails = fails(core);
  const oneMinimal = core.every((o) => !fails(core.filter((x) => x !== o)));
  check('AG3-c: SOUND — core ⊆ obligations, still fails, and is 1-minimal (removing any element passes)',
    subsetOk && stillFails && oneMinimal, { core, stillFails, oneMinimal });
}

// ── E2-a + E2-b: the FUSION — minimal AND recomputable, strictly smaller than the full set ──
{
  const witness = {
    kind: 'gate-red', recomputed: true, removedRegion: 'const dead = unused();',
    counterexample: { failedProofFacts: [{ command: 'gateC', stdoutSha256: 'a'.repeat(64), stderrSha256: 'b'.repeat(64) }] },
  };
  const obligations = ['gateA', 'gateB', 'gateC', 'gateD'];
  const fails = (subset) => subset.includes('gateC');
  const mrd = minimalRecomputableDisproof(witness, obligations, fails);
  check('E2-a: FUSION — the minimal core is stamped INTO the recomputable byte-level witness (minimal AND recomputable)',
    Array.isArray(mrd.core) && mrd.core.length === 1 && mrd.core[0] === 'gateC' &&
    mrd.removedRegion === witness.removedRegion && mrd.recomputed === true, { core: mrd.core, hasBytes: Boolean(mrd.removedRegion) });
  check('E2-b: STRICT — the minimal core (1) is STRICTLY smaller than the full red set (4) while keeping the byte-level layer (finer AND richer than an UNSAT-core)',
    mrd.core.length < mrd.fullObligationCount && mrd.fullObligationCount === 4 && Boolean(mrd.removedRegion),
    { coreSize: mrd.core.length, fullSize: mrd.fullObligationCount });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
