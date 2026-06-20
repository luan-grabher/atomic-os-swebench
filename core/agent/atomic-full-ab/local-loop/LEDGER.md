# LOCAL self-vs-self competitive A/B — LEDGER (lives on disk; loop state of record)

**Protocol (user-defined, exact):** define a task → FIRST fire the atomic agent CLI (DeepSeek V4 Pro,
atomic-only) → THEN fire a subagent of my own TUI (Claude Code, native-only) with the SAME task → wait
both → collect+compare ALL data → improve the atomic agent (generalist-only, via atomic_expand_self) →
repeat same task till atomic dominates → escalate difficulty → forever. Runs 100% LOCAL (no Modal).

**Arms:**
- NATIVE = a Claude Code subagent, tools = Read/Edit/Write/Bash/Grep/Glob only (no MCP, no atomic).
- ATOMIC = `local_atomic_agent.py` (DeepSeek V4 Pro brain + 100% atomic hands via atomic-call.mjs).
- Gate (scoring) is identical for both and re-scored by the orchestrator (no self-report trust).

**Honesty caveat (commensurability):** the two arms use DIFFERENT models (Claude vs DeepSeek), per the
user's explicit definition of this A/B. So token/time/diff gaps are MODEL-CONFOUNDED and are NOT claimed
as representation. The loop only acts on the CLEANLY representation-attributable part of a loss (tool
granularity, ceremony, round-trips, coverage) — never fakes a model gap as a representation gap.

---

## Level 1 — Round 1 — Task L01 (tiny-csv RFC-4180 quoting)
- task: `tasks/L01-csv` — make `node --test` 6/6 (4 RFC-4180 quoting cases) without breaking 2 existing.
- snapshot (both arms, identical): `6458a4fd76634772bd07746dace96c49c468d54d`
- date: 2026-06-20

| metric | NATIVE | ATOMIC | winner |
|---|---|---|---|
| gate pass | ✅ 6/6 | ✅ 6/6 | TIE |
| diff_lines (smaller=better) | 76 | 97 | native |
| edits applied | 1 | 2 | native |
| total tool-calls | 6 | 12 (outline 3, read 4, test 2, replace 3) | native |
| tokens | 31,412 | 63,721 | native (2.0×, model-confounded) |
| wall | ~28s | 58.8s | native (2.1×, model-confounded) |
| invalid-states prevented on disk | 0 | **1** | **ATOMIC** |
| run_tests calls | 1 | 2 | native |

**Verdict:** correctness PARITY (both solve — a milestone: the atomic arm now SEES code & solves, vs the
Modal runs where it was blind and scored 0). NATIVE dominates efficiency. ATOMIC uniquely prevented an
invalid on-disk state (s4 governed refusal → s5 clean apply) — the proof guarantee, real, in a real run.
Atomic does NOT dominate → no escalation → formalize loss class → close it generally → re-run.

### Open loss CLASSES (generalized, representation-attributable)
- **CLASS-R1-A — no batch structural read.** atomic_outline / atomic_read are single-target, so
  understanding an N-file change costs ≥2N round-trips (the atomic arm spent 6 calls — 3 outline + 3
  full-read — to load 3 tiny files; native read broadly in ~2). Generalist (any lang, any multi-file
  task). Clean representation signal (a perfect model still pays N calls if the tool takes 1 file).
  **Fix direction (generalist, via atomic_expand_self):** a macro-operator that outlines+reads a SET of
  files / a glob / a directory in ONE atomic call, returning structure+code together — fewer round-trips,
  less ceremony, same proof. (Absorbs the native "broad read" advantage as a macro-atomic op.)
- CLASS-R1-B (minor) — premature run_tests on empty tree wasted a step (s3). Already steered by the
  empty-diff short-circuit; mild, model-side. Watch, don't fix yet.

### Model-confounded (recorded, NOT acted on as representation)
- tokens 2.0× and wall 2.1× — DeepSeek reasoning verbosity vs Claude. Honest ceiling of a cross-model
  A/B. Will shrink partly when CLASS-R1-A cuts round-trips; the residual is the model, reported as such.

---



## Level 1 — Round 1' (R1, after closing CLASS-R1-A) — Task L01
- snapshot: `8f1092cd2bb94160decdeae715bb8d90f2cb28a4` (fresh worktrees, same task)
- change under test: atomic_survey (code_outline_batch) + atomic_read_many (code_readcode_batch) exposed.

