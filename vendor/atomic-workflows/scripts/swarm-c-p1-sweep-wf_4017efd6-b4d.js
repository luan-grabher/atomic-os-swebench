export const meta = {
  name: 'swarm-c-p1-sweep',
  description: 'Verify + resolve the surgical-safe P1 duplications from the register; document the design-heavy ones. Atomic-edit only, additive, behavior-preserving, no-commit.',
  phases: [
    { title: 'Triage', detail: 'read digest, classify the 24 P1s: surgical-safe vs design-heavy vs already-in-flight' },
    { title: 'Resolve', detail: 'pipeline: verify-real → atomic-fix surgical-safe ones + test → validate' },
  ],
}

const ROOT = '/Users/danielpenin/kloel'
const DIGEST = `${ROOT}/docs/architecture/inventory/_CONSOLIDATED.json`
const ATOMIC_ONLY = 'HARD RULE: use ONLY mcp__atomic-edit__* tools for EVERY code edit (atomic_edit, atomic_apply_edits, atomic_create_file). NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Each atomic edit self-validates (convergence gate). Do NOT git commit — leave changes in the working tree and report them.'
const SAFE = 'SAFETY: only ADDITIVE / behavior-preserving / clearly-correct fixes. NEVER change a public API, schema, or runtime behavior on the hot/auth/payment path without a default-OFF flag. If a P1 needs a migration, schema change, or cross-cutting refactor, SKIP it and document — do not attempt. Token-at-rest / auth / DoS fixes: only if provably backward-compatible.'

phase('Triage')
const TRIAGE = {
  type: 'object', additionalProperties: false,
  properties: {
    items: {
      type: 'array', maxItems: 24,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          n: { type: 'number' },
          concept: { type: 'string' },
          klass: { enum: ['surgical-safe', 'design-heavy', 'already-in-flight'] },
          canonical: { type: 'string' },
          fixHint: { type: 'string' },
        },
        required: ['n', 'concept', 'klass'],
      },
    },
  },
  required: ['items'],
}
const triage = await agent(
  [
    `Read the Kloel duplication digest at ${DIGEST} (the "duplications" array, severity P1).`,
    'For EACH P1, classify: "surgical-safe" (a real, additive, behavior-preserving one-file-ish fix — e.g. rename a name-colliding class, hoist a duplicated util, fix an O(n) scan with a backward-compatible lookup, remove dead JSON write), "design-heavy" (needs schema/migration/cross-cutting refactor), or "already-in-flight" (an existing flag-gated migration like message/memory/dispatch convergence — do NOT redo).',
    SAFE,
    'Return the StructuredOutput with all P1s classified + a concrete fixHint for surgical-safe ones.',
  ].join('\n'),
  { schema: TRIAGE, phase: 'Triage', label: 'triage:p1' },
)
const safeItems = (triage?.items || []).filter((i) => i.klass === 'surgical-safe')
log(`Triage: ${(triage?.items || []).length} P1s → ${safeItems.length} surgical-safe, ${(triage?.items||[]).filter(i=>i.klass==='design-heavy').length} design-heavy, ${(triage?.items||[]).filter(i=>i.klass==='already-in-flight').length} in-flight`)

phase('Resolve')
const RESULT = {
  type: 'object', additionalProperties: false,
  properties: {
    n: { type: 'number' },
    concept: { type: 'string' },
    outcome: { enum: ['fixed', 'skipped-not-real', 'skipped-unsafe', 'failed'] },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    testAdded: { type: 'boolean' },
    typecheck: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['n', 'outcome', 'note'],
}
const results = await pipeline(
  safeItems,
  // Stage 1: verify-real + atomic-fix
  (item) =>
    agent(
      [
        `Resolve P1 #${item.n}: ${item.concept} (cwd ${ROOT}).`,
        `Canonical: ${item.canonical || '(see digest)'}. Fix hint: ${item.fixHint || ''}.`,
        ATOMIC_ONLY, SAFE,
        'STEP 1: verify the duplication is REAL in current code (grep the named symbols/files). If it is NOT real (already fixed / over-claim), return outcome=skipped-not-real.',
        'STEP 2: if real AND surgical-safe, apply the additive/behavior-preserving fix via atomic-edit, and add or update a hermetic test proving it. If on closer look it needs a migration/refactor, return outcome=skipped-unsafe with the reason.',
        'STEP 3: typecheck the touched files: `cd backend && npx tsc -p tsconfig.build.json --noEmit` (or worker tsc if worker files). Report the result.',
        'Do NOT commit. Return the StructuredOutput.',
      ].join('\n'),
      { schema: RESULT, phase: 'Resolve', label: `fix:p1-${item.n}` },
    ).catch((e) => ({ n: item.n, outcome: 'failed', note: String(e).slice(0, 160) })),
  // Stage 2: adversarial verify the fixed ones
  (res, item) =>
    res && res.outcome === 'fixed'
      ? agent(
          [
            `Adversarially verify the fix for P1 #${item.n} (${item.concept}) (cwd ${ROOT}).`,
            `Files: ${JSON.stringify(res.filesChanged || [])}. Read the diff via git diff.`,
            'Try to find: a broken behavior, an unsafe rename missing a caller, a non-backward-compatible change. Re-run the typecheck. If the fix is unsafe, say so in note and set outcome=skipped-unsafe (the human will revert).',
            'Read-only except typecheck. Return the StructuredOutput (carry n + concept + final outcome).',
          ].join('\n'),
          { schema: RESULT, phase: 'Resolve', label: `verify:p1-${item.n}` },
        ).catch(() => res)
      : res,
)
return {
  triage: triage?.items || [],
  resolved: results.filter(Boolean),
  fixedCount: results.filter((r) => r && r.outcome === 'fixed').length,
}
