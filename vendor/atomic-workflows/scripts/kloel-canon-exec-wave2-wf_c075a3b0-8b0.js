export const meta = {
  name: 'kloel-canon-exec-wave2',
  description: 'Execution wave 2: funnels honest relabel, WhatsAppBrain→WhatsAppMind rename, adopt MindCanonicalService in non-lane callers, rewrite the Kloel Mind ADR — worktree-isolated, tsc-validated, diffs for review',
  phases: [{ title: 'Execute', detail: 'PROD-FUNNELS, MIND-B-09b rename, MIND-A-08 facade adoption, Mind ADR rewrite' }],
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['task', 'done', 'summary'],
  properties: {
    task: { type: 'string' },
    done: { type: 'boolean' },
    filesChanged: { type: 'string' },
    diff: { type: 'string', description: 'concise unified diff of the key hunks' },
    validation: { type: 'string', description: 'tsc/lint result on affected workspace + whether net-new errors = 0' },
    summary: { type: 'string' },
    committedSha: { type: 'string' },
  },
}

const BASE = `Senior engineer on KLOEL monorepo (root /Users/danielpenin/kloel). You are in an ISOLATED git worktree off the branch HEAD. Implement EXACTLY one task, minimal + reversible + behavior-preserving. HARD RULE: do NOT touch the concurrent-agents lane (backend/src/kloel/{thinker,reply-engine,openai-wrapper,stream,tool-dispatcher} + backend/src/pulse) — verify importers first; if your task needs those files, STOP and report done:false. No UI redesign, no schema-data change, no API route-path change. After editing, run tsc on the affected workspace and report net-new error count (worktree has no node_modules so type-defs for react/express/jest will be missing — IGNORE those; only count errors that reference YOUR changed symbols/files). Commit in the worktree with a conventional message (no AI signature; you may use --no-verify since the shared tree has concurrent dirt — your change is validated by tsc). Call StructuredOutput with the diff + validation. Conservative, production-grade.`

phase('Execute')

const tasks = [
  { key: 'PROD-FUNNELS-06', prompt: `${BASE}\n\nTASK PROD-FUNNELS-06: frontend/src/app/(main)/funnels/page.tsx imports listConversations + listFlowExecutions and renders them as 'funnels' — but there is no real funnel-builder backend; it is a Flow-Execution + Conversations analytics view. SMALLEST honest fix (label-only, no data rewire): change the page heading/subtitle so it honestly reflects it shows flow executions + conversations analytics (e.g. heading reflecting 'Execucoes de Flow' / analytics), NOT a separate funnel product. Do NOT remove the data fetching. Validate frontend tsc 0 net-new. Report diff.` },
  { key: 'MIND-B-09b', prompt: `${BASE}\n\nTASK MIND-B-09b: rename class WhatsAppBrainController in backend/src/kloel/whatsapp-brain.controller.ts to the canonical Brain→Mind name. NOTE: WhatsAppMindCoordinator is ALREADY taken (a service it injects), so use target name WhatsAppMindController. Do a careful cross-file rename of the CLASS SYMBOL only (update whatsapp-brain.controller.ts class def + self-refs, kloel.module.ts import+controllers entry, whatsapp-brain.controller.spec.ts, webhook-kloel-replay.spec.ts) — keep the @Controller route path UNCHANGED (API stable). FIRST verify none of the importers are in the concurrent-agents lane; if any is, STOP. Validate backend tsc 0 net-new errors referencing WhatsAppBrainController/WhatsAppMindController. Report diff.` },
  { key: 'MIND-A-08', prompt: `${BASE}\n\nTASK MIND-A-08: activate the canonical MindCanonicalService (backend/src/kloel/mind/mind-canonical.service.ts — it has getConversationHistory/appendMessage/getMemoryItem/upsertMemory but ZERO real adopters). Find 2-3 NON-LANE services that currently read conversation history or memory via raw prisma.kloelMessage / prisma.kloelMemory (grep, EXCLUDE thinker/reply-engine/wrapper/stream/tool-dispatcher/pulse), and route ONE clearly-safe read each through MindCanonicalService instead (additive — same physical tables, same behavior). Inject MindCanonicalService via constructor DI. Be conservative: only convert reads you are certain are equivalent; if none are clearly safe outside the lane, report done:false with the list you found. Validate backend tsc 0 net-new. Report diff + which callers you converted.` },
  { key: 'MIND-ADR', prompt: `${BASE}\n\nTASK MIND-ADR (doc rewrite, owner-directed): The owner has decided Kloel Mind must absorb ALL cognition (Brain + Mind + CIA + Autopilot + Copilot + Voice + Flows) into ONE canonical cognitive organism — superseding any narrower ADR that scoped Mind to only Brain+Mind. Find the relevant ADR (grep docs/adr for 0013 / 'Mind' / 'Brain Mind unification') and the BRAIN_MIND_UNIFICATION plan. REWRITE (edit, do not delete) the ADR to: (1) state the canonical scope is the FULL cognitive organism (state→perception→decision→action→consequence→learning loop), (2) list which subsystems dissolve into Kloel Mind (Brain/Mind/CIA/Autopilot/Copilot/Voice/Flows), (3) mark the previous narrower scope as superseded with date 2026-06-02, (4) keep it honest about what is already done (dual-write aliases, RAC_Mind* models, MindCanonicalService) vs pending. This is a documentation change only — no code. Report the diff.` },
]

const results = await parallel(
  tasks.map((t) => () =>
    agent(t.prompt, { label: `exec2:${t.key}`, phase: 'Execute', schema: RESULT_SCHEMA, isolation: 'worktree' })
  )
)

return results.filter(Boolean)
