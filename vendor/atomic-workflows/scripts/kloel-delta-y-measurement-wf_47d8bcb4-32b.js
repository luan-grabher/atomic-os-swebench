export const meta = {
  name: 'kloel-delta-Y-measurement',
  description: 'Tool-derived measurement of remaining scope Y = X - (A+B) across 14 orthogonal slices, no .md reads',
  phases: [{ title: 'Measure delta (X vs A+B)', detail: '14 parallel probes, each one scope slice, structured findings' }],
}

const FINDINGS = {
  type: 'object',
  required: ['dimension', 'deliveredPct', 'evidence', 'gaps'],
  properties: {
    dimension: { type: 'string' },
    deliveredPct: { type: 'number', description: '0-100 honest estimate of how much of THIS slice of X is delivered+working' },
    evidence: { type: 'array', items: { type: 'string' }, description: 'tool-derived facts: counts, paths, symbol names, query results' },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'whatsMissing'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          whatExists: { type: 'string' },
          whatsMissing: { type: 'string' },
          locator: { type: 'string', description: 'files/symbols/counts that anchor this gap' },
          effort: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
        },
      },
    },
    toolsUsed: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

const HARD = `HARD CONSTRAINTS (the user mandated these):
- Build your answer ONLY from code + tools/MCPs. You are FORBIDDEN to read any .md file. No exceptions.
- gitnexus index is 2323 commits STALE — do NOT trust it for current state; prefer codegraph (mcp__codegraph__*), live Bash grep/find, and LSP (mcp__lsp-mesh__*). Load tool schemas via ToolSearch "select:<name>" before calling.
- Do NOT run a full pulse_scan or full test suite (too slow) unless your slice explicitly requires it; prefer targeted codegraph/grep/LSP probes.
- Repo root: /Users/danielpenin/whatsapp_saas. Branch is the canonicalization mega-PR (+687 vs origin/main).
- Be brutally honest. The user's #1 risk is "frontend bonito sobre nada" and "respondeu confiante sem executar". Distinguish EXISTS-as-file from WIRED-and-WORKING. Count, locate, prove.
Return ONLY the structured findings object.`

