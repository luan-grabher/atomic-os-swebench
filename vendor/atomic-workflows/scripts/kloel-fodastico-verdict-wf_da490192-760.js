export const meta = {
  name: 'kloel-fodastico-verdict',
  description: 'Read the entire Kloel codebase at its current dirty working-tree state (incl. uncommitted + PR488) and adversarially verify whether it is genuinely exceptional',
  phases: [
    { title: 'Read', detail: 'parallel deep-readers per subsystem + 2 runtime hard-proof agents' },
    { title: 'Verify', detail: 'adversarially refute the load-bearing claims the verdict depends on' },
    { title: 'Synthesize', detail: 'calibrated per-dimension verdict' },
  ],
}

const READ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subsystem: { type: 'string' },
    summary: { type: 'string', description: '2-4 sentences on what this actually is in the CURRENT on-disk code' },
    components: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string' },
          what: { type: 'string' },
          verdict: { type: 'string', enum: ['REAL', 'PARTIAL', 'SCAFFOLD', 'DEAD'] },
          evidence: { type: 'string', description: 'caller? test? route? flag default? git diff finding? file:line' },
        },
        required: ['path', 'what', 'verdict', 'evidence'],
      },
    },
    dirtyWorkFindings: { type: 'string', description: 'what the UNCOMMITTED changes (git diff HEAD) in this area actually do — new wiring, fixes, or noise' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    fodasticoVerdict: { type: 'string', enum: ['fodastico', 'solid', 'mid', 'weak', 'theater'] },
    claims: {
      type: 'array',
      description: 'load-bearing claims a "fodastico" verdict would depend on, for downstream refutation',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          claim: { type: 'string' },
          criticality: { type: 'integer', minimum: 1, maximum: 5 },
          verifyHow: { type: 'string' },
        },
        required: ['claim', 'criticality', 'verifyHow'],
      },
    },
  },
  required: ['subsystem', 'summary', 'components', 'fodasticoVerdict', 'claims'],
}

const RUNTIME_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          check: { type: 'string' },
          command: { type: 'string' },
          status: { type: 'string', enum: ['PASS', 'FAIL', 'PARTIAL', 'INCONCLUSIVE'] },
          keyOutput: { type: 'string', description: 'the few lines that matter (tail), verbatim' },
          interpretation: { type: 'string' },
        },
        required: ['check', 'command', 'status', 'keyOutput', 'interpretation'],
      },
    },
  },
  required: ['checks'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claim: { type: 'string' },
    refuted: { type: 'boolean', description: 'true if you could NOT confirm it / it is false. Default to true when uncertain.' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    method: { type: 'string', description: 'what you actually did: traced caller X, ran command Y, read flag default Z' },
    evidence: { type: 'string', description: 'concrete file:line / command output supporting your verdict' },
  },
  required: ['claim', 'refuted', 'confidence', 'method', 'evidence'],
}

const ROOT = '/Users/danielpenin/kloel'
const COMMON = `You are reading the Kloel monorepo at ${ROOT}. CRITICAL: read the CURRENT ON-DISK files — this includes UNCOMMITTED dirty work. For files in your area, run \`git -C ${ROOT} diff HEAD -- <path>\` to see exactly what the uncommitted changes did versus the last commit, and treat that freshest state as ground truth. Do NOT trust prior summaries or module names — open the code and trace real callers/tests/routes/flag-defaults. Be a skeptic: a grandiose name (consciousness, wisdom, autonomy, self-evolution) means nothing until you find a real caller in a live path, a passing test, or a wired route. Mark something REAL only with caller/test/route evidence (give file:line). PARTIAL = exists+tested but not wired into a live path or gated OFF. SCAFFOLD = stub/no callers. DEAD = code with zero callers. The user's question is "is Kloel genuinely fodastico (exceptional)?" — your job is honest evidence, not flattery.`

