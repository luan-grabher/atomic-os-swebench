// meta-evaluation.proof.mjs — adversarial gate for Phases 5+6 (bounded meta-evaluation).
// PROVES scoreGates classifies a high-base-rate/low-lift invariant as 'noise-like' and a
// selective/high-lift one as 'informative'; parameterSensitivity is monotone (informative
// count non-increasing as minLift rises) while validated count is invariant. No fabrication.
import { scoreGates, parameterSensitivity } from '../meta-evaluation.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

const report = { candidates: [
  { consequent: 'NOISE', consequentBaseRate: 0.9, lift: 1.0, informative: false },
  { consequent: 'GOOD', consequentBaseRate: 0.1, lift: 5.0, informative: true },
] };
const s = scoreGates(report);
check('near-universal/low-lift invariant classified noise-like', s.noiseLike.includes('NOISE'));
check('selective/high-lift invariant classified informative', s.informative.includes('GOOD'));
check('gates sorted by lift (GOOD before NOISE)', s.gates[0].invariant === 'GOOD');
check('empty report -> no gates (no fabrication)', scoreGates({ candidates: [] }).gates.length === 0 && scoreGates({}).gates.length === 0);

const hits = [];
for (let g = 0; g < 6; g += 1) { hits.push({ generation: `g${g}`, invariantId: 'A' }); hits.push({ generation: `g${g}`, invariantId: 'B' }); }
hits.push({ generation: 'g6', invariantId: 'F' });
hits.push({ generation: 'g7', invariantId: 'F' });
const sens = parameterSensitivity(hits, [{ minLift: 1.1 }, { minLift: 2 }, { minLift: 100 }]);
check('sensitivity: informative count monotone non-increasing as minLift rises', sens[0].informative >= sens[1].informative && sens[1].informative >= sens[2].informative);
check('sensitivity: a lift~1.33 coupling is informative at 1.1 but not at 2', sens[0].informative > 0 && sens[1].informative === 0);
check('sensitivity: validated (proposed) count is invariant to minLift', sens[0].proposed === sens[2].proposed);

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'meta-evaluation' }));
else console.log(failures === 0 ? '\nOK — meta-evaluation proof (0 failures)' : `\nFAIL — meta-evaluation proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
