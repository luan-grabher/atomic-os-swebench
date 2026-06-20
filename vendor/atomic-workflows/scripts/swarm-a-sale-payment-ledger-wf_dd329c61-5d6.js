export const meta = {
  name: 'swarm-a-sale-payment-ledger',
  description: 'Resolve the sale/payment ledger split (CheckoutOrder/CheckoutPayment vs KloelSale vs Payment) safely — additive, flag-gated, behavior-preserving, atomic-edit only, adversarially verified',
  phases: [
    { title: 'Investigate', detail: 'verify the real inconsistency + find the safest canonical reconciliation' },
    { title: 'Implement', detail: 'additive flag-gated reconciliation via atomic-edit + tests' },
    { title: 'Verify', detail: 'adversarial payment-flow skeptics + full validation' },
  ],
}

const ROOT = '/Users/danielpenin/kloel'
const ATOMIC_ONLY = 'HARD RULE: use ONLY the mcp__atomic-edit__* tools for EVERY code modification (atomic_edit, atomic_apply_edits, atomic_create_file). NEVER use Write/Edit/sed/bash-redirect to modify source. For investigation use Grep/Glob/Read/Bash(read-only). Each atomic edit self-validates (convergence gate). Do NOT git commit — leave changes in the working tree and report them.'
const SAFETY = 'PAYMENT-CRITICAL SAFETY: changes MUST be ADDITIVE + flag-gated (default OFF, `process.env.X === "true"` idiom) + behavior-preserving. NEVER alter live payment-capture / webhook-idempotency behavior. The flag-OFF path must be byte-identical to today. Prefer a reconciliation/consistency layer + dual-write behind a flag over any rewrite. Wrap multi-table writes in $transaction only if already transactional-adjacent. If the only correct fix is a risky behavior change, implement the SAFE additive precursor (consistency-checker + flag-gated dual-write) instead and document the rest.'

phase('Investigate')
const INV = {
  type: 'object', additionalProperties: false,
  properties: {
    realInconsistency: { type: 'boolean' },
    evidence: { type: 'string' },
    canonicalLedger: { type: 'string' },
    fanOutSites: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    existingReconciliation: { type: 'string' },
    safestFix: { type: 'string' },
    gmvReadSite: { type: 'string' },
  },
  required: ['realInconsistency', 'evidence', 'canonicalLedger', 'safestFix'],
}
const lenses = [
  { key: 'webhook-fanout', q: 'Trace the Stripe + MercadoPago webhook handlers (backend/src/webhooks/payment-webhook-stripe.handlers*.ts, stripe-webhook-ledger.service.ts, payments/stripe/stripe-webhook.processor.ts). Does ONE payment event write CheckoutOrder/CheckoutPayment AND KloelSale AND Payment? Are they wrapped in a $transaction or can they diverge (one PAID, one PENDING) on partial failure? Is there idempotency?' },
  { key: 'kloelsale-vs-checkout', q: 'Compare KloelSale (chat-driven, SalesService sales/sales.service.ts:64 + kloel/PaymentService + SmartPaymentService) vs CheckoutOrder+CheckoutPayment (CheckoutPaymentService.capture checkout/checkout-payment.service.ts:52). When a chat sale completes, is a CheckoutOrder materialized? Is GMV computed only from CheckoutOrder (so KloelSale chat revenue is invisible)? Find the GMV/revenue read site.' },
  { key: 'disprove', q: 'ADVERSARIAL: try to DISPROVE the "split ledger" bug. Maybe stripe-webhook-ledger.service.ts already reconciles all ledgers transactionally/idempotently, or Payment is a deliberate raw audit log not a competing source of truth. Report whether the inconsistency is actually reachable in prod or an over-claim.' },
]
const investigations = await parallel(
  lenses.map((l) => () =>
    agent(
      [`Investigate the Kloel sale/payment ledger (cwd ${ROOT}). Read-only — Grep/Glob/Read only, no edits.`,
       l.q,
       'Be code-grounded (file:line). Return the StructuredOutput.'].join('\n'),
      { schema: INV, phase: 'Investigate', label: `inv:${l.key}` },
    ).catch(() => null),
  ),
)
const inv = investigations.filter(Boolean)
const isReal = inv.some((i) => i.realInconsistency) && !inv.every((i) => /over-?claim|already reconcil|not reachable/i.test(i.evidence || ''))
log(`Investigate done: realInconsistency=${isReal} (${inv.length} lenses)`) 

