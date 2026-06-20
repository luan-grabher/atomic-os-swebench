export const meta = {
  name: 'swarm-f-playbook-exec-code',
  description: 'Execute the code-only/flag-gated playbook migrations: MindMessage/MindMemory reader cut-over, sale-payment transactional settlement, channel-meta unify, auth-core extraction. Atomic-edit only, additive/flag-gated/behavior-preserving, NO frontend/UI, no-commit, adversarially verified.',
  phases: [
    { title: 'Execute', detail: '4 parallel playbook tracks: read plan -> atomic-implement safe steps -> test' },
    { title: 'Verify', detail: 'adversarial skeptics per fixed track + validation' },
  ],
}

const ROOT = '/Users/danielpenin/kloel'
const PLAYBOOK = `${ROOT}/docs/architecture/MIGRATION_PLAYBOOK.md`
const ATOMIC = 'HARD RULE: ONLY mcp__atomic-edit__* tools for code edits. NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Do NOT git commit. Leave changes in the working tree and report filesChanged.'
const SAFE = [
  'SAFETY ENVELOPE (production-critical):',
  '- NEVER touch frontend/ or any UI — the kloelgraph design is the frozen production standard.',
  '- Behavior-altering runtime changes MUST be flag-gated (process.env.X === "true", default OFF) so the flag-OFF path is byte-identical to today.',
  '- Additive only: new flags, new readers-behind-flags, new wrapping. Do NOT change public API shapes, do NOT drop/rename DB columns or tables, do NOT delete legacy code paths (legacy stays as the flag-OFF fallback).',
  '- You MAY add a NEW nullable Prisma column + a migration FILE if the plan needs it, but NEVER run prisma migrate deploy and NEVER write a destructive (DROP/ALTER-NOT-NULL) migration.',
  '- Preserve idempotency on payment/webhook paths. Add tests for both flag states.',
  '- If a step cannot be done within this envelope, SKIP it (outcome=partial) and document precisely what remains.',
].join('\n')

const TRACKS = [
  {
    key: 'message-memory-cutover',
    prompt: 'Execute the "message-memory-cutover" plan section. Implement the FLAG-GATED READER cut-over ONLY (the lowest-risk step): add a new default-OFF flag (e.g. KLOEL_MINDMESSAGE_READ_CANONICAL / KLOEL_MINDMEMORY_READ_CANONICAL) so the canonical read facade (MindCanonicalService.getConversationHistory -> MindMessageService.getHistory; MindMemory recall) reads RAC_MindMessage / RAC_MindMemory when ON, falling back to the legacy table on empty/error and when OFF. Flag-OFF = byte-identical (reads legacy). Add tests for both states. Do NOT backfill, do NOT flip writers, do NOT retire legacy.',
  },
  {
    key: 'sale-payment-tx',
    prompt: 'Execute the "sale-payment" plan section, FLAG-GATED. Add a new default-OFF flag (e.g. KLOEL_PAYMENT_LEDGER_TX). When ON: wrap the co-located sale-status writes in ONE prisma.$transaction(FINANCIAL_TRANSACTION_OPTIONS) — (1) checkout.session.completed Payment+KloelSale (handlers2.helpers.ts:53-143), (2) payment_intent.succeeded CheckoutPayment+KloelSale+CheckoutOrder (handlers2.ts) — and let a transaction failure surface (so Stripe retries) instead of the silent .catch(()=>undefined). When OFF: byte-identical to today (the current non-transactional + .catch path). Preserve idempotency (Redis NX + WebhookEvent unique). Add tests for both flag states + a partial-failure-rolls-back test. Do NOT touch MercadoPago co-write here (separate step) unless trivially safe behind the same flag.',
  },
  {
    key: 'channel-meta',
    prompt: 'Execute the "channel-meta" plan section conservatively. Unify the Meta-connection resolver: route the ~19 raw prisma.metaConnection.find* bypasses through MetaWhatsAppService.resolveConnection (the canonical credential resolver) WITHOUT changing token-decrypt behavior — behavior-preserving delegation only. Do NOT merge the Messenger/Facebook send services (that risks double-persist); SKIP that as partial. Add/adjust tests. If repointing a callsite changes any decrypt/expiry semantics, leave it and document.',
  },
  {
    key: 'auth-core',
    prompt: 'Execute the "identity-auth-core" plan section, the surgically-safe slices ONLY: extract any remaining byte-identical shared helpers (beyond the already-done common/totp.ts) into common/auth-core/ — e.g. a shared opaque-token-at-rest helper (sha256 hashing) IF both stacks already hash identically, or a shared throttle-policy pure function. Do NOT unify the divergent storage backends (admin Postgres adminLoginAttempt vs tenant Redis; admin adminAuditLog vs tenant AuditLog) — keep those per-stack. Behavior-preserving extraction only. Add tests. If nothing is byte-identical-and-safe to hoist, report partial.',
  },
]

phase('Execute')
const RES = {
  type: 'object', additionalProperties: false,
  properties: {
    track: { type: 'string' },
    outcome: { enum: ['done', 'partial', 'skipped-unsafe', 'failed'] },
    flag: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    testsAdded: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    typecheck: { type: 'string' },
    remaining: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['track', 'outcome', 'note'],
}
const results = await parallel(
  TRACKS.map((t) => () =>
    agent(
      [`Track "${t.key}" — execute the migration (cwd ${ROOT}). Read the "${t.key}" section of ${PLAYBOOK} first.`,
       ATOMIC, SAFE, t.prompt,
       'Typecheck after edits: `cd backend && npx tsc -p tsconfig.build.json --noEmit`. Run touched-area specs. Report. Return the StructuredOutput (track=key).'].join('\n'),
      { schema: RES, phase: 'Execute', label: `f:${t.key}` },
    ).catch((e) => ({ track: t.key, outcome: 'failed', note: String(e).slice(0, 160) })),
  ),
)

phase('Verify')
const verify = await parallel(
  results.filter((r) => r && (r.outcome === 'done' || r.outcome === 'partial')).map((r) => () =>
    agent(
      [`Adversarially verify track "${r.track}" (cwd ${ROOT}). Files: ${JSON.stringify(r.filesChanged || [])}. Read the git diff.`,
       'Prove: flag-OFF path is byte-identical; flag-ON path is correct; idempotency intact (payment); NO frontend touched; no public-API/schema-destructive change; typecheck passes. Try to break it. Return the StructuredOutput (track + final outcome; skipped-unsafe if it must be reverted).'].join('\n'),
      { schema: RES, phase: 'Verify', label: `verify:${r.track}` },
    ).catch(() => r),
  ),
)
return { results: results.filter(Boolean), verify: verify.filter(Boolean) }
