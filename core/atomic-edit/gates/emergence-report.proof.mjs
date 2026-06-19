// emergence-report.proof.mjs — adversarial gate for the honest emergence-report surface.
// PROVES: silent (no candidate) on all-known-agent data; fires F1 ONLY on a genuine
// unknown-agent feed event; renders a one-line VERDICT when clear; and NEVER emits the word
// 'proven' for an emergence claim (anti-facade). Uses temp .atomic fixtures, never the real corpus.
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { computeEmergenceReport, renderEmergenceReport, KNOWN_AGENTS } from '../emergence-report.mjs';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

function mkRepo(feedLines) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'emrep-'));
  fs.mkdirSync(path.join(root, '.atomic'), { recursive: true });
  fs.writeFileSync(path.join(root, '.atomic', 'emergence-feed.jsonl'), feedLines.map((o) => JSON.stringify(o)).join('\n') + '\n');
  return root;
}

// (1) all-known-agent feed -> ZERO candidates, silent verdict.
let root = mkRepo([
  { v: 1, kind: 'edit', agent: 'claude-code', file: 'a.ts', previousSha: null, recordSha: 's1' },
  { v: 1, kind: 'edit', agent: 'host', file: 'b.ts', previousSha: 's1', recordSha: 's2' },
]);
let rep = computeEmergenceReport(root);
check('all-known-agent feed -> 0 candidates (silent normal state)', rep.candidates.length === 0);
let text = renderEmergenceReport(rep);
check('renders a single no-candidate VERDICT line', /VERDICT: no strong-emergence candidate/.test(text));
fs.rmSync(root, { recursive: true, force: true });

// (2) an UNKNOWN-agent edit -> exactly one F1 candidate.
root = mkRepo([
  { v: 1, kind: 'edit', agent: 'claude-code', file: 'a.ts', previousSha: null, recordSha: 's1' },
  { v: 1, kind: 'edit', agent: 'atomic-itself', file: 'self.ts', previousSha: 's1', recordSha: 's2' },
]);
rep = computeEmergenceReport(root);
check('unknown-agent edit -> exactly one F1 candidate', rep.candidates.filter((c) => c.fingerprint === 'F1').length === 1);
check('F1 candidate carries recomputable evidence (recordSha)', rep.candidates[0].evidence.recordSha === 's2');
text = renderEmergenceReport(rep);
check('fires a CANDIDATE line labeled for human verification', /⚠ CANDIDATE \[F1\]/.test(text) && /HUMAN VERIFICATION/.test(text));
fs.rmSync(root, { recursive: true, force: true });

// (3) ANTI-FACADE: the report never claims cognition is proven.
check('report text never emits the word "proven" (no fabricated cognition claim)', !/proven/i.test(text));
check('known-agent set excludes a fabricated autonomous actor', !KNOWN_AGENTS.has('atomic-itself'));

// (4) missing .atomic -> empty, no crash, no candidates (no fabrication on absent data).
rep = computeEmergenceReport('/nonexistent-emrep-xyz-987');
check('absent data -> no candidates, no crash', rep.candidates.length === 0 && rep.context.feedEvents === 0);

// (5) F2: a KNOWN-generator autonomous admission is expected mechanical autonomy -> NO candidate (silent).
root = mkRepo([{ v: 1, kind: 'edit', agent: 'claude-code', file: 'a.ts', previousSha: null, recordSha: 's1' }]);
fs.writeFileSync(path.join(root, '.atomic', 'candidate-origin.jsonl'), JSON.stringify({ candidateId: 'g1', origin: 'autonomous:selfloop', recordSha256: 'o1' }) + '\n');
rep = computeEmergenceReport(root);
check('F2: known-generator autonomous admission -> no candidate (silent on mechanical autonomy)', rep.candidates.filter((c) => c.fingerprint === 'F2').length === 0);
check('F2: known-generator admission still counted in context', rep.context.autonomousAdmissions === 1);
fs.rmSync(root, { recursive: true, force: true });

// (6) F2: an UNKNOWN-source autonomous admission -> exactly one F2 candidate for human verification.
root = mkRepo([{ v: 1, kind: 'edit', agent: 'claude-code', file: 'a.ts', previousSha: null, recordSha: 's1' }]);
fs.writeFileSync(path.join(root, '.atomic', 'candidate-origin.jsonl'), JSON.stringify({ candidateId: 'g2', origin: 'autonomous:mystery-process', recordSha256: 'o2' }) + '\n');
rep = computeEmergenceReport(root);
check('F2: unknown-source autonomous admission -> exactly one F2 candidate', rep.candidates.filter((c) => c.fingerprint === 'F2').length === 1);
fs.rmSync(root, { recursive: true, force: true });

// (7) F3: an INTACT corpus chain -> no F3 candidate (silent); a BROKEN chain -> exactly one F3.
root = mkRepo([{ v: 1, kind: 'edit', agent: 'claude-code', file: 'a.ts', previousSha: null, recordSha: 's1' }]);
fs.writeFileSync(path.join(root, '.atomic', 'disproof-corpus.jsonl'), [JSON.stringify({ invariantId: 'i1', previousRecordSha256: null, recordSha256: 'c1' }), JSON.stringify({ invariantId: 'i2', previousRecordSha256: 'c1', recordSha256: 'c2' })].join('\n') + '\n');
rep = computeEmergenceReport(root);
check('F3: intact corpus chain -> no F3 candidate (silent)', rep.candidates.filter((c) => c.fingerprint === 'F3').length === 0 && rep.context.corpusChainIntact === true);
fs.rmSync(root, { recursive: true, force: true });

root = mkRepo([{ v: 1, kind: 'edit', agent: 'claude-code', file: 'a.ts', previousSha: null, recordSha: 's1' }]);
fs.writeFileSync(path.join(root, '.atomic', 'disproof-corpus.jsonl'), [JSON.stringify({ invariantId: 'i1', previousRecordSha256: null, recordSha256: 'c1' }), JSON.stringify({ invariantId: 'i2', previousRecordSha256: 'WRONG', recordSha256: 'c2' })].join('\n') + '\n');
rep = computeEmergenceReport(root);
check('F3: broken corpus chain -> exactly one F3 candidate (unexplained writer)', rep.candidates.filter((c) => c.fingerprint === 'F3').length === 1);
fs.rmSync(root, { recursive: true, force: true });

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'emergence-report' }));
else console.log(failures === 0 ? '\nOK — emergence-report proof (0 failures)' : `\nFAIL — emergence-report proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
