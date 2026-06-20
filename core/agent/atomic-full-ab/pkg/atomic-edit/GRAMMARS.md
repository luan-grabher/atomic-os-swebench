# Universal grammar coverage (atomic-edit perception layer)

The universal engine (`native-bridge.ts`) parses/edits source structurally via
web-tree-sitter (WASM). Each language needs a `tree-sitter-<lang>` grammar registered
in `GRAMMARS` and mapped from its file extension in `EXT`.

## Repo languages covered

| Language | Grammar | wasm source |
|---|---|---|
| TypeScript / TSX | tree-sitter-typescript | npm (prebuilt) |
| JavaScript | tree-sitter-javascript | npm (prebuilt) |
| Shell (.sh/.bash/.zsh) | tree-sitter-bash | npm (prebuilt) |
| CSS | tree-sitter-css | npm (prebuilt) |
| HTML | tree-sitter-html | npm (prebuilt) |
| SQL / PLpgSQL (.sql) | @derekstride/tree-sitter-sql | built locally (see below) |

Proven by `gates/grammar-coverage.proof.mjs`: each grammar loads, parses a valid
fixture with zero ERROR nodes, exposes named nodes, and honestly flags broken input
(no false-green). An un-grammared language returns realParser:false (honest ceiling).

## SQL wasm reproducibility

`@derekstride/tree-sitter-sql` ships only C source (`parser.c`/`scanner.c`), no
prebuilt wasm. Build it once (needs the tree-sitter CLI + Docker for emscripten):

```sh
cd scripts/mcp/atomic-edit
XDG_CACHE_HOME="$PWD/.ts-cache" \
  npx tree-sitter build --wasm node_modules/@derekstride/tree-sitter-sql \
  -o node_modules/@derekstride/tree-sitter-sql/tree-sitter-sql.wasm
```

`findWasm` prefers a committed `grammars/<file>` (vendored) and falls back to
`node_modules/<pkg>/<file>`. Vendor the built wasm into `grammars/` to make SQL
coverage durable across fresh installs; otherwise SQL honestly degrades (realParser
absent) until the build step runs.
