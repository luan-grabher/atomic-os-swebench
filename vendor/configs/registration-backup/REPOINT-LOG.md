# WAVE J — atomic MCP registration re-point log

Canonical package launcher (verified working via MCP `initialize` handshake, serverInfo name=`kloel-atomic-edit` v4.0.0):
`/Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-edit-mcp-launcher.sh`
env set where supported: `ATOMIC_EDIT_REPO_ROOT=/Users/danielpenin/atomic-os-swebench/core/atomic-edit`

## Repointed (atomic-edit) — one line per file, old -> new

- /Users/danielpenin/.claude.json :: atomic-edit :: /Users/danielpenin/kloel/scripts/mcp/atomic-edit-mcp-launcher.sh -> /Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-edit-mcp-launcher.sh (env.ATOMIC_EDIT_REPO_ROOT set)
- /Users/danielpenin/.mcp.json :: atomic-edit :: /Users/danielpenin/kloel/scripts/mcp/atomic-edit-mcp-launcher.sh -> /Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-edit-mcp-launcher.sh (env.ATOMIC_EDIT_REPO_ROOT set)
- /Users/danielpenin/.agents/mcp.json :: atomic-edit :: /Users/danielpenin/kloel/scripts/mcp/atomic-edit-mcp-launcher.sh -> /Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-edit-mcp-launcher.sh (env.ATOMIC_EDIT_REPO_ROOT set)
- /Users/danielpenin/wg-kloelgraph/.mcp.json :: atomic-edit :: scripts/mcp/atomic-edit-mcp-launcher.sh (relative, resolved within wg-kloelgraph) -> /Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-edit-mcp-launcher.sh (env.ATOMIC_EDIT_REPO_ROOT set)

## NOT repointed — reason per file

- /Users/danielpenin/.mcp.json :: atomic-swarm :: LEFT UNTOUCHED — package swarm sibling /Users/danielpenin/atomic-os-swebench/vendor/mcp-siblings/atomic-swarm/server.mjs has NO resolvable node deps (@modelcontextprotocol/sdk + zod missing up its tree); SAFETY gate requires target verified working first. Repointing would break a working registration. Still points at /Users/danielpenin/kloel/scripts/mcp/atomic-swarm/server.mjs (deps resolvable via /Users/danielpenin/kloel/node_modules).
- /Users/danielpenin/.agents/mcp.json :: atomic-swarm :: LEFT UNTOUCHED — same reason as above.
- /Users/danielpenin/kloel/.mcp.json :: atomic-edit + atomic-swarm :: SKIPPED — SAFETY READ-ONLY on /Users/danielpenin/kloel (never edit/commit there). Task listed it but the SAFETY override wins.
- /Users/danielpenin/kloel-elevation/.mcp.json :: atomic-edit + atomic-swarm :: SKIPPED — SAFETY READ-ONLY on /Users/danielpenin/kloel-elevation.
- /Users/danielpenin/.omp/agent/mcp.json :: NO atomic entry (obsidian / lsp-mesh / protocol-hub only) — nothing to repoint.
- /Users/danielpenin/.cursor/mcp.json :: NO atomic entry (gitnexus only) — nothing to repoint.

## Backups (taken BEFORE any edit, in this dir)

- .claude.json.bak, home.mcp.json.bak, agents-mcp.json.bak, wg-kloelgraph.mcp.json.bak (edited files)
- kloel.mcp.json.bak, kloel-elevation.mcp.json.bak, omp-agent-mcp.json.bak, cursor-mcp.json.bak (untouched files, backed up for completeness)

All edited files validated with `python3 -m json.tool` -> OK. Re-points take effect at NEXT MCP/session start.
