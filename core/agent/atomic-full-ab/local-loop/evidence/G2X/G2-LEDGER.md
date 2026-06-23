# G2 SUBSTRATE LEDGER (cross-model held-out lift — the only success metric, §7)

## G2-001 — 2026-06-23 — EXECUTABLE rung, strong-authored, cross-model
- operator: locate_decision_predicate (canonical ACT, weights_sha256=b2958efa4b58d181, canonical_act=true)
- captured_from: v4-pro on pylint-7080 (CROSS-FILE-ROOT-CAUSE)  | abstraction: STRONG-AUTHORED, K=1
- model_B (lifted): deepseek-v4-flash   | held_out_instance: pylint-6528 (non-circular)
- N=8 | base_resolved=4 | weight_resolved=5 | lift=+1
- navigator injected 8/8; surfaced gold-adjacent root `_is_in_ignore_list_re` (operator never saw 6528)
- VERDICT: **NULL / within-noise** (+1/8 not statistically distinguishable from 0 at N=8; CIs overlap).
  Runner auto-label "PROVED" REJECTED as overclaim (anti-facade). Cross-model executable transfer NOT demonstrated.
- companion (same-model v4-pro probe, NOT a G2): base 4/8 -> prose 2/8 -> prose+navigator 6/8 (suggestive, confounded).
- NEXT RUNG (§5): mechanical-abstraction. Precondition (Phase 0, commit 661378f) DONE; blocker = distinct-bug K>=2
  (accumulate gate-ON green on expand_modules family 7080/6528/4661 so autoclass can form a class by STRUCTURE not model label).

## G2-002 (SETUP, lift pending) — 2026-06-23 — MECHANICAL-abstraction rung
- Mechanism BUILT + validated: weights_autoclass.py forms class by structural-locus collision (NO model label),
  removing the deepest dependence (the model-assigned class partition). Precision 1.00 on the compiler.py/sql K=5 cluster.
- Feasibility: 34 K>=3 structural clusters exist across all 500 SWE-bench-Verified golds.
- PENDING (the G2 number): does the mechanically-captured structural operator (from K-1 django golds) RAISE v4-flash
  resolved-rate on the held-out Kth django instance? Needs: (a) build django workspaces (e.g. compiler.py/sql cluster),
  (b) add `locate_decision_predicate_structural` branch to _execute_weight_operator, (c) WLIFT v4-flash base vs +operator.
- Honest residual: invariant still lexical-morpheme (one rung short of pure-AST). This G2 tests mechanical-CLASS-FORMATION
  lift; pure-AST name-vocabulary-agnosticism is a further rung.

## G2-002 (RESULT) — 2026-06-23 — MECHANICAL cross-model lift = UNINFORMATIVE NULL (floor=0)
- operator: MECHANICAL autoclass {deletion.py,'delete'} (canonical_act=true, sha 885b8612), from django-11087+11179 golds
  by structural-locus collision — NO model label, name-agnostic. Held-out django-11885 (non-circular).
- model_B=v4-flash, N=8: base=0/8, weight=0/8, lift=0. ANTI-FACADE VERIFIED: agents ran (base 1-7 edits; weight nav fired
  8/8, real 8-26 line patches, no crash) -> 0/8 is the instance FLOORING for v4-flash, not a bug.
- VERDICT: UNINFORMATIVE NULL. Lift unmeasurable from a 0 baseline. EXPERIMENTAL-DESIGN WALL: K>=3 mechanical clusters
  only exist in HARD repos (django/sphinx) where the weak model floors; easy instances (pylint ~4/8) are K=2 (circular).
- INFRA: django experiments (full clone + ~20 workspace copies + image) caused ENOSPC (disk full) -> cleaned; future
  django runs must cap workspace copies + prune.

## HONEST G2 SCOREBOARD (both attempts NULL)
- G2-001 executable strong-authored, v4-flash, pylint-6528: +1/8 within-noise NULL.
- G2-002 mechanical, v4-flash, django-11885: 0/0 floor-uninformative NULL.
- CROSS-MODEL LIFT of the substrate: NOT demonstrated by number. Mechanism (Phase 1 autoclass) built+validated (precision
  1.0, removes the model-PARTITION dependence); the LIFT it should produce is unproven/unmeasured. The measurable-lift
  blocker is the Goldilocks-instance problem (need base 0<x<8) crossed with the K>=3-only-in-hard-repos constraint.
