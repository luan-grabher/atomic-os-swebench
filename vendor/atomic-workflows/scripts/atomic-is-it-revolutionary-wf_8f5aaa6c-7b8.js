export const meta = {
  name: 'atomic-is-it-revolutionary',
  description: 'Honest, grounded assessment of whether the atomic-edit MCP is revolutionary — understand the real system, situate vs prior art, adversarially challenge the claim',
  phases: [
    { title: 'Understand', detail: 'read what atomic-edit actually does, its gates, doctrine, history' },
    { title: 'Situate', detail: 'web research: structural editing, verified refactoring, AI apply, capability security prior art' },
    { title: 'Challenge', detail: 'adversarial lenses stress-test the revolutionary claim' },
  ],
}

const ROOT = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'keyPoints', 'evidence', 'noveltyAssessment'],
  properties: {
    summary: { type: 'string', description: '3-6 sentence summary of what you found' },
    keyPoints: { type: 'array', items: { type: 'string' }, description: 'concrete, specific facts (not vague praise)' },
    evidence: { type: 'array', items: { type: 'string' }, description: 'file:line refs or URLs that ground each claim' },
    noveltyAssessment: { type: 'string', description: 'your honest read of what here is genuinely new vs known prior art' },
  },
}

// ---------- Phase 1: Understand (codebase) + Phase 2: Situate (web), all independent ----------
phase('Understand')

const understandThunks = [
  () => agent(
    `You are inspecting a real code-editing engine at ${ROOT} (47k LOC). Read the CORE MECHANISM and TOOL SURFACE. ` +
    `Read: README.md, ATOMIC_FIELD.md, server.ts, server-tools-*.ts (skim names + a few bodies), engine.ts, server-helpers-io.ts, atomic-only-hook.mjs. ` +
    `Answer concretely: What does an "atomic edit" actually guarantee here (sha256 before/after? syntax-validate-before-disk? AST-typed ops?)? ` +
    `What is the tool surface (how many tools, what categories: AST ops, rename, anchors, sessions/transactions, exec, self-expansion)? ` +
    `What does "validate-before-disk / nothing-wrong-ever-originated" mean operationally in the code? ` +
    `Be precise and skeptical — distinguish what is IMPLEMENTED AND PROVEN from what is aspirational comment.`,
    { label: 'understand:mechanism', phase: 'Understand', agentType: 'Explore', schema: FINDINGS }
  ),
  () => agent(
    `You are inspecting the GATE / PROOF architecture of a code-editing engine at ${ROOT}/gates/ (120+ files). ` +
    `List the categories of gates (formal-gate.ts, type-soundness-gate, security-gate, supply-chain-gate, public-contract-gate, no-bypass-static-policy, negative-*-admission, y-certificate-*, etc). ` +
    `Read formal-gate.ts specifically — does it cite Rice's theorem / decidability limits? Read no-bypass-static-policy.proof.mjs and a couple of negative-*-admission proofs and y-certificate proofs. ` +
    `Answer: What is actually PROVEN by these .proof.mjs gates vs merely asserted? What does the "byte-positive only if a gate proves it positive; unproven≡negative" doctrine look like in enforcement? ` +
    `What does "no-bypass" mean (the agent CLI physically cannot act outside Atomic)? How is self-extension ("use Atomic to extend Atomic") gated? ` +
    `Be a skeptic: which proofs are real adversarial proofs and which are weak tautologies?`,
    { label: 'understand:gates', phase: 'Understand', agentType: 'Explore', schema: FINDINGS }
  ),
  () => agent(
    `Read the DOCTRINE and HONEST-CEILING material at ${ROOT}: ATOMIC_FIELD.md fully, ENFORCEMENT_SETUP.md, and skim guard.ts, security-invariants.mjs, bypass-classify.mjs, bypass-report.mjs. ` +
    `Also examine claude-atomic-host-launcher.mjs and atomic-edit-mcp-launcher.sh (in ../ if needed) to understand the "host sandbox / no-bypass envelope / MCP-dormant-in-normal-sessions" constraint. ` +
    `Answer: What is the stated ambition (the doctrine: byte-positive-by-construction, no-bypass, self-extension-only, monotonic capability)? ` +
    `What is the HONEST CEILING the system itself acknowledges (Rice's theorem / decidability — does the code itself admit undecidability)? ` +
    `What is the gap between ambition and what currently runs (e.g. the MCP not self-hosting in a normal Claude session, the hook being dormant)? ` +
    `Be brutally honest about ambition-vs-reality.`,
    { label: 'understand:doctrine', phase: 'Understand', agentType: 'Explore', schema: FINDINGS }
  ),
  () => agent(
    `Analyze the GIT HISTORY and trajectory of ${ROOT} to gauge how real and how deep the engineering is. ` +
    `Run: cd /Users/danielpenin/kloel && git log --oneline -60 -- scripts/mcp/atomic-edit/ ; git log --oneline --since="2026-05-20" -- scripts/mcp/atomic-edit/ | wc -l ; and look at a few commit diffs (git show --stat <hash>) for commits like "the LOOP repairScope heals an entire tree", "type-soundness gate", "inescapable convergence at the byte-write floor", "collapse the full-codebase FP rate 22,023 reds -> ~10". ` +
    `Answer: Is this a sustained, iterating engineering effort or a one-shot? What were the hardest real problems solved (false-positive collapse, byte-floor mode preservation, receipt-forgery, etc)? ` +
    `What does the cadence reveal about whether real bugs were found and fixed in the engine itself (self-correction loop)? Be specific with commit evidence.`,
    { label: 'understand:history', phase: 'Understand', agentType: 'Explore', schema: FINDINGS }
  ),
]

