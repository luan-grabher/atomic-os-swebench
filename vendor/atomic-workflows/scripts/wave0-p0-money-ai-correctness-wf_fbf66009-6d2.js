export const meta = {
  name: 'wave0-p0-money-ai-correctness',
  description: 'Fix the customer-harming P0 money/AI fake-delivery defects, file-disjoint, atomic-only, each self-validated',
  phases: [
    { title: 'FixP0', detail: '6 disjoint agents fix the fake-payment/fake-refund/webhook-replay/KYC/dedup/fail-open defects, atomic-only, validated' },
  ],
}

const MCP = `
MCP TOOLKIT — use ALL applicable. ATOMIC-EDIT MCP IS LAW: every file mutation goes through it; NEVER builtin Edit/Write, NEVER heredoc/cp/sed-write. Bash only for read/verify/git.
Load any MCP tool on demand with ToolSearch "select:<tool>" then call it.
- atomic-edit (LAW): code_outline / code_read_symbol / code_browse (read precisely, no full-file reads when outline suffices); atomic_replace_text / atomic_edit / atomic_replace_range / atomic_create_file / atomic_delete_range / atomic_remove_import / atomic_rename_symbol_cross_file / atomic_transaction (mutate: snapshot -> syntax-validate -> char-trace -> rollback-capable); atomic_verify / atomic_apply_eslint_dry_run_fixes (validate). It REFUSES protected files by design.
- codegraph: codegraph_search/_callers/_callees/_impact/_context/_node — understand the symbol + who calls it + blast radius BEFORE editing.
- gitnexus: query/route_map/impact/shape_check/context — 91k-node semantic graph (how does X work, route map).
- graphify-plus: blast_radius / affected_specs / stub_route_inventory / runtime_errors / metadata_for_file — find the specs your change affects.
- lsp-mesh: lsp_definition/_references/_rename/_diagnostics — precise cross-file semantic edits/lookups.
- test-runner: run_jest / run_tsc / run_eslint / affected_tests / coverage_for_module — MANDATORY validation before declaring done.
- pulse: pulse_scan_module / pulse_health_by_module / pulse_top_gates — prove the gap closed, no regression in your module.
- postgres (READ-ONLY): pg_query/pg_table_describe/pg_count — verify real DB shape/persistence.
- cognitive-hub: protocol_hub_openapi (Nest routes) / _asyncapi (events) / _sarif / _sbom.
- context7: query-docs/resolve-library-id — current Prisma/Nest/Stripe/MercadoPago API docs when implementing.
- codacy (READ-ONLY, MAX-RIGOR LOCK — NEVER weaken/suppress): codacy_get_file_issues.
- github / railway(logs) / stripe + mercadopago(test-mode) / sentry-bridge / kaisser / task-graph(task_lock_acquire before any shared file).
RULES: Money/auth correctness is paramount. Removing a FAKE success path (returning an honest typed error / setup-required state) is strictly safer than leaving the fake. Do NOT touch prisma/schema.prisma, app.module.ts, package.json, common/, lib/ — if you need a change there, return it in sharedFileChangeNeeded instead. Add/adjust the test that proves your fix. Validate with tsc + the affected specs before finishing. Stay strictly inside your file territory.`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['territory', 'done', 'summary', 'filesChanged', 'validation'],
  properties: {
    territory: { type: 'string' },
    done: { type: 'boolean' },
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string', description: 'tsc result, specs run + pass/fail, gate recheck — concrete numbers' },
    sharedFileChangeNeeded: { type: 'string', description: 'any prisma/schema or app.module/package change to defer to the coordinator, or "none"' },
    residualRisk: { type: 'string' },
  },
}

