export const meta = {
  name: 'wave4-bounded-gaps',
  description: 'Fix 4 disjoint bounded gaps: marketplace cents, autopilot honest-skip, product-ai-config update, crm contact-drawer',
  phases: [{ title: 'Fix', detail: '4 disjoint agents, atomic-only, each self-validated' }],
}

const MCP = `
MCP TOOLKIT — use ALL applicable. ATOMIC-EDIT MCP IS LAW (just upgraded — prefer atomic_converge/atomic_transaction if available; else code_read_symbol/code_outline + atomic_replace_text/atomic_edit). NEVER builtin Edit/Write/heredoc. Bash only for read/verify. Load via ToolSearch "select:<tool>".
- codegraph + gitnexus — understand + find existing patterns before editing. test-runner (run_jest/run_tsc/run_eslint) — MANDATORY validation. cognitive-hub/context7/postgres(read-only) as needed.
RULES: stay in your file territory; shared-file changes (schema/app.module/package.json) → do the code part + RETURN in sharedFileNeeds. Add/adjust the proving test. Validate (tsc + affected specs + eslint). Honest states only (no fabricated data/urls/ids). money=bigint cents. Avoid NEW comment trigger words (fake/mock/stub/bypass / 'return { ok: true }').`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gap', 'done', 'summary', 'filesChanged', 'validation', 'sharedFileNeeds'],
  properties: { gap: { type: 'string' }, done: { type: 'boolean' }, summary: { type: 'string' }, filesChanged: { type: 'array', items: { type: 'string' } }, validation: { type: 'string' }, sharedFileNeeds: { type: 'string' }, residual: { type: 'string' } },
}

phase('Fix')
const units = [
  { g: 'marketplace-float-cents', p: `backend/src/marketplace/marketplace.service.ts list() derives money via BigInt(Math.round(p.price * 100)) from a Float Product.price — float rounding on money. FIX: source the price as integer cents/bigint directly from the Product model. Check via codegraph/pg_table_describe whether Product has a priceInCents/priceCents bigint column; if it exists, read THAT and avoid the float round-trip; if Product only has Float price (no cents column), keep the conversion but RETURN in sharedFileNeeds that Product needs a priceInCents column for true money-safety (don't add schema here). Either way preserve the response shape (price: bigint cents). Territory: backend/src/marketplace/marketplace.service.ts (+ spec). VALIDATE: backend tsc.build + marketplace specs.` },
  { g: 'autopilot-greeting-fallback', p: `backend/src/autopilot/autopilot-cycle-executor.service.ts generateResponse falls back to a hardcoded greeting ('Olá, como posso ajudar?' or similar) when the OpenAI/LLM client is null — a canned reply masquerading as AI (banned by CLAUDE.md). FIX: when the LLM client is null in a production-reachable path, do NOT send a canned greeting — instead skip sending and record an AutopilotEvent with status 'skipped' and reason 'ai_unavailable' (mirror the existing AutopilotEvent recording pattern — find via codegraph), so the conversation honestly waits / hands off rather than emitting a fake reply. Territory: backend/src/autopilot/autopilot-cycle-executor.service.ts (+ spec). VALIDATE: backend tsc.build + autopilot specs; add a test asserting no canned reply + a 'skipped' event when LLM null.` },
  { g: 'product-ai-config-update', p: `Agent capability products.set_ai_config is broken: ProductAIConfigService is read-only (only get), so the chat agent cannot UPDATE a product's AI config. FIX: add a ProductAIConfigService.update(workspaceId, productId, config) method (find the controller's existing upsert/normalize logic via codegraph — likely in backend/src/kloel/product-sub-resources/product-ai-config.controller.ts — and extract it into the service so both the REST controller AND the agent capability call the same service method). Keep workspace scoping. Territory: backend/src/kloel/product-sub-resources/product-ai-config.* only (service + controller + spec). VALIDATE: backend tsc.build + product-ai-config specs; add a test for the new update method.` },
  { g: 'crm-contact-drawer-wire', p: `Orphan dead code: the CRM contact-detail drawer (frontend/src/components/kloel/crm/ContactDetailLoadingBody.tsx + crm-drawer-parts.tsx) has zero importers — it reads real /crm contact data but is never mounted. FIX: wire ContactDetailLoadingBody into the CRM view as a contact-detail drawer opened from the pipeline/contact list (find CRMPipelineView / DealDetailModal via codegraph/gitnexus and mount the drawer on contact click), OR if the contact-detail UX genuinely belongs elsewhere, mount it at the right contact-list entry point. Preserve the visual shell + design tokens; use the existing /crm api client (no fake data). Territory: frontend/src/components/kloel/crm/* (+ the view that should mount it). VALIDATE: frontend tsc (cd frontend && npx tsc --noEmit) + eslint on changed files.` },
]

const results = await parallel(units.map((u) =>
  () => agent(`${MCP}\n\n=== YOUR GAP ===\n${u.p}\n\nFix ONLY your gap. Understand via codegraph first, mutate via atomic-edit, validate with test-runner. Return structured result.`,
    { label: `w4:${u.g}`, phase: 'Fix', schema: SCHEMA })
))

return { results: results.filter(Boolean) }
