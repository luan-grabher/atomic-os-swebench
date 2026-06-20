export const meta = {
  name: 'wave1b-p1-gap-fixes',
  description: 'Fix the 8 highest-impact file-disjoint P1 gaps from the territory inventory, atomic-only, each self-validated',
  phases: [{ title: 'FixP1', detail: '8 disjoint agents fix team-list, invite-accept, product-events, fabricated-PIX, analytics-tabs, churn-table, member-enroll-idempotency, ads-oauth-callback' }],
}

const MCP = `
MCP TOOLKIT — use ALL applicable. ATOMIC-EDIT MCP IS LAW: every file mutation through it (atomic_create_file / atomic_replace_text / atomic_edit / atomic_replace_range / code_read_symbol / code_outline). NEVER builtin Edit/Write/heredoc. Bash only for read/verify (grep/sed/jest/tsc/eslint). Load tools via ToolSearch "select:<tool>".
- codegraph (_search/_callers/_callees/_impact/_context) + gitnexus (query/route_map/impact) — understand + find callers BEFORE editing.
- atomic-edit code_outline/code_read_symbol — read precisely; atomic_* — mutate (snapshot->validate->trace).
- test-runner (run_jest/run_tsc/run_eslint/affected_tests) — MANDATORY validation before done.
- cognitive-hub protocol_hub_openapi (routes) / context7 query-docs (Prisma/Nest/Next API) when implementing.
- postgres (READ-ONLY pg_table_describe) to confirm real table/column names.
RULES: stay strictly in your file territory. If a change needs prisma/schema.prisma / app.module.ts / package.json, do the CODE part and RETURN the schema/module need in sharedFileNeeds (the coordinator applies it). Add/adjust the test that proves your fix. Validate (tsc + affected specs + eslint) before finishing. Preserve the visual shell; honest states only; no fake data.`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gap', 'done', 'summary', 'filesChanged', 'validation', 'sharedFileNeeds'],
  properties: {
    gap: { type: 'string' }, done: { type: 'boolean' }, summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string' }, sharedFileNeeds: { type: 'string' }, residual: { type: 'string' },
  },
}

