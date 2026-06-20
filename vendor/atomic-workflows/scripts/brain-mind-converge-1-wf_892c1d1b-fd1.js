export const meta = {
  name: 'brain-mind-converge-1',
  description: 'Converge direct prisma.kloelMemory/kloelMessage callers onto canonical Mind services (behavior-identical) — Brain→Mind unification batch 1',
  phases: [{ title: 'Converge', detail: '11 parallel atomic-edit convergence agents on disjoint files' }],
}

const SCHEMA = {
  type: 'object',
  required: ['file', 'status', 'behaviorPreserved', 'verification', 'summary'],
  properties: {
    file: { type: 'string' },
    status: { type: 'string', enum: ['converged', 'partial', 'skipped-with-reason', 'blocked'] },
    behaviorPreserved: { type: 'boolean' },
    callSitesConverged: { type: 'integer' },
    verification: { type: 'string' },
    summary: { type: 'string' },
    notes: { type: 'string' },
  },
}

const COMMON = `You are a surgical canonicalization agent inside /Users/danielpenin/kloel (NestJS backend). MISSION: dissolve Brain-family direct DB access into the canonical Kloel Mind service surface — WITHOUT changing behavior one byte.
CANONICAL TARGETS (same physical tables, so byte-identical behavior):
- prisma.kloelMemory.* -> MindMemoryItemService (backend/src/kloel/mind/aliases/mind-memory-item.service.ts): \`.items\` getter returns PrismaService['kloelMemory']; also has findById/findByKey/listByWorkspace/upsert.
- prisma.kloelMessage.* -> MindMessageService (backend/src/kloel/mind/aliases/mind-message.service.ts): \`.items\` getter returns PrismaService['kloelMessage']; also create/findById/listByWorkspace/getHistory/appendToConversation.
REFERENCE PATTERN (copy this exact safety idiom — zero module-wiring risk, behavior-identical): backend/src/kloel/product.controller.ts injects \`@Optional() private readonly mindMemory?: MindMemoryItemService\` and exposes \`private get mindMemoryItems() { return this.mindMemory?.items ?? this.prisma.kloelMemory; }\`, then uses this.mindMemoryItems instead of this.prisma.kloelMemory.
HARD RULES:
- Use the atomic-edit MCP for EVERY source edit (load via ToolSearch: mcp__atomic-edit__atomic_replace_text / atomic_transaction / atomic_native_status). For interdependent edits (add import + add ctor param + add getter + replace usages) that fail atomic's per-edit convergence guard, you MAY use the builtin Edit and then PROVE green yourself with tsc.
- BYTE-IDENTICAL BEHAVIOR. The canonical accessor hits the SAME table — do not change queries, args, ordering, or semantics. Only re-route the access through the canonical surface.
- If the file is a CLASS with constructor DI: inject @Optional() the canonical service + add the \`?? this.prisma.X\` fallback getter, replace usages.
- If the file is a PURE-FUNCTION HELPER that receives prisma as a param (no class to inject into): converging it cleanly requires the CALLER to pass the canonical accessor — if that's out of scope for a single-file edit, set status="skipped-with-reason" and explain precisely WHY + what the caller-side fix would be. Do NOT force an unsafe change.
- Add or extend a focused unit test asserting the canonical surface is used (or behavior unchanged).
- VERIFY: run \`cd backend && npx tsc -p tsconfig.build.json --noEmit 2>&1 | grep <yourfile-basename>\` (must be empty) and run the file's spec via \`npx jest <specpath> --silent\`. Put exact commands+results in verification.
- DO NOT COMMIT. Leave edits in the working tree. Touch ONLY your assigned file (+ its spec).
Return the structured result.`

const FILES = [
  { f: 'backend/src/kloel/unified-agent-actions-workspace.service.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/kloel-reply-engine.service.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/conversational-onboarding-tools.service.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/memory-management.service.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/memory-management.policies.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/memory-stats.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/mind/policy/mind-policy.helpers.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/kloel-reply-engine.cognitive-state.helpers.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/kloel-lead-processor-helpers.ts', tgt: 'kloelMemory' },
  { f: 'backend/src/kloel/kloel-conversation-store.ts', tgt: 'kloelMessage' },
  { f: 'backend/src/kloel/kloel.service.ts', tgt: 'kloelMessage' },
]

phase('Converge')
const results = await parallel(
  FILES.map((x) => () =>
    agent(
      `${COMMON}

ASSIGNED FILE: ${x.f}
TARGET: converge all direct \`prisma.${x.tgt}.*\` (or \`this.prisma.${x.tgt}\`) accesses in THIS file to the canonical ${x.tgt === 'kloelMemory' ? 'MindMemoryItemService' : 'MindMessageService'} surface, byte-identical, per the rules above.`,
      { label: `converge:${x.f.split('/').pop()}`, phase: 'Converge', schema: SCHEMA }
    )
  )
)
return results.filter(Boolean)
