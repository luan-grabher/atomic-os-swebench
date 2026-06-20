#!/usr/bin/env node
/**
 * selfloop.mjs — P4: the closed self-improvement loop, wired end to end, HONEST about its edge.
 *
 * It connects the real components, no agent in the loop:
 *   P3 GENERATE — proposeFromCorpus mines held-out-validated candidate gate-rules from the
 *                 system's OWN disproof corpus (deterministic, no LLM).
 *   P2 MEASURE  — computeGateFitness ranks each existing gate by independent catch-value.
 *   SELECT      — pick the candidate whose consequent gate has the MOST headroom (redundant,
 *                 low-uniqueness gates benefit most from a new coupling) × its held-out lift.
 *   P1 ORIGIN   — the selected candidate is tagged origin='autonomous:selfloop' (the system
 *                 authored it) so any later admission is auditable as self-authored (F2).
 *
 * IT STOPS AT A DRY-RUN. The final step — actually submitting the candidate to atomic_expand_self
 * for lattice admission — is a CONSEQUENTIAL, deliberate switch (autonomous modification of the
 * live engine). This module proposes and records; it does NOT auto-promote. That switch is flipped
 * on purpose, not by a silent daemon. This is the honest line between "proposes improvements" and
 * "modifies itself unattended".
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveAtomicRoot, resolveGatesDir } from './atomic-root.mjs';
import { computeGateFitness } from './fitness.mjs';

// CONVERGENCE: hypothesis-generator lives in the canonical atomic-edit substrate, whose
// location is env-overridable (ATOMIC_EDIT_REPO_ROOT) and resolved at runtime — so it must
// be a dynamic import, not a static one. Resolved once against the default root here.
const { proposeFromCorpus } = await import(
  pathToFileURL(path.join(resolveAtomicRoot(), 'hypothesis-generator.mjs')).href
);

const short = (s) => String(s).replace(/^gate\.node gates\//, '').replace(/^gate\.node /, '').replace(/ --json$/, '').replace(/\.proof\.mjs$/, '').replace(/\.proof\.ts$/, '');

// P5 (memory): the slug + gate-name scheme MUST match autonomous-evolution.mjs so we can detect
// which couplings are ALREADY admitted as gates and never re-propose them — otherwise the loop
// loops on improvements it already made (movement without progress).
const slugPart = (s) => short(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36).toLowerCase();
const couplingName = (a, c) => ('auto-coupling-' + slugPart(a) + '--' + slugPart(c)).slice(0, 78).replace(/-+$/, '');
function admittedCouplingNames(repoRoot) {
  const gdir = resolveGatesDir(repoRoot);
  try {
    return new Set(fs.readdirSync(gdir).filter((f) => f.startsWith('auto-coupling-') && f.endsWith('.proof.mjs')).map((f) => f.replace(/\.proof\.mjs$/, '')));
  } catch { return new Set(); }
}

export function runSelfLoopDryRun(repoRoot) {
  const proposal = proposeFromCorpus(repoRoot, {});
  const informative = (proposal.candidates ?? []).filter((c) => c.informative);
  // P5 memory: drop couplings already realized as admitted gates — propose only what's NEW.
  const admitted = admittedCouplingNames(repoRoot);
  const candidates = informative.filter((c) => !admitted.has(couplingName(c.antecedent, c.consequent)));
  const skippedAlreadyAdmitted = informative.length - candidates.length;
  const fit = computeGateFitness(repoRoot);
  const fitByGate = new Map(fit.gates.map((g) => [g.gate, g]));
  const ranked = candidates.map((c) => {
    const cf = fitByGate.get(short(c.consequent));
    const headroom = cf ? 1 - cf.uniqueness : 0.5; // redundant consequent => more to gain
    return {
      antecedent: short(c.antecedent),
      consequent: short(c.consequent),
      lift: c.lift,
      holdoutConfidence: c.holdoutConfidence,
      consequentUniqueness: cf ? cf.uniqueness : null,
      score: Number(((c.lift ?? 0) * (0.5 + headroom)).toFixed(3)),
    };
  }).sort((a, b) => b.score - a.score);
  const selected = ranked[0] ?? null;
  return {
    generated: candidates.length,
    skippedAlreadyAdmitted,
    fitnessGates: fit.gateCount,
    selected,
    proposedOrigin: 'autonomous:selfloop',
    ranked: ranked.slice(0, 5),
    promoted: false,
    note: 'DRY-RUN — auto-promote to the live engine is a deliberate switch, not done here.',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = resolveAtomicRoot(process.argv[2]);
  const r = runSelfLoopDryRun(repoRoot);
  console.log(`P3 generated=${r.generated} informative candidates | P2 ranked ${r.fitnessGates} gates`);
  if (r.selected) {
    console.log(`SELECTED (would propose, origin=${r.proposedOrigin}):`);
    console.log(`  ${r.selected.antecedent} => ${r.selected.consequent}`);
    console.log(`  lift=${r.selected.lift} holdout=${r.selected.holdoutConfidence} consequentUniqueness=${r.selected.consequentUniqueness} score=${r.selected.score}`);
  } else {
    console.log('SELECTED: none (no informative candidate)');
  }
  console.log(r.note);
}
