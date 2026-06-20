#!/usr/bin/env node
/**
 * gates/supply-chain-resolver-sync.proof.mjs — DRIFT GUARD for the duplicated supply-chain resolver.
 *
 * `gates/supply-chain-gate.ts` carries an INLINE COPY (its own header says so) of the stdlib sets whose
 * canonical home is `lang-supply-chain.mjs`. A silent divergence between the two is EXACTLY the failure
 * mode the dossier names in L22 ("the drift is HOW the leak hid from the prior audit"): one copy gets a
 * fix, the other is forgotten, and a supply-chain verdict quietly diverges. tsconfig is strict + Bundler
 * + allowJs:false with NO `.ts`-imports-`.mjs` precedent, so a literal code-level import-dedup is against
 * the codebase grain; the codebase's OWN pattern for guarded duplication is a freshness/equality proof
 * (cf. dist-freshness). This proof FAILS unless the inline GO_STDLIB / PY_STDLIB sets are set-EQUAL to the
 * canonical ones — so the copy can no longer drift unnoticed. Discriminating: a synthetic divergence is
 * caught (the comparator can go RED).
 *
 * Found+fixed at authoring: the inline PY_STDLIB had `'test'` (importable internal stdlib pkg, NOT in
 * sys.stdlib_module_names) that the canonical lacked → reconciled by adding `'test'` to the canonical
 * (the correctness-positive choice: `import test` resolves on disk, so judging it dangling is an L06
 * false-positive). After reconciliation the two sets are identical and this guard holds them so.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canon = readFileSync(path.join(SELF_DIR, 'lang-supply-chain.mjs'), 'utf8');
const gate = readFileSync(path.join(SELF_DIR, 'gates/supply-chain-gate.ts'), 'utf8');

function extractSet(txt, name) {
  const m = txt.match(new RegExp(name + '\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)'));
  if (!m) return null;
  return new Set([...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]));
}
function eqSet(a, b) {
  if (!a || !b || a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

for (const setName of ['GO_STDLIB', 'PY_STDLIB']) {
  const a = extractSet(canon, setName);
  const b = extractSet(gate, setName);
  record(`${setName}: inline copy is set-equal to canonical`, eqSet(a, b), {
    canonSize: a ? a.size : null,
    gateSize: b ? b.size : null,
    onlyInCanonical: a && b ? [...a].filter((x) => !b.has(x)).slice(0, 8) : null,
    onlyInGate: a && b ? [...b].filter((x) => !a.has(x)).slice(0, 8) : null,
  });
}
// discriminating control: the comparator MUST detect a synthetic drift
{
  const base = extractSet(canon, 'GO_STDLIB');
  const drifted = new Set(base);
  drifted.add('__synthetic_drift__');
  record('comparator catches a synthetic divergence (control)', eqSet(base, drifted) === false, { control: true });
}
const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, results }, null, 2));
process.exit(ok ? 0 : 1);
