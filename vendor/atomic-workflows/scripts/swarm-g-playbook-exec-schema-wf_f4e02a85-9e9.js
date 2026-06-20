export const meta = {
  name: 'swarm-g-playbook-exec-schema',
  description: 'Execute the SAFE forward steps of the schema-bearing playbook families: money-ledgers (additive balanceAfter columns + SharedLedger port) and lead-contact (idempotent backfill + flag-gated Contact-canonical reader). Additive/nullable schema + migration FILES only, NO destructive migration, NO prisma migrate deploy, atomic-edit only, no frontend, no-commit, adversarially verified.',
  phases: [
    { title: 'Execute', detail: '2 tracks: money-ledgers (schema) sequential-first, then lead-contact (code)' },
    { title: 'Verify', detail: 'adversarial: additive-only, no destructive migration, flag-OFF byte-identical' },
  ],
}

const ROOT = '/Users/danielpenin/kloel'
const PLAYBOOK = `${ROOT}/docs/architecture/MIGRATION_PLAYBOOK.md`
const ATOMIC = 'HARD RULE: ONLY mcp__atomic-edit__* tools for code edits. NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Do NOT git commit. Report filesChanged.'
const SAFE = [
  'SAFETY ENVELOPE (production-critical, schema):',
  '- NEVER touch frontend/ — kloelgraph design is the frozen prod standard.',
  '- ADDITIVE schema ONLY: you MAY add a NEW NULLABLE Prisma column + generate/author a migration FILE for it (ADD COLUMN is online-safe). You must NOT: drop/rename a column or table, change a column type (e.g. Float->BigInt is a destructive type-change — SKIP it, keep the column, document), add a NOT NULL/unique without a backfill plan, or run `prisma migrate dev/deploy` (only author the migration SQL file).',
  '- Behavior-altering runtime use of new columns/readers MUST be flag-gated (default OFF) so flag-OFF is byte-identical.',
  '- Legacy stays as the flag-OFF fallback; do NOT delete legacy code/tables.',
  '- Add tests. If a step needs a destructive migration or a big refactor, SKIP (outcome=partial) and document the exact remaining destructive step for a supervised deploy.',
].join('\n')

const TRACKS = [
  {
    key: 'money-ledgers',
    prompt: 'Execute the "money-ledgers" plan ADDITIVELY. (1) Add NEW NULLABLE balanceAfter columns to KloelWalletLedger (schema:2006) and MarketplaceTreasuryLedger (schema:4276) mirroring the Connect ledger snapshots (balanceAfterPendingCents/balanceAfterAvailableCents or a single balanceAfterCents Int? as the plan specifies) + author the additive ADD COLUMN migration FILE under backend/prisma/migrations/ (do NOT run prisma migrate). (2) Define the SharedLedger port/interface (a TS type/abstract) modeled on LedgerService (payments/ledger/ledger.service.ts:59) in a shared module, and make the existing ledger writers OPTIONALLY populate balanceAfter on NEW writes behind a default-OFF flag (e.g. KLOEL_LEDGER_BALANCE_SNAPSHOT) — additive, flag-OFF = byte-identical. Do NOT change WalletAnticipation Float->BigInt (destructive type-change — SKIP, document). Do NOT backfill historical rows. Add tests for the flag-gated snapshot write.',
  },
  {
    key: 'lead-contact',
    prompt: 'Execute the "lead-contact" plan SAFE forward steps, code-only (NO schema, NO table drop). (1) Add an idempotent backfill helper/service that, given a workspace, ensures every KloelLead has a canonical Contact (via the existing syncCanonicalContact / CrmService.upsertContact on normalizePhone(phone).digits) — additive, callable from an admin/cron, writes Contact only, never deletes KloelLead. (2) Add a default-OFF flag (e.g. KLOEL_LEADS_READ_CONTACT) so LeadsService reads from Contact (joined on workspaceId+phone) when ON, falling back to KloelLead when OFF/empty — flag-OFF = byte-identical. Do NOT retire RAC_KloelLead, do NOT activate ContactIdentityMergeService destructively, do NOT change schema. Add tests for the backfill idempotency + both flag states.',
  },
]

phase('Execute')
const RES = {
  type: 'object', additionalProperties: false,
  properties: {
    track: { type: 'string' },
    outcome: { enum: ['done', 'partial', 'skipped-unsafe', 'failed'] },
    flag: { type: 'string' },
    addedColumns: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    migrationFile: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    typecheck: { type: 'string' },
    destructiveDeferred: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['track', 'outcome', 'note'],
}
// pipeline (not parallel) so the two tracks don't race on schema.prisma; money-ledgers (schema) first.
const results = []
for (const t of TRACKS) {
  const r = await agent(
    [`Track "${t.key}" — execute the migration (cwd ${ROOT}). Read the "${t.key}" section of ${PLAYBOOK} first.`,
     ATOMIC, SAFE, t.prompt,
     'Typecheck after edits: `cd backend && npx tsc -p tsconfig.build.json --noEmit`. Run touched specs. Report. Return StructuredOutput (track=key).'].join('\n'),
    { schema: RES, phase: 'Execute', label: `g:${t.key}` },
  ).catch((e) => ({ track: t.key, outcome: 'failed', note: String(e).slice(0, 160) }))
  results.push(r)
  log(`${t.key}: ${r?.outcome}`)
}

phase('Verify')
const verify = await parallel(
  results.filter((r) => r && (r.outcome === 'done' || r.outcome === 'partial')).map((r) => () =>
    agent(
      [`Adversarially verify track "${r.track}" (cwd ${ROOT}). Files: ${JSON.stringify(r.filesChanged || [])}. Read the git diff + any new migration file.`,
       'PROVE: schema change is ADDITIVE-nullable only (no drop/rename/type-change/NOT-NULL); the migration file is ADD COLUMN only; no `prisma migrate` was run; flag-OFF byte-identical; no frontend; typecheck passes. Try to break it. Return StructuredOutput (track + final outcome; skipped-unsafe if it must be reverted).'].join('\n'),
      { schema: RES, phase: 'Verify', label: `verify:${r.track}` },
    ).catch(() => r),
  ),
)
return { results: results.filter(Boolean), verify: verify.filter(Boolean) }
