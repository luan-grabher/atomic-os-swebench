export const meta = {
  name: 'dgm-in-atomic-verdict',
  description: 'Read-only forensic: is a Darwin-Godel Machine genuinely unified+validated inside atomic, and does it change the novel-vs-revolutionary verdict?',
  phases: [
    { title: 'Descobrir', detail: 'parallel read-only scouts over the live (actively-mutated) atomic tree' },
    { title: 'Verificar', detail: '3 independent skeptics try to refute the revolutionary claim' },
    { title: 'Veredito', detail: 'synthesize a grounded honest verdict from evidence + votes' },
  ],
}

const ENGINE = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'
const REPO = '/Users/danielpenin/kloel'

const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'findings', 'summary'],
  properties: {
    area: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'evidence', 'wired', 'significance'],
        properties: {
          claim: { type: 'string', description: 'one concrete factual claim about the current code' },
          evidence: { type: 'string', description: 'file:line, command output, or proof result that grounds the claim' },
          wired: { type: 'string', enum: ['wired-and-proven', 'wired-unproven', 'island-defined-but-unconsumed', 'aspirational-docs-only', 'absent', 'unknown'] },
          significance: { type: 'string', enum: ['load-bearing', 'supporting', 'minor'] },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const VOTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'refuted', 'confidence', 'reasoning', 'strongestCounterEvidence'],
  properties: {
    lens: { type: 'string' },
    refuted: { type: 'boolean', description: 'true if the revolutionary claim FAILS under this lens' },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    strongestCounterEvidence: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'isRevolutionary', 'dgmLoopClosed', 'proofCarryingAdmission', 'whatIsRealNow', 'whatIsStillIslandOrAspirational', 'noveltyDelta', 'honestVerdictPtBr', 'nextConcreteStepToRaiseClaim'],
  properties: {
    headline: { type: 'string' },
    isRevolutionary: { type: 'string', enum: ['no', 'not-yet', 'genuinely-novel-pair', 'yes-with-caveats', 'yes'] },
    dgmLoopClosed: { type: 'boolean', description: 'propose -> empirically-validate -> proof-admit -> promote -> archive -> reuse, all wired' },
    proofCarryingAdmission: { type: 'boolean', description: 'self-modifications gated by atomic proof admission (the Godel half), not only empirical (the Darwin half)' },
    whatIsRealNow: { type: 'array', items: { type: 'string' } },
    whatIsStillIslandOrAspirational: { type: 'array', items: { type: 'string' } },
    noveltyDelta: { type: 'string', description: 'how this changes the prior novel-but-not-revolutionary verdict' },
    honestVerdictPtBr: { type: 'string', description: 'the grounded verdict in Brazilian Portuguese, no hype, no sycophancy' },
    nextConcreteStepToRaiseClaim: { type: 'string' },
  },
}

phase('Descobrir')
log('Investigando o atomic VIVO (outro agent edita agora — read-only, sem mutacoes).')

const READONLY = `HARD CONSTRAINT: another agent is ACTIVELY editing this tree right now and holds file locks. You are STRICTLY READ-ONLY. Never call any atomic mutation tool, never Edit/Write, never git commit/add/checkout. Use Read/Grep/Glob and read-only atomic MCP tools (atomic_read_file, atomic_grep, atomic_glob, atomic_lens, atomic_y_certificate, atomic_self_evolution mode:self-test/verify-*, atomic_native_status, atomic_exec ONLY for read-only commands like rg/cat/git-status/git-log/git-diff). The tree may be half-written mid-edit — report that honestly rather than treating a transient state as final. Always ground every claim in a file:line or a literal command/tool output.`

const ENGINE_CTX = `Engine root: ${ENGINE} (flat layout — NOT under src/). Repo root: ${REPO}. Note: scripts/ is gitignored, so the native Grep/Glob harness tools and atomic_grep return 0 there; use atomic_exec with \`rg --no-ignore\` (read-only) inside the engine dir, or Read on absolute paths.`

