export const meta = {
  name: 'dgm-atomic-ceiling',
  description: 'Forward-looking adversarial evaluation: assuming the DGM loop is connected correctly inside atomic, what is the real revolutionary ceiling — and under what conditions does the strong claim survive?',
  phases: [
    { title: 'Fundamentar', detail: 'ground the RSI-safety + proof-carrying-self-mod prior art and the soundness-vs-open-endedness tension' },
    { title: 'Refutar', detail: '4 expert lenses try to break the revolutionary-safety claim' },
    { title: 'Sintese', detail: 'the surviving claim, the ceiling, the conditions, the falsifiable post-connection test' },
  ],
}

const GROUND_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area', 'keyFindings', 'strongestCounterPriorArt', 'verdictOnSlotOccupied', 'summary'],
  properties: {
    area: { type: 'string' },
    keyFindings: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['claim', 'source', 'bearing'], properties: {
      claim: { type: 'string' }, source: { type: 'string', description: 'paper/system + citation' }, bearing: { type: 'string', enum: ['supports-novelty', 'erodes-novelty', 'neutral-context'] } } } },
    strongestCounterPriorArt: { type: 'string', description: 'the single closest existing system to fail-closed proof-carrying admission gate on the self-modifications of a self-improving agent' },
    verdictOnSlotOccupied: { type: 'string', enum: ['unoccupied', 'partially-occupied', 'occupied'] },
    summary: { type: 'string' },
  },
}

const VOTE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['lens', 'claimSurvives', 'confidence', 'whatSurvives', 'whatBreaks', 'residualBarrierTheWireDoesNotRemove'],
  properties: {
    lens: { type: 'string' },
    claimSurvives: { type: 'string', enum: ['survives-as-stated', 'survives-narrowed', 'breaks'] },
    confidence: { type: 'number' },
    whatSurvives: { type: 'string' },
    whatBreaks: { type: 'string' },
    residualBarrierTheWireDoesNotRemove: { type: 'string', description: 'the barrier that remains standing even AFTER a correct connection' },
  },
}

const SYNTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['ceilingHeadline', 'revolutionaryForSafety', 'revolutionaryForCapability', 'survivingSentence', 'conditionsBeyondTheWire', 'theFundamentalTension', 'falsifiablePostConnectionTest', 'honestCeilingPtBr'],
  properties: {
    ceilingHeadline: { type: 'string' },
    revolutionaryForSafety: { type: 'string', enum: ['yes-if-conditions-met', 'partially', 'no'] },
    revolutionaryForCapability: { type: 'string', enum: ['yes', 'partially', 'no'] },
    survivingSentence: { type: 'string', description: 'the strongest claim that survives a skeptic, verbatim, usable' },
    conditionsBeyondTheWire: { type: 'array', items: { type: 'string' }, description: 'what must ALSO be true beyond connecting the loop, for the claim to hold' },
    theFundamentalTension: { type: 'string', description: 'the soundness(fail-closed) vs open-endedness(Darwin) trade-off and what it costs' },
    falsifiablePostConnectionTest: { type: 'string', description: 'the concrete experiment that would CONFIRM or REFUTE the revolutionary claim once connected' },
    honestCeilingPtBr: { type: 'string', description: 'Brazilian Portuguese, direct, no hype, no cynicism, 5-8 sentences' },
  },
}

phase('Fundamentar')
log('Fundamentando RSI-safety + proof-carrying self-mod + a tensao soundness-vs-open-endedness.')

const CONTEXT = `CONTEXT: "atomic" is a verified-edit substrate (TS/JS+8 langs) with: fail-closed proof admission (unjudged>=negative), byte-floor monotonic write admission, a ~40-command self-extension validator lattice, a security-baseline monotonic ratchet, and a no-bypass envelope (currently opt-in/dormant). A separate, real-but-currently-ISLAND Darwin kernel (decidePromotion/receipt/hash-chained-archive, forgery-resistant by recompute) exists. The plan being executed RIGHT NOW: wire the real self-edit facts (parent=pre-edit, candidate=post-edit) through decidePromotion GATED AFTER the proof lattice, persist a durable archive, and add propose(generate-variant)+actuate(swap child into running engine) — turning two islands into one loop. Schmidhuber Godel Machine required PROVABLE improvement (undecidable, never realized). Sakana Darwin Godel Machine (2025) dropped provability for EMPIRICAL benchmark validation + open-ended archive. The thesis: atomic relocates the proof obligation from the undecidable target (improvement) to a DECIDABLE one (admissibility under invariants), supplying a fail-closed soundness floor on the self-modifications themselves.`

