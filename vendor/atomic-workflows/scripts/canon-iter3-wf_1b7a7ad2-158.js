export const meta = {
  name: 'canon-iter3',
  description: 'Canonicalization iteration 3: chatMessage convergence (create alias + converge 9) + flag-gated dispatch collapse (OmniCore)',
  phases: [{ title: 'Execute', detail: '2 executors: chatMessage alias+converge, dispatch collapse flag-gated' }],
}

const SCHEMA = {
  type: 'object',
  required: ['task', 'status', 'filesChanged', 'behaviorPreserved', 'verification', 'summary'],
  properties: {
    task: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    behaviorPreserved: { type: 'boolean' },
    verification: { type: 'string' },
    summary: { type: 'string' },
    notes: { type: 'string' },
  },
}

phase('Execute')
const results = await parallel([
  // 1. chatMessage convergence — create alias + wire module + converge 9 callers + extend the gate
  () => agent(
    `Canonicalize the ChatMessage family into the Kloel Mind surface in /Users/danielpenin/kloel, BYTE-IDENTICAL (ChatMessage stays RAC_ChatMessage — a different physical table from RAC_KloelMessage; do NOT merge tables).
Design already confirmed (do this):
STEP 1 — Create backend/src/kloel/mind/aliases/mind-chat-message.service.ts mirroring mind-message.service.ts EXACTLY: \`@Injectable() export class MindChatMessageService { constructor(private readonly prisma: PrismaService){} get items(): PrismaService['chatMessage'] { return this.prisma.chatMessage; } }\` + \`export type MindChatMessage = ChatMessage\` (from @prisma/client). Header doc: same RAC_ChatMessage table, no migration, distinct from RAC_KloelMessage. Use atomic_create_file.
STEP 2 — Wire into DI: add MindChatMessageService to providers + exports of backend/src/kloel/mind/mind.module.ts (mirror how MindMessageService is registered; grep for it).
STEP 3 — Converge the 9 backend files with direct \`prisma.chatMessage\` / \`this.prisma.chatMessage\` access (grep to find them, exclude spec/test + the alias service). For each CLASS-with-DI caller, inject \`@Optional() private readonly mindChatMessage?: MindChatMessageService\` + getter \`private get chatMessageItems() { return this.mindChatMessage?.items ?? this.prisma.chatMessage; }\` and replace usages. Leave transactional \`tx.chatMessage\` on the tx client. If a caller is a pure-fn helper (prisma as param), status="partial" and note it for caller-side fix. BYTE-IDENTICAL.
STEP 4 — Extend the anti-regression gate scripts/ops/check-canonical-mind-access.mjs to ALSO forbid new direct prisma.chatMessage access outside the grandfathered set (add chatMessage to its patterns + grandfather mind-chat-message.service.ts + the \`?? this.prisma.chatMessage\` fallback idiom + tx.chatMessage). Ensure \`npm run check:canonical-mind\` STILL exits 0 after your convergence.
Use atomic-edit MCP for edits (builtin Edit fallback for interdependent import+ctor+getter+usage, then prove green with tsc). Add a contract test for the new alias. VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep -E "chat-message|<converged files>"\` empty; run touched specs; \`npm run check:canonical-mind\` exit 0. DO NOT COMMIT. Return schema. task="chatmessage-converge".`,
    { label: 'exec:chatmessage', phase: 'Execute', schema: SCHEMA }
  ),
  // 2. dispatch collapse — flag-gated, behavior-identical when OFF
  () => agent(
    `Implement the OmniCore dispatch-registry collapse in /Users/danielpenin/kloel — FLAG-GATED so it is behavior-identical when OFF (census P1-1). Design confirmed (do this carefully):
GOAL: make ChannelTransportRegistry.send() (backend/src/kloel/channel-transport.registry.ts:87, ~16 production callers, CONTRACT-A result {success,messageId?,error?,blocked:REQUIRED,blockedReason?}) KEEP its MindGuards + isConfigured + capability/audit shell, but DELEGATE the actual provider call to the canonical ChannelMessageDispatchService.sendMessage(ChannelSendInput) (backend/src/marketing/channel-message-dispatch.service.ts:116, CONTRACT-B result with blocked OPTIONAL + extra fields), behind a flag \`KLOEL_TRANSPORT_CANONICAL_DELEGATE\` (read via \`process.env.KLOEL_TRANSPORT_CANONICAL_DELEGATE === 'true'\`, DEFAULT OFF).
RULES:
- When the flag is OFF: EXACT current behavior (byte-identical) — the existing provider-call path runs unchanged.
- When ON: after MindGuards pass, build the ChannelSendInput discriminated union (use the existing builders in backend/src/marketing/channel-message-dispatch.helpers.ts:90-242), call ChannelMessageDispatchService.sendMessage, then MAP CONTRACT-B → CONTRACT-A (set blocked=false on success, preserve messageId/error; map blocked/blockedReason through). Inject ChannelMessageDispatchService via @Optional() + forwardRef if needed to avoid a DI cycle; if it can't be injected without a cycle, set status="blocked" and report the exact cycle.
- Email channel: only delegate if the canonical path supports it; otherwise keep email on the current path even when flag ON (note it).
- Add a flag.ts file if matching the repo's flag idiom (e.g. kloel-copilot-loop.flag.ts pattern).
- Add tests for BOTH flag states (OFF = current provider called; ON = delegates to canonical + result mapped). Add a boot-smoke assertion that the module resolves (no DI cycle).
Use atomic-edit MCP (builtin Edit fallback). VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep -E "channel-transport"\` empty; run channel-transport specs. DO NOT COMMIT. Return schema. task="dispatch-collapse". behaviorPreserved MUST be true (flag default OFF).`,
    { label: 'exec:dispatch', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
