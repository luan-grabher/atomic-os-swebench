export const meta = {
  name: 'atomic-novelty-prior-art-audit',
  description: 'Is the inescapable convergence write-floor genuinely novel/unprecedented, and would mainstream adopt it? Map real prior art + adversarially test the 3 sub-claims.',
  phases: [
    { title: 'Survey', detail: 'map AI-agent edit tools + correct-by-construction + typed-codebase + verified-edit prior art' },
    { title: 'Adversarial', detail: 'try to refute novel / unprecedented / mainstream-would-adopt' },
    { title: 'Synthesize', detail: 'honest novelty verdict + regime scoping' },
  ],
}

const SURVEY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    area: { type: 'string' },
    closestPriorArt: { type: 'array', items: { type: 'string' }, description: 'named systems/papers and what each does' },
    doesRefuseRedByConstruction: { type: 'string', description: 'does any of them gate EVERY mutation at the write boundary (refuse-red-by-construction), or only post-hoc/advisory?' },
    gapVsAtomic: { type: 'string', description: 'what atomic does that these do NOT' },
    overlapWithAtomic: { type: 'string', description: 'what these already do that atomic claims as novel' },
    sources: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['area', 'closestPriorArt', 'doesRefuseRedByConstruction', 'gapVsAtomic', 'overlapWithAtomic'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['supported', 'refuted', 'partial'] },
    strongestCounterEvidence: { type: 'string' },
    reasoning: { type: 'string' },
  },
  required: ['claim', 'verdict', 'reasoning'],
}

