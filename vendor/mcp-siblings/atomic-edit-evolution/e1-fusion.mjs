#!/usr/bin/env node
/**
 * e1-fusion.mjs — PARADIGM PART D.3 / E1: the EMERGENT capability c⋆ — provably-confluent,
 * friction-routed, multi-agent editing — that exists in NEITHER atomic-alone NOR Nidus-alone.
 *
 * Nidus ROUTES (stigmergic) but cannot PROVE confluence (no edit algebra: edits are totally git-ordered).
 * atomic-core PROVES confluence (the (e) commute-modulo-invariant algebra) but does not ROUTE. The fusion
 * does both: friction routing (friction-router.mjs, N3/A-G1) decides WHO edits WHAT so concurrent agents
 * work disjoint loci, and the (e) algebra (gates/algebra.ts) MACHINE-CHECKS that the resulting concurrent
 * wavefront merges confluently AND preserves every edit's obligation (positive verdict + negative disproof).
 *
 * The fusion is the routing half × the confluence half. This module composes them and emits a machine-checked
 * confluence certificate over a routed wavefront. The full benchmark (D.4 — arm-4 vs Nidus-style vs
 * atomic-core on a K-agent LLM workload) is EXTERNAL; this is the MECHANISM, demonstrable in a controlled harness.
 *
 * Pure: in-memory; takes a commute() fn injected by the caller (the real dist algebra). No spawn, no random.
 */

/**
 * The concurrent WAVEFRONT of a routed assignment = the set of in-flight edits, one per agent (each agent
 * runs its own tasks sequentially; the wavefront is what runs at the same instant across agents).
 * @param {Array<{taskId:any, agent:string}>} assignment  output of routeBatch (task→agent)
 */
export function wavefrontOf(assignment) {
  const seen = new Set();
  const wave = [];
  for (const a of assignment) {
    if (seen.has(a.agent)) continue; // an agent's later tasks are serialized behind its first
    seen.add(a.agent);
    wave.push(a);
  }
  return wave;
}

/**
 * Machine-check that a routed wavefront is CONFLUENT and OBLIGATION-PRESERVING using the (e) algebra.
 * @param {Array<{taskId:any, agent:string}>} assignment
 * @param {(taskId:any)=>object} editFactOf  maps a taskId → its EditFact (file, spans, closure, negativeProof)
 * @param {(a:object,b:object)=>{commute:boolean, reason?:string, preservedDisproofs?:string[]}} commute
 * @returns {{width:number, confluent:boolean, obligationPreserved:boolean, conflicts:Array, agents:string[]}}
 */
export function certifyConfluentWavefront(assignment, editFactOf, commute) {
  const wave = wavefrontOf(assignment);
  const facts = wave.map((w) => editFactOf(w.taskId));
  let confluent = true;
  let obligationPreserved = true;
  const conflicts = [];
  for (let i = 0; i < facts.length; i += 1) {
    for (let j = i + 1; j < facts.length; j += 1) {
      const v = commute(facts[i], facts[j]);
      if (!v.commute) {
        confluent = false;
        conflicts.push({ a: wave[i].agent, b: wave[j].agent, reason: v.reason });
      } else {
        // a commuting merge must preserve BOTH edits' negative obligations (the (a)↔(e) integration):
        // if either edit carries a disproof, the verdict must witness it preserved.
        const needA = Boolean(facts[i].negativeProof);
        const needB = Boolean(facts[j].negativeProof);
        if (needA || needB) {
          const preserved = Array.isArray(v.preservedDisproofs) ? v.preservedDisproofs : [];
          if (needA && !preserved.includes(facts[i].negativeProof.proofSha256)) obligationPreserved = false;
          if (needB && !preserved.includes(facts[j].negativeProof.proofSha256)) obligationPreserved = false;
        }
      }
    }
  }
  return { width: wave.length, confluent, obligationPreserved, conflicts, agents: wave.map((w) => w.agent) };
}

/**
 * The arm comparison metric: a routed assignment's PROVABLY-CONFLUENT concurrent throughput =
 * the wavefront width when (and only when) the algebra certifies it confluent + obligation-preserving;
 * else the safe concurrent throughput collapses to 1 (the conflicting edits must serialize).
 */
export function confluentThroughput(assignment, editFactOf, commute) {
  const cert = certifyConfluentWavefront(assignment, editFactOf, commute);
  return cert.confluent && cert.obligationPreserved ? cert.width : 1;
}
