#!/bin/sh
# atomic-stop-trace-coverage-hook.sh — workspace-local absolute-path wrapper.
# Invoked by Codex Stop hook via /bin/sh (PATH-independent under empty PATH lint).
# $1 = trace-coverage-audit.mjs path.
set -e
AUDIT="${1:-/Users/danielpenin/atomic-os-swebench/core/atomic-edit/trace-coverage-audit.mjs}"
NODE_BIN="/opt/homebrew/bin/node"
test -x "$NODE_BIN" || NODE_BIN="$(command -v node 2>/dev/null || echo /usr/local/bin/node)"
exec "$NODE_BIN" "$AUDIT" --codex-stop-json
