export const meta = {
  name: 'atomic-latent-revolution-swarm',
  description: 'Swarm reads the COMPLETE current atomic-edit state and discovers CONCRETE, non-abstract, unprecedented opportunities to revolutionize computing+AI latent in what already exists. Hard anti-abstraction filter.',
  phases: [
    { title: 'Inventory', detail: 'map the real current atomic state: tools, gates, engine, receipts, exec, A/B — with file:line' },
    { title: 'Discover', detail: '14 parallel veins, each from a real capability combination → concrete unprecedented opportunity' },
    { title: 'Filter', detail: 'adversarial: kill abstract/derivative; keep concrete+unprecedented+buildable+revolutionary' },
    { title: 'Synthesize', detail: 'rank survivors; the top concrete revolutions, build-from-what-exists' },
  ],
}

const REPO = '/Users/danielpenin/whatsapp_saas'
const ATOMIC = `${REPO}/scripts/mcp/atomic-edit`

const INVENTORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    capabilities: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        name: { type: 'string' },
        whatItDoes: { type: 'string' },
        fileLine: { type: 'string', description: 'real file:line or tool name that exists TODAY' },
        latentPower: { type: 'string', description: 'a capability it has that is currently UNDER-exploited' },
      },
      required: ['name', 'whatItDoes', 'fileLine'],
    } },
    surprising: { type: 'array', items: { type: 'string' }, description: 'the most surprising/under-exploited things actually in the code' },
  },
  required: ['capabilities', 'surprising'],
}

const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    vein: { type: 'string' },
    candidates: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'a concrete, nameable technology/capability' },
        existingPiecesCombined: { type: 'array', items: { type: 'string' }, description: 'REAL tool names / file:line that exist TODAY and that this combines' },
        unprecedentedClaim: { type: 'string', description: 'the specific thing no system does today' },
        closestPriorArt: { type: 'string' },
        whyPriorArtFallsShort: { type: 'string' },
        minimalBuild: { type: 'string', description: 'the smallest concrete addition to ship it, given the embryos' },
        computingImpact: { type: 'string' },
        aiImpact: { type: 'string' },
        concreteness: { type: 'string', enum: ['concrete', 'abstract'], description: 'self-judge: could this have been written WITHOUT reading the atomic source? if yes -> abstract' },
        discardIfAbstract: { type: 'string', description: 'if abstract or already-exists, say so plainly' },
      },
      required: ['name', 'existingPiecesCombined', 'unprecedentedClaim', 'minimalBuild', 'computingImpact', 'aiImpact', 'concreteness'],
    } },
  },
  required: ['vein', 'candidates'],
}

const FILTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    isConcrete: { type: 'boolean', description: 'grounded in real existing atomic pieces, not a category/abstraction' },
    unprecedented: { type: 'string', enum: ['yes', 'partial', 'no'] },
    buildableFromExisting: { type: 'boolean' },
    revolutionary: { type: 'string', enum: ['yes', 'partial', 'no'], description: 'genuinely changes computing AND AI, vs merely a strong product' },
    strongestObjection: { type: 'string' },
    survives: { type: 'boolean' },
    sharpenedClaim: { type: 'string', description: 'the concrete claim, sharpened, if it survives' },
  },
  required: ['name', 'isConcrete', 'unprecedented', 'buildableFromExisting', 'revolutionary', 'survives'],
}

