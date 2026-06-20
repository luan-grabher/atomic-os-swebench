export const meta = {
  name: 'kloel-scope-delta-extraction',
  description: 'Verify every dimension of the full canonicalization+unification+cleanup scope against the LIVE codebase → exact delta to 100%',
  phases: [
    { title: 'Verify', detail: 'one read-only verifier per scope dimension' },
    { title: 'Synthesize', detail: 'consolidate into the exact delta + wave decomposition' },
  ],
}

const DIM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension', 'status', 'evidence', 'remaining', 'autonomousSafe', 'effort'],
  properties: {
    dimension: { type: 'string' },
    status: { type: 'string', enum: ['DONE', 'PARTIAL', 'MISSING', 'NOT_APPLICABLE'] },
    percentComplete: { type: 'number', description: '0-100 estimate of this dimension toward its 100% scope' },
    evidence: { type: 'string', description: 'concrete file:line / command-output evidence for the status' },
    remaining: { type: 'array', items: { type: 'string' }, description: 'concrete remaining work items to reach 100% (empty if DONE)' },
    autonomousSafe: { type: 'boolean', description: 'true if the remaining work can be done autonomously+safely (no operator deploy / no destructive / no design decision)' },
    blockedByOperatorOrDesign: { type: 'string', description: 'if not autonomousSafe, what operator action or design decision gates it (empty otherwise)' },
    effort: { type: 'string', enum: ['DONE', 'S', 'M', 'L', 'XL'] },
  },
}

const COMMON = `You are extracting the DELTA between the Kloel "Architectural Semantic Canonicalization + one-Kloel-Mind unification + deep repo cleanup" mission scope and the LIVE codebase at HEAD (branch codex/kloel-production-recovery-pr-20260604). Verify the CODE STATE with tools (grep/glob/AST/bash/tsc — NOT by trusting prose docs); you MAY read docs/architecture/*.md only to check whether those ARTIFACTS exist and are current vs the code. Be brutally honest and evidence-backed: cite file:line or command output. Distinguish DONE vs PARTIAL (built-but-flag-gated-off / built-but-not-activated) vs MISSING. For PARTIAL, say exactly what remains. Mark autonomousSafe=false for anything needing an operator deploy, a destructive migration, prod flag activation, a frontend/UX change, or a human design decision.`

