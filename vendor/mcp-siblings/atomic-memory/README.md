# atomic-memory MCP server (v1)

Semantic intent ledger for the Atomic ecosystem. Records **why** a code change,
task, or lock was made — connecting the append-only ledger with cognitive
rationale — and allows later retrieval by keyword or tag. Every entry is
SHA-256-hashed at write time, producing a tamper-evident receipt.

## Tools (2)

| Tool | Input | Description |
|---|---|---|
| `memory_record` | `intent` (string, ≥10 chars), `relatedFiles?`, `relatedTaskIds?`, `tags?` | Append a semantic memory entry to the ledger. Returns `{ ok, hash, recordedAt }`. |
| `memory_query` | `query?`, `tag?`, `limit?` (default 50) | Search past entries by substring match on `intent` or exact match on `tag`. Returns newest-first. |

## Guarantees

- **Append-only ledger** — entries are never overwritten or deleted (`appendFileSync`).
- **SHA-256 receipt** — every recorded entry includes a `hash` field computed over the serialised entry (pre-hash), enabling downstream integrity verification.
- **Fail-closed** — on write/read errors the tool returns a structured error (`isError: true`) rather than silently succeeding.

## Ledger

```
.atomic/semantic-memory-ledger.jsonl
```

Each line is a JSON object:
```json
{ "at": "ISO-8601", "tool": "memory_record", "intent": "…", "files": [], "tasks": [], "tags": [], "hash": "sha256-hex" }
```

## Runtime

Repo root is read from `ATOMIC_SWARM_REPO_ROOT` or falls back to `cwd`.
The `.atomic/` directory is created on startup if absent.

```sh
node scripts/mcp/atomic-memory/server.mjs
```

Requires: `@modelcontextprotocol/sdk`, `zod`.

## Activation

Registered via `.mcp.json` / `opencode.json` as `atomic-memory`. Runs on stdio
transport.

## Honest scope

- **Text match, not vector search** — `memory_query` uses case-insensitive `String.includes()` for keyword search and exact equality for tags. There is no embedding model, no semantic similarity, no fuzzy matching.
- **No deduplication** — recording the same intent twice produces two separate ledger entries.
- **No deletion / expiry** — the ledger is strictly append-only with no TTL or compaction.
- **Single-file storage** — all entries live in one `.jsonl` file; at very high volumes this may become slow to scan.
- **Hash covers pre-hash entry only** — the SHA-256 is computed over the entry *before* the hash field is added; it does not chain to previous entries (no Merkle chain).
