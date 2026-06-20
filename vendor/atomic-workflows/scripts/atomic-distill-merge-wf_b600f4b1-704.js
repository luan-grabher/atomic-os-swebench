export const meta = {
  name: 'atomic-distill-merge',
  description: 'Distill the two atomic trees into one: bring codex-only files into atomic-os (additive) and union-merge the co-edited files (preserve my side, add codex deltas), all via the atomic MCP',
  phases: [
    { title: 'Additive', detail: 'bring codex-only files into atomic-os/src' },
    { title: 'Merge', detail: 'union-merge each co-edited file (mine + codex delta)' },
  ],
}

const MINE = '/Users/danielpenin/kloel/atomic-os/src'
const CODEX = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const ADDITIVE = [
  'claude-atomic-host-launcher.mjs', 'codex-atomic-host-launcher.mjs',
  'server-helpers-intent-learning.ts', 'server-helpers-seal.ts', 'server-tools-intent-converge.ts',
  'smoke-import-property.ts', 'smoke-state.ts', 'smoke.ts',
  'smoke-part-a.ts', 'smoke-part-b.ts', 'smoke-part-b-setup.ts', 'smoke-part-b-anchor-after.ts',
  'smoke-part-b-anchor-before.ts', 'smoke-part-b-create-file.ts', 'smoke-part-b-delete-file.ts',
  'smoke-part-b-multi-tx.ts', 'smoke-part-b-outline-stat.ts', 'smoke-part-b-rename-prop.ts',
  'smoke-part-b-replace-between.ts', 'smoke-part-b-replace-region.ts',
  'smoke-part-c.ts', 'smoke-part-d.ts', 'smoke-part-ef.ts', 'smoke-part-gh.ts',
]

// co-edited files to union-merge (build.mjs + smoke.mjs deferred to the main session)
const MERGE = [
  'server.ts', 'native-bridge.ts', 'server-tools-converge.ts', 'codex-atomic-only-hook.mjs',
  'demo-live.ts', 'gate-receipt-mapper.ts', 'operational-use.ts', 'server-tools-self.ts',
  'engine-structural.ts', 'nav.ts', 'benchmark.ts', 'bypass-classify.test.mjs',
  'server-tools-h.ts', 'server-helpers-io.ts', 'engine-universal.ts', 'server-tools-lens.ts',
  'server-helpers-io.byte-floor.proof.mjs', 'server-tools-lens.proof.mjs',
  'advanced.ts', 'advanced-imports.ts',
  'trace.ts', 'server-tools-session.ts', 'server-tools-y.ts', 'server-helpers-effect.ts',
]

const FILE_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  file: { type: 'string' }, action: { type: 'string', enum: ['created', 'merged', 'identical', 'skipped'] },
  summary: { type: 'string' }, risk: { type: 'string', enum: ['low', 'medium', 'high'] },
}, required: ['file', 'action', 'summary', 'risk'] }

const PRE = `You distill two copies of the atomic-edit engine into ONE inside ${MINE} (the atomic-os mirror).
HARD RULES:
- Use the atomic MCP for ALL writes. First load tools via ToolSearch query "select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_apply_edits,mcp__atomic-edit__atomic_insert_at,mcp__atomic-edit__atomic_insert_after_anchor,mcp__atomic-edit__atomic_grep". FORBIDDEN to use Edit/Write on source.
- Address files to the MCP as "atomic-os/src/<name>". Read raw content with the Read tool at absolute paths.
- Do NOT build (concurrent builds corrupt the shared dist; the main session builds after). If a write is refused "dist STALE", run Bash: node /Users/danielpenin/kloel/scripts/mcp/atomic-edit/build.mjs then retry.
- ADDITIVE / UNION ONLY. Never delete either side's working code. Byte-positivity refuses negative edits without a proofOfIncorrectness; for a genuine union you are ADDING, so writes pass.`

const additiveChunks = []
for (let i = 0; i < ADDITIVE.length; i += 6) additiveChunks.push(ADDITIVE.slice(i, i + 6))

phase('Additive')
const addResults = await parallel(additiveChunks.map((chunk, ci) => () =>
  agent(`${PRE}

TASK: bring these codex-only files into atomic-os/src (they do not exist there yet — pure additive).
For EACH file F in: ${JSON.stringify(chunk)}
  1. Read the codex original at ${CODEX}/F (absolute path; note the codex tree is FLAT).
  2. Create atomic-os/src/F via atomic_create_file with that exact content. Imports use relative './x.js' which resolve the same in the src/ layout, so leave them. If atomic_create_file says the file already exists, skip it (action: identical).
Return one schema object PER FILE you handled (the StructuredOutput will be one object; if multiple files, summarize them in summary and pick the highest risk).`,
    { label: `add:${ci}`, phase: 'Additive', schema: FILE_SCHEMA })))

phase('Merge')
const mergeResults = await parallel(MERGE.map((f) => () =>
  agent(`${PRE}

TASK: UNION-MERGE one co-edited file: ${f}
  - MY version (the base, already in the repo, already builds + has my features): ${MINE}/${f}
  - CODEX version (has codex's recent updates): ${CODEX}/${f}
  1. Read BOTH versions fully.
  2. Compute codex's DELTA vs mine (what codex added/changed that mine lacks).
  3. Apply that delta INTO ${MINE}/${f} via the atomic MCP (atomic_insert_after_anchor / grep-then-insert_at / atomic_apply_edits), so the result has EVERY capability from BOTH. KEEP all of my features intact (do not regress my version). Add codex's new functions/branches/exports.
  4. If a region was edited by BOTH on the same logic, keep the superset/stricter behavior and preserve both intents; never silently drop my side.
  - Imports: keep paths valid for the src/ layout (siblings './x.js').
  - The convergence gate type-checks every write — if it reports a TS error, fix it and retry until green. If a clean union is genuinely impossible without regressing one side, make NO change and return action 'skipped' with the reason in summary + risk 'high'.
Return the schema for ${f}.`,
    { label: `merge:${f}`, phase: 'Merge', schema: FILE_SCHEMA })))

const created = addResults.filter(Boolean)
const merged = mergeResults.filter(Boolean)
log(`additive chunks: ${created.length} | merged: ${merged.filter((m) => m.action === 'merged').length}/${MERGE.length} (skipped: ${merged.filter((m) => m.action === 'skipped').map((m) => m.file).join(',') || 'none'})`)
return { created, merged }
