export const meta = {
  name: 'machine-fix-wave-B-tests',
  description: 'Wave B: write meaningful test coverage for critical untested financial/auth modules (disjoint from Wave A files), atomic-only, each spec verified green',
  phases: [{ title: 'Tests', detail: 'parallel test-authoring agents on disjoint critical modules' }],
}

const ROOT = '/Users/danielpenin/whatsapp_saas'
const BE = `${ROOT}/backend`

const SCHEMA = {
  type: 'object',
  required: ['module', 'specsWritten', 'verified', 'summary'],
  properties: {
    module: { type: 'string' },
    specsWritten: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, lines: { type: 'number' }, tests: { type: 'number' } } } },
    verified: { type: 'boolean', description: 'true ONLY if every new spec runs green' },
    verifyResult: { type: 'string' },
    summary: { type: 'string' },
    blocked: { type: 'string' },
  },
}

const LAW = (
  `Repo root: ${ROOT}. PROJECT LAW: use atomic-edit MCP for ALL file creation/edits (ToolSearch select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_edit,mcp__atomic-edit__code_read_symbol,mcp__atomic-edit__code_outline). NO built-in Write/Edit, NO shell heredoc. Bash only for read/verify (grep/sed/npx jest).\n` +
  `Write MEANINGFUL tests (real behavior assertions, NOT trivial/placeholder): for financial code assert idempotency (duplicate/replay rejected, no double effect), amount correctness (bigint cents, no float), signature/auth verification, partial-failure handling, workspace isolation. Mirror the existing spec style in the same dir (NestJS Test.createTestingModule, jest mocks; reuse the repo helpers test/helpers/match-instance.ts partialMatch + test/helpers/cast-mock.ts castMock instead of nested matchers or 'as any').\n` +
  `GUARDRAILS: every NEW spec file <=400 lines (split into .part2.spec.ts if needed); NO \\bany\\b word on any line (use castMock<T>()/typed mocks), no @ts-ignore/eslint-disable/etc. The tests MUST PASS against the CURRENT code (read the source carefully; do not assert behavior the code doesn't have).\n` +
  `VERIFY: cd ${BE} && NODE_OPTIONS=--max-old-space-size=4096 npx jest --runInBand --silent <new spec paths> 2>&1 | grep -iE "Tests:|Test Suites:|FAIL" — set verified=true ONLY if 0 failures. Also npx eslint the new specs (0 problems). Return ONLY the structured finding.`
)

const modules = [
  { key: 'payment-webhooks', p: `Module: payment webhook controllers (3 critical files, ~1356 LOC, currently NO specs). Find them: grep -rl "payment-webhook\\|payment.webhook\\|PaymentWebhook" ${BE}/src/webhooks ${BE}/src. Write specs covering: valid signature accepted / invalid rejected (400/403); idempotent replay of the same event/intent (second delivery is a no-op, no double ledger/order effect); externalId dedup; unknown event type handled gracefully. One spec per controller, <=400 lines each.` },
  { key: 'checkout-order', p: `Module: ${BE}/src/checkout/checkout-order.service.ts (~518 LOC, only 1 test). Add a checkout-order.service.part2.spec.ts (or extend coverage in a new sibling) covering the order lifecycle: create -> status transitions -> accept/decline upsell -> getOrder/listOrders workspace isolation -> getRecentPaidOrders. Assert amounts are bigint cents and workspace-scoped. <=400 lines.` },
  { key: 'auth-helpers', p: `Module: auth service fragmentation — ~9 unspecced helper/flow files (~1426 LOC) under ${BE}/src/auth. Find the unspecced ones: list *.ts in src/auth without a matching *.spec.ts. Write focused specs for the highest-value ones (token issue/refresh, oauth resolver, verification flow, magic-link if present): assert correct token/claims, refresh rotation, invalid-credential rejection, and no auth bypass. Split across <=400-line spec files. Prioritize the flow/helper files that handle credentials.` },
  { key: 'billing', p: `Module: billing webhook handler (~335 LOC, 2 tests) + billing service core (~252 LOC, thin) under ${BE}/src/billing. Add specs covering: subscription create/cancel/update, plan changes, webhook idempotency for billing events, and amount/proration correctness (bigint cents). <=400 lines per spec.` },
  { key: 'webhook-dispatcher', p: `Module: webhook dispatcher / event service (~60 LOC, 1 thin test). Find it: grep -rl "webhook.*dispatch\\|WebhookDispatcher\\|dispatchWebhook" ${BE}/src. Write a spec covering: event fan-out to subscribers, retry/backoff on failure, idempotency, and no-throw isolation (one subscriber failing doesn't break others). <=400 lines.` },
]

const results = await parallel(modules.map((m) => () =>
  agent(`${LAW}\n\n${m.p}`, { label: `testB:${m.key}`, phase: 'Tests', schema: SCHEMA })
))

return { wave: 'B', results: results.filter(Boolean) }
