// planner.proof.mjs — adversarial gate for the bounded planner (Phase 7).
// PROVES greedy minimal-cover picks the highest-marginal-coverage invariant first, is
// deterministic, terminates, respects maxSteps, and never fabricates on an empty corpus.
import { planMinimalCover } from '../planner.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

// Z covers {A,B,C}; W covers {A}. Greedy must pick Z first (gain 3), then stop (W adds 0 new).
const report = { candidates: [
  { antecedent: 'A', consequent: 'Z', informative: true },
  { antecedent: 'B', consequent: 'Z', informative: true },
  { antecedent: 'C', consequent: 'Z', informative: true },
  { antecedent: 'A', consequent: 'W', informative: true },
  { antecedent: 'D', consequent: 'TRIV', informative: false },
] };
const r = planMinimalCover(report, {});
check('greedy picks highest-coverage invariant Z first (marginal 3)', r.plan[0] && r.plan[0].invariant === 'Z' && r.plan[0].marginalCoverage === 3);
check('does not add a fully-redundant invariant (W adds 0 new)', !r.plan.some((p) => p.invariant === 'W'));
check('ignores non-informative couplings (TRIV excluded; universe 3)', !r.plan.some((p) => p.invariant === 'TRIV') && r.universeSize === 3);
check('cumulative coverage is monotone non-decreasing', r.plan.every((p, i) => i === 0 || p.cumulativeCoverage >= r.plan[i - 1].cumulativeCoverage));
const r2 = planMinimalCover(report, {});
check('plan is deterministic (same input -> same plan)', JSON.stringify(r2.plan) === JSON.stringify(r.plan));
check('empty corpus -> empty plan (no fabrication)', planMinimalCover({ candidates: [] }, {}).plan.length === 0 && planMinimalCover({}, {}).plan.length === 0);
check('respects maxSteps bound', planMinimalCover({ candidates: [{ antecedent: 'a1', consequent: 'p1', informative: true }, { antecedent: 'a2', consequent: 'p2', informative: true }, { antecedent: 'a3', consequent: 'p3', informative: true }] }, { maxSteps: 2 }).plan.length <= 2);

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'planner' }));
else console.log(failures === 0 ? '\nOK — planner proof (0 failures)' : `\nFAIL — planner proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
