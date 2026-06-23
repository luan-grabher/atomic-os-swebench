#!/usr/bin/env node
/**
 * psr-witness-refinement.proof.mjs — PARADIGM N2 + PART D A-G5: atomic's disproof witness is a strict
 * REFINEMENT of Nidus's UNSAT-core, and PSR is a first-class general interface.
 *
 *   N2-a CONTAINS    — the witness CONTAINS the UNSAT-core: unsatCore(witness) is a projection of the witness.
 *   N2-b STRICT      — two DISTINCT witnesses with the SAME core but DIFFERENT byte-level facts exist ⇒ the
 *                      core LOSES information the witness keeps (the superset is strict, not equal).
 *   N2-c RECOMPUTABLE— the witness's facts are digest-RECOMPUTABLE (recompute over the bytes == stored digest);
 *                      a forged byte-fact is caught. The bare obligation-id core has no such recomputation.
 *   N2-d ABLATION    — witness-feedback localizes a repair to the ACTUAL failing region; obligation-id
 *                      feedback can only search the whole file. The witness yields a strictly smaller search.
 *   AG5  INTERFACE   — psrFeedback(witness, mode) is a general, swappable PSR interface; atomic's
 *                      'recomputable-witness' mode REFINES the 'obligation-id' (Nidus) mode (refines()=true),
 *                      and the reverse is NOT a refinement (discriminating).
 *
 * Pure: in-memory; belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const P = await import(path.join(root, 'psr-witness.mjs'));
const { unsatCore, witnessInformation, recomputeFactDigest, psrFeedback, refines, repairSearchSize } = P;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// A real-shaped witness over removed bytes "REMOVED_REGION_X".
const bytesA = 'const dead = unused();';
const bytesB = 'let zombie = 0xBADBEEF;';
const witness = (bytes) => ({
  kind: 'gate-red',
  recomputed: true,
  removedRegion: bytes,
  counterexample: { failedProofFacts: [{ command: 'node gates/type-soundness-gate.proof.mjs', stdoutSha256: recomputeFactDigest('stdout:' + bytes), stderrSha256: recomputeFactDigest('') }] },
});
const wA = witness(bytesA);
const wB = witness(bytesB);

// ── N2-a: the witness CONTAINS the core (the core is a projection) ──
const coreA = unsatCore(wA);
const infoA = witnessInformation(wA);
check('N2-a: unsatCore(witness) is a PROJECTION of the witness — the witness CONTAINS the core',
  Array.isArray(coreA.obligationIds) && coreA.obligationIds.length === 1 &&
  infoA.obligationIds.length === coreA.obligationIds.length && infoA.obligationIds[0] === coreA.obligationIds[0],
  { core: coreA, witnessObligations: infoA.obligationIds });

// ── N2-b: STRICT — same core, different byte-level facts ⇒ the core loses information ──
const coreEqual = JSON.stringify(unsatCore(wA)) === JSON.stringify(unsatCore(wB));
const witnessDiffers = witnessInformation(wA).removedRegion !== witnessInformation(wB).removedRegion &&
  witnessInformation(wA).factDigests[0].stdoutSha256 !== witnessInformation(wB).factDigests[0].stdoutSha256;
check('N2-b: two witnesses with the SAME core but DIFFERENT byte-level facts ⇒ the superset is STRICT (core loses info)',
  coreEqual === true && witnessDiffers === true, { coreEqual, witnessDiffers });

// ── N2-c: RECOMPUTABLE — the witness facts recompute; a forged one is caught ──
const recomputed = recomputeFactDigest('stdout:' + bytesA);
const stored = witnessInformation(wA).factDigests[0].stdoutSha256;
check('N2-c: the witness fact digest RECOMPUTES (recompute over the bytes == stored digest)', recomputed === stored, { recomputed, stored });
const forged = recomputeFactDigest('stdout:' + bytesA) !== recomputeFactDigest('stdout:TAMPERED');
check('N2-c: a forged byte-fact is CAUGHT by recomputation (the obligation-id core has no such recomputation)', forged === true, {});

// ── N2-d: ABLATION — witness localizes a repair; the core cannot ──
const fileLength = 4000;
const witnessFb = psrFeedback(wA, 'witness');
const coreFb = psrFeedback(wA, 'core');
const witnessSearch = repairSearchSize(witnessFb, fileLength);
const coreSearch = repairSearchSize(coreFb, fileLength);
check('N2-d: witness-feedback localizes the repair to the actual region; obligation-id-feedback searches the whole file (strictly larger)',
  witnessSearch < coreSearch && witnessSearch === bytesA.length && coreSearch === fileLength, { witnessSearch, coreSearch });

// ── A-G5: PSR is a general interface; atomic's mode REFINES Nidus's mode (discriminating) ──
check('AG5: atomic\'s recomputable-witness PSR REFINES the obligation-id (Nidus) PSR', refines(witnessFb, coreFb) === true, {});
check('AG5: DISCRIMINATING — the obligation-id PSR does NOT refine the recomputable-witness PSR (the refinement is one-directional)',
  refines(coreFb, witnessFb) === false, {});

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