phase('Situate')
const situateThunks = [
  () => agent(
    `Web research: the STATE OF THE ART in STRUCTURAL / AST-BASED CODE EDITING. Cover: ast-grep, comby, jscodeshift/recast, OpenRewrite (lossless semantic trees), Coccinelle/SmPL (semantic patch), tree-sitter, Roslyn/Roslynator analyzers+fixers, LSP rename/refactor (workspace edits), Eclipse JDT refactoring, IntelliJ structural search & replace, GumTree (AST diff), Wasm/structural editors (Hazel). ` +
    `For each: what guarantee does it give (syntax-preserving? type-preserving? verified?), and what does it NOT guarantee. ` +
    `Then answer the noveltyAssessment field: relative to this prior art, what is genuinely new about an engine that does sha256-pinned, syntax-validate-before-disk, AST-typed atomic ops with a per-edit proof receipt? What is NOT new?`,
    { label: 'situate:structural', phase: 'Situate', agentType: 'general-purpose', schema: FINDINGS }
  ),
  () => agent(
    `Web research: VERIFIED / CORRECT-BY-CONSTRUCTION program transformation, and CAPABILITY-SECURITY / SANDBOXED-EDIT prior art. Cover: CompCert/verified compilers, verified refactoring research, proof-carrying code, refinement types, "correct by construction"; capability security (object-capability model, Capsicum, seccomp/sandbox-exec, deno permissions); and the idea of a tool that is the SOLE permitted mutation path (write-brokers, no-bypass envelopes). Also: monotonic capability / safety-non-decreasing extension. ` +
    `Then answer noveltyAssessment: is there prior art for a CODE EDITOR that (a) treats "unproven == unsafe/negative", (b) makes itself the only physically-permitted edit path for an AI agent, and (c) can only be extended through itself under the same proof discipline? Is that combination known or novel?`,
    { label: 'situate:verified-capsec', phase: 'Situate', agentType: 'general-purpose', schema: FINDINGS }
  ),
  () => agent(
    `Web research: AI CODE-EDITING / "APPLY" MODELS and AGENT EDIT SAFETY as of 2025-2026. Cover: Cursor's apply/fast-apply model, Morph, Aider's diff/edit formats, Claude/OpenAI tool-based file edits, Sourcegraph Cody, search-replace block formats, and any work on "guarded" or "verified" AI edits (syntax check before write, AST-aware patches). Also any agent frameworks that gate tool use behind proofs/policies. ` +
    `Then answer noveltyAssessment: against how AI coding agents actually edit files today (mostly string/diff apply with optional lint), how unusual is a per-edit proof-receipt + adversarial-gate + no-bypass model? Where does it sit on a spectrum from "incremental hardening of apply" to "genuinely new category"?`,
    { label: 'situate:ai-apply', phase: 'Situate', agentType: 'general-purpose', schema: FINDINGS }
  ),
]

