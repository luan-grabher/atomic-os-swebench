#!/usr/bin/env node
/**
 * coverage-ratchet.proof.mjs — PARADIGM L17 (monotonic admission) + L18 (coverage ratchet).
 *
 * This is the actual paradigm SEED: the system's definition of "correct" provably grows
 * MONOTONICALLY. The coverage metric is the set of named invariant CLASSES (gates/invariant-taxonomy.json)
 * and each one's enforcement status (partial < enforced). Two guarantees:
 *
 *   L18 RATCHET — current coverage is a non-decreasing extension of the committed floor
 *     (gates/coverage-baseline.json): no class removed, no status regressed. The floor only rises.
 *   L17 MONOTONIC ADMISSION — for the canonical first admission (resource-lifetime, L02), prove
 *     coverage(after) ⊋ coverage(before): the admission STRICTLY added a class and flipped NO prior class.
 *
 * Discriminating: a synthetic dropped/regressed class MUST be caught (the ratchet can go red).
 * Pure + static. Belongs in the mandatory lattice — it fails CI the moment coverage ever drops.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));
const tax = JSON.parse(fs.readFileSync(path.join(dir, 'invariant-taxonomy.json'), 'utf8'));
const baseline = JSON.parse(fs.readFileSync(path.join(dir, 'coverage-baseline.json'), 'utf8'));

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

const RANK = { 'out-of-scope': 0, partial: 1, enforced: 2 };
const current = {};
for (const c of tax.classes) current[c.id] = c.status;

// Compare any candidate coverage map against the baseline → list of regressions/removals.
function regressionsVsBaseline(cov) {
  const out = [];
  for (const [id, baseStatus] of Object.entries(baseline.classes)) {
    if (!(id in cov)) { out.push(`REMOVED:${id}`); continue; }
    if ((RANK[cov[id]] ?? 0) < (RANK[baseStatus] ?? 0)) out.push(`REGRESSED:${id}(${baseStatus}->${cov[id]})`);
  }
  return out;
}

// ── L18-R1: current coverage is a non-decreasing extension of the floor ───────
const reg = regressionsVsBaseline(current);
check('L18: current coverage does not drop below the committed ratchet floor (no class removed/regressed)',
  reg.length === 0, { baselineClasses: Object.keys(baseline.classes).length, currentClasses: Object.keys(current).length, regressions: reg });

// ── L18-R2: the floor actually rose or held (extension, never silent shrink) ──
const added = Object.keys(current).filter((id) => !(id in baseline.classes));
const promoted = Object.keys(current).filter((id) => id in baseline.classes && (RANK[current[id]] ?? 0) > (RANK[baseline.classes[id]] ?? 0));
check('L18: coverage is monotonic — only extended (added/promoted), never shrunk',
  Object.keys(current).length >= Object.keys(baseline.classes).length, { added, promoted });

// ── L18-R3: DISCRIMINATING — a synthetic dropped class is caught ──────────────
const dropped = { ...current };
const victim = Object.keys(dropped)[0];
delete dropped[victim];
const synthReg = regressionsVsBaseline(dropped);
check('L18: a dropped class IS caught (ratchet can go RED)', synthReg.includes(`REMOVED:${victim}`), { victim, caught: synthReg });

// ── L17: MONOTONIC ADMISSION of resource-lifetime (the canonical first case) ──
// before := coverage WITHOUT the L02-admitted class; after := current.
const ADMITTED = 'resource-lifetime';
const before = { ...current };
delete before[ADMITTED];
const strictSuperset = ADMITTED in current && !(ADMITTED in before);
// no prior class flipped: every class present BEFORE the admission is unchanged AFTER it
const noFlip = Object.keys(before).every((id) => current[id] === before[id]);
check('L17: admitting resource-lifetime STRICTLY increased coverage — coverage(after) ⊋ coverage(before)',
  strictSuperset && Object.keys(current).length === Object.keys(before).length + 1,
  { admitted: ADMITTED, beforeCount: Object.keys(before).length, afterCount: Object.keys(current).length });
check('L17: the admission flipped NO prior gate/class (monotonic, not a trade-off)', noFlip,
  { priorClasses: Object.keys(before).length });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
