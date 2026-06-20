export const meta = {
  name: 'kloel-macro-census',
  description: 'Code-grounded production-readiness + canonical-drift + Brain/Mind unification census across Kloel domain clusters',
  phases: [
    { title: 'Census', detail: 'parallel domain analysts return structured gap maps' },
    { title: 'Synthesize', detail: 'consolidate into one prioritized production backlog' },
  ],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['cluster', 'productionReady', 'gaps', 'duplications', 'cognitionWired', 'summary'],
  properties: {
    cluster: { type: 'string' },
    productionReady: {
      type: 'object',
      required: ['verdict', 'blockers'],
      properties: {
        verdict: { type: 'string', enum: ['ready', 'partial', 'broken'] },
        blockers: { type: 'array', items: { type: 'string' } },
      },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'file', 'severity', 'fix'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          fix: { type: 'string' },
        },
      },
    },
    duplications: {
      type: 'array',
      items: {
        type: 'object',
        required: ['capability', 'canonical', 'legacy', 'status'],
        properties: {
          capability: { type: 'string' },
          canonical: { type: 'string' },
          legacy: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['converged', 'partial', 'not-started'] },
        },
      },
    },
    cognitionWired: {
      type: 'object',
      required: ['fired', 'evidence'],
      properties: {
        fired: { type: 'boolean' },
        evidence: { type: 'string' },
      },
    },
    summary: { type: 'string' },
  },
}

