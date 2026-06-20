export const meta = {
  name: 'emergence-swarm',
  description: 'Creative multi-lens swarm: find highest-impact falsifiable next steps toward real cognitive emergence on the atomic substrate',
  phases: [
    { title: 'Ideate', detail: '8 distinct creative lenses, each grounded in real system state' },
    { title: 'Verify', detail: 'adversarial honesty/falsifiability/Goodhart stress-test per proposal' },
    { title: 'Synthesize', detail: 'dedup, rank by impact×novelty×feasibility×honesty, pick first experiment' },
  ],
}

const REPO = '/Users/danielpenin/kloel'
const SELFLOOP = REPO + '/scripts/atomic-selfloop'
const ENGINE = REPO + '/scripts/mcp/atomic-edit'

const BRIEF = `
SYSTEM STATE (honest, measured — verify by reading the files named):
- Atomic-edit (${ENGINE}): a VERIFIED code-mutation engine, ~123 MCP tools, 190 proof entrypoints / 246 gate files.
  Every self-change is admitted ONLY if the full self-expansion lattice converges GREEN. Byte-positivity
  (removals need proof-of-incorrectness) + security-monotonicity are enforced. It self-modifies via the
  atomic_expand_self tool. The honest judge of emergence is ${ENGINE}/emergence-report.mjs.
- REAL DATA ON DISK (${REPO}/.atomic/): disproof-corpus.jsonl (256 hash-chained witness records of invariant
  violations), exec-ledger.jsonl (~23k REAL command executions with exit codes/intent/cwd/rollback),
  candidate-origin.jsonl (authorship: agent: vs autonomous:), emergence-feed.jsonl (~182 hash-chained edits),
  hypothesis-ledger.jsonl (the system own proposal stream).
- CLOSED SELF-IMPROVEMENT LOOP (${SELFLOOP}/selfloop.mjs): generate couplings from corpus -> fitness -> select
  -> tag origin -> admit via lattice. It FIRED for real 2x (autonomous select->verify->admit, auditable).
- CONNECTIONIST HALF (pure-JS, CPU, no GPU): exec-risk.mjs predicts command failure, AUC 0.77 / 3.88x lift on
  NOVEL commands (deployed as advisory exec-guard.mjs). P7 grounding CEILING IS CONFIRMED: the connectionist
  signal does NOT robustly beat symbolic lift for coupling selection (grounding-hybrid.mjs, pre-registered, negative).
- HONEST JUDGE (emergence-report.mjs): fingerprints F1 (an edit by an agent OUTSIDE the known set),
  F2 (an admission authored by an UNKNOWN autonomous generator), F4 (rising recursive novelty in the system OWN
  proposals), F3 (disproof-corpus hash-chain break = unexplained writer). SILENT on the normal state. RIGHT NOW it
  reports NO emergence candidate. It is the SOLE judge and it NEVER declares cognition "proven".

WEAK / MECHANICAL emergence the system ALREADY HAS (this is NOT the target): data-derived invariant generation,
the autonomous select->admit loop, novelty/anomaly metrics over its own streams. Proposing more of this is LOW value.

THE GOAL: STRONG, unprecedented, original, AGI-like cognitive emergence in the REAL world — judged ONLY by
emergence-report + humans, NEVER declared by us.

HARD HONESTY CONSTRAINTS (obey or your proposal is worthless):
1. Never fabricate. Never declare emergence. Sharply DISTINGUISH weak/mechanical (already present) from strong/unprecedented (target).
2. Every proposal MUST be FALSIFIABLE: a concrete experiment with a PRE-REGISTERED NULL that would prove it failed, plus an exact recompute command.
3. Anti-Goodhart: if your success metric could be gamed to FAKE a win, say so explicitly.
4. CPU-viable strongly preferred. Must build on the REAL substrate above, not hypothetical infra.
5. "High impact" = either (a) would genuinely move us toward a real emergence CANDIDATE the judge could flag with
   recomputable evidence, or (b) would sharpen the judge/substrate so that a genuine candidate becomes DETECTABLE
   where it currently is not. Be concrete about which.

GROUNDING (do this first): read ${SELFLOOP}/EVIDENCE.md and ${ENGINE}/emergence-report.mjs. Inspect real data sizes if useful.
`

