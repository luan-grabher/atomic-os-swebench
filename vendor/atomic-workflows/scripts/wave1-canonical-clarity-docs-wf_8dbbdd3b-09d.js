export const meta = {
  name: 'wave1-canonical-clarity-docs',
  description: 'Produce beginner-perfect ARCHITECTURE.md per territory (universal clarity) + bounded gap inventory for the next pass',
  phases: [
    { title: 'Clarity', detail: '16 disjoint territory agents: deep MCP understanding -> crystal-clear ARCHITECTURE.md + gap inventory' },
  ],
}

const MCP = `
MCP TOOLKIT — use ALL applicable to UNDERSTAND your territory deeply before writing. ATOMIC-EDIT MCP IS LAW for any file write (the ARCHITECTURE.md you create goes through atomic_create_file — never builtin Write/heredoc). Load tools via ToolSearch "select:<tool>".
- codegraph: codegraph_search/_callers/_callees/_impact/_context/_node — symbol relationships, who-calls-what.
- gitnexus: query/route_map/impact/shape_check/context — 91k-node semantic graph; route_map gives the route table.
- cognitive-hub: protocol_hub_openapi (the NestJS routes your territory exposes) / protocol_hub_asyncapi (events your territory emits/consumes) / protocol_hub_sbom.
- atomic-edit: code_outline / code_outline_batch / code_read_symbol / code_browse — read structure precisely (do NOT full-read huge files); atomic_create_file — write the ARCHITECTURE.md.
- postgres (READ-ONLY): pg_tables/pg_table_describe — confirm the real DB tables/columns your models map to.
- graphify-plus: stub_route_inventory / metadata_for_file — find stubs in your territory.
- pulse: pulse_health_by_module — your territory's readiness + breaks.
- gitnexus/codegraph for frontend wiring: trace UI component -> api client -> proxy -> controller.`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['territory', 'archDocPath', 'oneLinePurpose', 'realStatus', 'boundedGaps', 'sharedFileNeeds'],
  properties: {
    territory: { type: 'string' },
    archDocPath: { type: 'string', description: 'repo-relative path of the ARCHITECTURE.md you created' },
    oneLinePurpose: { type: 'string' },
    realStatus: { type: 'string', description: 'honest: what actually works end-to-end vs facade/unproven, with evidence' },
    boundedGaps: {
      type: 'array', description: 'NON-owner-gated, code-fixable gaps in this territory for the next pass',
      items: {
        type: 'object', additionalProperties: false,
        required: ['what', 'file', 'bestFix', 'effort', 'priority'],
        properties: {
          what: { type: 'string' }, file: { type: 'string' }, bestFix: { type: 'string' },
          effort: { type: 'string', enum: ['trivial', 'local', 'module'] },
          priority: { type: 'string', enum: ['P1', 'P2', 'P3'] },
        },
      },
    },
    sharedFileNeeds: { type: 'string', description: 'any prisma/schema.prisma / app.module / package.json change this territory needs (for the coordinator), or "none"' },
  },
}

const DOC_SPEC = `
Write ARCHITECTURE.md so a COMPLETE BEGINNER (human or AI) understands the ENTIRE territory just by reading it + glancing at the code — clarity ABOVE typical human docs, yet 100% faithful to the real code. Required sections:
1. # <Territory> — one-line purpose (what product capability this delivers).
2. ## What the user does — plain language, the user-facing capability.
3. ## End-to-end flow — the REAL path with file paths: UI component -> frontend api client (frontend/src/lib/api/*) -> Next proxy route (if any) -> Nest controller (route + method) -> service (business rule) -> Prisma model -> DB table -> response -> UI states. Use the actual file:symbol names found via codegraph/openapi. A reader should be able to follow a request through the system.
4. ## Canonical vocabulary — the domain terms + the ONE canonical name for each concept/service/event (cross-check docs/architecture canonical artifacts if present). Note any lingering aliases/duplicates.
5. ## Key services & single responsibility — each main service: what it owns, one line.
6. ## Data & events — the Prisma models owned + events emitted/consumed (from asyncapi).
7. ## Workspace isolation — how multi-tenant scoping works here.
8. ## Honest status — what really works in production vs facade/unproven/gap (be brutally honest; cite evidence/PULSE).
9. ## Start here — for a newcomer: the 1-3 files to read first to understand this territory.
Keep it tight, navigable, link to real files. NO invented behavior. Place it at the territory's root dir.`

