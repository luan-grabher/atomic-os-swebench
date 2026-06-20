export const meta = {
  name: 'kloel-canonicalization-recon',
  description: 'Deep parallel recon for the Kloel canonicalization + production-completion mission: production-breakers, whatsapp→marketing OmniCore fusion, Brain→Mind unification, canonicalization gaps, production-completeness — evidence-based file-level plans',
  phases: [{ title: 'Recon', detail: '5 evidence-based investigation streams in parallel' }],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['stream', 'summary', 'findings'],
  properties: {
    stream: { type: 'string' },
    summary: { type: 'string', description: '3-5 sentence executive summary of the real measured state' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'evidence', 'action'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          files: { type: 'string', description: 'key file:line references (real, verified)' },
          evidence: { type: 'string', description: 'what you actually found (grep/codegraph/lsp output), not speculation' },
          action: { type: 'string', description: 'concrete next step to fix/canonicalize/complete' },
          collisionRisk: { type: 'string', description: 'is this in the concurrent-agents lane (thinker/reply-engine/wrapper/streaming/backend pulse)? safe-now or wait?' },
        },
      },
    },
  },
}

const BASE = `You are a senior architect doing EVIDENCE-BASED recon on the KLOEL monorepo (repo root /Users/danielpenin/kloel, also reachable via /Users/danielpenin/whatsapp_saas symlink). NestJS backend, Next.js frontend, BullMQ worker. Use real tools: Bash (git grep, rg, wc), Read, and if useful the codegraph/lsp MCPs. DO NOT read .md docs as your source of truth — measure the actual code. Be precise: cite real file:line and real grep counts, never speculate. CONCURRENT AGENTS are live in backend/src/kloel/{thinker,reply-engine,openai-wrapper,stream,tool-dispatcher} + deleting backend/src/pulse — flag anything in that lane as collision-risk. Goal of the mission: (1) make the whole machine work 100% in production, (2) canonicalize semantics (one official name/service/event/capability per concept), (3) specific directives: dissolve backend/src/whatsapp INTO an omnichannel backend/src/marketing (Email+TikTok+Meta[IG+FB+WhatsApp]) keeping the good, deleting the obsolete; unify Kloel Brain (KloelSession/KloelMessage/KloelMemory/ChatThread/ChatMessage) + Mind (MindBelief/MindPrediction/MindPolicy/MindBanditArm/MindCase/...) into a SINGLE 'Kloel Mind'. Return ONLY the structured findings — file-level, actionable, severity-ranked.`

phase('Recon')

const streams = [
  { key: 'production-breakers', prompt: `${BASE}\n\nSTREAM: PRODUCTION BREAKERS. The hot-cluster ranker flagged /auth/refresh with live runtime errors (error-rate+33) and the local Postgres pool is exhausted ("too many clients"). Investigate: (a) the /auth/refresh flow (backend/src/auth — controller/service/guard/refresh-token logic) for the real bug causing production errors; (b) DB connection pool exhaustion — is there a Prisma connection leak (missing disconnect, per-request client, unbounded pool)? grep prisma.service.ts + PrismaClient instantiations; (c) any boot/DI failures or 500-prone routes. Rank P0/P1 with file:line + concrete fix.` },
  { key: 'whatsapp-to-marketing', prompt: `${BASE}\n\nSTREAM: WHATSAPP→MARKETING OMNICORE FUSION. Map backend/src/whatsapp (≈397 graph nodes) vs backend/src/marketing (≈170). For each: list the services/controllers/capabilities. Determine what is DUPLICATED between them, what in whatsapp is GOOD/useful (to dissolve into an omnichannel marketing/channel layer), and what is OBSOLETE/dead (to delete). Identify the canonical target (e.g. a MessageDispatch/ChannelGateway capability with per-channel adapters: WhatsApp via WAHA/Meta, Email, TikTok, Meta IG/FB). Produce a concrete fusion plan: what moves where, what gets deleted, what adapters are needed, and the migration order. Verify who CALLS whatsapp services (blast radius). Flag collision risk.` },
  { key: 'brain-to-mind', prompt: `${BASE}\n\nSTREAM: BRAIN→MIND UNIFICATION. Map the two cognitive systems: Kloel Brain (Prisma models KloelSession/KloelMessage/KloelMemory/ChatThread/ChatMessage + events kloel.message.created/kloel.action.executed) and Mind (MindBelief/MindPrediction/MindPolicy/MindBanditArm/MindCase/MindGraphNode/MindGuardAudit/MindDailyReport — Bayesian inference + multi-armed bandit). grep their services/modules/usage. Determine overlap, what each does, and a concrete plan to unify into a single 'Kloel Mind' (which models/services survive canonical, which get migrated/deprecated, schema/Prisma migration impact, event renames). HEAVY collision risk: backend/src/kloel is the concurrent-agents lane — assess carefully and mark what's safe-now vs must-coordinate.` },
  { key: 'canonicalization-gaps', prompt: `${BASE}\n\nSTREAM: CANONICALIZATION GAPS (events/services/capabilities/vocabulary). AsyncAPI shows 122 events, mostly canonical (commerce.*/cognition.*/channel.*) but with legacy stragglers (kloel.*, agent.*, autopilot.*, billing.*, account.*). Find: (a) remaining NON-canonical events still emitted in code (grep emit/EventEmitter2 for kloel.* agent.* autopilot.* etc) and their canonical target; (b) duplicate CAPABILITIES implemented in multiple places — specifically message dispatch (sendMessage/sendText/dispatch/wahaSend), phone normalization (normalizePhone), tenant/workspace resolution, webhook parsing, idempotency — count implementations and name the canonical one; (c) duplicate service responsibilities. There are existing docs/architecture/CANONICAL_* files (domains/vocabulary/capability-map/event-taxonomy/service-catalog/duplication-register/deprecation-map) — cross-check code against them to find what is NOT yet migrated. Produce the remaining migration list, ranked.` },
  { key: 'production-completeness', prompt: `${BASE}\n\nSTREAM: PRODUCTION-COMPLETENESS SWEEP. Identify what is still NOT production-ready across modules: stub routes (controllers returning empty arrays or {ok:true} or NotImplemented), pages/handlers with fabricated data (random-number-generated metrics, hardcoded literal arrays shown as data), dead API calls (frontend calling non-existent endpoints), services doing prisma directly instead of via service layer, prismaAny usages in new code. Focus on the TIER 3/4 facade modules (Anuncios, Marketing, Sites, Vendas, Canvas, Funnels, Webinarios, Leads) and any backend route that 500s. Use grep + codegraph. Produce a ranked list of concrete completion tasks (module → gap → fix) that move the machine toward 100% production.` },
]

const results = await parallel(
  streams.map((s) => () =>
    agent(s.prompt, { label: `recon:${s.key}`, phase: 'Recon', schema: FINDINGS_SCHEMA, agentType: 'Explore' })
  )
)

return results.filter(Boolean)