const CLUSTERS = [
  {
    key: 'cognition-mind',
    prompt: `You are auditing the COGNITION CORE of the Kloel codebase (NestJS backend) at /Users/danielpenin/kloel.
Focus dirs: backend/src/kloel/mind, backend/src/kloel/spine, backend/src/kloel/cia, backend/src/kloel/clarity, backend/src/kloel/intent-router, backend/src/kloel/commercial-decision-orchestrator, backend/src/kloel/agent-runtime, backend/src/kloel/self-awareness, backend/src/kloel/consciousness.
Prisma models split into TWO families that the product owner wants UNIFIED into "Kloel Mind": Brain family (KloelConversation, KloelMessage, KloelMemory, ChatThread, ChatMessage) and Mind family (MindBelief, MindPrediction, MindPolicy, MindBanditArm, MindCase, MindGraphNode/Edge, MindMemory, MindMessage, MindGlobalPrior, MindSelfModel).
ANSWER WITH EVIDENCE (file:line via grep/read):
1. Is the cognitive loop state->perception->decision->action->consequence->learning actually WIRED and FIRED on a real Kloel chat message? Trace: where does an inbound Kloel message enter, does it hit the spine emitter, does spine feed mind (build-mind-signals), does mind produce a decision/action, is the consequence learned back (hebbian/consolidation/bandit update)? Set cognitionWired.fired true ONLY if you can trace the full loop firing on the MAIN chat path (not just a proof/test file).
2. SERVICE-LAYER duplication between Brain(Kloel*) and Mind(Mind*): e.g. KloelMemory vs MindMemory, KloelMessage/ChatMessage vs MindMessage, KloelGlobalPrior vs MindGlobalPrior. For each, identify the canonical service (look for *-canonical.service.ts, mind-canonical.service.ts) and the legacy callers. status=converged if all callers use canonical, partial if mixed, not-started if no canonical exists.
3. Concrete production gaps (stubs, TODO, throw new Error('not implemented'), hardcoded fake data, disabled feature flags that gate the loop).
Do NOT propose DB-table merges (schema changes are out of scope / dangerous). Focus on code/service-layer canonicalization and whether the loop is alive.
Return findings per schema. cluster="cognition-mind".`,
  },
  {
    key: 'channels-marketing',
    prompt: `You are auditing the OMNICHANNEL MARKETING domain of Kloel (NestJS backend) at /Users/danielpenin/kloel.
Focus dirs: backend/src/marketing, backend/src/meta, backend/src/omnichannel, backend/src/email, backend/src/tiktok-ads, backend/src/mass-send, backend/src/campaigns, backend/src/google-ads, backend/src/anuncios, worker/processors/autopilot.
Context: the product owner dissolved the old backend/src/whatsapp into marketing already (it no longer exists). The canonical doc docs/architecture/SEND_MESSAGE_CANONICAL.md and CHANNEL_DISPATCH_CANONICAL.md define ONE canonical message-dispatch path.
ANSWER WITH EVIDENCE (file:line):
1. Find ALL implementations that send an outbound message to an external channel (grep for send, dispatch, publish across WhatsApp/Instagram/Facebook/Email/TikTok). Is there ONE canonical dispatcher (per SEND_MESSAGE_CANONICAL) that all of them route through, or are there parallel senders? List canonical + legacy with file:line. status per duplication.
2. Is WhatsApp truly dissolved (no leftover whatsapp-only sender that bypasses the omnichannel path)? Any obsolete WhatsApp code that should be deleted?
3. Production gaps: channels that are stubbed, fake-sending, missing real API wiring, disabled flags.
Return findings per schema. cluster="channels-marketing".`,
  },
  {
    key: 'commerce',
    prompt: `You are auditing the COMMERCE domain of Kloel (NestJS backend) at /Users/danielpenin/kloel.
Focus dirs: backend/src/checkout, backend/src/payments, backend/src/billing, backend/src/wallet, backend/src/plans, backend/src/marketplace, backend/src/marketplace-treasury, backend/src/sales, backend/src/post-sale, backend/src/products.
ANSWER WITH EVIDENCE (file:line):
1. Production-readiness of the full money flow: create product/plan/offer -> checkout -> payment (Stripe?) -> wallet/ledger -> post-sale. Any stubs, sandbox-only paths, hardcoded test keys, missing idempotency, TODO in the money path?
2. Duplication: multiple checkout/payment/wallet services doing the same thing? normalizePhone/resolveTenant duplicated here?
3. Is abandoned-cart recovery (intents/recover-abandoned-cart-whatsapp.md exists) actually implemented end-to-end and wired to the channel dispatch?
Return findings per schema. cluster="commerce". cognitionWired: whether commerce events feed back into the mind loop (e.g. checkout.completed -> mind consequence/learning).`,
  },
  {
    key: 'identity-crm',
    prompt: `You are auditing IDENTITY + CRM domains of Kloel (NestJS backend) at /Users/danielpenin/kloel.
Focus dirs: backend/src/auth, backend/src/workspaces, backend/src/team, backend/src/api-keys, backend/src/public-api, backend/src/contacts, backend/src/crm, backend/src/pipeline, backend/src/inbox, backend/src/followup, backend/src/kloel/crm-emitter.
Canonical vocab (docs/architecture/CANONICAL_VOCABULARY.md) wants ONE canonical contact entity (Contact vs Lead vs Customer vs KloelLead).
ANSWER WITH EVIDENCE (file:line):
1. Is there ONE canonical contact/lead entity, or are Lead/Contact/Customer/KloelLead used inconsistently across frontend/backend/worker? List canonical + legacy.
2. Tenant resolution: is there ONE canonical resolveTenant/resolveWorkspace, or duplicated? file:line.
3. Auth production-readiness: any insecure defaults, disabled guards, dev-only bypasses left on.
Return findings per schema. cluster="identity-crm".`,
  },
  {
    key: 'frontend',
    prompt: `You are auditing the Kloel FRONTEND (React) at /Users/danielpenin/kloel/frontend/src/components/kloel (617 files) and /Users/danielpenin/kloel/frontend-admin.
A prior 12-agent audit found ~70 remaining issues: no-op buttons (onClick that does nothing), dead screens (routed but render placeholder), fake/mock data shown as real, missing persistence (form submits with no API call), and visual inconsistencies (purple vs ember theme, light vs void graph).
ANSWER WITH EVIDENCE (file:line):
1. Find no-op interactive elements: buttons/links with empty handlers, TODO onClick, console.log-only handlers.
2. Find fake-data surfaces: components rendering hardcoded arrays/mock objects instead of fetched data.
3. Find missing-persistence: forms/actions that should POST/PATCH but don't call the API.
4. Find dead screens: routes rendering "coming soon"/placeholder.
List concrete gaps with file:line and the fix. Prioritize user-facing P0/P1.
Return findings per schema. cluster="frontend". cognitionWired: whether the main chat UI surfaces the mind's real reasoning (not a canned response).`,
  },
  {
    key: 'canonical-drift',
    prompt: `You are a CANONICAL-DRIFT auditor for Kloel at /Users/danielpenin/kloel.
The docs/architecture/ folder contains canonical specs: CANONICAL_DOMAINS.md, CANONICAL_VOCABULARY.md, CAPABILITY_MAP.md, EVENT_TAXONOMY.md, SERVICE_CATALOG.md, DUPLICATION_REGISTER.md, DEPRECATION_MAP.md, SEND_MESSAGE_CANONICAL.md, CHANNEL_DISPATCH_CANONICAL.md, MIND_SERVICES_CANONICAL.md, ROUTES_CATALOG.md, QUEUES_CATALOG.md.
For THIS task you MAY read those .md files (drift verification requires comparing doc claims to code).
ANSWER WITH EVIDENCE (file:line):
1. Read DUPLICATION_REGISTER.md and DEPRECATION_MAP.md. For each "canonical" target and each "deprecated/legacy" item they list, verify against actual code: is the canonical implemented? are the legacy items still referenced (grep)? Report DRIFT where the doc claims convergence but code still calls legacy, OR doc lists a deprecated symbol that no longer exists.
2. Read EVENT_TAXONOMY.md. Sample 10 canonical event names; grep the codebase; report events emitted in code that are NOT in the taxonomy (rogue events) and taxonomy events never emitted (dead spec).
3. Read SERVICE_CATALOG.md. Spot-check 5 canonical services exist at claimed paths.
Report each drift as a gap with severity. status of duplications reflects code reality not doc claim.
Return findings per schema. cluster="canonical-drift". cognitionWired:false, evidence="n/a".`,
  },
  {
    key: 'gates-ci',
    prompt: `You are auditing the QUALITY GATES and CI of Kloel at /Users/danielpenin/kloel.
package.json (root) defines gates: check:all, check:governance, check:ai-constitution, check:architecture, check:boundaries, check:quality, check:casts, check:queries, check:data, check:models, check:security, check:tests, quality:graph, quality:dead-code, quality:static, seatbelt:check, lint, typecheck.
ANSWER WITH EVIDENCE:
1. Read .github/workflows/*.yml. Which of these gates actually run in CI on PRs to main? Which are advisory-only or not wired? List by name.
2. Run (via Bash, read-only/fast ones only — AVOID anything that mutates): try "npm run check:architecture", "npm run check:boundaries", "npm run check:governance", "npm run quality:dead-code" and capture pass/fail + first errors. If a gate is slow (>90s) or needs a DB, skip it and note "needs-runtime". Do NOT run tests or builds.
3. Report which gates are RED right now (these block production) as P0/P1 gaps with the failing rule.
Return findings per schema. cluster="gates-ci". cognitionWired:false, evidence="n/a". duplications:[].`,
  },
]

