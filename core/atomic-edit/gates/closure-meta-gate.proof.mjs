#!/usr/bin/env node
/**
 * closure-meta-gate.proof.mjs — PARADIGM L05: the meta-gate that makes the invariant taxonomy
 * provably CLOSED rather than merely large.
 *
 * The synthesis→paradigm gap: a big pile of gates can never say what it GUARANTEES, only what it
 * happens to check. This gate enforces the closure CORRESPONDENCE between the live convergence floor
 * (the gates actually wired in gates/registry.ts) and the named theory (gates/invariant-taxonomy.json):
 *
 *   C1 (no UNNAMED dimension): every gate wired into the floor maps to a named taxonomy class via
 *       gate_index. A wired gate absent from the taxonomy = a dimension enforced but un-named = the
 *       taxonomy is NOT closed. This is the load-bearing closure property.
 *   C2 (no DANGLING class ref): every gate_index target is a real class id.
 *   C3 (no GHOST gate): every gate file named in gate_index exists on disk.
 *   C4 (no EMPTY class): every enforced/partial class is backed by an existing gate or proof artifact.
 *   C5 (DISCRIMINATING): a synthetic wired gate absent from gate_index MUST be caught (the gate can go red).
 *
 * Pure + static (reads source + the manifest; no spawn, no build). Belongs in the mandatory lattice.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url)); // gates/
const tax = JSON.parse(fs.readFileSync(path.join(dir, 'invariant-taxonomy.json'), 'utf8'));
const registrySrc = fs.readFileSync(path.join(dir, 'registry.ts'), 'utf8');

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

const classIds = new Set(tax.classes.map((c) => c.id));
const gateIndex = { ...tax.gate_index };
delete gateIndex._doc;

// The set of gates WIRED into the floor = every gate module imported by the registry.
function wiredGatesFrom(src) {
  const out = new Set();
  const re = /import\s+\w+\s+from\s+'\.\/([a-z0-9-]+)\.js'/g;
  let m;
  while ((m = re.exec(src))) out.add(m[1]);
  return out;
}
const wired = wiredGatesFrom(registrySrc);

// ── C1: no UNNAMED dimension — every wired gate is in gate_index ───────────────
const unnamed = [...wired].filter((g) => !(g in gateIndex));
check('C1: every gate wired into the floor maps to a named taxonomy class (taxonomy is CLOSED)',
  unnamed.length === 0, { wiredCount: wired.size, indexedCount: Object.keys(gateIndex).length, unnamed });

// ── C2: every gate_index target class exists ──────────────────────────────────
const danglingClass = Object.entries(gateIndex).filter(([, cls]) => !classIds.has(cls));
check('C2: every gate_index entry targets a real taxonomy class', danglingClass.length === 0,
  { danglingClass: danglingClass.map(([g, c]) => `${g}->${c}`) });

// ── C3: every gate file named in gate_index exists on disk ────────────────────
const ghost = Object.keys(gateIndex).filter((g) => !fs.existsSync(path.join(dir, `${g}.ts`)) && !fs.existsSync(path.join(dir, `${g}.proof.mjs`)));
check('C3: every gate file named in gate_index exists on disk', ghost.length === 0, { ghost });

// ── C4: every enforced/partial class is backed by a real artifact ─────────────
const indexedClasses = new Set(Object.values(gateIndex));
function classHasArtifact(c) {
  if (indexedClasses.has(c.id)) return true;                       // a registry gate covers it
  // else: a referenced runtime/dynamic proof or helper file must exist
  return (c.gates || []).some((g) => {
    const base = String(g).split(' ')[0].replace(/\.proof.*/, '').replace(/[()]/g, '');
    return ['.proof.mjs', '.ts', '.mjs', '.js'].some((ext) =>
      fs.existsSync(path.join(dir, base + ext)) || fs.existsSync(path.join(dir, '..', base + ext)));
  });
}
const empty = tax.classes.filter((c) => (c.status === 'enforced' || c.status === 'partial') && !classHasArtifact(c));
check('C4: every enforced/partial class is backed by an existing gate or proof artifact', empty.length === 0,
  { empty: empty.map((c) => c.id) });

// ── C5: DISCRIMINATING — a synthetic wired gate absent from gate_index is caught ─
const syntheticWired = new Set([...wired, 'synthetic-uncovered-dimension-gate']);
const synthUnnamed = [...syntheticWired].filter((g) => !(g in gateIndex));
check('C5: a wired gate touching an UNNAMED dimension is caught (closure check can go RED)',
  synthUnnamed.length === 1 && synthUnnamed[0] === 'synthetic-uncovered-dimension-gate',
  { caught: synthUnnamed });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