const readers = [
  { key: 'cognition-thinker', label: 'cognition: thinker+turn loop', prompt: `${COMMON}
AREA: the live agent turn. Read backend/src/kloel/kloel-thinker.service.ts, kloel-thinker-think.helpers.ts, kloel-thinker.wire-context.helpers.ts, kloel-stream-events.ts, kloel-stream-writer.ts, kloel-tool-router.ts, kloel-tool-dispatcher*.ts, and the controller that calls think().
ANSWER THE DECISIVE QUESTION: In the CURRENT code (after commit 8435a0dfa "wire memory+capability+ECC into live turn" + uncommitted diff), does a real user chat turn actually (a) retrieve+inject memory, (b) inject the capability manifest, (c) run mind/cognition, (d) plan+dispatch tools, all on the LIVE path — or is any of it behind an OFF-by-default flag / @Optional() that is never provided? Trace each. Name every feature flag involved and find its DEFAULT value. Quote file:line.` },
  { key: 'agent-runtime', label: 'agent-runtime', prompt: `${COMMON}
AREA: backend/src/kloel/agent-runtime/ (36 files). Map session-store, memory-curator, context compression, job runner, delegation. DECISIVE: is there real BETWEEN-TURN persistence/replay (memory that survives across turns/sessions) or does state collapse at end of turn? Find the store backend (DB? in-proc?) and a caller that reads prior-turn state on a new turn.` },
  { key: 'capabilities', label: 'capabilities + registry-v2', prompt: `${COMMON}
AREA: backend/src/kloel/capabilities/ and backend/src/kloel/capability-registry-v2/ (29 files, partitions tier-0..). Count how many capabilities are actually registered and DISPATCHABLE in a live turn vs declared-only. Check the tier-0-self-awareness.ts ECC reference. Are mutations (tier-0c) gated/guarded? Evidence of real dispatch.` },
  { key: 'mind-core-loop', label: 'mind core loop + background', prompt: `${COMMON}
AREA: backend/src/kloel/mind/ runtime/, coordination/, inference/, mind-bg.processor.ts, mind-bg.scheduler.ts, multi-timescale.coordinator.ts, mind.module.ts.
DECISIVE: is background cognition ACTUALLY SCHEDULED and firing? Find the scheduler registration (@Cron / SchedulerRegistry / setInterval / BullMQ repeatable) and prove it runs. Does mind-bg.processor call consolidation.service / hebbian / belief / surprise? Is consolidation.service DEAD (zero callers) or wired now? Trace exact callers with file:line.` },
  { key: 'mind-memory-knowledge', label: 'mind memory + knowledge/RAG', prompt: `${COMMON}
AREA: backend/src/kloel/mind/memory/ and backend/src/kloel/mind/knowledge/, consolidation.service.ts, hebbian.service.ts, valence*, episode/long-term memory. Map the FULL loop: extract -> embed -> store(pgvector) -> retrieve(ranking) -> inject. Is RAG/knowledge populated and queried live, or placeholder? Confirm pgvector + embedding model. Note what the uncommitted diff changed here.` },
  { key: 'mind-exotic', label: 'mind exotic (consciousness/autonomy/etc)', prompt: `${COMMON}
AREA: the "ambitious" mind dirs: backend/src/kloel/mind/{consciousness, autonomy, self-evolution, self-model, curiosity, causal, emotional, perception, attention, policy, cia, synthetic}. For EACH dir: one line of what it claims, then REAL/PARTIAL/SCAFFOLD/DEAD with a real-caller-or-test citation. Be ruthless: which of these are vanity scaffolding vs genuinely integrated? Give a count: X of Y dirs wired into a live path.` },
  { key: 'kloel-grandiose-a', label: 'kloel grandiose A', prompt: `${COMMON}
AREA: backend/src/kloel/{wisdom, goal-field, self-awareness, agency, evol, insight, hypproof}. For each: what it claims, and REAL/PARTIAL/SCAFFOLD/DEAD with caller/test/route evidence. Are these wired into the thinker/turn or standalone islands? Count wired vs island.` },
  { key: 'kloel-grandiose-b', label: 'kloel grandiose B', prompt: `${COMMON}
AREA: backend/src/kloel/{defens, legit, role, lineage, commem, incent, recovery, offer, cash, wisdom}. For each: what it claims, REAL/PARTIAL/SCAFFOLD/DEAD with caller/test/route evidence. Count wired vs island.` },
  { key: 'atomic-engine', label: 'atomic-edit engine', prompt: `${COMMON}
AREA: scripts/mcp/atomic-edit/ — the verifiable-edit engine (server-tools*, guard.ts, lens, converge, sessions, replay-admissible.ts, positive-bytes, seal). Plus the uncommitted diff here. DECISIVE: is this a real working guarded-edit engine (hash-before/after, syntax-validate, atomic write, refuses ambiguous) with genuine teeth, or theater? Find the actual validation/abort logic. Is the byte-positive / no-bypass envelope real in code?` },
  { key: 'atomic-proofs', label: 'atomic Lean/z3 proofs', prompt: `${COMMON}
AREA: formal/ and scripts/mcp/atomic-edit/gates/*.proof.mjs and any Lean/.lean / z3 / .smt2 artifacts (recent commits claim "induction principle proven in Lean 4 (z3+lean)" and N-way batch certificate). DECISIVE: are these MACHINE-CHECKED proofs (real Lean/z3 that actually run and verify) or hand-wavy .md/.mjs that print "proven"? List the proof files, identify which are genuinely checkable, and RUN one representative gate (e.g. \`node <gate>.proof.mjs\`) and a Lean/z3 file if a checker is installed (\`which lean z3\`). Report verbatim output.` },
  { key: 'commerce', label: 'commerce: checkout/payments', prompt: `${COMMON}
AREA: backend/src/{checkout, payments, billing, wallet, marketplace-treasury, plans}. Re-confirm at the CURRENT state: is the money path production-grade (Stripe + Mercado Pago, order lifecycle, refunds, fraud, coupons, split)? Cite controllers+routes+specs. Run \`git -C ${ROOT} diff HEAD\` over this area for any uncommitted regressions. Count spec files.` },
  { key: 'whatsapp', label: 'whatsapp + inbox + autopilot', prompt: `${COMMON}
AREA: backend/src/marketing/channels/whatsapp/, backend/src/{inbox, omnichannel}, kloel autopilot, flows, channel-transport*. Is the inbound->process->reply->dispatch path real, idempotent, tested, and live? Does inbound route to the mind/unified agent? Cite the inbound processor + worker queue wiring.` },
  { key: 'crm-product', label: 'crm/sales/campaigns/products', prompt: `${COMMON}
AREA: backend/src/{crm, sales, campaigns, member-area, affiliate, products, post-sale, contacts}. Which are REAL wired-and-tested product surfaces vs thin? Cite controllers/routes/specs per area.` },
  { key: 'auth-security', label: 'auth + security + multitenant', prompt: `${COMMON}
AREA: backend/src/{auth, admin/auth, api-keys, compliance, gdpr, kyc, certification} + MFA services + WorkspaceGuard/multi-tenant isolation + fraud. Is tenant isolation enforced at every query (workspaceId scoping)? Is MFA/OAuth/magic-link real? Any obvious auth holes in the dirty diff?` },
  { key: 'frontend-chat', label: 'frontend chat + render parity', prompt: `${COMMON}
AREA: frontend/src/components/kloel chat UI, KloelMarkdown render (LaTeX/katex, mermaid, code, tables, artifacts), and the uncommitted frontend/src/components diff (52 dirty files). DECISIVE: does the chat actually render math/mermaid/artifacts now, stream tokens, and is reasoning surfaced? Distinguish wired-and-rendering from styled-but-dead. Cite components.` },
  { key: 'frontend-graph-app', label: 'frontend graph/artifacts/app', prompt: `${COMMON}
AREA: frontend graph overlay (KloelGraph*), the NEW untracked frontend/src/components/kloel/graph/KloelGraphWindowControls.tsx, artifacts panel, and overall app route completeness (frontend/src/app: dashboard, inbox, sales, products, settings) + middleware auth. Which routes are real working screens vs placeholders/no-op buttons? Cite.` },
  { key: 'quality-ci', label: 'quality + CI gates', prompt: `${COMMON}
AREA: .github/workflows/*, scripts/ops/* gates (canonicalization, check-architecture, ratchet, knip, madge), biome.json, backend/tsconfig strictness, codecov.yml. What is ACTUALLY enforced as a blocking gate on PR488 vs advisory? Is strict TypeScript on (commit 9459c6669 claims "restore strict TS, fixed 275 errors")? Is the test suite real (count specs) or mostly shallow? Be specific about what would block a bad merge.` },
]

