export const meta = {
  name: 'canon-iter9',
  description: 'Canonicalization iter 9: KloelLead→Contact dual-write + transactional EmailDispatchAdapter + more frontend identity',
  phases: [{ title: 'Execute', detail: '3 executors: lead-contact-dualwrite, email-adapter, frontend-identity-2' }],
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
  () => agent(
    `Implement an ADDITIVE, flag-gated KloelLead→Contact dual-write in /Users/danielpenin/kloel — the safe first phase of identity unification (census P1-6). DEFAULT OFF = zero behavior change.
Context: Contact (backend Prisma model Contact, RAC_Contact) is the canonical person entity; KloelLead (RAC_KloelLead) is the legacy funnel entity. They share natural key [workspaceId, phone] but are written by different paths and never auto-merged. CrmService.upsertContact already normalizes phone (grep backend/src/crm or contacts for it).
DO: find the kloelLead WRITE sites (prisma.kloelLead.create/upsert — grep, ~the lead-processor: kloel-lead-processor-helpers.ts:83, whatsapp-mind-coordinator.service.ts:181, and others). Behind a NEW flag \`KLOEL_LEAD_CONTACT_DUALWRITE\` (process.env.X==='true', DEFAULT OFF), ADDITIVELY mirror each KloelLead write into a canonical Contact via CrmService/ContactsService upsertContact (fire-and-forget, try/catch + warn, never block or alter the KloelLead write). When OFF = byte-identical (no Contact write). Do NOT change reads, do NOT delete KloelLead, do NOT migrate data — this is dual-write only. Inject the canonical contact service @Optional()+forwardRef if needed (no DI cycle; if unavoidable, status="blocked" with the cycle). Add a flag.ts + tests (OFF=no Contact write; ON=Contact upserted with normalized phone). Use atomic-edit MCP (builtin Edit fallback). VERIFY tsc + touched specs. DO NOT COMMIT. Return schema. task="lead-contact-dualwrite".`,
    { label: 'exec:lead-contact', phase: 'Execute', schema: SCHEMA }
  ),
  () => agent(
    `Build a TRANSACTIONAL EmailDispatchAdapter in /Users/danielpenin/kloel so campaign email CAN route through the canonical dispatch WITHOUT changing the provider (unblocks census P2-2, which was correctly blocked because the only canonical email adapter today is connected-mailbox Gmail/Microsoft/IMAP, not the campaigns' Resend/SendGrid/SMTP).
STUDY: the canonical channel-dispatch port + registry (backend/src/marketing/channels — channel-dispatch.port.ts, channel-dispatch.registry.ts, the existing connected-mailbox email-dispatch.adapter.ts), and the campaigns' transactional sender backend/src/auth/email.service.ts (Resend/SendGrid/env-SMTP from noreply@kloel.com).
DO: create a NEW canonical adapter (e.g. backend/src/marketing/channels/email/transactional-email-dispatch.adapter.ts) that conforms to the ChannelDispatchPort/adapter interface and internally calls the SAME EmailService.sendEmail (Resend/SendGrid/SMTP) — so routing through it preserves the EXACT provider + sender identity. Register it in the canonical registry under a distinct channel kind or a sub-mode (e.g. channelKind 'email_transactional' or an adapter variant) so it does NOT collide with the connected-mailbox 'email' adapter. Add it to MindModule/MarketingChannelsModule providers as appropriate. This is ADDITIVE (new adapter, no existing path changed). Add a unit test (the adapter delegates to EmailService.sendEmail with mapped args, returns a canonical ChannelSendResult). If conforming to the port is structurally impossible without changing the port contract, status="blocked" with specifics. Use atomic-edit MCP (atomic_create_file for the new adapter; builtin Edit for module wiring). VERIFY tsc + the new adapter spec + check:casts/ai-constitution exit 0. DO NOT COMMIT. Return schema. task="email-adapter". behaviorPreserved=true (additive).`,
    { label: 'exec:email-adapter', phase: 'Execute', schema: SCHEMA }
  ),
  () => agent(
    `Continue the FRONTEND contact/identity TYPE canonicalization in /Users/danielpenin/kloel — TYPE-LEVEL ONLY, ZERO UI/behavior/visual change.
Canonical type = CrmContact (frontend/src/lib/api/crm.ts). A prior pass already canonicalized ContactDetailDrawer.tsx. 
DO: audit the REMAINING frontend files that declare a LOCAL standalone Contact/Lead/Customer interface or type representing the SAME person/contact entity as CrmContact (grep \`interface Contact\`, \`interface Lead\`, \`type Contact\`, \`type Lead\` in frontend/src, excluding spec/test). For each that is genuinely the SAME entity (not a distinct funnel-stage Lead), re-derive it from CrmContact (e.g. \`type X = Pick<CrmContact, ...>\` or re-point the import) WITHOUT changing any rendered text, JSX, handler, API call, or runtime value. Leave genuinely-distinct funnel-stage Lead types alone (document them). If a file's local type diverges in shape (extra UI-derived fields), derive-and-extend from CrmContact (like the ContactDetailDrawer precedent) rather than replacing.
Use atomic-edit MCP (builtin Edit fallback). VERIFY: \`cd frontend && npx tsc --noEmit\` introduces ZERO NEW errors attributable to your files (a pre-existing error in ProductNerveCenterCampanhasTab.tsx from concurrent work is NOT yours — confirm by grepping your files only). DO NOT COMMIT. behaviorPreserved MUST be true. Return schema. task="frontend-identity-2".`,
    { label: 'exec:frontend-identity-2', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
