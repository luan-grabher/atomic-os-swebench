export const meta = {
  name: 'canon-iter6',
  description: 'Canonicalization iter 6: register cognition.* percept events in taxonomy + converge the 5 deferred pure-fn helpers caller-side',
  phases: [{ title: 'Execute', detail: '3 executors: taxonomy, memory-helpers, chatmessage-helpers' }],
}
const SCHEMA = {
  type: 'object',
  required: ['task', 'status', 'filesChanged', 'behaviorPreserved', 'verification', 'summary'],
  properties: {
    task: { type: 'string' }, status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } }, behaviorPreserved: { type: 'boolean' },
    verification: { type: 'string' }, summary: { type: 'string' }, notes: { type: 'string' },
  },
}
phase('Execute')
const results = await parallel([
  // 1. Event taxonomy registration of the cognition.* percepts
  () => agent(
    `Register the canonical cognition percept events in the Kloel event taxonomy in /Users/danielpenin/kloel — make the taxonomy COMPLETE so the doctrine "every event has one official name" holds for the new percepts.
The percept emitters now emit these (verify by grep): cognition.flow.node_completed (Flows), cognition.cia.decision_made, cognition.cia.action_executed (CIA), cognition.autopilot.* (Autopilot worker), cognition.voice.clone_created, cognition.voice.action_executed (Voice), plus whatever Copilot emits.
DO:
1. Find the event taxonomy alias map / catalog (grep mind-event-taxonomy.ts in backend/src/kloel/mind, and docs/architecture/EVENT_TAXONOMY.md). Register ALL the cognition.* percept event types there as canonical entries (additive — do NOT change the ingestor's poll-string behavior; these are durable telemetry like the Flows precedent). 
2. Update docs/architecture/EVENT_TAXONOMY.md to list the cognition.* percept family under the canonical events.
3. If there is an event-name anti-regression gate or registry, add them so they are not flagged as rogue.
Additive only, zero behavior change. Use atomic-edit MCP for code (builtin Edit / Write for docs). VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep -iE "taxonomy"\` empty; run any taxonomy spec; \`npm run check:canonical-mind\` exit 0. DO NOT COMMIT. Return schema. task="event-taxonomy".`,
    { label: 'exec:taxonomy', phase: 'Execute', schema: SCHEMA }
  ),
  // 2. Memory pure-fn helpers caller-side convergence
  () => agent(
    `Complete the DEFERRED Brain→Mind memory convergence for 2 pure-fn helpers in /Users/danielpenin/kloel, caller-side, BYTE-IDENTICAL.
Files (grandfathered in scripts/ops/check-canonical-mind-access.mjs): backend/src/kloel/memory-management.policies.ts and backend/src/kloel/mind/policy/mind-policy.helpers.ts — both use prisma.kloelMemory passed in as a param (no DI ctor).
FOR EACH: find the caller(s) that invoke the helper (grep). The caller is typically an already-converged service that has \`this.mindMemoryItems\` (= mindMemory?.items ?? prisma.kloelMemory). Change the caller to pass the canonical accessor (this.mindMemoryItems) into the helper's param object instead of raw prisma.kloelMemory, and update the helper's param TYPE + internal usage to use that delegate. BYTE-IDENTICAL (same table). If a helper is called from MANY places or a place that has no canonical accessor, converge what is safe and leave the rest (status="partial", note them). After converging, REMOVE the now-converged helper from the gate's grandfathered set and confirm \`npm run check:canonical-mind\` stays exit 0.
Use atomic-edit MCP (builtin Edit fallback). Run touched specs. VERIFY tsc clean for touched files + gate exit 0. DO NOT COMMIT. Return schema. task="memory-helpers".`,
    { label: 'exec:memory-helpers', phase: 'Execute', schema: SCHEMA }
  ),
  // 3. chatMessage pure-fn helpers caller-side convergence
  () => agent(
    `Complete the DEFERRED ChatMessage convergence for 3 pure-fn helpers in /Users/danielpenin/kloel, caller-side, BYTE-IDENTICAL.
Files (grandfathered in scripts/ops/check-canonical-mind-access.mjs): backend/src/gdpr/gdpr-processing.helpers.ts (ctx.prisma.chatMessage), backend/src/kloel/kloel-thread.controller-helpers.ts (deps.prisma.chatMessage), backend/src/kloel/kloel-thinker.helpers.ts (prisma.chatMessage).
FOR EACH: find the caller(s) (grep). If the caller is an already-converged service with \`this.chatMessageItems\` (= mindChatMessage?.items ?? prisma.chatMessage), thread that canonical accessor through the helper's ctx/deps/prisma param and swap the receiver inside the helper. BYTE-IDENTICAL (same RAC_ChatMessage table). If threading is too invasive (helper uses MANY prisma models, or caller lacks a canonical accessor), converge what is safe and leave the rest as status="partial" with notes — do NOT force an unsafe/sprawling change. After converging any, REMOVE it from the gate's grandfathered set and confirm \`npm run check:canonical-mind\` exit 0.
Use atomic-edit MCP (builtin Edit fallback). Run touched specs. VERIFY tsc clean for touched files + gate exit 0. DO NOT COMMIT. Return schema. task="chatmessage-helpers".`,
    { label: 'exec:chatmessage-helpers', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
