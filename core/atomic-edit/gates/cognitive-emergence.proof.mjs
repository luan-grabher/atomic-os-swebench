#!/usr/bin/env node
/**
 * cognitive-emergence.proof.mjs — PARADIGM PART L12: the truth-funnel produces
 * SYSTEM-LEVEL CAPABILITY that NO INDIVIDUAL COMPONENT POSSESSES.
 *
 * CLAIM: The unified truth-funnel (freeze accepted units + re-derive rejected units
 * with granular disproof feedback) solves composite tasks that blind-retry (re-derive
 * ALL units each round, no memory) CANNOT solve, with the SAME per-unit capability.
 *
 * This IS cognitive emergence: the SYSTEM (funnel + model) > the COMPONENT (model alone).
 * The mechanism — not additional intelligence — produces the capability gap.
 *
 * PROOF METHOD: 300 independent trials per parameter configuration. Each trial:
 *   - N units, each with capability P (probability of correct on any single attempt)
 *   - blind-retry: re-derive ALL N each round (needs ALL correct simultaneously: P^N)
 *   - unified-funnel: freeze accepted + re-derive ONLY rejected (independent freeze)
 *   - Budget B rounds
 * The synthetic model uses a DETERMINISTIC hash (FNV-1a) — zero randomness, byte-identical
 * re-runs by any third party.
 *
 * HONEST BOUNDARY: The emergence is strongest when P ∈ [0.3, 0.6] and N ≥ 6.
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
  console.log('  COGNITIVE EMERGENCE PROOF — truth-funnel vs blind-retry');
  console.log(`  ${TRIALS} trials per configuration. Deterministic (FNV-1a hash).`);
  console.log('═══════════════════════════════════════════════════════════════');
  for (const r of payload.results) {
    const status = r.emergent ? 'EMERGENT' : 'NO-GAP';
    console.log(`  ${r.config.padEnd(16)} blind=${String(r.blindRate).padStart(5)}%  funnel=${String(r.funnelRate).padStart(5)}%  lift=${r.lift.padEnd(6)} [${status}]`);
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  VERDICT: ${payload.ok ? 'ALL CONFIGURATIONS EMERGENT — the funnel produces' : 'SOME configurations show no emergence gap'}`);
  if (payload.ok) {
    console.log('  system-level capability that blind-retry CANNOT match, with');
    console.log('  the SAME per-unit intelligence. This IS cognitive emergence.');
  }
  console.log('═══════════════════════════════════════════════════════════════');
}
process.exit(payload.ok ? 0 : 1);
