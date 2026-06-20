export const meta = {
  name: 'atomic-lang-coverage-matrix',
  description: 'Map atomic-edit capability x language coverage across gates + the universal engine for TS/JS/CSS/HTML/SQL/Shell',
  phases: [
    { title: 'Enumerate', detail: 'list gate + engine source files' },
    { title: 'Classify', detail: 'per-file per-language verdict' },
  ],
}

const ROOT = 'scripts/mcp/atomic-edit'
const LANGS = ['TypeScript', 'JavaScript', 'CSS', 'HTML', 'SQL', 'Shell']

phase('Enumerate')
const enumSchema = { type: 'object', additionalProperties: false, properties: { files: { type: 'array', items: { type: 'string' } } }, required: ['files'] }
const listed = await agent(
  `List every NON-proof gate/engine source file in ${ROOT} relevant to per-language capability coverage. Include: all files matching ${ROOT}/gates/*.ts EXCEPT those ending in .proof.ts; plus ${ROOT}/native-bridge.ts, ${ROOT}/lang-bridge.ts, ${ROOT}/engine.ts, ${ROOT}/engine-universal.ts, ${ROOT}/advanced.ts. Return repo-relative paths starting with ${ROOT}/. Glob/stat only — do not read contents.`,
  { label: 'enumerate', phase: 'Enumerate', schema: enumSchema, agentType: 'Explore' }
)
const files = (listed?.files || []).filter(Boolean)
log(`enumerated ${files.length} files`)

phase('Classify')
const clsSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    rows: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          file: { type: 'string' },
          capability: { type: 'string' },
          mechanism: { type: 'string', enum: ['ts-compiler', 'tree-sitter', 'regex', 'spawn-exec', 'byte-text', 'other'] },
          perLang: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              properties: {
                lang: { type: 'string' },
                verdict: { type: 'string', enum: ['covered', 'ts-only-by-nature', 'na', 'unjudged-honest', 'silent-gap', 'false-green-risk', 'crash-risk'] },
                note: { type: 'string' },
              }, required: ['lang', 'verdict', 'note'],
            },
          },
        }, required: ['file', 'capability', 'mechanism', 'perLang'],
      },
    },
  }, required: ['rows'],
}
const chunk = (a, n) => a.reduce((x, _, i) => (i % n ? x : [...x, a.slice(i, i + n)]), [])
const batches = chunk(files, 4)
const results = await parallel(batches.map((b, i) => () =>
  agent(
    `Audit these atomic-edit engine files for per-language capability coverage:\n${b.map((f) => '- ' + f).join('\n')}\n\n` +
    `For EACH file, read it fully and produce one row {file, capability, mechanism, perLang}. ` +
    `perLang must contain exactly these 6 langs: ${LANGS.join(', ')}. Verdict meanings:\n` +
    `- covered: works correctly on that language today.\n` +
    `- ts-only-by-nature: intrinsically TS/JS (e.g. the TS type system); code correctly skips/refuses for this lang.\n` +
    `- na: capability semantically inapplicable to this language.\n` +
    `- unjudged-honest: code explicitly returns unjudged/unavailable when it lacks a grammar/analyzer (honest abstention).\n` +
    `- silent-gap: silently no-ops/skips WITHOUT signaling — DANGEROUS.\n` +
    `- false-green-risk: could report pass/green without real analysis — DANGEROUS.\n` +
    `- crash-risk: could throw on this language.\n` +
    `In each note cite the exact line/branch (the EXT lookup, the SOURCE_RE, the 'no grammar' return, etc.) that determines the behavior. Every verdict must be grounded in code you actually read.`,
    { label: `classify:${i}`, phase: 'Classify', schema: clsSchema }
  )
))
const rows = results.filter(Boolean).flatMap((r) => r.rows || [])
return { fileCount: files.length, rowCount: rows.length, rows }
