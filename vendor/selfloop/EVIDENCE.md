# Atomic neuro-symbolic substrate — recomputable evidence dossier

Honest, third-party-recomputable record of what was built and MEASURED. Every claim carries the exact
command that reproduces it. This is NOT an AGI claim. The honest world-first is: **a proof-carrying
neuro-symbolic substrate whose symbolic half AND the construction/characterization of the neuro half
are formally verified and measured.** Strong cognition is NOT machine-decidable; `emergence-report` is
the only judge and it emits CANDIDATES for human verification, never a cognition claim.

Run everything: `node scripts/atomic-selfloop/run-all.mjs <repoRoot>`

## 1. Symbolic half (verified)
- atomic-edit engine: **190 proof entrypoints / 246 gate files**, every self-change admitted only if the
  full self-expansion lattice converges GREEN; byte-positivity + security-monotonicity enforced.
- Recompute: `node gates/self-expansion-validator-lattice.proof.mjs` · `node gates/doc-honesty.proof.mjs`

## 2. Closed self-improvement loop (mechanism, fired for real)
- `selfloop.mjs`: generate (corpus couplings) → fitness → select (lift × headroom) → tag origin → [dry-run].
- FIRED 2×: autonomously selected NEW invariants → admitted via lattice → recorded autonomous (F2-auditable).
  Gates: `auto-coupling-self-expansion-dist-rollback--resource-lifetime`, `...effect-snapshot-honest-ceiling--multilang-supply-chain-resolver`.
- HONEST: this is the autonomous select→verify→admit MECHANISM, not a quality gain. Recompute: `node selfloop.mjs <root>`

## 3. Connectionist half (built, deployed, characterized — ceiling known)
- `neuro.mjs` (corpus, 256 rows): linear model beats symbolic heuristic on 9/55 gates (AUC ~0.97 on those). `node neuro.mjs <root>`
- `exec-risk.mjs` (exec-ledger, ~23k real rows): predict command failure from PRE-EXECUTION features.
  - Naive split AUC 0.93 was MEMORIZATION; rigorous command-grouped split: **AUC 0.77 on NOVEL commands**.
  - Deployable metric: **precision@top-decile 0.283 vs base 0.073 = 3.88× lift**. `node exec-risk.mjs <root>`
  - REPRODUCED 2026-06-19 on the current ledger (was 0.73 / 3.2× when first measured; held/strengthened).
- `exec-guard.mjs`: deploys the linear ranker as an ADVISORY guard (never blocks). Flags ad-hoc inline
  `node -e`/heredocs (risk 0.93+), not stable tooling. `node exec-guard.mjs train <root>` then `... score "<cmd>"`
- `learning-curve.mjs`: time-ordered — near-future AUC ~0.93 (temporal locality) but FLAT vs history
  (data accrual does NOT lift it; saturates early). `node learning-curve.mjs <root>`
- SETTLED: linear beats MLP on BOTH corpus and exec-ledger → the signal is linear; bigger models overfit.

## 4. Grounding (neuro↔symbolic, measured) — ceiling confirmed
- `grounding.mjs`: neuro conditional weight predicts coupling generalization (corr +0.14) where symbolic
  marginal lift does not (−0.00). BUT naive lift×neuroW does NOT improve top-K selection (0.916 vs 0.956)
  → NOT deployed into the loop. `node grounding.mjs <root>`
- `grounding-hybrid.mjs`: a STRONGER test of the head/tail paradox — 5 hybrid rankers (borda, lexico,
  veto, mult, zblend), BAGGED neuro weights over 5 deterministic splits, evaluated at K∈{10,20,30}, with
  a PRE-REGISTERED win rule (beat symbolic at all K by >0.005 AND on a majority of splits).
  Result: **NO robust hybrid win — ceiling CONFIRMED.** `mult` (the original) is worst (0.90–0.93,
  confirming multiplicative gating destroys the high-lift head). `veto`/`lexico` ≈ symbolic. `borda`
  is the only ranker that ever beats symbolic — by ~2pts at K30 (0.9695 vs 0.9496) — but LOSES at K20
  and wins only 2/5 splits, so it FAILS the pre-registered rule and is NOT a win (not cherry-picked).
  Honest conclusion: pure symbolic lift is at the top-K selection frontier on this corpus; the
  connectionist conditional weight adds NO robust selection value here. `node grounding-hybrid.mjs <root>`

