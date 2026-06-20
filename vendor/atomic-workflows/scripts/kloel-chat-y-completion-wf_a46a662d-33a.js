export const meta = {
  name: 'kloel-chat-Y-completion',
  description: 'Drive the Kloel chat engine ("Y") to total completeness via 16 file-disjoint parallel subagents, each MCP-driven, atomic-only mutations',
  phases: [{ title: 'Build-Y' }, { title: 'Integrate' }],
}

const REPO = '/Users/danielpenin/whatsapp_saas'

// ─────────────────────────────────────────────────────────────────────────────
// MCP TOOLBELT — every agent is told exactly what each MCP does and when to use it.
// ─────────────────────────────────────────────────────────────────────────────
const MCP_TOOLBELT = `
MCP TOOLBELT — you have ALL of these. Load any tool's schema with ToolSearch ("select:<tool_name>" or keywords) BEFORE calling it. Use the ones relevant to your slice; be aware of all.

== MUTATE (the ONLY way you may change files) ==
- atomic-edit (mcp__atomic-edit__*): the MANDATORY mutation engine — every byte you write goes through it (sha256 before/after + syntax validation + trace + rollback). Key ops:
  • code_outline / code_outline_batch — token-cheap structural map of a file (symbols + line ranges). READ THIS before editing so you address symbols by name, not guessed lines.
  • code_read_symbol — full source + exact span of one symbol (e.g. "Class.method"); chain into an edit.
  • atomic_edit {op: replace_text|replace_range|replace_literal|insert_at|edit_symbol|add_import|...} — guarded edits.
  • atomic_insert_after_anchor / atomic_replace_body / atomic_create_file — anchored insert / body swap / new file.
  • atomic_transaction — multi-file edit as ONE all-or-nothing transaction (validates all in-memory before writing).
  • atomic_lock_acquire / atomic_lock_status / atomic_lock_release — TAKE A LOCK on each file you own before editing (anti-collision with sibling agents).
  • truth_receipt — grade your claims honestly (code/unit_test=PARTIAL, runtime/browser=REAL).
  NEVER use the built-in Edit/Write/NotebookEdit or shell heredoc for mutations — atomic-edit only.

== PERCEIVE (read / map the code) ==
- codegraph (mcp__codegraph__*): codegraph_search / codegraph_callers / codegraph_callees / codegraph_impact / codegraph_context / codegraph_node — "who calls X", "what does Y touch", blast radius. Use BEFORE editing to know the impact of a change.
- gitnexus (mcp__gitnexus__*): query / impact / route_map (Next.js routes) / api_impact / rename / shape_check / cypher — second code graph + route map.
- lsp-mesh (mcp__lsp-mesh__*): lsp_definition / lsp_references / lsp_hover / lsp_diagnostics / lsp_symbols / lsp_rename — REAL language-server truth (types, refs, errors) across the monorepo. Use lsp_diagnostics to confirm a file is error-clean after your edit.
- cognitive-hub (mcp__cognitive-hub__*): protocol_hub_openapi (NestJS routes), protocol_hub_asyncapi (event channels), protocol_hub_sarif (findings), protocol_hub_sbom (deps), protocol_hub_manifest, protocol_hub_status.
- graphify-plus (mcp__graphify-plus__*): affected_specs (which tests cover a file), blast_radius, stub_route_inventory, runtime_errors, metadata_for_file.

== VERIFY (prove it works — REQUIRED before you claim done) ==
- test-runner (mcp__test-runner__*): run_jest / run_vitest / run_tsc / run_eslint / affected_tests / coverage_for_module / test_summary. ALWAYS run the specs for the files you changed and a scoped tsc. Capture real pass/fail output as evidence.
- pulse (mcp__pulse__*): pulse_scan / pulse_scan_module / pulse_health_by_module / pulse_report / pulse_top_gates — production-readiness scan (hardcode, dead handlers, stubs). Run on your module; fix what it flags in YOUR files.
- codacy (mcp__codacy__*): codacy_cli_analyze (run on edited files), codacy_get_file_issues — MAX-RIGOR lock; fix real code, never add ignore comments.
- codecov (mcp__codecov__*): coverage deltas.

== RUNTIME (prove against reality where possible) ==
- postgres (mcp__postgres__*): pg_query (READ-ONLY) / pg_tables / pg_table_describe / pg_count / pg_recent — inspect real workspace/agent/message rows to confirm tool executors return real data.
- chrome-devtools (mcp__chrome-devtools__*) + claude-in-chrome (mcp__claude-in-chrome__*): navigate / take_screenshot / list_console_messages / list_network_requests / evaluate_script — browser E2E + visual proof + SSE/console capture.
- railway (mcp__railway__* / mcp__plugin_railway_railway__*): get_logs / deployment_logs / service_metrics / list_variables — runtime logs (read). Do NOT deploy.
- sentry / sentry-bridge (mcp__sentry*__*): recent_issues / errors_since_commit — runtime errors.
- saas-compiler (mcp__saas-compiler__*): twin_up / twin_shadow / verify_in_prod — shadow/twin verification.

== DOCS / COORDINATION ==
- context7 (mcp__context7__*): resolve-library-id + query-docs — current docs for DeepSeek API, OpenAI SDK, NestJS, Next.js, react-markdown, vitest. Use to confirm API param names (e.g. DeepSeek reasoning_content / thinking / tools semantics) BEFORE relying on them.
- task-graph (mcp__task-graph__*): task_lock_acquire / task_lock_release — cross-agent work locks if needed.
- kaisser (mcp__kaisser__*): audit_log / doctor / backlog — SDLC.
- github (mcp__github__*): read PRs/issues if needed.
`