// ---------- Phase 1: Survey the real landscape ----------
phase('Survey')
const surveys = [
  () => agent(
    `Survey AI-AGENT CODE-EDIT tools as of 2025-2026: Cursor (agent mode), GitHub Copilot agent / Copilot Workspace, Windsurf/Codeium, Aider, Claude Code, Devin, Cline, Zed AI, Morph, Sourcegraph Cody/Amp. `
    + `KEY QUESTION: how does each VERIFY/GATE an edit? Does ANY of them make verification ARCHITECTURALLY INESCAPABLE at the WRITE boundary — i.e. the edit only persists if it passes gates (refuse-red-BY-CONSTRUCTION) — or do they ALL write-then-check (post-hoc lint/test/CI you can skip)? `
    + `Be concrete: name the mechanism each uses. The atomic MCP being assessed makes EVERY byte-write pass a convergence chokepoint (syntax + dangling-import + supply-chain) that cannot be bypassed (no env flag). Is that present anywhere mainstream?`,
    { label: 'survey:agent-tools', phase: 'Survey', schema: SURVEY_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `Survey CORRECT-BY-CONSTRUCTION / TYPED-CODEBASE / structural-editor prior art. Cover especially: `
    + `Unison (codebase as content-addressed typed AST DB — a broken definition cannot be added), `
    + `projectional/structural editors (JetBrains MPS, Hazel, Lamdu — edit the AST so syntactic invalidity is impossible by construction), `
    + `Roslyn analyzers/code-fixes on-save, smalltalk/image-based environments, language workbenches, refinement types / "correct by construction" formal methods. `
    + `KEY QUESTION: which of these enforce an invariant AT THE POINT OF MUTATION (not post-hoc)? Which is the CLOSEST comparable to "every edit must converge green or it never lands"? Does Unison's model already embody refuse-red-by-construction?`,
    { label: 'survey:cbc-typed', phase: 'Survey', schema: SURVEY_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `Survey TYPE-AWARE and TRANSACTIONAL edit gating. Cover: tsc --watch / "no broken save" workflows, LSP publishDiagnostics as a gate, pre-commit/husky/lefthook, git hooks, "compile-gate in CI", editor "format/fix on save", transactional refactoring engines (IntelliJ refactors that abort if they'd break references), database-style transactional file edits, Dark/Darklang's "no broken deploys / deployless" model. `
    + `KEY QUESTION: does any tool REFUSE A WRITE/SAVE on TYPE regression at the boundary (vs CI/post-hoc)? The atomic MCP proposes a type-aware write-floor (incremental tsc on in-memory overlay refusing type regression at the same chokepoint as its connection gate). How novel is gating TYPE-SOUNDNESS at the write floor specifically?`,
    { label: 'survey:type-transactional', phase: 'Survey', schema: SURVEY_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
  () => agent(
    `Survey (a) RUNTIME/PROPERTY verification gated on edits, and (b) PROVENANCE/honesty framing for AI edits. `
    + `Cover: property-based testing (QuickCheck/Hypothesis), metamorphic testing, runtime-verification monitors, mutation testing, "verify-in-prod" canary gates, and any system that REFUSES an edit unless a behavioral property holds. `
    + `Also: provenance/attestation on AI-generated code, "trust score" / confidence receipts, SLSA/in-toto for code. `
    + `KEY QUESTION: does any system gate a code MUTATION on a BEHAVIORAL property at the write/commit floor (not just run tests in CI)? And does anyone ship an explicit "honesty ceiling" receipt that says 'I proved assembled+connected but NOT that it runs correctly'? The atomic MCP has dynamic gates (instrument→run→revert-exact-bytes) + a zeroCodeTrust that caps at 60 until runtime-observed. How novel is that honesty-ceiling stance?`,
    { label: 'survey:runtime-provenance', phase: 'Survey', schema: SURVEY_SCHEMA, agentType: 'compound-engineering:ce-web-researcher' },
  ),
]
const surveyResults = (await parallel(surveys)).filter(Boolean)
const surveyDigest = surveyResults
  .map((s) => `### ${s.area}\nClosest prior art: ${(s.closestPriorArt || []).join('; ')}\nRefuse-red-by-construction present? ${s.doesRefuseRedByConstruction}\nGap vs atomic: ${s.gapVsAtomic}\nOverlap (atomic NOT unique): ${s.overlapWithAtomic}`)
  .join('\n\n')
log(`Surveyed ${surveyResults.length}/4 landscapes. Adversarially testing the 3 novelty sub-claims.`)

// ---------- Phase 2: Adversarial test of the 3 sub-claims ----------
phase('Adversarial')
const CLAIMS = [
  'NOVEL KERNEL: making verification architecturally INESCAPABLE at the byte-write boundary — every AI-agent mutation must converge green (syntax + connection + supply-chain) or it never persists, with no bypass flag — is genuinely novel for AI-agent edit tooling; no mainstream agent tool (Cursor/Copilot/Windsurf/Aider/Devin/Claude Code) does refuse-red-by-construction at the write floor, they all write-then-check post-hoc.',
  'UNPRECEDENTED: the convergence write-floor is unprecedented as a whole. (Try HARD to refute using the closest comparable — Unison typed-codebase, projectional editors, refinement types, Darklang — and judge whether atomic is piece-novel, synthesis-novel, or genuinely unprecedented.)',
  'MAINSTREAM WOULD ADOPT MASSIVELY: if mainstream agent-tool vendors saw this, they would implement it massively. (Refute by surfacing WHY they deliberately do NOT gate writes this way — speed, incremental UX, the legitimate need to save broken intermediate states — and identify the specific REGIME where the inescapable floor actually wins.)',
]
const LENSES = ['prior-art historian (find the closest thing that already exists)', 'product/market realist (would vendors actually ship this, and why/why not)', 'steelman-the-owner (argue the claim is MORE true than it looks)']
const verdicts = await parallel(
  CLAIMS.map((claim) => () =>
    parallel(
      LENSES.map((lens) => () =>
        agent(
          `Through the ${lens} lens, rigorously test this claim — try to REFUTE it first; if you cannot, mark supported; if conditionally true, mark partial with the condition. Cite concrete systems/mechanisms, not vibes.\n\nCLAIM:\n${claim}\n\nLandscape evidence:\n${surveyDigest}`,
          { label: `adv:${lens.slice(0, 12)}`, phase: 'Adversarial', schema: VERDICT_SCHEMA },
        ),
      ),
    ).then((vs) => {
      const v = vs.filter(Boolean)
      const refuted = v.filter((x) => x.verdict === 'refuted').length
      const partial = v.filter((x) => x.verdict === 'partial').length
      return { claim, lensVerdicts: v, net: refuted >= 2 ? 'REFUTED' : partial >= 2 ? 'PARTIAL' : 'SUPPORTED', refuted, partial }
    }),
  ),
)

// ---------- Phase 3: Synthesize ----------
phase('Synthesize')
const memo = await agent(
  `Write the final honest memo (markdown, PT-BR, tight) for the repo owner, who claims the atomic MCP is "a revolutionary, potentially UNPRECEDENTED technology that mainstream would implement massively if they saw it." `
  + `Engage as an intellectual equal, not a flatterer. Deliver:\n`
  + `1. The ONE genuinely strong/novel kernel, stated precisely (inescapable convergence write-floor for AI-agent mutations).\n`
  + `2. The honest novelty grade: piece-novel vs synthesis-novel vs unprecedented — name the closest prior art (esp. Unison, projectional editors, Darklang) and say exactly how atomic differs and where it does NOT.\n`
  + `3. The "mainstream would adopt" verdict: refute or scope it — identify the REGIME where the inescapable floor genuinely wins (autonomous agents / high-assurance / locked codebases) vs where mainstream's write-then-check is a deliberate, correct tradeoff (interactive humans saving broken intermediate states, speed-saturated axis).\n`
  + `4. A crisp "what would actually make mainstream copy it" — the conditions under which the regime-bound advantage generalizes.\n`
  + `5. Flag any sub-claim the adversarial pass REFUTED or marked PARTIAL and adjust honestly.\n`
  + `Be specific and quotable. Avoid hype words. The goal is to give the owner the most accurate possible read so he scopes the 'revolutionary' claim correctly.\n\n`
  + `SURVEY EVIDENCE:\n${surveyDigest}\n\nADVERSARIAL VERDICTS:\n${verdicts.map((v) => `- [${v.net}] ${v.claim.slice(0, 100)}... (refuted ${v.refuted}/partial ${v.partial})${v.lensVerdicts.map((l) => `\n    · ${l.verdict} — ${(l.strongestCounterEvidence || l.reasoning).slice(0, 200)}`).join('')}`).join('\n')}`,
  { label: 'synthesize:novelty-memo', phase: 'Synthesize' },
)

return { memo, claimNetVerdicts: verdicts.map((v) => ({ net: v.net, refuted: v.refuted, partial: v.partial, claim: v.claim.slice(0, 110) })) }
