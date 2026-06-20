export const meta = {
  name: 'wave3-financial-deep',
  description: 'Real money-engine hardening: ledger events, wallet cents-reads, connect DTOs, sales refund-tool dispatch',
  phases: [{ title: 'FixFin', detail: '4 disjoint financial agents, money-safe, atomic-only, each self-validated' }],
}

const MCP = `
MCP TOOLKIT — use ALL applicable. ATOMIC-EDIT MCP IS LAW (it was just UPGRADED — prefer the gated convergence tools like atomic_converge / atomic_transaction for correct-by-construction edits if available; else code_read_symbol/code_outline to read + atomic_replace_text/atomic_edit to mutate; snapshot->validate->trace). NEVER builtin Edit/Write/heredoc. Bash only for read/verify (grep/sed/jest/tsc/eslint). Load tools via ToolSearch "select:<tool>".
- codegraph (_search/_callers/_callees/_context) + gitnexus (query) — understand + find the existing event-emitter / DTO / money-format patterns BEFORE editing (mirror them, do not invent).
- test-runner (run_jest/run_tsc/run_eslint/affected_tests/coverage_for_module) — MANDATORY validation; for money engines coverage must NOT drop.
- cognitive-hub protocol_hub_asyncapi (event channels) / protocol_hub_openapi (routes) / context7 query-docs (Prisma/Nest/class-validator). postgres (READ-ONLY pg_table_describe) to confirm cents columns.
MONEY SAFETY (non-negotiable): money is bigint CENTS — never float. Ledger is APPEND-ONLY — never UPDATE a historical entry; never change amounts/balances logic. Idempotency preserved. Add ONLY what the gap asks; preserve every existing behavior + API response shape. Validate with the module's specs AND confirm coverage didn't drop. If a change risks money correctness, do the minimal safe version and REPORT the residual. Avoid NEW comment words that trip heuristics (fake/mock/stub/bypass / 'return { ok: true }').`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gap', 'done', 'summary', 'filesChanged', 'validation', 'sharedFileNeeds'],
  properties: {
    gap: { type: 'string' }, done: { type: 'boolean' }, summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string' }, sharedFileNeeds: { type: 'string' }, residual: { type: 'string' },
  },
}

phase('FixFin')
const units = [
  { g: 'ledger-domain-events', p: `backend/src/payments/ledger/ledger.service.ts — the money-move methods (creditPending, moveFromPendingToAvailable, debitForRefund/debitForChargeback, debitAvailableForPayout — confirm exact names via codegraph) persist ledger entries but emit NO domain/spine events, so downstream consumers (analytics, autopilot, brain/mind) never see payment state changes. FIX: inject the existing event publisher/emitter (find how other services emit commerce.* spine events — e.g. an EventEmitter2 or a Spine/BrainAudit emitter — via codegraph) and emit: commerce.payment.approved on credit-pending/mature, commerce.payment.refunded on debit-refund, commerce.payment.charged_back on debit-chargeback, commerce.payout.* on payout-debit. ONLY ADD event emission AFTER the existing successful $transaction — do NOT change any ledger amount, balance, or transaction logic; ledger stays append-only. Territory: backend/src/payments/ledger/* only. VALIDATE: backend tsc.build + ledger specs; confirm LedgerEngine coverage did NOT drop (coverage_for_module); add a test asserting the event fires on a credit/refund.` },
  { g: 'wallet-cents-reads', p: `backend/src/kloel/wallet.controller.ts — getMonthlyBreakdown/getRevenueChart (and any read summing money) read DEPRECATED Float columns (e.g. availableBalance, KloelWalletTransaction.amount) instead of the bigint cents columns (e.g. amountInCents). FIX: switch these reads to sum the bigint *InCents columns (confirm exact column names via pg_table_describe / codegraph on the KloelWallet + KloelWalletTransaction models) and format to the same response shape the frontend expects (use the repo's money-format util — find it via codegraph). Preserve the API response contract exactly (same keys/shape). Do NOT write/mutate — these are reads. Territory: backend/src/kloel/wallet.controller.ts (+ its spec, + a money-format helper if one is shared — but if it needs a new shared util, do it locally or RETURN in sharedFileNeeds). VALIDATE: backend tsc.build + wallet controller specs; add/adjust a test asserting cents-sourced values.` },
  { g: 'connect-dtos', p: `backend/src/payments/connect/connect.controller.ts — createAccount/submitOnboardingProfile/createPayout use inline @Body() object shapes with manual validation instead of class-validator DTOs (security + the @Body-without-DTO warning). FIX: extract CreateConnectAccountDto, SubmitOnboardingProfileDto, CreatePayoutDto (in a connect dtos file) with class-validator decorators (IsString/IsEnum/IsInt/IsPositive etc. — payout amount is bigint cents so validate it's a positive integer-cents value), wire them as the @Body() types, and remove now-redundant manual checks. Preserve behavior + the routes. Territory: backend/src/payments/connect/* only. VALIDATE: backend tsc.build + connect specs; add a DTO-validation test (rejects invalid payload).` },
  { g: 'sales-refund-tool-dispatch', p: `backend/src/kloel/kloel-tool-dispatcher.sales.handlers.ts — the SalesService.refund / cancelSubscription / refundSubscription methods exist + are real, but the chat tool dispatcher does NOT route the capability ids sales.refund / sales.cancel_subscription to them, so the AI agent can't actually trigger a refund/cancel. FIX: add 'sales.refund' (and 'sales.cancel_subscription' if the service supports it) to SALES_TOOL_NAMES and add switch cases in dispatchSalesTool calling SalesService.refund(...)/cancelSubscription(...) with the workspace-scoped args (mirror the existing sales tool cases; confirm signatures via codegraph). These are money operations — ensure workspace scoping + the same auth/validation the other sales tools use. Territory: backend/src/kloel/kloel-tool-dispatcher.sales.handlers.ts (+ its spec) only. VALIDATE: backend tsc.build + the dispatcher spec; add a test asserting sales.refund dispatches to SalesService.refund.` },
]

const results = await parallel(units.map((u) =>
  () => agent(`${MCP}\n\n=== YOUR FINANCIAL GAP ===\n${u.p}\n\nFix ONLY your gap in your file territory. Understand via codegraph first, mutate via atomic-edit, validate with test-runner. Money safety is paramount — preserve all existing behavior. Return structured result.`,
    { label: `fin:${u.g}`, phase: 'FixFin', schema: SCHEMA })
))

return { results: results.filter(Boolean) }
