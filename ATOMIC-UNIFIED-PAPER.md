# atomic: A Verified-Edit Substrate — One Law (only the proven exists), an Inverted Byte-Default with Obligation-Preserving Confluence, Proof-Carrying Self-Improvement, and an Honest Ceiling

**Unified paper.** This document consolidates the prior atomic write-ups (the engine paper, the formal-property statement, the (a)+(e) algebra pre-print, the "Atomic OS" draft, the elevation report, and the honest cognition laudo) into one artifact that **states, explains, proves, teaches, shows, and bounds** the whole system. Every quantitative claim is tagged by its verification status: **[machine-checked]**, **[measured-live]**, **[external-demo]**, or **[pending/honest-gap]**. Nothing is asserted that the repository cannot back, and the honest ceiling is stated, not hidden.

---

## Abstract

Large-language-model (LLM) coding agents edit repositories as unstructured text and can leave a tree broken — a dangling import, a type error, an orphaned process, a deleted-but-correct line — that no single check catches. **atomic** is a *verified-edit substrate* built on a single law applied recursively to every layer: **only the proven exists**. Concretely: (i) no byte reaches disk unless a battery of executable gates proves the write introduces no new violation (pre-disk verification, enforced down to the OS kernel); (ii) the system modifies *itself* only through that same proof gate, under a monotonic ratchet that can never regress a guarantee; (iii) it *learns* only by admitting proof-carrying generalized operators that compress many solved instances without losing fidelity; and (iv) it reports its own results under an anti-facade discipline that records defeat as defeat. The technical core — the contribution unfilled by surveyed prior art — is the integration of an **inverted byte-default** (deleting/replacing bytes is *refused* unless a machine-**recomputed** disproof-of-incorrectness holds over the actually-removed bytes) with a **commute-modulo-invariant edit algebra** whose independence relation is judged over the *same* read-set the gates read, yielding a property prior patch-theory does not state: a commuting concurrent merge provably preserves both the **positive** gate verdict and the **negative** (disproof) obligation. This is machine-checked (Z3 over all configurations + a Lean 4 N-way induction) and demonstrated sound on **169,171** real external edit-pairs with **zero** unsound verdicts. The substrate drives a cheap model (DeepSeek V4 Pro) through an A/B measurement loop on **SWE-bench Verified** that has officially dominated three escalating difficulty levels. We are explicit about what is **not** earned: Rice's theorem is side-stepped (not defeated), cross-model *transfer* of learned operators to genuinely novel problems is unproven, the closed self-improvement loop is partial, and "revolutionary/unprecedented" is recognition the field confers, not code.

---

## 1. Introduction — the gap, and the one idea

The gap atomic closes is between a *synthesis* (a useful pile of checks that can only say what it *happens to* check) and a **law** (something that says what it *guarantees*). A pile cannot promise; a law can. atomic's law is one sentence:

> **Only the proven exists.**

The whole system is that sentence applied recursively to five layers. Learn the law once and you understand atomic entirely:

| Layer | The same law, reapplied | Mechanism |
|---|---|---|
| **Disk** | no unproven byte is written | pre-disk convergence floor (P1) |
| **OS** | the kernel blocks unenveloped writes — inescapable, even by the agent itself | `byte-guard-kernel` (eBPF LSM / Endpoint Security / sandbox-exec) + proof-token |
| **Self-change** | the system alters itself only in ways it proves break nothing | `expand_self` + monotonic ratchet (P5/P6) |
| **Memory** | only proven-correct solutions become learning, stored in compressed general form | proof-carrying operator admission (3 laws) |
| **Claims** | nothing is "done" without a number; a loss is logged as a loss | anti-facade discipline + A/B measurement |

Sections 3–5 formalize and build these. Section 2 fixes what is precedented versus novel, so the novelty claim is credible rather than naive.

---

## 2. What is precedented, and what is not (stated up front)

Every **component** has ancestry, and we claim novelty for none of them: structured AST edits (CodeStruct); proof-carrying code (Necula & Lee, 1996); refuse-broken-state delta gates (ENCRUST); coverage ratchets (differential coverage); agent edit gateways (GUARDRAIL); inescapable governed-mutation floors with monotonic self-extension (Nidus, arXiv 2604.05080; Microsoft MXC); skill-library accumulation (Voyager); case-based reasoning; the Gödel-machine self-improvement lineage; and compression-as-intelligence (Solomonoff, MDL, Hutter).

