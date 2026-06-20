export const meta = {
  name: 'atomic-os-conflict-union-merge',
  description: 'Resolve 3-way merge conflicts into the union of all atomic work (paradigm+language+published) for atomic-os unification',
  phases: [
    { title: 'Resolve', detail: 'one agent per conflicted file: union merge + self-verify' },
    { title: 'ReviewAOS', detail: 'fold any published-only content the auto-merge could not' },
  ],
}

const STAGING = '/tmp/aos-build'
const E = '/Users/danielpenin/kloel-elevation/scripts/mcp/atomic-edit'
const M = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'
const A = '/tmp/aos-full/src'

const CONFLICTS = [
  { f: 'src/PARADIGM-ELEVATION.md',          elev: E+'/PARADIGM-ELEVATION.md',          main: M+'/PARADIGM-ELEVATION.md',          aos: A+'/PARADIGM-ELEVATION.md' },
  { f: 'src/atomic-exec-broker.mjs',         elev: E+'/atomic-exec-broker.mjs',         main: M+'/atomic-exec-broker.mjs',         aos: A+'/atomic-exec-broker.mjs' },
  { f: 'src/connection-gate.ts',             elev: E+'/connection-gate.ts',             main: M+'/connection-gate.ts',             aos: A+'/connection-gate.ts' },
  { f: 'src/engine-ops.ts',                  elev: E+'/engine-ops.ts',                  main: M+'/engine-ops.ts',                  aos: A+'/engine-ops.ts' },
  { f: 'src/engine-rename-native.ts',        elev: E+'/engine-rename-native.ts',        main: M+'/engine-rename-native.ts',        aos: null },
  { f: 'src/engine-undo.ts',                 elev: E+'/engine-undo.ts',                 main: M+'/engine-undo.ts',                 aos: A+'/engine-undo.ts' },
  { f: 'src/gates/proof-host-env.mjs',       elev: E+'/gates/proof-host-env.mjs',       main: M+'/gates/proof-host-env.mjs',       aos: A+'/gates/proof-host-env.mjs' },
  { f: 'src/gates/resource-lifetime.proof.mjs', elev: E+'/gates/resource-lifetime.proof.mjs', main: M+'/gates/resource-lifetime.proof.mjs', aos: A+'/gates/resource-lifetime.proof.mjs' },
  { f: 'src/native-bridge.ts',               elev: E+'/native-bridge.ts',               main: M+'/native-bridge.ts',               aos: A+'/native-bridge.ts' },
  { f: 'src/server-helpers-negative-proof.ts', elev: E+'/server-helpers-negative-proof.ts', main: M+'/server-helpers-negative-proof.ts', aos: A+'/server-helpers-negative-proof.ts' },
  { f: 'src/server-tools-self.ts',           elev: E+'/server-tools-self.ts',           main: M+'/server-tools-self.ts',           aos: A+'/server-tools-self.ts' },
]
const REVIEW = [
  { f: 'src/gates/codex-bypass-observer-wiring.proof.mjs', elev: E+'/gates/codex-bypass-observer-wiring.proof.mjs', main: M+'/gates/codex-bypass-observer-wiring.proof.mjs', aos: A+'/gates/codex-bypass-observer-wiring.proof.mjs' },
  { f: 'src/gates/file-broker-liveness-marker.proof.mjs',  elev: E+'/gates/file-broker-liveness-marker.proof.mjs',  main: M+'/gates/file-broker-liveness-marker.proof.mjs',  aos: A+'/gates/file-broker-liveness-marker.proof.mjs' },
  { f: 'src/gates/invariant-taxonomy.json',  elev: E+'/gates/invariant-taxonomy.json',  main: null, aos: A+'/gates/invariant-taxonomy.json' },
  { f: 'src/lang-supply-chain.mjs',          elev: E+'/lang-supply-chain.mjs',          main: null, aos: A+'/lang-supply-chain.mjs' },
  { f: 'src/paradigm-verify.mjs',            elev: E+'/paradigm-verify.mjs',            main: null, aos: A+'/paradigm-verify.mjs' },
  { f: 'src/vitest.config.ts',               elev: E+'/vitest.config.ts',               main: M+'/vitest.config.ts',               aos: A+'/vitest.config.ts' },
]

const RES_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file','markersRemain','parses','featuresKept','linesOut','notes'],
  properties: {
    file: { type: 'string' },
    markersRemain: { type: 'integer' },
    parses: { type: 'boolean' },
    featuresKept: { type: 'boolean', description: 'true if every feature/export/gate-phase/language-entry from ALL sources is present in the result' },
    linesOut: { type: 'integer' },
    notes: { type: 'string' },
  },
}
const REV_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file','changed','parses','notes'],
  properties: {
    file: { type: 'string' },
    changed: { type: 'boolean' },
    parses: { type: 'boolean' },
    notes: { type: 'string' },
  },
}