phase('FixP0')
const p0 = [
  { t: 'P0-fake-stripe-link (worker)', p: `Territory: worker/providers/tools-registry.ts (and only files it imports that you must change). DEFECT: a fake/mock Stripe payment link like "(MOCK) https://checkout.stripe.com/pay/<uuid>" is generated and sent to REAL WhatsApp customers (around line 104-120). FIX: remove the fabricated link from the production return path; instead return/throw an honest typed result so the chat surfaces a real "pagamento indisponível / setup-required" state (find how the tool result is consumed via codegraph/gitnexus and choose the cleanest honest signal — never a fake URL). VALIDATE: worker tsc (npx tsc -p worker/tsconfig.json --noEmit) + any tools-registry spec + grep proves no "checkout.stripe.com/pay" mock literal remains in a production path.` },
  { t: 'P0-fake-refund+pix (sales)', p: `Territory: backend/src/sales/sales.service.ts (refund path ~L393-437) + backend/src/sales/sales.service.pix-refund.helpers.ts (~L130-141). DEFECTS: (a) refund() marks a sale 'refunded' and returns success WITHOUT calling the real Stripe/MercadoPago refund; (b) a fabricated PIX payload ("00020126...stub_qr_") is returned as a real payment instrument. FIX: route the refund through the real gateway refund (use codegraph to find the proven Stripe/MP refund path used elsewhere, e.g. checkout/payments) BEFORE flipping DB state; if the gateway capability is not wired/available, throw a ServiceUnavailableException (honest) instead of faking success. Remove the fabricated PIX payload from the production return path -> throw/return honest error. Keep cents=bigint, ledger append-only. VALIDATE: backend tsc.build + sales specs; add a test asserting no fake success when the gateway is unavailable.` },
  { t: 'P0-webhook-replay-dedup (webhooks)', p: `Territory: backend/src/webhooks/webhooks.service.ts (the WebhookEvent upsert ~L411 and the processed-status guard). DEFECT: the upsert resets status to 'received' on every Stripe redelivery, defeating the status==='processed' idempotency guard beyond the ~5-min Redis window (Stripe retries up to 3 days) -> money can double-process. FIX: implement claim-once semantics: do not reset a row that is already 'processed'; use an atomic "updateMany where status='received' set status='processing'" claim (returns count) so only one delivery proceeds, and never downgrade 'processed'->'received'. Read the current flow with codegraph first. VALIDATE: backend tsc.build + webhooks specs; add/strengthen an idempotency test proving a replayed processed event is a no-op.` },
  { t: 'P0-kyc-approval+failclosed (kyc)', p: `Territory: backend/src/kyc/kyc.connect-onboarding.ts (~L56) + backend/src/kyc/kyc-approved.guard.ts (~L27) + kyc.service*.ts helpers in backend/src/kyc only. DEFECTS: (a) kycStatus is set to 'approved' (unlocking payouts) when self-reported form completion >=75% — a rubber-stamp with no real verification; (b) the KYC guard fails OPEN (returns true) when the user record is missing. FIX: (a) decouple 'approved' from form %: only set 'approved' when the Stripe Connect account reports charges_enabled/payouts_enabled with empty currently_due (consume the existing ConnectService/account.updated path — find via codegraph); otherwise keep 'submitted'/'pending'. If Connect gating cannot be reached without owner setup, make the change additive: stop auto-approving on %, keep status 'submitted', and report the Connect-wiring need in sharedFileChangeNeeded/residualRisk. (b) guard fails CLOSED (deny) when user/identity is missing. VALIDATE: backend tsc.build + kyc specs; update specs to the new gating; add a test that 75% form no longer auto-approves.` },
  { t: 'P0-dedupKey-producers (worker)', p: `Territory: worker autopilot send-message producer + webhook-dispatcher producer (worker/processors/* and/or worker/providers/* — find the BullMQ .add() calls that enqueue with a random/uuid jobId for outbound WhatsApp send + webhook dispatch). Do NOT touch tools-registry.ts (another agent owns it). DEFECT: producers enqueue without a stable dedup key -> duplicate WhatsApp sends / webhook dispatches on retry. FIX: give each .add() a deterministic jobId / dedup key derived from the stable business identifiers (conversationId+messageHash / webhookEventId), so BullMQ dedups retries. Read producers via codegraph/gitnexus. VALIDATE: worker tsc + affected specs.` },
  { t: 'P0-meta-webhook-failclosed (marketing)', p: `Territory: the Meta/Facebook webhook signature verification in backend/src/marketing (e.g. marketing/channels/instagram/instagram.controller.ts + marketing/channels/messenger/messenger.controller.ts + facebook-messenger.controller.ts — the X-Hub-Signature check). Do NOT touch whatsapp/* (another agent owns it). DEFECT: the Meta webhook fails OPEN (accepts the request) when META_APP_SECRET is unset — asymmetric vs Stripe/MP which fail closed. FIX: reject (401/403) when the secret is unset or the signature is invalid, in every Meta webhook entrypoint. VALIDATE: backend tsc.build + the relevant controller specs; add a test asserting rejection when secret is absent/invalid.` },
]

const results = await parallel(p0.map((u) =>
  () => agent(`${MCP}\n\n=== YOUR P0 TERRITORY ===\n${u.p}\n\nWork ONLY in your territory. Use codegraph/gitnexus to understand before editing, atomic-edit for every change, test-runner to validate. Return the structured result with concrete validation numbers.`,
    { label: u.t, phase: 'FixP0', schema: SCHEMA })
))

return { results: results.filter(Boolean) }
