export const meta = {
  name: 'swarm-n-capability-consolidation',
  description: 'Triage the 17 duplicated capabilities (consolidatable vs intentionally-distinct), consolidate the genuinely-safe ones (flag-gated/behavior-preserving routing through one canonical impl), and reconcile DUPLICATION_REGISTER.md to the curated 55. Atomic-edit only, no frontend, no-commit, adversarially verified.',
  phases: [
    { title: 'Triage', detail: 'classify 17 capabilities + reconcile the register (parallel)' },
    { title: 'Consolidate', detail: 'pipeline the consolidatable capabilities: route->canonical -> verify' },
  ],
}
const ROOT = '/Users/danielpenin/kloel'
const DIGEST = `${ROOT}/docs/architecture/inventory/_CONSOLIDATED.json`
const CAPMAP = `${ROOT}/docs/architecture/CAPABILITY_MAP.md`
const ATOMIC = 'HARD RULE: ONLY mcp__atomic-edit__* tools for code/doc edits (atomic_create_file/atomic_apply_edits/atomic_edit/atomic_rename_symbol_cross_file). NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Do NOT git commit. Report filesChanged.'
const SAFE = 'SAFETY: NEVER touch frontend/. Consolidation must be BEHAVIOR-PRESERVING (route N call sites through the ONE canonical impl with identical behavior) OR FLAG-GATED (default-OFF, flag-OFF byte-identical). No schema migration, no public-API break. A "duplicate" capability is often INTENTIONALLY distinct (e.g. 21 create_checkout impls may be different checkout types / different actors) — if so, classify intentionally-distinct and SKIP (do NOT force-merge). Only consolidate when the impls are genuinely the SAME capability with no behavioral divergence. Prove equivalence before editing. Add tests. If unsafe/design-heavy, skipped-unsafe + document.'

phase('Triage')
const TRIAGE = {
  type: 'object', additionalProperties: false,
  properties: { caps: { type: 'array', maxItems: 17, items: {
    type: 'object', additionalProperties: false,
    properties: {
      capability: { type: 'string' },
      implCount: { type: 'number' },
      klass: { enum: ['consolidatable-safe', 'intentionally-distinct', 'already-canonical', 'design-heavy'] },
      canonicalImpl: { type: 'string' },
      duplicateSites: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      fixHint: { type: 'string' },
    }, required: ['capability', 'klass'] } } },
  required: ['caps'],
}
const triageP = agent(
  [`Triage the 17 duplicated capabilities in ${CAPMAP} (create_checkout~21, parse_webhook~14, send_message~7, resolve_tenant~7, connect_channel~7, authenticate_user~6, normalize_phone~4, and the rest). cwd ${ROOT}.`,
   ATOMIC, SAFE,
   'For EACH capability: grep the real impls, decide klass (consolidatable-safe = same capability, behavior-identical, routable through one canonical; intentionally-distinct = different actors/types, keep separate; already-canonical = one impl already + thin wrappers; design-heavy = same capability but consolidation needs a migration/refactor). For consolidatable-safe, name the canonicalImpl + duplicateSites + a concrete fixHint. Be HONEST — most are probably intentionally-distinct or design-heavy; only flag consolidatable-safe when truly safe. Return the StructuredOutput.'].join('\n'),
  { schema: TRIAGE, phase: 'Triage', label: 'triage:capabilities' },
).catch(() => ({ caps: [] }))

const REG = { type: 'object', additionalProperties: false, properties: { outcome: { enum: ['done', 'partial', 'skipped'] }, approach: { type: 'string' }, filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 6 }, note: { type: 'string' } }, required: ['outcome', 'note'] }
const registerP = agent(
  [`Reconcile DUPLICATION_REGISTER.md doc-vs-reality (cwd ${ROOT}). The README advertises it as "55 entries (8 P0/25 P1/17 P2/5 P3) each with file:line + canonical choice + migration sketch", but the actual ${ROOT}/docs/architecture/DUPLICATION_REGISTER.md is an auto-generated top-100 export table with no P0-P3 tags. The curated 55 ARE in ${DIGEST} (severity-tagged).`,
   ATOMIC,
   'Check how DUPLICATION_REGISTER.md is generated (scan-writers.mjs / scan.mjs in tools/canonicalize). Make the register HONEST: either (a) regenerate/author it FROM _CONSOLIDATED.json so it carries the 55 curated severity-tagged entries (preferred — preserve any auto-gen section but lead with the curated register), or (b) if it is purely generator-owned, add a curated section + correct the README claim to match reality. Do it via atomic (atomic_apply_edits/atomic_create_file). Cross-link MIGRATION_PLAYBOOK + the P0 verification log. Return StructuredOutput.'].join('\n'),
  { schema: REG, phase: 'Triage', label: 'reconcile:register' },
).catch((e) => ({ outcome: 'skipped', note: String(e).slice(0, 120) }))

const [triage, register] = await Promise.all([triageP, registerP])
const safe = (triage?.caps || []).filter((c) => c.klass === 'consolidatable-safe')
log(`Triage: ${(triage?.caps || []).length} caps -> ${safe.length} consolidatable-safe | register: ${register?.outcome}`)

phase('Consolidate')
const RES = { type: 'object', additionalProperties: false, properties: { capability: { type: 'string' }, outcome: { enum: ['consolidated', 'skipped-unsafe', 'skipped-not-real', 'failed'] }, flag: { type: 'string' }, sitesRouted: { type: 'number' }, filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 16 }, testAdded: { type: 'boolean' }, typecheck: { type: 'string' }, note: { type: 'string' } }, required: ['capability', 'outcome', 'note'] }
const consolidated = await pipeline(
  safe,
  (cap) => agent(
    [`Consolidate capability "${cap.capability}" (cwd ${ROOT}). Canonical: ${cap.canonicalImpl}. Duplicate sites: ${JSON.stringify(cap.duplicateSites || [])}. Hint: ${cap.fixHint || ''}.`,
     ATOMIC, SAFE,
     'STEP 1: re-verify the impls are genuinely the SAME capability (not intentionally-distinct). If distinct -> skipped-not-real. STEP 2: route the duplicate sites through the ONE canonical impl, behavior-preserving (or flag-gated default-OFF). Add a test. STEP 3: `cd backend && npx tsc -p tsconfig.build.json --noEmit`. Return StructuredOutput (capability=name).'].join('\n'),
    { schema: RES, phase: 'Consolidate', label: `cap:${cap.capability}` },
  ).catch((e) => ({ capability: cap.capability, outcome: 'failed', note: String(e).slice(0, 140) })),
  (res, cap) => res && res.outcome === 'consolidated'
    ? agent([`Adversarially verify consolidation of "${cap.capability}" (cwd ${ROOT}). Files: ${JSON.stringify(res.filesChanged || [])}. Read git diff.`,
        'Prove behavior-preserving (or flag-OFF byte-identical), every routed site identical, no frontend, no public-API break, typecheck passes. If a routed site subtly changed behavior -> skipped-unsafe. Return StructuredOutput (capability+final outcome).'].join('\n'),
        { schema: RES, phase: 'Consolidate', label: `verify:${cap.capability}` }).catch(() => res)
    : res,
)
return { triage: triage?.caps || [], register, consolidated: consolidated.filter(Boolean) }