// ─────────────────────────────────────────────────────────────────────────────
// LAWS — non-negotiable for every agent (mirrors CLAUDE.md + the atomic firewall).
// ─────────────────────────────────────────────────────────────────────────────
const LAWS = `
PROJECT LAWS (violating any = your work is rejected):
1. MUTATION FIREWALL: every file change goes through the atomic-edit MCP ONLY. Never Edit/Write/NotebookEdit/heredoc. Each write is sha+syntax-validated with a trace.
2. FILE OWNERSHIP: edit ONLY the files in your OWNED FILES list. atomic_lock_acquire each before editing. If your slice needs a change in a file you do NOT own, DO NOT touch it — report it under crossSliceDeps and design around it. New test files you create are yours.
3. PROTECTED FILES — NEVER edit: CLAUDE.md, AGENTS.md, docs/design/KLOEL_*.md, ops/*.json, scripts/ops/check-*.mjs, scripts/ops/lib/*.mjs, .husky/pre-push, .github/workflows/ci-cd.yml, backend/eslint.config.mjs, frontend/eslint.config.mjs, worker/eslint.config.mjs, backend/src/lib/ai-models.ts, scripts/pulse/no-hardcoded-reality-audit.ts.
4. NEVER: git restore, --no-verify, prisma db push, weaken lint/Codacy/coverage, add biome-ignore/eslint-disable/@ts-ignore/@ts-expect-error/NOSONAR/noqa, print secrets, deploy to prod, run destructive DB ops.
5. PRESERVE THE SHELL: do not remove screens/routes/flows/copy. Convert fake→real or honest-state. Money/ledger/payout are append-only.
6. EVIDENCE REQUIRED: before claiming done, run the relevant specs (test-runner MCP run_jest/run_vitest) AND a scoped tsc (run_tsc or lsp_diagnostics) on your files. Capture real output. No "deve funcionar". If a thing is code-only/untested-in-runtime, say so (truth = PARTIAL).
7. DeepSeek constraint: this repo strips reasoning_content (3 places) to avoid the multi-turn 400; NEVER re-introduce reasoning_content into a follow-up request, and NEVER enable DeepSeek thinking on a tool-bearing call (it makes DeepSeek emit tool calls as raw <｜｜DSML｜｜...> text — the original bug).
8. Stay laser-scoped to YOUR slice. Smallest change that achieves total completeness for your slice. Add tests for new behavior. Run pulse_scan_module + codacy on your files and fix real issues you introduced.
`

const Y_CONTEXT = `
"Y" = the Kloel in-app chat agent at TOTAL completeness: functional, professional, robust, anti-error, anti-failure, runtime-proven, universal. The chat runs on DeepSeek (OpenAI-compatible) via the streaming THINKER path. A prior pass already fixed the core tool-call TEXT leak (DeepSeek thinking forced OFF when tools present), bound 14 read-only code tools, added reasoning streaming + a frontend sanitizer, and a motor null-deref guard — all type-clean, 177 tests green, model=deepseek-v4-pro everywhere. THOSE CHANGES ARE ALREADY IN THE WORKING TREE — build ON TOP of them, do not undo them.
The LIVE chat path is backend/src/kloel/kloel-thinker-think.helpers.ts (runToolPlanningBranch) → kloel-stream-writer.ts. NOT kloel-reply-engine.helpers.ts (that serves PDF/onboarding only).
`

