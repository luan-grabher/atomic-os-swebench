# atomic-edit MCP server (v4)

Closes the **Line-Oriented Action Bottleneck**: built-in coding-agent editors
operate at line/block/hunk granularity, so microscopic intentions become
macroscopic patches — noise, artificial conflicts, drift, blind edits, review
cost. This server adds a **structured action space** (read + atomic edit) as
first-class MCP tools, loaded every session via `.mcp.json`. The model is
unchanged; the *system's* action space is upgraded at exactly the layer the
research identifies as defective.

## Grounding in the literature

| Source | Lesson applied here |
|---|---|
| **CodeStruct** (Amazon, arXiv 2604.05407) | `readCode`/`editCode` over named AST entities. Ablation: removing the READ primitive costs −7.8pp Pass@1 and 7.8× more brittle `str_replace`; removing structured edit costs +38.7%. → `code_browse/outline/read_symbol` + `atomic_edit_symbol`. |
| **To Diff or Not to Diff?** (arXiv 2604.27296) | Block-level rewrites of syntactically coherent units beat fragile offsets. → symbol-scoped replace/insert/remove. |
| **Aider edit-format study** | Edit format materially changes model output (lazy-coding 3×, pass 26%→61%). → strict pre-write validation + preview. |
| **Diff-XYZ / Kiro** | Fragile line offsets bad; semantic rename must come from the language service, not LLM text guessing. → `atomic_rename_symbol_cross_file` via tsconfig. |

## Tools (123)

**Read (address by name, not line guess):**
- `code_browse` — structured directory listing
- `code_outline` — file → signature map (no bodies; token-cheap)
- `code_read_symbol` — scoped selector → full unit + exact range. Now supports
  **sub-expression selectors** (`"Container.expr"` syntax) resolving variables,
  parameters, properties within function/class bodies.

**Edit (every mutating op: syntax-regression check → atomic write; `preview:true` = dry-run diff; optional `expectedSha256` = optimistic-concurrency guard):**
- **`atomic_replace_text`** — verbatim `oldText`→`newText`, built-in `edit` ergonomics (no coordinates) + full validation.
- `atomic_replace_range` / `atomic_insert_at` / `atomic_delete_range`
- `atomic_apply_edits` — LSP `TextEdit[]`, N sites = one all-or-nothing intention
- `atomic_replace_literal` — swap a literal selected via the AST, by value
- `atomic_edit_symbol` — `replace` | `insert_after` | `remove` a named AST entity
- `atomic_rename_symbol` — scope-correct rename, single file
- `atomic_rename_symbol_cross_file` — project-wide scope-correct rename (tsconfig language service), all-or-nothing
- `atomic_add_import` / `atomic_remove_import` — named imports, deduped, comma-safe
- `atomic_replace_property_value` — replace an object property's value
- `atomic_ast_search` / `atomic_ast_edit` / `atomic_ast_rewrite` — structural search/edit across all languages (web-tree-sitter)
- `atomic_apply_workspace_edit` — apply LSP WorkspaceEdits through the firewall

**Product-oriented operating layer:**
- `product_intent_contract` — plain-language goal -> named integration, risk, acceptance criteria, proof plan, next action
- `zero_code_trust_score` — computes trust tier from evidence mix
- `behavior_receipt` — founder-facing "what changed / where to test / what was proven"
- `truth_receipt` — anti-facade classifier: `REAL`, `PARTIAL`, `STUB`, `MOCK_ONLY`, `EXTERNAL_BLOCKED`, `UNPROVEN`, `BROKEN`
- `continuity_status` — reads progress/workboard/PULSE/runtime evidence/locks

**Coordination & execution:**
- `atomic_lock_acquire` / `atomic_lock_status` / `atomic_lock_release` — POSIX `mkdir` front locks + optional Redis-backed distributed locks
- `atomic_exec` — sandboxed command execution with `proveEffect`, byte-level diff, rollback
- `atomic_agent_*` — governed agent loop (plan → investigate → propose → validate → commit → verify)
- `atomic_prove` — gate-sourced truth: runtime probe → dynamic gate set → forged gateRunId
- `atomic_seal` — tamper-evident cryptographic receipt envelope

**Tier C (external effects):**
- `network-proxy.ts` — HTTP recorder/replayer for deterministic testing of external API calls. Record mode captures all outbound HTTP during `atomic_exec` runs; replay mode returns recorded responses deterministically.

## Guarantees the blunt editors do not give

1. **No syntax regression** — TS/JS/JSON reparsed before write; an edit that
   *introduces* a new syntax error is refused (pre-existing errors tolerated:
   surgical, never "make it worse").
2. **Atomic durable write** — temp + `fsync` + `rename`; no torn files.
3. **All-or-nothing** for batched edits and cross-file rename.
4. **Preview** — dry-run any mutation, get the validated diff, write nothing.
5. **Repo containment** + **governance guard** — paths escaping the repo, or
   files protected in `CLAUDE.md`, are hard-refused (adds safety vs. builtins).