phase('Clarity')
const territories = [
  { t: 'auth-kyc', dir: 'backend/src', focus: 'Auth + KYC. backend/src/auth (login/register/refresh/oauth/magic-link/whatsapp/forgot/verify) + backend/src/kyc (onboarding, Connect-gated approval, guard). Doc at backend/src/auth/ARCHITECTURE.md covering both auth and kyc (or two docs).' },
  { t: 'workspaces-settings-team', dir: 'backend/src', focus: 'Workspaces, settings persistence, team. Doc at backend/src/team/ARCHITECTURE.md or workspaces area; cover workspace lifecycle + settings + team membership/roles.' },
  { t: 'products-plans', dir: 'backend/src/products', focus: 'Products, plans, product-categories, coupons, commissions, AI config. Doc at backend/src/products/ARCHITECTURE.md.' },
  { t: 'checkout-postsale', dir: 'backend/src/checkout', focus: 'Checkout product->plan->payment->confirmation + post-sale. Doc at backend/src/checkout/ARCHITECTURE.md.' },
  { t: 'money-engines', dir: 'backend/src/payments', focus: 'payments (split/ledger/fraud/connect) + marketplace-treasury. The money kernel: cents=bigint, append-only ledger, Connect onboarding/payout. Doc at backend/src/payments/ARCHITECTURE.md. Be precise about ledger/split/payout flow.' },
  { t: 'sales-refunds', dir: 'backend/src/sales', focus: 'Sales orders (boleto/stripe/pix), refunds (now gateway-real). Doc at backend/src/sales/ARCHITECTURE.md.' },
  { t: 'wallet-billing', dir: 'backend/src/billing', focus: 'Wallet/carteira (balance/transactions/withdrawals) + platform billing/subscriptions. Doc at backend/src/billing/ARCHITECTURE.md; locate the wallet/carteira code via codegraph.' },
  { t: 'whatsapp-inbox', dir: 'backend/src/marketing/channels/whatsapp', focus: 'WhatsApp Core (Meta Cloud API ONLY — WAHA is intentionally excluded/deprecated, document it as deprecated, do NOT treat as a gap) + inbox. Session lifecycle, inbound idempotency, send. Doc at backend/src/marketing/channels/whatsapp/ARCHITECTURE.md.' },
  { t: 'autopilot-flows-followup', dir: 'backend/src/autopilot', focus: 'Autopilot (AI replies w/ real data + human handoff), flows (builder+engine), followup. Doc at backend/src/autopilot/ARCHITECTURE.md covering all three + worker autopilot processors.' },
  { t: 'mind-cia-agent', dir: 'backend/src/kloel', focus: 'kloel/mind, agent-runtime, services-v2, copilot, CIA cognitive loop (bandit/prediction/outcome). Doc at backend/src/kloel/ARCHITECTURE.md. NOTE a known fabricated-PIX defect at kloel/kloel-chat-tools.workspace.helpers.ts:308 — record it as a gap (do not fix here).' },
  { t: 'crm-dashboard', dir: 'backend/src/crm', focus: 'CRM, contacts, pipeline, dashboard. Doc at backend/src/crm/ARCHITECTURE.md; note CRM contact-drawer orphan if present.' },
  { t: 'analytics-reports', dir: 'backend/src/analytics', focus: 'Analytics + reports (real aggregated queries). Doc at backend/src/analytics/ARCHITECTURE.md; note unreachable analytics tabs.' },
  { t: 'growth', dir: 'backend/src/affiliate', focus: 'Affiliate, partnerships, member-area, campaigns. Doc at backend/src/affiliate/ARCHITECTURE.md covering all four; note Campaigns engine-unmounted + member-enrollment idempotency gaps.' },
  { t: 'advanced-marketing-ads-sites', dir: 'backend/src/marketing', focus: 'marketing(rest), anuncios, meta, google-ads, sites, scrapers, growth, launch, funnels, webinars. The suspected-facade tier. Doc at backend/src/marketing/ARCHITECTURE.md; be brutally honest which deliver vs honest-setup vs facade.' },
  { t: 'ops-platform', dir: 'backend/src/api-keys', focus: 'api-keys, webhooks(REST), audit, notifications, marketplace, compliance, gdpr, public-api, media, audio, calendar, integrations, omnichannel, mass-send, email. Doc at backend/src/api-keys/ARCHITECTURE.md (ops index) covering the platform/ops surface + which are orphan backends.' },
  { t: 'worker-jobs', dir: 'worker', focus: 'All BullMQ processors/jobs (worker/). Doc at worker/ARCHITECTURE.md: each queue, producer, consumer, idempotency, what real effect it delivers vs stub.' },
]

const results = await parallel(territories.map((u) =>
  () => agent(`${MCP}\n\n=== YOUR TERRITORY: ${u.t} ===\nScope: ${u.focus}\n\nUNDERSTAND deeply via the MCPs (codegraph/gitnexus/openapi/asyncapi/postgres), then CREATE the ARCHITECTURE.md via atomic_create_file.\n\n${DOC_SPEC}\n\nThen return the structured result (archDocPath, honest realStatus, the bounded code-fixable gaps you found for the next pass, and any shared-file needs). Read real code; cite real paths; invent nothing; WAHA is intentionally excluded (mark deprecated, not a gap).`,
    { label: `clarity:${u.t}`, phase: 'Clarity', schema: SCHEMA })
))

return { results: results.filter(Boolean) }
