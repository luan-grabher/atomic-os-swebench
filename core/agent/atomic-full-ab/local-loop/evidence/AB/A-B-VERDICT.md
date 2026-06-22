# A/B Verdict — DeepSeek-atomic vs Claude-native (by official number, honest)

**Setup (per doctrine):** atomic agent CLI = **DeepSeek V4 Pro** + full atomic tools / gate-ON (iterate on test feedback);
native baseline = a Claude subagent, **one-shot** (native tools only, no MCP). Same SWE-bench-Verified task per round,
official Docker harness (FAIL_TO_PASS + PASS_TO_PASS) scoring. Model **locked** to DeepSeek for the atomic arm.

## Scoreboard (R1–R5 scored; R6/R7 atomic in flight)

| Round | instance | atomic (DeepSeek) | native (Claude) | regime |
|---|---|---|---|---|
| R1 | pylint-8898 | **1** ✓ | 0 | **verification-gap → atomic WINS** |
| R2 | pylint-4661 | 0 | 0 | lib-guess (appdirs) → tie |
| R3 | sympy-20438 | 0 | 0 | exotic selector / high variance → tie |
| R4 | sympy-16597 | 0 | 0 | 6-file hard → tie |
| R5 | sklearn-12682 | **1** | 1 | clean → tie (atomic **kept pace**, 16 edits via gate) |
| R6 | sympy-13877 | — | 1 | clean (atomic running) |
| R7 | sklearn-25102 | — | 1 | clean (atomic running) |

## Verdict (what the numbers support — and what they do NOT)

- **The atomic WINS-OR-TIES and NEVER LOSES across R1–R5.** It is never inferior to the (stronger-base) Claude-native.
- **It WINS where verification matters** (R1): native one-shot shipped a plausible-but-buggy regex splitter (mangled
  `bar{1,3}`); the atomic's **gate + `quick_check` execution-verification** (39/73 tool calls = run Python to verify the
  edge-case) caught it and produced the correct multi-file fix. This is the **neuro-symbolic thesis demonstrated**:
  symbolic verification of the connectionist proposal beats raw one-shot on verification-gap bugs.
- **It TIES elsewhere**: on clean instances both resolve (R5 — the tools lift DeepSeek to match Claude's base one-shot);
  on too-hard instances both fail (R2 lib-guess, R3/R4 exotic/large).
- **NOT achieved (falsified by number):** the doctrine's "overwhelming margin in EVERYTHING." On clean and too-hard
  regimes the result is a tie, not domination. The native (Claude) is a **strong baseline** that resolves clean instances.

## Honest scoped claim

> DeepSeek-atomic = native-Claude's capability **+ a verification edge**. The atomic tools lift a weaker base model
> (DeepSeek) to **at-least-match** a stronger one (Claude) and to **exceed it specifically on verification-gap** bugs,
> where a one-shot ships an unverified error and the gate catches it. Real, by number — but narrow, not overwhelming.

## Demolitions this session (both from real A/B losses; generalist; entered via the agent/gate)

- **R052 `CLASS-GATE-DEP-INSTALL`** — faithful gate installs a fix's new deps on `No module named X` (the official eval
  does; the gate didn't → false-failed appdirs fixes). Validated by number: gold pylint-4661 `pass=0 → 1/0`, no regression.
- **R053 `CLASS-EDIT-SELECTOR-NO-LINE-FALLBACK`** — on `atomic_replace` selector-miss with no `oldText`, steer to a
  line-range edit (the model already has grep line numbers) instead of re-reading forever (fixed the R3 0-edit flail).
  Deterministic code-path validated; live trigger is variance-dependent (the selector-miss must recur).

No claim is made beyond the official numbers. Ties are named ties; the win is one falsifiable win with a measured mechanism.