// ---------- Phase 1: Inventory the real current state ----------
phase('Inventory')
const inventory = await agent(
  `Read the COMPLETE current state of the atomic-edit MCP and produce a CONCRETE capability inventory with real file:line / tool names. Read broadly under ${ATOMIC}:\n`
  + `- the tool registry: server-tools-*.ts (list the real tool names), server.ts\n`
  + `- the engine + firewall: engine.ts, server-helpers-io.ts (atomicWrite), server-helpers-effect.ts\n`
  + `- the gates: gates/registry.ts, gates/contract.ts, every gates/*-gate.ts (connection, syntax, supply-chain, type-soundness, contract-edge, reachability, binding, render-conformance, telemetry-emission, iac-reference, findings-delta, probe-convergence, deterministic-harness, property, formal, liveness), gates/lens.ts, gates/repair.ts, gates/perception.ts\n`
  + `- perception: native-bridge.ts (web-tree-sitter)\n`
  + `- exec + security: server-tools-exec.ts (atomic_exec), server-tools-f.ts (atomic_bypass_report)\n`
  + `- receipts/trust: any truth_receipt / zero_code_trust / behavior_receipt / product_intent_contract / continuity_status tool\n`
  + `Also note the A/B self-improvement harness exists at ${REPO}-ab/ and the self-proving smoke (232/0) + *.proof.ts.\n\n`
  + `GOAL: a precise map of what EXISTS, and for each, its LATENT/under-exploited power (a capability the code already has that nobody has pushed to its extreme). Be specific and cite file:line or exact tool names. This map seeds a discovery swarm — make it concrete enough that creative recombination is possible.`,
  { label: 'inventory:current-state', phase: 'Inventory', schema: INVENTORY_SCHEMA },
)
const invDigest = `CURRENT ATOMIC STATE (real, with file:line):\n`
  + inventory.capabilities.map((c) => `- ${c.name} [${c.fileLine}]: ${c.whatItDoes}${c.latentPower ? ` — LATENT: ${c.latentPower}` : ''}`).join('\n')
  + `\n\nMost surprising/under-exploited:\n` + inventory.surprising.map((s) => `- ${s}`).join('\n')
log(`Inventory done: ${inventory.capabilities.length} real capabilities mapped. Firing 14 discovery veins.`)

// ---------- Phase 2+3: Discover (pipelined into adversarial Filter) ----------
phase('Discover')
const VEINS = [
  { key: 'proof-carrying-history', seed: 'The char/byte TRACE (provenance of every mutation) + content-addressing + the gate-verdicts recorded at each step. What if the repo HISTORY itself were a verifiable PROOF CHAIN, not a diff log? bisect-by-proof; query "every mutation that converged property P". Contrast git (stores diffs, not proofs) and Unison (content-addressed but no mutation-proof-chain).' },
  { key: 'transactional-computer', seed: 'atomic_exec (universal /bin/bash -c in the snapshot→validate→trace→rollback envelope) + the byte-floor firewall. Extend the envelope to ALL effects (network, DB, process), not just file writes → every computational action becomes a verified, reversible transaction. A TRANSACTIONAL COMPUTER for the whole dev act. Contrast transactional memory, WAL, Docker.' },
  { key: 'safe-recursive-self-improvement', seed: 'The A/B harness (atomic-vs-normal, 55 rounds, won all discriminating tiers) + the self-proving smoke (232/0) + the inescapable firewall. The OS writes its OWN next version THROUGH its own floor, A/B-tests it against itself, and promotes only the measured-winner that also passes convergence. Recursive self-improvement WITH a built-in safety substrate — the thing AI-safety fears, made safe by construction.' },
  { key: 'self-healing-organism', seed: 'The lens (whole-repo gates, proven zero-FP over 6043 files) + repairScope (the HAND/LOOP: correct-by-construction self-repair). Point it at ANY repo and it drives the whole tree to a global green fixed-point continuously. A "compiler for correctness" / self-healing codebase. Contrast linters (advisory), autofix (no convergence proof).' },
  { key: 'proof-bill-of-materials', seed: 'The numeric truth-receipt / zero_code_trust (caps at 60 until runtime-observed; ASSEMBLED+CONNECTED≠BREATHING). Make every artifact carry a signed, queryable certificate of WHAT WAS PROVEN about it (assembled/connected/typed/behavior/observed). A "Proof-Bill-of-Materials" — SBOM is what is IN it; nobody ships what is PROVEN about it. Contrast SBOM, SLSA, in-toto.' },
  { key: 'provably-safe-agent-swarm', seed: 'task-graph locks + the firewall + the lens. N agents mutate ONE large codebase concurrently and the result is GUARANTEED converged + collision-free + byte-reversible. The missing COORDINATION SUBSTRATE for agent fleets at scale. Contrast git worktrees (no convergence), merge (post-hoc), CRDTs (no correctness gate).' },
  { key: 'synthesis-by-convergence', seed: 'The floor knows the DELTA (ctx.priorOf: red-state-A vs candidate). Treat repair/synthesis as OPTIMIZATION over the convergence manifold: find the MINIMAL mutation moving the repo from red to green. Program synthesis by descent on gate-reds. Contrast SMT-based synthesis, genetic program repair.' },
  { key: 'ci-killer', seed: 'Every gate fires at WRITE-TIME (connection/type/contract/supply-chain/...). Push it to the extreme: CI becomes structurally redundant because red NEVER lands — correctness shifts left all the way to the byte. "The build cannot be red." What does an SDLC without CI look like? Contrast pre-commit hooks (advisory/skippable), trunk-based dev.' },
  { key: 'capability-security-kernel', seed: 'The deny-list + trace + owner-gate + atomic_bypass_report ledger. This is the embryo of an OBJECT-CAPABILITY security model for CODE MUTATION: an agent holds exactly the mutation-capabilities granted, every exercise traced, every bypass ledgered. The security/permission model for autonomous agents. Contrast filesystem perms, OS sandboxes, OAuth scopes.' },
  { key: 'behavior-diff-first-class', seed: 'The twin (twin_up/twin_shadow/twin_metrics) + fingerprint + behavior_receipt. Make "what BEHAVIOR changed between state A and state B" a FIRST-CLASS diff (not a text diff). A semantic deploy-diff: the PR shows behavioral deltas, not line deltas. Contrast snapshot tests, contract testing (Pact), semantic-release.' },
  { key: 'reversible-dev-time-travel', seed: 'The char/byte-level TRACE of every mutation. Time-travel over the DEVELOPMENT ACT itself (not program execution): rewind/replay any agent reasoning→bytes step, fork from any past convergence state. Contrast rr/record-replay (runtime), editor undo (no semantics/no gates).' },
  { key: 'receipt-as-merge-gate', seed: 'continuity_status + truth_receipt. Invert code review: the agent\'s machine-checked "I proved X (converged across gates G)" IS the merge gate; the human reviews the RECEIPT (a proof), not the diff. Review-by-proof. Contrast human PR review, required status checks.' },
  { key: 'universal-semantic-substrate', seed: 'web-tree-sitter perception + the (planned) LSP-absorption. ONE language-agnostic perception layer that EVERY tool (lint, refactor, nav, gate, search) shares and that improves once for all of them. The "semantic kernel" all dev tools borrow from. Contrast per-tool parsers, LSP-per-editor.' },
  { key: 'convergence-native-substrate', seed: 'The floor + perception + receipts together. A runtime/language where ill-converged states are UNREPRESENTABLE by construction (Hazel taken general). WARNING: this is the closest to an ABSTRACT answer already given — find the CONCRETE, shippable, different angle grounded in real atomic tools, or DISCARD it explicitly.' },
  { key: 'wildcard-cross-pollination', seed: 'IGNORE the seeds above. Read the inventory and find a combination of TWO OR MORE real existing atomic capabilities that NONE of the standard veins names — the non-obvious cross-pollination that only someone staring at the complete current state would see. Maximum creativity, but it MUST cite real existing pieces and be buildable. This is the slot for the genuinely surprising find.' },
]

