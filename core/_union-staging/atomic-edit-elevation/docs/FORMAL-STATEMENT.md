# atomic — Formal Property Statement (PARADIGM L10)

This is the precise, falsifiable core of atomic. Prose lives elsewhere; here every claim is stated so
a skeptic could exhibit a counterexample. Each property names the proof that discharges it in the
mandatory lattice (`MANDATORY_SELF_EXPANSION_VALIDATORS` in `server-tools-self.ts`).

## 1. Objects

- **Tree** `T` — a set of files (paths → UTF-8 byte content).
- **Write** `w` — a mutation producing `T∘w` (overlay of candidate contents).
- **Invariant class** `c` — a named dimension of tree-health from the *closed* taxonomy
  `Σ = {c₁…cₙ}` (`gates/invariant-taxonomy.json`). Each `c` has status `enforced` or `partial`.
- **Red set** `R_c(T) ⊆ T` — the locations where tree `T` violates class `c`, as decided by the gate(s)
  that enforce `c`. `R_c(T) = ∅` means `T` is healthy in dimension `c`.
- **Coverage** `Cov = { (c, status_c) : c ∈ Σ }` — the metric ratcheted by L17/L18.
- **Edit** `e` — a gate-verified write, modelled as `(mod_e, read_e, verd_e, np_e)`: its **mod-set**
  `mod_e` (the byte loci it changes), its **read-set / closure** `read_e = Cl(e)` (the loci the gate(s)
  READ to discharge `e`'s obligation — an *over*-approximation, so the commute relation never falsely
  admits), its positive **verdict** `verd_e` (the gate facts it discharged), and its optional
  **negative-action proof** `np_e` (the (a) receipt; see below).
- **DisproofWitness** `np` — for an edit that REMOVES/REPLACES bytes `B`, a machine-**recomputable**
  certificate `(proofSha256, removedByteCount, readLoci, kind)` where `kind ∈ {duplicate, gate-red}` and
  the gate re-derives `kind` over the *actual* removed bytes `B` (never trusting a supplied digest).
- **Commute** `e₁ ⋈ e₂` — the relation `mod₁∩mod₂ = ∅ ∧ mod₂∩read₁ = ∅ ∧ mod₁∩read₂ = ∅`, where each
  `read_i` INCLUDES `np_i.readLoci`. The verified edits under `⋈` form a partial commutative monoid on
  the green manifold.

## 2. The Convergence Floor (the inescapable gate)

> **P1 (Floor).** Every write, through every tool, funnels through the floor `Φ`. `Φ` persists `w`
> **iff** `w` introduces no NEW red in any enforced class:
>
> `persist(w)  ⟺  ∀ c ∈ Σ with status_c = enforced :  R_c(T∘w) ⊆ R_c(T)`  (delta semantics — pre-existing
> debt is tolerated; a write may not *add* a red).

- **Falsifier:** a persisted `T∘w` and an enforced `c` with `R_c(T∘w) ⊋ R_c(T)`. (A write that landed
  while introducing a new dangling wire / type error / leaked process / orphaned socket / secret.)
- **Discharged by:** the per-class WRITE/DYNAMIC/runtime gates (taxonomy column "Enforcing gate(s)").

## 3. Soundness ∧ Completeness of the Floor

> **P2 (Soundness — no false positive).** `Φ` reds `w` for class `c`  ⟹  `w` genuinely introduces a red
> of `c`. The floor never refuses a *valid* edit.
>
> **P3 (Completeness — no false negative).** `w` introduces a red of an enforced class `c`  ⟹  `Φ` reds
> `w`. Within the enforced taxonomy, no real violation slips through.

- **Falsifier (P2):** a valid edit `Φ` refuses. *Historically real:* the Go bug (`import "strings"`
  refused as a dangling dependency) — a P2 violation, now closed and **proven** absent across
  Go/Rust/Python/Java/C/C++ by `byte-floor-language-soundness.proof.mjs` (L06).
- **Falsifier (P3):** a real violation that lands green. *Historically real:* the ~242-process /
  704 MB orphan leak that 134 static proofs stayed green through — a P3 hole, now closed for the
  process/endpoint dimension and **proven discriminating** by `resource-lifetime.proof.mjs` (RT-REAP) and
  `fd-socket-lifetime.proof.mjs` (FD2) (L02/L04).
- Note: P3 is quantified over *enforced* classes only. `partial` classes carry a named scope limit
  (`partial_reason`); they are honest debts, not silent holes.

## 4. Closure of the Taxonomy

> **P4 (Closure).** The set of dimensions the floor enforces is exactly the *named* taxonomy `Σ`: every
> gate wired into the floor maps to some `c ∈ Σ`, and a write touching a dimension `∉ Σ` is itself a red
> (or an explicitly logged "uncovered dimension" admission).

- **Falsifier:** a gate wired into the floor that enforces a dimension absent from `Σ` (an *unnamed*
  guarantee). *Caught constructively:* building the closure check surfaced `liveness` as an unnamed
  dimension, which forced it into `Σ`.