The **un-cited cell** — empty across every surveyed system — is the **edit *algebra*** integrated with the inverted byte-default:

| System | what it decides about two edits | why it is not this algebra |
|---|---|---|
| git 3-way | textual hunk overlap | a "clean" merge can break a cross-file binding |
| Darcs / Pijul | patch commutation by textual dependency | over text positions, not a read-closure of obligations |
| OT / CRDT | converge a shared buffer/replicated state | per-buffer; no "B reads a locus A discharged" |
| Unison | content-addressed defs; renames non-conflicts | identity at def level, not a 2-patch commute relation |
| PCC | a proof certifies one artifact vs a policy | not a *relation* between two independent edits |
| Nidus | mutations totally ordered by git; immutable obligations | no commute relation; no inverted byte-default |

The honest nearest-neighbour verdict: atomic and Nidus are **peers on the substrate**, each unique somewhere. Nidus is unique in stigmergic multi-agent coordination and a 100k-LOC self-host across three LLM families; atomic is unique in the verified-edit **algebra**, the **inverted byte-default**, and the **recomputable-witness** form of proof. The inescapable floor and monotonic self-extension that atomic *also* has are **no longer novel** post-Nidus/MXC, and we do not claim them.

---

## 3. Formal foundations

### 3.1 Objects

- **Tree** `T` — files as path → UTF-8 bytes. **Write** `w` — a mutation producing `T∘w`.
- **Invariant class** `c` — a named dimension of tree-health from a *closed* taxonomy `Σ = {c₁…cₙ}`, each `enforced` or `partial`.
- **Red set** `R_c(T) ⊆ T` — where `T` violates `c`. `R_c(T)=∅` means healthy in `c`.
- **Edit** `e = (mod_e, read_e, verd_e, np_e)`: its byte loci changed (`mod`), the loci the gate **read** to discharge its obligation (`read_e = Cl(e)`, an over-approximation), its positive verdict, and its optional negative-action proof.
- **DisproofWitness** `np` — for a removal of bytes `B`, a machine-**recomputable** certificate `(proofSha256, removedByteCount, readLoci, kind)`, `kind ∈ {duplicate, gate-red}`, re-derived over the *actual* `B` (never trusting a supplied digest).
- **Commute** `e₁ ⋈ e₂ ≔ mod₁∩mod₂ = ∅ ∧ mod₂∩read₁ = ∅ ∧ mod₁∩read₂ = ∅`, where each `read_i` **includes** `np_i.readLoci`. Verified edits under `⋈` form a partial commutative monoid on the green manifold; identity is the empty splice.

### 3.2 The properties (P1–P10), each falsifiable

- **P1 Floor.** Every write through every tool funnels through floor `Φ`; `persist(w) ⟺ ∀ enforced c: R_c(T∘w) ⊆ R_c(T)` (delta semantics — may not *add* a red). **[machine-checked]**
- **P2 Soundness.** `Φ` reds `w` for `c` ⟹ `w` truly adds a `c`-red (no false positive). *Historically real falsifier, now closed:* a Go `import "strings"` once refused as dangling — proven absent across Go/Rust/Python/Java/C/C++. **[machine-checked]**
- **P3 Completeness.** `w` adds an enforced `c`-red ⟹ `Φ` reds `w` (no false negative). *Historically real falsifier, now closed:* a ~242-process / 704 MB orphan leak that 134 static proofs stayed green through, now caught by resource-lifetime/fd-socket gates. **[machine-checked]**
- **P4 Closure.** Enforced dimensions = exactly the named taxonomy `Σ`; a write touching an unnamed dimension is itself red. (Building the closure check surfaced `liveness` as unnamed and forced it into `Σ`.) **[machine-checked]**
- **P5 Monotonic admission.** Admitting/strengthening a class yields `Cov' ⊋ Cov` and flips no prior class. **[machine-checked]**
- **P6 Ratchet.** Coverage is non-decreasing over registry history; CI fails on any drop. **[machine-checked]**
- **P7 Obligation-preserving confluence (the differentiator).** `e₁ ⋈ e₂ ⟹ T∘e₁∘e₂ = T∘e₂∘e₁ ∧ verd₁,verd₂ ∧ np₁,np₂ all hold in the merge`; N-way by induction. Preservation of the **negative** obligation is unstated in OT/CRDT/Darcs/Pijul/Unison/Hazel/PCC. **[machine-checked: Z3 + Lean]**
- **P8 Disproof as a recomputable signal.** `persist(remove B) ⟺ recompute(np.kind, B) = true`; a free-text rationale is recorded `asserted/recomputed:false`, never counted as verified; a forged digest is refused because the gate recomputes rather than trusts. **[machine-checked]**
- **P9 Truth-funnel (generalization to answers).** Swapping the fixed gate battery for a task's deterministic verifier `V_t`: a candidate answer's unit is submitted *iff* `V_t` rejects no unit; a non-deterministic/absent `V_t` **abstains (`UNJUDGED`)**, never fakes a verdict. **[machine-checked mechanism]**
- **P10 Byte-positive monotone convergence.** Across funnel iterations an accepted unit is frozen and never re-derived; only rejected units are re-derived, so `accepted(aₖ) ⊆ accepted(aₖ₊₁)` and the search space contracts. **Honest convergence boundary:** reaches `rejected=∅` *iff* `V_t` deterministic ∧ answer unit-decomposable ∧ `P(correct unit | feedback) > 0` ∧ budget holds. Where `P=0` (capability ceiling) it does **not** converge — *atomic does not create intelligence; it forbids latent intelligence from being wasted by bad execution.* **[machine-checked mechanism; ~20× fewer iterations than blind-retry over 8 seeds]**

