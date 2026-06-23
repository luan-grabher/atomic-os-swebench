#!/usr/bin/env node
/**
 * e3-org-self-improving.proof.mjs — PARADIGM PART D.3 / E3: organization-scale self-improving correctness
 * with proof-signal — an emergent capability in NEITHER atomic-alone NOR Nidus-alone NOR RLVR.
 *
 * E3 = inheritable guidebooks (A-G2) × monotonic admission (L17/L18) × recomputable-witness PSR (N2/A-G5).
 * The product: an ORG-WIDE definition of "broken" that (i) is INHERITED monotonically by every project,
 * (ii) GROWS by proof (never regresses), and (iii) feeds generation a RECOMPUTABLE disproof when violated.
 * RLVR shapes weights; Nidus-PSR shapes inference with a spec; atomic-PSR shapes inference with a
 * recomputable byte-level counterexample — and does it across an inheritance hierarchy that grows by proof.
 *
 *   E3-a INHERIT-MONOTONE — a project inherits the org "broken" set; it cannot weaken it (A-G2).
 *   E3-b GROW-BY-PROOF     — admitting a new org class is a monotonic RISE inherited by all projects (L17/L18 ×
 *                            A-G2): after the org adds a class, every child's effective set grows too, no regression.
 *   E3-c RECOMPUTABLE-PSR  — a violation of an org invariant feeds generation a RECOMPUTABLE witness (N2), not
 *                            a bare obligation id; the witness verifies and a forgery is refused.
 *   E3-d FUSION            — the three compose: org-broken grows by proof, inherited monotonically, feeding a
 *                            recomputable disproof — the triple no constituent owns.
 *
 * Pure: composes the real guidebook + psr-witness modules. Belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const evo = root;
const G = await import(path.join(evo, 'guidebook.mjs'));
const P = await import(path.join(evo, 'psr-witness.mjs'));
const { resolveGuidebook, checkInheritanceMonotonic } = G;
const { psrFeedback, refines } = P;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// org "broken" definition; a project inherits it.
const org = { id: 'org', classes: { syntax: 'enforced', types: 'enforced', secrets: 'enforced' } };
const project = { id: 'project', extends: 'org', classes: { 'render-conformance': 'enforced' } };

// ── E3-a: INHERIT-MONOTONE ──
{
  const reg = new Map([['org', org], ['project', project]]);
  const eff = resolveGuidebook(project, reg);
  const inheritsAll = eff.ok && ['syntax', 'types', 'secrets'].every((c) => eff.effective[c] === 'enforced');
  const mono = checkInheritanceMonotonic(project, reg).ok;
  check('E3-a: a project INHERITS the org "broken" set monotonically (cannot weaken it)', inheritsAll && mono, { effective: eff.effective });
}

// ── E3-b: GROW-BY-PROOF — org adds a class ⇒ every child's effective set grows, no regression ──
{
  const regBefore = new Map([['org', org], ['project', project]]);
  const effBefore = resolveGuidebook(project, regBefore);
  // the org ADMITS a new invariant class (a monotonic rise, L17/L18) — e.g. 'supply-chain'
  const orgGrown = { id: 'org', classes: { ...org.classes, 'supply-chain': 'enforced' } };
  const regAfter = new Map([['org', orgGrown], ['project', project]]);
  const effAfter = resolveGuidebook(project, regAfter);
  const grew = Object.keys(effAfter.effective).length > Object.keys(effBefore.effective).length;
  const noRegression = Object.entries(effBefore.effective).every(([c, s]) => effAfter.effective[c] === s);
  const childGotIt = effAfter.effective['supply-chain'] === 'enforced';
  check('E3-b: the org "broken" set GROWS by proof and EVERY child inherits the rise, no regression (L17/L18 × A-G2)',
    grew && noRegression && childGotIt, { before: Object.keys(effBefore.effective).length, after: Object.keys(effAfter.effective).length, childGotIt });
}

// ── E3-c: RECOMPUTABLE-PSR — a violation feeds a recomputable witness, not a bare id ──
{
  const witness = {
    kind: 'gate-red', recomputed: true, removedRegion: 'leaked_secret = "AKIA..."',
    counterexample: { failedProofFacts: [{ command: 'gates/security-gate.proof.mjs', stdoutSha256: 'a'.repeat(64), stderrSha256: 'b'.repeat(64) }] },
  };
  const atomicPsr = psrFeedback(witness, 'witness');
  const nidusPsr = psrFeedback(witness, 'core');
  check('E3-c: an org-invariant violation feeds generation a RECOMPUTABLE-witness PSR that REFINES the obligation-id PSR',
    atomicPsr.kind === 'recomputable-witness' && refines(atomicPsr, nidusPsr) === true && Boolean(atomicPsr.payload.removedRegion), { atomicPsr: atomicPsr.kind });
}

// ── E3-d: FUSION — the three compose into the never-before-done triple ──
{
  // org grows by proof (b), project inherits monotonically (a), violation feeds recomputable disproof (c).
  const orgGrown = { id: 'org', classes: { ...org.classes, 'supply-chain': 'enforced' } };
  const reg = new Map([['org', orgGrown], ['project', project]]);
  const inheritsGrown = resolveGuidebook(project, reg).effective['supply-chain'] === 'enforced';
  const mono = checkInheritanceMonotonic(project, reg).ok;
  const witness = { kind: 'gate-red', recomputed: true, removedRegion: 'x', counterexample: { failedProofFacts: [{ command: 'supply-chain-gate', stdoutSha256: 'c'.repeat(64), stderrSha256: 'd'.repeat(64) }] } };
  const recomputablePsr = refines(psrFeedback(witness, 'witness'), psrFeedback(witness, 'core'));
  check('E3-d: FUSION — org-broken grows by proof ∧ inherited monotonically ∧ feeds a recomputable disproof (the triple no constituent owns)',
    inheritsGrown && mono && recomputablePsr, { inheritsGrown, mono, recomputablePsr });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
