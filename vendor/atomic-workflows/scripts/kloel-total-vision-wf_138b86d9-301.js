export const meta = {
  name: 'kloel-total-vision',
  description: 'Code-grounded total macro view of Kloel: canonicalization map + KloelGraph wiring-recovery map + production gaps (read-only, tools not docs)',
  phases: [
    { title: 'Recon', detail: '11 orthogonal code/AST/git agents (no .md)' },
    { title: 'Synthesize', detail: 'fuse into one canonical total vision + execution plan' },
  ],
}

const RECON = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'summary', 'findings', 'production_gaps'],
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: '5-10 sentence brutally concrete, code-grounded summary' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'evidence', 'severity'],
        properties: {
          title: { type: 'string' },
          evidence: { type: 'string', description: 'concrete: file:symbol, rg counts, commit SHA, endpoint' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          canonical_or_fix: { type: 'string', description: 'proposed canonical name/owner OR the hook/endpoint to wire' },
          files: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    production_gaps: { type: 'array', items: { type: 'string' }, description: 'what is incomplete/fake/dead for production in this area' },
  },
}

const SYNTH = {
  type: 'object',
  additionalProperties: false,
  required: ['domain_map', 'omnichannel', 'mind_unification', 'capabilities', 'graph_recovery_matrix', 'execution_plan', 'next_step', 'honest_caveats'],
  properties: {
    domain_map: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['domain', 'role', 'is_cognition'], properties: { domain: { type: 'string' }, role: { type: 'string' }, file_areas: { type: 'string' }, is_cognition: { type: 'boolean' } } } },
    omnichannel: { type: 'object', additionalProperties: false, required: ['whatsapp_marketing_same', 'verdict', 'plan'], properties: { whatsapp_marketing_same: { type: 'boolean' }, verdict: { type: 'string' }, plan: { type: 'string' } } },
    mind_unification: { type: 'object', additionalProperties: false, required: ['pieces', 'unified_model', 'loop_mapping', 'risk'], properties: { pieces: { type: 'array', items: { type: 'string' } }, unified_model: { type: 'string' }, loop_mapping: { type: 'string' }, risk: { type: 'string' } } },
    capabilities: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['capability', 'canonical_owner', 'status'], properties: { capability: { type: 'string' }, canonical_owner: { type: 'string' }, duplicate_impls: { type: 'array', items: { type: 'string' } }, status: { type: 'string' } } } },
    graph_recovery_matrix: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['area', 'graph_state', 'fix'], properties: { area: { type: 'string' }, graph_state: { type: 'string', description: 'connected | fake-data | dead-mechanism | missing' }, legacy_source: { type: 'string', description: 'legacy component + commit/hook' }, lost_mechanism: { type: 'string' }, fix: { type: 'string', description: 'exact hook/endpoint/component to rewire' }, severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] } } } },
    capabilities_note: { type: 'string' },
    execution_plan: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['phase', 'goal', 'severity', 'risk', 'production_safe'], properties: { phase: { type: 'string' }, goal: { type: 'string' }, severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] }, risk: { type: 'string' }, production_safe: { type: 'boolean' }, effort: { type: 'string' } } } },
    next_step: { type: 'string' },
    honest_caveats: { type: 'array', items: { type: 'string' } },
  },
}

const COMMON = `You map the Kloel codebase at /Users/danielpenin/kloel for a UNIFIED mission: (1) semantic canonicalization of the backend into ONE cognitive organism, and (2) reconnecting the new "KloelGraph" Next.js UI (a perfect visual shell: constellation of nodes, each screen opens in an 80% popup) to the REAL backend + real account data — the visual migration kept the look but LOST the wiring; many screens are now shells with hardcoded/fake data and dead buttons. Stack: NestJS backend, Next.js frontend (frontend/), BullMQ worker, Prisma.
RULES: Derive EVERYTHING from SOURCE CODE and GIT HISTORY. Use rg/grep, read .ts/.tsx/.prisma, AST/symbol tools (atomic_outline, atomic_ast_search, atomic_grep, LSP) where precise, and \`git log/show/diff\` to find LEGACY (pre-graph-migration) components and their wiring. IGNORE all *.md docs. Be brutal, concrete: cite file:symbol, rg counts, commit SHAs, endpoint paths. READ-ONLY — modify nothing. Return via schema.`

