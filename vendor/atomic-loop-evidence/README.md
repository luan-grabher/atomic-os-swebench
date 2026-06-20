# vendor/atomic-loop-evidence

Salvaged from the atomic self-loop RUNTIME at `/private/tmp/atomic-loop`
(worktrees `r016-allin` / `r016-block`, detached checkouts of kloel HEAD —
byte-identical `.atomic` tree between both, salvaged once from `r016-allin`).

This is the **loop EVIDENCE** that the package did not previously carry. The
package already had the evolution *harness scripts*
(`vendor/mcp-siblings/atomic-edit-evolution/*.mjs`,
`core/atomic-edit/gates/self-evolution-disproof-*.proof.mjs`) but **not** the
actual measured RUN OUTPUTS. Those outputs live in kloel's git-tracked
`.atomic/evolution/` tree and were never extracted into the package.

## Contents

### `evolution/` — Movimento III run artifacts over REAL data
- `README.md`, `real-briefing.md` — III.c "briefing de paredes" (formal disproof
  walls + counter-examples synthesized from real refusal ledgers).
- `real-lessons.jsonl` — III.d laws validated by temporal prediction
  (`neverAGate:true`).
- `real-harvest-stats.json` — full line-by-line reconciliation + digests.
- `held-out-v1.json` — pre-registered held-out partition.
- `real-disproof-corpus.SAMPLE.jsonl` — **SAMPLED** (head 200 + tail 50 of 6778
  lines / 4.5M). Full corpus is byte-exact-regenerable via
  `scripts/mcp/atomic-edit-evolution/run-real-harvest.mjs` from the ledgers; only
  the shape is retained as evidence.
- `security-baseline.json` — write-gate / forbidden-exec-law / native-edit-ban
  baseline with behavior-fixture sha256s.

### `evolution/humaneval-v1/work/` — HumanEval pass@k benchmark verdicts
The honest measured deltas (proof/scalar/baseline/cego arms, statistical
separability tests). `VEREDITO.txt`, `P3-VEREDITO.txt`, `PERMUTACAO-VEREDITO.txt`,
`r{2..4}-summary.txt`, `lift-report-*.json`, `samples-*.jsonl`, `packages-*.json`,
`manifest-*.json`. **Skipped** (regenerable): the public `HumanEval.jsonl(.gz)`
dataset and the `dispatch-g1/` + `dispatch-retry/` per-task prompt fan-outs (164
`.txt` each, deterministic from the dataset).

### `evolution/iiif-real-v1/`, `iiif-real-v1.1/`, `iiif-real-v1.1-selftest/`
III.f real lineage-evolution runs: hash-chained `run-ledger-*.jsonl`,
`state.json`, judge outputs (`judge-g{1..5}-*`), `final-summary.txt`,
`RUN-CLAIM.md`, `CONTAMINATION-NOTICE.md`, gen-prompts, proposals, dispatch
prompts. **Skipped** (redundant): `*.real-backup` byte-dup copies and the
`backup-pre-selftest/` duplicate snapshot.

### `scripts/rice-envelope.mjs`
Fable-5 "Decidability Envelope Operator" — a sound (never complete)
termination/decidability prober that honestly refuses the diagonal and emits
`RESIDUE` for un-judged functions. Unique self-loop probe script, absent from the
package.

### `ab-test/`
The standalone A/B-arm test harness (`priority-task-queue`: serializer / feature
flags / reactive store with `*.test.ts`). Source only — the regenerable `tsx-501`
V8 cache was skipped.

## Skipped (regenerable runtime junk, NOT salvaged)
- `node_modules`, `dist`, `*.tsbuildinfo`, the 152 empty `tscancellation3`
  hash-dir markers, TS-server tmp dirs, `swebench-tmp/`, `atomic-lsp-e2e-*` /
  `atomic-type-gate-*` LSP fixtures.
- The full kloel monorepo source (`backend/`, `worker/`, `frontend*/`, `scripts/`,
  `src/`, `core` atomic-edit) — identical to kloel HEAD, already in the package
  via `core/atomic-edit`.

## Provenance
- Source host worktree: `/private/tmp/atomic-loop/r016-allin` (gitdir
  `kloel/.git/worktrees/r016-allin`). READ-ONLY: salvaged via `cp -p`; no git
  checkout/commit/reset performed.
- Secret-swept (sk-/apiKey/github_pat/Bearer/PEM): clean. No `.kloel/config.json`
  or `.env` copied.
