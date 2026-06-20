#!/usr/bin/env bash
# atomic-bundle.sh — build a SLIM tarball of just the files needed to run the
# Python headless governed-edit path (core/atomic-edit/headless-edit.mjs) inside
# a Modal sandbox. NOT the full 490M node_modules.
#
# WHAT THE PYTHON HEADLESS PATH ACTUALLY TOUCHES (statically traced, see WAVE C1 report):
#   headless-edit.mjs
#     -> dist/engine.js  (replaceText + validate)
#          -> dist/lang-bridge.js       (validatePython => python3 -c "ast.parse")
#          -> dist/engine-structural.js (no npm deps)
#          -> dist/engine-zones.js      (no npm deps)
#          -> typescript (STATIC top-level `import * as ts` — must be present to LOAD engine.js,
#             but is NEVER EXECUTED on the .py path; we ship only lib/typescript.js, the import target)
#     -> dist/server-helpers-negative-proof.js  (zero deps but node:crypto — the governance teeth)
#
#   NOT shipped (proven unreachable on the .py path):
#     - ts-morph / @ts-morph        (only dynamic import() inside TS-rename funcs)
#     - tree-sitter-* grammars       (only java/c/cpp/go/rust/ruby/php/bash — Python uses python3, not tree-sitter)
#     - *.wasm grammars              (only css/sql/html)
#     - pyright / vscode-langservers / yaml-language-server  (LSP, not the edit path)
#     - dist/server.js + the ~140 other dist tool modules
#
# Output: core/agent/atomic-edit-bundle.tgz  (gitignored)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ATOMIC="${ATOMIC_EDIT_REPO_ROOT:-$HERE/../atomic-edit}"
ATOMIC="$(cd "$ATOMIC" && pwd)"
OUT="$HERE/atomic-edit-bundle.tgz"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

BR="$STAGE/atomic-edit"   # bundle root — unpacks to ./atomic-edit/ in the sandbox
mkdir -p "$BR/dist" "$BR/node_modules/typescript/lib"

# 1. the one-shot governed-edit entrypoint
cp "$ATOMIC/headless-edit.mjs" "$BR/headless-edit.mjs"

# 2. the dist closure (5 files)
for f in engine.js lang-bridge.js engine-structural.js engine-zones.js server-helpers-negative-proof.js; do
  cp "$ATOMIC/dist/$f" "$BR/dist/$f"
done

# 2b. CRITICAL: the dist/*.js files are ESM (top-level `import`/`export`). node decides a `.js`
# file's module type from the NEAREST package.json `"type"`. The source ships dist/package.json
# = {"type":"module"} for exactly this reason; WITHOUT it the sandbox node loads dist/engine.js as
# CommonJS and dies with "Cannot use import statement outside a module". Newer node (>=20 on the dev
# mac) silently re-parses typeless .js as ESM (MODULE_TYPELESS_PACKAGE_JSON), which masked this bug
# in the local build selftest — but the older conda-forge nodejs in the Modal sandbox does NOT, so
# the ON arm failed in-sandbox. Ship the marker so dist is unambiguously ESM on ALL node versions.
cp "$ATOMIC/dist/package.json" "$BR/dist/package.json" 2>/dev/null || printf '{"type":"module"}\n' > "$BR/dist/package.json"

# 3. minimal typescript: only the import target + its package.json (drop _tsc/tsserver/locales/.d.ts)
cp "$ATOMIC/node_modules/typescript/package.json" "$BR/node_modules/typescript/package.json"
cp "$ATOMIC/node_modules/typescript/lib/typescript.js" "$BR/node_modules/typescript/lib/typescript.js"

# 4. a tiny package.json marker (ESM not required — .mjs forces it — but keep deps resolvable)
cat > "$BR/package.json" <<'JSON'
{ "name": "atomic-edit-headless-bundle", "version": "1.0.0", "private": true }
JSON

# 5. self-test inside the staged bundle so a broken bundle fails the build, not the sandbox.
#    Use a PURELY ADDITIVE edit (no byte removal) so exit 0 proves the engine loaded + python3
#    syntax gate ran, without tripping the negative-byte governance.
#    --no-experimental-detect-module DISABLES node>=20's silent typeless-.js -> ESM reparse, so the
#    local build node behaves like the OLDER conda-forge node in the sandbox. Without this flag the
#    selftest passes on the dev mac even when dist/package.json is missing, masking the very bug that
#    broke the ON arm in-sandbox. If the flag is unsupported on this node, fall back to plain node.
NODE_STRICT=(node --no-experimental-detect-module)
node --no-experimental-detect-module -e "1" >/dev/null 2>&1 || NODE_STRICT=(node)
cat > "$STAGE/selftest.py" <<'PY'
def f(x):
    return x + 1
PY
printf 'return x + 1' > "$STAGE/old.txt"
printf 'return x + 1  # bundle selftest ok' > "$STAGE/new.txt"
SELFTEST_OUT="$("${NODE_STRICT[@]}" "$BR/headless-edit.mjs" "$STAGE/selftest.py" "$STAGE/old.txt" "$STAGE/new.txt" 2>"$STAGE/err")" || {
  echo "atomic-bundle: SELFTEST FAILED — bundle cannot run headless-edit:" >&2
  echo "$SELFTEST_OUT" >&2; cat "$STAGE/err" >&2
  exit 1
}
case "$SELFTEST_OUT" in
  *'"ok":true'*'"language":"python"'*) : ;;  # engine loaded + python3 gate ran
  *) echo "atomic-bundle: SELFTEST got unexpected verdict: $SELFTEST_OUT" >&2; exit 1 ;;
esac

tar -czf "$OUT" -C "$STAGE" atomic-edit
echo "atomic-bundle: wrote $OUT"
echo "atomic-bundle: bundle size: $(du -sh "$OUT" | cut -f1)  (unpacked: $(du -sh "$BR" | cut -f1))"
echo "atomic-bundle: full node_modules for comparison: $(du -sh "$ATOMIC/node_modules" 2>/dev/null | cut -f1)"