const REPORT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    sliceId: { type: 'string' },
    status: { type: 'string', enum: ['complete', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    whatWasDone: { type: 'string' },
    testsRun: { type: 'string', description: 'exact commands + pass/fail counts' },
    typecheckClean: { type: 'boolean' },
    pulseOrCodacy: { type: 'string' },
    evidence: { type: 'string' },
    crossSliceDeps: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    truthGrade: { type: 'string', enum: ['REAL', 'PARTIAL', 'BLOCKED'] },
  },
  required: ['sliceId', 'status', 'filesChanged', 'whatWasDone', 'testsRun', 'truthGrade'],
}

// ─────────────────────────────────────────────────────────────────────────────
// THE 16 FILE-DISJOINT SLICES OF Y.
// ─────────────────────────────────────────────────────────────────────────────
const SLICES = [
  {
    id: 'S1-loop',
    owns: 'backend/src/kloel/kloel-thinker-think.helpers.ts; backend/src/kloel/kloel-reply-engine.build-messages.helpers.ts; + any NEW kloel-thinker-loop*.spec.ts you create',
    mission: `Make tool use MULTI-STEP. Today runToolPlanningBranch runs exactly ONE tool round then a final tools-less synthesis — it cannot chain search_codebase→read_source_file→code_outline. Convert it into a bounded agentic loop: while (msg.tool_calls?.length && iter < MAX) { execute via replyEngine.toolRouter.executeAssistantToolCalls; ensureTokenBudget per iter; re-bind tools+tool_choice:'auto'+thinking:disabled on each tool-bearing follow-up; the FINAL turn uses tool_choice:'none' so it ALWAYS terminates with prose }. MAX = Number(process.env.KLOEL_MAX_TOOL_ITERATIONS ?? 4). Extend buildChatModelMessagesPayload to append accumulated assistant→tool turns in order (each tool message's tool_call_id matches an id in the preceding assistant message). Standardize tool-bearing turns to model 'brain'. Keep onTraceEvent + the MUTATION_SENSITIVE confirmation gate + audit receipts intact. Use codegraph_callers on runToolPlanningBranch + lsp_references to confirm callers. Add a dedicated spec mocking chatCompletionWithFallback to return tool_calls on iters 1-2 then content: assert exactly 2 tool rounds, final tool_choice:'none', halts at MAX, ensureTokenBudget per iter.`,
    mcp: 'codegraph (callers/impact of runToolPlanningBranch), lsp-mesh (diagnostics/references), atomic-edit (replace_body/edit_symbol), test-runner (run_jest the new spec + run_tsc), context7 (DeepSeek tools/multi-turn semantics).',
  },
  {
    id: 'S2-thinker-service',
    owns: 'backend/src/kloel/kloel-thinker.service.ts; backend/src/kloel/kloel-thinker.substrate.helpers.ts; their existing *.spec.ts',
    mission: `Harden the thinker service. Fix the 3 pre-existing exactOptionalPropertyTypes tsc errors in kloel-thinker.service.ts (lines ~193/244/308 — add | undefined to the target optional props or stop passing undefined). Make isAiProviderConfigured honest for the chat path (no real Anthropic chat adapter exists — ANTHROPIC alone must NOT report "configured" for chat). Audit every abort/timeout/error branch so the user gets an honest event, never a silent stall. Add KLOEL_STREAM heartbeat/abort coverage. Run the existing kloel-thinker.service*.spec + substrate spec; add cases for the honest-gate + each error branch.`,
    mcp: 'lsp-mesh (lsp_diagnostics to see the exact exactOptional errors), atomic-edit, test-runner (run_jest kloel-thinker + run_tsc scoped), pulse (pulse_scan_module kloel).',
  },
  {
    id: 'S3-reply-engine',
    owns: 'backend/src/kloel/kloel-reply-engine.service.ts; backend/src/kloel/kloel-reply-engine.helpers.ts; backend/src/kloel/kloel-reply-engine.degraded-path.helper.ts; their existing *.spec.ts',
    mission: `Complete the reply-engine resilience + fix its 5 pre-existing exactOptionalPropertyTypes tsc errors (lines ~253/258/312/393/412). Ensure the degraded path emits honest state, decision-outcome is recorded on every branch, and the sync path (buildAssistantReplyImpl — PDF/onboarding) ALSO benefits from the multi-step capability where safe (coordinate via crossSliceDeps with S1 — do NOT edit think.helpers). Make the chat client timeout/retries (already env-tunable) documented + covered by a test. Run the existing reply-engine specs; add cases for the fixed type paths + degraded path.`,
    mcp: 'lsp-mesh (diagnostics), codegraph (impact), atomic-edit, test-runner (run_jest kloel-reply-engine + run_tsc).',
  },
  {
    id: 'S4-provider-pool',
    owns: 'backend/src/lib/llm-provider.ts; backend/src/lib/llm-provider.spec.ts; backend/src/lib/openai-models.ts',
    mission: `Make provider failover REAL. createTextLlmClientPool + chatCompletionWithProviderFallback exist but have ZERO callers and 2 pre-existing tsc errors (lines ~206/213: 'client' possibly undefined — guard pool[i]). Fix the type errors. Then wire the pool so a SECONDARY configured key (deepseek→generic→openai) actually fails over on AuthenticationError/APIConnectionError. Keep deepseek-v4-pro as the model for all text roles. Add spec coverage proving: empty pool throws ProviderPoolExhaustedError, first provider auth-fails → second succeeds, fallbackModel used on last provider. Confirm with context7 the correct DeepSeek base_url + that model ids route (flag if deepseek-v4-pro is a proxy alias).`,
    mcp: 'context7 (DeepSeek/OpenAI SDK docs), atomic-edit, test-runner (run_jest llm-provider + run_tsc), lsp-mesh (diagnostics).',
  },
  {
    id: 'S5-wrapper',
    owns: 'backend/src/kloel/openai-wrapper.ts; backend/src/kloel/openai-wrapper.spec.ts',
    mission: `Harden the request normalizer + retry wrapper to the matrix limit. The thinking-vs-tools guard is in place; now exhaustively cover: deepseek+tools→thinking off+no reasoning_effort; deepseek+caller-disabled→off; deepseek+no-tools→on; non-deepseek→max_completion_tokens path; clamp ceilings; LLMInputTooLargeError; reasoning_content stripped from inbound messages; retryable vs non-retryable error classification; fallback model path. Make every branch tested. Do NOT change behavior the live path depends on (thinking off with tools) — only complete coverage + edge hardening.`,
    mcp: 'atomic-edit, test-runner (run_jest openai-wrapper + run_tsc), context7 (DeepSeek thinking/reasoning_effort param names — confirm they are valid DeepSeek params, flag if Anthropic-style).',
  },
  {
    id: 'S6-streaming',
    owns: 'backend/src/kloel/kloel-stream-writer.ts; backend/src/kloel/kloel-stream-events.ts; + NEW kloel-stream-writer*.spec.ts',
    mission: `Make the streaming layer bulletproof. The reasoning event + capture are in place; now: ensure reasoning is NEVER added to fullResponse/persisted (regression test feeding a reasoning-only delta then content deltas → fullResponse has ONLY content). Harden abort/client-disconnect/heartbeat/terminal-event-once. Confirm createKloelReasoningEvent contract. Do NOT change the streamModelResponse SIGNATURE (S1 calls it). Confirm via context7 the exact DeepSeek streaming delta field is reasoning_content. Add a spec for the SSE serialization + the reasoning-not-in-answer invariant.`,
    mcp: 'context7 (DeepSeek streaming chunk shape), atomic-edit, test-runner (run_jest + run_tsc), codegraph (callers of streamModelResponse — keep signature stable).',
  },
  {
    id: 'S7-code-executors',
    owns: 'backend/src/kloel/kloel-tool-dispatcher.code.handlers.ts; its existing *.spec.ts',
    mission: `Prove the 14 bound read-only code tools actually return REAL data, workspace-gated, error-honest: read_source_file, list_source_dir, search_codebase, code_outline, read_prisma_schema, git_log, git_diff, git_status, build_status, code_lint, code_detect_issues, pulse_health, runtime_errors. For each: verify the executor exists, returns structured real output (not [] or a stub), handles missing-file/perms gracefully with an honest error (NOT a throw that becomes "motor unavailable"), and respects workspace isolation where applicable. Use pg_query to confirm any DB-backed ones return real rows. Add/extend specs asserting each tool returns a real shape + honest error on bad input. Flag any tool whose executor is a stub as a blocker.`,
    mcp: 'postgres (pg_query/pg_table_describe for DB-backed tools), atomic-edit, test-runner (run_jest the dispatcher spec + run_tsc), pulse (pulse_scan_module), codegraph (find each executor impl).',
  },
  {
    id: 'S8-advertised-bound',
    owns: 'backend/src/kloel/kloel-thinker.abi.helpers.ts; backend/src/kloel/kloel-chat-tools.definition.ts; backend/src/kloel/kloel-code-tools.definition.ts; + NEW advertised-vs-bound.spec.ts',
    mission: `Close the advertised-vs-bound gap SAFELY. The ABI advertises OPERATOR_CAPABILITIES (search_code/read_source_file/safe_query/list_capabilities_detail/inspect_self/inspect_runtime) but the chat binds KLOEL_SAFE_READ_TOOLS. Establish the INVARIANT: every capability advertised to the chat model maps to a really-bound, executor-backed tool. OPERATOR_CAPABILITIES is SHARED (mind-capability-executor + the ABI no-overclaim validator that FAILs on 0-runtime-evidence) — do NOT mutate mind-capabilities.const.ts. Prefer: at the chat ABI advertisement site, advertise the intersection of OPERATOR_CAPABILITIES with the bound tool names (or map canonical→real: search_code→search_codebase, list_capabilities_detail→self_list_capabilities). If that risks ABI validation, ship the subtractive half (drop orphan advertisements) and document. Write the equivalence guard spec: advertised(chat) ⊆ boundToolNames. Verify ABI still validates (abi.helpers.spec passes).`,
    mcp: 'codegraph (OPERATOR_CAPABILITIES consumers), lsp-mesh (references), atomic-edit, test-runner (run_jest abi + the new guard spec + run_tsc), context7 if needed.',
  },
  {
    id: 'S9-router-fallback',
    owns: 'backend/src/kloel/kloel-tool-router.ts; + NEW kloel-tool-router*.spec.ts you create',
    mission: `Add a DEFENSE-IN-DEPTH text-tool-call fallback parser. Even with thinking off, if any model EVER emits tool calls as text in message.content (DSML/<invoke name=...><parameter name=...>), executeAssistantToolCalls should detect them, parse into structured {name,args}, and route through the SAME dispatch (unifiedAgentService.executeTool → executeLocalTool) — so a leak becomes a real action instead of garbage. Keep it OPT-IN/last-resort: only parse when message.tool_calls is empty AND content matches the exact leak markers. Preserve the MUTATION_SENSITIVE confirmation gate + receipts. Do NOT change executeAssistantToolCalls' return shape (S1/S6 depend on it). Add a spec: a content-leak payload → parsed → dispatched; normal content → untouched.`,
    mcp: 'codegraph (callers of executeAssistantToolCalls — keep contract), atomic-edit, test-runner (run_jest the new router spec + run_tsc).',
  },
  {
    id: 'S10-fe-sanitizer',
    owns: 'frontend/src/lib/kloel-sanitize-reply.ts; frontend/src/components/kloel/KloelMarkdown.tsx; frontend/src/lib/__tests__/kloel-sanitize-reply.test.ts',
    mission: `Make the display safety-net exhaustive. Extend sanitizeAssistantReply to cover ALL leak shapes (｜｜DSML｜｜ open+close, <invoke>/<parameter>/<tool_calls>/<function_calls>/<tool_call>, antml: namespace, partial/truncated fragments) WITHOUT harming legitimate fenced code that merely mentions those words. Confirm it is applied at every chat render surface (KloelMarkdown is the chokepoint — verify FloatingChat/home bubble/dashboard all route through it; if any renders content raw, report as crossSliceDep to S12). Expand the vitest suite with adversarial cases. Keep it pure + dependency-free.`,
    mcp: 'gitnexus/codegraph (find all renderers of assistant content), atomic-edit, test-runner (run_vitest the sanitize test), chrome-devtools (optional: render a leaked payload and screenshot to confirm clean).',
  },
  {
    id: 'S11-fe-parser',
    owns: 'frontend/src/lib/kloel-stream-events.ts; frontend/src/lib/kloel-message-ui.ts; their existing __tests__',
    mission: `Bulletproof the frontend stream parser + reasoning trace. Reasoning is parsed (tryAppendReasoning) + accumulated into one thinking trace entry + excluded from answer content. Now: cover edge cases (interleaved reasoning/content/tool events, empty/whitespace reasoning, 16-cap interaction, reasoning after tool_result). Ensure adding the reasoning union member broke no exhaustive consumer (verify with lsp_diagnostics across consumers). Expand the existing vitest suites. Do NOT change the KloelStreamEvent field names S6 emits.`,
    mcp: 'lsp-mesh (diagnostics across consumers), atomic-edit, test-runner (run_vitest kloel-stream-events + kloel-message-ui + kloel-reasoning-trace).',
  },
  {
    id: 'S12-fe-consumer',
    owns: 'frontend/src/components/kloel/chat-container.message-sender.ts; frontend/src/components/kloel/chat-container.event-handler.ts; frontend/src/components/kloel/chat-container.agent-stream.ts; frontend/src/lib/kloel-conversations.ts; frontend/src/components/kloel/home/useKloelChat.ts; frontend/src/components/kloel/home/useKloelSendMessage.ts',
    mission: `Make the chat CONSUMER robust + honest in every state. Ensure loading/empty/error/streaming/reasoning states are all explicit (no silent no-op like the historical isReplyInFlight stuck-forever bug — keep/verify the watchdog). Ensure the 'reasoning' event flows from parseKloelStreamPayload → onEvent → trace card (it must NOT go to onChunk). Ensure a stream error / motor-unavailable shows an honest UI message, never a blank. Verify the send→SSE→render path end-to-end in code. Do NOT edit kloel-message-ui.ts or kloel-stream-events.ts (S11 owns them) — coordinate via crossSliceDeps. Add/extend tests for the state machine.`,
    mcp: 'gitnexus route_map, codegraph, atomic-edit, test-runner (run_vitest the chat-container/conversations tests), chrome-devtools (optional E2E of a send).',
  },
  {
    id: 'S13-fe-trace-ui',
    owns: 'frontend/src/components/kloel/AssistantResponseChrome.tsx; frontend/src/components/kloel/chat-container.agent-trace.tsx; frontend/src/components/kloel/chat-container.message-list.tsx',
    mission: `Render the live reasoning in the trace card, professionally, preserving the Terminator design (void black, Ember accent, Sora/JetBrains Mono, no emojis, no gradients). The backend streams reasoning into a 'thinking'-phase accumulated trace entry; surface it in the AssistantProcessingTraceCard, gated behind a collapsed "Expandir/raciocínio" disclosure (do NOT auto-expose full chain-of-thought). Distinguish reasoning (thinking) from tool_calling/tool_result visually. If you cannot run the browser, at minimum confirm the component reads processingTrace entries with phase 'thinking' and renders label text. Do NOT edit kloel-message-ui.ts (S11 owns it). Use chrome-devtools to navigate + screenshot the rendered trace if a local frontend is runnable; attach the screenshot path as evidence.`,
    mcp: 'chrome-devtools / claude-in-chrome (navigate + take_screenshot + console), atomic-edit, gitnexus (find component usages).',
  },
  {
    id: 'S14-integration-tests',
    owns: 'ONLY new *.spec.ts files you create under backend/src/kloel/ (e.g. kloel-chat-e2e-path.spec.ts). You may READ any file but EDIT only your new test files.',
    mission: `Author backend INTEGRATION tests for the whole chat path with a mocked DeepSeek client. Cover: (a) model returns structured tool_calls → tools execute via the router → final synthesis, NO leak; (b) model (legacy) emits a tool call as TEXT → router fallback (S9) recovers it (if S9 lands) OR sanitizer/empty handling; (c) reasoning_content deltas stream as reasoning events and never appear in the answer; (d) multi-step loop chains 2 tool rounds (if S1 lands); (e) missing-LLM-client → honest AI_KEY_MISSING, never a crash. Use real KloelToolRouter with a stubbed UnifiedAgentService.executeTool. Run them. Report which scenarios pass and which are blocked on a sibling slice.`,
    mcp: 'codegraph/gitnexus (understand the wiring), atomic-edit (create_file the specs), test-runner (run_jest your specs), graphify-plus affected_specs.',
  },
  {
    id: 'S15-runtime-probe',
    owns: 'READ-ONLY. Do NOT edit any source. You may create a throwaway probe script under /tmp only.',
    mission: `PROVE the chat at runtime as far as locally possible. Try to boot the backend (and frontend) locally; if env/secrets block it, say so honestly (EXTERNAL_BLOCKED) — do NOT fabricate. If runnable: hit the chat SSE endpoint with a real/mocked DeepSeek, capture the actual event stream, and verify with evidence: no <｜｜DSML｜｜...> text in content, tool_call+tool_result events appear, reasoning events stream, terminal 'done' fires. Use postgres pg_recent to confirm any persisted chat/audit rows. Use railway get_logs (READ) for prod signal if available. Use chrome-devtools to load the chat UI and screenshot a real turn if a local frontend is up. Return a runtime evidence report with truthGrade REAL only for what you actually observed.`,
    mcp: 'railway (get_logs read), postgres (pg_recent/pg_query), chrome-devtools (navigate/screenshot/network), sentry (recent_issues), test-runner.',
  },
  {
    id: 'S16-gate-audit',
    owns: 'READ-ONLY. Do NOT edit source. Report findings for owners to fix.',
    mission: `Run the full quality-gate sweep over the Kloel chat surface and produce a precise punch-list mapped to the owning slice (S1..S13). Run: pulse_scan_module on kloel, codacy_cli_analyze on the changed files, run_eslint + run_tsc scoped to backend/src/kloel + frontend/src/lib + frontend/src/components/kloel, graphify-plus stub_route_inventory + runtime_errors, cognitive-hub protocol_hub_sarif. List every HIGH finding with file:line and which slice owns the fix. Do NOT add ignore comments. This is the anti-failure completeness check: anything you flag that no slice fixed is a gap.`,
    mcp: 'pulse, codacy, test-runner (run_eslint/run_tsc), graphify-plus, cognitive-hub (sarif), lsp-mesh (diagnostics).',
  },
]

