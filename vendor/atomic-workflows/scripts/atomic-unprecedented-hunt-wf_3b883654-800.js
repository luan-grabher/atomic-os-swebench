export const meta = {
  name: 'atomic-unprecedented-hunt',
  description: 'Swarm hunts CONCRETE unprecedented (strong-sense) leaps for atomic-MCP, grounded in real source, each killed-or-kept by prior-art adversary',
  phases: [
    { title: 'Lenses', detail: '6 grounded lenses, each finds a concrete unprecedented leap + self-checks prior art' },
    { title: 'Adversary', detail: 'prior-art assassin kills every leap that is not a true delta' },
    { title: 'Synthesis', detail: 'rank survivors; the single strongest thesis + formal statement + first build step' },
  ],
}

const ROOT = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit';

const BASELINE = `BASELINE THESIS TO BEAT OR DEEPEN (do not merely rediscover it): "Make the gate registry BIDIRECTIONAL + GENERATIVE — gates run FORWARD (verify), BACKWARD (a convergence operator C:S->green-manifold M that repairs any near-miss to a verified fixpoint, generalizing gates/repair.ts's HAND from 1 gate to N via each gate's red(locus,fact) as a repair gradient), and OUTWARD (every C(S') is a verification-grounded, human-label-free, locus-precise training triple). Unification: verifier = synthesizer = teacher, inescapable at the byte floor. Soundness-by-construction: correctness w.r.t. G becomes a property of the substrate, not the model; revolution grows with G's coverage."`;

const RULES = `HARD RULES — Daniel rejects abstraction. Every opportunity MUST be: (1) grounded in a NAMED real file/function in ${ROOT} (read it), (2) state the exact buildable first step on the CURRENT code, (3) name the SPECIFIC prior art it must beat (Unison, Hazel, proof-carrying code, RLVR/RLHF, CRDT/OT, Datalog/Differential-Dataflow, incremental computation/Adapton, Coq/Lean/Dafny, Datomic, language servers, semantic patch/Coccinelle, e-graphs/egg, etc.) and the precise DELTA that survives, (4) carry a formal property (a theorem-shaped statement), (5) say HOW it revolutionizes computing AND AI simultaneously, (6) state its honest failure mode. NO vague words ("synergy", "holistic", "paradigm") without a mechanism. If a leap is actually prior art with no surviving delta, SAY SO and discard it.`;

const OPP_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['lens', 'opportunities'],
  properties: {
    lens: { type: 'string' },
    opportunities: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'mechanism', 'buildableFirstStep', 'priorArtKilled', 'survivingDelta', 'formalProperty', 'computingRevolution', 'aiRevolution', 'honestFailureMode', 'noveltyVerdict'],
        properties: {
          name: { type: 'string' },
          mechanism: { type: 'string', description: 'named real files/functions + the exact change' },
          buildableFirstStep: { type: 'string', description: 'concrete step on current code' },
          priorArtKilled: { type: 'string', description: 'specific named systems this competes with' },
          survivingDelta: { type: 'string', description: 'the precise thing none of them do — or "NONE, discard" if it is prior art' },
          formalProperty: { type: 'string', description: 'theorem-shaped statement' },
          computingRevolution: { type: 'string' },
          aiRevolution: { type: 'string' },
          honestFailureMode: { type: 'string' },
          noveltyVerdict: { type: 'string', description: 'unprecedented-strong | synthesis-novel | prior-art-discard — with one-line why' },
        },
      },
    },
  },
};