The irreducible claim is `P1 ∧ P3 ∧ P4 ∧ P5 ∧ P6 ∧ P7 ∧ P8`: *broken states are unrepresentable; the set defining "broken" grows by proof, monotonically; and concurrent verified edits merge preserving both positive and negative obligations.* P1–P6 are the hardened (precedented) floor; **P7–P8 are the un-cited contribution.**

### 3.3 The (a)+(e) algebra, machine-checked

The contribution is the integration of two mechanisms into **one property**:

- **(a) Inverted byte-default.** Correct-by-construction bytes are immutable to negative actions; deletion requires a recomputed disproof (P8).
- **(e) Commute-modulo-invariant algebra.** Two verified edits commute iff their mod/read-sets are disjoint (P7).
- **The unification (the point).** `Cl` and the disproof's `readLoci` are the **same object** — so a commuting merge provably preserves the negative-action justification, not only the verdict. (a) and (e) are *not* two subsystems that coexist; they are one property. This is the empty cell in the prior-art matrix.

Evidence:
- **Z3, all configurations.** `confluence_z3.py` discharges, by UNSAT-of-negation over an abstract model (uninterpreted bytes, array states, `mod/read/apply/verdict`), L1/L2 (both obligations stay discharged) and L3 (byte-confluence). Every guided hint is **audited** (`universals ⊨ hint` checked UNSAT) so no spurious assumption can manufacture a result. **[machine-checked]**
- **Lean 4, the induction Z3 cannot express.** `NwayConfluence.lean` machine-checks the N-way induction principle (no mathlib). Z3 pairwise base + Lean induction ⟹ every finite pairwise-commuting set is globally confluent and obligation-preserving. **[machine-checked]**
- **Runtime refinement.** `algebra-refinement.proof.mjs` proves runtime `commute()` *equals* the proven predicate over all **73,728 cross-file AND 73,728 same-file** configurations (every branch). **[machine-checked]**
- **External demonstration.** `t3_corpus.mjs` ran the algebra over **169,171** real edit-pairs from three OSS repos the authors did not write (zod 80,200 · type-fest 88,410 · zustand 561), cross-checked by a *separately-written* import-reachability oracle: **false-independence = 0/169,171**. The run itself surfaced and fixed a real soundness bug (missed `export … from` re-export edges), now locked by regression. **[external-demo]**

---

## 4. The system

### 4.1 Engine (the "hands")

`atomic-edit-mcp` **v4.0.0** — ~**123 MCP tools** **[measured-live]** across ~31 tool modules, exposing: structural perception (AST, symbol graph, call graph, range/selector reads — the model perceives *structure*, not raw text), precise edits (minimal byte-mutation by selector/anchor/line, preserving the surround), byte-exact transactions (snapshot/session/positive-bytes, re-executable receipts), governed execution (broker + sandbox, proven-effect-required), and the self/self-evolution surface. The structural engine covers **29 languages** via WASM tree-sitter (bash, c, cpp, go, java, js, python, rust, ts/tsx, …). **[measured-live]**

