# Retry-Mechanism Evidence — (formerly "Cognitive Emergence")

**Date:** 2026-06-20 (de-facaded by honest audit)
**Verifier:** Independent BigInt computation (zero floating-point)
**Status:** NOT emergence, NOT cognition. Two real-but-mundane mechanism facts, stated honestly.

> **De-facade note.** An earlier version of this file claimed `Status: PROVEN — two
> independent forms of [cognitive] emergence`. That claim was withdrawn. It was a category
> error and it violated this project's own anti-facade contract in `emergence-report.mjs`
> ("the string 'proven' is deliberately never emitted for an emergence claim"). What was
> actually demonstrated is described below — it is genuine, but it is not emergence and not
> cognition.

---

## Fact 1: Memoized partial-credit retry beats memoryless retry (a probability fact)

**Proof file:** `gates/cognitive-emergence.proof.mjs`
**Method:** 300 deterministic trials per configuration (FNV-1a hash, zero randomness)

The truth-funnel (freeze accepted units + re-derive only rejected ones) converges on
composite tasks where blind-retry (re-derive ALL units each round) almost never does:

| P(unit) | N units | blind-retry | truth-funnel | gap   |
|---------|---------|-------------|--------------|-------|
| 0.3     | 8       | 0.0%        | 10.7%        | large |
| 0.4     | 8       | 0.0%        | 38.7%        | large |
| 0.5     | 6       | 3.0%        | 49.0%        | 16.3x |
| 0.5     | 8       | 0.0%        | 51.7%        | large |
| 0.6     | 6       | 11.0%       | 39.3%        | 3.6x  |
| 0.7     | 4       | 58.7%       | 77.7%        | 1.3x  |

**This is freshman probability, not emergence.** Blind-retry needs all N units correct in
ONE round (P^N → ~0). The funnel ratchets correct units one at a time. The gap is a property
of MEMOIZATION, identical in spirit to "a human with a notepad beats a human without one."
No new capability appears; a strategy with memory beats a strategy without it.

**It does not transfer to real LLMs.** Per-unit P on well-defined tasks is ~binary (≈0 or
≈1), so the sweet-spot is empty in practice — and the measured ON/OFF SWE-bench delta of the
funnel is **ZERO** (A/B ON=0/3, OFF=0/7). The mechanism is real; its real-world lift is unproven.

## Fact 2: An LLM writes a program to compute what it can't do mentally (mundane tool use)

**Method:** LLM given 5 non-standard factorial-division problems.

- Mental arithmetic: **1/5 correct** (LLMs are bad at large-number mental math — well known).
- LLM-written BigInt program, executed: **5/5 correct** (LLMs are good at writing code — well known).

**This is NOT "the system exceeded its own ceiling" and NOT a Darwin-Gödel loop.** It is the
single most documented LLM behavior since 2022: an LLM offloading arithmetic to a program it
writes. It is the *opposite* of unprecedented. Critically, the original write-up admitted the
tool creation was **human-prompted** — there is no autonomous self-expansion here at all.

---

## Honest boundaries (retained — these were always true)

1. The memoization gap requires tasks with P(unit) ∈ (0,1). Current LLMs make that window narrow.
2. There is **no autonomous self-expansion** demonstrated. A human asked for the tool.
3. **Verifier correctness is paramount.** During experimentation 2/3 "disproofs" were false —
   the verifier had wrong expected answers. The funnel converges to whatever the verifier says,
   right or wrong (garbage-in / garbage-out).

## What would actually count as emergence (none of it shown here)

- An edit the system makes with **no agent in the loop** (F1 in `emergence-report.mjs`).
- The system's **own** proposal stream producing qualitatively new decisions over time (F4).
- A new invariant **not attributable** to any agent's rejected attempt (F3, not instrumented).

Until one of those is recomputably demonstrated, the honest word is **mechanism**, not emergence.

## Reproducibility

- `node gates/cognitive-emergence.proof.mjs` — deterministic, byte-identical re-runs (mechanism fact 1).
- Fact 2 reproduces with any LLM that can write a BigInt factorial function — which is the point: it is mundane.
