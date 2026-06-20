export const meta = {
  name: 'wave3-close-remaining-Y',
  description: 'Wave 3: 7 file-disjoint agents close the remaining Y (loop-proof, domain-purity, channel-register, omnicore-merge, events, memory, test-proof) on committed checkpoint 6088ab2f4',
  phases: [{ title: 'Wave3', detail: '7 verify-then-complete construction agents, full MCP arsenal, atomic-edit locks, LSP self-verify' }],
}

const ARSENAL = `
YOU MUST USE THE FULL MCP ARSENAL (load schemas via ToolSearch "select:<name>" as needed). What each does — use the relevant ones, do not work blind:
- mcp__codegraph__* : codegraph_search (locate a symbol), codegraph_callers (who calls X = impact), codegraph_callees, codegraph_context (comprehensive task context for a symbol), codegraph_impact (blast radius of a change), codegraph_node, codegraph_status. NOTE: the index is STALE (~2300 commits behind HEAD 6088ab2f4) — use it to ORIENT, then VERIFY every fact against live grep + LSP before acting.
- mcp__lsp-mesh__* : lsp_diagnostics (REAL tsc/eslint errors for a file — THIS is your self-verify, run it on EVERY file you touch), lsp_references (true cross-file references), lsp_definition, lsp_hover (types), lsp_symbols, lsp_code_actions, lsp_rename. Do NOT run a global tsc — other agents edit the tree concurrently and it will thrash; trust per-file lsp_diagnostics.
- mcp__atomic-edit__* : THE DEFAULT, edit ONLY through these. code_outline / code_outline_batch / code_read_symbol (read STRUCTURALLY — never read a whole large file), atomic_edit / atomic_replace_range / atomic_insert_after_anchor / atomic_insert_before_anchor / atomic_edit_symbol / atomic_replace_body / atomic_add_import / atomic_rename_symbol_cross_file (each: sha256 guard + syntax-validate + atomic write), atomic_transaction (multi-edit all-or-nothing). ACQUIRE atomic_lock_acquire on any file before editing it and atomic_lock_release after — this is the anti-collision contract with the other 6 agents.
- mcp__postgres__* : pg_query (read-only SELECT), pg_count, pg_table_describe, pg_tables — verify real schema/columns and (for proofs) that rows persist.
- mcp__cognitive-hub__* : protocol_hub_openapi (NestJS routes), protocol_hub_asyncapi (event channels), protocol_hub_sarif (findings), protocol_hub_sbom (deps), protocol_hub_manifest. Stale — orient only.
- mcp__test-runner__* : run_jest / run_vitest (run YOUR slice's specs to verify), affected_tests, coverage_for_module, run_eslint, run_tsc (per-package, use sparingly — prefer lsp_diagnostics).
- mcp__gitnexus__*, mcp__graphify-plus__*, mcp__sequential-thinking__*, mcp__kaisser__*, mcp__task-graph__* : available; use when they help.

HARD RULES (mission law):
1. NEVER read .md files to make decisions — build understanding ONLY from code + the tools above.
2. Edit ONLY via atomic-edit tools, and atomic_lock_acquire every file you edit.
3. VERIFY-THEN-COMPLETE: Wave 2 partially landed before a power loss. FIRST measure (codegraph + grep + lsp) exactly what already exists in your slice; then complete ONLY the gap. Never redo or revert landed work.
4. Self-verify EVERY touched file via lsp_diagnostics (must be clean) and run your slice's specs via run_jest. Do NOT run global tsc.
5. Preserve the UX shell, workspace isolation, typed Prisma, idempotency. NO fake data, NO no-op-to-satisfy-tsc, NO faked success, NO secrets in output, NEVER git restore.
6. Stay STRICTLY inside your OWNED files. For any HUB file you do NOT own (kloel.module.ts, domain-service-resolver.service.ts unless you own them, kloel-tool-dispatcher.service.ts, prisma/schema.prisma): do NOT edit — return the EXACT patch text in hub_patches_for_leader and the leader applies it.
7. A wrong NestJS DI wiring CRASHES prod boot and tsc will NOT catch it — before registering/injecting anything, confirm every dependency is resolvable; if not, report a blocker instead of guessing.
Base: committed checkpoint 6088ab2f4, branch chore/canonicalization-helpers-mega-pr-2026-05-28, repo /Users/danielpenin/whatsapp_saas. Backend/worker/frontend tsc are all GREEN right now — keep them green.
Return ONLY the structured receipt.
`