phase('Read')

const runtimeFast = agent(`${COMMON}
You are the RUNTIME HARD-PROOF (fast) agent. Use Bash. Run these and report each as a check. Use \`cd ${ROOT}/backend\` where needed.
1. FLAG DEFAULTS: read backend/src/kloel/*.flag.ts and any env-flag helper; determine the production DEFAULT (ON/OFF) of: KLOEL_THINK_LOOP_ENABLED (or equivalent think-loop flag), the mind dualwrite flag, capability-turn-learn, cart-recovery-learn, and any cognition/mind master switch. Grep: \`grep -rnE "THINK_LOOP|DUALWRITE|MINDMESSAGE|capability.?turn.?learn|MIND_ENABLED|COGNI" backend/src/kloel | grep -iE "flag|env|default|process.env" | head -40\`. State each flag's default verdict.
2. COGNITION LIVENESS PROOF: \`npx jest cognitive-loop-liveness.proof --silent 2>&1 | tail -25\` (and the realdb one if fast). Does it pass?
3. MIND-BG SCHEDULER WIRED: grep for the scheduler registration and whether consolidation/hebbian are invoked: \`grep -rnE "@Cron|SchedulerRegistry|registerInterval|addCronJob|repeat|consolidat|hebbian" backend/src/kloel/mind/mind-bg.processor.ts backend/src/kloel/mind/mind-bg.scheduler.ts | head -40\`.
4. TEST REALITY: \`find backend/src -name '*.spec.ts' | wc -l\` and run ONE substantive kloel suite e.g. \`npx jest kloel-thinker.service --silent 2>&1 | tail -15\`.
Return all as checks[] with verbatim keyOutput.`, { schema: RUNTIME_SCHEMA, phase: 'Read', label: 'runtime: flags+proofs+tests' })

