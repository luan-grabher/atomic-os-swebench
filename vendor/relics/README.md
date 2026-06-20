# relics

Reserved for net-new atomic design notes / specs / decisions salvaged from the
knowledge vaults. **This sweep found nothing salvageable** — the vaults are
machine-generated graph mirrors, not original atomic source docs.

## Sources swept (2026-06-19)

### 1. `/Users/danielpenin/Obsidian-kloel-relic-2026-05-20/` (+ `KLOEL/` subdir)
Empty of content — the `KLOEL/` subdir contains only `.DS_Store`. Nothing to salvage.

### 2. `/Users/danielpenin/Documents/Obsidian Vault/Kloel/`
This is a **Graphify Mirror**, not a hand-authored vault. Its `_INDEX.md` self-declares:

> "# Kloel — Graphify Mirror … Nodes: 86833, Edges: 166814, Communities: 4148"

Every `.md` (35k+ under `docs/ai/`, plus `.kloel/`, `backend/`, `worker/`, etc.) is a
graph-node **stub** — frontmatter (`id`, `label`, `community`, `tags`) plus backlink
scaffolding pointing at a `source_file:` path inside the live `kloel` repo (e.g.
`docs/ai/ATOMIC_EDIT_OPERATING_GUIDE.md`, `docs/ai/atomic-os-benchmark/round-001-verdict.md`).
The stubs hold no original prose — they are a regenerable projection of source files
that the package already covers via `core/atomic-edit/` and the live repo's docs.

Salvaging the stubs would add 35k+ low-signal fragment files and zero net-new atomic
knowledge, so they were intentionally skipped per the "skip regenerable" guardrail.

The original atomic docs those stubs reference (operating guide, CLI activation matrix,
atomic-os-benchmark round verdicts) live in the `kloel` repo working tree, not in this
vault, and are out of scope for the backup/vault sweep.
