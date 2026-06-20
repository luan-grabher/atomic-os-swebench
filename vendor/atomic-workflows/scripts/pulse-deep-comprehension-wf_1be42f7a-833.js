export const meta = {
  name: 'pulse-deep-comprehension',
  description: 'Read the 106K-LOC PULSE to understand its gate-less universal reality-verification concept before deciding what the atomic should absorb',
  phases: [{ title: 'Read PULSE' }, { title: 'Synthesize' }],
}

const ROOT = '/Users/danielpenin/whatsapp_saas/scripts/pulse'
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    area: { type: 'string' },
    whatItDoes_plain: { type: 'string', description: 'plain language, no jargon — what reality-gap does this part catch?' },
    gateless_mechanism: { type: 'string', description: 'CRITICAL: how does it verify WITHOUT the project having tests/types/build/lint? What does it build/read from raw source to substitute for gates?' },
    is_sound: { type: 'string', description: 'does the mechanism actually work / is it principled, or aspirational scaffolding? evidence.' },
    universality: { type: 'string', enum: ['universal-core', 'stack-coupled-but-portable', 'whatsapp-hardcoded', 'dead-scaffolding', 'active-automation-not-verification'] },
    value_for_atomic: { type: 'string', enum: ['essential', 'useful', 'skip'] },
    loc_approx: { type: 'number' },
    key_files: { type: 'array', items: { type: 'string' } },
  },
  required: ['area', 'whatItDoes_plain', 'gateless_mechanism', 'is_sound', 'universality', 'value_for_atomic', 'loc_approx', 'key_files'],
}

const SLICES = [
  { key: 'detection-core', prompt: `Read the DETECTION CORE of PULSE in ${ROOT}: detectors/*, scanners, source-resolution, and the no-hardcoded-reality-audit concept. The central question: HOW does it detect fake/stub/disconnected code (fake data, dead handlers, dead API calls, empty returns, stub pages) WITHOUT relying on the project having any tests/types/build/lint? What does it read or build from raw source to know what "real" means? Be concrete about the actual technique.` },
  { key: 'code-graph', prompt: `Read the CODE-UNDERSTANDING layer of PULSE in ${ROOT}: ast-graph/*, behavior-graph/*, any AST/parsing/call-graph/data-flow/route-map builder. How does PULSE construct its OWN model of arbitrary code (who calls what, what connects to what, frontend->backend wiring) from raw source — WITHOUT LSP or the project's types? Is this the universal substitute for gates? How general is it across languages/stacks?` },
  { key: 'reality-intention', prompt: `Read how PULSE defines "real / done / wired-to-reality" and measures the gap to INTENTION in ${ROOT}: capability-model*, authority-engine, audit-chain, artifact-registry, behavior-graph. How does it decide whether built code actually realizes the intended product behavior (vs just compiling)? What is its notion of "intention" and how does it compare reality to it?` },
  { key: 'autonomy-vs-verify', prompt: `Read the AUTONOMY/EXECUTION parts of PULSE in ${ROOT}: autonomy-loop*, actors, autonomous-executor*, api-fuzzer, browser-stress-tester, authority. Classify: is each part VERIFICATION (judging if code is real) or ACTIVE AUTOMATION (driving an agent / running fuzzers / stress)? Which parts are genuinely used vs dead/aspirational scaffolding? This determines what a verifier needs vs what is a separate platform.` },
  { key: 'composition-scale', prompt: `Read the ENTRY + COMPOSITION of PULSE in ${ROOT}: index.ts, __kernel_additions__, report*, adapters, package-discovery, artifacts*. How do the 544 files compose into a run? Is the 106K LOC justified architecture or accumulated bloat? What is the MINIMAL universal kernel that delivers the core "is this real?" verdict — i.e., if you kept only the essential 10%, which files/mechanisms?` },
  { key: 'universality-audit', prompt: `Across all of ${ROOT}, audit universality honestly: how much is genuinely stack-agnostic vs hardcoded to whatsapp_saas (NestJS/Next/Prisma/specific routes)? grep for the coupling. The decision question: is PULSE's CONCEPT (gate-less universal reality verification) sound and portable into a self-contained MCP that any dev installs — and what is the honest effort to make it so? Or is the universal version a fundamentally smaller/different thing?` },
]

phase('Read PULSE')
const slices = await parallel(
  SLICES.map((s) => () =>
    agent(s.prompt + `\n\nRead the ACTUAL files. Plain language, no jargon. Be concrete about the real mechanism. Return the schema.`, {
      label: `pulse:${s.key}`,
      phase: 'Read PULSE',
      schema: SCHEMA,
      agentType: 'Explore',
    }).then((r) => ({ slice: s.key, ...r }))
  )
)

phase('Synthesize')
const synthesis = await agent(
  `You are synthesizing a deep read of PULSE (a 106K-LOC, 544-file gate-less universal code-reality-verification system) to decide what a portable atomic-edit MCP should absorb. Here are 6 slice analyses:\n\n${JSON.stringify(slices.filter(Boolean), null, 2)}\n\nProduce a grounded, plain-language synthesis answering: (1) In ONE paragraph, what IS PULSE actually doing and what is the core gate-less mechanism (how does it know "real" without the project having any tooling)? (2) Is that concept SOUND and worth preserving? (3) Is the 106K LOC justified, or what fraction is the essential universal kernel vs bloat/dead/stack-coupled/active-automation? (4) The honest verdict: should the atomic ABSORB PULSE's universal verification kernel (and roughly how big/hard), keeping it gate-less and portable — yes or no, and the concrete shape of what to build. Be brutally honest, no jargon, no over-sophistication.`,
  { label: 'synthesize', phase: 'Synthesize' },
)

return { slices: slices.filter(Boolean), synthesis }
