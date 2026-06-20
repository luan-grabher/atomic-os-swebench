# A/B finding — the complete atomic toolset is net-negative for task-solving

Measured 2026-06-20 (DeepSeek V4 Pro, Modal sandboxes, SWE-bench Verified smoke = 3 tasks).
Honest record per the anti-facade law: report what was measured, whatever it says.

## Result (local-pass = whole-file parity judge inside the sandbox)

| task | OFF (plain hand-rolled tools) | FULL (115 atomic tools) |
|---|---|---|
| astropy__astropy-12907 | ✓ pass, 9 steps, diff 504 | ✓ pass, 49 steps, diff 1049 |
| sympy__sympy-24661 | ✓ pass, 14 steps, diff 2870 | ✗ FAIL, 321 steps, diff 9605 |
| django__django-17087 | ✗ fail, 80 steps | ✗ fail, 321 steps, diff 2134 |
| **resolved** | **2/3** | **1/3** |

## Verdict
Giving the agent the COMPLETE atomic toolset (115 tools) **lowered** task-solving (1/3 vs 2/3)
and caused massive thrashing — sympy, which OFF solved in 14 steps, the FULL arm failed after 321
steps with a 9605-char diff. Dumping 115 tool schemas into the model degrades it (choice overload /
context bloat), it does not help.

Combined with the prior governed-vs-off A/B (0 resolved both arms), the attributable delta of
"atomic as a toolset given to the agent" on task-solving is **zero-to-negative**. atomic is NOT a
capability/reasoning amplifier.

## Consequence (correct-by-construction, not the literal request)
"Expose the totality" was the literal ask, but the measurement says totality HURTS. Serving the
intention (the best atomic) ⇒ the FULL arm should use a CURATED subset, and "tool dumping" is a
documented anti-pattern. The totality remains AVAILABLE (denylist mode) and PRESERVED; the default
agent surface should be curated by measured contribution, not raw count. (Tuning the curated set is
open work.)

## Where atomic might still genuinely win (not yet measured)
SWE-bench measures task RESOLUTION (Pass@1), where atomic shows no edge. atomic's real potential
edge is EDIT QUALITY/SAFETY — fewer syntactic/semantic regressions, smaller diffs, ZERO invalid
states written — vs textual patching. That is the N4/N5 edit-quality benchmark, still to run. Only
that number could support a specific, honest "atomic is superior at X" claim.
