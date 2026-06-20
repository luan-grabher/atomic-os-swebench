export const meta = {
  name: 'abolish-unjudged-census',
  description: 'Census every UNJUDGED site in atomic-edit (producer / verdict-consumer / reporter / proof-asserter) to abolish it: unjudged -> NEGATIVE, keep notApplicable green',
  phases: [
    { title: 'Enumerate', detail: 'list files mentioning unjudged' },
    { title: 'Classify', detail: 'per-file unjudged roles + lie-points + change needed' },
  ],
}

const ROOT = 'scripts/mcp/atomic-edit'

phase('Enumerate')
const enumSchema = { type: 'object', additionalProperties: false, properties: { files: { type: 'array', items: { type: 'string' } } }, required: ['files'] }
const listed = await agent(
  `Grep ${ROOT} (EXCLUDE node_modules and dist) for source files (*.ts and *.mjs) whose contents contain 'unjudged' (case-insensitive). Return their repo-relative paths starting with ${ROOT}/. Grep/glob only — do not read full contents.`,
  { label: 'enumerate', phase: 'Enumerate', schema: enumSchema, agentType: 'Explore' }
)
const files = (listed?.files || []).filter(Boolean)
log(`enumerated ${files.length} files mentioning unjudged`)

phase('Classify')
const cls = {
  type: 'object', additionalProperties: false,
  properties: {
    rows: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          file: { type: 'string' },
          roles: { type: 'array', items: { type: 'string', enum: ['producer', 'verdict-consumer', 'reporter', 'proof-asserter', 'type-def', 'shared-helper', 'other'] } },
          liePoints: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              properties: { line: { type: 'integer' }, treatment: { type: 'string' }, snippet: { type: 'string' } },
              required: ['line', 'treatment', 'snippet'],
            },
          },
          changeNeeded: { type: 'string' },
        },
        required: ['file', 'roles', 'liePoints', 'changeNeeded'],
      },
    },
  }, required: ['rows'],
}
const chunk = (a, n) => a.reduce((x, _, i) => (i % n ? x : [...x, a.slice(i, i + n)]), [])
const batches = chunk(files, 6)
const res = await parallel(batches.map((b, i) => () =>
  agent(
    `DOCTRINE (Daniel, non-negotiable): ABOLISH UNJUDGED. There is NO third state — a gate either PROVES a byte POSITIVE or the byte is NEGATIVE, period. 'unjudged' means "could not decide from the bytes I have" (no tree-sitter grammar / no tsconfig / over a cap / no runner). That is now NEGATIVE (the result must be green:false with a red like "UNPROVEN: cannot prove positive => negative: <reason>"), NEVER green/pass/allow. IMPORTANT: KEEP 'notApplicable' (genuinely no such property exists in this change — e.g. a behavior gate on a CSS file) as GREEN — that is honest positive-by-vacuity, not a failure to prove. The tool MUST NOT LIE: any place that currently treats unjudged as pass/green/allow, or reports it as a separate ok/honest bucket, is a lie to abolish.\n\n` +
    `For EACH file below, read it fully and return a row:\n` +
    `- roles: producer (sets unjudged:true on a GateResult), verdict-consumer (decides admit/refuse or green/red and currently lets unjudged through as pass — a LIE), reporter (lens/receipt/y-certificate that surfaces unjudged as its own bucket or as ok), proof-asserter (a *.proof.* that ASSERTS unjudged===true / green-while-unjudged as a PASS — these break when abolished and MUST be flipped), shared-helper (a reusable fn that builds the unjudged result — highest leverage), type-def.\n` +
    `- liePoints: the exact (line, treatment, snippet) sites where unjudged is treated as acceptable/green/pass OR reported as ok OR asserted-as-pass. These are the abolition targets.\n` +
    `- changeNeeded: one precise line — what to change so unjudged becomes negative here, and (if proof-asserter) which assertion must flip to expect green:false + the UNPROVEN red.\n\n` +
    `Ground every claim in code you actually read. FILES:\n${b.map((f) => '- ' + f).join('\n')}`,
    { label: `classify:${i}`, phase: 'Classify', schema: cls }
  )
))
const rows = res.filter(Boolean).flatMap((r) => r.rows || [])
return { fileCount: files.length, rowCount: rows.length, rows }