- **Discharged by:** `closure-meta-gate.proof.mjs` (C1–C5) (L05).

## 5. Monotonic Self-Improvement (the paradigm seed)

> **P5 (Monotonic admission).** Admitting a gate that enforces a new class `c⁺` (or promotes `c` from
> `partial`→`enforced`) yields `Cov' ⊋ Cov` AND leaves every prior class's verdict unchanged:
>
> `∀ c ∈ Σ_before : status'_c ≥ status_c`  ∧  `Σ_after ⊇ Σ_before`  ∧ (the admission added or strengthened
> at least one class).
>
> **P6 (Ratchet).** Over the registry's whole history the coverage sequence is non-decreasing:
> `Cov₀ ⊑ Cov₁ ⊑ … ⊑ Covₜ`. Any edit that would drop a class or weaken a status fails CI.

- **Falsifier (P5):** an admission where a prior class flipped (a trade-off, not a strict gain). Proven
  absent for the canonical first admission (`resource-lifetime`) by `coverage-ratchet.proof.mjs`
  ("L17: …flipped NO prior gate/class").
- **Falsifier (P6):** a commit where current coverage `< ` the committed floor `coverage-baseline.json`.
  Caught by `coverage-ratchet.proof.mjs` (it fails the moment a class is removed/regressed; the
  fd-socket-lifetime `partial→enforced` raise is the worked example of the floor *rising*).

## 5.5 The verified-edit algebra + the inverted byte-default (the un-cited CORE)

P1–P6 harden a *precedented* floor (Nidus/MXC). The genuinely un-cited contribution — the empty cell in
atomic's own prior-art matrix — is the integration of an **inverted byte-default** with a
**commute-modulo-invariant algebra** so that a concurrent merge preserves not only the positive verdict
but the **negative (disproof) obligation**. P7 and P8 state it falsifiably.

> **P7 (Obligation-preserving confluence).** For any two verified edits with `e₁ ⋈ e₂`, applying them in
> either order yields byte-identical trees AND both edits' obligations remain discharged in the merge:
>
> `e₁ ⋈ e₂  ⟹  T∘e₁∘e₂ = T∘e₂∘e₁  ∧  verd₁,verd₂ both hold in the merge  ∧  np₁,np₂ both still hold in the merge.`
>
> Generalised to N: every finite pairwise-commuting set `S` is globally confluent and
> obligation-preserving (by induction on `|S|`).

- **The differentiator (unstated in OT/CRDT/Darcs/Pijul/Unison/Hazel/PCC/RLVR):** preservation of the
  *negative* obligation `np_i` — because `read_i` is defined to include `np_i.readLoci`, a merge that
  commutes provably does not disturb the loci a deletion's disproof depended on. `Cl` and the disproof
  read-set are the **same object**, so (a) and (e) are **one** property, not two.
- **Falsifier:** a commuting pair (or N-set) whose two application orders differ in bytes, OR where a
  gate verdict / disproof obligation that held before the merge is red after it.
- **Discharged by:** `confluence_z3.py` (Z3, UNSAT-of-negation over an *abstract* model — ALL
  configurations: L1/L2 obligation preservation, L3 byte-confluence; every hint audited `universals ⊨
  hint`), `nway_induction_z3.py` (Z3 REDUCE + STEP), `NwayConfluence.lean` (Lean 4, the induction
  principle Z3 cannot express), and `algebra.proof.mjs` + `algebra-refinement.proof.mjs` (runtime
  `commute()` == the proven predicate over all 73,728 cross-file AND 73,728 same-file configs).
  **Externally demonstrated** on 169,171 real OSS edit-pairs (zod/type-fest/zustand), `false-independence
  = 0/169,171`, cross-checked by a separately-written import-reachability oracle.

> **P8 (Disproof as a recomputable signal).** A negative action (delete/replace bytes `B`) persists
> **iff** a DisproofWitness `np` holds whose `kind` the gate **re-computes** over `B`:
>
> `persist(remove B)  ⟺  recompute(np.kind, B) = true`  (`duplicate`: `B` still occurs in `T∘e`;
> `gate-red`: a named decidable gate is RED over `B`). A free-text rationale is recorded as
> `asserted`/`recomputed:false` — **never** counted as verified. A forged `proofSha256` is refused
> because the gate recomputes rather than trusts.

