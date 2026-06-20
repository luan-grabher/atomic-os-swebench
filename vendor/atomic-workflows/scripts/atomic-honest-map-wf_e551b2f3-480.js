export const meta = {
  name: 'atomic-honest-map',
  description: 'Read-only: authoritative 14-item status + integration signatures for the generative-loop build',
  phases: [
    { title: 'Audit' },
    { title: 'IntegrationMap' },
  ],
}

const ROOT = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const STATUS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'claim', 'status', 'evidence'],
        properties: {
          id: { type: 'string', description: 'e.g. "#2" or "#11"' },
          claim: { type: 'string', description: 'what the item asked for, one line' },
          status: { type: 'string', enum: ['DONE', 'PARTIAL', 'MISSING'] },
          evidence: { type: 'string', description: 'file:line + what was actually found. Be specific. If MISSING say what grep/search you ran that returned nothing.' },
          remainingWork: { type: 'string', description: 'if PARTIAL/MISSING: the precise concrete gap. empty if DONE.' },
        },
      },
    },
  },
}

const API_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['exports', 'howToUse', 'gotchas'],
  properties: {
    exports: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'signature', 'returns'],
        properties: {
          name: { type: 'string' },
          signature: { type: 'string', description: 'exact param list as written in source' },
          returns: { type: 'string', description: 'exact return shape / type' },
        },
      },
    },
    howToUse: { type: 'string', description: 'concrete call example a new module would write, with import path' },
    gotchas: { type: 'string', description: 'anything a caller must respect: sync vs async, fail-safe behavior, file paths, env' },
  },
}

phase('Audit')
const auditP = agent(
  `Read-only audit. The working dir is ${ROOT} (a TypeScript MCP engine, flat layout, sources are *.ts, built to dist/). ` +
  `For EACH of these 14 items, determine the REAL status in the CURRENT source (not assumptions). Use grep/read. Give file:line evidence.\n` +
  `#1 atomic_exec/verify accepts npx WITHOUT shell-injection AND ideally runs sandboxed — check server-helpers-verify.ts AND server-tools-exec.ts (DEV_VALIDATION_TOOLS).\n` +
  `#2 bundler moduleResolution: .mts/.cts/index variants/js->ts rewrites in gates/contract.ts probeBase AND connection-gate.ts; does it read package.json "exports" map? does it read tsconfig allowImportingTsExtensions value?\n` +
  `#3 create_file with imports[] — atomic_create_file / atomic_multi_create accept imports[]? (server-tools-a-3.ts composeWithImports, server-tools-batch.ts)\n` +
  `#4 single create-with-imports operator.\n` +
  `#5 read+batch-edit composite operator atomic_read_and_edit — grep for it; does it exist as a registered tool?\n` +
  `#6 atomic_exec snapshot scoping via effectRoot — server-tools-exec.ts classifyCommand read-only path.\n` +
  `#7 convergence local-vs-export name collision — type-soundness-gate.ts BOUNDED_COMPILE_CONFIG_NOISE.\n` +
  `#8 convergence legit imports in replace_text — connection gate registerPendingWrites.\n` +
  `#9 atomic_affected_tests — server-tools-affected-tests.ts exists & registered?\n` +
  `#10 unified dev-validation mode — devValidationIsReadOnly / DEV_VALIDATION_TOOLS; is there a single devValidation flag?\n` +
  `#11 tsconfig paths cache — gates/contract.ts tsconfigPathsCache memoization.\n` +
  `#12 pluggable module resolver — is tsconfigPathsFor/kloelPkgRoot hardcoded or plugin-based?\n` +
  `#13 incremental proof cache — gates/registry.ts: any real caching or just a comment?\n` +
  `#14 intent->plan multi-file transaction — atomic_batch_replace_text; is there intent compilation or just literal text list?\n` +
  `Also report: do any of these files exist and what do they contain — emergence-observatory.mjs, emergence-feed.ts, gates/corpus.ts. Return one item per #.`,
  { label: 'audit:14-items', phase: 'Audit', schema: STATUS_SCHEMA }
)

phase('IntegrationMap')
const TARGETS = [
  { key: 'corpus-reader', prompt: `Read ${ROOT}/gates/corpus.ts in full. Extract: the exported functions/consts a NEW module would call to (a) locate the corpus file path (CORPUS_REL), (b) read & parse the JSONL repair/commute triples, (c) the exact field names in a repair triple (reward, redBefore, redAfter, gateWentGreen, the splice fields, file, byteStart/byteEnd, before/after) and commute triple (commute, sharedLocus). If reading is not exported, say so and give the raw record schema + path so a new module can read triples.jsonl directly.` },
  { key: 'observatory-O', prompt: `Read ${ROOT}/emergence-observatory.mjs in full. Extract the exact exported O1-O5 function names and signatures: noveltyIndex, agentNiches, wallTopologyClusters, metaLaws, anomalyResidual, verifyResidualChain (or whatever they are actually named). For metaLaws (O4) especially: what input does it take and what shape does it return (the pattern/law objects, confidence field)? This feeds a hypothesis generator that mines O4 patterns.` },
  { key: 'disproof-api', prompt: `Read ${ROOT}/server-tools-disproof.ts and ${ROOT}/gates/corpus.proof.mjs. Extract: how the disproof briefing is produced/consumed, and the proof-gate's --json contract (what JSON shape a *.proof.mjs prints, the {ok, failures, gate} convention, exit code). A new *.proof.mjs must match this exactly.` },
  { key: 'gate-registry', prompt: `Read ${ROOT}/gates/registry.ts. Extract: how gate proof files are discovered/registered, whether there is any incremental/caching layer (#13), and the exact harness convention a new gates/<name>.proof.mjs must follow to be picked up. Also: where is the count of "proof entrypoints / total gate files" computed for the doc-honesty gate?` },
  { key: 'tool-registration', prompt: `Find where atomic_* MCP tools are registered (server-tools-*.ts and the registry/index that lists them). Extract the EXACT pattern to register a NEW tool: the registration call shape, the input schema convention, and the doc-honesty constraint (README "## Tools (N)" must equal live count — where is N validated?). I need to add a tool atomic_read_and_edit. Show a minimal existing tool registration as a template.` },
  { key: 'z3-pattern', prompt: `Search ${ROOT}/gates for any existing z3/SMT usage (e.g. *.proof.mjs that shells out to z3). z3 is at /opt/homebrew/bin/z3. Extract: how an existing gate invokes z3 (spawnSync? smt2 file? stdin?), the exact pattern, so a new z3-constraint-finder.mjs can reuse it. If none exists, say so and give the minimal correct spawnSync invocation pattern for z3 -in or z3 file.smt2.` },
]
const apis = await parallel(TARGETS.map(t => () =>
  agent(t.prompt, { label: `map:${t.key}`, phase: 'IntegrationMap', schema: API_SCHEMA }).then(r => ({ key: t.key, ...r }))
))

const audit = await auditP
return { audit, apis: apis.filter(Boolean) }
