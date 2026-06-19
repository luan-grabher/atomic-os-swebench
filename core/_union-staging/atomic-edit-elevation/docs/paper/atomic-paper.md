# atomic: A Verified-Edit Substrate — Obligation-Preserving Confluence and an Inverted Byte-Default over a Monotonically Self-Expanding Invariant Taxonomy

**Status:** unified submission draft (PARADIGM L13 / U5). Complete except §7.2 (the mechanism-attributable
LLM benchmark, L11/D.4), which is `EXTERNAL_BLOCKED` pending LLM ablation runs — its methodology is fully
specified so the number drops into a labeled slot. Every internal claim (§4) is machine-checked by
`npm run paradigm-verify` (P1–P8: **14/14 GREEN, no skips**, including the Z3 + Lean algebra theorem). This
draft supersedes the pre-unification version that mis-located the novelty in the floor; the un-cited core is
the **(a)+(e) verified-edit algebra** (§4.5, §5).

## Abstract

LLM code agents edit repositories as unstructured text and can leave a tree broken — a dangling import, a
type error, an orphaned process — that no single check catches. We present **atomic**, a *verified-edit
substrate* in which every write, through every tool and every agent, funnels through one **convergence floor**
that refuses to persist a tree carrying a *new* violation of any enforced invariant. We are explicit about
what is precedented and what is not. The inescapable floor, the monotonic self-extension lattice, and the
closed invariant taxonomy are **excellent but precedented** (Nidus, arXiv 2604.05080; Microsoft MXC). The
**un-cited contribution** — the empty cell in the surveyed prior-art matrix — is the integration of an
**inverted byte-default** (removing or replacing bytes is *refused* unless a machine-**recomputed**
disproof-of-incorrectness holds over the actual removed bytes) with a **commute-modulo-invariant edit
algebra** whose independence relation is judged over the *same* semantic read-set the verification gates read.
The payoff is a property the surveyed PL / patch-theory / agent prior art does not state: a commuting
concurrent merge provably preserves not only the *positive* gate verdict but the *negative* (disproof)
obligation. This is machine-checked — a Z3 soundness theorem over an abstract model (all configurations) plus
a Lean 4 induction for the N-way case — and demonstrated sound on **169,171** real external edit-pairs with
**zero** unsound verdicts. We state eight formal properties (P1–P8), discharge each with an adversarial,
discriminating proof in a mandatory validator lattice, and reproduce the whole from a clean clone by one
command.

## 1. Introduction

The gap atomic closes is between a *synthesis* — a useful pile of checks — and a *law*, and then between a
strong governed-mutation substrate and a genuinely *new* mechanism. A pile can never say what it *guarantees*,
only what it *happens to* check; we close that with an inescapable floor over a **closed, named, monotonically
self-expanding** taxonomy (P1–P6). But monotonic governed mutation is, post-Nidus, no longer novel. The
mechanism that *is* un-cited is the **edit algebra** (P7–P8): correct bytes are immutable to negative actions
unless a recomputed disproof holds, and two gate-verified edits commute exactly when their gate-read-sets are
disjoint — so a concurrent merge preserves the disproof obligation, not only the verdict. The contribution is
this algebra and its integration with the floor, validated internally (Z3+Lean+production ledgers) and
externally (169k OSS edit-pairs, a HumanEval disproof-lift), and made reproducible by one command.

## 2. Background and Related Work

(Full analysis: `docs/PRIOR-ART.md`; head-to-head with the nearest neighbour: §2.1.) Every *component* is
precedented: structured AST edits (CodeStruct, arXiv 2604.05407); proof-carrying code (Necula & Lee 1996);
refuse-broken-state delta gates (ENCRUST, arXiv 2604.04527); coverage ratchets (differential coverage); agent
edit gateways (agent-guardrails, GUARDRAIL); and — critically — the **inescapable governed-mutation floor with
a monotonic self-extension lattice** (Nidus, MXC). We do **not** claim novelty for any of these.

The novelty is the **edit ALGEBRA** cell, which no surveyed system fills. For two *edits*:

