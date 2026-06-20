export const meta = {
  name: 'wave4-close-Y-loop-and-purity',
  description: 'Wave 4: 4 file-disjoint agents — close loop on guest-chat (predictChatReply), CRM purity (CrmService), memory free-fn helpers, events red-spec fixes',
  phases: [{ title: 'Wave4', detail: '4 verify-then-complete agents, full MCP arsenal, atomic-edit locks, LSP self-verify' }],
}

const ARSENAL = `
USE THE FULL MCP ARSENAL (load schemas via ToolSearch "select:<name>"). What each does:
- mcp__codegraph__* : codegraph_search/callers/callees/context/impact — ORIENT (index is STALE ~2300 commits behind HEAD dc0447f56), then VERIFY against live grep + LSP.
- mcp__lsp-mesh__* : lsp_diagnostics (REAL per-file tsc/eslint — your self-verify, run on EVERY touched file), lsp_references/definition/hover/symbols. NO global tsc (concurrent agents thrash it).
- mcp__atomic-edit__* : THE DEFAULT, edit ONLY through these. code_outline/code_read_symbol (read structurally), atomic_edit/atomic_insert_*/atomic_edit_symbol/atomic_add_import, atomic_transaction; atomic_lock_acquire before editing a file + atomic_lock_release after (anti-collision contract with the other agents).
- mcp__postgres__* : pg_query/pg_count/pg_table_describe — verify schema + (for proofs) rows persist.
- mcp__cognitive-hub__* : protocol_hub_openapi/asyncapi/sarif/sbom — stale, orient only.
- mcp__test-runner__* : run_jest/run_vitest (run YOUR slice's specs), coverage_for_module, run_eslint.
HARD RULES: (1) NEVER read .md for decisions — code + tools only. (2) Edit ONLY via atomic-edit + lock every file. (3) VERIFY-THEN-COMPLETE: measure landed state first, complete only the gap. (4) Self-verify every touched file via lsp_diagnostics + run your slice's specs; NO global tsc. (5) Preserve UX shell, workspace isolation, typed Prisma; NO fake data / no-op-to-pass / faked success / secrets; NEVER git restore. (6) Stay STRICTLY inside OWNED files; for a HUB file you do not own, return the exact patch in hub_patches_for_leader. (7) A wrong NestJS DI wiring CRASHES prod boot and tsc will NOT catch it — confirm every dependency is resolvable before injecting; if not, report a blocker.
Base: committed checkpoint dc0447f56, branch chore/canonicalization-helpers-mega-pr-2026-05-28, repo /Users/danielpenin/whatsapp_saas. backend/worker/frontend tsc all GREEN — keep them green. Return ONLY the structured receipt.
`

const RECEIPT = {
  type: 'object', additionalProperties: false,
  required: ['slice', 'status', 'landed_before', 'changes', 'self_verify', 'blockers', 'hub_patches_for_leader'],
  properties: {
    slice: { type: 'string' },
    status: { type: 'string', enum: ['complete', 'partial', 'blocked'] },
    landed_before: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'what'], properties: { file: { type: 'string' }, what: { type: 'string' } } } },
    hub_patches_for_leader: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'patch'], properties: { file: { type: 'string' }, patch: { type: 'string' } } } },
    self_verify: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