### 4.2 The convergence floor and the kernel of inescapability

The byte law (§1) is enforced before disk by the convergence operator, and made *physically* inescapable by `byte-guard-kernel.mjs` with three backends:
- **macOS (shallow):** a `sandbox-exec` profile that denies writes outside `effectRoot` + an FSEvents audit daemon.
- **Linux:** an **eBPF LSM** probe on `security_file_open` / `security_inode_create`, requiring a proof-token before write access.
- **macOS (deep):** an **Endpoint Security** daemon authorizing/denying each in-repo filesystem event (strongest macOS tier).

**Proof-token mechanism:** before any atomic write the envelope writes `.atomic/write-tokens/<pid>-<sha256>.json`; the kernel guard allows the write only if the token exists, then the envelope deletes it. **No token ⟹ the write is blocked at kernel level.** In live host-launched traffic the PreToolUse deny-hook blocked **1,088 real native mutation attempts**, **0 silently allowed** (`.atomic/bypass-ledger.jsonl`). **[measured-live]**

**Threat model (honest).** This is an **integrity boundary for an autonomous editing agent** — it guarantees the agent's own writes flow through verification, so an LLM-driven agent cannot persist an unproven mutation even when it "wants" to. It is **not** an adversarial sandbox against an external attacker; it requires elevated privilege (SIP/system-extension on macOS, CAP_BPF/root on Linux); the remaining enforcement residual is harness-scope (cron/spawned subprocesses outside PreToolUse still need the OS-level tier).

### 4.3 Self-modification: `expand_self` + monotonic ratchet

The **only legal mutation path** of atomic is atomic itself (`server-tools-self-evolution.ts` + `self-evolution-harness.mjs`). A change enters as a candidate, passes the gate/proof battery, and is promoted with a signed receipt + archive entry — **583 promotions** accumulated **[measured-live]**. The ratchet (P5/P6): a self-modification enters only if it carries **proof of gain** and **weakens no guarantee**. This is the Gödel-machine lineage with the decisive difference that self-improvement which *drops* proofs self-destructs; here proof is what *authorizes* the change.

### 4.4 The gate battery and the closed taxonomy

The battery comprises **266 executable proof files** (`core/atomic-edit/gates/*.proof.*`) **[measured-live]**, mapped onto a **closed, named invariant taxonomy** of ~23 classes (`gates/invariant-taxonomy.json`) — including the two first-class algebra classes `negative-action-justification` and `commute-obligation-preservation`. A closure meta-gate reds any wired gate that enforces an unnamed dimension (P4). The self-expansion validator lattice (~79 mandatory validators) is *adversarial*: each is shown able to go red on a synthetic counterexample, so a green is discriminating, not vacuous. `npm run paradigm-verify` re-discharges P1–P10 from a clean clone.

### 4.5 The six sibling MCPs

`atomic-memory` (semantic intent ledger — verified context the model *retrieves* instead of hallucinating), `atomic-sentinel` (daemon watching `.atomic/` for failed tasks/expired locks), `atomic-swarm` (multi-agent orchestration), `atomic-dashboard` (observability), `atomic-edit-bench` (measurement harness), `atomic-edit-evolution` (the A/B loop machinery).

---

## 5. The learning layer — proof-carrying operators (the "weights")

atomic learns by the same law: *only proven-correct solutions become memory, stored in compressed general form.* The mechanism (`weights_admit.py`) is a **deterministic, CPU-only, no-LLM** operator-admission engine. A "weight" is **not** a gradient/parameter; it is a discrete generalized resolution operator `{class, trigger, strategy, instances[], proof_n}`. The corpus of operators **is** the weight bank. Three laws, each a checkable rule:

- **Law 1 — capture N, not one.** A resolution whose class matches an existing operator is **absorbed** (instance appended, `proof_n++`), never duplicated. Intelligence is compression (Solomonoff/MDL): more distinct instances under the smallest faithful operator = a smarter operator.
- **Law 2 — born under necessity.** A new operator is created only when none absorbs the resolution (minimality at the meta level).
- **Law 3 — monotonic fidelity.** Any operator self-update must keep **every** already-captured instance still recalled by its trigger; `self_improve` admits a rewrite only under **proof of gain** (description ≤ prior **and** fidelity preserved). `--selftest` ⟹ `ALL LAWS HOLD: True`, including "3 operators → 1, −66% description, fidelity preserved." **[machine-checked]**

