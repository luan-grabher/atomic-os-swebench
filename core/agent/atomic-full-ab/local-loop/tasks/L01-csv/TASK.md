# Task L01 — tiny-csv: support RFC-4180 quoting

`tiny-csv` is a small, dependency-free CSV parser. Its public API is
`parseCSV(text)` (in `src/index.mjs`), which returns an array of rows, each row
an array of string fields.

The current implementation only handles trivial comma-separated lines. The test
suite (`test/parse.test.mjs`, run with `node --test`) now includes RFC-4180
quoting cases that **fail**:

- a quoted field that contains a comma — `a,"b,c",d` → `[["a","b,c","d"]]`
- escaped double-quotes inside a quoted field — `"she said ""hi""",x` → `[["she said \"hi\"","x"]]`
- an embedded newline inside a quoted field — `"line1\nline2",y` → `[["line1\nline2","y"]]`
- a quoted empty field — `a,"",c` → `[["a","","c"]]`

## Goal

Make **all** tests in `test/parse.test.mjs` pass with `node --test`, **without
breaking** the two existing tests (`simple unquoted rows`, `trailing empty
field is preserved`).

## Rules

- Do not edit any file under `test/`. The tests define the contract.
- Keep `parseCSV` (and `tokenizeLine`, if you keep it) exported from `src/index.mjs`.
- Keep the library dependency-free (no new npm packages).

## Acceptance (binary gate)

`node --test` exits 0 with all 6 tests passing.
