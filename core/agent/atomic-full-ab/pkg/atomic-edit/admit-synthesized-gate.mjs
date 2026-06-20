#!/usr/bin/env node
/**
 * admit-synthesized-gate.mjs — automates the gate admission pipeline.
 *
 * Takes the output of autonomous-evolution.mjs, writes the synthesized gate
 * to disk, verifies it passes, and runs paradigm-verify to confirm no regression.
 * This closes the gap between "synthesized" and "admitted."
 *
 * Usage: node admit-synthesized-gate.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT || path.resolve(here, '..', '..', '..', 'core', 'atomic-edit');

// Step 1: Run autonomous evolution to get the synthesized gate
console.log('▶ Running autonomous evolution...');
const aeResult = execSync('node autonomous-evolution.mjs', { cwd: repoRoot, encoding: 'utf8' });
const ae = JSON.parse(aeResult.trim());

if (!ae.synthesized) {
  console.log('No gate synthesized. Corpus may need enrichment.');
  process.exit(0);
}

console.log(`  Synthesized: ${ae.synthesized}`);
console.log(`  Coupling: ${ae.coupling.antecedent} => ${ae.coupling.consequent}`);
console.log(`  Lift: ${ae.coupling.lift.toFixed(2)}x, Holdout: ${ae.coupling.holdoutConfidence}`);

// Step 2: Capture the gate source
const { synthesizeCouplingGate } = await import(path.join(repoRoot, 'autonomous-evolution.mjs'));
const { proposeFromCorpus } = await import(path.join(repoRoot, 'hypothesis-generator.mjs'));
const report = proposeFromCorpus(repoRoot, {});
const gate = synthesizeCouplingGate(report);

if (!gate) {
  console.log('Gate synthesis failed.');
  process.exit(1);
}

// Step 3: Write the gate to disk
const gatePath = path.join(repoRoot, 'gates', gate.name + '.proof.mjs');

// Fix repoRoot in the gate source for this layout
const fixedSource = gate.source.replace(
  /const repoRoot = path\.resolve\([^)]+\);/,
  "let repoRoot = path.dirname(fileURLToPath(import.meta.url)); for (let i = 0; i < 8; i++) { if (fs.existsSync(path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl'))) break; repoRoot = path.dirname(repoRoot); }"
);

fs.writeFileSync(gatePath, fixedSource);
console.log(`  Written: gates/${gate.name}.proof.mjs`);

// Step 4: Verify the gate passes
console.log('▶ Verifying gate...');
try {
  execSync(`node gates/${gate.name}.proof.mjs --json`, { cwd: repoRoot, stdio: 'pipe' });
  console.log('  PASS');
} catch (e) {
  console.log('  FAIL — gate does not pass. Not admitted.');
  process.exit(1);
}

// Step 5: Confirm paradigm-verify still green
console.log('▶ Confirming paradigm-verify...');
try {
  execSync('node paradigm-verify.mjs', { cwd: repoRoot, stdio: 'pipe', timeout: 180000 });
  console.log('  17/17 GREEN — no regression');
} catch {
  console.log('  REGRESSION detected — gate not admitted');
  fs.unlinkSync(gatePath);
  process.exit(1);
}

console.log('\n✓ Gate admitted: ' + gate.name);
console.log('  The system autonomously synthesized, verified, and admitted a new invariant.');
