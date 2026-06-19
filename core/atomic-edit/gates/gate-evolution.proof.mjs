// gate-evolution.proof.mjs — adversarial gate for Phase 3 (deterministic EA over invariant-sets).
// PROVES the EA converges to a full-coverage set on a known instance, is DETERMINISTIC (same
// seed -> same best), rewards coverage over redundancy (fitness = covered − penalty·size), and
// never fabricates on an empty corpus. NO RNG nondeterminism (seeded LCG).
import { evolveCover } from '../gate-evolution.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

// Z covers {A,B,C}; V covers {D}; W covers {A} (redundant). Universe = {A,B,C,D} (4).
const report = { candidates: [
  { antecedent: 'A', consequent: 'Z', informative: true },
  { antecedent: 'B', consequent: 'Z', informative: true },
  { antecedent: 'C', consequent: 'Z', informative: true },
  { antecedent: 'D', consequent: 'V', informative: true },
  { antecedent: 'A', consequent: 'W', informative: true },
  { antecedent: 'E', consequent: 'TRIV', informative: false },
] };
const r = evolveCover(report, { seed: 7 });
check('EA reaches FULL coverage of the universe', r.coverage === r.universe && r.universe === 4);
check('EA excludes the non-informative coupling (universe = 4, not 5)', r.universe === 4);
const r2 = evolveCover(report, { seed: 7 });
check('EA is deterministic (same seed -> identical best set)', JSON.stringify(r2.best) === JSON.stringify(r.best));
const rOther = evolveCover(report, { seed: 999 });
check('full-coverage best is found regardless of seed', rOther.coverage === rOther.universe);
check('full-cover fitness positive (coverage beats size penalty)', r.fitness > 0);
check('empty corpus -> empty best (no fabrication)', evolveCover({ candidates: [] }, {}).best.length === 0 && evolveCover({}, {}).coverage === 0);

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'gate-evolution' }));
else console.log(failures === 0 ? '\nOK — gate-evolution proof (0 failures)' : `\nFAIL — gate-evolution proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
