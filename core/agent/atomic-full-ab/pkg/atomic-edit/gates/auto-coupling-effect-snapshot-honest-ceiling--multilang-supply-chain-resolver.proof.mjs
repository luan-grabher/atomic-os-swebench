// auto-coupling-effect-snapshot-honest-ceiling--multilang-supply-chain-resolver.proof.mjs
// AUTO-SELECTED by the P4 self-improvement loop (scripts/atomic-selfloop/selfloop.mjs) — NO agent
// in the selection. The loop mined held-out-validated couplings from the system's OWN disproof
// corpus, applied P5 memory (skipped already-admitted couplings), and ranked this one top by
// lift x fitness-headroom. Origin recorded as autonomous:selfloop in .atomic/candidate-origin.jsonl.
//   effect-snapshot-honest-ceiling => multilang-supply-chain-resolver
// observed lift 18.29, held-out 0.86. Self-contained: recomputes from the corpus, REDs only below floor 9.14.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
const json = process.argv.includes('--json');
let failures = 0;
function check(n, cond) { const ok = !!cond; if (!ok) failures += 1; if (!json) console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + n); }
const A = "gate.node gates/effect-snapshot-honest-ceiling.proof.mjs --json";
const B = "gate.node gates/multilang-supply-chain-resolver.proof.mjs --json";
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
else check('self-mined coupling persists: lift >= 9.14 and held-out >= 0.8', lift >= 9.14 && hc !== null && hc >= 0.8);
if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: "auto-coupling-effect-snapshot-honest-ceiling--multilang-supply-chain-resolver" }));
else console.log(failures === 0 ? 'OK - auto-coupling-effect-snapshot (0 failures)' : 'FAIL - auto-coupling-effect-snapshot (' + failures + ' failure(s))');
process.exit(failures === 0 ? 0 : 1);
