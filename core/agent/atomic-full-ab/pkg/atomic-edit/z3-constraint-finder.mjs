#!/usr/bin/env node
/**
 * z3-constraint-finder.mjs — PARADIGM Phase 2: provably-MINIMAL invariant cover via z3.
 *
 * Reads the held-out-validated informative couplings the generator mined, hands them to the
 * z3 Optimize solver (formal/atomic-algebra/coupling_cover_z3.py), and returns the PROVABLY
 * minimal set of consequent invariants covering every coupled antecedent wall-hit. Unlike the
 * greedy planner (near-optimal), z3 PROVES minimality. Honest ABSENT degrade when z3 is
 * unavailable — never a faked optimum.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { proposeFromCorpus } from './hypothesis-generator.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDefault = path.resolve(dir, '..', '..', '..');

export function couplingsFromReport(report) {
  return (report.candidates ?? []).filter((c) => c.informative).map((c) => [c.antecedent, c.consequent]);
}

/** Run the z3 optimal-cover solver on `couplings`. Honest ABSENT when z3/python unavailable. */
export function optimalCover(couplings, repoRoot) {
  const root = repoRoot || repoRootDefault;
  const script = path.join(root, 'formal', 'atomic-algebra', 'coupling_cover_z3.py');
  if (!fs.existsSync(script)) return { status: 'ABSENT', detail: 'coupling_cover_z3.py not found' };
  const venv = path.join(root, '.z3venv', 'bin', 'python3');
  const py = fs.existsSync(venv) ? venv : 'python3';
  const res = spawnSync(py, [script], { input: JSON.stringify({ couplings }), encoding: 'utf8', timeout: 60000 });
  if (res.error || res.status === null) return { status: 'ABSENT', detail: `z3 runner unavailable (${res.error ? res.error.code : 'no exit'})` };
  if (res.status === 2) return { status: 'ABSENT', detail: 'z3 python module unavailable' };
  try {
    const last = String(res.stdout || '').trim().split(String.fromCharCode(10)).pop();
    return JSON.parse(last);
  } catch {
    return { status: 'ABSENT', detail: 'unparseable solver output' };
  }
}

export function optimalCoverFromCorpus(repoRoot, opts = {}) {
  return optimalCover(couplingsFromReport(proposeFromCorpus(repoRoot, opts)), repoRoot);
}

// CLI: `node z3-constraint-finder.mjs [repoRoot]` — prove the minimal invariant cover.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(optimalCoverFromCorpus(repoRoot, {}), null, 2));
}
