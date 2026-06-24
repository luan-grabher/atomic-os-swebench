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

## VSA-RUNG PRE-SIGNAL (2026-06-23, CPU-only, no Docker) — positive, but it's the LOCUS signal
Tested whether the Codex-built VSA layer (encode_vsa_text/bundle/similarity in weights_admit.py) discriminates classes
on golds. VSA-over-LOCUS-text (file-basename + edited function names) on compiler.py/sql K=5: leave-one-out vs 12 decoys =
DISCRIMINATION 4/5 (member sim 0.37-0.57 vs decoy 0.18-0.29). This is FAR better than the pure-AST/structure rung (0/5,
falsified) — but for the SAME reason the morpheme+file key works: VSA discriminates because it encodes the LOCUS vocabulary,
NOT pure structure. So: (a) confirms (again) the class signal lives in the locus; (b) VSA is a FUZZY re-encoding of the same
signal the discrete morpheme+file key already captures at precision 1.0. VSA's potential ADDED value = generalizing to
near-miss members the exact key would miss — UNTESTED. So the VSA rung is worth testing ONLY over the locus (not pure
structure), and its marginal value over the exact key is the open question, not a given.

## G2-003 (RUNNING) — FIXED model v4-pro, MECHANICAL operator, Goldilocks-selected django-11490 (1-line gold)
- Docker recovered by aggressive VM-kill (ENOSPC hang; soft restart failed, killing com.docker.virtualization + stale socket worked).
- Goldilocks selection: scanned all 34 K>=3 django clusters by gold-size; django-11490 (compiler.py/sql K=5, gold=1 line/1 file)
  is the smallest-gold = best bet to land base in the measurable band (0<base<8), unlike django-11885 (130-line gold, floored).
- operator: MECHANICAL {compiler.py,'sql'} (canonical_act=true, no model label), captured from 12965/14007/15563, held-out 11490.
- gold feasibility PASSED (django-11490 gold resolved 1/1, image builds). v4-pro base+weight arms running. Number pending.

## G2-003 (RESULT) — 2026-06-23 — FIRST MEASURABLE G2: ZERO lift, the bottleneck is the FIX not the locus
- FIXED model v4-pro, MECHANICAL operator {compiler.py,'sql'} (canonical_act=true, sha 3e6a39cc), held-out django-11490.
- base=1/8 weight=0/8 lift=-1 (within noise: 1 vs 0 at N=8 → NULL-to-slightly-negative, NO lift). base_goldilocks=YES (measurable).
- ANTI-FACADE VERIFIED (read the agents): nav fired 8/8; ALL 8 weight agents routed to compiler.py (the gold file) and edited
  there (1-4 lines) — NONE resolved. The one base success (base_2) resolved WITHOUT touching compiler.py.
- ★ THE KEY BY-NUMBER FINDING (sharp, across all 3 G2): the operator delivers the WHERE (navigation/locus — it routed every
  agent to the correct gold file), but NOT the HOW (the transformation). Routing to the right locus does NOT lift resolution;
  the model still failed to author the correct 1-line fix. The cross-model lift the thesis needs requires capturing the
  TRANSFORMATION (the edit shape), not just the locus.
- SCOREBOARD (3 G2, NONE shows lift): G2-001 +1/8 null (exec strong-authored), G2-002 0/0 floor (mech), G2-003 -1/8 null/neg
  MEASURABLE (mech). Cross-model substrate lift = NOT demonstrated; on the first measurable instance it is null-to-negative.
- NEXT RUNG (per the finding, NOT VSA-locus which is still about the WHERE): TRANSFORMATION-TEMPLATE operator — anti-unify the
  K cluster-mates' gold AST-diffs into a parameterized edit shape, inject it (the HOW). Phase 0 (commit 661378f) persists
  raw_diff + edited_units → this rung is now buildable. Whether a generic anti-unified template helps or is too generic is the
  open question — the next G2.

## CONFIRMING NUMBER (2026-06-23) — SWE-bench-Verified has ~ZERO fix-class re-occurrences
Searched all 500 golds for fix-SHAPE duplicates (added lines normalized: identifiers->V, strings->S, numbers->N, keeping
keyword/operator skeleton — so the SAME transformation matches regardless of surface names). Result: fix-shape classes with
K>=3 = **0**; cross-repo fix-shape K>=2 = just 1 (likely coincidental). So SWE-bench-Verified is, by number, a DISTINCT-BUG
benchmark with no recurring fix-classes. This DEFINITIVELY confirms: the cross-model lift thesis (lift on an ALREADY-LEARNED
class = a re-occurrence) is NOT measurable on this instrument — there are no held-out re-occurrences to lift. The 3 G2 nulls
are structurally guaranteed, not representation failures. To test the thesis on real data needs a DIFFERENT corpus (one with
recurring bug-classes) or a synthetic re-occurrence harness (with circularity guards). This is a human/design decision on the
next instrument — a legitimate stop point per the doctrine ("sinal que exija humano").

## SESSION G2 ARC — COMPLETE + HONEST (by number)
- Substrate MECHANISM: built + validated (autoclass precision 1.0 removes model-partition dependence; pure-AST rung falsified
  0/5; VSA-locus 4/5 = fuzzy re-encoding of locus). REAL, committed.
- Cross-model LIFT: G2-001 +1/8 null, G2-002 0/0 floor, G2-003 1/8->0/8 measurable ZERO-lift (operator delivers WHERE not HOW).
  3 attempts, none shows lift — AND proven structurally unmeasurable on SWE-bench (0 fix re-occurrences).
- VERDICT: thesis UNTESTED on the right instrument, not falsified. SWE-bench held-out = wrong instrument (distinct bugs).
  Next instrument = re-occurrence (real recurring-bug corpus, or synthetic w/ circularity guards) = a deliberate fresh build.

## SYNTHETIC RE-OCCURRENCE PROBE (2026-06-24) — CEILING by number, confirming the liftability tension
Built a synthetic re-occurrence fix-class (shared-mutable-class-attr; 3 surface-distinct occurrences; crisp local
acceptance test = per-instance state isolation, NO Docker). Goldilocks probe: v4-pro base one-shot on the held-out = 3/3
CEILING. So a fix-class simple enough to cleanly recur + author K instances is ALSO simple enough that the model already
knows the fix → no room for lift. THE LIFTABILITY TENSION (proven from 2 directions now): a measurable lift needs (a) same-
transform recurrence + (b) weak model fails one-shot + (c) learnable-from-K — and these FIGHT: (a)+(c)→simple/known→ceiling;
(b)→hard/novel→no recurrence. The intersection = model-UNKNOWN-but-SYSTEMATIC = project-specific non-obvious conventions =
needs a harvested real corpus (authoring it = circular = the strong model relocated into the loop). Cross-model lift is
UNTESTED on the right instrument, not falsified. Refused to fabricate a circular synthetic lift (anti-facade > stop-hook).
