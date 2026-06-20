#!/usr/bin/env node
/**
 * truth-funnel.mjs — PARADIGM PART F (P9/P10): the UNIVERSAL TRUTH FUNNEL.
 *
 * Generalizes atomic's first emergent property ("broken code is unrepresentable, the set that defines broken
 * grows by proof, monotonically") to its second: "WRONG ANSWERS are unrepresentable, the definition of wrong
 * is supplied by the task's OWN deterministic verifier". A candidate answer reaches the benchmark IFF the
 * verifier accepts every unit (P9). The funnel FREEZES accepted units and re-derives ONLY rejected ones,
 * byte-positively, so the search space contracts monotonically (P10 — the L18 ratchet over answer-units).
 *
 * Verifier-agnostic, NO per-task hand-code: the task supplies `verify`; the funnel supplies the byte-positive
 * monotone convergence. The HONEST boundary (F.2): converges to the model's CAPABILITY CEILING only where the
 * verifier is deterministic ∧ the answer is unit-decomposable ∧ P(correct unit | feedback) > 0 ∧ budget holds.
 * atomic does NOT create intelligence — it forbids latent intelligence from being wasted by bad execution.
 *
 * Connection to the (e) algebra: re-deriving a rejected unit is an EDIT; if it commutes with the frozen
 * accepted units (disjoint read-set), monotonicity (P10) is preserved by construction. The clean model here
 * assumes independent units (the decomposable case); coupled units route through the algebra commute() (E1).
 *
 * Pure: in-memory; the verifier + proposer are injected by the caller. No spawn, no Date.now/random.
 */

/**
 * P9 gate — a candidate is submitted IFF the deterministic verifier rejects no unit. A non-deterministic /
 * absent verifier ABSTAINS (UNJUDGED) — the funnel never fakes a verdict (Rice/honesty, like the P-series).
 * @param {{units:Array<{id:any, verdict:'accept'|'reject'}>, deterministic:boolean}|null} verification
 */
export function funnelGate(verification) {
  if (!verification || verification.deterministic !== true || !Array.isArray(verification.units)) {
    return { submit: false, unjudged: true, rejected: [] };
  }
  const rejected = verification.units.filter((u) => u.verdict === 'reject').map((u) => u.id);
  return { submit: rejected.length === 0, unjudged: false, rejected };
}

/** Split a verification into accepted / rejected unit ids. */
export function decompose(verification) {
  const units = verification?.units ?? [];
  return {
    accepted: units.filter((u) => u.verdict === 'accept').map((u) => u.id),
    rejected: units.filter((u) => u.verdict === 'reject').map((u) => u.id),
  };
}

/**
 * P10 byte-positive merge — recombine the frozen accepted units with the re-derived rejected ones, NEVER
 * touching a frozen unit. An answer is a Map<unitId, value>.
 * @param {Map} prevAnswer
 * @param {Set} frozenAcceptedIds   units already accepted (immutable)
 * @param {Map} reDerived           new values, ONLY for non-frozen (rejected) units
 */
export function mergeBytePositive(prevAnswer, frozenAcceptedIds, reDerived) {
  const out = new Map(prevAnswer);
  for (const [id, val] of reDerived) {
    if (frozenAcceptedIds.has(id)) continue; // freeze: a frozen accepted unit is immutable (P10)
    out.set(id, val);
  }
  return out;
}

/**
 * Run the universal funnel to convergence (or budget exhaustion).
 * @param {{
 *   propose: (prevAnswer:Map, feedback:any, frozen:Set) => Map,   // the model: re-derives (ideally only) rejected units
 *   verify:  (answer:Map) => {units:Array<{id:any,verdict:string}>, deterministic:boolean}|null,
 *   budget:  number,
 *   initialAnswer?: Map,
 * }} opts
 * @returns {{converged:boolean, unjudged:boolean, iterations:number, frozen:Set, answer:Map, history:Array,
 *            monotone:boolean}}
 */