const filterLensFor = (cand, lens, lensType) => agent(
  `Through the ${lens} lens, adversarially test this DISCOVERED opportunity. HARD anti-abstraction: if it could have been proposed without the atomic source, mark isConcrete=false and survives=false. Refute unprecedented/revolutionary with real prior art. Only survive if concrete + (unprecedented≥partial) + buildableFromExisting + (revolutionary≥partial).\n\n`
  + `OPPORTUNITY: ${cand.name}\nCombines (existing): ${(cand.existingPiecesCombined || []).join('; ')}\nClaim: ${cand.unprecedentedClaim}\nMinimal build: ${cand.minimalBuild}\nComputing impact: ${cand.computingImpact}\nAI impact: ${cand.aiImpact}\n\nAtomic state:\n${invDigest}`,
  { label: `filter:${cand.name.slice(0, 16)}`, phase: 'Filter', schema: FILTER_SCHEMA, ...(lensType ? { agentType: lensType } : {}) },
)

const veinResults = await pipeline(
  VEINS,
  (v) => agent(
    `DISCOVERY VEIN "${v.key}". Anti-abstraction is the law: every claim MUST cite a real atomic tool name or file:line that EXISTS TODAY; if your idea could have been written without reading the atomic source, it is ABSTRACT — discard it and say so. Read 1-2 of the real files relevant to this vein under ${ATOMIC} to ground yourself.\n\n`
    + `VEIN SEED:\n${v.seed}\n\n`
    + `CURRENT ATOMIC STATE:\n${invDigest}\n\n`
    + `Produce 1-2 CONCRETE candidate technologies. For each: a nameable capability, the REAL existing pieces it combines (file:line/tool), the precise UNPRECEDENTED claim, the closest prior art + why it falls short, the MINIMAL build to ship it from the embryos, and the dual computing+AI impact. Self-judge concreteness honestly. Goal: something one could start building Monday that, if it existed, mainstream would call unprecedented.`,
    { label: `discover:${v.key}`, phase: 'Discover', schema: DISCOVERY_SCHEMA },
  ),
  (disc) => parallel(
    (disc.candidates || []).filter((c) => c.concreteness === 'concrete').map((cand) => () =>
      parallel([
        () => filterLensFor(cand, 'prior-art historian (hunt the system that already does this)', 'compound-engineering:ce-web-researcher'),
        () => filterLensFor(cand, 'systems engineer (is it actually buildable from the named embryos, and concrete)', null),
        () => filterLensFor(cand, 'skeptic of revolution (argue it is merely a strong product, not a computing+AI revolution)', null),
      ]).then((vs) => {
        const v = vs.filter(Boolean)
        const survives = v.filter((x) => x.survives).length >= 2 && v.filter((x) => x.isConcrete).length >= 2
        return { candidate: cand, lensVerdicts: v, survives, vein: disc.vein }
      }),
    ),
  ),
)

