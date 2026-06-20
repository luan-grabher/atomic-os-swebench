export const meta = {
  name: 'atomic-11lang-parity-map',
  description: 'Exhaustive plan to bring every TS-only atomic tool to full coverage across all 11 tree-sitter languages',
  phases: [
    { title: 'Map', detail: 'classify tools, per-op per-language universalization approach, precision honesty' },
    { title: 'Plan', detail: 'ranked self-extension plan + template + proof method' },
  ],
}
const SRC = `${args.src}`
const LANGS = 'Python, JavaScript, TypeScript(+TSX), Go, Ruby, Rust, Java, C, C++, Bash, JSON'

const F = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'findings', 'notes'],
  properties: {
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' }, description: 'concrete items with file:line' },
    notes: { type: 'array', items: { type: 'string' } },
  },
}

const finders = [
  { key: 'classify', prompt:
    `In ${SRC}, enumerate EVERY registered atomic tool (grep registerTool across server-tools-*.ts) and classify each into: (A) ALREADY-UNIVERSAL — works on all 11 langs (${LANGS}) via tree-sitter/text (e.g. atomic_rename_symbol_universal, atomic_replace_literal_universal, the property-key/value universal ops, ast_search/edit/rewrite, grep, outline, byte/anchor/range edits); (B) TS-ONLY — refuses or degrades for non-TS via ts-morph (find the TS_EXT.has gate + the "only supports TS/JS" throw, file:line); (C) byte-level — works on any file already. For every (B) tool, name the engine function it calls + the exact refuse line. Output the definitive (B) list — the gap to close.` },
  { key: 'universalize', prompt:
    `In ${SRC}, the engine already has a universalization PATTERN in engine-universal.ts (universalReplaceLiteral/PropertyValue/RenamePropertyKey) + engine-complete-decorators.ts (renameSymbolCrossFileUniversal) — read them as the template. For EACH TS-only semantic op that still lacks an 11-language version — change_signature, edit_symbol, add_import, remove_import, add_decorator, add_await_to_call (confirm which already have a *_universal variant and which DON'T) — specify the tree-sitter universalization for EACH of the 11 langs (${LANGS}): (1) is the op semantically meaningful in that lang? (decorators: TS/Python/Java-annotations only; await: JS/TS/Python/Rust/C#; imports: every lang but DIFFERENT syntax — give the exact import statement form per lang; signatures: all); (2) the tree-sitter node types to target; (3) the insertion/edit rule. Be concrete and per-language. Use native-bridge astNodes() for AST access.` },
  { key: 'precision', prompt:
    `In ${SRC}, assess HONESTLY where a tree-sitter scope-only universalization (no type resolution, unlike ts-morph) gives WRONG or incomplete results, per op: shadowed names, overloads, re-exports, cross-file references, dynamic dispatch. For rename/change_signature especially: without a type checker, which cases can a scope-aware tree-sitter pass still get 100% right (single-file local symbols, unique names) vs which are best-effort (cross-file, shadowed, overloaded)? Recommend, per op, whether to: ship scope-aware-universal (good enough + documented limits), require single-file scope, or gate behind an optional per-language LSP (gopls/pyright/rust-analyzer/jdtls/clangd) via the existing atomic_apply_workspace_edit. Goal: an HONEST definition of "100% for 11" we can actually deliver + prove.` },
]

const map = await parallel(finders.map((f) => () => agent(f.prompt, { label: `map:${f.key}`, phase: 'Map', schema: F }).then((r) => ({ key: f.key, ...r }))))

const plan = await agent(
  `Synthesize the definitive plan to make atomic-os deliver "100% of everything across all 11 languages" (${LANGS}). Inputs:\n${JSON.stringify(map.filter(Boolean), null, 2)}\n\n` +
  `Produce: (1) HONEST DEFINITION of "100% for 11" given no type-checker (what's truly achievable via tree-sitter scope + documented limits vs what needs LSP). (2) The EXACT gap = the list of TS-only ops lacking an 11-lang version. (3) RANKED self-extension queue: each item = {op, target file in ${SRC} (extend engine-universal.ts or a new engine module + register a *_universal tool or relax the existing tool's gate), the per-language coverage (which of 11 + syntax), size S/M/L, and how to PROVE it (a smoke fixture per language)}. (4) The TEMPLATE to follow (mirror universalReplaceLiteral). (5) The single best FIRST op to universalize (highest value, cleanest, most languages meaningful). Be concrete with file paths. This drives an iterative self-extension marathon — order it so each step ships + proves independently.`,
  { label: 'plan', phase: 'Plan' },
)

return { map: map.filter(Boolean), plan }
