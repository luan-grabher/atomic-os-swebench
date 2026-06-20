export const meta = {
  name: 'nameless-machine-kernel-design',
  description: 'Crystallize Daniel’s nameless intention-compiler machine into a formal, buildable kernel grounded in the real atomic-edit engine',
  phases: [
    { title: 'Crystallize', detail: 'parallel: intention-model + atomic-capability-map + prior-art/ceiling' },
    { title: 'Synthesize', detail: 'unify into one kernel design + first implementable piece' },
  ],
}

const INTENTION = `
Daniel wants atomic-edit's ~233 files / ~80 tools DISSOLVED into ONE new, nameless, unprecedented machine that is
SIMULTANEOUSLY compiler + editor + writer + executor, operating byte-by-byte. Essence: it STOPS treating code as the
unit (code = disposable surface) and MATERIALIZES INTENTION. Given an intention — or a proposed code realization which
it DISSOLVES (treats as a mere hint, not law) — it extracts the complete intention and re-materializes the
byte-positive-by-construction realization CLOSEST-TO-PERFECT, which may be COMPLETELY DIFFERENT from the proposed
surface. Guarantees that must hold SIMULTANEOUSLY:
(1) NEVER materializes a non-positive byte — a byte exists only if PROVEN byte-correct-by-construction, so
    rollback/fallback/deadlock are obsolete (validate-before-materialize, not write-then-rollback);
(2) byte-level truth — every change is an explicit interval/diff/hash/proof/receipt;
(3) strong LAYERED validation — AST, types, lint, public contract, unit+integration tests, invariants, security gate,
    runtime probe, semantic diff, graph impact;
(4) self-extension only under proof, MONOTONIC — a new capability can never reduce the machine's own safety;
(5) NO-BYPASS — the agent literally cannot compute outside it;
(6) UNIVERSAL/generalist — all languages, ANY scale (unlimited positive-byte generation — huge files/edits), ANY
    context (worktrees, etc.), instantaneous (no transient bad state).
HONEST CEILING (HOLD, never fake): by Rice's theorem, "provably correct for ALL computation" cannot exist; the
defensible form is RECUSA-OU-PROVA — materialize only the byte-positive fragment it can PROVE, refuse the rest.
Daniel's own phrase "byte-positive closest-to-perfect" embraces this; the ceiling is the machine's honesty, not a wall.
`

const ENGINE = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

phase('Crystallize')

const CRYSTALLIZE = [
  {
    key: 'intention-model',
    label: 'crystallize:intention-model',
    prompt:
      'You are crystallizing a NAMELESS intention-compiler machine into a precise OPERATIONAL MODEL.\n\nINTENTION:\n' +
      INTENTION +
      '\n\nProduce a precise, formal operational model of the SINGLE unifying operation (call it `materialize`): the ' +
      'lifecycle when an agent expresses an intention (optionally with a proposed code realization the machine must ' +
      'DISSOLVE). Define each stage crisply: (a) Intent capture; (b) Dissolve (why the proposed surface is treated as ' +
      'a hint, how its semantic essence is extracted); (c) Target (the semantic locus — symbol/contract/route/type/' +
      'file/behavior, language-agnostic); (d) Precondition (world-hash / concurrency / scope); (e) Plan (the candidate ' +
      'byte-positive realization — possibly different from the proposal); (f) Validation (the layered proof set that ' +
      'must ALL pass); (g) Materialization (write ONLY if byte-positive, atomically, at any scale) OR Refusal (the ' +
      'negative bytes + why, NO write, NO rollback); (h) Receipt (proof-carrying, chained). Define byte-positive and ' +
      'byte-negative precisely. Explain WHY no rollback is needed and how "validate-before-materialize" makes it so. ' +
      'State the recusa-ou-prova ceiling explicitly and where it bites. Be concrete and implementable, not poetic.',
  },
  {
    key: 'capability-map',
    label: 'crystallize:atomic-capability-map',
    prompt:
      'You are mapping the REAL atomic-edit engine at ' +
      ENGINE +
      ' against the nameless machine below. READ the real code (server-tools-*.ts for the ~80 tools; ' +
      'server-helpers-io.ts for atomicWrite + the convergence/validate-before-write crivo; gates/ for the validator ' +
      'lattice; guard.ts for protected/no-bypass; the universal AST engine + atomic_ast_* / atomic_lens; the ' +
      'receipt/trace system truth_receipt/behavior_receipt/.atomic/traces; atomic_expand_self self-extension; ' +
      'atomic_prove/atomic_converge/product_intent_contract). For EACH facet of the machine, state precisely WHICH ' +
      'existing atomic piece ALREADY embodies it (file:symbol) and WHAT is the residual GAP. Be specific and honest: ' +
      'where atomic already does it, say so (the machine is mostly UNIFICATION, not net-new); where it does not, name ' +
      'the gap. Cover all 6 guarantees + the dissolve-and-re-materialize step (does anything today canonicalize a ' +
      'proposal to a normal byte-positive form, e.g. format/lint-fix/convergence?).\n\nMACHINE:\n' +
      INTENTION,
  },
  {
    key: 'prior-art-ceiling',
    label: 'crystallize:prior-art-and-ceiling',
    prompt:
      'You are positioning the nameless intention-compiler machine against PRIOR ART, honestly, and pinning the ' +
      'decidability CEILING.\n\nMACHINE:\n' +
      INTENTION +
      '\n\nSurvey (briefly, from knowledge): compilers / normalization-by-evaluation, proof-carrying code (Necula), ' +
      'verified refactoring, semantic patching (Coccinelle), program synthesis / sketching, LSP, tree-sitter, ' +
      'CRDT/OT, Hazel/Hazelnut typed structure editors, bidirectional/lenses. For each: what it shares with the ' +
      'machine and what the machine adds. Then state the DEFENSIBLE novelty (the unification of ' +
      'compiler+editor+writer+executor under byte-positive-by-construction + dissolve-from-intention + no-bypass + ' +
      'monotonic self-extension is unattested as a package) WITHOUT overclaiming. Pin the Rice ceiling precisely: what ' +
      '"materialize intention as byte-positive" CAN and CANNOT guarantee, and how recusa-ou-prova is the honest form. ' +
      'Give the strongest TRUE sentence the project can claim, and the false sentence it must avoid.',
  },
]

