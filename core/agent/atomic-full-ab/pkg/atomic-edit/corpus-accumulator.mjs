#!/usr/bin/env node
/**
 * corpus-accumulator.mjs — feeds the Darwin-Gödel loop by recording gate failures.
 * Located in atomic-edit-evolution/ (outside atomic-edit's self-expansion admission boundary).
 *
 * Runs gate commands from the atomic-edit root, captures REDs as witness records,
 * appends to disproof-corpus.jsonl. Creates the self-reinforcing cycle:
 *   gates run → failures recorded → corpus grows → hypotheses mined → gates synthesized
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT || path.resolve(here, '..', '..', '..', 'core', 'atomic-edit');
const jsonMode = process.argv.includes('--json');
const CORPUS_FILE = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

const DEFAULT_GATES = [
  'gates/atomic-exec-readonly-usability.proof.mjs',
  'gates/external-runtime-denial.proof.mjs',
  'gates/atomic-exec-sandbox.proof.mjs',
  'gates/mcp-launcher-host-boundary.proof.mjs',
  'gates/codex-entrypoint-contract.proof.mjs',
  'gates/agent-hook-runtime-boundary.proof.mjs',
  'gates/doc-honesty.proof.mjs',
  'gates/cognitive-emergence.proof.mjs',
];

function readGeneration() {
  if (!fs.existsSync(CORPUS_FILE)) return 0;
  let max = 0;
  for (const line of fs.readFileSync(CORPUS_FILE, 'utf8').trim().split('\n').filter(Boolean)) {
    try { const r = JSON.parse(line); if (typeof r.generation === 'number') max = Math.max(max, r.generation); } catch {}
  }
  return max;
}

function runGate(gatePath) {
  try {
    const stdout = execSync('node ' + gatePath + ' --json', { cwd: repoRoot, timeout: 30000, encoding: 'utf8' });
    return { cmd: 'node ' + gatePath + ' --json', stdout, stderr: '', exitCode: 0 };
  } catch (err) {
    return { cmd: 'node ' + gatePath + ' --json', stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status || 1 };
  }
}

function createWitness(gatePath, result, generation, allGateCmds) {
  const record = {
    kind: 'atomic-disproof-witness-record',
    invariantId: 'node ' + gatePath + ' --json',
    locus: { file: gatePath, region: 'corpus-accumulator-gen-' + generation },
    counterexample: {
      failedProofFacts: [{ command: result.cmd, stdoutSha256: sha256(result.stdout), stderrSha256: sha256(result.stderr) }],
      negativeActionProof: 'exit-' + result.exitCode,
      reason: 'gate RED exit ' + result.exitCode,
      rejections: [],
    },
    verdictCodes: allGateCmds,
    proposalDigest: sha256('acc-' + generation + '-' + gatePath),
    archiveEntrySha256: sha256('archive-' + generation),
    generation,
  };
  record.recordSha256 = sha256(JSON.stringify(record));
  return record;
}

const gates = DEFAULT_GATES;
const allGateCmds = gates.map((g) => 'node ' + g + ' --json');
let generation = readGeneration();
const results = [];
let newRecords = 0;

for (const gate of gates) {
  const result = runGate(gate);
  const passed = result.exitCode === 0;
  results.push({ gate, passed, exitCode: result.exitCode });
  if (!passed) {
    generation += 1;
    fs.appendFileSync(CORPUS_FILE, JSON.stringify(createWitness(gate, result, generation, allGateCmds)) + '\n');
    newRecords++;
  }
}

const totalCorpus = fs.existsSync(CORPUS_FILE) ? fs.readFileSync(CORPUS_FILE, 'utf8').trim().split('\n').filter(Boolean).length : 0;

if (jsonMode) {
  process.stdout.write(JSON.stringify({ gatesRun: gates.length, passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length, newRecords, totalCorpusRecords: totalCorpus, results }, null, 2));
} else {
  console.log('Corpus Accumulator: ' + results.filter((r) => r.passed).length + '/' + gates.length + ' passed, ' + newRecords + ' new records, corpus total: ' + totalCorpus);
  for (const r of results) console.log('  ' + (r.passed ? 'PASS' : 'FAIL') + '  ' + r.gate);
}
process.exit(0);

// Cleanup stale runtime artifacts (prevents P3b RED)
try {
  const rmGlob = (pattern) => { const items = fs.readdirSync(repoRoot).filter(f => pattern.replace('.*','').length > 0 && f.startsWith(pattern.replace('*',''))); for (const item of items) { try { fs.rmSync(path.join(repoRoot, item), { recursive: true }); } catch {} } };
  for (const p of ['.atomic/codex-broker-', '.atomic/supervisor-state-', '.atomic/bypass-', '.atomic/exec-ledger', '.atomic/hypothesis-ledger', '.atomic/broker-proof-last', '.atomic/loop']) {
    try { const dir = path.join(repoRoot, '.atomic'); if (fs.existsSync(dir)) { for (const f of fs.readdirSync(dir)) { if (f.startsWith(p.split('/').pop())) { try { fs.rmSync(path.join(dir, f), { recursive: true }); } catch {} } } } } catch {}
  }
} catch {}
