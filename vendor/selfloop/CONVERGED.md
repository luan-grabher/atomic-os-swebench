# CONVERGED — the emergent loop now runs on ONE atomic substrate (WAVE K)

**Date:** 2026-06-19
**Scope of this change:** wiring only. Re-points the emergent self-improvement loop
(`vendor/selfloop`, the P0–P8 atomic-selfloop) and the cognitive substrate
(`vendor/coglang`) so they OPERATE ON the package's own canonical atomic-edit engine —
one place — instead of a kloel-style external path.

## The one canonical substrate

```
/Users/danielpenin/atomic-os-swebench/core/atomic-edit
```

This is the **flat** atomic-edit layout (gates directly at `<root>/gates`, ledgers at
`<root>/.atomic/`, generators like `hypothesis-generator.mjs` / `emergence-report.mjs`
directly at `<root>/`). It is NOT the legacy kloel-nested
`<repoRoot>/scripts/mcp/atomic-edit/...` shape the loop used to assume.

Every entrypoint resolves the root with this priority (single resolver,
`vendor/selfloop/atomic-root.mjs`):

1. explicit positional arg (e.g. `node selfloop.mjs /some/root`)
2. `ATOMIC_EDIT_REPO_ROOT` env var
3. the canonical `core/atomic-edit` above

No entrypoint silently falls back to `process.cwd()` any more — that fallback is exactly
what let the loop quietly bind to whatever directory it happened to be launched from.

## What was wrong before (and is now fixed)

| Symptom | Before | After |
|---|---|---|
| `hypothesis-generator` import | `import … from '../mcp/atomic-edit/hypothesis-generator.mjs'` → **`vendor/mcp/` does not exist** → broken import | runtime dynamic `import()` of `<canonical>/hypothesis-generator.mjs` (env-overridable) |
| gates directory | `path.join(repoRoot, 'scripts/mcp/atomic-edit/gates')` → missing in this package | `resolveGatesDir()` — finds flat `<root>/gates` (221 gates), still supports legacy nested |
| git ctime rel-path | hardcoded `scripts/mcp/atomic-edit/gates/<f>` | `gateRelPath()` — layout-aware |
| default root | `… || process.cwd()` | `resolveAtomicRoot(arg)` → canonical atomic-edit |
| EVIDENCE.md recompute cmds | `node ../mcp/atomic-edit/…` | `node ../../core/atomic-edit/…` |

## Files re-pointed (all under `vendor/selfloop/`)

- **`atomic-root.mjs`** — NEW. The single resolver: `resolveAtomicRoot`,
  `resolveGatesDir`, `gateRelPath`, `CANONICAL_ATOMIC_EDIT`.
- `selfloop.mjs` — dynamic import of the canonical hypothesis-generator; `resolveGatesDir`
  for admitted-coupling detection; `resolveAtomicRoot` default.
- `grounding.mjs`, `grounding-hybrid.mjs` — dynamic import of canonical
  hypothesis-generator; `resolveAtomicRoot` default.
- `coverage-extrapolator.mjs` — `resolveGatesDir` + `gateRelPath` + `resolveAtomicRoot`.
- `exec-risk.mjs`, `held-out-wall.mjs`, `neuro-mlp.mjs`, `learning-curve.mjs`,
  `fitness.mjs`, `exec-guard.mjs`, `criticality.mjs`, `neuro.mjs`, `origin.mjs` —
  default root switched from `process.cwd()` to `resolveAtomicRoot(arg)`. These read
  `<root>/.atomic/*` ledgers/corpus, so they now read the canonical substrate's data.
- `EVIDENCE.md` — recompute commands re-pointed at `../../core/atomic-edit/`.

## `vendor/coglang` — no change required

The coglang cognitive substrate (`coglang.mjs` + its tests) has **zero** hardcoded
atomic-edit / repo-root / MCP paths. It is a self-contained substrate. It was already
"converged" by construction; nothing to re-point. Its three tests pass (1/1 each).

## Verification (run 2026-06-19, default root = canonical atomic-edit)

- `selfloop.mjs` → runs; P3 generate + P2 measure wired; 0 candidates (sparse corpus —
  honest, the corpus accrues during operation).
- `coverage-extrapolator.mjs` → **reads 221 real gates** from
  `core/atomic-edit/gates` and froze its prediction record into the canonical
  `core/atomic-edit/.atomic/held-out-walls.jsonl` (proof the write lands in the unified
  substrate, not cwd).
- `grounding.mjs` / `grounding-hybrid.mjs` / `fitness.mjs` → import resolves, run cleanly.
- `ATOMIC_EDIT_REPO_ROOT=<tmp>` override → honored (ran against the override target).
- `origin.test.mjs` → 8 pass / 0 fail. `coglang.*.test.mjs` → 3/3 pass.

## Honesty (this is the load-bearing part)

This change **wires the emergent loop to one atomic substrate**. That is all it claims.

- It does **NOT** claim strong cognition, understanding, or AGI.
- The "emergence" here is the **measured weak-emergence loop** — mechanical, audited,
  and the honest judge (`emergence-report`) stays SILENT on normal state (no
  strong-emergence candidate). See `EVIDENCE.md §5`: "no strong-emergence candidate —
  mechanical weak emergence only."
- The selfloop still **STOPS AT A DRY-RUN**. It proposes and records self-authored gate
  couplings; it does NOT auto-promote them to the live engine. Promotion to
  `atomic_expand_self` remains a deliberate, human-flipped switch — not a silent daemon.
- Convergence means the loop and the substrate it improves are now the **same atomic** —
  it can no longer accidentally measure/propose against a stale or external copy. That is
  a correctness/honesty win, not a capability claim.
