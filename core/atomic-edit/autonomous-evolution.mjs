#!/usr/bin/env node
/**
 * autonomous-evolution.mjs — the CLOSED autonomous loop (no LLM, no agent in the loop).
 *
 * Reads Atomic's OWN corpus via the hypothesis generator, takes the single strongest
 * held-out-validated, high-lift coupling it mined, and SYNTHESIZES a SELF-CONTAINED proof
 * gate that re-reads the corpus and ASSERTS that coupling persists — a NEW invariant the
 * system authored from its own failure history, of a kind no human wrote. Sound by
 * construction: it only asserts a held-out-validated property of append-only data and
 * changes no engine logic; it REDs only if a FUTURE corpus weakens the coupling below a
 * conservative floor. The authored gate imports only node: builtins (no relative wires).
 *
 * The driver does NOT write to the engine tree itself (that would bypass admission). It
 * EMITS the synthesized gate (name + source); admission through the full self-expansion
 * lattice remains the judge. Run unattended:
 *   node autonomous-evolution.mjs [repoRoot] [--emit <path>]
 */
import * as fs from 'node:fs';
import { proposeFromCorpus, writeProposalLedger } from './hypothesis-generator.mjs';

const short = (s) => {
  let t = String(s);
  if (t.startsWith('gate.node gates/')) t = t.slice('gate.node gates/'.length);
  else if (t.startsWith('gate.node ')) t = t.slice('gate.node '.length);
  t = t.split(' --json')[0].replace('.proof.mjs', '');
  if (t.endsWith('.ts')) t = t.slice(0, -3);
  return t;
};
const slug = (s) => short(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36).toLowerCase();

/**
 * Synthesize a SELF-CONTAINED proof-gate source asserting the top informative coupling in
 * `report`. Returns null when there is no informative candidate (the system authors nothing
 * it did not mine). Deterministic: same report -> same name + source.
 */
export function synthesizeCouplingGate(report) {
  const top = (report.candidates ?? []).find((c) => c.informative);
  if (!top) return null;
  const name = ('auto-coupling-' + slug(top.antecedent) + '--' + slug(top.consequent)).slice(0, 78).replace(/-+$/, '');
  const floor = Math.max(1.1, Math.floor(top.lift * 0.5 * 100) / 100);
  const a = JSON.stringify(top.antecedent);
  const c = JSON.stringify(top.consequent);
  const fl = floor.toFixed(2);
  const lines = [
    '// ' + name + '.proof.mjs - AUTO-SYNTHESIZED by autonomous-evolution.mjs (no human author).',
    '// The system authored this invariant from its OWN corpus: the held-out-validated coupling',
    '//   ' + top.antecedent,
    '//   => ' + top.consequent,
    '// observed lift ' + Number(top.lift).toFixed(2) + ', held-out ' + Number(top.holdoutConfidence).toFixed(2) + '. Self-contained: recomputes from the corpus, REDs only below floor lift ' + fl + '.',
    "import * as fs from 'node:fs';",
    "import * as path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "const json = process.argv.includes('--json');",
    'let failures = 0;',
    "function check(n, cond) { const ok = !!cond; if (!ok) failures += 1; if (!json) console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + n); }",
    'const A = ' + a + ';',
    'const B = ' + c + ';',
    "let repoRoot = path.dirname(fileURLToPath(import.meta.url)); for (let i = 0; i < 8; i++) { if (fs.existsSync(path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl'))) break; repoRoot = path.dirname(repoRoot); }",
    "const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');",
    "const recs = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split(String.fromCharCode(10)).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];",
    'const gens = recs.map((r) => new Set(Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : (r.invariantId ? [r.invariantId] : [])));',
    'const train = gens.filter((_, i) => i % 2 === 0);',
    'const hold = gens.filter((_, i) => i % 2 === 1);',
    'const co = (s, x, y) => s.filter((g) => g.has(x) && g.has(y)).length;',
    'const ca = (s, x) => s.filter((g) => g.has(x)).length;',
    'const total = gens.length;',
    'const base = total ? gens.filter((g) => g.has(B)).length / total : 0;',
    'const ax = ca(train, A);',
    'const conf = ax ? co(train, A, B) / ax : 0;',
    'const lift = base ? conf / base : 0;',
    'const hax = ca(hold, A);',
    'const hc = hax ? co(hold, A, B) / hax : null;',
    "if (ax < 2) check('coupling N/A: antecedent below support in corpus (not a regression)', true);",
    "else check('self-mined coupling persists: lift >= " + fl + " and held-out >= 0.8', lift >= " + fl + " && hc !== null && hc >= 0.8);",
    'if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: ' + JSON.stringify(name) + ' }));',
    "else console.log(failures === 0 ? 'OK - " + name + " (0 failures)' : 'FAIL - " + name + " (' + failures + ' failure(s))');",
    'process.exit(failures === 0 ? 0 : 1);',
    '',
  ];
  return { name, fileRel: 'scripts/mcp/atomic-edit/gates/' + name + '.proof.mjs', source: lines.join('\n'), coupling: { antecedent: top.antecedent, consequent: top.consequent, lift: top.lift, holdoutConfidence: top.holdoutConfidence }, floor };
}

// CLI: run the closed loop once, unattended. Proposes from the real corpus, records the
// proposal to the ledger, and emits the synthesized invariant gate (to --emit path or stdout).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const repoRoot = argv.find((x) => !x.startsWith('--')) || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  const report = proposeFromCorpus(repoRoot, {});
  writeProposalLedger(repoRoot, report);
  const gate = synthesizeCouplingGate(report);
  const emitIdx = argv.indexOf('--emit');
  if (gate && emitIdx >= 0 && argv[emitIdx + 1]) {
    fs.writeFileSync(argv[emitIdx + 1], gate.source, 'utf8');
    console.log(JSON.stringify({ synthesized: gate.name, fileRel: gate.fileRel, coupling: gate.coupling, emittedTo: argv[emitIdx + 1] }, null, 2));
  } else {
    console.log(JSON.stringify(gate ? { synthesized: gate.name, fileRel: gate.fileRel, coupling: gate.coupling } : { synthesized: null, reason: 'no informative coupling in corpus' }, null, 2));
  }
}

// Ratified: this closed-loop driver and the invariant it authored were admitted through the
// full self-expansion lattice after the effect-snapshot deadlock (leaked unreadable build
// temps) was cleared. The system now authors invariants from its own corpus, gate-verified.
