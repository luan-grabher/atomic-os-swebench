# elevation-backup-delta

Net-new atomic content salvaged from the elevation backup that is **absent from**
the package's already-unioned elevation content
(`core/_union-staging/atomic-edit-elevation/`, `core/atomic-edit/`, `vendor/*`).

## Provenance

- Source A: `/Users/danielpenin/kloel-elevation-backup-20260619/` — a snapshot of the
  `atomic/paradigm-elevation` worktree at HEAD `563134d9daef66bac316ac1a36d10c1e03841548`
  (`worktree-modifications.patch` + `untracked-work.tar.gz`).
- Salvaged read-only via `git show <commit>:<path>` against the live `.git` shared by
  the `/Users/danielpenin/kloel-elevation` worktree. No checkout/commit/reset performed.

## What this delta contains (and why it is net-new)

The backup's **source code** (every `scripts/mcp/atomic-edit/*.ts|*.mjs` touched by the
worktree patch — `server-tools-*`, `engine-*`, `native-bridge.ts`, `trace.ts`,
`build.mjs`, `connection-gate.ts`, gates, etc.) was verified **byte-identical** to the
package's `core/_union-staging/atomic-edit-elevation/` copies (reconstructed
HEAD+patch sha256 == package sha256). The entire `untracked-work.tar.gz` (paper/,
ATOMIC-IMPROVEMENT-LEDGER.md, swebench-funnel-*, gold-patch-lite.jsonl,
test-crit-*, gate proof.mjs) was likewise verified byte-identical to the package.
**Nothing from the source code / tar was net-new.**

The ONLY net-new atomic content was the **Movimento III "REAL-data evolution" /
III.f IIIF run evidence + state**, committed under `.atomic/evolution/` in HEAD but
absent everywhere in the package:

- `.atomic-evolution/README.md`, `real-briefing.md` — III.c/III.d wall-geometry
  briefing: synthesized laws (LEI/PAREDE/CONTRA-EXEMPLO) from REAL refusals
  (exec-ledger `kind:refused` + bypass-ledger `blockedByDenyHook`).
- `real-disproof-corpus.jsonl`, `real-lessons.jsonl`, `real-harvest-stats.json`,
  `held-out-v1.json` — hash-chained disproof corpus, temporally-validated III.d laws
  (`neverAGate:true`), pre-registered held-out partition, line-by-line reconciliation.
- `iiif-real-v1/` + `iiif-real-v1.1/` — III.f IIIF evolution runs (haiku+opus, G=5):
  RUN-CLAIM.md (single-dispatcher claim, structural stale-judge refusal self-test 7/7),
  CONTAMINATION-NOTICE.md (g4 contamination documented), gen/judge/proposal artifacts,
  run-ledgers, state.json, aggregate/curves, per-generation summaries.
- `security-baseline.json` — atomic write-gate / forbidden-exec-law / native-edit-ban
  count baseline (14 write gates, 18 forbidden exec laws, etc.).

## What was intentionally skipped (regenerable / per-problem dumps)

- `.atomic/evolution/humaneval-v1/work/**` and all `dispatch*/`, `dispatch-g1/`,
  `dispatch-retry/` per-problem `HumanEval-N.txt` files (hundreds of regenerable
  model-output dumps).
- `HumanEval.jsonl` + `.gz` (public benchmark dataset, regenerable).
- `*.real-backup` byte-duplicate sibling files (the primary copy is kept;
  `backup-pre-selftest/` is kept as documented contamination evidence).

Secret-scanned (sk-/sk-ant-/apiKey/github_pat/ghp_/AKIA/xoxb) — clean, zero hits.