const allJudged = veinResults.filter(Boolean).flat().filter(Boolean)
const survivors = allJudged.filter((j) => j.survives)
log(`Discovered ${allJudged.length} concrete candidates; ${survivors.length} survived the adversarial anti-abstraction filter.`)

// ---------- Phase 4: Synthesize ----------
phase('Synthesize')
const survivorBrief = (survivors.length ? survivors : allJudged)
  .map((j) => `### ${j.candidate.name} (vein ${j.vein}) — ${j.survives ? 'SURVIVED' : 'cut'}\n`
    + `Combines: ${(j.candidate.existingPiecesCombined || []).join('; ')}\n`
    + `Unprecedented: ${j.candidate.unprecedentedClaim}\n`
    + `Closest prior art: ${j.candidate.closestPriorArt || '—'} (falls short: ${j.candidate.whyPriorArtFallsShort || '—'})\n`
    + `Minimal build: ${j.candidate.minimalBuild}\n`
    + `Computing: ${j.candidate.computingImpact} | AI: ${j.candidate.aiImpact}\n`
    + `Verdicts: ${j.lensVerdicts.map((l) => `[${l.revolutionary}/unprec:${l.unprecedented}] ${(l.sharpenedClaim || l.strongestObjection || '').slice(0, 140)}`).join(' || ')}`)
  .join('\n\n')

const memo = await agent(
  `Write the final memo (markdown, PT-BR, CONCRETE, zero hype, zero abstraction) for the repo owner. He explicitly rejected an earlier ABSTRACT answer ("behavioral-intent floor" — a category, not a technology) and demanded the swarm find CONCRETE, unprecedented, computing+AI-revolutionizing opportunities LATENT in the complete current atomic state. `
  + `From the survivors below, deliver:\n`
  + `1. The TOP 3-5 concrete opportunities, RANKED by (unprecedented × buildable-from-what-exists × revolution-magnitude). For each: a one-line punchy name, the REAL existing atomic pieces it fuses (with file:line/tool), the single sentence of what NO system does today, the closest prior art and why it falls short, the MINIMAL build (shippable from the embryos), and exactly how it hits computing AND AI at once.\n`
  + `2. Be brutally concrete — each must be something buildable Monday from named existing pieces. If a candidate is secretly abstract or already-exists, CUT it and say why.\n`
  + `3. Name the SINGLE highest-leverage one to build first and why (max unprecedented-per-unit-effort given the embryos).\n`
  + `4. One honest paragraph: which of these is genuinely "revolutionizes computing+AI simultaneously" in the STRONG sense, and which are "merely" category-leading — no inflation.\n\n`
  + `SURVIVORS / CANDIDATES:\n${survivorBrief}`,
  { label: 'synthesize:revolution-memo', phase: 'Synthesize' },
)

return {
  memo,
  survivorCount: survivors.length,
  totalCandidates: allJudged.length,
  survivors: survivors.map((j) => ({ name: j.candidate.name, vein: j.vein, build: j.candidate.minimalBuild })),
}
