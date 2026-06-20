export const meta = {
  name: 'kloel-canonicalization-delta-extract',
  description: 'Tool-grounded delta extraction: each agent uses atomic_grep/atomic_ast_search/LSP to measure one capability-family or dissolution-domain and return the exact remaining delta (canonical vs duplicate, migrated vs not, severity).',
  phases: [{ title: 'DeltaExtract', detail: 'one grounded agent per capability family / dissolution domain' }],
}

const DELTA = {
  type: 'object', additionalProperties: false,
  required: ['family', 'canonicalTarget', 'canonicalExists', 'groundedCounts', 'migratedState', 'remainingDelta', 'severity', 'deltaToClose', 'toolsUsed'],
  properties: {
    family: { type: 'string' },
    canonicalTarget: { type: 'string', description: 'the official canonical service/name/event/entity (cite file:line if it exists)' },
    canonicalExists: { type: 'boolean' },
    groundedCounts: { type: 'string', description: 'REAL numbers from atomic_grep/atomic_ast_search/LSP — how many implementations/variants/call-sites found, with sample file:line. NO guessing.' },
    migratedState: { type: 'string', description: 'how much is already on the canonical (grounded), how much is not' },
    remainingDelta: { type: 'string', description: 'the exact remaining work to canonize this family — grounded, specific file:line lists where feasible' },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
    deltaToClose: { type: 'array', items: { type: 'string' }, description: 'concrete ordered steps to fully canonize this family to production' },
    toolsUsed: { type: 'string', description: 'which atomic_*/LSP tools you actually invoked (must be non-trivial — this is tool-grounded extraction)' },
  },
}

const COMMON = `
Repo: /Users/danielpenin/kloel (NestJS backend backend/src, Next.js frontend/src, worker/). This is a TOOL-GROUNDED delta extraction — you MUST use real tools, not memory or hand-waving.

LOAD + USE these MCP tools (via ToolSearch "select:<name>"): mcp__atomic-edit__atomic_grep (ripgrep, structured), mcp__atomic-edit__atomic_ast_search (ast-grep structural), mcp__atomic-edit__atomic_grep_calls (AST call-sites, no string/comment false positives), mcp__atomic-edit__atomic_outline, and LSP (workspaceSymbol/findReferences/documentSymbol). Ground EVERY count in an actual tool result with sample file:line. If a grep result is too large, that large number IS the finding (report it).

Your job: measure the CURRENT canonicalization state of your assigned family and return the EXACT remaining delta (what is NOT yet canonical / migrated / production-ready). Be honest: report what is already done too. Severity P0=prod-divergent-behavior, P1=inconsistency/maintenance risk, P2=architectural entropy, P3=light redundancy.
Return the structured delta packet (read-only — make NO edits).`

phase('DeltaExtract')