Current state: **8 operators** (e.g. `CROSS-FILE-ROOT-CAUSE`, `PATH-NORMALIZATION-BEFORE-MATCH`, `REGEX-CSV-DELIMITER-SCOPE`) + **45 generalized `CLASS-*` demolitions** landed through `expand_self` (the engine/agent's accumulated, verified self-corrections). **[measured-live]** In field terms this is a *proof-carrying skill/case library with MDL-style admission* — not a trained model.

---

## 6. The agent and the A/B measurement methodology

`local_atomic_agent.py` drives **DeepSeek V4 Pro** using **only** atomic. The A/B protocol is token-efficient and falsifiable: a **native baseline** (another TUI's worker, e.g. a Codex-native agent) is fired **once** and **frozen** as the target; then **only** the atomic arm re-fires in a loop until it beats the frozen baseline with margin, after which complexity escalates one level. Disciplines: **representation×model isolation** (separates representation gain from model strength), the **anti-facade law** (never fake green; a defeat is recorded as a defeat and formalized into a generalized `CLASS-*`), and a monotonic, generalist-only update path (`expand_self`). Tasks are drawn from **SWE-bench Verified/Pro** with official scoring.

---

## 7. Evidence

### 7.1 Internal correctness — done

`npm run paradigm-verify` discharges P1–P10 from a clean build (the validator lattice, the Z3 + Lean algebra theorem, the disproof loop, the 47/47 floor smoke). Production ledgers, adversarially recomputed: **9,314 traces, 0 introduced syntax breaks**; deny-hook **1,088 real native mutations blocked, 0 silently allowed**. The HumanEval disproof-lift down-payment: baseline **85.4% → 93.9% (+8.5pp)** with the recomputable-disproof arm > scalar > blind; content-attribution at K=5 is **directional (p=0.056)**, stated, not hidden. **[machine-checked / measured]**

### 7.2 External effect — the A/B level ladder (the slot the draft left open, now partly filled)

The engine paper specified a SWE-bench ablation (L11) as `EXTERNAL_BLOCKED` pending compute/keys. The A/B loop has since produced the **first official SWE-bench A/B dominance data** **[external-demo / measured-live]**:

| Level | Task | Result |
|---|---|---|
| 1 | `pylint-8898` | **dominated 2/2** (official `resolved=true`) |
| 2 | `pylint-7080` (cross-file) | **dominated 2/2**; the `PATH-NORMALIZATION` operator fired as a deterministic pre-model macro (`run_tests pass=16 fail=0`); patch 14 lines vs native 51 |
| 3 | `pytest-8399` | **dominated 2/2**; atomic patch **byte-identical** to the native baseline; same-task self-improvement tokens 578k→32k, steps 63→6, wall 352s→36s |
| 4 | `sympy-20438` | **both atomic and native fail** — a genuine frontier |

A cheap model + atomic officially dominates three escalating levels of real tasks, equalling/beating frozen Codex-native baselines on correctness and patch surface, **getting cheaper with use**. **Honest caveat:** native token/wall telemetry is not instrumented, so "dominance" means *correctness parity + smaller patch surface + atomic's own cost-collapse*, not absolute all-metric superiority.

### 7.3 Unification — one substrate for all agents **[measured-live]**

One git repository, one canonical engine (`core/atomic-edit`, 583 expand_self promotions), one weights bank. Engineered propagation: *"single source (no fork), all host agents → canonical launcher, proof-gated propagation ('nothing broken propagates')"*, cross-machine sync, `UNIFICATION.md`. Active hosts: Claude (weights + isolation work), oh-my-pi (the most prolific demolisher — L1 minimality parity, L3 multi-file edit-quality), Codex (the official A/B spine), and vibe/antigravity/gemini (peripheral, via vendored deployment). Replicas exist for isolated runs and deployment but propagate *from* the canonical and sync *back* — not divergent forks. Consequence: every host's verified learning compounds in one place.

---

## 8. What is novel — calibrated

The genuinely un-cited contribution is the **(a)+(e) verified-edit algebra**: obligation-preserving confluence integrated with an inverted byte-default, machine-checked (Z3 all-configs + Lean N-way) and externally sound on 169,171 pairs. Around it, the **synthesis** is, to our knowledge, unprecedented as a conjunction: a self-hosting, agent-independent, **kernel-enforced** verified-edit substrate whose definition of "broken" grows by recomputable proof, monotonically, with proof-carrying self-modification and a proof-carrying learned-operator memory, under an anti-facade discipline. No surveyed SOTA agentic coding tool (Claude Code, Cursor, Codex, OpenCode) combines kernel-guaranteed pre-disk verification + proof-gated self-modification + a proof-carrying learning layer. The pieces atomic *also* has but does **not** claim (the no-bypass floor, monotonic self-extension) are precedented by Nidus/MXC.

---

## 9. The honest ceiling — what is NOT earned

- **Rice is side-stepped, not defeated.** The algebra decides interference over a *decidable* static read-closure (an over-approximation); semantic/runtime coupling outside it is `UNJUDGED`, a first-class verdict. The same-file positional/non-identifier residual is named and narrow. Semantic-intent correctness ("does the edit do what the human meant") is out of scope by construction.
- **Cross-model transfer of learned operators is unproven.** On *seen* classes a weight now fires as a deterministic pre-model macro (real). But the deeper thesis — that retrieving a learned operator lets a *weak* model solve a *genuinely new* instance only a strong model could — is **not proven**: the first clean cross-repo generalization test was **negative**, in controlled isolation the weight added **zero marginal value** over the gate, and at Level 4 both arms fail. The proven "lifter" today is the **gate** (verification + forced iteration), not the weight in isolation. This is the project's central open bet.
- **The closed self-improvement loop is partial.** `expand_self` *validates* candidate self-modifications; it does not yet *generate* them — variance/goal-selection still comes from an agent. A fully autonomous generate→test→select→promote loop under proof is buildable on this base but **not yet built**; the system's own `emergence-report` honestly reports **"mechanical weak emergence only"** and refuses to declare cognition.
- **No notation produces cognition.** A "cognitive" DSL (CogLang) is cosmetic; the hard algorithms behind each primitive are identical in TypeScript. Building notation first is movement without progress. (This corrects an earlier roadmap.)
- **Recognition is not correctness.** "Revolutionary/unprecedented" is conferred by peer review, independent replication, and external adoption — none of which is claimed here. This document is a priority record + re-runnable artifacts; the rest is the field's to grant. The calibrated claim is *stronger* than an absolute one precisely because it survives a hostile reviewer.

---

## 10. Reproducibility

From a clean clone: `npm run paradigm-verify` → property-indexed verdict (P1–P10). Algebra theorem: `python3 formal/atomic-algebra/confluence_z3.py` + `nway_induction_z3.py` and `lean NwayConfluence.lean`. External corpus: `node …/t3_corpus.mjs` (169,171 pairs). Learning engine: `python3 core/agent/atomic-full-ab/local-loop/weights_admit.py --selftest` (`ALL LAWS HOLD: True`). A/B ladder: the official SWE-bench reports under `logs/run_evaluation/…` and the ledgers under `core/agent/atomic-full-ab/`. The full SWE-bench ON/OFF ablation isolating the floor's delta from the LLM remains the one external measurement that needs sustained cloud compute and rotated keys.

---

## 11. Conclusion

atomic converts a slogan — *only the proven exists* — into a law enforced at five layers: a kernel-guaranteed pre-disk floor, a proof-gated monotonic self-modification path, a proof-carrying learned-operator memory, an anti-facade measurement discipline, and, at the technical core, a machine-checked **(a)+(e)** algebra in which concurrent verified edits merge while preserving both their positive and their negative obligations — the empty cell in the surveyed prior art. It already demonstrates, by number, a cheap model dominating three escalating levels of real coding tasks while getting cheaper with use. It does **not** yet demonstrate cross-model transfer of learned capability, a closed autonomous self-improvement loop, or field-conferred recognition — and it says so. The honest distance from *proven-internally* to *demonstrated-revolutionary* is one external ablation and the outside world's replication, not a redesign. That distance, stated plainly, is what makes the rest credible.

---

*Verification legend — **[machine-checked]**: discharged by an executable proof/theorem in-repo; **[measured-live]**: counted from the live repository/ledgers in this synthesis; **[external-demo]**: run on third-party code/benchmarks; **[pending/honest-gap]**: specified but not yet produced. Numbers from distinct artifacts (266 gate files, ~23 invariant classes, ~79 mandatory validators, P1–P10 paradigm checks) measure different things and are not interchangeable.*