6. **Expansion-Factor metric** — `intentionChars` vs `lineRewriteSurfaceChars`
   reported, making the thesis measurable at runtime.

## Verify (real evidence)

```sh
node scripts/mcp/atomic-edit/smoke.mjs
# current local evidence (2026-06-20): 47 passed, 0 failed
# engine + live MCP stdio round-trip + preview dry-run
#   + cross-file rename via real tsconfig + sha256 concurrency guard
#   + import/property ops + governance-guard refusal

node scripts/mcp/atomic-edit/audit-atomicity.mjs --json
# pass=true, atomic_edit_ratio=1, fallback_rate=0, coarse_unjustified=0

node scripts/mcp/atomic-edit/gates/mcp-tool-list-compact.proof.mjs --json
# live list_tools evidence: 123 tools, compact schemas, no nested schema descriptions

node scripts/mcp/atomic-edit/gates/lattice-completeness.proof.ts --json
# machine-readable coverage of 10 failure dimensions plus non-empty proof inventory

node scripts/mcp/atomic-edit/gates/vitest-package-suite.proof.mjs --json
# package-level Vitest suite evidence via npm test -- --run

node scripts/mcp/atomic-edit/gates/multilang-supply-chain-resolver.proof.mjs --json
# Java/Python bare import extraction and supply-chain resolver evidence

node scripts/mcp/atomic-edit/gates/doc-honesty.proof.mjs --json
# README tool/smoke/gate inventory stays synchronized with live MCP and filesystem evidence

node scripts/mcp/atomic-edit/engine-subexpr.test.js
# sub-expression selector tests (Container.expr syntax)

python3 .z3-scratch/confluence.py
# Z3 theorem: ALL GREEN — confluence-mod-(semantic-read-set) machine-checked

node .z3-scratch/refinement.mjs
# cross-file runtime==model refinement check
```

## Runtime

No tsx / no npx / no network. The launcher compiles the server graph once to
`dist/` with the already-installed `typescript` (`build.mjs`) and runs plain
`node dist/server.js` (sub-second cold start). It self-rebuilds **only** when a
source `.ts` is newer than `dist/server.js`, so it always reflects the latest
source with no manual build step. `dist/` is gitignored (regenerable).

## Activation across sessions & tools

- **Codex CLI:** registered globally in `~/.codex/config.toml` as
  `[mcp_servers.atomic-edit]`, pointing at
  `scripts/mcp/atomic-edit-mcp-launcher.sh`.
- **Claude Code:** registered in `.mcp.json` as `atomic-edit` (committed). New
  project MCP server needs one-time trust approval on next session start.
- **OpenCode (all agents + subagents):** registered in project `opencode.json`
  and global `~/.config/opencode/opencode.json`; the operating rule is in
  global `~/.config/opencode/AGENTS.md` and the `instructions` key, so every
  CLI model run via OpenCode (incl. the fleet's `opencode run` subagents)
  loads the tools and the prefer-atomic standard automatically. Verified:
  `opencode mcp list` → `✓ atomic-edit connected`.

Operating guidance: `docs/ai/ATOMIC_EDIT_OPERATING_GUIDE.md`.

## Honest scope

- **Multi-language validation:** 29 languages via tree-sitter WASM (Python, JavaScript, TypeScript, TSX, Go, Ruby, Rust, Java, C, C++, Bash, JSON, HTML, CSS, PHP, Kotlin, Swift, C#, Scala, Lua, Dart, Elixir, Haskell, GraphQL, Proto, Zig, Toml, SQL, YAML) plus native tool validators (python3, go vet, rustc, ruby -c, shellcheck) and SQL via pg-query-emscripten. Validation falls back through three tiers: native tool → WASM tree-sitter → structural balance. Confirm live with `atomic_native_status`.
- **Sub-expression selectors:** `code_read_symbol` now resolves `"Container.expr"` syntax (e.g. `"login.user"` → the `user` parameter inside `login`). Works for TS/JS via ts-morph AST traversal; non-TS files use tree-sitter.
- **Named declarations:** selector-based AST replacement covers named declarations (function/class/method/interface/type/var) in all grammar-backed languages.
- Cross-file rename requires a reachable `tsconfig.json`; falls back to a directory-scoped project if none is found.
- **Z3 formal verification:** the edit algebra's confluence theorem is machine-checked by Z3 (`formal/atomic-algebra/confluence_z3.py` + `nway_induction_z3.py`) and Lean 4 (`formal/atomic-algebra/NwayConfluence.lean`). Refinement proof cross-checks runtime against the model.
- **256 proof entrypoints** and **322 total gate files** under `gates/` covering exec sandbox, atomic writes, bypass honesty, connection byte-floor, snapshot ceilings, formal model lifts, public package tests, multi-language supply-chain resolution, doc honesty, multi-install drift, source-tree hygiene, self-application admission, observer-path-drift, cognitive emergence, and more.
- Product-layer tools do not magically finish integrations. They force every CLI using this MCP to name the product behavior, reject facade/stub claims, demand runtime/API/DB/browser evidence, emit a no-code receipt, and resume from repository state.
