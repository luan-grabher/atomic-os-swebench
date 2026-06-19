#!/usr/bin/env node
/**
 * fitness.mjs — P2 of the honest self-improvement roadmap: a MEASURABLE per-gate fitness over
 * the REAL disproof corpus. Without a continuous value to optimize, there is nothing for a
 * generator/selector to climb; this turns PASS/FAIL gates into ranked, comparable signals.
 *
 * HONEST about what is and isn't derivable from the corpus as it exists today:
 *   DERIVABLE NOW (from .atomic/disproof-corpus.jsonl verdictCodes — every gate that rejected
 *   each self-expansion candidate):
 *     - hits           : how many candidates this gate rejected
 *     - soleRejecter   : how many it rejected ALONE (no other gate caught it)
 *     - uniqueness     : soleRejecter / hits — independent discriminative value (1 = always the
 *                        only catcher; 0 = never adds signal another gate didn't already give)
 *     - coFireRate     : 1 - uniqueness — redundancy with the rest of the lattice
 *     - hitRate        : hits / candidates — how often this gate is the binding constraint
 *     - fitness        : uniqueness (the honest value-proxy: a gate earns its keep by catching
 *                        what nothing else catches; a perfectly redundant gate scores 0)
 *   NOT DERIVABLE YET (requires P1 origin/label instrumentation, stated, not faked):
 *     - precision / false-positive-rate : the corpus is human-label-free; it records that a gate
 *       fired, NOT whether the rejection was CORRECT. True precision needs P1 to capture
 *       rejected-but-actually-correct candidates. Reported as null until then.
 *     - latency : needs per-proof timing from the exec-ledger; reported as null here.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export const DISPROOF_CORPUS_REL = '.atomic/disproof-corpus.jsonl';

function readJsonl(absFile) {
  if (!fs.existsSync(absFile)) return [];
  const out = [];
  for (const line of fs.readFileSync(absFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* recoverable partial line */ }
  }
  return out;
}

const shortName = (s) => String(s).replace(/^gate\.node gates\//, '').replace(/^gate\.node /, '').replace(/ --json$/, '').replace(/\.proof\.mjs$/, '').replace(/\.proof\.ts$/, '');

/** Compute measurable per-gate fitness from the real corpus. Pure: returns ranked array + meta. */
export function computeGateFitness(repoRoot) {
  const recs = readJsonl(path.join(repoRoot, DISPROOF_CORPUS_REL));
  const candidates = recs.filter((r) => Array.isArray(r.verdictCodes) ? r.verdictCodes.length > 0 : !!r.invariantId);
  const total = candidates.length;
  const stat = new Map(); // gate -> { hits, sole }
  for (const r of candidates) {
    const codes = (Array.isArray(r.verdictCodes) && r.verdictCodes.length ? r.verdictCodes : [r.invariantId]).filter(Boolean);
    const uniq = [...new Set(codes)];
    for (const g of uniq) {
      if (!stat.has(g)) stat.set(g, { hits: 0, sole: 0 });
      stat.get(g).hits += 1;
      if (uniq.length === 1) stat.get(g).sole += 1;
    }
  }
  const gates = [...stat.entries()].map(([gate, s]) => {
    const uniqueness = s.hits ? s.sole / s.hits : 0;
    return {
      gate: shortName(gate),
      raw: gate,
      hits: s.hits,
      soleRejecter: s.sole,
      uniqueness: Number(uniqueness.toFixed(4)),
      coFireRate: Number((1 - uniqueness).toFixed(4)),
      hitRate: Number((total ? s.hits / total : 0).toFixed(4)),
      fitness: Number(uniqueness.toFixed(4)),
      precision: null,   // needs P1 (rejected-but-correct labels)
      falsePositiveRate: null, // needs P1
      latencyMs: null,   // needs exec-ledger per-proof timing
    };
  }).sort((a, b) => b.fitness - a.fitness || b.hits - a.hits);
  return {
    candidates: total,
    gateCount: gates.length,
    gates,
    derivable: ['hits', 'soleRejecter', 'uniqueness', 'coFireRate', 'hitRate', 'fitness'],
    notDerivableYet: { precision: 'needs P1 reject-but-correct labels', falsePositiveRate: 'needs P1', latencyMs: 'needs exec-ledger timing' },
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  const r = computeGateFitness(repoRoot);
  console.log(`candidates=${r.candidates} gates=${r.gateCount}`);
  console.log('top by fitness (uniqueness = independent catch value):');
  for (const g of r.gates.slice(0, 10)) {
    console.log(`  fit=${g.fitness.toFixed(2)} uniq=${g.uniqueness.toFixed(2)} hits=${g.hits} sole=${g.soleRejecter} hitRate=${g.hitRate.toFixed(2)}  ${g.gate}`);
  }
  console.log('NOT derivable yet (honest):', JSON.stringify(r.notDerivableYet));
}
