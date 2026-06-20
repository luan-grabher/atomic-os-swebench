export const meta = {
  name: 'swarm-d-safe-remainder',
  description: 'Resolve the remaining SAFE canonicalization items: wire the sale-ledger reconciler, remove dead order-bump JSON, fix stale schema comments, backward-compatible ApiKey lookup-hash. Atomic-edit only, verify-first, additive, no-commit.',
  phases: [{ title: 'Resolve', detail: '4 parallel safe tracks: each verify-real -> atomic-fix -> validate' }],
}

const ROOT = '/Users/danielpenin/kloel'
const ATOMIC = 'HARD RULE: ONLY mcp__atomic-edit__* tools for code edits (atomic_edit/atomic_apply_edits/atomic_create_file). NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Do NOT git commit — leave changes in the working tree and report.'
const SAFE = 'SAFETY: ADDITIVE / behavior-preserving / backward-compatible ONLY. No schema migration, no breaking change, no live-payment behavior change. If the only correct fix needs a schema/migration/cross-cutting refactor, SKIP and document why (outcome=skipped-unsafe). Flag-gate (default OFF) anything that alters a runtime path.'

const TRACKS = [
  {
    key: 'wire-reconciler',
    prompt: `Wire the EXISTING sale-ledger reconciler (backend/src/webhooks/sale-ledger-reconcile.helpers.ts: scanSaleLedgerDivergence read-only + reconcileSaleLedger flag-gated) into a runnable surface. Add ONE of: (a) a NestJS @Cron in an existing scheduler/worker that calls scanSaleLedgerDivergence per active workspace and logs/alerts divergences (detection is always read-only; the flip stays gated by KLOEL_SALE_LEDGER_RECONCILE), OR (b) an admin endpoint (under the admin auth guard) exposing the scan. Additive, fail-open. Add a test. This makes the P0-reconciler reachable without touching the live webhook path.`,
  },
  {
    key: 'orderbump-dead-json',
    prompt: `P1 #19: OrderBump/Upsell are stored both as typed tables AND as a JSON variant; the JSON variant is NOT read by checkout pricing. VERIFY this in code (grep the JSON write + confirm checkout pricing reads the typed table, not the JSON). If the JSON write is provably dead (no reader), remove the dead write via atomic-edit + adjust/add a test. If anything reads the JSON, SKIP (outcome=skipped-unsafe) — do not risk checkout pricing.`,
  },
  {
    key: 'doc-loose-ends',
    prompt: `Fix stale schema comments in backend/prisma/schema.prisma: the MindMemory and MindMessage models carry comments claiming 'ZERO writers' / canonical-but-unwritten, but both NOW have writers (KloelMemoryEngineService writes MindMemory; dualWrite* write MindMessage). Update ONLY those stale comment lines to reflect reality (now dual-written behind KLOEL_MINDMEMORY_DUALWRITE / KLOEL_MINDMESSAGE_DUALWRITE, still canonical-but-dead-on-READ). Comment-only, zero behavior change. Verify the claim by grepping the writers first.`,
  },
  {
    key: 'apikey-dos',
    prompt: `P1 #17: ApiKey validation does an O(n) full-table scan running PBKDF2 per candidate (DoS amplifier). The canonical fix is a deterministic lookup hash (sha256 of the raw key) to index the candidate, keeping PBKDF2 only for the final constant-time verify. ASSESS: this likely needs a new indexed column on RAC_ApiKey (schema change) — if so, SKIP (outcome=skipped-unsafe, schema migration) and write a precise 1-paragraph migration plan in the note. ONLY if a backward-compatible additive fix exists WITHOUT a schema change (e.g. a key-prefix narrowing already present), implement it. Do NOT add a Prisma migration autonomously.`,
  },
]

phase('Resolve')
const RESULT = {
  type: 'object', additionalProperties: false,
  properties: {
    track: { type: 'string' },
    outcome: { enum: ['fixed', 'skipped-not-real', 'skipped-unsafe', 'failed'] },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    testAdded: { type: 'boolean' },
    typecheck: { type: 'string' },
    note: { type: 'string' },
    migrationPlan: { type: 'string' },
  },
  required: ['track', 'outcome', 'note'],
}
const results = await parallel(
  TRACKS.map((t) => () =>
    agent(
      [
        `Track "${t.key}" (cwd ${ROOT}).`, ATOMIC, SAFE, t.prompt,
        'After any edit, typecheck the touched area: `cd backend && npx tsc -p tsconfig.build.json --noEmit`. Report the result + any migration plan for skipped-unsafe. Return the StructuredOutput (set track to the key).',
      ].join('\n'),
      { schema: RESULT, phase: 'Resolve', label: `d:${t.key}` },
    ).catch((e) => ({ track: t.key, outcome: 'failed', note: String(e).slice(0, 160) })),
  ),
)

phase('Verify')
const verify = await parallel(
  results.filter((r) => r && r.outcome === 'fixed').map((r) => () =>
    agent(
      [
        `Adversarially verify track "${r.track}" (cwd ${ROOT}). Files: ${JSON.stringify(r.filesChanged || [])}. Read the git diff.`,
        'Try to find a broken behavior, a missing caller, a non-backward-compatible change, or a live-path risk. Re-run the touched-area typecheck. Return the StructuredOutput (track + final outcome; set skipped-unsafe if it should be reverted).',
      ].join('\n'),
      { schema: RESULT, phase: 'Verify', label: `verify:${r.track}` },
    ).catch(() => r),
  ),
)
return { results: results.filter(Boolean), verify: verify.filter(Boolean) }