- **The refinement over Nidus PSR (honest):** the broad "proof-as-signal to the generator" slot is NOT
  empty (Nidus's PSR returns the UNSAT-core). What is atomic-unique is the **form**: a *recomputable
  byte-level* counterexample over the actually-rejected bytes, digest-bound and forgery-refused — strictly
  more reconstructible information than an obligation id.
- **Falsifier:** a removal that persisted with `recompute(np.kind, B) = false`, OR an `asserted` rationale
  that the system counted as a verified disproof, OR a forged digest the gate accepted.
- **Discharged by:** `negative-proof-teeth.proof.mjs` (re-computes the witness over the removed region;
  forged digests refused) + `self-evolution-disproof-consumer/-briefing.proof.mjs` (the disproof feeds
  generation). The HumanEval lift (+8.5pp, recomputable-disproof arm > scalar > blind) is the *mechanism*
  demonstration; the *content*-attribution at K=5 is directional (`p=0.056`), stated, not hidden.

## 5.6 The universal truth funnel — the SECOND emergent property (P9, P10)

P1–P8 govern "broken **code** is unrepresentable". P9/P10 GENERALIZE that to "wrong **answers** are
unrepresentable", swapping the fixed gate battery for the **task's own deterministic verifier** `V_t`. The
mechanism is machine-checked (`gates/truth-funnel.proof.mjs`); the *real-LLM benchmark number* is the separate
F.4 layer-2 (runnable with an LLM key, EXTERNAL like L11).

> **P9 (Truth-funnel — verifier-gated answer).** A candidate answer `a` (decomposed into independently
> verifiable units) is submitted to the benchmark **iff** `V_t` rejects no unit. A non-deterministic / absent
> `V_t` ABSTAINS (`UNJUDGED`) — never a faked verdict (Rice/honesty).

> **P10 (Byte-positive monotone convergence).** Across funnel iterations, an accepted unit is frozen and never
> re-derived; only rejected units are re-derived. So `accepted(aₖ) ⊆ accepted(aₖ₊₁)` and the rejected set never
> grows — the L18 ratchet over *answer-units*. The model re-reasons only over the still-wrong bytes/units, so
> the search space contracts monotonically.

- **Convergence boundary (HONEST, load-bearing).** The funnel reaches `rejected=∅` iff `V_t` is deterministic
  ∧ the answer is unit-decomposable ∧ `P(correct unit | granular feedback) > 0` ∧ budget holds. Where `P=0`
  (capability ceiling) or the budget is exhausted, it does NOT converge — atomic does not create intelligence,
  it forbids latent intelligence from being wasted by bad execution.
- **Falsifier (P9):** an answer submitted with a rejected unit, or a non-deterministic verifier treated as
  gating. **Falsifier (P10):** an iteration where a previously-accepted unit regresses to rejected.
- **Discharged by (mechanism):** `truth-funnel.proof.mjs` — P9 gate, P9 UNJUDGED abstention, P10 freeze + monotone,
  F4 convergence with P>0, F4 honest non-convergence at the ceiling, F4 byte-positive acceleration (~20× fewer
  iterations than blind-retry, avg/8 seeds). The end-task benchmark number is F.4 layer-2 (PART F).

## 6. The irreducible claim, formally

> *"Broken states are unrepresentable, and the invariant set that defines 'broken' grows by proof,
> monotonically — and concurrent verified edits merge while preserving both their positive and their
> negative (disproof) obligations."*
>
> = **P1 ∧ P3** (no persisted tree carries a new red of any enforced class) **∧ P4** (the enforced set is
> the closed, named taxonomy) **∧ P5 ∧ P6** (that set only ever grows, by proof, never regressing) **∧ P7
> ∧ P8** (the (a)+(e) core: a commuting merge preserves both obligations; a deletion persists only against
> a recomputable disproof). P1–P6 are the *hardened floor*; P7–P8 are the *un-cited contribution*.

A reviewer falsifies the paradigm claim by exhibiting **one** of: a persisted tree with a new enforced
red (¬P1/¬P3); a valid edit the floor refused (¬P2); a wired gate enforcing an unnamed dimension (¬P4);
an admission that flipped a prior class (¬P5); a coverage regression that shipped (¬P6); a commuting merge
that broke a verdict or disproof obligation (¬P7); or a removal that persisted without a recomputable
disproof (¬P8). The mandatory lattice runs a discharging proof for each, and `npm run paradigm-verify`
(L12/U1) re-checks them from a clean clone (P7's Lean step run-if-present; absent ⇒ honest SKIP pointing
at the committed artifact + the local Z3 coverage of base+step, never a fake green).

## 7. What this statement does NOT claim (honesty boundary)

- It does **not** claim semantic-intent correctness (that a well-formed edit does what the human *meant*)
  — that is out-of-scope by construction (taxonomy `out_of_scope`).
- It does **not** yet claim a mechanism-attributable, third-party-reproduced *benchmark* number isolating
  the floor's convergence delta from the LLM (that is L11, and is `EXTERNAL_BLOCKED` pending the
  aider-polyglot / SWE-bench ablation runs). P1–P8 are *internal* correctness properties; L11 is the
  *external* effect-size measurement. The paradigm claim rests on P1–P8 being proven AND L11 being
  produced honestly — this document closes the former.
- It does **not** defeat **Rice's theorem**. P7's algebra decides interference over a *decidable* static
  read-closure (an over-approximation); semantic/runtime coupling outside that closure is `UNJUDGED`, a
  first-class verdict, not a guess. The same-file positional/non-identifier residual is named and narrow.
- It does **not** claim **recognition** (peer review · independent replication · external adoption). That
  is conferred by the field, not by code. This document is the priority record + the re-runnable
  artifacts; the rest is the outside world's to grant.
