---
name: atomic-code-editing
description: Use this when making precise code edits where line-oriented patches would rewrite more text than necessary. Provides local semantic and atomic editing CLIs for TypeScript AST edits, ranges, insertions, deletions, exact occurrence replacement, and public validation output.
---

# Atomic Code Editing

Use this skill when the intended mutation is smaller than a line, or when multiple agents could otherwise collide by rewriting the same line or block.

## Rule

Prefer the highest truthful edit primitive:

1. `semantic-edit` for TypeScript/TSX structured read, symbol, literal, import, object-property, or scoped rename edits.
2. `atomic-edit` for coordinate range, insertion, deletion, or exact occurrence replacement.
3. Existing project codemod/refactor tool, if it is more semantic than either local CLI.
4. `apply_patch` only when the edit is naturally line/block/file level.

Do not use this to bypass repository governance. Still read the relevant code first, respect protected files, and validate after edits.

The proven operating doctrine is:

```txt
semantic / AST / symbol
> exact occurrence / range / character
> line patch fallback
```

Character-level editing alone is not the win. The win is microscopic mutation
with semantic addressing, dry-run, uniqueness/concurrency guards, syntax
validation, and a small focused verification. Raw coordinate edits are a lower
level fallback because choosing the wrong coordinate can still break syntax.

## CLI

Semantic executable:

```sh
/Users/danielpenin/.codex/bin/semantic-edit
```

Atomic executable:

```sh
/Users/danielpenin/.codex/bin/atomic-edit.mjs
```

Convenience links inside the skill:

```sh
/Users/danielpenin/.codex/skills/atomic-code-editing/scripts/atomic-edit.mjs
/Users/danielpenin/.codex/skills/atomic-code-editing/scripts/semantic-edit.cjs
/Users/danielpenin/.codex/skills/atomic-code-editing/scripts/smoke-atomic-code-editing.mjs
```

## Common Operations

List AST selectors in a TypeScript file:

```sh
semantic-edit outline --file path/to/file.ts
```

Show a selected node without rewriting surrounding code:

```sh
semantic-edit read-symbol --file path/to/file.ts --selector Service.run
```

Legacy selectors still work for older commands:

```sh
semantic-edit list-symbols --file path/to/file.ts
semantic-edit show-node --file path/to/file.ts --selector function:run
```

Rename one identifier inside a selected node:

```sh
semantic-edit rename-identifier-in-node --file path/to/file.ts --selector function:run --old userId --new accountId
```

Scope-correct rename at one coordinate:

```sh
semantic-edit rename-symbol --file path/to/file.ts --line 12 --column 18 --new accountId --dry-run
```

Project-wide TypeScript language-service rename:

```sh
semantic-edit rename-symbol-cross-file --file path/to/file.ts --line 12 --column 18 --new accountId --repo-root "$PWD" --dry-run
```

Replace a literal by AST match:

```sh
semantic-edit replace-literal --file path/to/file.ts --current "'5511999999999'" --new "null" --dry-run
```

Replace, insert after, or remove a named symbol:

```sh
semantic-edit edit-symbol --file path/to/file.ts --selector Service.run --op replace --text-file /tmp/new-run.ts --dry-run
semantic-edit edit-symbol --file path/to/file.ts --selector obsoleteHelper --op remove
```

Change one object property value inside a selected node:

```sh
semantic-edit replace-object-property-value --file path/to/file.ts --selector function:run --property phone --value null
```

Add or remove named imports:

```sh
semantic-edit add-named-import --file path/to/file.ts --module ./service --name AccountService
semantic-edit remove-named-import --file path/to/file.ts --module ./service --name OldService
```

Use `--sha256 <hash>` and `--dry-run` when concurrency risk is high.
For multiline replacements, prefer `--text-file`; shell-escaped `\n` text is easy to get wrong.

Replace one exact occurrence:

```sh
atomic-edit.mjs replace-occurrence --file path/to/file.ts --old "'5511999999999'" --new "null" --expected-count 1
```

Replace a coordinate range:

```sh
atomic-edit.mjs replace-range --file path/to/file.ts --start 12:18 --end 12:33 --text "null" --expect "'5511999999999'"
```

Insert at a coordinate:

```sh
atomic-edit.mjs insert-at --file path/to/file.ts --pos 8:1 --text "import { X } from './x';\n"
```

Dry run before writing:

```sh
atomic-edit.mjs replace-occurrence --file path/to/file.ts --old "foo" --new "bar" --expected-count 1 --dry-run
```

Use `--sha256 <hash>` when the file may be changing concurrently. The tool refuses to write if the current file hash differs.

## Validated Evidence

On 2026-05-15 this layer was validated in `/Users/danielpenin/whatsapp_saas`
against real repo code:

- MCP implementation smoke: `43 passed, 0 failed`.
- Production-path self-edit: launcher -> MCP stdio -> `atomic_replace_literal`
  changed the server version from `"1.0.0"` to `"3.0.0"`; post-edit strict
  typecheck and smoke still passed.
- Concurrency guard: stale `sha256` write was refused before writing.
- Controlled A/B benchmark: atomic validation refused 4/4 deliberately
  syntax-breaking edits before disk; the line-oriented no-prewrite-validation
  model would write 4/4. Common sub-line edits used about `1.2x-3.6x` less
  output surface; symbol/block edits can be much larger.
- Real workspace use: `outline`, `read-symbol`, `edit-symbol`, and
  `replace-occurrence` reduced navigation and edit surface while fixing the
  orphan classifier to prefer `PULSE_SCOPE_ENGINE_STATE.json`.
- Global Codex smoke script:
  `/Users/danielpenin/.codex/skills/atomic-code-editing/scripts/smoke-atomic-code-editing.mjs`.
  It validates the standalone Codex CLIs outside the repo MCP path:
  `outline`, `read-symbol`, `replace-literal`, object property replacement,
  add/remove import, `edit-symbol`, local rename, cross-file rename,
  occurrence replacement, and stale `sha256` refusal.

Evidence level: N3. It proves local operational function and mechanical
efficiency on real code, but not a statistical Pass@1 benchmark or N4+ user
adoption proof.

## Output

The tool emits JSON with:

- `changed`
- `beforeHash`
- `afterHash`
- range/position metadata
- replacement counts

It does not print full file contents except `show-range`.

## Validation

After using atomic edits:

1. Run the smallest focused test/typecheck.
2. Inspect `git diff --word-diff` or a focused `git diff -- <file>` if the edit was risky.
3. If the operation changed more than intended, repair forward; do not use destructive git restore.

## Boundary

This is an operational precision layer, not permission escalation. It must not be used to edit protected repository governance files or bypass review gates.
