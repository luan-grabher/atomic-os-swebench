export const meta = {
  name: 'swarm-h-p2-p3-sweep',
  description: 'Verify + resolve the surgical-safe P2/P3 duplications; document design-heavy/already-done. Atomic-edit only, additive/behavior-preserving, no frontend, no-commit.',
  phases: [
    { title: 'Triage', detail: 'classify 22 P2/P3: surgical-safe vs design-heavy vs already-done/over-claim' },
    { title: 'Resolve', detail: 'pipeline: verify-real -> atomic-fix surgical-safe + test -> adversarial verify' },
  ],
}

const ROOT = '/Users/danielpenin/kloel'
const DIGEST = `${ROOT}/docs/architecture/inventory/_CONSOLIDATED.json`
const ATOMIC = 'HARD RULE: ONLY mcp__atomic-edit__* tools for code edits (atomic_edit/atomic_apply_edits/atomic_create_file/atomic_delete_file/atomic_rename_symbol_cross_file). NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Do NOT git commit. Report filesChanged.'
const SAFE = 'SAFETY: ADDITIVE / behavior-preserving / clearly-correct ONLY. NEVER touch frontend/ (kloelgraph is frozen). No schema migration, no public-API break, no payment-behavior change. DELETE only with PROOF of zero callers (grep the symbol/route across backend+worker, exclude its own file + specs). RENAME only via atomic_rename_symbol_cross_file (DI/provider tokens are class symbols — keep intact). Flag-gate anything that alters a runtime path. If a P2/P3 needs a migration/refactor/cross-cutting change, SKIP (skipped-unsafe) + document. If already resolved this session (e.g. sha256 hasher -> common/auth-core; TOTP -> common/totp; WalletService rename), mark skipped-already-done.'

phase('Triage')
const TRIAGE = {
  type: 'object', additionalProperties: false,
  properties: {
    items: {
      type: 'array', maxItems: 22,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          id: { type: 'string' },
          concept: { type: 'string' },
          klass: { enum: ['surgical-safe', 'design-heavy', 'already-done', 'over-claim', 'already-in-flight'] },
          canonical: { type: 'string' },
          fixHint: { type: 'string' },
        },
        required: ['id', 'concept', 'klass'],
      },
    },
  },
  required: ['items'],
}
const triage = await agent(
  [
    `Read the Kloel duplication digest at ${DIGEST} — the "duplications" array entries with severity P2 and P3 (id them as P2-1..P2-17, P3-1..P3-5 in digest order).`,
    'Classify EACH: surgical-safe (real, additive, behavior-preserving, one-/few-file fix — DTO dedup, constant dedup, route-write-through-canonical-service, set unwired provenance column, rename naming-collision via cross-file symbol rename, delete a PROVEN-orphan dead duplicate), design-heavy (needs migration/refactor), already-done (resolved this session: sha256->auth-core, TOTP->common/totp, WalletService rename, the 6 playbook flag-gated families), over-claim (premise false in code), or already-in-flight (existing flag-gated migration).',
    SAFE,
    'Return the StructuredOutput with all 22 classified + a concrete fixHint for surgical-safe ones (cite the real symbols/files to touch).',
  ].join('\n'),
  { schema: TRIAGE, phase: 'Triage', label: 'triage:p2p3' },
)
const safe = (triage?.items || []).filter((i) => i.klass === 'surgical-safe')
log(`Triage: ${(triage?.items || []).length} items -> ${safe.length} surgical-safe`)

phase('Resolve')
const RESULT = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string' },
    concept: { type: 'string' },
    outcome: { enum: ['fixed', 'skipped-not-real', 'skipped-unsafe', 'skipped-already-done', 'failed'] },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 14 },
    testAdded: { type: 'boolean' },
    typecheck: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['id', 'outcome', 'note'],
}
const results = await pipeline(
  safe,
  (item) =>
    agent(
      [
        `Resolve ${item.id}: ${item.concept} (cwd ${ROOT}). Canonical: ${item.canonical || '(see digest)'}. Hint: ${item.fixHint || ''}.`,
        ATOMIC, SAFE,
        'STEP 1: verify the duplication is REAL in current code (grep the named symbols). If not real / already fixed -> outcome=skipped-not-real or skipped-already-done.',
        'STEP 2: if real + surgical-safe, apply the additive/behavior-preserving fix via atomic-edit (+ a test). For a DELETE, FIRST prove zero callers (grep), then atomic_delete_file. For a RENAME, use atomic_rename_symbol_cross_file. If on inspection it needs a migration/refactor -> skipped-unsafe + reason.',
        'STEP 3: typecheck: `cd backend && npx tsc -p tsconfig.build.json --noEmit`. Report. Return StructuredOutput.',
      ].join('\n'),
      { schema: RESULT, phase: 'Resolve', label: `fix:${item.id}` },
    ).catch((e) => ({ id: item.id, outcome: 'failed', note: String(e).slice(0, 160) })),
  (res, item) =>
    res && res.outcome === 'fixed'
      ? agent(
          [`Adversarially verify the fix for ${item.id} (${item.concept}) (cwd ${ROOT}). Files: ${JSON.stringify(res.filesChanged || [])}. Read the git diff. Re-run typecheck.`,
           'Prove: behavior-preserving, no missing caller (esp. after a rename/delete), no frontend, no public-API break. If unsafe -> set outcome=skipped-unsafe (human reverts). Return StructuredOutput (carry id+concept+final outcome).'].join('\n'),
          { schema: RESULT, phase: 'Resolve', label: `verify:${item.id}` },
        ).catch(() => res)
      : res,
)
return { triage: triage?.items || [], resolved: results.filter(Boolean), fixedCount: results.filter((r) => r && r.outcome === 'fixed').length }
