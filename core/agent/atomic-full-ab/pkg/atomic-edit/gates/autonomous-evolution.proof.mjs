// autonomous-evolution.proof.mjs — adversarial gate for the CLOSED autonomous loop.
// PROVES synthesizeCouplingGate authors a runnable, self-contained proof gate from an
// informative report, embeds the exact mined coupling, sets a floor <= the observed lift,
// and is DETERMINISTIC (same report -> same name+source). DISCRIMINATES: a report with no
// informative candidate authors NOTHING (null) — the system never fabricates an invariant
// it did not mine.
import { synthesizeCouplingGate } from '../autonomous-evolution.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

const report = { candidates: [
  { antecedent: 'gate.node gates/A.proof.mjs --json', consequent: 'gate.node gates/B.proof.mjs --json', lift: 12.0, holdoutConfidence: 1, support: 7, informative: true },
  { antecedent: 'X', consequent: 'Y', lift: 1.05, holdoutConfidence: 1, support: 9, informative: false },
] };
const g = synthesizeCouplingGate(report);
check('authors a gate from an informative report', !!g && typeof g.source === 'string');
check('gate name is regex-admissible and prefixed', !!g && /^[A-Za-z0-9_.-]+$/.test(g.name) && g.name.startsWith('auto-coupling-'));
check('source embeds the exact mined coupling', g.source.includes('gate.node gates/A.proof.mjs --json') && g.source.includes('gate.node gates/B.proof.mjs --json'));
check('authored gate is self-contained (node: builtins only, no relative import)', g.source.includes("from 'node:fs'") && !g.source.includes('hypothesis-generator'));
check('source is a runnable proof gate (check/process.exit/json verdict)', g.source.includes('process.exit(failures === 0 ? 0 : 1)') && g.source.includes('{ ok: failures === 0, failures, gate:'));
check('floor is a conservative fraction of the observed lift (1.1 <= floor <= lift)', g.floor <= report.candidates[0].lift && g.floor >= 1.1);
const g2 = synthesizeCouplingGate(report);
check('synthesis is deterministic (same report -> same source+name)', g2.name === g.name && g2.source === g.source);
check('authors NOTHING when no informative candidate exists (no fabrication)', synthesizeCouplingGate({ candidates: [{ antecedent: 'X', consequent: 'Y', lift: 1.0, informative: false }] }) === null);
check('authors NOTHING on an empty/degenerate report', synthesizeCouplingGate({ candidates: [] }) === null && synthesizeCouplingGate({}) === null);

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'autonomous-evolution' }));
else console.log(failures === 0 ? '\nOK — autonomous-evolution proof (0 failures)' : `\nFAIL — autonomous-evolution proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