export function runFunnel({ propose, verify, budget, initialAnswer }) {
  let answer = new Map(initialAnswer ?? []);
  const frozen = new Set();
  let feedback = null;
  const history = [];
  let converged = false;
  let monotone = true; // P10: a frozen unit must never regress to rejected
  let iterations = 0;

  for (let iter = 0; iter < budget; iter += 1) {
    iterations = iter + 1;
    const proposed = propose(answer, feedback, frozen);
    answer = mergeBytePositive(answer, frozen, proposed);
    const verification = verify(answer);
    const gate = funnelGate(verification);
    if (gate.unjudged) return { converged: false, unjudged: true, iterations, frozen, answer, history, monotone };

    const { accepted, rejected } = decompose(verification);
    const acceptedSet = new Set(accepted);
    // P10 monotonicity audit: every already-frozen unit must STILL be accepted.
    for (const id of frozen) if (!acceptedSet.has(id)) { monotone = false; }
    for (const id of accepted) frozen.add(id); // freeze (monotone — never un-freeze)

    history.push({ iter, accepted: accepted.length, rejected: rejected.length, frozen: frozen.size });
    if (gate.submit) { converged = true; break; }
    feedback = { rejected }; // GRANULAR feedback — the recomputable disproof, not "try again from scratch"
  }
  return { converged, unjudged: false, iterations, frozen, answer, history, monotone };
}

// ─────────────────────────── F.4 arm simulators (mechanism, no LLM) ───────────────────────────
/** Deterministic [0,1) hash (FNV-1a) — reproducible pseudo-randomness, NO Math.random/Date.now (would break
 * resume + third-party re-run). The k-th attempt at a unit is "correct" iff h01(seed:id:k) < P(unit). */
function h01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/**
 * A STOCHASTIC-but-DETERMINISTIC synthetic task: each unit has capability `P` (probability the model emits it
 * correct on any single attempt). The k-th attempt at unit `id` succeeds iff `h01(seed:id:k) < P` — zero real
 * randomness, so any third party re-runs byte-identical. P=0 models the capability ceiling (never produced).
 * This is the model that distinguishes the arms: blind-retry needs ALL units correct in the SAME round (∏P,
 * exponential in unit-count); the unified funnel freezes each unit as it lands (~max of n geometric draws).
 */
export function makeSyntheticTask(unitProb, seed = 'atomic') {
  const truth = new Map([...unitProb.keys()].map((id) => [id, `correct:${id}`]));
  const verify = (answer) => ({
    deterministic: true,
    units: [...truth.keys()].map((id) => ({ id, verdict: answer.get(id) === truth.get(id) ? 'accept' : 'reject' })),
  });
  // attemptCorrect(id, k): does the k-th independent attempt at `id` land correct?
  const attemptCorrect = (id, k) => h01(`${seed}:${id}:${k}`) < (unitProb.get(id) ?? 0);
  return { truth, verify, unitIds: [...truth.keys()], attemptCorrect };
}

/**
 * Run one ARM and return iterations-to-converge (or null if never within budget). Arms:
 *   'first-attempt'  — 1 shot (today's score).
 *   'blind-retry'    — re-derive the WHOLE answer each round, NO memory of which units passed — needs ALL units
 *                      correct in ONE round (∏P).
 *   'scalar-funnel'  — re-derive the whole answer each round with pass/fail only, NO per-unit freeze — also
 *                      needs all correct together.
 *   'unified-funnel' — FREEZE accepted units + granular feedback (which are rejected) + re-derive ONLY rejected.
 */
export function runArm(arm, task, _unused, budget) {
  if (arm === 'unified-funnel') {
    const attempts = new Map([...task.unitIds].map((id) => [id, 0]));
    const propose = (_prev, feedback, frozen) => {
      const ids = feedback ? feedback.rejected : task.unitIds.filter((id) => !frozen.has(id));
      return new Map(ids.map((id) => {
        attempts.set(id, attempts.get(id) + 1);
        return [id, task.attemptCorrect(id, attempts.get(id)) ? task.truth.get(id) : `wrong:${id}:${attempts.get(id)}`];
      }));
    };
    const r = runFunnel({ propose, verify: task.verify, budget });
    return { converged: r.converged, iterations: r.converged ? r.iterations : null, monotone: r.monotone };
  }
  // first-attempt / blind-retry / scalar-funnel: NO freeze — re-derive the WHOLE answer each round.
  const rounds = arm === 'first-attempt' ? 1 : budget;
  for (let iter = 1; iter <= rounds; iter += 1) {
    const answer = new Map(task.unitIds.map((id) => [id, task.attemptCorrect(id, iter) ? task.truth.get(id) : `wrong:${id}:${iter}`]));
    if (funnelGate(task.verify(answer)).submit) return { converged: true, iterations: iter, monotone: true };
  }
  return { converged: false, iterations: null, monotone: true };
}
