# atomic-dashboard (v1)

Real-time terminal UI (TUI) that aggregates and renders the state of the entire
Atomic ecosystem. Reads **7 append-only ledgers** from `.atomic/` and refreshes
the display every 1 second, giving a single-pane view of locks, tasks, sentinel
events, semantic memory, OS exec audit, and swarm network activity.

## Monitored ledgers (7)

| Ledger file | Dashboard section | Detail shown |
|---|---|---|
| `swarm-locks-ledger.jsonl` | Active Swarm Locks | Active count, last 5 entries |
| `swarm-tasks-ledger.jsonl` | Active Swarm Tasks | Active count, last 5 entries |
| `sentinel-events-ledger.jsonl` | Sentinel Events | Last 3 events (timestamp, type, detail) |
| `semantic-memory-ledger.jsonl` | Semantic Memory | Last 3 entries (timestamp, key, content) |
| `os-exec-ledger.jsonl` | OS Exec Audit | Last 3 entries (timestamp, command, exit code) |
| `swarm-fetch-ledger.jsonl` | Swarm Network | Total count, last URL |
| `swarm-batch-ledger.jsonl` | Swarm Network | Total count, last batch ID |

## Sections rendered

1. **Status Summary** — entry counts and active counts for all 7 ledgers.
2. **Active Swarm Locks** — currently held (unreleased) locks.
3. **Active Swarm Tasks** — tasks not yet completed or failed.
4. **Sentinel Events** — last 3 events from the sentinel daemon.
5. **Semantic Memory** — last 3 memory entries.
6. **OS Exec Audit** — last 3 shell/AppleScript executions.
7. **Swarm Network** — fetch request and batch job totals.
8. **Recent Activity** — merged timeline of the 5 most recent lock/task events.

## TTY-safe output

The dashboard detects whether stdout is a TTY (`process.stdout.isTTY`):

| Mode | Behavior |
|---|---|
| **TTY** (interactive terminal) | ANSI color codes enabled, `console.clear()` before each refresh |
| **Piped** (non-TTY) | All color codes resolve to empty strings, no screen clearing |

This makes the output safe for both interactive use and piping to files or
other tools.

## Runtime

```sh
node scripts/mcp/atomic-dashboard/index.mjs
```

No dependencies beyond Node.js built-ins (`fs`, `path`). Refreshes every
1 second via `setInterval`. Exit with `Ctrl+C`.

The repo root is resolved as 3 directories up from the script location
(`../../..` from `scripts/mcp/atomic-dashboard/`).

## Honest scope

- **Read-only** — the dashboard never writes to any ledger; it is a pure observer.
- **Not an MCP server** — this is a standalone Node.js script, not an MCP tool. It has no tools and cannot be called by agents.
- **No historical graphs** — displays only current counts and the most recent entries; there is no time-series visualization or trend analysis.
- **1-second polling** — uses `setInterval` rather than file-system watchers; brief events that appear and disappear within one cycle may be missed.
- **Fixed repo root** — assumes it lives exactly at `scripts/mcp/atomic-dashboard/` relative to the repo root. Moving the script breaks the path resolution.