const RECEIPT = {
  type: 'object',
  additionalProperties: false,
  required: ['slice', 'status', 'landed_before', 'changes', 'self_verify', 'blockers', 'hub_patches_for_leader'],
  properties: {
    slice: { type: 'string' },
    status: { type: 'string', enum: ['complete', 'partial', 'blocked'] },
    landed_before: { type: 'string', description: 'What Wave 2 already did in this slice, as measured by tools.' },
    changes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'what'], properties: { file: { type: 'string' }, what: { type: 'string' } } } },
    hub_patches_for_leader: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'patch'], properties: { file: { type: 'string' }, patch: { type: 'string' } } } },
    self_verify: { type: 'string', description: 'lsp_diagnostics + run_jest results for touched files.' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

const AGENTS = [
  {
    key: 'w3-loop',
    slice: `SLICE: Close + PROVE the cognitive learning loop fires on the AUTOMATIC chat reply path (not HTTP-only).
OWN (edit only): backend/src/kloel/kloel-reply-engine.service.ts + its buildAssistantReply* helper files, backend/src/kloel/degraded-path.helper.ts, backend/src/kloel/mind/inference/mind-predictor.service.ts, backend/src/kloel/mind/policy/mind-surprise*.ts, backend/src/kloel/mind/policy/mind-policy.service.ts + mind-policy.helpers.ts.
DO NOT touch: kloel.module.ts, domain-service-resolver.service.ts, kloel-tool-dispatcher*, decision-outcome.service.ts (bandit already wired there), any services-v2/*, prisma/schema.prisma.
VERIFY FIRST: Wave 2 already injected MindPredictorService into reply-engine (~line 121) and threaded it into the reply builder (~line 442); predictReply(×2)/predictConversion(×1)/resolveBinary(×4)/resolveOutcome(×2)/recordObservation(×1) already have call-sites. Use codegraph_callers + lsp_references + grep to map EXACTLY where each fires and whether it is on the live streaming path (GuestChatService.chat / KloelService.think -> reply-engine) or a dead/HTTP-only path.
COMPLETE: make the full chain execute automatically per assistant reply: perceive -> MindPredictor.predictReply (a MindPrediction row is persisted) -> action(reply) -> outcome resolution -> MindSurprise.resolveBinary -> MindPolicy.resolveOutcome -> belief update so MindBelief alpha/beta MOVE off 1/1 -> recordObservation(mindGlobalPrior) + bandit.recordOutcome. The predictor/surprise/policy deps are @Optional — if any is injected-but-not-actually-called on the live path, wire the call so it is real, not silently degraded. Leave the path so a black-box integration test (w3-testproof writes it) can drive ONE reply and observe MindPrediction +1, MindBelief alpha-or-beta +1, mindGlobalPrior samples +1.`,
  },
  {
    key: 'w3-purity',
    slice: `SLICE: Convert the 4 remaining prisma-direct tool executors to delegate to typed domain services (so validation/events/audit/tenant-isolation are not bypassed).
OWN (edit only): backend/src/kloel/kloel-tool-executor-billing.service.ts, kloel-tool-executor-crm.service.ts, kloel-tool-executor-whatsapp.service.ts, backend/src/kloel/unified-agent-tool-executor.ts.
DO NOT touch: kloel-tool-dispatcher.service.ts (HUB — return a patch), kloel.module.ts, domain-service-resolver.service.ts, reply-engine, services-v2, schema.prisma.
VERIFY FIRST: grep this.prisma / this.prismaAny in each owned file; codegraph_context to find the matching domain service (CheckoutService/BillingService, CrmService, WhatsappService/ChannelMessageDispatchService). Wave 1 already inverted dispatch (resolver primary, prisma-direct fallback) and added a CURATED_DIRECT_TOOLS human-approval guard.
COMPLETE: replace each raw Prisma call with a call to the existing typed domain service (inject it via constructor — confirm it is provided in kloel.module first, else report a blocker; do NOT edit the module yourself). Keep the tool contract + return shape + workspace isolation + the approval guard identical. If a needed domain method is missing, add it to the domain service ONLY if that service file is not owned by another agent; otherwise return a hub_patch.`,
  },
  {
    key: 'w3-channel-register',
    slice: `SLICE: Register the dep-gated capability services (services-v2 channel.service, agent-job.service, and search/messaging if present) into DI so their capabilities stop returning unknown_service. YOU OWN THE HUB FILES THIS WAVE.
OWN (edit only): backend/src/kloel/kloel.module.ts, backend/src/kloel/domain-service-resolver.service.ts, and the constructors of backend/src/kloel/services-v2/{channel,agent-job,search,messaging}.service.ts (if they exist).
DO NOT touch: reply-engine, executors, channel registries (w3-omnicore owns), telemetry/event files, schema.prisma, mind/* .
VERIFY FIRST: Wave 1 deferred channel/messaging/search because their deps (ChannelMessageDispatchService, PlanLimitsService) were not resolvable in kloel.module. Measure with grep + lsp_references + codegraph_context: which services-v2 files exist now, what each constructor injects, whether MarketingChannelsModule is already imported in kloel.module, and whether PlanLimitsService is provided/exported by an imported module.
COMPLETE: import the module(s) that PROVIDE the missing deps into kloel.module imports[]; register the services into providers[] + SERVICE_TOKEN_MAP (and add their capability ids to the right tier partition if missing). CRITICAL: confirm EVERY injected dep is resolvable (provided by kloel.module or an imported module) BEFORE registering — a wrong wiring crashes prod boot and tsc will not catch it. If a dep is still unresolvable, do NOT register that one; report it as a blocker.`,
  },
  {
    key: 'w3-omnicore',
    slice: `SLICE: Collapse the two parallel channel send-registries into ONE canonical registry and unify ChannelKind (OmniCore: WhatsApp dissolved into omnichannel).
OWN (edit only): the ChannelDispatchRegistry + ChannelTransportRegistry source files, backend/src/kloel/channel/types.ts, and the channel-dispatch port/types files.
DO NOT touch: kloel.module.ts, domain-service-resolver.service.ts, reply-engine, services-v2, executors, schema.prisma.
VERIFY FIRST: codegraph_search ChannelDispatchRegistry / ChannelTransportRegistry; codegraph_callers + lsp_references for both; find the competing ChannelKind definitions. Wave 1 already added TikTok to ChannelKind + adapter + sendMessage->ChannelDispatchPort — measure what is already unified vs duplicated.
COMPLETE: pick the canonical registry (the one wired to rate-limit / idempotency / audit / MindGuard), migrate the other's registrations + callers onto it, and converge to ONE ChannelKind enum (keep a type alias for the old union so imports do not break). Preserve every channel's send behavior. If a caller lives in a hub file, return a hub_patch instead of editing it.`,
  },
  {
    key: 'w3-events',
    slice: `SLICE: Canonicalize the remaining non-canonical events (legacy 2-segment + wrong-domain) with DUAL-EMIT aliases so no consumer/queue WHERE-filter breaks.
OWN (edit only): backend/src/kloel/commercial-decision-orchestrator/telemetry.ts, backend/src/kloel/event-taxonomy.canonical-aliases.ts, and the specific emit lines at known sites (e.g. payment.service.ts sale.created) — edit ONLY the emit calls, not surrounding logic.
DO NOT touch: reply-engine, module, resolver, registries, services-v2, mind/*, schema.prisma.
VERIFY FIRST: protocol_hub_asyncapi for the canonical channel names; grep emit sites for 2-segment names (e.g. product.updated, message.received), wrong-domain names (e.g. checkout.session.completed emitted from a payment webhook), and snake_case in MindOutboxEvent. Wave 1 added 19 aliases + dual-emit — measure which legacy/wrong emits REMAIN.
COMPLETE: route each remaining legacy/wrong emit through the canonical alias with DUAL-EMIT (emit canonical AND keep the legacy alias so existing consumers keep working), widening a consumer WHERE-filter only if required and safe. Self-verify + run event-taxonomy specs.`,
  },
  {
    key: 'w3-memory',
    slice: `SLICE: Finish the Brain->Mind memory migration — remaining direct prisma.kloelMemory / prisma.kloelMessage callers -> MindMemoryItemService / MindMessageService aliases.
OWN (edit only): files that still call prisma.kloelMemory / prisma.kloelMessage directly, EXCLUDING files owned by w3-loop (kloel-reply-engine, mind-predictor, mind-surprise, mind-policy*, degraded-path) and EXCLUDING the alias service files themselves.
DO NOT touch: prisma/schema.prisma (migration is owner-gated), kloel.module, resolver, the alias services' internals, services-v2.
VERIFY FIRST: grep prisma.kloelMemory / prisma.kloelMessage across backend/src (Wave 1+2 migrated ~140; measure the EXACT remaining set). For each, codegraph_context to confirm the alias method exists and matches the call shape.
COMPLETE: replace each direct call with the alias service call (inject MindMemoryItemService / MindMessageService — confirm provided in kloel.module, else blocker). Behavior identical. If a remaining caller is inside a w3-loop-owned file, list it as a handoff in the receipt — do NOT edit it.`,
  },
  {
    key: 'w3-testproof',
    slice: `SLICE: Write the LIVENESS PROOF — a real integration test that drives one chat reply end-to-end and asserts the cognitive loop PERSISTS rows; plus raise the lowest coverage floors. This is what proves Y is closing, not merely compiling.
OWN (create only): NEW *.spec.ts files. Do NOT edit any source file — other agents own them; if a source change is needed for testability, return it as a hub_patch.
VERIFY FIRST: pg_table_describe / pg_count on MindPrediction, MindBelief, MindBanditArm, MindGlobalPrior, DecisionOutcome to learn columns; codegraph_context on GuestChatService.chat / KloelService.think and the reply path w3-loop is finishing; read EXISTING chat specs (their code, not .md) to mirror the harness. The current smoke MOCKS the SSE — your test must exercise the REAL reply path with a faithful prisma test double (or in-memory) that records writes.
COMPLETE: a spec that (a) drives one assistant reply through the determinism router + reply path, (b) asserts a MindPrediction row is created, (c) asserts MindBelief alpha OR beta increments off 1/1 after outcome resolution, (d) asserts a bandit arm upsert + a mindGlobalPrior observation. Add targeted specs to raise the lowest floors (checkout-payment, inbox). Self-verify by RUNNING your new specs via run_jest — they MUST pass. If a spec reveals a real wiring gap, that is a FINDING: report it precisely as a blocker (so the leader / w3-loop fixes it) — never weaken the assertion to force a green.`,
  },
]

phase('Wave3')
log(`Wave 3: dispatching ${AGENTS.length} file-disjoint agents on the remaining Y (base 6088ab2f4)`) 

const results = await parallel(
  AGENTS.map((a) => () =>
    agent(`${ARSENAL}\n\n=== YOUR SLICE: ${a.key} ===\n${a.slice}`, {
      label: a.key,
      phase: 'Wave3',
      schema: RECEIPT,
    })
  )
)

return results.filter(Boolean)
