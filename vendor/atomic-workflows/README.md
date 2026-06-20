# vendor/atomic-workflows

Salvaged **atomic orchestration workflow scripts** — the `.js` harnesses that the Claude
Code workflow engine ran to drive atomic's adversarial hunts, audits, dogfood passes,
proof-chain attacks, SWE-bench scaling, and paradigm/revolution verdicts.

## What these are

Each `scripts/*.js` is a self-contained orchestration harness exporting `meta` + a body
that calls `parallel([ () => agent(prompt, {label, schema, effort}) ... ])` to fan out
adversarial subagents. They encode, in the prompt + JSON `schema` + the known-state WRAP
block, the **atomic-specific orchestration logic**: how atomic is exercised hang-proof
via `/tmp/atomic-call.sh`, which invariants are already-known vs net-new, the proof-chain
forge-resistance attack surface, the cross-language honesty/fake-green hunt, the agent-loop
convergence drive, and the `proofOfIncorrectness` strict-admission self-expansion contract.

These are the *driver* layer (not the atomic engine itself, which lives in
`core/atomic-edit`). They are net-new vs the package: the engine was already vendored, but
the orchestration harnesses that produced the ledgers/laudos/verdicts were not.

## Selection

- 211 total workflow `.js` across all `~/.claude/projects/*/workflows/scripts/`.
- Filtered to **50 unique** that genuinely encode atomic orchestration (signal: atomic MCP
  source paths, proof-chain, `proofOfIncorrectness`, dogfood, lattice, coglang, paradigm,
  SWE-bench-atomic, funnel/PASS_TO_PASS) AND are not kloel/whatsapp product-engineering.
- Deduped by content sha256 (all 50 are distinct content).
- **Dropped** pure-product passes that merely *use* atomic-edit as a tool (kloel strict-mode
  PR #488 fixes, MindMessage dedup swarms i/j, whatsapp lens-bug fixes, iiif/tenant/persona
  product work) — no net-new atomic capability there.

`MANIFEST.tsv` records `filename → source_project → full source_path → sha256` for every
salvaged script (provenance; the scripts were scattered across kloel, kloel-elevation,
swebench-atomic-ab, whatsapp-saas, and atomic-os-swebench project session dirs).

## Highlights (representative, not exhaustive)

- `atomic-dynamic-deep-hunt`, `atomic-unprecedented-hunt`, `atomic-honesty-ceiling-sweep`
  — adversarial gap/fake-green hunts with the hang-proof wrapper protocol.
- `atomic-revolutionary-verdict` / `-refresh`, `atomic-is-it-revolutionary`,
  `dgm-in-atomic-verdict`, `dgm-atomic-ceiling` — paradigm/DGM ceiling verdicts.
- `atomic-114-dogfood` / `-v2` — full 114-tool dogfood orchestration.
- `atomic-no-bypass-audit`, `atomic-total-wall-audit`, `forensic-wall-audit`,
  `final-six-wall-demolition` — bypass/wall audits.
- `swebench-defect-classify`, `swebench-full-scaling-plan` — SWE-bench atomic scaling.
- `touching-rice-atomic`, `atomic-y-close-decidable-field`, `finite-red-field-completeness-map`
  — formal-floor / Rice-boundary theory drivers.
- `canon-iter{4,6,8,9}`, `atomic-os-conflict-union-merge`, `atomic-total-completeness-salvage`
  — canonicalization / union-merge / salvage orchestration.

## gemini-scratch/

`atomic_expand_self-runner.js` — a one-shot Node harness (from
`~/.gemini/antigravity-cli/brain/.../scratch/`) that calls the `atomic_expand_self` MCP
tool with the **`proofOfIncorrectness`** admission field populated, demonstrating the
strict-admission self-expansion call shape (doc-honesty proof-count fix, gated on
`node gates/doc-honesty.proof.mjs --json`). Unique example of the self-expansion contract
in the wild; preserved with its `.metadata.json`.

## Secret scan

All 50 scripts + the gemini runner scanned for `sk-…`, `ghp_`, `github_pat`, AWS keys,
private-key headers, and inline `apiKey` — **clean, zero matches**.