const AREAS = [
  { label: 'kloel-core', focus: 'Decompose backend/src/kloel (~1699 files, the center of mass). List its submodules (agent-runtime, mind, cia, abi, self-awareness, v-tier, lineage, capability-registry-v2, services-v2, unified-agent*, kloel-thinker, kloel-reply-engine, guest-chat, memory-management, etc.), what each DOES from code, file counts, and which are genuine cognition (state→perception→decision→action→learning) vs plumbing. Flag internal overlap/duplication between submodules and what should merge.' },
  { label: 'omnichannel', focus: 'Decide if backend/src/whatsapp (~397 files) and backend/src/marketing (~170) + backend/src/marketing/channels are the SAME concept duplicated. Compare services/entities/events/providers. Propose the canonical OmniChannel model where WhatsApp is one channel among Email+TikTok+Meta(IG/FB/WhatsApp) under Marketing. List what in whatsapp is dead/obsolete (delete) vs good (dilute into marketing).' },
  { label: 'mind-unify', focus: 'Map the cognition surfaces to fuse into ONE Kloel Mind: Brain (KloelSession/KloelMessage/KloelMemory/ChatThread/ChatMessage), Mind (MindBelief/MindPrediction/MindPolicy/MindBanditArm/MindCase/MindGraphNode/MindGuardAudit/MindDailyReport), CIA (~28 files: advisor, cognitive-health, runtime), Flows (nodes+edges), Autopilot, Copilot, Voice, money-machine. From CODE list entities/events/services per piece; identify overlap/duplication; propose the unified Mind model + map it onto the active-inference loop (state→perception→belief→prediction→action→consequence→surprise→update). Rate unification risk.' },
  { label: 'capability-dedup', focus: 'Find semantic duplication of CAPABILITIES across backend. rg for: message send/dispatch (sendMessage, sendText, dispatch, waha, reply, executeMessageAction, channel send), phone normalize (normalizePhone), tenant/workspace resolve, webhook parse, idempotency. For each capability list ALL implementations (file:symbol), choose a canonical owner, rate dup severity (P0 if behavior diverges in prod).' },
  { label: 'events-entities', focus: 'Inventory ALL domain events (rg for emit/@OnEvent/eventEmitter and event string literals like x.y.z and X_Y) — show the naming chaos (message_received vs channel.message.received vs WA_MESSAGE...) and a canonical taxonomy. Then from backend/prisma/schema.prisma (+ worker) list entities and find identity dup (Lead/Contact/Customer/User/Client/Prospect), Kloel* vs Mind* models, and tables that exist because a domain was recreated elsewhere. Propose canonical entities + the official domain list.' },
  { label: 'graph-shell', focus: 'Map the new KloelGraph frontend (frontend/src). Find the node/constellation + 80%-popup architecture (the component that renders nodes and opens screens). Map each major area to its graph component(s): Perfil (Pessoal/Fiscal/Docs/Banco/Público/Equipe/Apps/Segurança), Kloel chat (Novo Chat/Buscar/Imagens/Recentes), Criar/Produtos, Afiliar, Educar, Conversar/Canais, Carteira. Show routing and how a node opens a screen. No UI changes — just map.' },
  { label: 'fake-data', focus: 'Hunt hardcoded/seed/fake data used as SOURCE OF TRUTH in the authenticated app (must be replaced by real API). rg for the known fakes (GHK-CU, PDRN products) and for hardcoded arrays/objects feeding products, profile, conversations, affiliates, marketplace, courses, CRM, contacts, wallet, campaigns. For each: file:symbol + whether a real API hook/endpoint already exists to replace it. Seeds are only OK in fixtures/stories/dev — flag any used in the real app.' },
  { label: 'dead-mechanisms', focus: 'Find dead buttons/menus/uploads/pickers in the new graph (onClick that is no-op/empty/TODO, missing handler, console.log, not wired to a hook/mutation). Prioritize the named critical ones: chat "+" menu (attach image/media/document, link product, create site, web search, image generation, refinement tables), birthdate DATE PICKER (must be date popup, no time), CNPJ auto-fill on Fiscal, Brazilian BANK LIST select, global Buscar, Recentes history load, attach (+Anexar) button. List each dead mechanism with the legacy behavior it should have.' },
  { label: 'legacy-wiring', focus: 'Via git history, find the LEGACY (pre-graph-migration) components for the inventory areas and their wiring (API hooks, contexts, mutations, services, uploads, validations). Then check whether the new graph components reuse them. Inspect frontend/src/lib/api (and hooks) — enumerate the client API surface and find endpoints/hooks that EXIST but are ORPHANED (defined, not called by the graph). Produce a legacy→graph map per area with the exact hook/endpoint that must be rewired. Use git log --diff-filter to find when components were replaced.' },
  { label: 'backend-api', focus: 'Enumerate backend controllers/routes/services that EXIST and are READY as wiring targets (NestJS @Controller/@Get/@Post). Cover: profile, fiscal/CNPJ lookup (BrasilAPI/ReceitaWS/proxy), bank list, doc upload/storage, products + ProductNerveCenter (plans/checkouts/urls/commission/coupons/campaigns/reviews/afterpay/product-AI), affiliates/marketplace, courses/members-area, channels OAuth (WhatsApp/IG/FB/TikTok/email), chat/AI engine, wallet, global search, conversation history. For each capability state: backend READY (endpoint exists) vs MISSING (must be built).' },
  { label: 'prod-gaps', focus: 'What is incomplete for PRODUCTION across the stack from CODE signals: rg for TODO/FIXME/NotImplemented/throw new (Gone/NotImplemented)/mock/stub/placeholder/fake/hardcoded returns. Capture the active WhatsApp Meta-only migration state (throwMetaOnlyGone stubs). Capture the known red gates: backend tsc strict errors (count by rule), knip SIGSEGV, canonical G24 (checkout.deleted), prisma worker-schema drift. Produce the real prioritized "what is left to make the machine work in production" list.' },
]

