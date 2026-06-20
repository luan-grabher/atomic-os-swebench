export const meta = {
  name: 'canon-iter4',
  description: 'Canonicalization iter 4: finish onboarding-tools convergence + wire CIA & Autopilot to emit Mind percepts (cognition unification)',
  phases: [{ title: 'Execute', detail: '3 executors: onboarding-converge, cia-percept, autopilot-percept' }],
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
  // 1. Finish the deferred conversational-onboarding-tools convergence (cleanly, no cast bridge)
  () => agent(
    `Complete the DEFERRED Brain→Mind convergence of backend/src/kloel/conversational-onboarding-tools.service.ts in /Users/danielpenin/kloel, BYTE-IDENTICAL and WITHOUT any \`as unknown as\` cast bridge (which violates check:ai-constitution).
Current blocker: the file uses a bespoke loose \`PrismaWithDynamicModels\` interface (line ~20, kloelMemory methods take Record<string,unknown>) for dynamic models, and converging the kloelMemory access to the canonical MindMemoryItemService.items (real PrismaService['kloelMemory'] type) requires an unsafe bridge AND surfaces a masked type error at ~L114 (an \`unknown\` value passed to a JsonNull|InputJsonValue field).
DO THIS:
1. Change the getter to: \`private get mindMemoryItems(): PrismaService['kloelMemory'] { return this.mindMemory?.items ?? this.prisma.kloelMemory; }\` (the file already has \`private readonly prisma: PrismaService\` and \`@Optional() mindMemory?: MindMemoryItemService\` in the ctor). NO cast.
2. Fix the now-surfaced strict-type errors at the kloelMemory call sites (the upsert/findUnique/findMany/deleteMany) — type the \`value\`/data fields properly (e.g. cast the specific value to \`Prisma.InputJsonValue\` with a SINGLE safe cast if it is genuinely a JSON payload, or narrow it) so the real delegate typechecks. Keep \`prismaExt\` ONLY for the genuinely-dynamic flow/product models, not kloelMemory.
3. Leave flow/product on prismaExt (different tables, out of scope).
Use atomic-edit MCP (builtin Edit fallback for interdependent edits, prove green with tsc). Add/restore the canonical-surface test. VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep conversational-onboarding\` empty; \`npm run check:ai-constitution\` exit 0 (no bridge); \`npm run check:canonical-mind\` exit 0 (then REMOVE conversational-onboarding-tools.service.ts from the gate's grandfathered/deferred list since it is now converged, and confirm still exit 0); run the spec. DO NOT COMMIT. Return schema. task="onboarding-converge".`,
    { label: 'exec:onboarding', phase: 'Execute', schema: SCHEMA }
  ),
  // 2. CIA → emit Mind percepts (cognition unification)
  () => agent(
    `Wire the CIA autonomous-agent subsystem to emit cognition percepts into the Kloel Mind spine in /Users/danielpenin/kloel — ADDITIVE, flag-gated (default OFF), so all cognition flows into ONE Mind. Replicate the EXISTING Flows percept pattern.
First STUDY the reference: grep for backend/src/flows/flows-percept-emit.flag.ts and how Flows emits \`cognition.flow.node_completed\` into the spine / RAC_MindOutboxEvent (find the SpineEmitterService.emit or MindEventSpine.emit call + the flag idiom KLOEL_FLOWS_PERCEPT_ENABLED). 
Then find the CIA subsystem (backend/src/kloel/mind/cia and/or backend/src/kloel/cia — the autonomous agent with advisor/cognitive-health/runtime, ~28 files). Identify its key DECISION/ACTION points (where CIA decides or executes an action). At those points, ADDITIVELY emit a cognition percept (e.g. \`cognition.cia.decision_made\` / \`cognition.cia.action_executed\`) into the same spine ring Mind consumes, behind a new flag \`KLOEL_CIA_PERCEPT_ENABLED\` (process.env.X === 'true', DEFAULT OFF). Fire-and-forget, try/catch-wrapped, ZERO behavior change when OFF.
Use atomic-edit MCP (builtin Edit fallback). Add a test (flag OFF = no emit; ON = percept emitted). VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep -E "cia"\` empty (for your files); run touched specs. DO NOT COMMIT. If CIA's structure makes a clean percept seam impossible, status="blocked" with the exact reason. Return schema. task="cia-percept".`,
    { label: 'exec:cia-percept', phase: 'Execute', schema: SCHEMA }
  ),
  // 3. Autopilot → emit Mind percepts
  () => agent(
    `Wire the Autopilot subsystem to emit cognition percepts into the Kloel Mind spine in /Users/danielpenin/kloel — ADDITIVE, flag-gated (default OFF). Same doctrine: all cognition → ONE Mind.
STUDY the reference Flows pattern first (backend/src/flows/flows-percept-emit.flag.ts + its SpineEmitterService/MindEventSpine emit of cognition.* into RAC_MindOutboxEvent, flag KLOEL_FLOWS_PERCEPT_ENABLED).
Find the Autopilot processor (worker/processors/autopilot — ~57 files, and/or backend autopilot surfaces). At its key decision/action/dispatch points, ADDITIVELY emit a percept (e.g. \`cognition.autopilot.action_executed\`) into the spine ring Mind consumes, behind a new flag \`KLOEL_AUTOPILOT_PERCEPT_ENABLED\` (DEFAULT OFF), fire-and-forget + try/catch, ZERO behavior change when OFF. NOTE: the worker may use its own prisma/spine wiring — emit through whatever spine/outbox the worker already has access to (grep for how the worker writes to RAC_MindOutboxEvent or emits events); if the worker has NO path to the Mind spine, status="blocked" with the exact reason (and propose the wiring).
Use atomic-edit MCP. Add a test (OFF=no emit; ON=emit). VERIFY: relevant typecheck (worker uses worker/tsconfig.json — \`cd worker && npx tsc -p tsconfig.json --noEmit | grep autopilot\` OR backend build tsc as applicable) clean for your files; run touched specs. DO NOT COMMIT. Return schema. task="autopilot-percept".`,
    { label: 'exec:autopilot-percept', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