function buildPrompt(s) {
  return `${Y_CONTEXT}\n${LAWS}\n${MCP_TOOLBELT}\n\n=== YOUR SLICE: ${s.id} ===\nOWNED FILES (edit ONLY these; lock each with atomic_lock_acquire): ${s.owns}\n\nMISSION: ${s.mission}\n\nPRIMARY MCPs FOR YOU: ${s.mcp}\n\nDELIVERY: do the smallest changes that bring YOUR slice to total completeness for Y. Use atomic-edit for every mutation. Run your tests + a scoped tsc/lsp_diagnostics and capture REAL output. Then return the structured report (status, filesChanged, whatWasDone, testsRun with real counts, typecheckClean, pulseOrCodacy, evidence, crossSliceDeps, blockers, truthGrade). Be brutally honest: code-only/untested-in-runtime = PARTIAL; observed-in-running-product = REAL; can't-do-without-owner = BLOCKED.\nWorking dir: ${REPO}`
}

phase('Build-Y')
log(`Dispatching ${SLICES.length} file-disjoint Y-completion subagents (atomic-only, MCP-driven)`) 

const reports = await parallel(
  SLICES.map((s) => () => agent(buildPrompt(s), { label: s.id, phase: 'Build-Y', schema: REPORT_SCHEMA })),
)

