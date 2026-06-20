export const meta = {
  name: 'kloel-canonicalization-inventory',
  description: 'Parallel semantic inventory + duplication detection across Kloel domains → canonical catalogs',
  phases: [
    { title: 'Inventory', detail: 'one analyst per domain' },
    { title: 'Dedup', detail: 'one hunter per cross-cutting duplication class' },
  ],
}

const DOMAIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['domain', 'canonicalEntities', 'services', 'events', 'capabilities', 'suspectedDuplications'],
  properties: {
    domain: { type: 'string' },
    rootPath: { type: 'string' },
    canonicalEntities: { type: 'array', items: { type: 'string' }, description: 'core domain nouns (Prisma models / main types)' },
    services: { type: 'array', items: { type: 'string' }, description: 'main service classes (Name — one-line responsibility)' },
    events: { type: 'array', items: { type: 'string' }, description: 'spine/domain event names emitted or consumed here' },
    capabilities: { type: 'array', items: { type: 'string' }, description: 'business capabilities (verb-noun), not files' },
    suspectedDuplications: { type: 'array', items: { type: 'string' }, description: 'things that look duplicated WITHIN or ACROSS domains, with file:line' },
    productionGaps: { type: 'array', items: { type: 'string' }, description: 'what is dormant/stubbed/not-wired here that blocks production' },
  },
}

const DEDUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dupClass', 'instances', 'canonicalProposal', 'severity'],
  properties: {
    dupClass: { type: 'string' },
    instances: { type: 'array', items: { type: 'string' }, description: 'each duplicate implementation with file:line and signature' },
    canonicalProposal: { type: 'string', description: 'the ONE canonical name/service/location + why' },
    deprecate: { type: 'array', items: { type: 'string' }, description: 'names/symbols to deprecate or delete' },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
    migrationSketch: { type: 'string', description: 'small reversible migration steps' },
    risk: { type: 'string', description: 'production/HOT-file/concurrent-edit risk' },
  },
}

const DOMAINS = [
  { d: 'kloel-mind', p: 'backend/src/kloel/mind', note: 'the cognitive engine: beliefs/bandits/prediction/memory/graph/consolidation' },
  { d: 'kloel-brain-chat', p: 'backend/src/kloel', note: 'Kloel Brain/IA chat surface: KloelSession/KloelMessage/ChatThread/ChatMessage + reply engine + thinker (EXCLUDE the mind/ subdir already covered)' },
  { d: 'kloel-cia-autopilot-copilot-voice', p: 'backend/src/kloel', note: 'CIA agent, autopilot, copilot, voice cloning, money-machine inside kloel/ (cia/, autopilot, copilot, voice dirs)' },
  { d: 'kloel-cognitive-modules', p: 'backend/src/kloel', note: 'the defensive/cognitive modules: defens/legit/role/incent/recovery/offer/cash/agency/evol/hypproof/wisdom/commem/goal-field/lineage/daily-dashboard' },
  { d: 'marketing', p: 'backend/src/marketing', note: 'omnichannel marketing incl channels/{whatsapp,email,facebook,instagram,messenger,tiktok}, campaigns' },
  { d: 'checkout-payments-billing-wallet', p: 'backend/src/checkout', note: 'checkout + ../payments + ../billing + ../wallet — the money path' },
  { d: 'auth-tenant', p: 'backend/src/auth', note: 'identity, auth, workspace/tenant resolution' },
  { d: 'crm-sales-inbox', p: 'backend/src/crm', note: 'crm + ../sales + ../inbox + ../member-area: contacts/leads/conversations' },
  { d: 'flows-autopilot-worker', p: 'backend/src/flows', note: 'flows (visual automation nodes+edges) + ../autopilot + the worker/ processors' },
  { d: 'webhooks-integrations-meta', p: 'backend/src/webhooks', note: 'webhooks + ../integrations + ../meta: inbound external events' },
  { d: 'admin-analytics-dashboard', p: 'backend/src/admin', note: 'admin + ../analytics + ../dashboard + ../health' },
  { d: 'spine-events', p: 'backend/src/kloel/spine', note: 'the spine event bus: emitter, event taxonomy, envelope, ring' },
]

const DUP_CLASSES = [
  'Message dispatch / send across channels (sendMessage/sendWhatsappMessage/dispatchText/wahaSend/reply) — find every send-a-message implementation',
  'Phone normalization (normalizePhone/whatsappDigits/sanitizePhone) — every phone normalizer',
  'Tenant/workspace resolution (resolveTenant/resolveWorkspaceId/getWorkspaceId) — every workspace resolver',
  'Webhook parsing/normalization across providers — every inbound webhook parser/normalizer',
  'Brain-vs-Mind entity overlap: KloelMessage vs ChatMessage vs MindMessage; KloelMemory vs MindMemory; KloelGlobalPrior vs MindGlobalPrior; KloelConversation vs ChatThread — the canonical Kloel Mind unification',
  'Event-name variants for the same occurrence (message.received, channel.message.received, incomingMessage, etc.) — spine event taxonomy drift',
  'Idempotency / dedup helpers (checkDuplicate/dedup/idempotency) — every idempotency guard',
  'kloelMemory / kloelMessage / dispatch helper duplication inside kloel/ (the targets my memory flagged: kloelMemory×10, kloelMessage×2, dispatch×21, getWorkspaceId×13)',
]

const COMMON = `You are mapping the Kloel NestJS monorepo for an Architectural Semantic Canonicalization mission.
Use grep/glob/AST over the SOURCE (never read *.md docs). Be precise and cite file:line. Do NOT edit anything — read-only.
Treat duplication as SEMANTIC equivalence (same capability, different name/file), not just identical code.`

phase('Inventory')
const inventory = await parallel(
  DOMAINS.map((x) => () =>
    agent(
      `${COMMON}\nMap domain "${x.d}" rooted at ${x.p}. Context: ${x.note}. Return its canonical entities, main services (with one-line responsibility), event names, business capabilities (verb-noun), suspected duplications (within/across domains, file:line), and production gaps (dormant/stubbed/not-wired).`,
      { label: `inv:${x.d}`, phase: 'Inventory', schema: DOMAIN_SCHEMA, agentType: 'Explore' },
    )),
)

phase('Dedup')
const dedup = await parallel(
  DUP_CLASSES.map((c, i) => () =>
    agent(
      `${COMMON}\nHunt duplication class #${i + 1}: ${c}\nFind EVERY implementation across the whole repo (backend/, worker/, frontend/ where relevant). Return each instance with file:line and signature, propose the ONE canonical name/service/location with justification, list what to deprecate/delete, set severity (P0 bug/divergence in prod ... P3 light redundancy), sketch a small reversible migration, and note production/HOT-file/concurrent-edit risk.`,
      { label: `dedup:${i + 1}`, phase: 'Dedup', schema: DEDUP_SCHEMA, agentType: 'Explore' },
    )),
)

return { inventory: inventory.filter(Boolean), dedup: dedup.filter(Boolean) }