const runtimeTypecheck = agent(`${COMMON}
You are the RUNTIME TYPECHECK agent. Use Bash. The repo claims strict TypeScript with 0 errors (commit 9459c6669). VERIFY on the CURRENT DIRTY tree.
Run: \`cd ${ROOT}/backend && timeout 540 npx tsc --noEmit -p tsconfig.json 2>&1 | tail -50; echo "TSC_EXIT:$?"\`
Also frontend if time: \`cd ${ROOT}/frontend && timeout 300 npx tsc --noEmit 2>&1 | tail -30; echo "FE_EXIT:$?"\`
Report status PASS only if 0 errors and exit 0. If it times out, status INCONCLUSIVE and say so. Give the verbatim tail (error count / first errors) as keyOutput. Do not give up after one try if the command is just slow — but respect the timeout.`, { schema: RUNTIME_SCHEMA, phase: 'Read', label: 'runtime: strict typecheck' })

const phase1 = await parallel([
  ...readers.map(r => () => agent(r.prompt, { schema: READ_SCHEMA, phase: 'Read', label: r.label, agentType: 'Explore' })),
  () => runtimeFast,
  () => runtimeTypecheck,
])

const reports = phase1.slice(0, readers.length).filter(Boolean)
const runtimeResults = phase1.slice(readers.length).filter(Boolean)

log(`Read phase done: ${reports.length}/${readers.length} subsystem reports, ${runtimeResults.length} runtime agents`)

// Dedup + select load-bearing claims for adversarial refutation
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 9).join(' ')
const seen = new Set()
const allClaims = []
for (const r of reports) {
  for (const c of (r.claims || [])) {
    const k = norm(c.claim)
    if (seen.has(k)) continue
    seen.add(k)
    allClaims.push({ ...c, subsystem: r.subsystem })
  }
}
allClaims.sort((a, b) => (b.criticality || 0) - (a.criticality || 0))
const selected = allClaims.slice(0, 22)
log(`Selected ${selected.length} load-bearing claims to refute (from ${allClaims.length} unique)`) 

phase('Verify')

const verdicts = await parallel(selected.map((c) => () =>
  agent(`${COMMON}
ADVERSARIAL VERIFICATION. A reader of the "${c.subsystem}" subsystem asserted this load-bearing claim:
"""${c.claim}"""
Suggested check: ${c.verifyHow}
Your job is to REFUTE it. Trace the real caller chain, read the actual flag default, run the actual test/command (you have Bash; cd ${ROOT}/backend or frontend as needed), open the file at the cited lines. Set refuted=true unless you find hard, specific evidence it is true. Default to refuted=true when uncertain or when "real" depends on a flag that is OFF. Report exactly what you did (method) and the concrete file:line / command output (evidence).`,
    { schema: VERDICT_SCHEMA, phase: 'Verify', label: `refute: ${c.claim.slice(0, 48)}` })
))