const FAMILIES = [
  { label: 'delta:cap-message-dispatch', prompt: `${COMMON}\nFAMILY: Capability "send a channel message". Canonical is ChannelMessageDispatchService.dispatch (backend/src/marketing/channel-message-dispatch.service.ts) + the ChannelDispatchRegistry/adapters. Measure how many ALTERNATIVE senders still exist NOT routed through it: grep/ast for sendMessage/sendText/sendWhatsappMessage/dispatchText/wahaSend/reply/sendChannelMessage method DEFINITIONS across backend/src + worker/, and count call-sites of the legacy ones via atomic_grep_calls. Which surfaces (whatsapp/inbox/campaign/conversation/worker) bypass the canonical dispatch? The remaining delta = the unmigrated senders.` },
  { label: 'delta:cap-phone-tenant-webhook', prompt: `${COMMON}\nFAMILY: Infra capabilities "normalize phone", "resolve tenant/workspace", "parse webhook". For each: find the canonical helper (if any) and count duplicate implementations + call-sites via atomic_grep/atomic_grep_calls. normalizePhone/normalizePhoneNumber/formatPhone; resolveWorkspaceId vs getWorkspaceId vs resolveTenant (note: prior probe found resolveWorkspaceId in 65 files vs getWorkspaceId in 4 — verify + find the 4 + any other variants); parseWebhook/handleWebhook/webhook signature verification. Delta = remaining duplicates to fold into the canonical helper.` },
  { label: 'delta:dissolve-whatsapp-marketing', prompt: `${COMMON}\nFAMILY: Dissolution of backend/src/whatsapp INTO backend/src/marketing (OmniCore). Use atomic_outline + atomic_grep to inventory what STILL lives under backend/src/whatsapp (file count + the services/controllers there), which of those are referenced from outside whatsapp/ (LSP findReferences / atomic_grep_calls on their exports), which are dead (0 external refs → deletable), which are good-and-should-move-to-marketing, and which already moved. Delta = the precise move/delete/merge list for whatsapp→marketing across Email+TikTok+Meta(IG/FB/WA).` },
  { label: 'delta:unify-brain-mind-entities', prompt: `${COMMON}\nFAMILY: Brain→Mind entity unification. Brain entities: KloelSession, KloelMessage, KloelMemory, ChatThread, ChatMessage. Mind: MindMessage, MindMemory, MindBelief, MindPrediction, etc. The message/memory TABLE cutover is done (RAC_MindMessage/RAC_MindMemory with dual-write+read-canonical live). Measure what ENTITY-level duplication remains: grep prisma/schema.prisma for the Kloel* vs Mind* models, count code references to KloelMessage/KloelMemory/KloelSession/ChatThread/ChatMessage (atomic_grep) that still bypass the Mind alias services (MindMessageService/MindMemoryItemService), and whether ChatThread/ChatMessage/KloelSession have a canonical Mind equivalent yet. Delta = remaining entity unification (which Brain entities still lack a Mind canonical + their bypassing call-sites).` },
  { label: 'delta:unify-cognition-modules', prompt: `${COMMON}\nFAMILY: "everything cognitive becomes ONE Kloel Mind". Modules to dissolve: backend/src/kloel/cia, flows, autopilot (+worker/processors/autopilot), copilot, voice, growth(money). Use atomic_outline/atomic_grep to measure each: file count, whether it emits to the mind spine (percept) already (grep for percept-emit / MindOutboxEvent / spine.emit), whether it has its OWN duplicate state/loop vs using Mind beliefs/bandits, and what "dissolve into Mind" concretely requires per module (already-percept-wired vs needs structural merge vs deletable). Delta = per-module the exact remaining unification step. DO NOT recommend deleting product features — distinguish cognition-substrate from product surface.` },
  { label: 'delta:event-taxonomy', prompt: `${COMMON}\nFAMILY: Event taxonomy canonicalization. Canonical form is dotted (channel.message.received, checkout.completed, payment.approved, cognition.*). Use atomic_grep to find ALL event-name string literals emitted/subscribed across backend/src + worker (patterns: eventType:, eventName:, emit(, spine.emit, .on(, EVENT_TYPE consts, snake_case + SCREAMING_CASE + camelCase variants like message_received / WA_MESSAGE_RECEIVED / incomingMessage). Bucket them: canonical-dotted vs legacy-variant. Cross-check against docs/architecture/EVENT_TAXONOMY.md. Delta = the legacy event names still in code that lack a canonical mapping or aren't migrated.` },
  { label: 'delta:entity-vocabulary', prompt: `${COMMON}\nFAMILY: Ubiquitous-language entity naming. Measure the Contact-vs-Lead/Customer/Client/Prospect/User split and the ChannelSession-vs-whatsappSession/waSession/connection/instance/botSession split. Use atomic_grep across backend/src + frontend/src + prisma/schema.prisma to count each term's usage and identify where the SAME real entity wears different names in different layers (frontend vs backend vs prisma vs events). Cross-check docs/architecture/CANONICAL_VOCABULARY.md. Delta = the terms still violating the canonical vocabulary + where.` },
  { label: 'delta:supermemory-graph', prompt: `${COMMON}\nFAMILY: Supermemory per-user memory-graph (item J). The typed graph (MindGraphNode/MindGraphEdge, memory-graph.types.ts, MemoryGraphView.tsx) exists but prod has 0 nodes (the extract→embed→retrieve→inject loop does not run). Use atomic_grep/atomic_outline to inventory: what graph code exists (types, service, frontend view, api), what is WIRED vs scaffolded, whether anything WRITES MindGraphNode/Edge (atomic_grep_calls on the create methods), and what the loop needs to actually populate + retrieve + inject the graph. Delta = the exact remaining wiring to make the memory-graph live.` },
]

const deltas = await parallel(
  FAMILIES.map((f) => () => agent(f.prompt, { label: f.label, phase: 'DeltaExtract', schema: DELTA, agentType: 'Explore' })),
)
return deltas.filter(Boolean)