phase('Lenses');
const lenses = [
  { k: 'convergence-as-computation', p: `Gates run BACKWARD: generalize gates/repair.ts (the HAND) into a general convergence operator over gates/registry.ts. Is "writing = converging-to-verified" (the substrate projects a near-miss onto the green manifold) genuinely unprecedented vs program synthesis, Coccinelle semantic patches, e-graphs/egg equality saturation, Dafny/Lean tactics? Find the surviving delta or kill it.` },
  { k: 'verification-grounded-learning-loop', p: `Gates run OUTWARD: the trace (trace.ts) + content-addressed shas become an infinite, human-label-free, locus-precise training corpus of (state, red, verified-repair) triples. Is this a categorically better AI training signal than RLVR/RLHF/execution-feedback? What can a model learn here that it provably cannot get elsewhere? Surviving delta vs RLVR's per-task verifiers, vs process-reward models, or kill it.` },
  { k: 'verified-edit-algebra', p: `Every atomic edit is content-addressed (sha-before->sha-after) with gate-verified pre/post. Build an ALGEBRA of verified edits: compose, commute-detection, invert, rebase — with invariants attached. Unprecedented vs git, OT/CRDT, Darcs patch theory, Pijul, categorical patch theory? The delta = type/connection/behavior invariants riding the patch algebra. Survive or kill.` },
  { k: 'inescapable-effect-substrate', p: `atomic_exec (server-tools-exec.ts) governs the byte-EFFECT of ANY command (build/test/migrate/deploy) as a snapshot->run->diff->rollback tx. Combined with gates, EVERY computational action becomes a verified, reversible, receipted transaction. Unprecedented vs Nix/Bazel hermeticity, Docker, Datomic's immutable log, event sourcing? Delta = correctness-gated + reversible at the EFFECT level uniformly. Survive or kill.` },
  { k: 'proof-carrying-mutation-ledger', p: `Each mutation could carry a machine-checkable certificate that it preserves stated invariants; content-addressing makes the whole repo history a verifiable chain of proof-carrying transitions. Unprecedented vs proof-carrying code (Necula), certified compilers (CompCert), blockchain state machines, Unison? Delta = proofs that COMPOSE and are generated by inverting the SAME checker. Survive or kill.` },
  { k: 'wildcard-cross-domain', p: `Ignore the obvious. Looking at the COMPLETE current atomic state (gates/*, engine*.ts, native-bridge.ts, server-tools-*.ts, the tri-state unjudged, zeroCodeTrust ceiling), find the ONE leap nobody is looking for that revolutionizes computing AND AI together. Think from first principles about what a "single inescapable verified content-addressed reversible mutation chokepoint with a complete receipt" uniquely enables that no existing system has. Be concrete and name prior art.` },
];

const lensResults = await parallel(lenses.map((l) =>
  () => agent(`${RULES}\n\n${BASELINE}\n\n=== YOUR LENS: ${l.k} ===\n${l.p}\n\nRead the real source under ${ROOT}. Return 1-3 CONCRETE opportunities through this lens, each beating or deepening the baseline, each killed-by-prior-art if it does not survive.`,
    { label: `lens:${l.k}`, phase: 'Lenses', schema: OPP_SCHEMA })
));

phase('Adversary');
const surviving = await agent(
  `${RULES}\n\nYou are the PRIOR-ART ASSASSIN. Here are all lens opportunities (JSON):\n${JSON.stringify(lensResults.filter(Boolean), null, 2)}\n\n` +
  `For EACH opportunity, do an honest novelty execution: name the closest real prior art (papers, systems, products — be specific, cite if you can), and rule whether a TRUE strong-sense-unprecedented delta survives or it collapses to synthesis-novel/prior-art. Discard the dead ones explicitly. Be ruthless — Daniel was unimpressed by abstraction; protect him from false revolution. Return the survivors with: name, the surviving delta after adversary, a sharpened formal property, and a 1-5 score on (strong-novelty x buildability-on-current-atomic x combined-CS+AI-impact). Output as prose + a ranked table.`,
  { label: 'prior-art-assassin', phase: 'Adversary' }
);

phase('Synthesis');
const synthesis = await agent(
  `${RULES}\n\n${BASELINE}\n\nLens findings:\n${JSON.stringify(lensResults.filter(Boolean), null, 2)}\n\nAssassin verdict:\n${surviving}\n\n` +
  `Synthesize for Daniel (repo owner, wants surgical genius not abstraction). Deliver: (1) THE SINGLE STRONGEST unprecedented thesis that survived the assassin — is it the baseline, a deepening of it, or a genuinely different leap? State it in one crisp sentence then formalize it (theorem-shaped). (2) Why it revolutionizes computing AND AI simultaneously — concrete mechanism, not adjectives. (3) The exact first build step on the CURRENT atomic code (named file/function). (4) The honest failure mode that would make it NOT revolutionary, and the one experiment that would falsify-or-confirm it fastest. (5) A ranked shortlist of the runner-up leaps worth pursuing. Flowing expert prose, zero filler.`,
  { label: 'synthesis', phase: 'Synthesis' }
);

return { lensResults: lensResults.filter(Boolean), assassin: surviving, synthesis };
