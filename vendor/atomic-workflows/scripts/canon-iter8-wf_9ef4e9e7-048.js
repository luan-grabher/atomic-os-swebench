export const meta = {
  name: 'canon-iter8',
  description: 'Canonicalization iter 8: email + instagram dispatch → canonical (flag-gated) + frontend identity type canonicalization',
  phases: [{ title: 'Execute', detail: '3 executors: email-dispatch, instagram-dispatch, frontend-identity' }],
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
const OMNICORE_REF = `Reference pattern (already committed at 4c8096688, channel-transport.registry.ts): a flag \`process.env.KLOEL_X === 'true'\` (DEFAULT OFF) gates delegation; when OFF the existing raw path runs byte-for-byte unchanged; when ON it routes through the canonical ChannelMessageDispatchService.sendMessage and maps the result; fire-and-forget graceful fallback to the existing path on any build/DI failure; @Optional + forwardRef injection to avoid DI cycles; tests for BOTH flag states + boot-smoke.`
phase('Execute')
const results = await parallel([
  () => agent(
    `Canonicalize CAMPAIGN EMAIL dispatch in /Users/danielpenin/kloel (census P2-2), FLAG-GATED default OFF (behavior-identical when OFF). ${OMNICORE_REF}
Target: backend/src/campaigns/campaigns.service.ts processCampaignJob (~lines 294-323) dynamically imports + constructs EmailService (new EmailServiceClass()) and calls sendEmail directly, bypassing the canonical EmailDispatchAdapter / ChannelDispatchRegistry. 
DO: behind a NEW flag \`KLOEL_CAMPAIGN_EMAIL_CANONICAL\` (process.env.X==='true', DEFAULT OFF), route the campaign email send through the canonical EmailDispatchAdapter / ChannelMessageDispatchService (grep backend/src/marketing for the email adapter + how ChannelMessageDispatchService handles channel 'email'). When OFF, the existing \`new EmailService().sendEmail\` path runs unchanged. Map results to the campaign's expected shape. If the canonical email path is a DIFFERENT delivery mechanism (connected-mailbox vs Resend/SendGrid) such that delegating would change WHICH provider sends, treat that as a real semantic difference: keep them separate and status="blocked" with the precise explanation (do NOT silently change the provider). Add a flag.ts + tests (OFF/ON). Use atomic-edit MCP (builtin Edit fallback). VERIFY tsc + campaigns specs. DO NOT COMMIT. Return schema. task="email-dispatch".`,
    { label: 'exec:email-dispatch', phase: 'Execute', schema: SCHEMA }
  ),
  () => agent(
    `Canonicalize INSTAGRAM DM dispatch in /Users/danielpenin/kloel (census P2-3), FLAG-GATED default OFF (behavior-identical when OFF). ${OMNICORE_REF}
Target: backend/src/marketing/instagram/instagram-marketing.service.ts sendDirectMessage (~lines 251-296) calls InstagramService.sendMessage directly, bypassing guards/metering. 
DO: behind a NEW flag \`KLOEL_INSTAGRAM_CANONICAL_DISPATCH\` (DEFAULT OFF), delegate to the canonical ChannelMessageDispatchService.dispatch(ws, 'instagram', ...) / ChannelDispatchRegistry (grep for the instagram dispatch adapter). When OFF, the existing InstagramService.sendMessage path runs unchanged. @Optional+forwardRef to avoid DI cycle. Map results. Add a flag.ts + tests (OFF/ON + boot-smoke). If a DI cycle is unavoidable, status="blocked" with the exact cycle. Use atomic-edit MCP (builtin Edit fallback). VERIFY tsc + instagram specs. DO NOT COMMIT. Return schema. task="instagram-dispatch".`,
    { label: 'exec:instagram-dispatch', phase: 'Execute', schema: SCHEMA }
  ),
  () => agent(
    `Canonicalize the FRONTEND contact/identity TYPE terminology in /Users/danielpenin/kloel — TYPE-LEVEL ONLY, ZERO UI/behavior/visual change (Daniel forbids UI changes). Ubiquitous-language goal: ONE canonical contact type.
Census finding: the canonical frontend contact type is CrmContact (frontend/src/lib/api/crm.ts:29) which maps to the backend Contact. There are ~16 files using "Lead" and ~19 using "Contact" / ~4 "Customer" terminology in frontend/src.
DO (read-only-first, then SAFE type edits):
1. Audit: which "Lead"/"Customer" usages refer to the SAME entity as CrmContact/Contact (a person/contact) vs a genuinely-distinct funnel STAGE (Lead-as-stage is legitimately different and must stay). Produce the classification in summary.
2. For usages that are the SAME entity as Contact but typed/named divergently, ADD a canonical type alias (e.g. \`export type Lead = CrmContact\` where they are truly the same shape) or re-point imports to the canonical type — WITHOUT changing any rendered text, component behavior, API calls, or runtime values. Do NOT rename UI labels, do NOT change what the user sees. If a safe type-only canonicalization isn't possible without touching behavior/UI, status="partial" and just document the mapping for a future human pass.
3. Do NOT touch backend.
Use atomic-edit MCP (builtin Edit fallback). VERIFY: \`cd frontend && npx tsc --noEmit | grep <files>\` empty; the frontend still typechecks fully. DO NOT COMMIT. behaviorPreserved MUST be true (type-only). Return schema. task="frontend-identity".`,
    { label: 'exec:frontend-identity', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