const checked = verdicts.filter(Boolean)
const confirmed = checked.filter(v => v.refuted === false)
const refuted = checked.filter(v => v.refuted === true)
log(`Verification: ${confirmed.length} claims CONFIRMED, ${refuted.length} refuted/unconfirmed`)

phase('Synthesize')

const compact = {
  reports: reports.map(r => ({
    subsystem: r.subsystem,
    fodasticoVerdict: r.fodasticoVerdict,
    summary: r.summary,
    dirtyWorkFindings: r.dirtyWorkFindings,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    componentVerdicts: (r.components || []).reduce((acc, c) => { acc[c.verdict] = (acc[c.verdict] || 0) + 1; return acc }, {}),
    realComponents: (r.components || []).filter(c => c.verdict === 'REAL').map(c => `${c.path}: ${c.what}`).slice(0, 6),
    scaffoldComponents: (r.components || []).filter(c => c.verdict === 'SCAFFOLD' || c.verdict === 'DEAD').map(c => `${c.path}: ${c.what}`).slice(0, 6),
  })),
  runtime: runtimeResults,
  confirmedClaims: confirmed.map(v => ({ claim: v.claim, confidence: v.confidence, evidence: v.evidence })),
  refutedClaims: refuted.map(v => ({ claim: v.claim, confidence: v.confidence, evidence: v.evidence })),
}

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overallVerdict: { type: 'string', enum: ['fodastico', 'mostly-fodastico-with-caveats', 'split-verdict', 'impressive-but-overclaimed', 'sprawl'] },
    headline: { type: 'string', description: 'one blunt sentence' },
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dimension: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 10 },
          verdict: { type: 'string' },
        },
        required: ['dimension', 'score', 'verdict'],
      },
    },
    genuinelyExceptional: { type: 'array', items: { type: 'string' }, description: 'what is truly fodastico, evidence-backed' },
    overclaimedOrUnproven: { type: 'array', items: { type: 'string' }, description: 'what is vanity/scaffold/flag-off/unproven' },
    biggestSurprise: { type: 'string', description: 'what changed vs the prior (pre-dirty) assessment, esp. cognition live-wiring + consolidation + proofs' },
    honestBottomLine: { type: 'string' },
  },
  required: ['overallVerdict', 'headline', 'dimensions', 'genuinelyExceptional', 'overclaimedOrUnproven', 'biggestSurprise', 'honestBottomLine'],
}

const synthesis = await agent(`${COMMON}
You are the SYNTHESIS judge. Below is the full evidence pack from ${reports.length} subsystem readers, 2 runtime hard-proof agents, and ${checked.length} adversarial verifications of the load-bearing claims. Produce a calibrated, blunt verdict on whether Kloel is genuinely "fodastico" (exceptional) at its CURRENT dirty state. Weight CONFIRMED claims and PASS runtime checks heavily; treat refuted/unconfirmed claims and OFF flags as the system NOT having that capability live. Score dimensions: Scale&Discipline, Commerce/Money path, WhatsApp/Channels, Cognition-live-on-turn, Memory/learning loop, Atomic-edit engine, Formal proofs, Frontend, Auth/Security, Sprawl-vs-coherence. Separate what is genuinely exceptional (evidence-backed) from what is overclaimed/vanity/flag-off/unproven. Call out the biggest delta versus a prior assessment that said cognition was NOT wired and consolidation was dead code.
EVIDENCE PACK (JSON):
${JSON.stringify(compact).slice(0, 90000)}`,
  { schema: SYNTH_SCHEMA, phase: 'Synthesize', label: 'final verdict' })

return {
  subsystemCount: reports.length,
  fodasticoTally: reports.reduce((acc, r) => { acc[r.fodasticoVerdict] = (acc[r.fodasticoVerdict] || 0) + 1; return acc }, {}),
  claimsConfirmed: confirmed.length,
  claimsRefuted: refuted.length,
  runtime: runtimeResults,
  confirmed: compact.confirmedClaims,
  refuted: compact.refutedClaims,
  synthesis,
}