const AGENTS = [
  {
    key: 'w4-guestchat-loop',
    slice: `SLICE (CROWN JEWEL): close the cognitive loop on the LIVE guest SSE chat surface. w3-testproof FINDING: GuestChatService (chat() SSE + chatSync) records the decision (recordChatReplyDecision) and closes the outcome/belief (applyChatTerminalHooks -> closeChatReplyOutcome + observeRepliedToUserBelief), but NEVER calls predictChatReply -> so the guest surface produces 0 RAC_MindPrediction rows and the prediction->surprise link never fires there. The producer predictChatReply lives in backend/src/kloel/kloel-reply-engine.decision-outcome.helpers.ts:125 and is wired into kloel-reply-engine.service.ts but NOT guest-chat.
OWN (edit only): backend/src/kloel/guest-chat.service.ts + backend/src/kloel/guest-chat.*.helper.ts (terminal-hooks + any guest-chat decision/reply helpers).
DO NOT touch: kloel-reply-engine.* (w3 done), kloel.module.ts, domain-service-resolver, mind/* service internals, schema.prisma.
VERIFY FIRST: code_read_symbol GuestChatService constructor (line ~74) — is MindPredictorService injectable? It IS a provider in kloel.module (and @Optional in reply-engine), and GuestChatService is declared in kloel.module, so it is DI-resolvable — confirm. Map where recordChatReplyDecision fires (lines ~273,418) and where the terminal hooks fire (applyChatTerminalHooks) so you place predictChatReply at the RIGHT point (right after the decision is recorded, before/at reply emission), and ensure the SAME prediction is later resolved by the existing surprise path (resolveChatReplySurprise / applyChatTerminalHooks) — i.e. don't create an unresolved prediction.
COMPLETE: inject @Optional() MindPredictorService into GuestChatService (zero boot risk — already a provider) and call predictChatReply on the guest reply path so a RAC_MindPrediction row is created per assistant reply AND gets resolved by the terminal/surprise hook (closing predict->surprise->belief on the guest surface). Keep the SSE contract + terminal-event guarantees intact. Self-verify via lsp_diagnostics + run guest-chat specs (run_jest) + the cognitive-loop-liveness.proof.spec.ts.`,
  },
  {
    key: 'w4-crm-purity',
    slice: `SLICE: finish CRM tool-executor domain-purity. w3-purity BLOCKED because CrmModule was not imported in kloel.module so CrmService was not DI-resolvable.
OWN (edit only): backend/src/kloel/kloel.module.ts, backend/src/kloel/kloel-tool-executor-crm.service.ts (+ its spec).
DO NOT touch: other executors, reply-engine, resolver, guest-chat, mind/*, schema.prisma.
VERIFY FIRST: crm.module.ts imports [PrismaModule, ConfigModule, forwardRef(BillingModule)] and exports CrmService — it does NOT import KloelModule (no hard cycle; confirmed). Measure (code_read_symbol) the CRM executor's raw this.prisma callsites (listLeads/getLeadDetails/dashboardSummary/listFlows/saveBusinessInfo/setBusinessHours + the contact.count in toolCreateCampaign) and the matching CrmService method signatures + return shapes.
COMPLETE: add \`import { CrmModule } from '../crm/crm.module';\` and \`forwardRef(() => CrmModule),\` to kloel.module imports[] (forwardRef for cycle safety, mirroring CampaignsModule). Inject \`private readonly crm: CrmService\` into KloelToolExecutorCrmService and delegate each raw-prisma read to the typed CrmService method — but ONLY where the CrmService method's return shape can preserve the tool contract byte-identically (verify each with code_read_symbol; if a shape differs, leave that callsite raw and note it, do NOT distort the contract). Confirm DI resolvable before injecting. Self-verify via lsp_diagnostics + run the crm-executor spec.`,
  },
  {
    key: 'w4-memory-helpers',
    slice: `SLICE: finish the Brain->Mind memory migration tail. w3-memory left (a) 16 free-FUNCTION helper callsites that take prisma/deps.prisma as a PARAMETER (no DI seam), and (b) one message caller state-builder.service.ts:204 (prisma.kloelMessage.findMany) that MindMessageService cannot serve because it lacks a generic delegate.
OWN (edit only): backend/src/kloel/mind/aliases/mind-message.service.ts (add an \`items\` getter, mirroring MindMemoryItemService), backend/src/kloel/state-builder.service.ts, and the free-fn helper files: kloel-chat-tools.agent-jobs.helpers.ts, kloel-chat-tools.workspace.helpers.ts, kloel-lead-processor-helpers.ts, kloel-tool-executor.helpers.ts, kloel.service.lists.helpers.ts, memory-stats.ts, product-memory-sync.helpers.ts, unified-agent-actions-sales.service.helpers.ts, account-agent.gap-detector.ts, account-agent.input-session.ts, account-agent.product-materializer.ts.
DO NOT touch: w4-guestchat files (guest-chat*), w4-crm files (kloel.module, crm executor), reply-engine, mind-policy/predictor/surprise, schema.prisma, MindMemoryItemService internals.
VERIFY FIRST: MindMessageService (mind/aliases/mind-message.service.ts) currently exposes typed methods (findUnique/findMany/create/getHistory) but NO \`.items\` delegate getter. The \`.items\` getter should return \`this.prisma.kloelMessage\` (same delegate) so callers can do byte-identical \`.findMany(...)\`. For each free-fn helper, the cleanest seam is to thread the alias delegate through the helper's deps/params from its OWNING service (which already injects MindMemoryItemService or can) and pass \`this.mindMemory?.items ?? prisma.kloelMemory\`; only do this where the owning service is in your OWNED set or already injects the alias — otherwise leave it and report.
COMPLETE: add the \`.items\` getter to MindMessageService; migrate state-builder.service.ts:204 to it; migrate the free-fn helper callsites where a clean seam exists (byte-identical behavior). Where threading would cascade into a non-owned service's constructor, leave the callsite and list it as a blocker. Self-verify via lsp_diagnostics + run affected specs.`,
  },
  {
    key: 'w4-events-redspecs',
    slice: `SLICE: fix the 2 pre-existing-RED specs (red at base) + the snake_case event canonicalization prerequisites. w3-events identified exact patches.
OWN (edit only): backend/src/admin/pipeline/admin-pipeline.service.spec.ts, backend/src/kloel/mind/coordination/mind-event-taxonomy.spec.ts, backend/src/kloel/mind/coordination/mind-event-taxonomy.ts, backend/src/kloel/mind/observability/mind-observability.service.ts, backend/src/kloel/commercial-decision-orchestrator/telemetry.ts.
DO NOT touch: guest-chat, kloel.module, crm executor, reply-engine, mind-message alias, schema.prisma.
VERIFY FIRST (run_jest to see the actual current failures, do NOT trust line numbers blindly): admin-pipeline.service.spec.ts asserts legacy 'pipeline.*' names but admin-pipeline.service.ts already emits canonical 'cognition.pipeline.*'. mind-event-taxonomy.spec.ts asserts the old 4-entry MIND_EVENT_ALIASES but it grew to 19 (K58-K85) and sale.created now maps to commerce.sale.created. telemetry.ts still persists snake_case 'case_memory.consulted' + 'predecided_actions.built' with no canonical registered.
COMPLETE: (1) fix admin-pipeline.service.spec assertions to the canonical cognition.pipeline.* names the service emits. (2) fix mind-event-taxonomy.spec assertions to the current 19-entry aliases + sale.created->commerce.sale.created (expandEventNameAliases now returns both). (3) add canonicals to BRAIN_EVENT_TAXONOMY + MIND_EVENT_ALIASES for the two snake_case events ('cognition.case_memory.consulted', 'cognition.predecided.actions_built'), widen the mind-observability WHERE-filters to expandEventNameAliases for those actions, THEN flip telemetry.ts's two recordCommercial eventTypes to the canonical names. Keep legacy keys in BRAIN_EVENT_TAXONOMY during cutover so historical rows still typecheck. Self-verify: lsp_diagnostics + run_jest on admin-pipeline.service.spec, mind-event-taxonomy.spec, commercial-decision-orchestrator.service.spec, and any mind-observability spec — ALL must be green.`,
  },
]

phase('Wave4')
log(`Wave 4: dispatching ${AGENTS.length} file-disjoint agents (base dc0447f56)`) 

const results = await parallel(
  AGENTS.map((a) => () =>
    agent(`${ARSENAL}\n\n=== YOUR SLICE: ${a.key} ===\n${a.slice}`, {
      label: a.key, phase: 'Wave4', schema: RECEIPT,
    })
  )
)
return results.filter(Boolean)
