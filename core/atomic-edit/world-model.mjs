#!/usr/bin/env node
/**
 * world-model.mjs — PARADIGM Phase 4 (world-model) + recursive observatory (D.6), bounded.
 *
 * predict(report, antecedent): from the mined couplings, rank the consequents that follow a
 * given wall (a P(Y|X) query over the corpus). Honest association, not understanding.
 *
 * recursiveNovelty(repoRoot): apply the observatory's O1 noveltyIndex to the system's OWN
 * decision stream — the sequence of proposals it wrote to its ledger. A sustained rise is a
 * shift in the system's own behavior. HONEST: this measures DEVIATION in its outputs; on a
 * static corpus its decisions are deterministic so novelty is ~0 — that is the truthful
 * signal, not absence of effort. The observatory's death-condition discipline still applies
 * before any signal is called 'emergence'.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LEDGER_REL } from './hypothesis-generator.mjs';
import { noveltyIndex } from './emergence-observatory.mjs';

export function predict(report, antecedent) {
  const predicts = (report.candidates ?? [])
    .filter((c) => c.antecedent === antecedent)
    .map((c) => ({ consequent: c.consequent, holdoutConfidence: c.holdoutConfidence, lift: c.lift, informative: c.informative }))
    .sort((a, b) => (Number(b.holdoutConfidence ?? 0) - Number(a.holdoutConfidence ?? 0)) || (Number(b.lift ?? 0) - Number(a.lift ?? 0)));
  return { antecedent, predicts };
}

export function recursiveNovelty(repoRoot) {
  const file = path.join(repoRoot, LEDGER_REL);
  if (!fs.existsSync(file)) return { series: [], mean: 0, records: 0 };
  const recs = fs.readFileSync(file, 'utf8').trim().split(String.fromCharCode(10)).filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const sigs = recs.map((r) => (r.topInformative ?? []).map((t) => `${t.antecedent}=>${t.consequent}`).join('|'));
  const nov = noveltyIndex(sigs, 3);
  return { series: nov.series, mean: nov.mean, records: recs.length };
}

// CLI: `node world-model.mjs [repoRoot]` — report novelty of the system's own decision stream.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(recursiveNovelty(repoRoot), null, 2));
}