const DIMENSIONS = [
  { k: 'docs-domains-services-dup-migration', p: 'DoD items 1,5,6,7: do docs/architecture/CANONICAL_DOMAINS.md, SERVICE_CATALOG.md, DUPLICATION_REGISTER.md, MIGRATION_PLAYBOOK.md, DEPRECATION_MAP.md exist and reflect the CURRENT code (spot-check 3 claims in each against code)?' },
  { k: 'vocabulary-gate', p: 'DoD item 2: CANONICAL_VOCABULARY.md + the check:canonical / vocabulary anti-regression gate. Does the gate exist, parse the doc, and run in check:all? Run the gate script and report exit code. Are forbidden aliases actually enforced?' },
  { k: 'capability-map-gate', p: 'DoD item 3: CAPABILITY_MAP.md + capability-access gate. Exists? Enforced in check:all? Run it.' },
  { k: 'event-taxonomy-gate', p: 'DoD item 4: EVENT_TAXONOMY.md + the events gate. Does every spine-emitted event name appear in the taxonomy? Run the events gate; report unregistered emit strings if any.' },
  { k: 'anti-regression-gates-ci', p: 'DoD item 11: enumerate ALL anti-regression gates (scripts/ops/check-*.mjs). For each: does it run in package.json check:all AND in CI (.github/workflows)? Which are advisory vs blocking? Run check:all if feasible and report.' },
  { k: 'build-typecheck-tests', p: 'DoD item 9: run backend tsc --noEmit -p tsconfig.json and report error count; check lint+test scripts exist; count *.spec.ts; report worker + frontend typecheck status. Do NOT run full slow suites — sample.' },
  { k: 'omnicore-channels', p: 'OmniCore unification: confirm backend/src/whatsapp is gone and channels live under marketing/channels/{whatsapp,email,facebook,instagram,messenger,tiktok}. For EACH channel, is outbound dispatch wired through the canonical ChannelDispatchRegistry, or flag-gated-off, or still on a legacy dual path? List the per-channel state + the dispatch flags and their defaults.' },
  { k: 'brain-mind-message-cutover', p: 'Brain→Mind MESSAGE cutover phases: dual-write (KLOEL_MINDMESSAGE_DUALWRITE), backfill (MindMessageBackfillService + KLOEL_MINDMESSAGE_BACKFILL + the sourceId migration), parity (.parity()), reader cutover (KLOEL_MINDMESSAGE_READ_CANONICAL), legacy retire. Which phases are built? Which flags default ON vs OFF? What remains (migration apply, backfill run, flag activation, RAC_KloelMessage drop)?' },
  { k: 'brain-mind-memory-cutover', p: 'Brain→Mind MEMORY cutover (the twin of message): KloelMemory→MindMemory. Does dual-write (KLOEL_MINDMEMORY_DUALWRITE) + reader (KLOEL_MINDMEMORY_READ_CANONICAL) exist? Is there a MEMORY backfill service (analogous to MindMessageBackfillService)? Count remaining direct prisma.kloelMemory writers/readers. What remains for full cutover?' },
  { k: 'brain-mind-other-surfaces', p: 'Remaining Brain↔Mind surfaces: ChatMessage (RAC_ChatMessage) convergence, KloelConversation, KloelGlobalPrior vs MindGlobalPrior, KloelSession/ChatThread. For each: converged to canonical, dual-write, or still independent? What remains?' },
  { k: 'cognition-loop-coverage', p: 'one-Kloel-Mind cognition loop: are all surfaces feeding the loop? Check the percept flags (KLOEL_THINK_LOOP_ENABLED, KLOEL_CIA/FLOWS/AUTOPILOT/COPILOT/VOICE/MONEY_PERCEPT_ENABLED) and their CURRENT code defaults (ON/OFF). Then assess the mind ENGINE completeness: predict→surprise→belief loop, consolidation (dry-run vs real), self-modification, bandit usage in chat. What is dormant/stubbed/not-wired?' },
  { k: 'tenant-and-dispatch-canonical', p: 'Canonical infra dedup: tenant resolution (count getWorkspaceId vs resolveWorkspaceId callers — the non-validating resolver migration), message dispatch (ChannelDispatchRegistry vs ChannelTransportRegistry dual-layer + KLOEL_TRANSPORT_CANONICAL_DELEGATE), phone normalization (all delegating to extractAsciiDigits?). What remains genuinely (not cosmetic re-export)?' },
  { k: 'idempotency-webhook-hmac', p: 'Cross-cutting infra gaps: is there a UNIFIED idempotency registry, or scattered guards? Is HMAC webhook signature verification consolidated or reimplemented per controller? List the duplicated implementations + whether consolidation is genuinely valuable or cosmetic.' },
  { k: 'duplication-register-p0p1', p: 'The P0/P1 duplication families from DUPLICATION_REGISTER: sale/payment-ledger split, plan-price split, coupon split, workspaceId-IDOR, lead↔contact, money-ledgers Float→BigInt. For EACH: resolved, flag-gated-ready (which flag, default), or open-design. Verify in code, do not trust the register.' },
  { k: 'repo-cleanup-pulse-agents', p: 'DEEP REPO CLEANUP mission: search the repo (NOT .git) for Pulse, MCP-Pulse, codex, opencode/opencloud, kilo, hermes, claude-agent scaffolding, dead-scripts, .bak/.old/.tmp/.disabled, old autopsies/handoffs/plans, versioned logs/dumps, committed build/dist/coverage. Quantify what is present and tracked by git (git ls-files | grep). Classify roughly: clearly-removable-dead vs needs-proof vs essential. Is there a REPO_CLEANUP_REPORT.md? What is the cleanup delta?' },
  { k: 'production-activation', p: 'Production activation state: is PR #488 merged to main (gh pr view 488 / git log main)? Does main contain the canonicalization+cognition commits, or only the feature branch? Are the ~11 migration flags / percept flags actually ON in prod (we cannot read Railway, so report what is KNOWABLE from code/git + what requires operator confirmation). What is the deploy delta to make it all LIVE in prod?' },
]

phase('Verify')
const results = await parallel(
  DIMENSIONS.map((d) => () =>
    agent(`${COMMON}\n\nVERIFY DIMENSION "${d.k}":\n${d.p}`, {
      label: `verify:${d.k}`,
      phase: 'Verify',
      schema: DIM_SCHEMA,
      agentType: 'Explore',
    })),
)

const verified = results.filter(Boolean)

phase('Synthesize')
const synthesis = await agent(
  `You are the chief architect synthesizing a DELTA-TO-100% report for the Kloel canonicalization+unification+cleanup mission. Below is the per-dimension verified state (JSON). Produce a precise, brutally-honest consolidated delta:\n\n` +
    JSON.stringify(verified) +
    `\n\nProduce:\n1. An OVERALL percent-to-100 with one-line justification.\n2. A table: dimension | status | %| autonomousSafe | effort | the single most important remaining item.\n3. The AUTONOMOUS-SAFE remaining work (what an agent swarm can finish now without operator/deploy/design) — ordered by value, grouped into parallelizable WAVES (each wave = a set of independent work units that can run concurrently with no shared-file conflicts). For each work unit: a crisp title + the files/area + the acceptance check.\n4. The NON-AUTONOMOUS remaining work (operator deploy steps + design decisions), each with what it's blocked on.\n5. The single highest-leverage next action.\nBe concrete and evidence-grounded; do not pad. This report is the execution plan for the next swarm waves.`,
  { label: 'synthesize-delta', phase: 'Synthesize' },
)

return { verified, synthesis }