phase('Recon')
const recon = await parallel(
  AREAS.map((a) => () => agent(`${COMMON}\n\nYOUR FOCUS (area="${a.label}"): ${a.focus}`, { label: a.label, phase: 'Recon', schema: RECON }))
)
const reports = recon.filter(Boolean)
log(`Recon done: ${reports.length}/${AREAS.length} reports`)

phase('Synthesize')
const synthesis = await agent(
  `You are the senior architect. Fuse these ${reports.length} code-grounded recon reports into ONE canonical TOTAL VISION of Kloel and a prioritized execution plan for the unified mission (canonicalize the backend into one cognitive Mind + reconnect the KloelGraph UI to the real backend/data + complete to production).\n\nREPORTS (JSON):\n${JSON.stringify(reports)}\n\nProduce, grounded ONLY in the reports' evidence: the official domain map (mark which are real cognition); the OmniChannel verdict (is WhatsApp == Marketing?) + plan; the Mind-unification plan (fuse Brain+Mind+CIA+Flows+Autopilot) mapped onto the active-inference loop + its risk; the capability catalog with canonical owners + duplicates; the KloelGraph RECOVERY MATRIX (per area: graph_state connected/fake-data/dead-mechanism/missing, legacy_source, lost_mechanism, the exact fix hook/endpoint/component); the prioritized execution_plan (P0..P3 phases, each with risk + production_safe + effort); the single most obvious next_step; and honest_caveats (what is large/risky/multi-phase, and any contradictions like 'unify architecture' vs 'never change behavior'). Be honest and brutal.`,
  { label: 'synthesize', phase: 'Synthesize', schema: SYNTH }
)
return { reports, synthesis }
