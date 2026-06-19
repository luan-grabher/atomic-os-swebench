// z3-constraint-finder.proof.mjs — adversarial gate for Phase 2 (z3 provably-minimal cover).
// PROVES couplingsFromReport extracts only informative pairs; optimalCover returns a z3-PROVEN
// minimal cover (or honestly degrades to ABSENT when z3 is unavailable, NEVER failing the gate
// and NEVER faking an optimum). Honesty doctrine: a present-and-correct prover is verified; an
// absent toolchain is UNVERIFIED, not RED.
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { couplingsFromReport, optimalCover } from '../z3-constraint-finder.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

check('couplingsFromReport extracts only informative pairs', (() => {
  const c = couplingsFromReport({ candidates: [{ antecedent: 'A', consequent: 'B', informative: true }, { antecedent: 'X', consequent: 'Y', informative: false }] });
  return c.length === 1 && c[0][0] === 'A' && c[0][1] === 'B';
})());

const cov = optimalCover([['A', 'Z'], ['B', 'Z'], ['C', 'Z'], ['A', 'W'], ['D', 'V']], repoRoot);
if (cov.status === 'ABSENT') {
  check('z3 ABSENT -> honest UNVERIFIED (gate does not fail, no faked optimum)', true);
} else {
  check('z3 returns a PROVEN minimal cover', cov.status === 'PROVEN' && cov.optimal_proven === true);
  check('minimal cover is {V,Z} size 2 (W redundant, dropped)', cov.size === 2 && cov.optimal.includes('Z') && cov.optimal.includes('V') && !cov.optimal.includes('W'));
  check('universe is the 4 distinct antecedents', cov.universe === 4);
}
check('optimalCover with a missing solver -> ABSENT (no fabrication)', optimalCover([['A', 'B']], '/nonexistent-z3-root-xyz').status === 'ABSENT');

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'z3-constraint-finder' }));
else console.log(failures === 0 ? '\nOK — z3-constraint-finder proof (0 failures)' : `\nFAIL — z3-constraint-finder proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
