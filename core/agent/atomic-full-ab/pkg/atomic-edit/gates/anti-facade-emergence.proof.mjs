#!/usr/bin/env node
/**
 * anti-facade-emergence.proof.mjs — ENFORCES the project's own anti-facade contract.
 *
 * `emergence-report.mjs` states the rule in prose: "The string 'proven' is deliberately
 * never emitted for an emergence claim. Strong cognition is not machine-decidable; a
 * detector that auto-announced it would be exactly the fabrication this project forbids."
 *
 * Until now that was a COMMENT, not a GATE — which is exactly how the L12
 * "PROVEN — two independent forms of cognitive emergence" facade slipped into
 * gates/COGNITIVE-EMERGENCE-EVIDENCE.md. This gate makes the contract executable:
 * it scans tracked docs/proofs and FAILS if any line ASSERTS emergence/cognition as
 * achieved/proven. Negations, withdrawals, and "what would count" framing are exempt —
 * the rule bans the false CLAIM, not honest discussion of why the claim is false.
 *
 * Scope: gates/*.md, gates/*.proof.mjs, docs/**, and repo-root *.md.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const here = path.dirname(fileURLToPath(import.meta.url)); // gates/
const pkg = path.resolve(here, '..');                      // core/atomic-edit

// Assertive facade patterns: a claim that emergence/cognition is real/proven/achieved.
const FACADE = [
  /this is (genuine |strong )?cognitive emergence/i,
  /\bproven\b[^.\n]{0,50}\b(emergence|cognition|cognitive)\b/i,
  /\b(emergence|cognition|cognitive)\b[^.\n]{0,50}\bproven\b/i,
  /two independent forms of[^.\n]{0,30}emergence/i,
  /exceeded the (llm'?s|model'?s) (capability )?ceiling/i,
  /constitutes[^.\n]{0,40}cognitive emergence/i,
];

// A line that also carries any of these is honest discussion/negation, not a claim.
const EXEMPT = /\b(not|never|without|withdrawn|withdraw|forbidden|deliberately|cannot|can't|unproven|isn'?t|doesn'?t|no longer|formerly|de-?facad|category error|would (actually )?count|never be|would be exactly the fabrication|anti-facade|facade)\b/i;

function listFiles() {
  const out = [];
  const add = (p) => { try { if (fs.existsSync(p)) out.push(p); } catch { /* ignore */ } };
  const dir = (d, filter) => {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') dir(full, filter); }
      else if (filter(e.name)) add(full);
    }
  };
  dir(path.join(pkg, 'gates'), (n) => n.endsWith('.md') || n.endsWith('.proof.mjs'));
  dir(path.join(pkg, 'docs'), (n) => n.endsWith('.md'));
  for (const n of (() => { try { return fs.readdirSync(pkg); } catch { return []; } })()) {
    if (n.endsWith('.md')) add(path.join(pkg, n));
  }
  return out;
}

const violations = [];
for (const file of listFiles()) {
  // Never lint this gate itself or its own self-test fixtures.
  if (path.basename(file) === 'anti-facade-emergence.proof.mjs') continue;
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (EXEMPT.test(line)) continue;
    for (const re of FACADE) {
      if (re.test(line)) {
        violations.push({ file: path.relative(pkg, file), line: i + 1, text: line.trim().slice(0, 120), pattern: String(re) });
        break;
      }
    }
  }
}

// Self-test: the gate MUST catch the exact L12 facade phrasing if it ever returns.
const SELFTEST_POSITIVES = [
  'Status: PROVEN — two independent forms of emergence demonstrated',
  'This IS cognitive emergence: the SYSTEM > the COMPONENT.',
  'The system EXCEEDED the LLM\'s capability ceiling.',
];
const SELFTEST_NEGATIVES = [
  'This is a MECHANISM property (memoized retry), NOT cognition.',
  'the string "proven" is deliberately never emitted for an emergence claim',
  'its real-world lift is unproven',
];
const catchesPositives = SELFTEST_POSITIVES.every((l) => !EXEMPT.test(l) && FACADE.some((re) => re.test(l)));
const passesNegatives = SELFTEST_NEGATIVES.every((l) => EXEMPT.test(l) || !FACADE.some((re) => re.test(l)));

const ok = violations.length === 0 && catchesPositives && passesNegatives;
const payload = { ok, violations, selfTest: { catchesPositives, passesNegatives } };

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  if (!catchesPositives) console.log('FAIL self-test: gate does not catch known facade phrasing');
  if (!passesNegatives) console.log('FAIL self-test: gate flags honest negation as facade');
  for (const v of violations) console.log(`FACADE  ${v.file}:${v.line}  ${v.text}`);
  console.log(ok ? `PASS anti-facade-emergence: no asserted emergence/cognition claims (${violations.length} violations)` : `FAIL anti-facade-emergence: ${violations.length} violation(s)`);
}
process.exit(ok ? 0 : 1);
