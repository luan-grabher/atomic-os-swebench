export const meta = {
  name: 'touching-rice-atomic',
  description: 'What would it take for the atomic floor to "touch Rice" — i.e. give genuine semantic certainty instead of K-sample disconfirmation? Ground in the real formal-gate + recursion theory; adversarially verify the escape routes.',
  phases: [
    { title: 'Ground', detail: 'real formal-gate + Rice theory + SOTA decidable-verification + comparable systems' },
    { title: 'Adversarial', detail: 'test: cannot-beat-only-escape, formal-gate-already-escapes, the 4 widenings, the permanent ceiling' },
    { title: 'Synthesize', detail: 'the precise honest answer + concrete gates to build on the existing floor' },
  ],
}

const REPO = '/Users/danielpenin/whatsapp_saas'
const ATOMIC = `${REPO}/scripts/mcp/atomic-edit`

const GROUND_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    topic: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    decidesWhat: { type: 'string', description: 'precisely what semantic certainty this yields, and on what domain/fragment' },
    honestLimit: { type: 'string', description: 'where it stops / what it canNOT decide' },
    buildableAsFloorGate: { type: 'string', description: 'how (if at all) it wires as a write-time gate over the existing atomic formal-gate, and the annotation/cost' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['topic', 'findings', 'decidesWhat', 'honestLimit'],
}

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['supported', 'refuted', 'partial'] },
    strongestCounter: { type: 'string' },
    reasoning: { type: 'string' },
  },
  required: ['claim', 'verdict', 'reasoning'],
}

