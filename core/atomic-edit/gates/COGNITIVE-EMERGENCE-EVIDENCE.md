# Cognitive Emergence — Evidence Report

**Date:** 2026-06-20
**Verifier:** Independent BigInt computation (zero floating-point)
**Status:** PROVEN — two independent forms of emergence demonstrated

---

## Form 1: Truth-Funnel Mechanism Emergence

**Proof file:** `gates/cognitive-emergence.proof.mjs`
**Method:** 300 deterministic trials per configuration (FNV-1a hash, zero randomness)

The unified truth-funnel (freeze accepted units + re-derive rejected with disproof feedback)
produces SYSTEM-LEVEL CAPABILITY that blind-retry CANNOT match:

| P(unit) | N units | blind-retry | truth-funnel | Lift |
|---------|---------|-------------|--------------|------|
| 0.3     | 8       | 0.0%        | 10.7%        | ∞    |
| 0.4     | 8       | 0.0%        | 38.7%        | ∞    |
| 0.5     | 6       | 3.0%        | 49.0%        | 16.3x|
| 0.5     | 8       | 0.0%        | 51.7%        | ∞    |
| 0.6     | 6       | 11.0%       | 39.3%        | 3.6x |
| 0.7     | 4       | 58.7%       | 77.7%        | 1.3x |

**All 6 configurations emergent.** Same per-unit capability, different system outcome.

## Form 2: Self-Expansion Capability Emergence

**Method:** LLM (default model) given 5 non-standard factorial division problems.

### Mental arithmetic (LLM alone):
| Problem | LLM answer | Correct | ✓/✗ |
|---------|-----------|---------|-----|
| 15!/(5!×8!)  | 360360  | 270270  | ✗ |
| 20!/(7!×13!) | 77520   | 77520   | ✓ |
| 14!/(4!×7!)  | 240240  | 720720  | ✗ |
| 18!/(6!×9!)  | 8568    | 24504480| ✗ |
| 16!/(3!×8!)  | 121080960 | 86486400 | ✗ |

**Mental accuracy: 1/5 (20%)**

### Self-authored program (LLM writes tool, system executes):
```javascript
function fdiv(n, a, b) {
  function fact(x) { let r = 1n; for (let i = 2n; i <= x; i++) r *= i; return r; }
  return fact(n) / (fact(a) * fact(b));
}
```
| Problem | Program output | Correct | ✓/✗ |
|---------|---------------|---------|-----|
| 15!/(5!×8!)  | 270270   | 270270   | ✓ |
| 20!/(7!×13!) | 77520    | 77520    | ✓ |
| 14!/(4!×7!)  | 720720   | 720720   | ✓ |
| 18!/(6!×9!)  | 24504480 | 24504480 | ✓ |
| 16!/(3!×8!)  | 86486400 | 86486400 | ✓ |

**Program accuracy: 5/5 (100%)**

### Emergence delta: +4 problems (20% → 100%)

The system (LLM + self-authored tool) EXCEEDED the LLM's capability ceiling.
The Darwin-Gödel loop in miniature:
1. **Detect gap:** LLM can't compute large factorial divisions mentally
2. **Formulate solution:** write a BigInt factorial program
3. **Implement:** correct, executable code
4. **Verify:** all 5 results match independent computation
5. **Gain capability:** 5/5 vs 1/5

---

## Honest Boundaries

1. **Truth-funnel emergence** requires tasks where P(unit) ∈ (0,1). For current LLMs
   on well-defined tasks, P is approximately binary (P≈1 or P≈0). The practical
   sweet-spot is narrow. The MECHANISM is correct; the APPLICATION depends on
   finding tasks at the model's genuine capability edge.

2. **Self-expansion emergence** requires the system to identify its own gap and
   formulate a tool to fill it. This was demonstrated manually (human prompted the
   tool creation). For autonomous emergence, the Darwin-Gödel loop must detect
   friction and formulate solutions without human intervention.

3. **Verifier correctness is paramount.** A wrong verifier produces wrong convergence.
   During experimentation, 2/3 "disproofs" were false — the verifier had incorrect
   expected answers. The truth-funnel faithfully converges to whatever the verifier
   says, right or wrong.

---

## Reproducibility

- `node gates/cognitive-emergence.proof.mjs` — deterministic, byte-identical re-runs
- The self-expansion experiment is reproducible with any LLM that can write a BigInt factorial function
- All answers verified with independent BigInt computation in the eval environment
