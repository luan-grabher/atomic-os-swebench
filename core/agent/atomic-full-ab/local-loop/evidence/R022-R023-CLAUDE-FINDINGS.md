# R022–R023 — Claude-Code session findings (cross-model: DeepSeek-V4-Pro-atomic vs native-Claude worker)

Separate findings file (NOT the shared LEDGER) to avoid clobbering the concurrent oh-my-pi session's
LEDGER writes. Pointer appended to LEDGER.md only at session end, after a no-concurrent-write check.

## Frame (user's hardened law, 2026-06-21)
Keep the model DIFFERENT (atomic brain = DeepSeek V4 Pro; native worker = Claude). The atomic arm must
win DESPITE the weaker model — because if it loses, the fault is MY representation of the atomic principle,
never the model and never the principle. Every loss/tie/imperfect-win = an invisible wall I built. Read
BOTH arms' full actions AND reasoning (now captured: DeepSeek reasoning_content). Hunt walls even in wins.

## First wall demolished: my own blindness
The agent recorded only the first line of each tool result and NONE of the model's reasoning. I cannot
demolish walls I cannot see. FIX (commit b20583b): capture DeepSeek `reasoning_content` + the verbatim
message stream (every tool-call arg + every result as the model saw it) per round. Additive, never resent.

## Walls found by reading the FULL reasoning trace (all generalist, all my representation's fault)

1. **CLASS-ARG-NAME-RIGIDITY** (commit 6ff85c9). The model carries strong priors for parameter names from
   every editing tool it has seen: `old_string`/`new_string`/`file_path`/`symbol`/`query`. My schema demanded
   `oldText`/`newText`/`file` → the mapper read `""` → the edit hit the repo root with
   `{"ok":false,"error":"not a regular file"}` → the model BLIND-RETRIED. Forensic (pytest-5262 pre-fix): 5
   wasted atomic_replace calls before it guessed `oldText`/`newText`. FIX: alias table maps the model's
   natural names → canonical keys, per tool; also parse a line-range in the `selector` slot ("L34:L80").

2. **CLASS-TOPOLOGY-WITHHOLD** (commit 6ff85c9). My pre-edit "topology" turn demanded a text-only reply and
   WITHHELD all tools. DeepSeek-v4-pro will not sit idle — it emitted its intended reads as dead `DSML`
   pseudo-tool-call prose (measured: 1 leaked step on EVERY instance + a re-read of context it already had).
   Withholding tools to force a text turn is gravitationally adversarial to this model. FIX: keep the
   diff-minimization GUIDANCE but make it non-blocking — the model reasons about topology AND edits in the
   same turn; tools are never withheld.

3. **CLASS-EDIT-RECEIPT-BLIND** (commit 6ff85c9). A successful edit returned only "✅ Atomic edit applied" →
   the model re-read the symbol to verify on EVERY instance. FIX: the edit receipt now returns the post-edit
   code region with line numbers, so the model confirms by perception, not another round-trip.

4. **CLASS-BATCH-READ-BLIND** (commit 7ca9f38) — THE BIG ONE. `code_readcode_batch` returns its per-file
   payloads under key `results` (each {file, code, startLine, endLine, requestedSelector}), but my compaction's
   batch branch looked only for `items` → never matched → returned ONLY the headline
   ("returned 2/2 adaptive context item(s)") with ZERO CODE. So `atomic_read_many` — the batch reader I
   explicitly tell the model to PREFER — was blind, forcing single reads on every multi-file task (requests
   pre-fix: batch-read 2 symbols, got no code, then 5 single reads). Same blind-to-code class as R009, batch
   path. FIX: accept `results`|`items`, render selector labels, surface per-item errors. Verified: now returns
   `def merge_setting` + `class CaseInsensitiveDict`.

## Measurement-fidelity fix (my instrument's infidelity)
Single-sample tool-call totals carry heavy DeepSeek exploration variance (LEDGER: 54k–81k tokens, same agent,
same task). A single round cannot separate representation-gain from model-noise. FIX: multi-sample (N=3) per
instance, compare median + range (aggregate_multi.py). This is required before any by-number dominance claim.

## Pre-fix vs post-fix (single sample, R022 → R022post), frozen native-Claude baseline = 7/5/5/11/6 = 34
| instance | pre-fix | post(3walls) | native | note |
|---|---|---|---|---|
| requests-1921 | 8 | 10 | 7 | read variance; DSML eliminated |
| pytest-7982 | 6 | 4 | 5 | win |
| pytest-5262 | 18 | 11 → (R023 s1: 4) | 5 | aliasing 5-retry killed; batch fix crushed reads |
| pylint-7080 | 15 | 10 | 11 | win |
| flask-5014 | 6 | 3 | 6 | win |

Deterministic friction (DSML leak steps, wrong-param errors) = 0 across ALL post-fix instances → the walls
are provably demolished. Net tool-call total still noisy on a single sample → multi-sample R023 is the real number.

## R023 multi-sample (N=3, 4 agent/perception fixes live) — median tool-calls vs native 34
| instance | atomic median (range) | native | winner |
|---|---|---|---|
| flask-5014 | 4 (3-5) | 6 | ATOMIC |
| pytest-7982 | 3 (3-3) | 5 | ATOMIC (zero variance) |
| pytest-5262 | 8 (3-17) | 5 | native — BIMODAL (engine wall) |
| requests-1921 | 9.5 (8-12) | 7 | native — stable read-count wall |
| pylint-7080 | 13 (13-16) | 11 | native — stable wall |
| TOTAL (median sum) | 37.5 | 34 | native (2 wins / 3 losses) |
Friction (DSML, wrong-param) = 0 across all 15 runs → the agent-layer walls ARE demolished. The remaining
losses are NOT friction — they're (a) pytest-5262's bimodal engine refusal, (b) requests/pylint read-counts.

## R023→R024: 5th wall = CLASS-PROSE-IMPORT-FALSE-RED (ENGINE fix, commit c069c2a) — pytest-5262 variance KILLED
Reading pytest-5262's 17-call run: the model's CORRECT atomic_replace (adding a `mode` property whose docstring
said "...does not include 'b' (binary)") was refused 8× by the byte-floor supply-chain gate with
"dangling dependency — b / install the package". Root cause (reproduced deterministically + bisected): the sync
extractImportSpecifiers' generic regex `/\b(?:import|include)\s+['"]/` matched the ENGLISH WORD "include" in the
docstring and extracted `b` as a bare dependency (blankComments preserves docstrings — they're string statements,
not comments). FIX: anchor the regex to statement position `^\s*#?\s*`. Proven strictly monotonic (real Go/Py/JS
imports still extracted; a real absent package still refused; the model's exact edit now applies).
**RESULT (pytest-5262 ×3 after fix): 4 / 4 / 5 calls, dangling_refusals 0/0/0 — the 3↔17 bimodal variance
COLLAPSED to a stable median 4, flipping pytest-5262 from a LOSS (median 8) to a stable WIN vs native 5.**

## Remaining walls to hunt (the honest losses, by number)
- requests-1921: STABLE 8-12 vs native 7 — the model reads headers across sessions/models/adapters/structures
  (4 files) where native (Claude) went straight to merge_setting. Read-count / navigation-guidance wall.
- pylint-7080: STABLE 13-16 vs 11. Read-count wall on the hard instance.
- R024 full-suite multi-sample (all 5 fixes) = the authoritative post-fix number (pending).