function langHint(f) {
  if (f.endsWith('.ts')) return 'TypeScript (ensure balanced braces/parens and valid TS; you may check with: npx -y typescript tsc --noEmit --skipLibCheck on it only if quick, otherwise read carefully)'
  if (f.endsWith('.mjs') || f.endsWith('.js') || f.endsWith('.cjs')) return 'JavaScript ESM (verify with: node --check <path>)'
  if (f.endsWith('.json')) return 'JSON (verify with: python3 -m json.tool <path> >/dev/null)'
  if (f.endsWith('.md')) return 'Markdown (no parser; ensure no conflict markers and a coherent merged doc)'
  if (f.endsWith('.py')) return 'Python (verify with: python3 -m py_compile <path>)'
  return 'source'
}

phase('Resolve')
const resolved = await parallel(CONFLICTS.map((c) => () => {
  const staging = `${STAGING}/${c.f}`
  const refs = [
    c.elev ? `- ELEVATION (richest paradigm-elevation gate work): ${c.elev}` : null,
    c.main ? `- MAIN (newest language/engine work, e.g. multi-language support, raised limits): ${c.main}` : null,
    c.aos ? `- AOS (currently-published atomic-os snapshot): ${c.aos}` : null,
  ].filter(Boolean).join('\n')
  return agent(
`You are resolving a 3-way merge conflict in ONE file for a source-unification task. The absolute goal is the UNION of all work — LOSE NOTHING from any source.

STAGING FILE (currently contains git conflict markers; "ours"=ELEVATION/paradigm, "theirs"=MAIN/language):
  ${staging}

REFERENCE SOURCE VERSIONS (read all that exist):
${refs}

This file is ${langHint(c.f)}.

Steps:
1. Read the staging file and every reference version listed.
2. Produce the correct merged content that:
   - keeps EVERY feature/function/export/gate-phase/language-map-entry/dictionary-key present in ANY version,
   - for a genuine single-value change of the same thing (e.g. a constant raised 140->1000), picks the NEWEST/most-permissive value (usually MAIN's) and includes it only ONCE (never both),
   - contains ZERO conflict markers (the 7-char git markers),
   - is syntactically valid.
   When unsure whether two blocks are "same thing changed" vs "two different additions", treat them as different additions and keep BOTH.
   If one version is a strict superset of the others, take it wholesale.
3. Overwrite the staging file ${staging} with the final merged content (use Write).
4. Verify:
   - run: grep -cE '^(<<<<<<<|=======|>>>>>>>|[|][|][|][|][|][|][|])' ${staging}  (must be 0)
   - run the parse check appropriate for the file type if a command exists.
   - confirm key features from each source survive (grep a couple of distinctive tokens from ELEVATION and from MAIN).

Return ONLY the structured object. Set featuresKept=true ONLY if you verified union completeness.`,
    { label: `resolve:${c.f.split('/').pop()}`, phase: 'Resolve', schema: RES_SCHEMA }
  )
}))

phase('ReviewAOS')
const reviewed = await parallel(REVIEW.map((c) => () => {
  const staging = `${STAGING}/${c.f}`
  return agent(
`The staging file ${staging} currently contains the merged ELEVATION-union-MAIN version with NO conflict markers. The published AOS version could NOT be auto-merged and may contain unique content.

AOS published version: ${c.aos}
${c.elev ? `ELEVATION version: ${c.elev}` : ''}
${c.main ? `MAIN version: ${c.main}` : ''}

This file is ${langHint(c.f)}.

Task: Compare the AOS version against the staging file. Does AOS contain any feature / export / gate-phase / logic / doc-section NOT already present in staging that SHOULD be preserved in the unified product?
- If YES: fold that content into the staging file (union; keep staging's content too), then Write the result to ${staging}.
- If staging already supersedes AOS: leave staging unchanged.
Never introduce conflict markers. Ensure the result is syntactically valid.
Verify: grep -cE '^(<<<<<<<|=======|>>>>>>>)' ${staging} must be 0; run a parse check if available.

Return ONLY the structured object.`,
    { label: `review:${c.f.split('/').pop()}`, phase: 'ReviewAOS', schema: REV_SCHEMA }
  )
}))

const r = resolved.filter(Boolean)
const rv = reviewed.filter(Boolean)
return {
  resolvedCount: r.length,
  reviewCount: rv.length,
  withMarkers: r.filter(x => x.markersRemain > 0).map(x => x.file),
  notParsing: r.filter(x => x.parses === false).map(x => x.file),
  featuresDropped: r.filter(x => x.featuresKept === false).map(x => x.file),
  reviewChanged: rv.filter(x => x.changed).map(x => x.file),
  reviewNotParsing: rv.filter(x => x.parses === false).map(x => x.file),
  resolved: r,
  reviewed: rv,
}