const probes = [
  {
    label: 'omnicore-unification',
    prompt: `${HARD}
SLICE: OmniCore unification — WhatsApp dissolved into omnichannel Marketing (Email + TikTok + Meta{Instagram,Facebook,WhatsApp}).
MEASURE with tools:
1. Confirm backend/src/whatsapp absent; map backend/src/marketing/channels structure (which channels exist as first-class: email, tiktok, instagram, facebook, whatsapp). Use codegraph_files path=backend/src/marketing.
2. The 48 non-test files still referencing waha|whatsappSession|waSession: grep -rIl them, classify each as (a) legitimate WhatsApp-provider adapter that belongs under a channel, vs (b) legacy duplicate to delete/migrate. Sample-read 5-8 to judge.
3. Is there a canonical MessageDispatch/ChannelGateway service all channels route through, or N parallel senders? Find sendMessage/dispatch variants via codegraph_search.
4. Is there a single ChannelSession concept or scattered session types?
deliveredPct = how complete the OmniCore dissolution+omnichannel canonicalization is. gaps = what remains.`,
  },
  {
    label: 'brain-mind-model-unification',
    prompt: `${HARD}
SLICE: Brain (KloelSession/KloelMessage/KloelMemory/ChatThread/ChatMessage) + Mind (MindBelief/MindPrediction/MindPolicy/MindBanditArm/MindCase/MindGraphNode/MindGuardAudit/MindDailyReport) + CIA + Flows + Autopilot + Copilot + Voice + MoneyMachine must all collapse into ONE "Kloel Mind" cognitive core. Non-cognition must be deletable.
MEASURE:
1. Prisma schema (backend/prisma/schema.prisma) — list every Kloel*/Chat*/Mind*/CIA*/Flow*/Voice* model. Identify DUPLICATE concepts across Brain vs Mind: KloelMessage vs MindMessage, KloelMemory vs MindMemory, KloelGlobalPrior vs MindGlobalPrior, etc. For each duplicate pair, postgres pg_count both tables to see which is live.
2. For top duplicate models, codegraph_callers to count real call sites of each — which is canonical, which is legacy.
3. Are backend/src/cia, copilot, flows, autopilot, kloel/mind separate modules or unified? codegraph_files each. Is there a single cognitive entrypoint or many?
4. Judge: how far from "only Kloel Mind, everything unified". gaps = concrete merge/delete actions with model names + row counts.`,
  },
  {
    label: 'cognitive-loop-closure',
    prompt: `${HARD}
SLICE: The closed causal loop in PRODUCTION: state -> perception -> memory -> belief/model -> prediction -> decision/action -> result -> surprise/error -> belief/policy update -> next better decision. Must actually run, not be stubs.
MEASURE:
1. Find each stage's real implementation via codegraph_search + codegraph_callees: StateBuilder, perception/event ingestion into Mind, MindBelief update, MindPrediction, decision/policy (MindPolicy/bandit), action execution, outcome capture (closeOutcome), bandit.recordOutcome / belief update on outcome.
2. CRITICAL: trace whether the loop is CLOSED — does an executed action's outcome flow back to update MindBelief/MindBanditArm? Find the call chain from action result -> recordOutcome. Memory of prior sessions flagged the loop OPEN at closeOutcome -> bandit.recordOutcome. Verify with codegraph_callers on recordOutcome and on the outcome handler.
3. postgres: pg_count MindBelief, MindPrediction, MindBanditArm, MindCase, MindOutboxEvent — are these tables actually populated (loop producing data) or empty (loop never ran)?
4. Find TODO/NotImplemented/throw in the loop path via grep.
deliveredPct = how closed+live the loop is. gaps = each open link.`,
  },
  {
    label: 'capability-map-coverage',
    prompt: `${HARD}
SLICE: Kloel chat = full SaaS operator. capability-registry-v2 must cover every UI/API action as a conversable capability across tiers: 0 self-awareness, 0b query, 0c mutations, 1 products(create+edit), 2 PLANS, 3 checkouts, 4 ? , 5 sales(PIX/boleto/card), 6 urls, 7 affiliates, 8 MARKETPLACE, 9 wallet, 10 reports, 11 configuration, 12 marketing. Plus coupons.
MEASURE:
1. Read backend/src/kloel/capability-registry-v2/capability-registry-v2.const.ts and each partitions/*.ts via code_outline (NOT full read) — enumerate every registered capability id + title.
2. Identify MISSING tiers/capabilities: tier-2 (plans), tier-4, tier-8 (marketplace), coupons — present or absent? products EDIT subsections (dados gerais/planos/checkouts/urls/comissionamento/cupons/campanhas/avaliacoes/afterpay/IA)? PIX+boleto+card sales? config/documents/theme?
3. For 8-10 sampled capabilities, check the execute() actually calls a domain service (ctx.services.*) vs prisma direct vs stub/throw.
deliveredPct = fraction of the required capability map that is registered AND wired. gaps = each missing/stubbed capability with tier.`,
  },
  {
    label: 'intent-router-determinism',
    prompt: `${HARD}
SLICE: Deterministic routing — every user msg passes IntentRouter (deterministic) BEFORE the LLM; LLM never decides whether to call a tool for a real action. Components: IntentRouter.classify, ToolPlanner, Executor, Receipt, confirmation gate for MUTATION_SENSITIVE.
MEASURE via codegraph_search + code_outline:
1. Does IntentRouter exist and is it called before LLM in the chat handler? Find the chat message entrypoint (kloel chat-stream / send-message) and trace order: router-first or llm-first?
2. ToolPlanner / Executor / Receipt types — exist and wired? Find Receipt-shaped return (toolName/auditLogId/domainEvents/idempotencyKey).
3. confirmation gate for sensitive capabilities — implemented?
4. ANTI-PATTERN hunt: any code path where the LLM's tool_call is the only trigger (no deterministic fallback) for action intents? grep for tool dispatch.
deliveredPct = how deterministic+receipted the action path is. gaps = each missing guarantee.`,
  },
  {
    label: 'domain-service-purity',
    prompt: `${HARD}
SLICE: Anti-pattern 2.2 — tools/capabilities must call the SAME domain service the UI/API uses, never prisma directly (which bypasses validation/events/audit/tenant-isolation).
MEASURE:
1. In backend/src/kloel/** (capabilities, tools, executors), grep for direct prisma usage: this.prisma. / prismaAny / prisma.$ inside capability execute/tool handlers. Count files and occurrences.
2. Compare: how many capabilities route through a domain service vs prisma-direct. Sample 10 capabilities.
3. Find prismaAny usage count repo-wide (legacy untyped bypass) via grep.
deliveredPct = fraction of capability/tool code that is domain-service-pure. gaps = list of prisma-direct offenders with paths/counts.`,
  },
  {
    label: 'typecheck-lint-health',
    prompt: `${HARD}
SLICE: Production-green requires build/typecheck/lint passing across backend, frontend, worker.
MEASURE — this slice IS allowed to run the slow tools:
1. mcp__test-runner__run_tsc package=backend timeoutMs=540000. Capture pass/fail + error count + first 15 distinct error files.
2. mcp__test-runner__run_tsc package=worker timeoutMs=300000.
3. mcp__test-runner__run_tsc package=frontend timeoutMs=420000.
4. If time remains, mcp__test-runner__run_eslint package=backend timeoutMs=300000 — capture error/warning counts only.
Report exact numbers. deliveredPct = 100 if all green, scaled down by error volume. gaps = each failing package with counts. If a run times out, report partial honestly as a blocker.`,
  },
  {
    label: 'event-taxonomy',
    prompt: `${HARD}
SLICE: Canonical Event Taxonomy — one canonical event name per occurrence (e.g. channel.message.received, checkout.completed, payment.approved), legacy variants (whatsapp.message.incoming, WA_MESSAGE_RECEIVED, message_received) eliminated.
MEASURE:
1. mcp__cognitive-hub__protocol_hub_asyncapi (try domains: commerce, cognition, pulse, kloel) — count indexed events; note the spec's generation freshness if shown.
2. Live grep for event emission/subscription strings across backend/src + worker: emit('...'), on('...'), eventBus, EventEmitter2 @OnEvent('...'). Extract distinct event-name string literals; bucket canonical (dot.namespaced) vs legacy (snake/SCREAMING/whatsapp-prefixed).
3. Is there a single Mind outbox / event spine (MindOutboxEvent) or scattered emitters?
deliveredPct = canonical-event fraction. gaps = legacy event clusters to canonicalize with counts.`,
  },
  {
    label: 'api-surface-stubs',
    prompt: `${HARD}
SLICE: API completeness — no endpoint returning [] / {ok:true} / mock to fake progress; every route backed by real service+DB.
MEASURE:
1. mcp__cognitive-hub__protocol_hub_openapi (query a few: products, checkout, kloel, marketing) — route count; note spec freshness.
2. Live grep backend/src controllers for stub returns: 'return []' / 'return { ok: true }' / 'return {}' / NotImplemented / 'TODO' in controller+service bodies. Count + sample 10 with paths.
3. mcp__gitnexus__shape_check is stale — skip; instead spot-check 5 controllers via code_outline for handlers with empty/throw bodies.
deliveredPct = real-endpoint fraction. gaps = stub/mock endpoints with paths.`,
  },
  {
    label: 'sarif-sbom-security',
    prompt: `${HARD}
SLICE: Static-analysis + supply-chain posture for production readiness.
MEASURE:
1. mcp__cognitive-hub__protocol_hub_sarif severity=error then severity=warning — counts + top recurring rules. Note spec freshness.
2. mcp__cognitive-hub__protocol_hub_sbom workspace=backend (and root) — dependency count; flag anything obviously risky/duplicated.
3. Quick secret-leak probe: grep for hardcoded sk_live/sk_test/Bearer/api_key literals in backend/src (report COUNT and file paths ONLY, never the secret value).
deliveredPct = clean-posture estimate. gaps = finding clusters.`,
  },
  {
    label: 'runtime-prod-state',
    prompt: `${HARD}
SLICE: Is it actually live + producing real data in production? (events->memory->belief->action loop needs real rows.)
MEASURE:
1. postgres pg_tables, then pg_count on commerce+cognition tables: KloelSale, KloelLead, KloelConversation, KloelMessage, MindBelief, MindBanditArm, MindCase, ChatMessage, and core: User/Workspace if present. Which have real rows vs zero?
2. mcp__postgres__pg_recent on KloelMessage or ChatMessage (orderBy a timestamp col) — is the chat actually used recently?
3. Railway: load mcp__plugin_railway_railway__list_projects + environment_status (or railway CLI via Bash with RAILWAY_API_TOKEN if MCP fails) — are backend+worker deployed and healthy? Note last deploy state.
4. Sentry: mcp__sentry-bridge__sentry_recent_issues or sentry_top_issues — recent production errors count + top issue.
deliveredPct = how live+healthy prod is. gaps = dead/empty/erroring pieces. Note any auth blockers as blockers, don't fabricate.`,
  },
  {
    label: 'canonicalization-artifacts-and-gates',
    prompt: `${HARD}
SLICE: The 7 canonical artifacts + anti-regression GATES enforced in CI/husky (not just docs). And measured duplication reduction.
MEASURE (without reading the .md content — only check EXISTENCE + whether code/gates reference them):
1. ls docs/architecture/ for CANONICAL_DOMAINS / CANONICAL_VOCABULARY / CAPABILITY_MAP / EVENT_TAXONOMY / SERVICE_CATALOG / DUPLICATION_REGISTER / DEPRECATION_MAP (existence only, do not read).
2. Anti-regression gates: find scripts/ops/check-*.mjs and .husky/* and .github/workflows/* that ENFORCE canonical rules (no new event without taxonomy, no new dispatcher, etc.). Which canonical rules are actually gated vs only documented? grep gate scripts for 'canonical'/'taxonomy'/'dispatch'/'normalizePhone'/'resolveTenant'.
3. Real duplication metrics via codegraph_search: count distinct definitions of normalizePhone, resolveTenant/resolveWorkspace, dispatch/sendMessage, parseWebhook. >1 each = live duplication.
deliveredPct = artifacts-exist AND gates-enforce fraction. gaps = ungated rules + live duplications with counts.`,
  },
  {
    label: 'frontend-chat-wiring',
    prompt: `${HARD}
SLICE: Frontend Kloel chat must be real: no localStorage-as-database for chat history/state; SSE stream must have terminal-event handling (prior bug: isReplyInFlight stuck forever / 300s watchdog); apiFetch wired to capability backend; theme toggle + file upload (image/PDF) paths exist.
MEASURE in frontend/src (components/kloel + lib/api):
1. grep localStorage usage in kloel chat components — is it memory-of-record (anti-pattern) or just UI prefs?
2. Find the chat send/stream hook (e.g. KloelDashboardSendMessage / chat-stream) via code_outline — does it handle SSE terminal event + have a watchdog? Is reply-in-flight derivable-stuck?
3. Is chat history loaded from backend (apiFetch) or only localStorage?
4. File upload (image/PDF) -> capability path wired in UI?
deliveredPct = real-wiring fraction. gaps = each frontend honesty/wiring gap.`,
  },
  {
    label: 'test-coverage-real',
    prompt: `${HARD}
SLICE: Real test coverage for production claim, esp. cognition core + payment engines (Split/Ledger/Fraud must be ~95-100%).
MEASURE (do NOT run full jest — too slow; measure structurally):
1. find backend/src -name '*.spec.ts' count vs services count (461). Ratio.
2. Specifically: do SplitEngine, LedgerEngine, FraudEngine have specs? Do Mind* core services (belief/bandit/policy/prediction) have specs? Do capability-registry-v2 capabilities have e2e/integration specs (chat->execute->DB)? grep spec files for these.
3. Any coverage threshold config (jest coverageThreshold) in backend — what % is enforced? grep package.json/jest config.
4. e2e/ dir: are there Playwright/integration tests that exercise chat->real action? code_outline a couple.
deliveredPct = real-coverage estimate for critical paths. gaps = untested critical modules.`,
  },
]

const results = await parallel(
  probes.map((p) => () =>
    agent(p.prompt, { label: p.label, phase: 'Measure delta (X vs A+B)', schema: FINDINGS, model: 'sonnet' })
      .then((r) => ({ ...r, _label: p.label }))
  )
)

return results.filter(Boolean)