| System | what it decides about two edits | why not this algebra |
|---|---|---|
| git 3-way | textual hunk overlap | a "clean" merge can break a cross-file binding |
| Darcs | patch commutation by textual dependency | over text positions, not a read-closure of obligations |
| Pijul | pushout in a free category of textual changes | sound for text conflicts; silent on import coupling |
| OT / CRDT | converge a shared buffer / replicated data | per-buffer, no "B reads a locus A discharged" |
| Unison | content-addressed defs; renames non-conflicts | identity at def level, not a 2-patch commute relation |
| PCC | a proof certifies one artifact vs a policy | not a *relation* between two independent edits |
| Nidus | mutations totally ordered by git; immutable obligations | **no commute relation; no inverted byte-default** |

### 2.1 atomic vs Nidus (the honest verdict)

Nidus is the nearest neighbour. Read in full, the verdict is **not** "atomic does everything Nidus does,
better" — they are **peers on the substrate**, each unique somewhere. Nidus is unique in **stigmergic
coordination** (a friction ledger; trust tiers; agents self-route with no orchestrator) and in a **100k-LOC
self-host across 3 LLM families**. atomic is unique in the **verified-edit algebra** (commute-modulo-invariant,
obligation-preserving confluence — machine-checked Z3+Lean, 169k external pairs), the **inverted byte-default**
(disproof to delete), and the **recomputable-witness** form of proof-as-signal (a byte-level counterexample,
not an UNSAT-core). This work additionally **absorbs** Nidus's stigmergic gap (§6) so the conjunction (§6.4) is
owned by neither.

## 3. System Design

- **The floor (P1).** Every mutating tool resolves through the convergence operator, which runs the gate set
  in the WRITE direction and refuses to persist if any enforced class gains a new red (delta vs prior bytes).
- **The inverted byte-default — (a) (P8).** Removing/replacing bytes is refused unless the agent supplies a
  `DisproofWitness` the gate **re-computes** over the actual removed bytes (`duplicate`: the removed region
  still occurs in the result; `gate-red`: a named decidable gate is RED over the removed bytes). A free-text
  rationale is recorded honestly as `asserted`/`recomputed:false` — never counted as verified.
- **The edit algebra — (e) (P7).** Two verified edits commute iff `mod₁∩mod₂ = ∅ ∧ mod₂∩read₁ = ∅ ∧
  mod₁∩read₂ = ∅`, where `read_i` is the locus set edit *i*'s gate read to discharge its obligation —
  *including* the (a) disproof read-loci. `Cl` and the disproof read-set are the **same** object, so (a) and
  (e) are **one** property: a commuting merge preserves the negative-action justification, not only the verdict.
- **The closed taxonomy (P4).** 23 invariant classes (`gates/invariant-taxonomy.json`) — including the two
  first-class algebra classes `negative-action-justification` and `commute-obligation-preservation` — each
  `enforced` or `partial`, mapped to ≥1 gate; the closure meta-gate reds any wired gate enforcing an unnamed
  dimension.
- **Runtime invariants.** Process/fd/socket *lifetime*: a single-source `parent-death-reaper` reaps a socket
  broker orphaned by abnormal owner death (the leak 134 static proofs missed); a machine-wide census bounds K
  concurrent host stacks.
- **Monotonic admission (P5/P6).** Coverage = classes + statuses; a committed baseline is the ratchet floor.
  Admitting/strengthening a class is proven to strictly raise coverage and flip no prior class; CI fails on any drop.
- **Agent-independence.** Claude, Codex and OpenCode each load the identical atomic-only enforcement, proven
  by driving the real per-agent hooks.

## 4. Formal Properties (P1–P8)

(Full statement with falsifiers: `docs/FORMAL-STATEMENT.md`.)

- **P1 Floor:** `persist(w) ⟺ ∀ enforced c: R_c(T∘w) ⊆ R_c(T)`.
- **P2 Soundness:** the floor reds `w` for `c` ⟹ `w` truly adds a `c`-red (no false positive).
- **P3 Completeness:** `w` adds an enforced `c`-red ⟹ the floor reds `w` (no false negative).
- **P4 Closure:** enforced dimensions = the named taxonomy; an unnamed-dimension write is red.
- **P5 Monotonic admission:** an admission yields `Cov' ⊋ Cov` with every prior class unchanged.
- **P6 Ratchet:** coverage is non-decreasing over registry history.
- **P7 Obligation-preserving confluence:** `e₁ ⋈ e₂ ⟹ T∘e₁∘e₂ = T∘e₂∘e₁` ∧ both gate verdicts ∧ both disproof
  obligations preserved; N-way by induction. **The differentiator** — preservation of the *negative* obligation.