const discovery = await parallel([
  () => agent(`${READONLY}\n${ENGINE_CTX}\n\nAREA = git-state-and-live-edits. Determine what the other agent is changing RIGHT NOW and the DGM-related history. Run (read-only): \`git -C ${REPO} status --porcelain\`, \`git -C ${REPO} diff --stat\`, \`git -C ${REPO} log --oneline -40\`, \`git -C ${REPO} log --oneline -60 --grep -E -i 'darwin|godel|gödel|dgm|self.?evol|archive|promot|lineage|variant'\`. Identify: which files are dirty, whether DGM/self-evolution files are among them, the 2 active locks (atomic_lock_status if available), and recent commits about evolution. Report whether the DGM work is committed, uncommitted-in-flight, or not yet present.`, { label: 'git-state', phase: 'Descobrir', schema: DISCOVERY_SCHEMA, agentType: 'Explore' }),

  () => agent(`${READONLY}\n${ENGINE_CTX}\n\nAREA = dgm-census. Find EVERY file/symbol in the engine and repo related to a Darwin-Godel Machine. Use \`rg --no-ignore -ni\` inside ${ENGINE} for: darwin, godel, gödel, dgm, self.?evolution, stepping.?stone, open.?ended, empirical, benchmark, variant, lineage, mutation, archive, promotion, candidate, parent, fitness, generation. For each hit file, briefly say what it defines. Distinguish files that DEFINE machinery from files that are .proof.mjs (tests) or docs (.md). Produce a census: file -> concept -> defined/tested/documented.`, { label: 'dgm-census', phase: 'Descobrir', schema: DISCOVERY_SCHEMA, agentType: 'Explore' }),

  () => agent(`${READONLY}\n${ENGINE_CTX}\n\nAREA = self-evolution-mechanics. Read in FULL: ${ENGINE}/self-evolution-harness.mjs and ${ENGINE}/server-tools-self-evolution.ts. Also inspect the atomic_self_evolution MCP tool by calling it read-only: mode:'self-test', and inspect modes decide/receipt/verify-receipt/verify-archive-chain semantics from the code. Answer precisely: (1) Is the self-improvement LOOP closed end-to-end — propose candidate -> validate -> admit -> promote -> tamper-evident archive -> reuse/lineage? Which steps are wired vs stubbed? (2) What exactly is a "promotion decision" and a "proof-carrying promotion receipt"? (3) Is rejection of a bad candidate a real deterministic verification result or a hidden failure? Quote code.`, { label: 'self-evo-mechanics', phase: 'Descobrir', schema: DISCOVERY_SCHEMA }),

  () => agent(`${READONLY}\n${ENGINE_CTX}\n\nAREA = godel-vs-darwin-wiring. The CRUX: in a Darwin-Godel Machine, Darwin = empirical validation + archive of variants; Godel = self-modification admitted by PROOF. Determine whether atomic's self-evolution admits self-modifications through its PROOF gates (engine-gate-registry.ts, the gates/ dir, byte-floor write admission, converge/intent-converge, capabilityMonotonicity, selfExpansionValidatorLattice) — i.e. is promotion gated by proof, or only by empirical benchmark pass? Trace the call path from a promotion decision to any gate/proof admission. Read engine-gate-registry.ts, server-helpers-self-expansion.ts, server-tools-self.ts (atomic_expand_self), and how self-evolution connects (or does NOT connect) to them. State clearly: is the Godel (proof) half actually wired to the Darwin (archive) half, or are they two separate islands?`, { label: 'godel-darwin-link', phase: 'Descobrir', schema: DISCOVERY_SCHEMA }),

  () => agent(`${READONLY}\n${ENGINE_CTX}\n\nAREA = selfEvolutionAdmission-RED + negative-proof island re-check. (1) The mcp-controlled Y-certificate reports domain selfEvolutionAdmission = RED with "self-evolution MCP proof could not run: Unexpected end of JSON input". Run atomic_y_certificate scope:'mcp-controlled' yourself, read the proof file behind selfEvolutionAdmission (find it under ${ENGINE}, likely a .proof.mjs invoked by engine-gate-registry.ts), and diagnose: is the RED a genuine capability gap, or the other agent's DGM work mid-flight breaking a proof transiently? (2) Re-verify on the CURRENT tree my earlier finding: does ANY file import/consume server-helpers-negative-proof.ts (requireNegativeActionProof / recomputeDisproof / DisproofWitness)? Does the string commute/invariant appear anywhere? Use \`rg --no-ignore\`. Report wired-vs-island honestly.`, { label: 'red-and-islands', phase: 'Descobrir', schema: DISCOVERY_SCHEMA }),

  () => agent(`You are grounding the prior-art so a novelty claim can be judged honestly. Research and report precisely, with citations: (1) Schmidhuber's Godel Machine — what it requires (provably optimal self-rewrite via proof search), and why it was never practically realized (proof search undecidable/intractable). (2) Sakana AI's Darwin Godel Machine (2025) — how it works (frozen-foundation-model coding agent self-modifies its own code, EMPIRICAL validation on coding benchmarks SWE-bench/Polyglot, open-ended ARCHIVE of all variants for stepping-stones, NO provable-improvement requirement), and its stated limitations. (3) The precise conceptual GAP between them: DGM trades Godel's provability for Darwin's empiricism. (4) Therefore: what would it MEAN, and would it be genuinely novel, to build a DGM whose self-modifications are admitted by a PROOF-CARRYING edit substrate (re-introducing a decidable, bounded proof gate that Sakana dropped) rather than only empirical benchmark pass? Is anyone else doing proof-carrying self-modification admission? Be precise about what is and isn't prior art.`, { label: 'prior-art', phase: 'Descobrir', schema: DISCOVERY_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' }),
])

const dossier = discovery.filter(Boolean)
log(`Descoberta completa: ${dossier.length}/6 dossies. Iniciando refutacao adversarial.`)

const dossierJson = JSON.stringify(dossier, null, 1)

phase('Verificar')
const CLAIM = 'A Darwin-Godel Machine esta GENUINAMENTE unificada e validada dentro do atomic — loop fechado (propor->validar->admitir-por-prova->promover->arquivar->reusar) com admissao PROOF-CARRYING (a metade Godel realmente conectada a metade Darwin), e isso eleva o atomic de "novo-mas-nao-revolucionario" para genuinamente sem-precedentes.'

const lenses = [
  { key: 'wiring-skeptic', focus: 'Closure & wiring: is the loop ACTUALLY closed end-to-end, or are there islands (defined-but-unconsumed modules) like the negative-proof carrier? An island kills the claim. Default to refuted=true if any load-bearing step is stubbed/island/aspirational.' },
  { key: 'godel-purist', focus: 'Is the GODEL half real? A DGM that only validates empirically (benchmark pass) is just Sakana DGM re-implemented — NOT novel. The claim survives ONLY if self-modifications are admitted by an actual PROOF gate (decidable/bounded), wired to promotion. If promotion is gated only by tests/benchmarks, refute.' },
  { key: 'prior-art-skeptic', focus: 'Even if real and wired, is it NOVEL vs Sakana DGM + Schmidhuber + the proof-carrying-code literature + atomic\'s own already-known (a)+(e) pair? Distinguish "impressive engineering synthesis" from "revolutionary/unprecedented". Hold the bar high; refute if it is a competent integration of known parts.' },
]

const votes = (await parallel(lenses.map(l => () =>
  agent(`You are an ADVERSARIAL verifier. Your job is to REFUTE, not to agree. Lens: ${l.key}.\nFocus: ${l.focus}\n\nCLAIM UNDER TEST:\n${CLAIM}\n\nEVIDENCE DOSSIER (grounded findings from read-only forensics of the live tree):\n${dossierJson}\n\nJudge ONLY from this evidence. If the evidence is insufficient to AFFIRM a load-bearing sub-claim, that counts toward refuted. Be precise and cite the dossier findings. Default to refuted=true under uncertainty.`,
    { label: `refute:${l.key}`, phase: 'Verificar', schema: VOTE_SCHEMA })
))).filter(Boolean)

const refuteCount = votes.filter(v => v.refuted).length
log(`Votos de refutacao: ${refuteCount}/${votes.length}.`)

phase('Veredito')
const verdict = await agent(`Synthesize the FINAL honest verdict. You are the grounded check against hype — the user is excited and expects to be amazed, but your duty is accuracy, not flattery, and equally not cynicism. Reward what is genuinely real.\n\nQUESTION: Is a Darwin-Godel Machine genuinely unified+validated inside atomic, and does it make atomic revolutionary?\n\nEVIDENCE DOSSIER:\n${dossierJson}\n\nADVERSARIAL VOTES (${refuteCount}/${votes.length} refuted the revolutionary claim):\n${JSON.stringify(votes, null, 1)}\n\nProduce the verdict per schema. Rules: ground every conclusion in the dossier; separate "real & wired now" from "island/aspirational/in-flight"; be explicit about whether the loop is closed and whether admission is proof-carrying (the Godel half). honestVerdictPtBr must be Brazilian Portuguese, direct, no English jargon, no sycophancy, ~4-7 sentences. nextConcreteStepToRaiseClaim must be the single highest-leverage wiring step.`,
  { label: 'synthesis', phase: 'Veredito', schema: VERDICT_SCHEMA })

return { verdict, refuteCount, totalVotes: votes.length, dossierAreas: dossier.map(d => d.area), votes }
