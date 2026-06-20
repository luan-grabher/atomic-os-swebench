// auto-coupling-self-expansion-dist-rollback--resource-lifetime.proof.mjs - AUTO-SYNTHESIZED by autonomous-evolution.mjs (no human author).
// The system authored this invariant from its OWN corpus: the held-out-validated coupling
//   gate.node gates/self-expansion-dist-rollback.proof.mjs --json
//   => gate.node gates/resource-lifetime.proof.mjs --json
// observed lift 31.13, held-out 1.00. Self-contained: recomputes from the corpus, REDs only below floor lift 15.56.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
const json = process.argv.includes('--json');
let failures = 0;
function check(n, cond) { const ok = !!cond; if (!ok) failures += 1; if (!json) console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + n); }
const A = "gate.node gates/self-expansion-dist-rollback.proof.mjs --json";
const B = "gate.node gates/resource-lifetime.proof.mjs --json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
const recs = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split(String.fromCharCode(10)).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const gens = recs.map((r) => new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : [])));
const train = gens.filter((_, i) => i % 2 === 0);
const hold = gens.filter((_, i) => i % 2 === 1);
const co = (s, x, y) => s.filter((g) => g.has(x) && g.has(y)).length;
const ca = (s, x) => s.filter((g) => g.has(x)).length;
const total = gens.length;
const base = total ? gens.filter((g) => g.has(B)).length / total : 0;
const ax = ca(train, A);
const conf = ax ? co(train, A, B) / ax : 0;
const lift = base ? conf / base : 0;
const hax = ca(hold, A);
const hc = hax ? co(hold, A, B) / hax : null;
if (ax < 2) check('coupling N/A: antecedent below support in corpus (not a regression)', true);
else check('self-mined coupling persists: lift >= 15.56 and held-out >= 0.8', lift >= 15.56 && hc !== null && hc >= 0.8);
if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: "auto-coupling-self-expansion-dist-rollback--resource-lifetime" }));
else console.log(failures === 0 ? 'OK - auto-coupling-self-expansion-dist-rollback--resource-lifetime (0 failures)' : 'FAIL - auto-coupling-self-expansion-dist-rollback--resource-lifetime (' + failures + ' failure(s))');
process.exit(failures === 0 ? 0 : 1);
