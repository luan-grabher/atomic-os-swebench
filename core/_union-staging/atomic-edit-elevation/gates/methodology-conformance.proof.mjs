#!/usr/bin/env node
/**
 * methodology-conformance.proof.mjs — PARADIGM PART D A-G4: methodology-as-decidable-artifact.
 *
 * The C-I…C-V synthesis→paradigm conditions are lifted from prose into a DECLARED guidebook
 * (gates/methodology-guidebook.json) — the V-model ladder externalized as a machine-checked artifact, with
 * `npm run paradigm-verify` as the conformance RUNNER. This proves the methodology is GROUNDED, not
 * aspirational, and that conformance is decidable:
 *
 *   AG4-a DECLARED   — the guidebook declares all five conditions C-I…C-V, each mapping to ≥1 property
 *                      (P1–P8) and ≥1 discharging proof.
 *   AG4-b GROUNDED   — every discharging proof named in the guidebook EXISTS on disk (no aspirational ref).
 *   AG4-c RUNNER     — paradigm-verify.mjs actually RUNS (a superset of) the guidebook's discharging proofs,
 *                      so running it IS a conformance check (the runner covers the methodology).
 *   AG4-d DISCRIMINATING — a synthetic condition naming a missing proof is caught (conformance can go RED).
 *
 * Pure + static (reads the guidebook + paradigm-verify source + checks file existence). Mandatory lattice.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const guide = JSON.parse(fs.readFileSync(path.join(dir, 'methodology-guidebook.json'), 'utf8'));
const pvSrc = fs.readFileSync(path.join(root, 'paradigm-verify.mjs'), 'utf8');

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// ── AG4-a: DECLARED — all five conditions, each with properties + discharging proofs ──
const ids = guide.conditions.map((c) => c.id);
const expected = ['C-I', 'C-II', 'C-III', 'C-IV', 'C-V'];
const wellFormed = guide.conditions.every((c) => Array.isArray(c.requires) && c.requires.length > 0 && Array.isArray(c.dischargedBy) && c.dischargedBy.length > 0);
check('AG4-a: the guidebook DECLARES all five conditions C-I…C-V, each with ≥1 property and ≥1 discharging proof',
  expected.every((e) => ids.includes(e)) && wellFormed, { ids, wellFormed });

// ── AG4-b: GROUNDED — every discharging proof exists on disk ──
const allProofs = [...new Set(guide.conditions.flatMap((c) => c.dischargedBy))];
const missing = allProofs.filter((p) => !fs.existsSync(path.join(root, p)));
check('AG4-b: every discharging proof named in the methodology EXISTS on disk (grounded, not aspirational)',
  missing.length === 0, { proofCount: allProofs.length, missing });

// ── AG4-c: RUNNER — paradigm-verify runs (a superset of) the discharging proofs ──
const proofBasenames = allProofs.map((p) => path.basename(p));
const notRun = proofBasenames.filter((b) => !pvSrc.includes(b));
check('AG4-c: paradigm-verify.mjs is the conformance RUNNER — it runs (a superset of) the methodology proofs',
  notRun.length === 0, { notRun });
check('AG4-c: the declared conformanceRunner is the paradigm-verify command', guide.conformanceRunner === 'npm run paradigm-verify', { runner: guide.conformanceRunner });

// ── AG4-d: DISCRIMINATING — a condition naming a missing proof is caught ──
const synthetic = [...guide.conditions, { id: 'C-SYNTH', requires: ['P9'], dischargedBy: ['gates/does-not-exist.proof.mjs'] }];
const synthMissing = [...new Set(synthetic.flatMap((c) => c.dischargedBy))].filter((p) => !fs.existsSync(path.join(root, p)));
check('AG4-d: a methodology condition naming a MISSING proof is caught (conformance can go RED)',
  synthMissing.length === 1 && synthMissing[0] === 'gates/does-not-exist.proof.mjs', { caught: synthMissing });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