phase('FixP1')
const units = [
  { g: 'team-list-empty-render', p: `Frontend team list always renders empty. backend /team (TeamService.listMembers) returns { agents, invitations } but frontend/src/components/kloel/conta/ContaTeamSection.tsx reads data?.members / data?.invites (and bypasses the correct client). FIX: use the canonical listTeam() from frontend/src/lib/api/team.ts (returns { agents, invitations }); map agents->members, invitations->invites; fix the TeamApiResponse shape in the conta types file ({members?,invites?} -> {agents?,invitations?}); the inv.status==='pending' filter is dead (backend sends no status) -> treat all returned invitations as pending. Territory: frontend/src/components/kloel/conta/ContaTeamSection.tsx + its ContaTypes.ts. VALIDATE: frontend tsc (cd frontend && npx tsc --noEmit) + eslint on changed files.` },
  { g: 'invite-accept-404', p: `Invite-accept flow dead-ends at 404. TeamService.inviteMember emails \${FRONTEND_URL}/invite/accept?token=... and frontend/src/lib/api/team.ts exposes acceptTeamInvite(token,name,password), but NO matching route exists in frontend/src/app. FIX: create the page (e.g. frontend/src/app/(public)/invite/accept/page.tsx — confirm the exact path matches the URL TeamService.inviteMember builds at backend/src/team/team.service.ts) that reads the token query param, collects name+password (use existing auth form components/design tokens), calls acceptTeamInvite(), and on success routes to login. Territory: new frontend/src/app/.../invite/accept/ page only. VALIDATE: frontend tsc + eslint; confirm route path == email URL path.` },
  { g: 'product-rest-bypasses-service', p: `Human REST product writes bypass ProductService, so commerce.product.* events + brain/spine recording never fire. backend/src/kloel/product.controller.ts updateProduct/createProduct/deleteProduct do Prisma (or partial logic) directly instead of delegating to the canonical ProductService (DI-available). FIX: route those controller methods through ProductService.create/update/delete (which emit the events). Use codegraph to confirm ProductService method signatures + that it's injected. Territory: backend/src/kloel/product.controller.ts ONLY (do NOT touch product-sub-resources or kloel-chat-tools — other agents own those). VALIDATE: backend tsc.build + product controller/service specs.` },
  { g: 'fabricated-pix-kloel-chat-tools', p: `Dev-only fabricated PIX: backend/src/kloel/kloel-chat-tools.workspace.helpers.ts:308 builds a hand-rolled EMV PIX payload (00020126...) with a random checksum + fake pay_dev_* id and returns it as a real payment instrument in the non-prod branch. FIX: in that non-prod/fallback branch return an HONEST setup-required/degraded result (success:false, billingType:'PIX', a message that payment is unavailable — never a fabricated copy-paste/QR/id). Mirror the honest-state convention used elsewhere. Territory: backend/src/kloel/kloel-chat-tools.workspace.helpers.ts ONLY. VALIDATE: backend tsc.build + any kloel-chat-tools spec; grep proves no fabricated '00020126'/'pay_dev_' literal remains in a production path.` },
  { g: 'analytics-tabs-unreachable', p: `~12 report tabs (churn, afterpay, recusa, origem, metricas, chargeback, afiliados, indicadores, ind_prod, satisfacao, etc.) have working backends but are not in VISIBLE_REPORT_TABS so the UI never shows them. FIX: in frontend/src/app/(main)/analytics/use-analytics-filters.ts expand VISIBLE_REPORT_TABS to include every tab key that has a working backend report endpoint, and add the corresponding pills to the TABS array in the analytics page. Verify each added tab maps to a real /reports/* or /analytics/* endpoint (cross-check analytics.helpers.ts export map; do NOT add a tab whose backend 404s). Territory: frontend/src/app/(main)/analytics/* ONLY. VALIDATE: frontend tsc + eslint.` },
  { g: 'reports-churn-wrong-table', p: `getChurn raw SQL references FROM "CustomerSubscription" but the real Postgres table is "RAC_CustomerSubscription" -> the query errors/returns nothing. FIX: in backend/src/reports/reports.service.ts change the raw SQL table name to "RAC_CustomerSubscription" (confirm exact mapped table via postgres pg_table_describe or schema @@map). Add a regression test asserting the query uses the mapped table / returns shaped data. Territory: backend/src/reports/reports.service.ts (+ its spec). VALIDATE: backend tsc.build + reports spec.` },
  { g: 'member-enroll-idempotency', p: `MemberEnrollment has no unique constraint, so autoEnrollInMemberAreas + (the other enrollment write path) can double-enroll on concurrent webhooks. FIX (code part): convert the two check-then-create paths to an idempotent create that catches Prisma P2002 (unique violation) inside the same transaction and treats it as already-enrolled (no duplicate). Locate the enrollment code in backend/src/member-area/* via codegraph. RETURN in sharedFileNeeds: 'add @@unique([workspaceId, memberAreaId, studentEmail]) to MemberEnrollment in backend/prisma/schema.prisma (~L2451) + prisma migration' (the coordinator applies the schema+migration). Territory: backend/src/member-area/* ONLY (NOT schema.prisma). VALIDATE: backend tsc.build + member-area specs (the P2002 catch is inert until the constraint exists, which is correct).` },
  { g: 'ads-oauth-callback-landing', p: `Ads OAuth completion loop has no landing endpoint: AnunciosService.getConnectUrl builds redirectUri=/api/anuncios/callback/:platform but no such authenticated route exists, so the OAuth code is never exchanged. FIX: add an authenticated GET callback route on backend/src/anuncios/anuncios.controller.ts that reads ?code and ?error and calls the existing AnunciosService completion method (find it via codegraph). Territory: backend/src/anuncios/anuncios.controller.ts (+ its spec) ONLY — do NOT touch backend/src/google-ads/ (the GoogleAdsAuthController registration is a separate app.module change). If you find the GoogleAdsAuthController is also unregistered, RETURN that in sharedFileNeeds for the coordinator. VALIDATE: backend tsc.build + anuncios specs.` },
]

const results = await parallel(units.map((u) =>
  () => agent(`${MCP}\n\n=== YOUR P1 GAP ===\n${u.p}\n\nFix ONLY your gap in your file territory. Understand via codegraph first, mutate via atomic-edit, validate with test-runner. Return the structured result.`,
    { label: `p1:${u.g}`, phase: 'FixP1', schema: SCHEMA })
))

return { results: results.filter(Boolean) }
