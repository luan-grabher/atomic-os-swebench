# atomic — Prior Art & Novelty Analysis (honest "inédito" test)

This document tests the *unprecedented / inédito* claim against the literature, honestly. It was produced
by a real search (June 2026) over proof-carrying code, structured-edit agents, verification gates,
coverage ratchets, invariant synthesis, and agent guardrails. **Conclusion up front:** every *individual*
mechanism of atomic has a published precedent; the *specific unified combination* — an inescapable
per-write convergence floor + a CLOSED named invariant taxonomy + **monotonic admission of new invariant
CLASSES** (the definition of "broken" itself grows by proof) + proof-carrying receipts + agent-independence
— I did **not** find published as one system. That is a *combination-novelty* claim, which is weaker than
component-novelty and cannot prove the absence of prior art. It is the honest ceiling of what we can assert
without peer review.

## What is PRECEDENTED (atomic is NOT first at any single piece)

| atomic mechanism | Closest published precedent | What the precedent already does |
|---|---|---|
| Structured AST edits (edit named entities, not line offsets) | **CodeStruct**, Amazon Science, arXiv 2604.05407 (2026) | `readCode`/`editCode` over AST entities, syntax-validated; +1.2–5.0% SWE-bench Pass@1, −12–38% tokens. The dossier already concedes this. |
| Proof accompanies the artifact; host verifies | **Proof-Carrying Code**, Necula & Lee, 1996 | A proof ships with code; a host checks it against a policy before trusting it. atomic's "proof-carrying edits" is in this lineage. |
| Refuse to persist a write that introduces a NEW error vs a baseline (delta semantics) | **ENCRUST** (C→Rust), arXiv 2604.04527 (2026) | Checkpoint/rollback + a verification gate: a task is Completed only if `cargo build` passes and no baseline-passing test regresses; failed tasks are rolled back. Delta-vs-baseline, refuse-broken-state. |
| Coverage that can only go up (a "ratchet") | **Differential coverage**, arXiv 2008.07947 | Explicitly names a "coverage ratchet" that does not allow coverage to decrease — monotone non-decreasing, baseline-relative. atomic's L18 generalizes this from *test coverage* to *invariant-class coverage*. |
| Learn/repair an invariant from a runtime refutation | **Data-Driven Template-Free Invariant Generation**, arXiv 2312.17527; CEGIS-style synthesis | Every refutation triggers a revision of the candidate invariant. atomic's L19 (incident → admit) is adjacent, but synthesizes a *program's* invariants, not new invariant CLASSES for a gate lattice. |
| LLM-synthesized class invariants | **ClassInvGen**, OpenReview 2025 | Uses an LLM to synthesize class invariants. |
| Every agent edit routes through a gate / MCP gateway | **agent-guardrails** (logi-cmd), **Codacy Guardrails**, **GUARDRAIL** (nshkrdotcom), "AI Agent Code of Conduct" arXiv 2509.23994 | Merge gates / MCP-traffic mediators that check AI edits before merge across Claude/Cursor/Codex. "Route all agent writes through a checker" is precedented — as merge-gates and gateways. |

> Name note: `github.com/atomicdotdev/atomic` is a **different** project also called "atomic" (a Patch-Theory
> based VCS for agentic development) — unrelated approach; a naming collision to be aware of.

## What I did NOT find a single-system precedent for (the candidate novelty)

No published system was found that unifies ALL of:

1. an **inescapable PER-WRITE** convergence floor — not a merge-gate (post-hoc), not a task-checkpoint
   (coarse), but every write through every tool funneling through one gate that refuses a non-converged tree;
2. a **CLOSED, named taxonomy** of invariant CLASSES with a **closure meta-gate** — a write touching a
   dimension *not in the taxonomy* is itself red (closure is enforced, not assumed);
3. **monotonic admission of new invariant CLASSES** — the *set that defines "broken"* grows by proof, and
   each admission is proven to strictly increase coverage without flipping any prior class. This is the key
   distinction from the coverage ratchet (which keeps a FIXED metric from dropping) and from invariant
   synthesis (which infers one program's invariants, not new gate CLASSES);
4. **proof-carrying edit receipts** bound to the gate verdict (chain-hashed);
5. **agent-independence** — the identical floor proven obeyed across Claude · Codex · OpenCode.

## Honest verdict on the three words

- **Invenção original / original invention** — **Yes, defensible.** The assembled, self-proving whole is an
  original construction. Originality of a synthesis does not require any component to be new.
- **Inédito / unprecedented** — **Only as a COMBINATION, and only "not found", not "proven absent".** Every
  component is precedented; the unified combination (esp. *monotonic admission of new invariant CLASSES*
  under an inescapable floor with closure) was not found in the literature searched. A peer-review prior-art
  pass could still surface a closer match. Claiming flat "inédito" would overstate the evidence.
- **Revolucionário / revolutionary** — **Not established.** Internal correctness (P1–P6) is proven, but
  "revolutionary" needs (a) the mechanism-attributable effect size (L11, the benchmark), and (b) that the
  combination does something the precedents above cannot — which is precisely what the ablation would show.

## What would raise the claim from "plausible" to "established"

1. **L11 benchmark** — floor-on vs floor-off ablation on aider-polyglot / SWE-bench-verified, same LLM,
   showing a mechanism-attributable convergence delta. (External: needs LLM runs.)
2. **A focused diff vs ENCRUST + agent-guardrails + differential-coverage** in a paper's Related Work,
   making the per-write-inescapable + class-level-monotonic distinction explicit and defensible.
3. Peer review / third-party reproduction (`npm run paradigm-verify` is the reproduction surface).

## Sources

- Necula & Lee, Proof-Carrying Code (1996) — https://en.wikipedia.org/wiki/Proof-carrying_code
- CodeStruct, arXiv 2604.05407 — https://arxiv.org/abs/2604.05407
- ENCRUST, arXiv 2604.04527 — https://arxiv.org/pdf/2604.04527
- Differential coverage, arXiv 2008.07947 — https://arxiv.org/pdf/2008.07947
- Data-Driven Template-Free Invariant Generation, arXiv 2312.17527 — https://arxiv.org/abs/2312.17527
- ClassInvGen — https://openreview.net/pdf?id=7iwJ2ZQS3s
- agent-guardrails — https://github.com/logi-cmd/agent-guardrails
- GUARDRAIL (MCP) — https://github.com/nshkrdotcom/GUARDRAIL
- The AI Agent Code of Conduct, arXiv 2509.23994 — https://arxiv.org/html/2509.23994v1
