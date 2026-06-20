#!/usr/bin/env node
/**
 * paradigm-verify-parallel.mjs — runs paradigm-verify gates in parallel batches.
 *
 * The build gate runs first (everything depends on it). Then all other gates
 * run concurrently. Typical speedup: 80s → 25s (3x).
 *
 * Usage: node paradigm-verify-parallel.mjs
 */
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHECKS = [
  { id: 'build', cmd: 'node', args: ['build.mjs'], parallel: false },
  { id: 'P2', cmd: 'node', args: ['gates/byte-floor-soundness.proof.mjs', '--json'], parallel: true },
  { id: 'P3', cmd: 'node', args: ['gates/process-endpoint-leak.proof.mjs', '--json'], parallel: true },
  { id: 'P3b', cmd: 'node', args: ['gates/temp-artifact-hygiene.proof.mjs', '--json'], parallel: true },
  { id: 'P4', cmd: 'node', args: ['gates/closure-meta-gate.proof.mjs', '--json'], parallel: true },
  { id: 'lattice', cmd: 'node', args: ['gates/lattice-completeness.proof.ts', '--json'], parallel: true },
  { id: 'P7-z3', cmd: 'python3', args: ['formal/atomic-algebra/confluence_z3.py'], parallel: true },
  { id: 'P7-lean', cmd: 'lean', args: ['formal/atomic-algebra/NwayConfluence.lean'], parallel: true },
  { id: 'doc-honesty', cmd: 'node', args: ['gates/doc-honesty.proof.mjs', '--json'], parallel: true },
  { id: 'cognitive-emergence', cmd: 'node', args: ['gates/cognitive-emergence.proof.mjs', '--json'], parallel: true },
];

function runGate(check) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(check.cmd, check.args, { cwd: here, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => stdout += d);
    child.stderr.on('data', (d) => stderr += d);
    child.on('close', (code) => {
      resolve({ id: check.id, ok: code === 0, ms: Date.now() - t0, stdout: stdout.slice(0, 100) });
    });
    child.on('error', () => resolve({ id: check.id, ok: false, ms: Date.now() - t0, stdout: '', error: 'spawn failed' }));
  });
}

async function main() {
  const t0 = Date.now();
  console.log('═══ PARALLEL PARADIGM VERIFY ═══\n');

  // Phase 1: build (sequential, blocking)
  const buildCheck = CHECKS.find(c => !c.parallel);
  console.log(`▶ ${buildCheck.id.padEnd(10)} running...`);
  const buildResult = await runGate(buildCheck);
  console.log(`  ${buildResult.ok ? 'GREEN' : 'RED'} (${buildResult.ms}ms)`);
  if (!buildResult.ok) { console.log('\nBUILD FAILED — aborting.'); process.exit(1); }

  // Phase 2: all other gates in parallel
  const parallelChecks = CHECKS.filter(c => c.parallel);
  console.log(`\n▶ Running ${parallelChecks.length} gates in parallel...`);
  const promises = parallelChecks.map(c => runGate(c));
  const results = await Promise.all(promises);

  let green = 0, red = 0;
  for (const r of results.sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`  ${r.ok ? 'GREEN' : 'RED '}  ${r.id.padEnd(20)} (${r.ms}ms)`);
    if (r.ok) green++; else red++;
  }

  const total = 1 + results.length;
  const totalMs = Date.now() - t0;
  console.log(`\n═══ RESULT: ${green + (buildResult.ok ? 1 : 0)}/${total} green, ${red} red ═══`);
  console.log(`═══ Wall time: ${(totalMs / 1000).toFixed(1)}s (parallel) ═══`);
  process.exit(red > 0 ? 1 : 0);
}

main();