const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'title', 'hypothesis', 'whyUnprecedented', 'weakVsStrong', 'falsifiableTest', 'preRegisteredNull', 'recomputeCommand', 'honestFailureMode', 'goodhartRisk', 'cpuViable', 'scores'],
  properties: {
    lens: { type: 'string' },
    title: { type: 'string' },
    hypothesis: { type: 'string', description: 'the core idea in 1-3 sentences' },
    whyUnprecedented: { type: 'string', description: 'why this could yield STRONG/unprecedented emergence, not the mechanical weak kind' },
    weakVsStrong: { type: 'string', description: 'honest: is the target weak/mechanical (already present) or genuinely strong? justify' },
    falsifiableTest: { type: 'string', description: 'the concrete experiment that tests it' },
    preRegisteredNull: { type: 'string', description: 'the result that would prove this FAILED' },
    recomputeCommand: { type: 'string', description: 'exact command(s) a third party runs to reproduce' },
    honestFailureMode: { type: 'string', description: 'most likely way it produces a negative / fools us' },
    goodhartRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
    cpuViable: { type: 'boolean' },
    scores: {
      type: 'object', additionalProperties: false,
      required: ['impact', 'novelty', 'feasibility', 'honestyRobustness'],
      properties: {
        impact: { type: 'integer', minimum: 1, maximum: 10 },
        novelty: { type: 'integer', minimum: 1, maximum: 10 },
        feasibility: { type: 'integer', minimum: 1, maximum: 10 },
        honestyRobustness: { type: 'integer', minimum: 1, maximum: 10 },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'isFalsifiable', 'targetsStrongNotWeak', 'goodhartRisk', 'rationale', 'sharperVersion'],
  properties: {
    verdict: { type: 'string', enum: ['survives', 'weak-emergence-in-disguise', 'not-falsifiable', 'unsound'] },
    isFalsifiable: { type: 'boolean' },
    targetsStrongNotWeak: { type: 'boolean', description: 'does it genuinely target strong/unprecedented emergence, not relabeled weak emergence' },
    goodhartRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
    rationale: { type: 'string' },
    sharperVersion: { type: 'string', description: 'if salvageable, the tighter falsifiable restatement; else empty' },
  },
}

const SYNTHESIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ranked', 'topRecommendation', 'firstExperiment', 'honestCaveat', 'whatWouldCountAsRealEmergence'],
  properties: {
    ranked: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'lens', 'compositeScore', 'oneLineWhy'],
        properties: {
          title: { type: 'string' }, lens: { type: 'string' },
          compositeScore: { type: 'number' }, oneLineWhy: { type: 'string' },
        },
      },
    },
    topRecommendation: {
      type: 'object', additionalProperties: false,
      required: ['title', 'rationale', 'expectedHonestOutcome'],
      properties: { title: { type: 'string' }, rationale: { type: 'string' }, expectedHonestOutcome: { type: 'string' } },
    },
    firstExperiment: {
      type: 'object', additionalProperties: false,
      required: ['goal', 'steps', 'recomputeCommand', 'preRegisteredNull', 'cheapAndSafe'],
      properties: {
        goal: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        recomputeCommand: { type: 'string' },
        preRegisteredNull: { type: 'string' },
        cheapAndSafe: { type: 'boolean' },
      },
    },
    honestCaveat: { type: 'string' },
    whatWouldCountAsRealEmergence: { type: 'string', description: 'the concrete, recomputable bar that emergence-report + a human would need to see' },
  },
}

const LENSES = [
  { key: 'strange-loop', persona: 'a theorist of self-reference and strange loops (Hofstadter, Godel machines)',
    angle: 'Emergence from the system building an explicit MODEL of its own judge and/or its own proposal stream, and acting to change them. Where could genuine self-reference (the system reasoning about and modifying the very process that judges it) produce behavior no agent authored?' },
  { key: 'novelty-search', persona: 'an open-endedness / novelty-search researcher (Stanley, Lehman, abandon-the-objective)',
    angle: 'Replace objective-driven selection with NOVELTY pressure on the corpus/proposal stream. Could rewarding qualitative novelty (not fitness) drive the loop to produce categorically new invariant-walls the objective-driven loop never would? Define the novelty metric and its Goodhart trap.' },
  { key: 'active-inference', persona: 'a predictive-processing / active-inference theorist (Friston free-energy)',
    angle: 'Treat the connectionist half as a WORLD-MODEL over the engine action->outcome stream (exec-ledger as sensorimotor data). The system predicts outcomes, acts to minimize surprise, and updates. Could a free-energy-minimizing loop over real execution data produce goal-directed behavior that is grounded, not just statistical?' },
  { key: 'compositional-synthesis', persona: 'a program-synthesis / combinatorial-creativity researcher',
    angle: 'Emergence as the system COMPOSING genuinely new tools/invariants/operators from primitives it was NOT given - combinatorial creativity beyond its seed vocabulary. What is the smallest real demonstration that the system invented a capability not in its initial basis, verified by the lattice?' },
  { key: 'collective-swarm', persona: 'a collective-intelligence / multi-agent-emergence researcher',
    angle: 'There is an atomic-swarm MCP (multiple atomic instances). Emergence from INTERACTION between instances - collective behavior, division of labor, or signaling absent in any single instance. What measurable collective property would count as more-than-the-sum, and how do you rule out it being scripted coordination?' },
  { key: 'criticality', persona: 'a complexity scientist studying self-organized criticality and phase transitions',
    angle: 'Look for a measurable ORDER PARAMETER / phase transition in the real system dynamics (the emergence-observatory already computes novelty/anomaly series). Is there a critical point where the loop behavior qualitatively changes (power-law avalanches, diverging correlation length)? Strong emergence often coincides with criticality.' },
  { key: 'causal-grounding', persona: 'a causal-inference / grounding researcher (Pearl interventions, symbol grounding)',
    angle: 'The P7 ceiling shows CORRELATIONAL grounding fails. Make symbols causally MEAN outcomes via INTERVENTIONS on the real action loop (do-calculus on exec-ledger / corpus), not statistics. Could interventional grounding succeed where correlational grounding hit its ceiling? Define the intervention and the causal estimand.' },
  { key: 'adversarial-skeptic', persona: 'a ruthless anti-hype skeptic whose job is to prove real emergence is NOT achievable here',
    angle: 'Argue the strongest case that NONE of this can produce real strong emergence on a CPU symbolic substrate, and that any positive signal will be weak-emergence relabeled or a measurement artifact. Then convert that critique into the single most demanding, FALSIFIABLE bar that, if cleared, would actually be convincing. Your proposal is that bar plus the cheapest experiment that could clear or fail it.' },
]