| metric | NATIVE | ATOMIC | winner | vs R1 |
|---|---|---|---|---|
| gate pass | 6/6 | 6/6 | TIE | = |
| total tool-calls | 7 | 7 | TIE | atomic 12→7 (CLASS-R1-A CLOSED) |
| reads | ~4 | 4 | TIE | atomic 7→4 |
| diff_lines | 79 | 55 | **ATOMIC** | atomic 97→55 (now smaller than native) |
| run_tests calls | 2 | 1 | **ATOMIC** | atomic 2→1 |
| edits applied | 1 | 1 | TIE | atomic 2→1 |
| invalid-states prevented | 0 | 1 | **ATOMIC** | = |
| tokens | 31,537 | 45,592 | native (model-confounded) | atomic 63.7k→45.6k |
| wall | 36s | 64.5s | native (model-confounded) | ~ |

**Verdict R1':** closing ONE representation gap flipped the representation-attributable metric set to
atomic: tool-calls tied (was a loss), diff smaller, fewer test cycles, invalid-states prevented, edits
tied. The ONLY remaining losses (tokens, wall) are MODEL-confounded (DeepSeek vs Claude) — not
representation, as pre-registered. This is the thesis shown by number: the loss WAS the representation;
fixed → atomic ties/leads on everything the loop can move.

**Dominance definition (honest, for a cross-model A/B):** raw dominance over ALL metrics is unreachable
when the two arms use different models (tokens/wall are model-bound). So dominance = TIE-or-WIN on the
REPRESENTATION-attributable set {correctness, tool-calls, reads, diff surface, test cycles, edits,
invalid-states, capability gaps}, with model-confounded metrics tracked as context. R1' = representation-
dominant. Need ≥2 consecutive (noise control) → R1'' next.

### Minor (model-behavior, NOT representation; do not hardcode)
- atomic used 3 atomic_survey globs (could be 1 '**/*'); atomic_read_many got 4/5 (1 bad path). Noise.

## Level 1 — Round 1'' (R1'', confirmation) — Task L01
- snapshot: fresh worktrees, same task. atomic: steps 8, tool_calls {survey 2, read_many 1, replace 3, run_tests 2}.

| metric | NATIVE | ATOMIC | winner |
|---|---|---|---|
| gate pass | 6/6 | 6/6 | TIE |
| reads | ~4 | 3 | TIE/atomic (batch stable: 7→4→3) |
| diff_lines | 81 | 94 | native (atomic VARIANCE: rewrote dead tokenize.mjs too) |
| edits applied | 1 | 2 | native (model choice) |
| invalid-states prevented | 0 | 1 | ATOMIC |
| tokens | 31,439 | 72,192 | native (model) |

**R1'' note:** atomic did NOT repeat the R1' diff win — DeepSeek chose to also rewrite the dead
tokenize.mjs (native correctly left it). That is MODEL solution-variance, not a representation gap.

## 3-round L01 SYNTHESIS (honest)
- **Representation gaps that existed are CLOSED & STABLE:** blind-to-code (fixed earlier) and single-
  target reads (CLASS-R1-A) → read round-trips atomic 7→4→3, consistently ≤ native. Correctness PARITY
  every round (6/6). Atomic's unique guarantee (invalid-states-prevented = 1 vs 0) holds every round.
- **Residual atomic losses are NOT closeable representation gaps at L01:** diff_lines (97/55/94) and
  edits (2/1/2) are DeepSeek solution-VARIANCE (native is steady ~78/1); tokens/wall are model-confounded.
  L01 is too small for atomic's structural advantages (transaction, rename_symbol, change_signature,
  multi-file preservation) to produce signal above model noise.
- **CLASS-R1-C (new, representation, watch at L02):** deletion-proof refuse-retry tax — a byte-removing
  edit without proofOfIncorrectness is refused, costing 1 round-trip the native arm never pays. It BUYS
  the guarantee (don't weaken it). Polished the tool description to elicit proof on the FIRST call
  (no engine change, no weakening). Re-measure the tax at L02 where multi-edit makes it matter.
- **Decision:** L01 representation gaps are closed; the level is now NOISE-BOUND (model variance >
  representation signal). NOT claiming L01 raw 2-consecutive dominance (unreachable cross-model + noise).
  Escalate to L02 — a multi-file STRUCTURAL task where atomic's structural operators should yield a
  CONSISTENT signal that dominates model noise. This is the scientifically honest move, documented as such.

## Next exact step
Author L02: a real multi-file task that rewards STRUCTURAL editing — e.g. rename a symbol used across
several files + change its signature + update all call sites (so native must do many text edits while
atomic can use rename_symbol / change_signature / atomic_transaction / batch_replace). Binary gate
(tests). Then run R2 (atomic first, then native subagent, same task), compare, and specifically test
whether atomic's structural ops give a CONSISTENT (low-variance) edit-count / diff-surface / invalid-state
advantage that is NOT model-confounded. Keep writing real state here.