phase('Implement')
const IMPL = {
  type: 'object', additionalProperties: false,
  properties: {
    decision: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    flag: { type: 'string' },
    additive: { type: 'boolean' },
    testsAdded: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    summary: { type: 'string' },
  },
  required: ['decision', 'filesChanged', 'additive', 'summary'],
}
const impl = await agent(
  [
    `You are implementing the SAFE reconciliation for the Kloel sale/payment ledger split (cwd ${ROOT}).`,
    ATOMIC_ONLY, SAFETY,
    'Investigation findings (JSON):', JSON.stringify(inv).slice(0, 6000),
    '',
    isReal
      ? 'The inconsistency is real. Implement the SAFEST additive, flag-gated reconciliation: e.g., (a) when a KloelSale is confirmed, ALSO upsert a canonical CheckoutOrder+CheckoutPayment keyed on a shared externalId (flag-gated dual-write, default OFF), and/or (b) a consistency-checker that detects PAID-vs-PENDING divergence across ledgers, and/or (c) make the GMV read include KloelSale chat revenue. Pick the ONE highest-value SAFE step. Add a hermetic unit test proving the flag-OFF path is unchanged and the flag-ON path reconciles.'
      : 'The bug appears to be an OVER-CLAIM or already-reconciled. Do NOT change payment behavior. Instead add a small consistency-assertion test + a doc note. Report decision=over-claim.',
    'Use ONLY atomic-edit. Do NOT commit. Then return the StructuredOutput.',
  ].join('\n'),
  { schema: IMPL, phase: 'Implement', label: 'impl:reconcile' },
).catch((e) => ({ decision: 'failed', filesChanged: [], additive: true, summary: String(e).slice(0, 200) }))
log(`Implement: ${impl?.decision} — ${(impl?.filesChanged || []).length} files`)

phase('Verify')
const VERIFY = {
  type: 'object', additionalProperties: false,
  properties: { breaksPayment: { type: 'boolean' }, flagOffByteIdentical: { type: 'boolean' }, typecheck: { type: 'string' }, testsPass: { type: 'string' }, findings: { type: 'array', items: { type: 'string' }, maxItems: 15 }, verdict: { type: 'string' } },
  required: ['breaksPayment', 'verdict'],
}
const verify = await parallel(
  ['payment-flow-skeptic', 'flag-off-parity', 'validation-run'].map((lens) => () =>
    agent(
      [
        `Adversarially verify the sale/payment reconciliation change (cwd ${ROOT}, lens: ${lens}).`,
        'Files changed:', JSON.stringify(impl?.filesChanged || []),
        lens === 'payment-flow-skeptic' ? 'Try to BREAK it: can the change drop/double-charge, break webhook idempotency, or fail a capture? Read the diff via git diff.' :
        lens === 'flag-off-parity' ? 'Prove the flag-OFF path is byte-identical to prior behavior (the new code must be inert when the flag is unset).' :
        'Run validation: `cd backend && npx tsc -p tsconfig.build.json --noEmit` and the touched-area jest specs + `node scripts/ops/check-canonical-duplicates.mjs`. Report results.',
        'Read-only except running validation commands. Return the StructuredOutput.',
      ].join('\n'),
      { schema: VERIFY, phase: 'Verify', label: `verify:${lens}` },
    ).catch(() => null),
  ),
)
return { realInconsistency: isReal, investigations: inv, implementation: impl, verification: verify.filter(Boolean) }
