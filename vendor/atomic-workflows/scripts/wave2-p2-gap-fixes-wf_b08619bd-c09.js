export const meta = {
  name: 'wave2-p2-gap-fixes',
  description: 'Fix 6 disjoint bounded P2 gaps (worker/calendar/analytics/crm/flows/ads) atomic-only, each self-validated',
  phases: [{ title: 'FixP2', detail: '6 disjoint agents: media-placebo, calendar-fake-id, analytics-adspend, crm-stage-event, flows-wait-scheduler, google-token-unify' }],
}

const MCP = `
MCP TOOLKIT — use ALL applicable. ATOMIC-EDIT MCP IS LAW: every mutation through it (code_read_symbol/code_outline to read; atomic_replace_text/atomic_edit/atomic_create_file to mutate; snapshot->validate->trace). NEVER builtin Edit/Write/heredoc. Bash only for read/verify (grep/sed/jest/tsc/eslint). Load tools via ToolSearch "select:<tool>".
- codegraph (_search/_callers/_callees/_context) + gitnexus (query/route_map) — understand + find callers BEFORE editing.
- test-runner (run_jest/run_tsc/run_eslint/affected_tests) — MANDATORY validation before done.
- cognitive-hub protocol_hub_openapi (routes) / protocol_hub_asyncapi (events) / context7 query-docs (Prisma/Nest) when implementing.
- postgres (READ-ONLY pg_table_describe/pg_query) to confirm real tables/columns.
RULES: stay strictly in your file territory. If a change needs prisma/schema.prisma / app.module.ts / package.json, do the CODE part and RETURN the need in sharedFileNeeds. Add/adjust the test proving your fix. Validate (tsc + affected specs + eslint) before finishing. Honest states only — never fabricate data/URLs/ids; on provider/feature unavailability throw a typed error or return a setup-required/degraded state. Avoid comment words that trip heuristics: do not write the literal words fake/mock/stub/bypass or 'return { ok: true }' in NEW comments (use "fabricated"/"placeholder-removed"/"unverified"/"honest" instead).`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gap', 'done', 'summary', 'filesChanged', 'validation', 'sharedFileNeeds'],
  properties: {
    gap: { type: 'string' }, done: { type: 'boolean' }, summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string' }, sharedFileNeeds: { type: 'string' }, residual: { type: 'string' },
  },
}

phase('FixP2')
const units = [
  { g: 'worker-media-video-placebo', p: `worker/media-processor.ts 'generate-video' job is a placebo: it waits ~2s then writes a fabricated outputUrl (a fake .mp4) and marks success — no real render happens, so users get a dead video URL. FIX: stop fabricating the output. Either (a) if a real renderer/provider integration exists or can be called (check via codegraph for any media/video provider), wire it with timeout + error handling and persist the REAL output url; or (b) if none is configured, mark the job FAILED / status 'unavailable' with an honest reason (no fabricated url), so the UI shows a setup-required/failed state instead of a broken link. Territory: worker/media-processor.ts (+ any co-located spec). VALIDATE: worker tsc (cd worker && npx tsc --noEmit) + any media-processor spec; grep proves no fabricated .mp4 url remains in a success path.` },
  { g: 'calendar-fabricated-event-id', p: `backend/src/calendar/calendar.service.ts saveInternalEvent fabricates a fake event id (a "local_" prefix concatenated with the current timestamp) when the Appointment model/path is missing (around the catch branch ~L228), returning it as a real saved event. FIX: on that branch, do NOT fabricate an id — throw a ServiceUnavailableException (or return an honest setup-required/empty state) so the caller knows the event was not persisted. If there IS a real persistence model available (check schema via codegraph/pg_table_describe for an Appointment/CalendarEvent model), persist for real instead. If a new model is needed, do the code path that throws honestly now and RETURN the model need in sharedFileNeeds. Territory: backend/src/calendar/* only. VALIDATE: backend tsc.build + calendar specs.` },
  { g: 'analytics-adspend-hardcoded-zero', p: `backend/src/analytics/analytics.service.ts getFullReport sets adSpend = 0 hard-coded, so the ROAS KPI is always null even though RAC_AdSpend has real rows. FIX: aggregate real ad spend: prisma.adSpend.aggregate({ where: { workspaceId, date: { gte: since } }, _sum: { amount } }) (confirm the model/field names via codegraph/pg_table_describe — model AdSpend, table RAC_AdSpend) and feed it into the report so ROAS computes. Keep workspace scoping. Territory: backend/src/analytics/analytics.service.ts (+ spec). VALIDATE: backend tsc.build + analytics specs; add a test asserting adSpend is summed (not 0) when rows exist.` },
  { g: 'crm-pipeline-stage-event', p: `backend/src/pipeline/pipeline.service.ts updateDealStage does NOT emit commerce.crm.stage_changed, whereas the CRM path emits WON/LOST + autopilot events — so stage moves via /pipeline are invisible to downstream consumers. FIX: inject CrmEventEmitterService into PipelineService and emit emitStageChanged(workspaceId, dealId, fromStage, toStage, ...) in updateDealStage (mirror how CrmService does it — find the signature via codegraph). Do NOT refactor the dual /pipeline vs /crm/deals write APIs now (out of scope/risk) — just fire the stage event. Territory: backend/src/pipeline/* only (read crm/ for the emitter signature; do not edit crm/). VALIDATE: backend tsc.build + pipeline specs; add a test asserting emitStageChanged is called on stage move.` },
  { g: 'flows-wait-for-reply-no-scheduler', p: `backend/src/flows/flows.wait-for-reply.ts implements resumeFromWait/expireWaitTimeouts but NOTHING calls expireWaitTimeouts on a schedule — so flow 'wait for reply' timeouts never fire (flows stuck waiting forever). FIX: add a backend @Cron (EVERY_MINUTE or similar, using @nestjs/schedule which is already used elsewhere — confirm via codegraph) in FlowsService (or a small dedicated scheduler in the flows module) that calls expireWaitTimeouts() across workspaces. If it needs module-level wiring beyond the flows module, do the FlowsService cron and RETURN any module wiring need in sharedFileNeeds. Territory: backend/src/flows/* only. VALIDATE: backend tsc.build + flows specs; add a test that the cron method calls expireWaitTimeouts.` },
  { g: 'google-ads-dual-token-store', p: `backend/src/marketing/google-ads-marketing.service.ts persists Google Ads tokens in Workspace.providerSettings.googleAds, while another path uses the typed IntegrationCredential model — two un-unified token stores cause drift. FIX: make GoogleAdsMarketingService read/write through the canonical IntegrationCredential model (the typed store — confirm its shape via codegraph/pg_table_describe), so there is one source of truth. Preserve a read-fallback to the old providerSettings location for already-connected workspaces (migration-safe). Territory: backend/src/marketing/google-ads-marketing.service.ts (+ spec) only. VALIDATE: backend tsc.build + the service spec.` },
]

const results = await parallel(units.map((u) =>
  () => agent(`${MCP}\n\n=== YOUR P2 GAP ===\n${u.p}\n\nFix ONLY your gap in your file territory. Understand via codegraph first, mutate via atomic-edit, validate with test-runner. Return structured result.`,
    { label: `p2:${u.g}`, phase: 'FixP2', schema: SCHEMA })
))

return { results: results.filter(Boolean) }