- **P8 Disproof as a recomputable signal:** `persist(remove B) ⟺ recompute(np.kind, B) = true`; a forged digest
  is refused because the gate recomputes rather than trusts.

Irreducible claim ≙ `P1 ∧ P3 ∧ P4 ∧ P5 ∧ P6 ∧ P7 ∧ P8`. P1–P6 are the hardened (precedented) floor; P7–P8 are
the un-cited contribution.

## 5. The verified-edit algebra, machine-checked

- **Z3 (all configurations).** `formal/atomic-algebra/confluence_z3.py` proves, by UNSAT-of-negation over an
  *abstract* model, that a commuting merge keeps *both* gate obligations discharged (L1/L2 — the differentiator)
  and byte-confluence (L3); every hint is audited (`universals ⊨ hint` checked UNSAT). `nway_induction_z3.py`
  proves the REDUCE + STEP lemmas.
- **Lean 4 (the induction Z3 cannot express).** `formal/atomic-algebra/NwayConfluence.lean` machine-checks the
  induction principle for all N (no mathlib). With the Z3 pairwise base + Lean induction, every finite
  pairwise-commuting set is globally confluent and obligation-preserving. *(Verified locally: `lean
  NwayConfluence.lean` exits 0.)*
- **Runtime refinement.** `gates/algebra-refinement.proof.mjs` proves runtime `commute()` equals the proven
  predicate over all 73,728 cross-file AND 73,728 same-file configs.
- **External demonstration.** `t3_corpus.mjs` ran the algebra over **169,171** real edit-pairs (zod 80,200 ·
  type-fest 88,410 · zustand 561), cross-checked by a separately-written import-reachability oracle:
  **false-independence = 0/169,171**. The run itself found and fixed a real soundness bug (missed re-export
  edges), now locked by a regression.

## 6. Absorbing the SOTA: the emergence program (PART D)

We absorb Nidus's capabilities and *fuse* them with atomic's core, then name the never-before-done products:

- **Stigmergic friction router (A-G1).** A friction ledger keyed by `(agent, invariantId)` folded from the
  *recomputable* disproof corpus — so the pheromone is a digest-bound, forgery-refused witness, **richer** than
  Nidus's bare counter. Trust tiers, self-routing, collision-avoidance. *(gates/friction-router.proof.mjs)*
- **Inheritable guidebooks (A-G2), minimal recomputable disproof (A-G3/E2), general PSR (A-G5/N2),
  methodology-as-artifact (A-G4), record-completeness theorem (A-G7), graded trust (A-G8), self-host slice
  (A-G6, ~94k LOC).** Each is built and machine-checked.
- **The emergent fusions (D.3).** **E1** — provably-confluent, friction-routed multi-agent editing: routing
  spreads agents across disjoint loci; the (e) algebra machine-checks the concurrent wavefront confluent +
  obligation-preserving. UNIFIED (routing × algebra) strictly dominates atomic-core (no routing) and is
  certifiable where Nidus-style (no algebra) cannot prove it. **E2** minimal recomputable disproof. **E3**
  organization-scale self-improving correctness. **E4** the conjunction — eight adjectives, each owned by a
  prior system, the conjunction by none.
- **Observability of the unformalizable (D.6).** An observatory (novelty index, agent-niche, wall-topology,
  meta-laws, anomaly residual) instruments the loop so that *if* an emergence exists it becomes a measured
  fact; the anomaly residual is a tamper-evident hash chain.

### 6.4 The conjunction, calibrated

A self-hosting, self-governing, self-routing, provably-confluent, monotonically-self-expanding,
agent-independent verified-edit substrate whose definition of "broken" grows by recomputable proof and whose
multi-agent coordination is driven by that same proof signal. Each adjective maps to a green, lattice-wired
proof (E4); the conjunction is, to our knowledge, unprecedented.

