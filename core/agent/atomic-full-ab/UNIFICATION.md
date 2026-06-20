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

## Propagation is now LIVE (no loose ends)

The single-source loop is mechanized, not a discipline:

- **Inbound — within a machine (LIVE):** every CLI agent launches the SAME canonical
  `core/atomic-edit` (all host configs point here) and the launcher self-rebuilds `dist` from source on
  launch + hot-reloads on edits. So an edit by ANY local agent is seen by ALL local agents on their next
  tool call — live, no copy. (We deliberately do NOT inject into the launcher itself: it has a blessed/
  manifest immune system that self-heals edits, so injecting there is fought off. Shared-source + the
  existing self-rebuild already gives single-machine live propagation without touching that immune system.)
- **Inbound — across machines:** a launchd agent (macOS) / cron (linux) — `install-unify-sync.sh` —
  runs `atomic-sync.sh` every 120s: pull `origin/master` (clean-master-only, ff-only, ~10s budget,
  rate-limited 90s, all errors swallowed) + dist rebuild. Tool-agnostic: every agent on the machine
  benefits via the shared source. `run-ab.sh` runs the same sync first, so the benchmark gets every change too.
- **Outbound (every change reaches master):** `.githooks/post-commit` auto-publishes any commit on
  `master` to `origin/master` (backgrounded, best-effort). `atomic-sync.sh` self-installs
  `core.hooksPath=.githooks` so the hook is active everywhere after the first sync.
- **Proof gate (nothing broken propagates):** `.githooks/pre-push` runs the atomic core gates
  (build + smoke + paradigm-verify, with one retry for the known P1 flake) before ANY push to master
  and BLOCKS the push if red. This is the integrity that makes "change one → change all" safe: what
  reaches everyone was already proven green. Emergency opt-out: `ATOMIC_NO_PROOF_GATE=1`.
- **Net effect:** an agent (any of Claude / Codex / Antigravity / Oh-my-pi / Vibe) improves atomic →
  commit on master → auto-pushed → every other agent's next MCP launch + every benchmark run pulls and
  rebuilds it. One evolving atomic, shared by all hosts AND the DeepSeek-V4-Pro benchmark scaffold.

**Honest boundary:** propagation happens at launch / run boundaries (+ within-session hot-reload), not
literally instant across already-running processes — git is the sync substrate, so the granularity is
"next MCP start / next bench run," which is the strongest guarantee possible without a shared live daemon.
Opt-outs: `ATOMIC_NO_SELFSYNC=1` (inbound), `ATOMIC_NO_AUTOPUSH=1` (outbound).

## Still open (tracked)

- **Full tool coverage:** the benchmark FULL arm currently exposes a curated subset of the 123 tools.
  Target: expose every code-relevant tool (grounded by the 123-tool mastery sweep) so the agent can
  use the totality. Browser/self-expand tools stay excluded (not code-edit capabilities).
- **atomic-swarm in the benchmark arm:** wire the 17 `swarm_*` tools so the agent can coordinate a
  subagent swarm whose members each get the full atomic-edit MCP.
