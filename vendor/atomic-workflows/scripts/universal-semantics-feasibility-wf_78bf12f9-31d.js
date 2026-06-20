export const meta = {
  name: 'universal-semantics-feasibility',
  description: 'Can the tree-sitter/PI universality generalize to type-aware (LSP) coverage across 75+ langs? Ground in code + research + adversarially verify before correcting the owner.',
  phases: [
    { title: 'Ground', detail: 'read atomic perception + lsp-mesh + doctrine in THIS repo' },
    { title: 'Research', detail: 'tree-sitter vs LSP boundary, stack-graphs, LS availability, prior art' },
    { title: 'Verify', detail: 'adversarially refute each core claim' },
    { title: 'Synthesize', detail: 'verdict + absorption design + honest universality ceiling' },
  ],
}

const GROUND_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    component: { type: 'string' },
    mechanism: { type: 'string', description: 'concretely how it works' },
    syntacticOrSemantic: { type: 'string', enum: ['syntactic', 'semantic', 'both', 'n/a'] },
    languagesCovered: { type: 'string' },
    opsOrFacts: { type: 'array', items: { type: 'string' } },
    keyFilesRead: { type: 'array', items: { type: 'string' } },
    verbatimQuotes: { type: 'array', items: { type: 'string' }, description: 'short evidence quotes from code/docs' },
    bottomLine: { type: 'string' },
  },
  required: ['component', 'mechanism', 'syntacticOrSemantic', 'bottomLine'],
}

const RESEARCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    question: { type: 'string' },
    answer: { type: 'string' },
    keyFacts: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['question', 'answer', 'keyFacts', 'confidence'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['supported', 'refuted', 'partial'] },
    reasoning: { type: 'string' },
    counterexampleOrCaveat: { type: 'string' },
  },
  required: ['claim', 'verdict', 'reasoning'],
}

const REPO = '/Users/danielpenin/whatsapp_saas'

// ---------- Phase 1+2: Ground (code) + Research (web), one barrier ----------
phase('Ground')
const groundThunks = [
  () => agent(
    `GROUND the atomic MCP's perception organ. Read these files in ${REPO}: `
    + `scripts/mcp/atomic-edit/native-bridge.ts (esp. the astNodes function), `
    + `scripts/mcp/atomic-edit/gates/perception.ts, `
    + `scripts/mcp/atomic-edit/server-tools-native.ts. `
    + `QUESTION: what facts does atomic perception extract? Is it purely SYNTACTIC (tree-sitter concrete-syntax-tree: node type, text, byte spans, identifiers, import specifiers) or does it carry SEMANTIC/TYPE information (resolved types, cross-file symbol resolution, name binding across modules)? `
    + `Confirm precisely whether perception can answer "what is the TYPE of x" or "where is symbol foo DEFINED across files resolving imports". Quote the actual node fields it returns.`,
    { label: 'ground:atomic-perception', phase: 'Ground', schema: GROUND_SCHEMA },
  ),
  () => agent(
    `GROUND lsp-mesh. Read ${REPO}/tools/lsp-mesh/lsp-router.mjs in full. `
    + `QUESTION: by what MECHANISM does it provide type-aware operations? Does it SPAWN/DELEGATE to real language servers (tsserver, gopls, rust-analyzer, pyright, ...) and speak the LSP JSON-RPC protocol, or does it compute semantics itself? `
    + `How many language servers / workspaces does it wire? Which LSP ops does it expose (definition, references, hover, rename, diagnostics, symbols, completion, code_actions)? `
    + `Where does its "universality" come from — the uniform LSP protocol, or per-language code? Quote the spawn/config table.`,
    { label: 'ground:lsp-mesh', phase: 'Ground', schema: GROUND_SCHEMA },
  ),
  () => agent(
    `GROUND the atomic DOCTRINE on pluggable perception. Search ${REPO} and the user's memory dir `
    + `/Users/danielpenin/.claude/projects/-Users-danielpenin-whatsapp-saas/memory/ for any statement that perception should be PLUGGABLE with multiple backends (tree-sitter AND LSP) under the firewall. `
    + `Specifically check memory files mentioning 'universal_terminal_runtime', 'mutation_firewall', 'omnipresence', and any doctrine that says "OPTIONAL pluggable perception (tree-sitter/LSP, text fallback)" or that semantic ops compile down to a core. `
    + `Also grep scripts/mcp/atomic-edit/ for any TODO/comment about LSP or semantic perception. QUESTION: does the existing atomic doctrine ALREADY contemplate LSP-as-a-delegated-perception-backend? Quote it verbatim.`,
    { label: 'ground:doctrine', phase: 'Ground', schema: GROUND_SCHEMA },
  ),
  () => agent(
    `GROUND what the "PI extraction" actually gave atomic. Read ${REPO}/scripts/mcp/atomic-edit/native-bridge.ts and the memory file `
    + `/Users/danielpenin/.claude/projects/-Users-danielpenin-whatsapp-saas/memory/project_atomic_universal_engine_delivered.md. `
    + `QUESTION: when atomic "became universal across 75+ languages" via web-tree-sitter / pi-natives, what LAYER of capability did that add — universal PARSING (grammars → concrete syntax trees) or universal TYPE-RESOLUTION (semantic analysis)? `
    + `Confirm whether tree-sitter grammars carry any type/binding information. Quote the relevant memory + code.`,
    { label: 'ground:pi-migration', phase: 'Ground', schema: GROUND_SCHEMA },
  ),
]

