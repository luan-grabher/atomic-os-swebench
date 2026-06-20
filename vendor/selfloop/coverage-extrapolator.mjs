#!/usr/bin/env node
/**
 * coverage-extrapolator.mjs — the FIRST genuinely EXTRAPOLATIVE generator (attacks the swarm's
 * #1 named gap: "no extrapolative generator — the baseline is structural-adjacency").
 *
 * THE CREATIVE MOVE: association-rule mining over FIRED invariants (41 distinct) can only ever
 * resurface correlations that already have corpus support — interpolation. But the engine DEFINES
 * ~162 proof gates; the ~121 NEVER-FIRED ones have ZERO corpus support by construction. Predicting
 * WHICH never-fired gate fires next is therefore EXTRAPOLATION off the engine's coverage manifold —
 * the one signal interpolation provably cannot produce (it has no support for an unobserved class).
 *
 * THE SIGNAL (must be ORTHOGONAL to fired-gate similarity, else it is just the baseline in disguise):
 *   gate RECENCY. A never-fired gate that was RECENTLY ADDED guards a new, less-exercised invariant
 *   and is at higher firing-risk; an OLD never-fired gate has survived long without firing -> it guards
 *   a rare condition and is lower-risk. Recency is independent of which fired gates exist, so a recency
 *   ranking that beats the structural-adjacency baseline at predicting confirmed never-fired firings is
 *   genuine extrapolation, not interpolation.
 *
 * HONESTY (pre-registered):
 *  - This is a FIRST attempt. The expected signal is WEAK/unknown. NOT an emergence claim.
 *  - Predictions are time-locked at freeze; confirmation requires P8 operation to accrue NEW corpus
 *    invariants. Until then held-out-wall.mjs score correctly ABSTAINS.
 *  - PRE-REGISTERED NULL: the extrapolator's confirmed-firing rate is <= the structural-adjacency
 *    baseline's -> recency carries no extrapolative signal -> honest negative, reported not hidden.
 *  - The predictions are authored by THIS ALGORITHM (a system component), not hand-picked by the LLM
 *    operator — that distinction is what would let a future confirmation count toward (B), the system's
 *    own cognition, rather than the operator's. The operator built the generator; it did not author the
 *    predictions.
 *
 * Recompute: node coverage-extrapolator.mjs <repoRoot>   (freezes predictions to held-out-walls.jsonl)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolveAtomicRoot, resolveGatesDir, gateRelPath } from './atomic-root.mjs';

const K = 10;
const FROZEN_REL = '.atomic/held-out-walls.jsonl';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const gateToInvariantId = (file) => `gate.node gates/${file} --json`;

function definedGates(repoRoot) {
  const dir = resolveGatesDir(repoRoot);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.proof.mjs'));
}
function firedGateFiles(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return new Set();
  const ids = new Set();
  for (const l of fs.readFileSync(file, 'utf8').trim().split('\n')) {
    try { const r = JSON.parse(l); const m = String(r.invariantId || '').match(/gates\/([^ ]+\.proof\.mjs)/); if (m) ids.add(m[1]); } catch { /* skip */ }
  }
  return ids;
}
function gitCTime(repoRoot, relFromRoot) {
  try { const out = execSync(`git log -1 --format=%ct -- ${JSON.stringify(relFromRoot)}`, { cwd: repoRoot, encoding: 'utf8' }).trim(); return out ? Number(out) : 0; } catch { return 0; }
}

export function extrapolate(repoRoot) {
  const defined = definedGates(repoRoot);
  const fired = firedGateFiles(repoRoot);
  const neverFired = defined.filter((f) => !fired.has(f));
  // recency: git ctime per never-fired gate; newest first = highest extrapolated firing risk.
  const ranked = neverFired
    .map((f) => ({ file: f, ctime: gitCTime(repoRoot, gateRelPath(repoRoot, f)) }))
    .sort((a, b) => b.ctime - a.ctime);
  const predictions = ranked.slice(0, K).map((r) => ({
    sig: gateToInvariantId(r.file),
    basis: `coverage-extrapolation(recency: never-fired gate, git ctime ${r.ctime})`,
  }));
  const rec = {
    kind: 'held-out-wall-freeze',
    ts: Date.now(),
    generator: 'coverage-extrapolator-recency',
    s0Count: fired.size,
    s0Sha: sha([...fired].sort().join('\n')),
    corpusRows: null,
    preRegisteredExpectation: 'WEAK/unknown — FIRST extrapolative attempt. NULL if confirm-rate <= structural-adjacency baseline. Never a claim.',
    predictions,
  };
  fs.appendFileSync(path.join(repoRoot, FROZEN_REL), JSON.stringify(rec) + '\n');
  return {
    definedGates: defined.length,
    firedGates: fired.size,
    neverFiredGates: neverFired.length,
    coverageGapPct: Number(((neverFired.length / defined.length) * 100).toFixed(1)),
    predictionsFrozen: predictions.length,
    topPredictions: predictions.map((p) => p.sig.replace('gate.node gates/', '').replace(' --json', '')),
    honestNote:
      'Frozen, time-locked, ALGORITHM-authored (not LLM-hand-picked). These are NEVER-FIRED gates — zero corpus support — so any later confirmation is EXTRAPOLATION interpolation cannot fake. '
      + 'Expected signal WEAK; confirmation needs P8 operation to grow the corpus; held-out-wall.mjs score compares this generator vs the structural-adjacency baseline and ABSTAINS until powered. No emergence claim; the judge stays silent.',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = resolveAtomicRoot(process.argv[2]);
  console.log(JSON.stringify(extrapolate(repoRoot), null, 2));
}