const crystallized = await parallel(
  CRYSTALLIZE.map((c) => () => agent(c.prompt, { label: c.label, phase: 'Crystallize' })),
)

phase('Synthesize')

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['nameCandidates', 'oneLineThesis', 'operationModel', 'unificationMap', 'honestCeiling', 'firstBuildPiece', 'roadmap'],
  properties: {
    nameCandidates: { type: 'array', items: { type: 'string' }, minItems: 3 },
    oneLineThesis: { type: 'string' },
    operationModel: {
      type: 'object',
      additionalProperties: false,
      required: ['stages', 'noRollbackRationale', 'byteScaleStrategy'],
      properties: {
        stages: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['stage', 'definition'],
            properties: { stage: { type: 'string' }, definition: { type: 'string' } },
          },
          minItems: 6,
        },
        noRollbackRationale: { type: 'string' },
        byteScaleStrategy: { type: 'string' },
      },
    },
    unificationMap: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['facet', 'alreadyInAtomic', 'gap'],
        properties: {
          facet: { type: 'string' },
          alreadyInAtomic: { type: 'string' },
          gap: { type: 'string' },
        },
      },
      minItems: 6,
    },
    honestCeiling: { type: 'string' },
    firstBuildPiece: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'what', 'whyFirst', 'files', 'proof', 'lattice_risk'],
      properties: {
        name: { type: 'string' },
        what: { type: 'string' },
        whyFirst: { type: 'string' },
        files: { type: 'array', items: { type: 'string' } },
        proof: { type: 'string' },
        lattice_risk: { type: 'string' },
      },
    },
    roadmap: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['step', 'outcome'],
        properties: { step: { type: 'string' }, outcome: { type: 'string' } },
      },
      minItems: 3,
    },
  },
}

const design = await agent(
  'You are the chief architect synthesizing a SINGLE formal kernel design for the nameless intention-compiler ' +
    'machine, from three crystallization inputs. Be concrete, buildable, honest-ceiling-bound, and grounded in the ' +
    'real atomic-edit engine (it is the SEED — the machine is mostly its UNIFICATION + the dissolve-from-intention ' +
    'step, not a blind rewrite). The firstBuildPiece MUST be a single self-expansion-sized increment that is additive/' +
    'monotonic (passes a 30-phase mandatory lattice: build, type, lint, reachability, security, monotonicity, tests, ' +
    'certificate, no-bypass) and that genuinely realizes a real slice of the machine (NOT timid groundwork, NOT a ' +
    'clone-validate-staging approach which the owner rejected as the wrong paradigm). Prefer a first piece that makes ' +
    'the "materialize intention / dissolve surface to canonical byte-positive form" real for one concrete path.\n\n' +
    'MACHINE INTENTION:\n' + INTENTION +
    '\n\n=== CRYSTALLIZATION 1 (operational model) ===\n' + crystallized[0] +
    '\n\n=== CRYSTALLIZATION 2 (atomic capability map) ===\n' + crystallized[1] +
    '\n\n=== CRYSTALLIZATION 3 (prior art + ceiling) ===\n' + crystallized[2],
  { label: 'synthesize:kernel-design', phase: 'Synthesize', schema: SYNTH_SCHEMA },
)

return design