## 7. Evaluation

### 7.1 Internal correctness (done)

`npm run paradigm-verify` discharges P1–P8 from a clean build: **14/14 GREEN, no skips** (build, P2 6-language
soundness, P3/P3b/P3c completeness + paired adversarial gate proofs, P4 closure, P-agent independence, P5+P6
ratchet, lattice, P7 algebra runtime + Z3 + Lean, P8 disproof loop, P1 47/47 smoke). 79 mandatory validators
(24 added this elevation, incl. lang-misrouting + negative-proof coverage, the algebra core, the friction
router, the E1–E4 fusions, and the emergence observatory), each adversarial and *discriminating* (shown able
to go red on a synthetic counterexample). Production ledgers
(adversarially recomputed): **9,314 traces, 0 introduced syntax breaks**; deny-hook **1,088 real native
mutations blocked, 0 silently allowed**.

### 7.2 Mechanism-attributable effect (PLANNED — L11/D.4, EXTERNAL_BLOCKED)

**Hypothesis:** the floor + algebra raise correct multi-agent throughput at zero broken-persisted-states
*independently of the LLM*. **Design:** four arms (no-floor; Nidus-style governed-but-totally-ordered;
atomic-core floor+algebra-no-routing; UNIFIED) on a fixed large repo slice with K concurrent agents, same
model/budget; pre-registered metrics (correct-edits/hour; broken-state rate; merge-conflict rate;
tokens/correct-edit; wall-repeat rate) with CIs, a paired test, held-out invariants, and a pre-committed death
condition. **Down-payment:** a full HumanEval disproof-lift (baseline 85.4% → recomputable-disproof 93.9%,
+8.5pp; content-attribution directional at K=5, p=0.056). **Result slot:**

> `‹arm-4 vs arm-2/arm-3 Δ on confluent multi-agent throughput at zero broken states — to be filled from runs›`

## 8. Reproducibility

Fresh clone → `npm run paradigm-verify` → property-indexed verdict (P1–P8). The algebra theorem reproduces via
`python3 formal/atomic-algebra/confluence_z3.py` + `nway_induction_z3.py` and `lean NwayConfluence.lean`; the
169k-pair corpus via `t3_corpus.mjs`. The benchmark (§7.2) reproduces via the `atomic-edit-bench` harnesses
once LLM access is provided.

## 9. Limitations & Honesty Boundary

- **Rice is side-stepped, not defeated.** The algebra decides interference over a *decidable* static
  read-closure; semantic/runtime coupling outside it is `UNJUDGED`, a first-class verdict. The same-file
  positional/non-identifier residual is named and narrow.
- **Supply-chain floor-wiring** is enforced for JS+Go (structural false-positive-free); Rust/Python/Java stay
  resolver-only by a deliberate soundness choice (installed-but-unlisted deps are statically indistinguishable
  from dangling ones), with exhaustive stdlib + sibling resolution now in place.
- **Recognition** (peer review · independent replication · external adoption) and the §7.2 K-agent benchmark
  are **not claimed**. The conjunction (§6.4) is built and proven; "revolutionary/unprecedented" is conferred
  by the field, not by this file. That calibrated claim is *stronger* than an absolute one because it survives
  a hostile reviewer.

## 10. Conclusion

atomic converts "broken is unrepresentable, the definition of broken grows by proof monotonically, and
concurrent verified edits merge while preserving both their positive and their negative obligations" from a
slogan into eight machine-checked properties under an inescapable, agent-independent floor — and absorbs the
SOTA's coordination gap so the whole is owned by no prior system. The remaining step from *proven-internally*
to *demonstrated-revolutionary* is the §7.2 ablation — a measurement, not a redesign.

## References

See `docs/PRIOR-ART.md` for the full citation list (Nidus arXiv 2604.05080; Necula & Lee 1996; CodeStruct
arXiv 2604.05407; ENCRUST arXiv 2604.04527; differential coverage arXiv 2008.07947; data-driven invariant
generation arXiv 2312.17527; agent-guardrails; GUARDRAIL; AI Agent Code of Conduct arXiv 2509.23994).