phase('Ground')
const grounds = [
  () => agent(
    `Read the atomic MCP's STRONGEST semantic gate, precisely. Files under ${ATOMIC}/gates/: formal-gate.ts (the bounded model checker — characterize EXACTLY: does it enumerate a bounded state space and check ∀s.INV(s)? what bounds it? is it SOUND and/or COMPLETE on its bound? what directive drives it — @model init/next/invariant?), property-gate.ts (K-sample disconfirmation — note its documented probabilistic ceiling), deterministic-harness.ts, liveness-gate.ts, gates/registry.ts (DYNAMIC_GATES). QUESTION: what is the atomic floor's current closest-to-semantic-certainty mechanism, what does it genuinely DECIDE (∀-certainty?) and on what fragment, and what is its honest limit (the bound)?`,
    { label: 'ground:formal-gate-code', phase: 'Ground', schema: GROUND_SCHEMA },
  ),
  () => agent(
    `RECURSION THEORY — Rice's theorem, precisely. State it exactly (any non-trivial property of the partial function computed by a program is undecidable) and its TWO load-bearing preconditions: (1) the program space is Turing-complete; (2) the property is decided for ALL programs by a single total algorithm. Then enumerate the FORMAL ESCAPE ROUTES that yield decidable semantic facts WITHOUT contradicting the theorem: (A) restrict the domain to total/terminating or finite-state programs (semantic properties become decidable — total languages, finite models); (B) proof-carrying / require a witness (proof-CHECKING is decidable even when proof-FINDING is not); (C) sound over-approximation / abstract interpretation (decidable, one-sided: 'definitely safe' or 'unknown', never a false 'unsafe'); (D) inductive/observational (testing/runtime — sidesteps by not proving, only disconfirms). For EACH: what certainty it yields and its exact honest limit. Be rigorous; cite the theory.`,
    { label: 'ground:rice-theory', phase: 'Ground', schema: GROUND_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `SOTA of decidable/practical semantic verification BUILDABLE as a write-time gate. Cover: (1) k-induction and IC3/PDR (lift BOUNDED model checking to UNBOUNDED safety invariants — when sound/complete); (2) refinement types + SMT backend (LiquidHaskell, F*, Dafny, Liquid Java) — author/LLM ANNOTATES an invariant, an SMT solver (Z3/CVC5) DECIDES it on a decidable logical theory (linear arithmetic, arrays, uninterpreted functions); (3) totality/termination checking (Agda/Idris/Dhall — a terminating fragment makes more properties decidable); (4) proof-carrying code (Necula) — the producer ships a machine-checkable proof, the floor checks it. For each: the annotation cost, what it decides vs leaves undecidable, and how concretely it would wire as a gate over the atomic floor's existing @model/formal-gate seam.`,
    { label: 'ground:sota-verification', phase: 'Ground', schema: GROUND_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `Real comparable production verification systems and their decidability profiles: Dafny + Why3 (SMT-backed verification of imperative code w/ pre/post/invariants), CBMC (bounded model checker for C), SPARK/Ada (provable subset, contract-based, used in avionics), TLA+/Apalache (symbolic model checker), Infer (abstract interpretation, sound-ish bug finding at scale), seL4 (full functional-correctness proof of an OS kernel in Isabelle). For each: what it DECIDES with certainty, the soundness/completeness tradeoff, the human/annotation cost, and the Rice-escape it uses (restrict-domain / proof-carrying / abstract-interp / bounded). QUESTION: which of these is the realistic model for an atomic write-floor that wants genuine semantic certainty on the decidable fragment, and at what cost?`,
    { label: 'ground:comparable-systems', phase: 'Ground', schema: GROUND_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
]
const g = (await parallel(grounds)).filter(Boolean)
const digest = g.map((x) => `### ${x.topic}\nDecides: ${x.decidesWhat}\nLimit: ${x.honestLimit}\nAs floor gate: ${x.buildableAsFloorGate || '—'}\n` + (x.findings || []).map((f) => `- ${f}`).join('\n')).join('\n\n')
log(`Grounded ${g.length}/4. Adversarially testing the Rice-escape claims.`)

phase('Adversarial')
const CLAIMS = [
  'Rice cannot be BEATEN. Any "touch Rice" is ESCAPING its preconditions on a FRAGMENT (restrict to total/finite domain, OR require a proof witness, OR accept sound-but-incomplete approximation, OR observe-not-prove) — never deciding arbitrary non-trivial semantic properties for ALL Turing-complete programs. A system claiming to decide that for all programs is provably impossible (crankery).',
  'The atomic floor ALREADY touches the decidable frontier: its formal-gate is a bounded ∀s.INV(s) model checker, which gives REAL universal certainty ON ITS BOUNDED STATE SPACE — that is escape-route (A) (restrict to a finite model) operating today. So the system already crosses from "observe/disconfirm" to "prove on a fragment", just narrowly (bounded).',
  'The concrete way to WIDEN the decidable fragment on the atomic floor, in increasing power: (a) k-induction / IC3-PDR to lift the bounded model check to UNBOUNDED inductive safety invariants; (b) SMT-backed refinement types (Dafny/Liquid-style) so the author or the LLM supplies an invariant a solver DECIDES on a decidable theory; (c) a totality/termination gate carving a terminating sub-DSL where more properties are decidable; (d) proof-carrying mutations where the LLM emits a machine-checkable proof the floor checks. Each is a new gate over the existing @model/formal-gate seam.',
  'The permanent ceiling stays: every escape covers ONLY its fragment. The unbounded, un-annotated, Turing-complete, general case is undecidable FOREVER. So "touching Rice" widens the fragment of genuine semantic certainty but never eliminates the horizon — and the honest truth-receipt MUST distinguish proven-on-fragment (∀-certain) from observed (K-sample) from unjudged. Widening the fragment is the only honest meaning of "touch Rice".',
]
const LENSES = ['recursion-theory / verification PL theorist', 'practitioner who has shipped Dafny/SPARK/CBMC (annotation cost, real limits)', 'steelman: argue the atomic floor CAN meaningfully widen the decidable fragment, concretely']
const verdicts = await parallel(CLAIMS.map((claim) => () =>
  parallel(LENSES.map((lens) => () =>
    agent(`Through the ${lens} lens, rigorously test this claim — refute first; if you cannot, mark supported; if conditionally true, partial + condition. Cite theorems/systems, not vibes.\n\nCLAIM:\n${claim}\n\nGrounded evidence:\n${digest}`,
      { label: `adv:${lens.slice(0, 12)}`, phase: 'Adversarial', schema: VERDICT_SCHEMA }))).then((vs) => {
    const v = vs.filter(Boolean); const refuted = v.filter((x) => x.verdict === 'refuted').length; const partial = v.filter((x) => x.verdict === 'partial').length
    return { claim, lensVerdicts: v, net: refuted >= 2 ? 'REFUTED' : partial >= 2 ? 'PARTIAL' : 'SUPPORTED', refuted, partial }
  })))

phase('Synthesize')
const memo = await agent(
  `Write the final memo (markdown, PT-BR, precise, zero hype, intellectual-peer) answering Daniel's question: "you said the atomic floor doesn't touch Rice — what to do to touch Rice?" `
  + `Deliver: (1) the honest framing — you do NOT beat Rice (impossible); "touching Rice" means escaping its two preconditions on a decidable FRAGMENT, and there are exactly 4 escapes (restrict-domain / proof-carrying / sound-approximation / observe-not-prove). State which the atomic floor uses TODAY (property-gate = observe/disconfirm; formal-gate = restrict to bounded finite model = real ∀-certainty on its bound). (2) The concrete ladder to WIDEN the fragment, mapped to the existing formal-gate/@model seam, in increasing power & cost: k-induction/IC3 (bounded→unbounded inductive invariants), SMT-refinement types (author/LLM-annotated, solver-decided), totality/termination sub-DSL, proof-carrying mutations. For each: what it newly DECIDES with ∀-certainty, the annotation cost, and the realistic comparable (Dafny/SPARK/CBMC/seL4). (3) The permanent ceiling — every escape covers only its fragment; the general case is undecidable forever; the receipt must mark proven-on-fragment vs observed vs unjudged. (4) The single highest-leverage next step for THIS system and why. `
  + `Flag any claim the adversarial pass REFUTED or marked PARTIAL and adjust honestly.\n\nGROUNDED:\n${digest}\n\nADVERSARIAL VERDICTS:\n${verdicts.map((v) => `- [${v.net}] ${v.claim.slice(0, 90)}... (refuted ${v.refuted}/partial ${v.partial})${v.lensVerdicts.map((l) => `\n    · ${l.verdict} — ${(l.strongestCounter || l.reasoning).slice(0, 180)}`).join('')}`).join('\n')}`,
  { label: 'synthesize:rice-memo', phase: 'Synthesize' },
)

return { memo, claimNetVerdicts: verdicts.map((v) => ({ net: v.net, refuted: v.refuted, partial: v.partial, claim: v.claim.slice(0, 100) })) }
