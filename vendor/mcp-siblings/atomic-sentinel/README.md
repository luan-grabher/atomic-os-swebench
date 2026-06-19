# atomic-sentinel MCP server (v1)

Background daemon that monitors the `.atomic/` directory for **failed swarm
tasks** and **expired edit locks**. When a failure is detected it logs the event
to an append-only ledger and automatically creates an `auto_heal` task in the
swarm task queue, closing the feedback loop without human intervention.

## Tools (1)

| Tool | Description | Input |
|---|---|---|
| `sentinel_status` | Returns daemon status, alerted counts, and the last 10 ledger events. | _(none)_ |

## Architecture

Two [chokidar](https://github.com/paulmillr/chokidar) file-system watchers run
persistently with debounced handlers (500 ms):

| Watcher | Target | Trigger |
|---|---|---|
| **Tasks watcher** | `.atomic/swarm-tasks.json` | `add`, `change` |
| **Locks watcher** | `.atomic-edit-locks/` directory | `add`, `change`, `unlink` |

### Auto-heal integration

When a task with `status: "failed"` is detected for the first time, the sentinel:

1. Logs a `task_failed` event to the ledger.
2. Creates a new `auto_heal` task (UUID, status `pending`) in `swarm-tasks.json`.

Each failed task / expired lock is alerted only once per process lifetime
(tracked via in-memory `Set`).

## Guarantees

- **Append-only ledger** — events are never overwritten or deleted.
- **Idempotent alerts** — duplicate detections are suppressed via `alertedTasks` / `alertedLocks` sets.
- **Graceful shutdown** — `SIGINT` / `SIGTERM` close watchers and the MCP server before exit.

## Ledger

```
.atomic/sentinel-events-ledger.jsonl
```

Each line is a JSON object: `{ timestamp, type, data }`.

## Runtime

Repo root is discovered by walking up from `cwd` looking for `.git`, falling
back to `$HOME`. Override with `ATOMIC_REPO_ROOT` env var.

```sh
node scripts/mcp/atomic-sentinel/server.mjs
```

Requires: `@modelcontextprotocol/sdk`, `chokidar`.

## Activation

Registered via `.mcp.json` / `opencode.json` as `atomic-sentinel`. Runs on
stdio transport — the host process keeps the watchers alive for the duration
of the session.

## Honest scope

- **No persistent queue** — alert dedup is in-memory; restarting the process resets the `alertedTasks` / `alertedLocks` sets (the ledger itself is durable).
- **Expired-lock detection is passive** — locks are only checked when the lock directory changes, not on a timed sweep. A lock that expires with no filesystem activity will not be noticed until the next write.
- **No remediation execution** — the sentinel creates `auto_heal` tasks but does not execute them; another agent must pick them up.
- **Single-repo scope** — monitors one repo root per process.