## 5. The honest judge (emergence-report) — at its emergence-detection completeness
- F1 unknown-agent edit · F2 self-authored admission (known generators = silent) · F4 rising recursive
  novelty · F3 corpus-chain-break (unexplained writer). All adversarially tested; SILENT on normal state.
- Live verdict: **no strong-emergence candidate — mechanical weak emergence only.**
- Evidence base verified untampered: disproof-corpus hash-chain INTACT (0 breaks / 256).
- Recompute: `node ../mcp/atomic-edit/emergence-report.mjs <root>` · `node ../mcp/atomic-edit/gates/emergence-report.proof.mjs`

## 6. Honesty record — claims I MEASURED then KILLED (not defended)
1. HumanEval 94.2% was oracle-leak → removed.
2. exec-risk AUC 0.93 was memorization → real number 0.73 (grouped split).
3. Feature enrichment (intent+cwd) did NOT help (0.73→0.71).
4. MLP/nonlinearity does NOT beat linear (corpus AND exec-ledger).
5. My own P8 thesis "data accrual improves the neuro half" → FALSE (flat learning curve); endpoint "rises" was a cherry-pick.
6. Finer-F3 per-attempt attribution → LOW value (redundant with F1/F2/F3-chain) → not built.
7. Retire "redundant" gates on corpus-uniqueness → UNSAFE (would break security-monotonicity) → refused.
8. Motivated multi-strategy hybrid grounding (borda/lexico/veto/zblend, bagged, multi-K) → does NOT
   robustly beat symbolic top-K. borda@K30 (0.97) was tempting but FAILED the pre-registered robustness
   rule (lost at K20, 2/5 splits) → reported as non-robust signal, NOT a win. Ceiling confirmed, not hidden.
9. Temporal future-validation of the FROZEN deployed exec-guard gave AUC **1.000** on the post-training
   slice — REFUSED as a claim. Two confounds: N=24 (underpowered) and leakage (the fresh failures are
   inline `node -e` commands I ran this session — a pattern the model already flags, not independent
   generalization). The honest number stays the grouped-split AUC 0.77 / 3.88×. A "perfect" number is a
   red flag to investigate, not to announce. (Real future-validation needs the engine OPERATING to grow
   fresh ledger data — currently blocked by the concurrent broken gate.)
10. Criticality σ=4.008 on the exec-ledger LOOKS supercritical (way outside the null), but the avalanche
    tail is decisively EXPONENTIAL (LLR=−790.9) → it is mechanical retry clustering with a characteristic
    scale, NOT scale-free self-organized criticality. REFUSED to call σ>1 "criticality"; the power-law
    anti-Goodhart clause caught it. A supercritical branching ratio alone is NOT an emergence signal.

## 6b. Creative emergence swarm (2026-06-19) — 17 agents, honesty gate held
- A 17-agent Workflow (8 distinct creative lenses → 8 adversarial skeptics → 1 synthesizer) searched for the
  highest-impact FALSIFIABLE next steps toward strong emergence. The honesty gate WORKED: 6/8 proposals were
  caught as "weak-emergence-in-disguise" (incl. the seductive strange-loop self-reference one). 2 survived:
  criticality (σ order parameter) and held-out-wall (predict-then-confirm a novel invariant).
