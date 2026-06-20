#!/usr/bin/env node
/**
 * cognitive-emergence.proof.mjs — PARADIGM PART L12: a MECHANISM property of the
 * truth-funnel (memoized partial-credit retry). NOT a claim of cognition.
 *
 * HONEST RENAME (de-facaded): an earlier version labelled this "cognitive emergence".
 * That was a category error. What this file actually proves is a freshman-probability
 * fact about retry strategies, stated plainly below — kept in the lattice as a real
 * mechanism demo, with the false "cognition/emergence" framing removed.
 *
 * CLAIM (what is actually true): The truth-funnel (freeze accepted units + re-derive
 * ONLY rejected units) converges on composite tasks where blind-retry (re-derive ALL
 * units each round, no memory) almost never does — because blind-retry needs all N
 * units correct in ONE round (P^N) while the funnel ratchets correct units one at a
 * time. This is a property of MEMOIZATION, not of intelligence. The "system > component"
 * gap is the same gap that makes calculator+human beat human at arithmetic: a mechanism.
 * It does NOT transfer to real LLMs (see HONEST BOUNDARY): their per-unit P is ~binary
 * and the measured ON/OFF SWE-bench delta of the funnel is ZERO.
 *
 * PROOF METHOD: 300 independent trials per parameter configuration. Each trial:
 *   - N units, each with capability P (probability of correct on any single attempt)
 *   - blind-retry: re-derive ALL N each round (needs ALL correct simultaneously: P^N)
 *   - unified-funnel: freeze accepted + re-derive ONLY rejected (independent freeze)
 *   - Budget B rounds
 * The synthetic model uses a DETERMINISTIC hash (FNV-1a) — zero randomness, byte-identical
 * re-runs by any third party.
 *
 * HONEST BOUNDARY: The mechanism gap is widest when P ∈ [0.3, 0.6] and N ≥ 6.
 * At P ≈ 1 (trivial tasks) or P ≈ 0 (impossible tasks), the gap collapses.
 * For current LLMs on well-defined tasks, P is approximately BINARY (P≈1 or P≈0),
 * making the practical sweet-spot narrow. The MECHANISM is correct; the APPLICATION
 * requires tasks at the model's genuine capability edge.
 *
 * Connection to the (e) algebra: re-deriving a rejected unit is an EDIT; if it commutes
 * with frozen accepted units (disjoint read-set), monotonicity (P10) is preserved by
 * construction. The funnel's convergence IS the byte-positive monotone ratchet.
 */
import { runArm, makeSyntheticTask } from '../../atomic-edit-evolution/truth-funnel.mjs';

const jsonMode = process.argv.includes('--json');

// ── Definitive emergence configurations ──
// Each config: [P_per_unit, N_units, Budget_rounds]
// These span the emergence sweet-spot (P ∈ [0.3, 0.7], N ∈ [4, 8]).
const CONFIGS = [
  { p: 0.3, n: 8, budget: 30 },
  { p: 0.4, n: 8, budget: 30 },
  { p: 0.5, n: 6, budget: 20 },
  { p: 0.5, n: 8, budget: 20 },
  { p: 0.6, n: 6, budget: 15 },
  { p: 0.7, n: 4, budget: 15 },
];
const TRIALS = 300;

function run() {
  const results = [];
  let allEmergent = true;

  for (const { p, n, budget } of CONFIGS) {
    let blind = 0;
    let funnel = 0;
    for (let t = 0; t < TRIALS; t += 1) {
      const unitProb = new Map([...Array(n)].map((_, i) => [`u${i}`, p]));
      const task = makeSyntheticTask(unitProb, `emerge-${p}-${n}-${t}`);
      if (runArm('blind-retry', task, null, budget).converged) blind += 1;
      if (runArm('unified-funnel', task, null, budget).converged) funnel += 1;
    }
    const blindRate = blind / TRIALS;
    const funnelRate = funnel / TRIALS;
    const lift = blind > 0 ? funnel / blind : Infinity;
    const emergent = funnel > blind;
    if (!emergent) allEmergent = false;
    results.push({
      config: `P=${p}, N=${n}, B=${budget}`,
      pAllSimultaneous: Math.pow(p, n),
      blindConverged: blind,
      funnelConverged: funnel,
      blindRate: +(blindRate * 100).toFixed(1),
      funnelRate: +(funnelRate * 100).toFixed(1),
      lift: lift === Infinity ? '∞' : +lift.toFixed(1) + 'x',
      emergent,
    });
  }

  return { ok: allEmergent, results, trials: TRIALS };
}

const payload = run();
if (jsonMode) {
  process.stdout.write(JSON.stringify(payload, null, 2));
} else {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RETRY-MECHANISM PROOF — memoized funnel vs blind-retry (NOT cognition)');
  console.log(`  ${TRIALS} trials per configuration. Deterministic (FNV-1a hash).`);
  console.log('═══════════════════════════════════════════════════════════════');
  for (const r of payload.results) {
    const status = r.emergent ? 'MEMO-GAP' : 'NO-GAP';
    console.log(`  ${r.config.padEnd(16)} blind=${String(r.blindRate).padStart(5)}%  funnel=${String(r.funnelRate).padStart(5)}%  lift=${r.lift.padEnd(6)} [${status}]`);
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  VERDICT: ${payload.ok ? 'ALL CONFIGS show the memoization gap — the funnel converges' : 'SOME configurations show no mechanism gap'}`);
  if (payload.ok) {
    console.log('  where blind-retry cannot, with the SAME per-unit success rate.');
    console.log('  This is a MECHANISM property (memoized retry), NOT cognition,');
    console.log('  and does NOT transfer to real LLMs (per-unit P ~binary; A/B delta=0).');
  }
  console.log('═══════════════════════════════════════════════════════════════');
}
process.exit(payload.ok ? 0 : 1);
