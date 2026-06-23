#!/usr/bin/env bash
# ac.sh — atomic-only hands for a same-model (Claude) ATOMIC arm.
# Usage: ac.sh <workdir> <tool> '<json-args>'   (pass file/path ABSOLUTE, e.g. <workdir>/pkg/file.py)
# Dispatches one atomic-call tool against <workdir>, jailed to it. The atomic-Claude arm must use ONLY
# this for code reads/edits — never native Read/Edit/Write/Grep/Glob.
# Tools & args:
#   atomic_grep        {"pattern":"re","path":"<abs>"}
#   code_outline_batch {"glob":"pylint/**/*.py","cwd":"<workdir>"}
#   code_readcode      {"path":"<abs>","selector":"name"}   (symbol or whole file)
#   atomic_read_file   {"file":"<abs>","startLine":N,"endLine":M,"includeContent":true}   (LINE RANGE)
#   atomic_replace_text{"file":"<abs>","oldText":"...","newText":"..."[,"proofOfIncorrectness":">=20 chars if removing"]}
#   atomic_create_file {"file":"<abs>","content":"..."}
set -uo pipefail
WD="$(cd "$1" && pwd)"; TOOL="$2"; ARGS="${3:-{}}"
AC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../atomic-edit" && pwd)/atomic-call.mjs"
cd "$WD"
ATOMIC_DISABLE_HOT_RELOAD=1 ATOMIC_WORKSPACE_ROOT="$WD" ATOMIC_DECLARED_WORKSPACE_ROOT="$WD" \
  ATOMIC_EDIT_ALLOWED_ROOTS="$WD" node "$AC" "$TOOL" "$ARGS" 2>&1