const round1 = (await parallel([...understandThunks, ...situateThunks])).filter(Boolean)

// ---------- Phase 3: Challenge (adversarial lenses) ----------
phase('Challenge')

const VERDICT = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'verdict', 'reasoning', 'strongestPoint', 'biggestWeakness'],
  properties: {
    lens: { type: 'string' },
    verdict: { type: 'string', enum: ['revolutionary', 'novel-but-not-revolutionary', 'incremental-hardening', 'repackaging-of-known-ideas'] },
    reasoning: { type: 'string', description: 'rigorous justification, citing the gathered findings' },
    strongestPoint: { type: 'string', description: 'the single strongest argument FOR the verdict word the owner wants ("revolutionary")' },
    biggestWeakness: { type: 'string', description: 'the single fact that most undercuts the "revolutionary" claim' },
  },
}

const context = JSON.stringify(round1.map(r => ({ s: r.summary, k: r.keyPoints, n: r.noveltyAssessment })), null, 1).slice(0, 14000)

const challengeLenses = [
  {
    key: 'skeptic',
    p: `You are a HOSTILE SKEPTIC. Your job: argue that atomic-edit is NOT revolutionary — that it is a (very well-engineered) combination of known ideas (AST editing + syntax-validate-before-write + sandbox/capability + CI-gates-as-proofs). Find the deflating truth. ` +
       `Consider especially: (1) the system's own honest ceiling — Rice's theorem means "100% byte-correct for all computation" is undecidable and the system admits it; (2) the MCP doesn't self-host in a normal session so the no-bypass envelope is largely DORMANT in practice; (3) it lives in one private repo, edits mostly TS/JS, not adopted elsewhere. Be fair but cutting.`,
  },
  {
    key: 'advocate',
    p: `You are the STRONGEST HONEST ADVOCATE (not a hype-man). Argue the genuinely-novel core: the COMBINATION of (a) "unproven ≡ negative" inverted-default applied to bytes, (b) the tool being the SOLE physically-permitted mutation path for an AI agent (no-bypass), (c) self-extension-only under monotonic safety, (d) per-edit adversarial proof receipts, and (e) the engine running its OWN false-positive-collapse self-repair loop (22,023 reds -> ~10). ` +
       `Is that specific combination something no shipping tool or paper does? Make the most rigorous case that it's a new CATEGORY, while refusing any claim the evidence doesn't support.`,
  },
  {
    key: 'ceiling',
    p: `You are a THEORETICAL-LIMITS analyst. The owner's dream sentence is "tecnologia revolucionária que produz resultados impossíveis no sentido forte." Evaluate that against computability: Rice's theorem, the halting problem, soundness-vs-completeness tradeoffs. ` +
       `Where exactly does the ambition hit a hard wall, and where is the doctrine actually achievable (the defensible form: unproven≡negative + no-bypass + self-extension-only + monotonic + honest-ceiling refusal)? Distinguish "impossible in the strong sense" (cannot exist) from "unprecedented but bounded" (new but not magic). Give the verdict on the realistic ceiling.`,
  },
]

const verdicts = (await parallel(challengeLenses.map(l => () =>
  agent(
    l.p + `\n\nGROUNDING (findings from understanding the real code + prior-art research):\n${context}\n\n` +
    `Return your verdict. Pick the verdict enum that most honestly fits YOUR lens. Be concrete; cite the grounding.`,
    { label: `challenge:${l.key}`, phase: 'Challenge', schema: VERDICT }
  )
))).filter(Boolean)

return { round1, verdicts }