- Top pick = **Criticality Observatory**. Arm A (`criticality.mjs`) is the calibration witness, run on real data.
- `criticality.mjs` (exec-ledger, time-ordered, FROZEN methodology): branching ratio **σ=4.008**, supercritical,
  OUTSIDE shuffle-null 95% CI [0.954, 1.048] (null mean 0.999) → machinery SOUND + recomputable.
  BUT avalanche-tail test: **EXPONENTIAL preferred (LLR=−790.9)** = characteristic scale = mechanical retry
  clustering, NOT scale-free self-organized criticality. The anti-Goodhart power-law clause REFUSED to call it
  criticality. ξ≈50. Strong F5 signal BLOCKED: exec-ledger has no per-row authoring-origin field → the
  autonomous-exec subset (where genuine self-tuned criticality would show) does not exist yet. `node criticality.mjs <root>`
- Honest outcome: a genuinely novel order parameter on the engine's own action stream, built rigorously,
  producing an HONEST NEGATIVE on the strong claim (σ is mechanical, not SOC) + sound reusable machinery +
  the named instrumentation gap (Arm B: origin-tag exec rows via expand_self) that blocks the real test.
- Arm B DONE (2026-06-19, via atomic_expand_self, lattice GREEN, admitted): added an `origin` field
  (agent:<name> | autonomous:<generator>) to atomic_exec, recorded on every exec ledger row. Verified
  live end-to-end (new rows carry origin; default 'agent:unknown'). The autonomous-exec subset is now
  PARTITIONABLE — the prerequisite shared by criticality-F5, held-out-wall, active-inference, causal-grounding.
  STILL OPEN (honest): the autonomous subset is EMPTY until autonomous code routes through tagged exec
  (B2) over a sustained P8 operating budget; F5 correctly stays unbuilt/silent until that data exists.
- Survivor #2 built: `held-out-wall.mjs` — predict-then-confirm a NEW invariantId (gate-level semantic
  signature; 41 distinct exist) with zero corpus support, time-locked at freeze. `freeze` snapshots S0
  (41 ids, timestamped, corpus tip pinned); `score` correctly ABSTAINS (0/15 new distinct invariants —
  honestly underpowered), chain intact. Names two gaps: (a) no extrapolative generator (baseline =
  structural-adjacency = the p0 it must beat); (b) corpus rows have no writer-pid field, so independent-
  writer confirmation isn't auditable yet. No false candidate; F4 deliberately NOT re-armed. `node held-out-wall.mjs freeze|score <root>`
- BOTH survivors converge on the same honest boundary: the strong signal requires sustained P8 autonomous
  operation to generate data (autonomous-tagged exec rows / new distinct invariants) that does not exist
  yet. The substrate is now SHARPER (2 new instruments + 1 closed gap + 1 time-locked baseline); the judge stays SILENT.
- FIRST extrapolative generator built (`coverage-extrapolator.mjs`) — attacks the #1 named gap directly.
  Insight: 130/162 gates are NEVER-FIRED (80.2% coverage gap, zero corpus support). Predicting WHICH
  never-fired gate fires next is EXTRAPOLATION off the coverage manifold — interpolation provably cannot
  (no support for an unobserved class). Signal = gate RECENCY (git ctime), orthogonal to fired-gate
  similarity (= the baseline). 10 algorithm-authored predictions frozen + time-locked. `held-out-wall.mjs
  score` now runs the head-to-head: perGenerator confirm-rates + `extrapolatorBeatsBaseline`. Pre-registered
  NULL: extrapolator confirm-rate <= structural-adjacency baseline → recency carries no extrapolative
  signal → honest negative. Currently ABSTAINS (0 new invariants). Predictions are ALGORITHM-authored, not
  LLM-hand-picked — the distinction that lets a future confirmation count toward (B), not the operator's cognition.
  `node coverage-extrapolator.mjs <root>` then `node held-out-wall.mjs score <root>`

## 7. Proven vs open (the honest boundary)
- PROVEN: the verified substrate exists; the loop mechanism fires; neuro-symbolic complementarity + a
  deployable risk ranker are real and measured; the judge is sharp and honest; the evidence is untampered.
- OPEN (not code, by nature): strong/AGI-like cognition — judged ONLY by emergence-report + humans, never
  declared here. Advances only via real OPERATION over time (P8) + the unsolved research frontier (deep
  connectionist + general grounding, compute-bound, no guaranteed path).
