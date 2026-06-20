#!/usr/bin/env node
/**
 * emergence-observatory.proof.mjs — PARADIGM PART D.6: the unformalizable-emergence instrument is real.
 *
 * Proves each observatory signal (O1–O5) is a REAL, DISCRIMINATING measure of deviation — it fires on a
 * genuine structural signal and stays quiet on noise — so that IF an emergence exists it becomes a measured
 * fact, not an anecdote. Every signal carries both a positive and a negative direction:
 *
 *   O1 NOVELTY      — a repeated diff → novelty 0; a fully-new diff → novelty ≈ 1 (discriminating).
 *   O2 NICHE        — a friction ledger where one agent concentrates on one invariant → that niche is
 *                     detected; a uniform agent → NO false niche.
 *   O3 TOPOLOGY     — a wall on a NAMED invariant is not flagged; a wall on an UNNAMED dimension IS flagged
 *                     (the taxonomy-must-grow signal feeding L05/L17). Runs over the REAL corpus too.
 *   O4 META-LAWS    — a corpus with a real X⇒Y co-occurrence yields a validated law; a spurious pair does not.
 *   O5 RESIDUAL     — an expected event is NOT in the residual; an UNexpected event IS; the residual is a
 *                     hash chain that verifies and is tamper-evident (a flipped event breaks the chain).
 *
 * Pure: in-memory + an optional read of the real corpus. Belongs in the mandatory lattice.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT ?? path.resolve(root, '..', '..', '..');
const O = await import(path.join(root, 'emergence-observatory.mjs'));
const FR = await import(path.join(root, 'friction-router.mjs'));
const { noveltyIndex, agentNiches, wallTopologyClusters, metaLaws, anomalyResidual, verifyResidualChain } = O;
const { buildFrictionLedger } = FR;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// ── O1: NOVELTY ──
{
  const repeated = noveltyIndex(['const x = unused();', 'const x = unused();', 'const x = unused();']);
  const novel = noveltyIndex(['const x = unused();', 'zzz totally different qqq', 'const x = unused();']);
  check('O1: a repeated diff sequence has ~ZERO novelty (no structural shift)', repeated.mean < 0.05, { mean: repeated.mean });
  check('O1: a fully-different diff has HIGH novelty (discriminating — a shift nobody coded would show here)',
    novel.mean > 0.5 && novel.mean > repeated.mean, { novelMean: novel.mean, repeatedMean: repeated.mean });
}

// ── O2: NICHE ──
{
  const wit = (inv) => ({ invariantId: inv, counterexample: { failedProofFacts: [{ command: 'g', stdoutSha256: '0'.repeat(64), stderrSha256: '0'.repeat(64) }] } });
  const ev = (agent, inv) => ({ agent, invariantId: inv, witness: wit(inv) });
  // claude is a specialist on 'types' (9/10 hits); codex is uniform across 3 invariants
  const specialized = buildFrictionLedger([
    ...Array.from({ length: 9 }, () => ev('claude', 'types')), ev('claude', 'secrets'),
    ev('codex', 'types'), ev('codex', 'secrets'), ev('codex', 'syntax'),
  ], { window: 200 });
  const { niches } = agentNiches(specialized, 0.6);
  const claudeNiche = niches.find((n) => n.agent === 'claude');
  const codexNiche = niches.find((n) => n.agent === 'codex');
  check('O2: a SPECIALIZED agent (9/10 on one invariant) is detected as a niche (coordination-layer emergence)',
    Boolean(claudeNiche) && claudeNiche.invariantId === 'types' && claudeNiche.concentration >= 0.6, { claudeNiche });
  check('O2: a UNIFORM agent yields NO false niche (discriminating)', !codexNiche, { codexNiche });
}

// ── O3: TOPOLOGY (named vs unnamed dimension) + REAL corpus ──
{
  const NAMED = new Set(['types', 'secrets', 'syntax']);
  const isNamed = (inv) => NAMED.has(inv) || [...NAMED].some((c) => inv.includes(c));
  const records = [
    { kind: 'atomic-disproof-witness-record', invariantId: 'types', locus: { file: 'a.ts', region: 'fn:foo' } },
    { kind: 'atomic-disproof-witness-record', invariantId: 'types', locus: { file: 'b.ts', region: 'fn:bar' } },
    { kind: 'atomic-disproof-witness-record', invariantId: 'mystery-undeclared-dimension', locus: { file: 'c.ts', region: 'x' } },
  ];
  const topo = wallTopologyClusters(records, isNamed);
  check('O3: a wall on a NAMED invariant is NOT flagged; an UNNAMED dimension IS flagged (taxonomy-must-grow signal)',
    topo.unnamed.length === 1 && topo.unnamed[0].invariantId === 'mystery-undeclared-dimension', { unnamed: topo.unnamed });

  // run over the REAL corpus if present (resolve named via the live taxonomy gate_index)
  const corpusPath = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  const taxPath = path.join(root, 'gates', 'invariant-taxonomy.json');
  if (fs.existsSync(corpusPath) && fs.existsSync(taxPath)) {
    const tax = JSON.parse(fs.readFileSync(taxPath, 'utf8'));
    const gateIndex = { ...tax.gate_index }; delete gateIndex._doc;
    const classIds = new Set(tax.classes.map((c) => c.id));
    const realIsNamed = (inv) => [...classIds].some((c) => inv.includes(c)) || Object.keys(gateIndex).some((g) => inv.includes(g.replace('-gate', '')));
    const recs = fs.readFileSync(corpusPath, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const realTopo = wallTopologyClusters(recs, realIsNamed);
    check('O3: runs over the REAL disproof corpus and partitions walls into named/unnamed clusters',
      realTopo.clusters.length >= 1, { totalClusters: realTopo.clusters.length, unnamedClusters: realTopo.unnamed.length });
  } else {
    check('O3 (real corpus absent — substitute): topology clustering is well-formed on synthetic records', topo.clusters.length === 2, { clusters: topo.clusters.length });
  }
}

// ── O4: META-LAWS ──
{
  // generations where wall X ('types') is ALWAYS accompanied by wall Y ('lsp') in train AND holdout.
  const hits = [];
  for (let g = 0; g < 8; g += 1) { hits.push({ generation: g, invariantId: 'types' }); hits.push({ generation: g, invariantId: 'lsp' }); }
  // add a spurious wall 'Z' that appears alone, no co-occurrence with anything stable
  hits.push({ generation: 0, invariantId: 'flaky' });
  const { laws } = metaLaws(hits, { minSupport: 2, minConfidence: 0.8 });
  const real = laws.find((l) => l.antecedent === 'types' && l.consequent === 'lsp');
  const spurious = laws.find((l) => l.antecedent === 'flaky');
  check('O4: a real X⇒Y co-occurrence is mined as a law AND out-of-sample validated', Boolean(real) && real.validated === true, { real });
  check('O4: a spurious one-off wall yields NO validated law (discriminating)', !spurious, { spurious });
}

// ── O5: ANOMALY RESIDUAL (the headline detector) ──
{
  // predictor: an event is "expected" iff its invariant is in the known set.
  const known = new Set(['types', 'secrets']);
  const predicted = (ev) => known.has(ev.invariantId);
  const events = [{ invariantId: 'types' }, { invariantId: 'secrets' }, { invariantId: 'UNNAMED-emergent' }, { invariantId: 'types' }, { invariantId: 'ALSO-NEW' }];
  const res = anomalyResidual(events, predicted, null);
  check('O5: expected events are NOT in the residual; only the 2 UNEXPECTED events are (the headline detector)',
    res.residual.length === 2 && res.residual.every((r) => !known.has(r.event.invariantId)), { residualLen: res.residual.length, rate: res.anomalyRate });
  check('O5: the residual is a hash chain that VERIFIES (recomputable, append-only)', verifyResidualChain(res.residual, null).ok === true, {});
  // tamper-evidence: flip an event → chain breaks
  const tampered = res.residual.map((r, i) => i === 0 ? { ...r, event: { invariantId: 'FORGED' } } : r);
  check('O5: a tampered residual is DETECTED (tamper-evident chain — an emergence claim cannot be forged)',
    verifyResidualChain(tampered, null).ok === false, {});
}

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
