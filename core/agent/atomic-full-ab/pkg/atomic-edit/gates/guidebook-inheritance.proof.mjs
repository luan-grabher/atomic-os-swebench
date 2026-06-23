#!/usr/bin/env node
/**
 * guidebook-inheritance.proof.mjs — PARADIGM PART D A-G2: hierarchical inheritable obligations.
 *
 *   AG2-a INHERIT    — a child guidebook that `extends` a parent has Π(child) ⊇ Π(parent) (all parent classes).
 *   AG2-b MONOTONIC  — a child may not DROP or WEAKEN a parent class; a child that does is REFUSED
 *                      (the L18 ratchet, lifted one level up: child never regresses below parent). Discriminating.
 *   AG2-c EXTEND     — a child MAY add classes / strengthen (partial→enforced); the additions resolve.
 *   AG2-d TRANSITIVE — grandparent → parent → child inheritance composes (the effective set is the union up
 *                      the chain, strongest status wins).
 *   AG2-e CYCLE      — an inheritance cycle is detected and refused (not an infinite loop).
 *
 * Pure: in-memory; belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const G = await import(path.join(root, 'guidebook.mjs'));
const { resolveGuidebook, checkInheritanceMonotonic, addedClasses } = G;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// org base → project guidebook hierarchy
const orgBase = { id: 'org-base', classes: { syntax: 'enforced', types: 'enforced', secrets: 'enforced' } };
const project = { id: 'project', extends: 'org-base', classes: { 'render-conformance': 'enforced', types: 'enforced' } };
const registry = new Map([['org-base', orgBase], ['project', project]]);

// ── AG2-a: INHERIT ──
{
  const eff = resolveGuidebook(project, registry);
  const has = eff.ok && ['syntax', 'types', 'secrets', 'render-conformance'].every((c) => c in eff.effective);
  check('AG2-a: a child INHERITS all parent classes (Π(child) ⊇ Π(parent))', has, { effective: eff.effective });
}

// ── AG2-b: MONOTONIC — drop/weaken refused ──
{
  const okChild = checkInheritanceMonotonic(project, registry);
  check('AG2-b: a faithful child passes the monotonicity check', okChild.ok === true, { violations: okChild.violations });
  // a child that WEAKENS a parent class (types enforced→partial) must be REFUSED
  const dropReg = new Map([['org-base', { id: 'org-base', classes: { types: 'enforced', secrets: 'enforced' } }], ['drop', { id: 'drop', extends: 'org-base', classes: { types: 'partial' } }]]);
  const weakened = checkInheritanceMonotonic(dropReg.get('drop'), dropReg);
  check('AG2-b: WEAKENING a parent class (types enforced→partial) is REFUSED (discriminating — the ratchet can go RED)',
    weakened.ok === false && weakened.violations.some((v) => v.startsWith('WEAKENED:types')), { violations: weakened.violations });
}

// ── AG2-c: EXTEND — child adds classes ──
{
  const added = addedClasses(project, registry);
  check('AG2-c: a child legitimately ADDS classes beyond the parent (render-conformance)', added.includes('render-conformance'), { added });
}

// ── AG2-d: TRANSITIVE — grandparent→parent→child ──
{
  const gp = { id: 'gp', classes: { syntax: 'enforced' } };
  const p = { id: 'p', extends: 'gp', classes: { types: 'enforced' } };
  const c = { id: 'c', extends: 'p', classes: { secrets: 'enforced' } };
  const reg = new Map([['gp', gp], ['p', p], ['c', c]]);
  const eff = resolveGuidebook(c, reg);
  check('AG2-d: TRANSITIVE inheritance composes (grandparent ∪ parent ∪ child)',
    eff.ok && ['syntax', 'types', 'secrets'].every((x) => x in eff.effective) && eff.chain.length === 3, { chain: eff.chain });
  const mono = checkInheritanceMonotonic(c, reg);
  check('AG2-d: the 3-level chain is monotonic (no regression anywhere up the chain)', mono.ok === true, { violations: mono.violations });
}

// ── AG2-e: CYCLE detection ──
{
  const a = { id: 'a', extends: 'b', classes: {} };
  const b = { id: 'b', extends: 'a', classes: {} };
  const reg = new Map([['a', a], ['b', b]]);
  const res = resolveGuidebook(a, reg);
  check('AG2-e: an inheritance CYCLE is detected and refused (no infinite loop)', res.ok === false && /cycle/.test(res.error), { error: res.error });
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