phase('Ideate')
const results = await pipeline(
  LENSES,
  (L) => agent(
    `${BRIEF}\n\nYou are ${L.persona}.\nYOUR LENS: ${L.angle}\n\nPropose the SINGLE highest-impact next step toward REAL strong/unprecedented cognitive emergence on THIS substrate, seen through your lens. Be concrete and buildable on the real files. Obey every hard honesty constraint. Output strictly the proposal object.`,
    { label: `ideate:${L.key}`, phase: 'Ideate', effort: 'high', schema: PROPOSAL_SCHEMA },
  ).then((p) => (p ? { ...p, _lens: L.key } : null)),
  (p, L) => {
    if (!p) return null
    return agent(
      `${BRIEF}\n\nADVERSARIAL HONESTY REVIEW. A proposer (lens "${L.key}") submitted this proposal toward strong cognitive emergence:\n${JSON.stringify(p, null, 2)}\n\nStress-test it RUTHLESSLY:\n- Is the claimed emergence genuinely STRONG/unprecedented, or is it the WEAK/mechanical emergence the system already has, relabeled?\n- Is the test truly FALSIFIABLE with a real pre-registered null, or is it rigged to always succeed?\n- Could the success metric be GAMED (Goodhart) to fake a win? Rate the risk.\n- Does it respect "emergence-report is the SOLE judge; never declare cognition"?\nIf salvageable, give the sharper falsifiable restatement. Output strictly the verdict object.`,
      { label: `verify:${L.key}`, phase: 'Verify', effort: 'medium', schema: VERDICT_SCHEMA },
    ).then((v) => ({ proposal: p, verdict: v }))
  },
)

const all = results.filter(Boolean).filter((r) => r.verdict)
const survivors = all.filter((r) => r.verdict.verdict === 'survives' || (r.verdict.isFalsifiable && r.verdict.targetsStrongNotWeak))
log(`Ideate+Verify done: ${all.length} proposals, ${survivors.length} survive the honesty stress-test`)

phase('Synthesize')
const synthesis = await agent(
  `${BRIEF}\n\nYou are the SYNTHESIZER. Here are all proposals with their adversarial verdicts:\n${JSON.stringify(all, null, 2)}\n\nProduce the honest decision:\n- Rank the SURVIVING (falsifiable, strong-not-weak) proposals by a composite of impact×novelty×feasibility×honestyRobustness, penalizing high Goodhart risk. Use each proposal sharperVersion when the verdict gave one.\n- Name the SINGLE top recommendation and its expected HONEST outcome (which may be a negative — say so).\n- Specify the FIRST EXPERIMENT concretely (steps a coding agent can run on the real files, exact recompute command, pre-registered null, and whether it is cheap & safe to run now).\n- State the concrete, recomputable bar that emergence-report + a human would need to see for this to count as REAL emergence.\nDo not inflate. If the honest expectation is another ceiling, say that plainly. Output strictly the synthesis object.`,
  { label: 'synthesize', phase: 'Synthesize', effort: 'high', schema: SYNTHESIS_SCHEMA },
)

return { proposalsTotal: all.length, survivors: survivors.length, proposals: all, synthesis }