phase('Research')
const researchThunks = [
  () => agent(
    `RESEARCH the computer-science boundary between tree-sitter and LSP. `
    + `Can a tree-sitter parse tree (concrete syntax tree) ALONE yield: (a) the resolved TYPE of an expression, (b) cross-file go-to-definition that resolves through imports/modules/inheritance, (c) type-aware find-all-references? `
    + `Explain WHY (parsing/syntax vs name-resolution + type-inference/semantic analysis — different compiler phases). Be authoritative and cite tree-sitter's own docs on what it does and does NOT do.`,
    { label: 'research:ts-vs-lsp', phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `RESEARCH GitHub stack-graphs and the older scope-graphs (Eelco Visser et al). `
    + `These build code NAVIGATION (go-to-definition, find-references) ON TOP of tree-sitter using declarative per-language scope rules (.tsg tree-sitter-graph files), WITHOUT running a full language server. `
    + `QUESTIONS: (1) what navigation ops do they provide? (2) do they provide full TYPE information / type-checking, or only NAME BINDING (definition/references)? (3) what's the per-language cost (writing a scope-rules file per language)? (4) how many languages does GitHub's precise-code-nav actually support this way? `
    + `This determines whether "universal navigation" is achievable without per-language language servers.`,
    { label: 'research:stack-graphs', phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `RESEARCH language-server AVAILABILITY. tree-sitter has grammars for ~75-100+ languages. `
    + `Of those, how many have a PRODUCTION-QUALITY LSP server that provides type-aware hover/definition/references/diagnostics (e.g. tsserver, gopls, rust-analyzer, pyright/pylsp, jdtls, clangd, OmniSharp, sourcekit-lsp, solargraph, ...)? `
    + `Give a realistic count and note that many tree-sitter-supported languages (obscure DSLs, config langs, query langs) have NO type-aware server at all. `
    + `GOAL: bound the feasibility of "type-aware semantics in 75+ languages" — is it gated by language-server existence/installation rather than by writing one grammar?`,
    { label: 'research:ls-availability', phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `RESEARCH prior art for UNIFYING syntactic + semantic code intelligence under one interface. `
    + `Cover: SCIP / LSIF (Sourcegraph), Kythe, Glean (Meta), ast-grep, multiplexed-LSP clients, and how mature universal code-intelligence systems combine a fast universal syntactic layer (tree-sitter) with delegated/precomputed semantic layers (LSP servers or semantic indexers). `
    + `QUESTION: what is the accepted ARCHITECTURE for "universal semantic coverage"? Is it (a) one magic universal analyzer, or (b) a tree-sitter syntactic core + delegation to per-language semantic providers (LSP) + optional scope-graph navigation? Give the consensus pattern.`,
    { label: 'research:prior-art', phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
]

const grounded = (await parallel([...groundThunks, ...researchThunks])).filter(Boolean)
const digest = grounded
  .map((g) => `### ${g.component || g.question}\n${g.bottomLine || g.answer}\n` + ((g.keyFacts || g.verbatimQuotes || []).map((k) => `- ${k}`).join('\n')))
  .join('\n\n')
log(`Grounded ${grounded.length}/8 strands. Verifying core claims adversarially.`)

// ---------- Phase 3: Adversarial verify of the core claims ----------
phase('Verify')
const CLAIMS = [
  'The tree-sitter / PI universality that made atomic act on 75+ languages is SYNTACTIC universality (parsing → concrete syntax trees). It cannot, by itself, provide semantic TYPE resolution or cross-file definition resolution, because those are a different compiler phase (name resolution + type inference), and a syntax tree carries no type/binding information.',
  'Full TYPE-AWARE coverage across 75+ languages is NOT achievable the same cheap way as parsing (one grammar per language). Type-awareness is gated by the EXISTENCE and installation of a real language server per language, which realistically exists for only ~15-30 mainstream languages — not 75+.',
  'The correct generalization that honors the user\'s instinct is to ABSORB LSP-delegation into the atomic MCP as a pluggable SEMANTIC perception backend (spawn the real language server on demand, speak uniform LSP) running ALONGSIDE the tree-sitter SYNTACTIC backend, both behind the atomic mutation firewall. This is what makes lsp-mesh-as-a-separate-MCP genuinely redundant/deletable — by ownership, not by replacing type-resolution with syntax.',
  'stack-graphs (tree-sitter scope rules) can give UNIVERSAL-ish go-to-definition and find-references (the NAME-BINDING/navigation subset of LSP) without a language server, but does NOT provide full type information — so it narrows, but does not close, the gap.',
]
const LENSES = ['compiler-theory (parsing vs semantic analysis)', 'practical-tooling (what actually ships in editors/Sourcegraph/GitHub)', 'steelman-the-user (try hardest to make the tree-sitter-generalizes-to-types claim TRUE)']
const verdicts = await parallel(
  CLAIMS.map((claim) => () =>
    parallel(
      LENSES.map((lens) => () =>
        agent(
          `Through the ${lens} lens, try HARD to REFUTE this claim. If you cannot refute it, say supported; if it is only conditionally true, say partial and state the condition. `
          + `Be rigorous and concrete; cite mechanisms, not vibes.\n\nCLAIM:\n${claim}\n\nGrounded evidence available:\n${digest}`,
          { label: `verify:${lens.slice(0, 14)}`, phase: 'Verify', schema: VERDICT_SCHEMA },
        ),
      ),
    ).then((vs) => {
      const v = vs.filter(Boolean)
      const refuted = v.filter((x) => x.verdict === 'refuted').length
      const partial = v.filter((x) => x.verdict === 'partial').length
      return { claim, lensVerdicts: v, refuted, partial, supported: v.length - refuted - partial, net: refuted >= 2 ? 'REFUTED' : partial >= 2 ? 'PARTIAL' : 'SUPPORTED' }
    }),
  ),
)

// ---------- Phase 4: Synthesize ----------
phase('Synthesize')
const memo = await agent(
  `You are writing the final technical memo for the repo owner (Daniel), who proposed: "the same PI/tree-sitter solution that made atomic universal across 75+ languages should also solve the lsp-mesh residual (type-aware definition/hover/references) and reach 75+ language type coverage." `
  + `Write a precise, honest memo (markdown, PT-BR, concise but complete) that:\n`
  + `1. CORRECTS the premise exactly where it breaks: distinguish SYNTACTIC universality (tree-sitter/PI — what atomic HAS, ~75 langs via grammars) from SEMANTIC/type universality (LSP — a different compiler phase). Explain the boundary in one tight paragraph.\n`
  + `2. HONORS the instinct: the generalization IS possible, but the right mechanism is ABSORBING LSP-delegation into atomic as a pluggable semantic perception backend (alongside tree-sitter), under the firewall — not replacing types with syntax. Note the atomic doctrine already anticipates pluggable tree-sitter/LSP perception (quote it if grounded found it).\n`
  + `3. Gives the HONEST universality ceiling as a 3-layer table: (a) SYNTAX/parse — ~75+ langs NOW; (b) NAVIGATION def/refs via stack-graphs — universal-ish with per-lang scope rules, no types; (c) TYPE-AWARE hover/diagnostics/type-refactor via LSP delegation — bounded by language-server availability (~15-30 real langs, NOT 75).\n`
  + `4. States the consequence for DELETING lsp-mesh: it becomes deletable only AFTER atomic absorbs the LSP-delegation backend; until then its type-aware capability is a real (bounded) residual. Give the concrete absorption design (perception interface with two backends: syntactic=tree-sitter in-process, semantic=spawn LSP per language, both emitting facts the gates consume; firewall unchanged).\n`
  + `5. Flags any claim the adversarial pass marked REFUTED or PARTIAL and adjusts honestly.\n\n`
  + `GROUNDED EVIDENCE:\n${digest}\n\nADVERSARIAL VERDICTS:\n${verdicts.map((v) => `- [${v.net}] ${v.claim.slice(0, 90)}... (refuted ${v.refuted}/partial ${v.partial})${v.lensVerdicts.map((l) => `\n    · ${l.verdict}: ${l.reasoning.slice(0, 160)}`).join('')}`).join('\n')}`,
  { label: 'synthesize:memo', phase: 'Synthesize' },
)

return { memo, claimNetVerdicts: verdicts.map((v) => ({ net: v.net, claim: v.claim.slice(0, 120), refuted: v.refuted, partial: v.partial })) }
