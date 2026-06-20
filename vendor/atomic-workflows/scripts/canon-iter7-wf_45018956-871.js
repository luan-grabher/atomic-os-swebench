export const meta = {
  name: 'canon-iter7',
  description: 'Canonicalization iter 7: update canonical docs to reflect the 7 convergences + extend anti-regression gate family (dispatch/tenant)',
  phases: [{ title: 'Execute', detail: '2 executors: doc-sync, gate-family-extend' }],
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
  // 1. Sync canonical docs to reflect this session's convergences (DoD #6/#10)
  () => agent(
    `Update the canonical architecture docs in /Users/danielpenin/kloel/docs/architecture/ to ACCURATELY reflect this session's completed convergences, so a future AI/human can understand the system from the docs alone (the mission's Definition-of-Done). ADDITIVE doc edits only — verify every claim against the CURRENT code (grep) before writing; do NOT invent.
This session converged (all on the current branch, verify each):
- Brain→Mind data surface: prisma.kloelMemory → MindMemoryItemService.items; prisma.kloelMessage → MindMessageService.items; prisma.chatMessage → NEW MindChatMessageService.items (backend/src/kloel/mind/aliases/). ChatMessage stays RAC_ChatMessage (distinct table). The unified RAC_MindMessage ledger already dual-writes both families via a 'source' discriminator.
- 5 cognition percept emitters into RAC_MindOutboxEvent: Flows (cognition.flow.node_completed), CIA (cognition.cia.decision_made/action_executed), Autopilot worker (cognition.autopilot.*), Voice (cognition.voice.clone_created/action_executed), all flag-gated KLOEL_*_PERCEPT_ENABLED DEFAULT OFF.
- OmniCore: ChannelTransportRegistry delegates to canonical ChannelMessageDispatchService behind KLOEL_TRANSPORT_CANONICAL_DELEGATE (default OFF).
- Tenant: 9 product-sub-resource controllers converged getWorkspaceId → canonical resolveWorkspaceId.
- Anti-regression gate check:canonical-mind locks prisma.kloelMemory/kloelMessage/chatMessage access to the canonical surface.
DO: update docs/architecture/DUPLICATION_REGISTER.md (mark these duplications converged/resolved), DEPRECATION_MAP.md (deprecate getWorkspaceId, raw prisma.kloelMemory/kloelMessage/chatMessage access in favor of the Mind alias services), SERVICE_CATALOG.md (add MindChatMessageService + the percept-emit helpers + note the transport→dispatch delegation), and MIND_SERVICES_CANONICAL.md (add MindChatMessageService + the 5 percept emitters). Keep entries factual + cite file paths. Doc-only — touch NOTHING in backend/frontend/worker. VERIFY the docs are internally consistent (the canonical names match real symbols via grep). DO NOT COMMIT. Return schema. task="doc-sync". behaviorPreserved=true.`,
    { label: 'exec:doc-sync', phase: 'Execute', schema: SCHEMA }
  ),
  // 2. Extend the anti-regression gate family (dispatch + tenant)
  () => agent(
    `Extend the anti-regression gate family in /Users/danielpenin/kloel to lock in the dispatch + tenant canonicalization (FASE 7 completion). Mirror scripts/ops/check-canonical-mind-access.mjs (study it: comment-strip, grandfather existing legit uses, fail on NEW violations, MUST pass exit 0 on current HEAD).
Create scripts/ops/check-canonical-capability-access.mjs that FAILS on NEW non-canonical usage of:
1. TENANT RESOLUTION — new direct \`getWorkspaceId(\` calls (the non-validating helper at backend/src/kloel/product-sub-resources/helpers/common.helpers.ts) outside the helper's own file + a tight grandfather list of any remaining legit callers; the canonical is resolveWorkspaceId (auth/workspace-access.ts). Grandfather all CURRENT getWorkspaceId callers so it passes now; only forbid NEW ones.
2. MESSAGE DISPATCH — new direct provider sends (e.g. metaWhatsApp.sendTextMessage / InstagramService.sendMessage) added OUTSIDE the canonical ChannelMessageDispatchService / ChannelDispatchRegistry / ChannelTransportRegistry + the marketing channel adapters. Grandfather current sites; forbid new ones. (Be conservative — if a robust pattern is hard, scope this gate to the TENANT rule only and note dispatch as a follow-up; a narrow gate that passes clean and forbids the real footgun beats a broad flaky one.)
CRITICAL: MUST exit 0 on current HEAD (grandfather everything that exists; prove non-trivial by temporarily injecting a violation → exit 1 → remove). Register as npm script check:canonical-capability + chain into check:all. Use Write/Edit for scripts/ops + package.json (atomic-edit refuses governance-protected paths — do NOT bypass; use builtin). VERIFY \`npm run check:canonical-capability\` exit 0. DO NOT COMMIT. Return schema. task="gate-family". behaviorPreserved=true.`,
    { label: 'exec:gate-family', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