phase('Census')
const census = await parallel(
  CLUSTERS.map((c) => () =>
    agent(c.prompt, { label: `census:${c.key}`, phase: 'Census', schema: FINDINGS_SCHEMA })
  )
)
const valid = census.filter(Boolean)

phase('Synthesize')
const synthPrompt = `You are the chief architect consolidating a production-completion census for Kloel.
Here are the per-cluster findings as JSON:
${JSON.stringify(valid, null, 2)}

Produce a SINGLE prioritized production-completion backlog. Rules:
- Dedupe across clusters (same gap reported twice = one entry).
- Order strictly by severity then by blast radius (P0 production-breaking first).
- For each item give: id, title, severity, cluster, file (primary), concrete fix, and whether it is SAFE to delegate to a fixer agent autonomously (safeAutonomous: true/false — false if it needs schema change, prod credentials, or human product decision).
- Separately list: (a) the cognition-loop wiring verdict (is the state->perception->decision->action->consequence->learning loop actually firing on the main chat? cite evidence), (b) the Brain->Mind service-unification status, (c) the canonical-drift summary, (d) which CI gates are currently RED.
- End with "topAutonomousWork": the ordered list of item ids that are safeAutonomous=true and should be fixed FIRST by the execution swarm.`

const SYNTH_SCHEMA = {
  type: 'object',
  required: ['backlog', 'cognitionVerdict', 'brainMindStatus', 'driftSummary', 'redGates', 'topAutonomousWork'],
  properties: {
    backlog: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'severity', 'cluster', 'file', 'fix', 'safeAutonomous'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string' },
          cluster: { type: 'string' },
          file: { type: 'string' },
          fix: { type: 'string' },
          safeAutonomous: { type: 'boolean' },
        },
      },
    },
    cognitionVerdict: { type: 'string' },
    brainMindStatus: { type: 'string' },
    driftSummary: { type: 'string' },
    redGates: { type: 'array', items: { type: 'string' } },
    topAutonomousWork: { type: 'array', items: { type: 'string' } },
  },
}

const synthesis = await agent(synthPrompt, { label: 'synthesize:backlog', phase: 'Synthesize', schema: SYNTH_SCHEMA })
return synthesis
