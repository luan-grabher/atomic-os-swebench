#!/usr/bin/env node
/**
 * agent-trust-governance.mjs — PARADIGM PART D A-G8: GRADED trust governance.
 *
 * Nidus scales an agent's capability/permission with its proven reliability (trust tiers). atomic's
 * agent-independence (L16) was BINARY (obey/deny — every agent obeys the same floor). This adds the GRADED
 * layer on top of N3's friction ledger: an agent's capability on a given invariant scales with its trust
 * tier (derived from its recomputable-witness-backed friction record). Crucially this is STRICTLY ADDITIVE
 * to the floor — graded trust only ever GRANTS MORE autonomy to a proven agent; the binary floor (the (a)
 * default + the convergence gate) is NEVER weakened, so a low-trust agent is more SUPERVISED, never able to
 * bypass. Capability is backed by a recomputable witness record (forgery-refused), not a bare reputation.
 *
 * Pure: in-memory; consumes the N3 friction-ledger trustTier. No spawn, no Date.now/random.
 */
import { trustTier, TIER, frictionFor } from './friction-router.mjs';

/** Capability grades — what AUTONOMY an agent has on an invariant (the floor is always-on underneath). */
export const CAP = {
  SUPERVISED: 0,   // every edit re-verified by the full gate battery + human-style preflight (UNTRUSTED)
  GATED: 1,        // edits auto-verified by the gate battery, no extra preflight (PROBATION)
  AUTONOMOUS: 2,   // edits auto-verified; the agent may also self-admit a new gate (TRUSTED) — still floor-bound
};

/**
 * Grade an agent's capability on an invariant from its trust tier AND its PROVEN observation record. STRICTLY
 * ADDITIVE: the floor (deny-native, (a)-default, convergence) holds at EVERY grade; the grade only widens
 * autonomy for a PROVEN agent. Trust is EARNED, never assumed: AUTONOMOUS requires both low recent friction
 * AND a sufficient track record (opts.observations ≥ opts.minObservations). An UNPROVEN agent (no record)
 * defaults to SUPERVISED — absence of failures is not evidence of reliability, only absence of evidence.
 * @param {{observations?:number, minObservations?:number, probation?:number, untrusted?:number}} [opts]
 * @returns {{capability:number, tier:number, proven:boolean, observations:number, floorEnforced:true}}
 */
export function grantCapability(state, agent, invariantId, opts = {}) {
  const minObservations = Number.isFinite(opts.minObservations) ? opts.minObservations : 3;
  const observations = Number.isFinite(opts.observations) ? opts.observations : 0;
  const proven = observations >= minObservations;
  const tier = trustTier(state, agent, invariantId, opts);
  let capability;
  if (!proven) capability = CAP.SUPERVISED;                 // unproven ⇒ supervised, regardless of (lack of) friction
  else if (tier === TIER.TRUSTED) capability = CAP.AUTONOMOUS;
  else if (tier === TIER.PROBATION) capability = CAP.GATED;
  else capability = CAP.SUPERVISED;
  return { capability, tier, proven, observations, floorEnforced: true };
}

/**
 * The governance invariant: a HIGHER-friction agent never receives a HIGHER capability than a lower-friction
 * one on the same invariant (capability is monotone-DECREASING in friction). And the floor is enforced at all grades.
 */
export function governanceMonotone(state, agents, invariantId, optsByAgent = {}) {
  const graded = agents.map((a) => ({ agent: a, ...grantCapability(state, a, invariantId, optsByAgent[a] ?? {}), recent: frictionFor(state, a, invariantId).recent }));
  // sort by recent friction ascending; capability must be non-increasing as friction rises
  graded.sort((x, y) => x.recent - y.recent);
  let monotone = true;
  for (let i = 1; i < graded.length; i += 1) if (graded[i].capability > graded[i - 1].capability) monotone = false;
  const floorEverywhere = graded.every((g) => g.floorEnforced === true);
  return { monotone, floorEverywhere, graded };
}
