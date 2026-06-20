export const meta = {
  name: 'kloel-canon-exec-wave1',
  description: 'Execution wave 1: implement the safest ready canonicalization tasks in isolated worktrees, validate (tsc), return diffs for owner review',
  phases: [{ title: 'Execute', detail: 'MIND-E deprecation, MIND-B Brain→Mind renames, vendas relabel — worktree-isolated + tsc-validated' }],
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['task', 'done', 'summary'],
  properties: {
    task: { type: 'string' },
    done: { type: 'boolean', description: 'true if implemented + validated' },
    filesChanged: { type: 'string', description: 'list of files changed with line counts' },
    diff: { type: 'string', description: 'the unified diff of the change (keep concise, key hunks)' },
    validation: { type: 'string', description: 'tsc/lint result on the affected workspace' },
    summary: { type: 'string', description: 'what changed + why it is safe + any risk for owner review' },
    committedSha: { type: 'string', description: 'commit sha in the worktree if committed, else empty' },
  },
}

const BASE = `Senior engineer on KLOEL monorepo (root /Users/danielpenin/kloel). You are in an ISOLATED git worktree off the branch HEAD — your edits do NOT touch other agents. Implement EXACTLY one task, minimal + reversible. RULES: do NOT touch the concurrent-agents lane (backend/src/kloel/{thinker,reply-engine,openai-wrapper,stream,tool-dispatcher} + backend/src/pulse) — if your task needs those, STOP and report done:false. Preserve behavior; no UI redesign; no schema data changes. After editing, run tsc on the affected workspace (cd backend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS', or frontend equivalent) and report the count. Commit your change in the worktree with a conventional message (no AI signature). Then call StructuredOutput with the diff + validation for owner review. Be precise and conservative — this is production code.`

phase('Execute')

const tasks = [
  { key: 'MIND-E-10', prompt: `${BASE}\n\nTASK MIND-E-10: Deprecate KloelGlobalPrior in favor of the richer canonical MindGlobalPrior. Steps: (1) find model KloelGlobalPrior in backend/prisma/schema.prisma and add a /// @deprecated triple-slash doc comment above it pointing to MindGlobalPrior (do NOT remove the model — data safety). (2) find the KloelGlobalPriorService (grep) and add a @deprecated JSDoc banner on the class pointing readers to the MindGlobalPrior service. Do NOT change any logic or migrate data. This is annotation-only. Validate tsc backend = 0 new errors. Report the diff.` },
  { key: 'MIND-B-09', prompt: `${BASE}\n\nTASK MIND-B-09: Brain→Mind ubiquitous-language renames for 2 NON-LANE controllers. (1) backend/src/kloel/whatsapp-brain.controller.ts: rename class WhatsAppBrainController → WhatsAppMindCoordinator (use atomic_rename_symbol_cross_file or a careful grep-verified cross-file rename so all imports/refs update). (2) backend/src/kloel/mind/coordination/ : rename class BrainRuntimeController → MindRuntimeController cross-file. FIRST verify neither file nor its importers are in the concurrent-agents lane (grep importers; if any importer is kloel-thinker/reply-engine/wrapper/stream/tool-dispatcher, STOP that rename and report). Keep the @Controller route path unchanged (only the class symbol renames) to avoid breaking the API. Validate tsc backend = 0 new errors. Report diff + which renames you did/skipped.` },
  { key: 'PROD-VENDAS-GV-07', prompt: `${BASE}\n\nTASK PROD-VENDAS-GV-07: frontend/src/app/(main)/vendas/gestao-vendas/page.tsx imports useCRMMutations/useContacts and renders CRM ContactDetail under a 'Gestão de Vendas' label — a data/label mismatch. The canonical fix that preserves behavior: change ONLY the user-facing heading/labels on this page so they honestly reflect that it shows CRM Contacts (e.g. heading 'Contatos' / 'CRM'), OR add a short honest subtitle clarifying these are CRM contacts — do NOT rewire the data (that is a bigger decision). Smallest honest change. Validate frontend tsc = 0 new errors + the page still renders (no import removed that is still used). Report diff.` },
]

const results = await parallel(
  tasks.map((t) => () =>
    agent(t.prompt, { label: `exec:${t.key}`, phase: 'Execute', schema: RESULT_SCHEMA, isolation: 'worktree' })
  )
)

return results.filter(Boolean)
