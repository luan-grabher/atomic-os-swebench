# Atomic — full unification (one source, everywhere, permanent)

**Goal (user's words):** the complete atomic that Claude / codex / opencode / vibe / omp use as an MCP
and develop must be the SAME product, the SAME scaffold, as the one the SWE-bench A/B benchmark runs —
so that if ANY agent improves atomic, the improvement reaches everyone and the benchmark loop, the MCP,
and the A/B test alike. Full, complete, permanent unification.

## Single source of truth

`~/atomic-os-swebench/core/atomic-edit` on git **master** (`github.com/danielgonzagat/atomic-os-swebench`).
This is the ONLY atomic-edit package on disk (v4.0.0, 123 tools). The historical `whatsapp_saas/...`
and `kloel/...` copies are gone; configs that still pointed at them were dangling (which is why the
atomic-edit MCP kept disconnecting).

## What was unified (2026-06-20)

1. **All host MCP configs repointed to the canonical launcher**
   `core/atomic-edit/atomic-edit-mcp-launcher.sh`:
   - `~/.mcp.json`, `~/.claude.json`, `~/.agents/mcp.json`, `~/.codex/config.toml`
     (backups: `*.atomicunify-bak-*`). Now Claude, codex, and the agents host all launch the SAME atomic.
   - Sibling MCPs (atomic-swarm / atomic-memory / atomic-sentinel) already point at
     `core/agent/atomic-full-ab/pkg/...`-adjacent `vendor/mcp-siblings/` — same repo.

2. **Benchmark runs the canonical source, not a frozen snapshot.**
   `run-ab.sh` rebuilds `atomic-full-bundle.tgz` from `core/atomic-edit` on every run
   (`rebuild-bundle.sh`). A commit to master → the next A/B uses it. The bundle is a build artifact
   (gitignored), regenerated from source — never a diverging copy.

3. **Agents can improve the source in-place.** `atomic_expand_self` admission was fixed to detect the
   package by its stable `bin: atomic-edit-mcp` marker (survived the `name`→"atomic-os" rename), so an
   agent editing atomic's own code is admitted under proof. Edits → commit master → propagate.

## The propagation loop (permanent)

```
any agent improves core/atomic-edit  (atomic_expand_self / direct edit, under proof)
        │  git commit + push origin master
        ▼
origin/master = the one canonical atomic
        ├──► host MCPs (Claude/codex/agents) pick it up on next launch (configs point here)
        ├──► benchmark A/B: run-ab.sh rebuilds the bundle from it before each run
        └──► atomic-swarm subagents: launch the same canonical atomic-edit MCP
```

## Still open (tracked)

- **Full tool coverage:** the benchmark FULL arm currently exposes a curated subset of the 123 tools.
  Target: expose every code-relevant tool (grounded by the 123-tool mastery sweep) so the agent can
  use the totality. Browser/self-expand tools stay excluded (not code-edit capabilities).
- **atomic-swarm in the benchmark arm:** wire the 17 `swarm_*` tools so the agent can coordinate a
  subagent swarm whose members each get the full atomic-edit MCP.
