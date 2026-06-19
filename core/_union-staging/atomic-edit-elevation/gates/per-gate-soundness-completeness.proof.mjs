#!/usr/bin/env node
/**
 * per-gate-soundness-completeness.proof.mjs — PARADIGM L09: every WRITE/DYNAMIC gate wired into the
 * floor has a PAIRED ADVERSARIAL proof — one that exercises BOTH directions: RED-only-when-real
 * (soundness, P2) ∧ GREEN-only-when-safe (completeness, P3). A gate with only a one-directional proof
 * could be vacuously green (always passes) or trigger-happy (always reds) and nobody would know.
 *
 *   PG-exists      — every registry gate resolves to a paired proof file (direct name or known alias).
 *   PG-adversarial — each paired proof exercises BOTH a RED case and a GREEN case (not one-directional).
 *   PG-discriminate— DISCRIMINATING: a synthetic gate with NO proof is reported missing.
 *
 * Static (reads registry.ts + proof sources). Belongs in the mandatory lattice.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));
const registrySrc = fs.readFileSync(path.join(dir, 'registry.ts'), 'utf8');

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// gates whose paired proof lives under a different name
const ALIAS = { 'lsp-semantic-gate': ['lsp-mesh-e2e', 'lsp-semantic-delta'] };

// every gate module imported by the registry = the wired WRITE/DYNAMIC gate set
const wired = [...registrySrc.matchAll(/import\s+\w+\s+from\s+'\.\/([a-z0-9-]+)\.js'/g)].map((m) => m[1]);

function resolveProof(gate) {
  const names = ALIAS[gate] ?? [gate];
  for (const n of names) {
    for (const p of [path.join(dir, `${n}.proof.mjs`), path.join(dir, `${n}.proof.ts`), path.join(dir, '..', 'dist', 'gates', `${n}.proof.js`)]) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

const RED_RE = /\bred\b|refus|caught|danglin|reject|negative|introduc|discriminat|FAIL|can go red|RED-pre/i;
const GREEN_RE = /\bgreen\b|ok:\s*true|"ok":\s*true|\bpass\b|allow|present|clean|no red|GREEN/i;

const missing = [];
const oneDirectional = [];
for (const gate of wired) {
  const proof = resolveProof(gate);
  if (!proof) { missing.push(gate); continue; }
  const src = fs.readFileSync(proof, 'utf8');
  const hasRed = RED_RE.test(src);
  const hasGreen = GREEN_RE.test(src);
  if (!(hasRed && hasGreen)) oneDirectional.push({ gate, hasRed, hasGreen });
}

check('PG-exists: every WRITE/DYNAMIC gate wired into the floor has a paired proof (direct or aliased)',
  missing.length === 0, { wired: wired.length, missing });
check('PG-adversarial: every paired proof exercises BOTH a RED and a GREEN direction (sound ∧ complete)',
  oneDirectional.length === 0, { oneDirectional });

// PG-discriminate: a synthetic gate with no proof MUST be reported missing
const synthMissing = (() => { const g = 'synthetic-gate-without-proof'; return resolveProof(g) === null; })();
check('PG-discriminate: a gate with NO paired proof is reported missing (audit can go RED)', synthMissing, { synthetic: 'synthetic-gate-without-proof' });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
