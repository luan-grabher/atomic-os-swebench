export const meta = {
  name: 'swebench-defect-classify',
  description: 'Classify all 300 SWE-bench Lite gold patches by defect class to derive the universal atomic-Python gate backlog + the honest gate-able ceiling',
  phases: [
    { title: 'Classify', detail: 'fan out over 300 gold patches, classify each by defect class' },
    { title: 'Synthesize', detail: 'distribution + gate-able ceiling + prioritized universal-gate backlog' },
  ],
}

const FILE = '/Users/danielpenin/kloel-elevation/scripts/mcp/atomic-edit-bench/gold-patch-lite.jsonl'
const TOTAL = 300
const PER = 15
const batches = []
for (let s = 1; s <= TOTAL; s += PER) batches.push({ start: s, end: Math.min(s + PER - 1, TOTAL) })

const TAXONOMY = `DEFECT CLASSES (each tagged DECIDABLE = a static gate could catch it in principle, or SEMANTIC = Rice-undecidable, only reasoning fixes it):
DECIDABLE (gate-able — these map to atomic invariant/gate classes):
  - null-safety        : None-deref / missing None guard (TS: strict-null; Python gate MISSING)
  - type-mismatch      : wrong type passed/returned/compared (TS: tsc type gate; Python: needs mypy/pyright gate)
  - attribute-missing  : AttributeError-class — accessing absent attr/method (partly decidable via type/structural)
  - signature-arity    : wrong number/order/name of args vs definition (decidable structurally)
  - import-dependency  : broken/missing/wrong import or undeclared dep (atomic supply-chain/connection gate)
  - undefined-name     : use-before-def / NameError / scope error (decidable via scope analysis)
  - resource-lifetime  : unclosed file/socket/handle leak (atomic L02/L04 lifetime gate)
SEMANTIC (NOT gate-able — Rice; the reasoning/funnel's job, not atomic):
  - logic-error        : wrong condition / computation / algorithm / operator
  - missing-edge-case  : boundary/empty/None-input case not handled (behaviorally)
  - behavior-spec      : intended behavior/spec change, semantically valid both ways
  - config-data        : non-code config / data / docstring / test-only`

const CLS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['classifications'],
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['instance_id', 'defect_class', 'decidable', 'atomic_gate', 'python_gap', 'confidence'],
        properties: {
          instance_id: { type: 'string' },
          defect_class: { type: 'string', description: 'one of the taxonomy class names' },
          decidable: { type: 'boolean', description: 'true if a static gate could catch this class in principle' },
          atomic_gate: { type: 'string', description: 'the atomic invariant/gate class that applies (null-safety, type, supply-chain, resource-lifetime, signature, scope, none-semantic)' },
          python_gap: { type: 'string', enum: ['ts-has-python-missing', 'python-partial', 'both-have', 'na-semantic'], description: 'does atomic Python support lag TS for this class?' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          note: { type: 'string' },
        },
      },
    },
  },
}

phase('Classify')
const classified = await parallel(batches.map((b) => () =>
  agent(
    `${TAXONOMY}\n\nRead lines ${b.start}-${b.end} of the JSONL file ${FILE} (each line is a JSON object: instance_id, repo, problem, patch=the GOLD human fix, f2p_n). Use: \`sed -n '${b.start},${b.end}p' ${FILE}\` then parse each JSON line.\n\nFor EACH gold patch, read the patch diff (the human fix reveals the defect class) + the problem statement, and classify it by the taxonomy. Be rigorous: a patch that adds a None-check = null-safety (decidable); a patch that rewrites an algorithm/condition = logic-error (semantic); a patch that adds a missing import = import-dependency (decidable). Most SWE-bench bugs are SEMANTIC (the base code is valid, test-passing code with a behavior gap) — do NOT over-assign decidable classes; only assign decidable if a static analyzer could genuinely have flagged it. Set python_gap based on whether atomic's Python gate for that class lags its TS gate (type/null-safety = ts-has-python-missing; import/supply-chain/lifetime = python-partial; semantic = na-semantic). Return one classification per instance in the batch.`,
    { schema: CLS_SCHEMA, phase: 'Classify', label: `classify:${b.start}-${b.end}` }
  )
))

const all = classified.filter(Boolean).flatMap((r) => r.classifications || [])

phase('Synthesize')
const SYN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['totalClassified', 'gateableFraction', 'classDistribution', 'universalGateBacklog', 'ceilingStatement'],
  properties: {
    totalClassified: { type: 'number' },
    gateableFraction: { type: 'string', description: 'fraction (and %) of bugs that are DECIDABLE = gate-able in principle — the honest ceiling for atomic gates' },
    classDistribution: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['defect_class', 'count', 'decidable'], properties: { defect_class: { type: 'string' }, count: { type: 'number' }, decidable: { type: 'boolean' } } } },
    universalGateBacklog: {
      type: 'array', description: 'prioritized list of UNIVERSAL atomic-Python gates to build, decidable classes where Python lags TS, by frequency',
      items: { type: 'object', additionalProperties: false, required: ['gate', 'atomic_gate_class', 'count', 'tsParityNote', 'buildSketch'], properties: {
        gate: { type: 'string' }, atomic_gate_class: { type: 'string' }, count: { type: 'number' },
        tsParityNote: { type: 'string', description: 'what the TS gate does that Python lacks' },
        buildSketch: { type: 'string', description: 'how to build the universal Python gate (tree-sitter-python based, the decidable check)' } } },
    },
    ceilingStatement: { type: 'string', description: 'the honest one-paragraph ceiling: what fraction atomic gates can defeat vs what stays Rice/semantic (funnel only)' },
  },
}
const synthesis = await agent(
  `Here are ${all.length} defect classifications of SWE-bench Lite gold patches:\n${JSON.stringify(all)}\n\nSynthesize: (1) the class distribution with counts; (2) the GATE-ABLE fraction (decidable classes / total) = the honest ceiling for what atomic STATIC GATES can defeat (the semantic remainder is Rice — only the reasoning/funnel defeats those); (3) the prioritized UNIVERSAL atomic-Python gate backlog — the decidable classes where atomic's Python support lags TS, sorted by frequency, each with a build sketch (tree-sitter-python-based decidable check) and the TS-parity note. Be honest and precise: this number sets the realistic ceiling of the 'evolve atomic-Python to defeat SWE-bench failures' program.`,
  { schema: SYN_SCHEMA, phase: 'Synthesize', label: 'synthesize-backlog' }
)

return { synthesis, rawCount: all.length }