const valid = reports.filter(Boolean)
log(`${valid.length}/${SLICES.length} slices reported back`)

phase('Integrate')
const SYNTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    completed: { type: 'array', items: { type: 'string' } },
    partial: { type: 'array', items: { type: 'string' } },
    blocked: { type: 'array', items: { type: 'string' } },
    crossSliceConflicts: { type: 'array', items: { type: 'string' } },
    integrationActionsForLead: { type: 'array', items: { type: 'string' } },
    ownerGatedItems: { type: 'array', items: { type: 'string' } },
    overallYCompletenessPct: { type: 'number' },
    summary: { type: 'string' },
  },
  required: ['completed', 'partial', 'blocked', 'integrationActionsForLead', 'summary'],
}

const synthesis = await agent(
  `You are the Y integration lead. Below are ${valid.length} structured slice reports as JSON. Produce: which slices are complete/partial/blocked; any cross-slice conflicts or unmet crossSliceDeps; the exact integration actions the human lead must run (full backend tsc, full kloel jest, frontend vitest, resolve any same-contract mismatch between S1/S6/S9/S11); owner-gated items (prod deploy/secrets); and an honest overall Y-completeness %. Do NOT edit code — this is analysis only.\n\nREPORTS:\n${JSON.stringify(valid, null, 2)}`,
  { label: 'Y-integration', phase: 'Integrate', schema: SYNTH_SCHEMA },
)

return { synthesis, slicesReported: valid.length, totalSlices: SLICES.length }