const grounding = await parallel([
  () => agent(`${CONTEXT}\n\nAREA = rsi-safety-literature. Ground the recursive-self-improvement SAFETY landscape so the ceiling can be judged. Cover precisely, with citations: corrigibility, the off-switch/tiling-agents problem, quantilizers, the Schmidhuber Godel Machine provable-self-rewrite requirement and why it is intractable, MIRI/Armstrong-style RSI-safety results, and any work on PROVABLE invariant-preservation across self-modification. The crux question to answer: does the RSI-safety field consider "a self-improving system that provably cannot rewrite itself out of its own safety invariants (monotone non-regression of invariants across self-edits)" an OPEN, WANTED problem? Is a tractable (decidable-fragment) form of it considered valuable or already solved?`, { label: 'rsi-safety', phase: 'Fundamentar', schema: GROUND_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' }),

  () => agent(`${CONTEXT}\n\nAREA = proof-carrying-self-mod-priorart. Hunt the CLOSEST prior art to the exact thing atomic would become: a self-improving agent whose self-modifications are admitted into the running system ONLY after passing a decidable, fail-closed (proof-carrying-code style) admission gate — NOT mere empirical benchmark validation. Check: Necula proof-carrying code, certifying compilers (CompCert), AlphaVerus/verified-code-gen, Nidus (arXiv 2604.05080, self-hosted gate on 100k LOC), Microsoft MXC/AGT kernel-enforced no-bypass, VeriGuard, certified self-modifying code, runtime-verification + self-adaptive systems (MAPE-K), and any 2025-2026 agentic-self-improvement-with-formal-gate work. For the SINGLE closest system, state exactly what it does and the precise delta from "proof-gated admission on an agent OWN self-mods inside an open-ended evolutionary loop". Is the slot occupied?`, { label: 'pcc-priorart', phase: 'Fundamentar', schema: GROUND_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' }),

  () => agent(`${CONTEXT}\n\nAREA = soundness-vs-openendedness-tension. The deepest analytical question, possibly the real ceiling: a fail-closed proof gate REJECTS any self-modification it cannot PROVE admissible. By Rice theorem the decidable fragment is necessarily NARROW, so the gate must abstain (and, fail-closed, REJECT) on most semantically-meaningful self-modifications. Darwin entire value is OPEN-ENDED exploration of stepping-stones (locally-worse variants that unlock later gains). A strict fail-closed gate is structurally ANTI-open-ended — it may starve the search and converge to a halt (nothing passes) rather than improve. Research/reason precisely: (1) Is this tension real and documented (open-ended search vs hard constraints, novelty-search, quality-diversity, constraint-handling in evolutionary computation)? (2) What is the likely FALSE-REJECT cost — what fraction of genuine improvements does a decidable-invariant gate reject? (3) Can the tension be MANAGED (e.g. gate only safety-critical invariants, let capability vary freely; staged gates; soft vs hard invariants) or is it fundamental? This determines whether the connected loop IMPROVES faster or SLOWER than an unconstrained DGM.`, { label: 'tension', phase: 'Fundamentar', schema: GROUND_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' }),
])

const ground = grounding.filter(Boolean)
const groundJson = JSON.stringify(ground, null, 1)
log(`Fundamentacao: ${ground.length}/3. Estressando o teto com 4 lentes adversariais.`)

phase('Refutar')
const STRONG_CLAIM = `Once the loop is connected CORRECTLY (real-edit facts -> decidePromotion gated AFTER the proof lattice -> durable hash-chained archive; propose+actuate wired; no-bypass demonstrated live), atomic becomes the FIRST recursively self-improving agent whose self-modifications carry a DECIDABLE, FAIL-CLOSED soundness floor — provable monotone non-regression of its safety/structural invariants across its own self-edits. This is the corrigibility-under-self-improvement property the RSI-safety literature wants and no shipped system has demonstrated. It is REVOLUTIONARY for SAFE self-improvement (a soundness result), though NOT for raw capability (the proof filters, it does not create intelligence).`

const lenses = [
  { key: 'rsi-safety-researcher', focus: 'You are a recursive-self-improvement safety researcher. Is "provable non-regression of safety invariants across self-modification, in a decidable fragment" actually the wanted open problem, or a narrow/uninteresting restatement? Does fail-closed + unjudged>=negative genuinely give corrigibility-under-self-improvement, or only a brittle subset? Attack the gap between "preserved THESE invariants" and "stayed safe/aligned".' },
  { key: 'formal-methods-purist', focus: 'You are a formal-methods purist. The gate proves admissibility under a FIXED, NARROW decidable invariant set precisely because broader correctness is undecidable (Rice). Attack: the soundness floor is a floor on trivial/syntactic properties, the semantically-important correctness is still empirical, and the applied gate (byte-floor+validators) faithfulness on real 844k-LOC product code is demonstrable-on-demand but NOT durably proven. Is the proof load-bearing or decorative once self-mods get semantically nontrivial?' },
  { key: 'sakana-dgm-author', focus: 'You are an author of the Darwin Godel Machine. Attack from open-endedness: a fail-closed gate REJECTS stepping-stones (locally-worse variants that DGM relies on for long-horizon gains). Your DGM deliberately dropped the proof requirement because it STARVES exploration. Argue the connected atomic loop will improve SLOWER, converge to a halt, or only admit trivial edits — making it a safer-but-weaker DGM, not a revolution. Is "safe self-improvement" worth a crippled search?' },
  { key: 'prior-art-commercial-skeptic', focus: 'You are a prior-art + commercial skeptic. Even granting it works: is it NOVEL vs Nidus (self-hosted gate on 100k LOC IN PRODUCTION, demonstrates its barrier) + Microsoft MXC (kernel-enforced no-bypass shipped) + certifying compilers + the already-credited atomic (a)+(e) pair? Distinguish "first to PACKAGE proof-gated admission INTO an open-ended self-improvement loop" from "first at anything". And: atomic still only MEASURES no-bypass (blockedByDenyHook=0 across all ledgers) — if the envelope stays dormant, a self-improving system can edit itself AROUND the gate, voiding the soundness floor entirely. Refute unless the union is genuinely first AND the no-bypass is demonstrated.' },
]

const votes = (await parallel(lenses.map(l => () =>
  agent(`You are an ADVERSARIAL expert verifier. REFUTE or NARROW — do not cheerlead. Lens: ${l.key}.\nFocus: ${l.focus}\n\nCLAIM UNDER TEST (assume the wiring is done CORRECTLY — judge the CEILING, not today island state):\n${STRONG_CLAIM}\n\nGROUNDED PRIOR-ART + TENSION DOSSIER:\n${groundJson}\n\nReturn per schema. Be precise; name the residual barrier that survives even a correct connection. Default to "survives-narrowed" or "breaks" unless the evidence genuinely supports the full claim.`,
    { label: `lens:${l.key}`, phase: 'Refutar', schema: VOTE_SCHEMA })
))).filter(Boolean)

const breaks = votes.filter(v => v.claimSurvives === 'breaks').length
const narrowed = votes.filter(v => v.claimSurvives === 'survives-narrowed').length
log(`Lentes: ${breaks} quebram, ${narrowed} sobrevivem-estreitadas, ${votes.length - breaks - narrowed} intactas.`)

phase('Sintese')
const synth = await agent(`Synthesize the honest revolutionary-CEILING assessment. You reward what is genuinely real and refuse hype AND cynicism. The user is actively building the connection and wants to know the true ceiling AFTER it is done correctly.\n\nCLAIM UNDER TEST:\n${STRONG_CLAIM}\n\nGROUNDED DOSSIER:\n${groundJson}\n\nEXPERT LENS VOTES (${breaks} break, ${narrowed} survive-narrowed of ${votes.length}):\n${JSON.stringify(votes, null, 1)}\n\nProduce per schema. Separate revolutionary-for-SAFETY from revolutionary-for-CAPABILITY. survivingSentence = the strongest claim a skeptic cannot break, verbatim and usable. conditionsBeyondTheWire = everything that must ALSO be true beyond connecting the loop. theFundamentalTension = the fail-closed-vs-open-ended trade-off and its real cost. falsifiablePostConnectionTest = the concrete experiment that confirms/refutes the claim once connected. honestCeilingPtBr = Brazilian Portuguese, direct, 5-8 sentences, no English jargon, no hype, no cynicism — reward the real and name the ceiling.`,
  { label: 'synthesis', phase: 'Sintese', schema: SYNTH_SCHEMA })

return { synth, breaks, narrowed, totalVotes: votes.length, votes, groundAreas: ground.map(g => ({ area: g.area, slot: g.verdictOnSlotOccupied })) }
