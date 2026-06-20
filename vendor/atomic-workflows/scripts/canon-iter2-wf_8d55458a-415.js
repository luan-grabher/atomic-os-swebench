export const meta = {
  name: 'canon-iter2',
  description: 'Canonicalization iteration 2: anti-regression gate + GlobalPrior convergence + chatMessage/dispatch collapse design',
  phases: [{ title: 'Iterate', detail: '2 executors (gate, globalprior) + 2 designers (chatMessage, dispatch)' }],
}

const EXEC_SCHEMA = {
  type: 'object',
  required: ['task', 'status', 'filesChanged', 'verification', 'summary'],
  properties: {
    task: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    behaviorPreserved: { type: 'boolean' },
    verification: { type: 'string' },
    summary: { type: 'string' },
  },
}
const DESIGN_SCHEMA = {
  type: 'object',
  required: ['task', 'verdict', 'plan', 'risk'],
  properties: {
    task: { type: 'string' },
    verdict: { type: 'string' },
    canonicalTarget: { type: 'string' },
    plan: { type: 'string', description: 'concrete ordered steps with file:line' },
    risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    behaviorChange: { type: 'boolean' },
  },
}

phase('Iterate')
const results = await parallel([
  // 1. EXECUTOR — anti-regression gate (FASE 7)
  () => agent(
    `Author an ANTI-REGRESSION GATE that locks in the Brain→Mind memory/message canonicalization, in /Users/danielpenin/kloel.
Create scripts/ops/check-canonical-mind-access.mjs that FAILS (exit 1) if any backend/src/**/*.ts file (excluding *.spec.ts/*.test.ts) introduces a direct \`prisma.kloelMemory\` / \`this.prisma.kloelMemory\` / \`prisma.kloelMessage\` access OUTSIDE the grandfathered legitimate set:
  - the canonical alias services themselves: backend/src/kloel/mind/aliases/mind-memory-item.service.ts, mind-message.service.ts
  - the @Optional fallback getter idiom: any line containing \`?? this.prisma.kloelMemory\` or \`?? this.prisma.kloelMessage\` (the documented safe fallback)
  - transactional access: \`tx.kloelMemory\` / \`tx.kloelMessage\` inside a $transaction callback (match \`\\btx\\.kloelM\`)
  - the deferred file backend/src/kloel/conversational-onboarding-tools.service.ts (uses prismaExt, on the deferred list)
CRITICAL: the gate MUST PASS (exit 0) on the CURRENT HEAD — grandfather all currently-existing legitimate uses; only forbid NEW non-canonical access. Run it, iterate the allowlist until green, and SHOW the passing run. Mirror the style/structure of an existing scripts/ops/check-*.mjs (e.g. check-unsafe-casts.mjs — it already scans changed files; you may scan changed files vs origin/main the same way OR scan all backend files, whichever makes it pass clean now). Register it in package.json scripts as "check:canonical-mind" and add it to the check:all aggregate. Use the atomic-edit MCP (load via ToolSearch) for package.json edits; atomic_create_file for the new script. Verify: \`npm run check:canonical-mind\` exits 0. Return EXEC schema. task="anti-regression-gate".`,
    { label: 'exec:gate', phase: 'Iterate', schema: EXEC_SCHEMA }
  ),
  // 2. EXECUTOR — KloelGlobalPrior → MindGlobalPrior convergence
  () => agent(
    `Converge Brain-family KloelGlobalPrior direct callers onto the canonical MindGlobalPrior surface in /Users/danielpenin/kloel, byte-identical.
First grep to find: the canonical service (backend/src/kloel/mind/memory/mind-global-prior.service.ts per the census) and its accessor, and all direct \`prisma.kloelGlobalPrior\` / \`this.prisma.kloelGlobalPrior\` callers in backend/src (exclude spec/test + the canonical service itself). If KloelGlobalPrior and MindGlobalPrior are the SAME physical table (check @@map in backend/prisma/schema.prisma — if both map to the same table or the canonical service's accessor returns PrismaService['kloelGlobalPrior']), converge each caller via the same @Optional-inject + \`?? this.prisma.kloelGlobalPrior\` fallback idiom used in product.controller.ts, byte-identical. If they are DIFFERENT physical tables, DO NOT converge (would change tables) — set status="blocked" and explain.
Use atomic-edit MCP for edits (fall back to builtin Edit for interdependent import+ctor+getter+usage edits, then prove green with tsc). Add/extend a focused test. Verify: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep <files>\` empty + run touched specs. DO NOT COMMIT. Touch only the converged files + their specs. Return EXEC schema. task="globalprior-converge".`,
    { label: 'exec:globalprior', phase: 'Iterate', schema: EXEC_SCHEMA }
  ),
  // 3. DESIGNER — chatMessage convergence design
  () => agent(
    `READ-ONLY design task (do NOT edit). In /Users/danielpenin/kloel, there are 9 backend files with direct \`prisma.chatMessage\` access. ChatMessage maps to RAC_ChatMessage (a DIFFERENT physical table from kloelMessage/RAC_KloelMessage). Determine the CANONICAL plan for the ChatMessage family under the "everything → one Kloel Mind" doctrine:
1. Is there an existing canonical service/accessor for ChatMessage (grep mind/aliases, mind-canonical.service)? 
2. Should the 9 chatMessage callers converge onto a canonical surface? If a ChatMessage canonical alias does not exist, the safe canonical move is to CREATE a MindChatMessageService alias (like MindMessageService but .items = chatMessage) and route callers through it — byte-identical (same RAC_ChatMessage table). Confirm chatMessage and kloelMessage are genuinely different tables and must NOT be merged at the DB layer.
3. Output the concrete ordered plan (create alias service + which 9 files to converge + the @Optional idiom) with file:line, and the risk.
Return DESIGN schema. task="chatmessage-design".`,
    { label: 'design:chatmessage', phase: 'Iterate', schema: DESIGN_SCHEMA }
  ),
  // 4. DESIGNER — dispatch registry collapse (OmniCore)
  () => agent(
    `READ-ONLY design task (do NOT edit). In /Users/danielpenin/kloel, two outbound-dispatch registries coexist and violate the "ONE canonical dispatcher" invariant (census P1-1): the kloel ChannelTransportRegistry (backend/src/kloel/channel-transport.registry.ts, ~16 production callers carrying real traffic, runs MindGuards policy) and the marketing ChannelDispatchRegistry / ChannelMessageDispatchService (backend/src/marketing/, doc-declared canonical, ~5 callers). Design the SAFE collapse into OmniCore:
1. Map both registries' send() signatures, the ChannelSendResult contract, and their underlying provider adapters (WhatsApp/Instagram/Email).
2. Propose making ChannelTransportRegistry.send() run its MindGuards policy then DELEGATE to ChannelDispatchRegistry.send() (transport becomes a guard-wrapper over the canonical port) — preserving the ChannelSendResult contract for all ~16 callers, behavior-identical, ideally flag-gated for safe rollout.
3. Identify the exact byte-level seams (file:line) where delegation wires in, the result-mapping needed, and any forwardRef/DI-cycle risk.
4. Output the concrete ordered migration plan + risk + whether it changes behavior.
Return DESIGN schema. task="dispatch-collapse-design".`,
    { label: 'design:dispatch', phase: 'Iterate', schema: DESIGN_SCHEMA }
  ),
])
return results.filter(Boolean)
