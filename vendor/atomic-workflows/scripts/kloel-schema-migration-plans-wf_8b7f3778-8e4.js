export const meta = {
  name: 'kloel-schema-migration-plans',
  description: 'Read-only migration planning for the 5 big schema/entity canonicalization splits: PERSON (Contact↔KloelLead), CONVERSATION, PRODUCT-PLAN (float→cents), SITE, MONEY/LEDGER — phased plans with backfill + data-safety + rollback + ADR outline',
  phases: [{ title: 'Plan', detail: '5 split migration plans in parallel — NO code changes' }],
}

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['split', 'canonical', 'phases', 'dataSafety'],
  properties: {
    split: { type: 'string' },
    canonical: { type: 'string', description: 'the canonical model/entity that wins + why' },
    deprecate: { type: 'string', description: 'the model(s)/field(s) to deprecate, with real callers count' },
    phases: { type: 'string', description: 'ordered phased migration plan: schema add → dual-write → code migration → backfill → cutover → cleanup' },
    dataSafety: { type: 'string', description: 'backfill strategy + FK/ledger/financial safety + what could orphan + how to verify' },
    rollback: { type: 'string', description: 'how to reverse each phase' },
    risk: { type: 'string', description: 'honest risk + whether owner approval is required (financial/ledger = yes)' },
    effort: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
  },
}

const BASE = 'Senior architect, EVIDENCE-BASED migration planning on KLOEL monorepo (root /Users/danielpenin/kloel). READ-ONLY — make NO code changes, NO commits. Read backend/prisma/schema.prisma + grep real caller counts (rg prisma.<model>). Produce a SAFE, phased, reversible migration plan. KLOEL rules: money in cents (BigInt/Int), NEVER float; ledger/wallet/payment are APPEND-ONLY and owner-gated; never drop a table/column without a verified backfill; migrations must be reviewable + reversible; workspace isolation preserved. Use the additive expand→migrate→contract pattern (add canonical → dual-write → migrate readers → backfill historical rows → cutover → deprecate, never a hard rename). You MUST finish by calling StructuredOutput. Be honest about effort + owner-approval needs.'

phase('Plan')

const splits = [
  { key: 'PERSON', prompt: BASE + '\n\nPLAN the PERSON entity unification. Contact (schema.prisma:399, FK contactId, the canonical per owner vocab) vs KloelLead (schema.prisma:1824, parallel person workspaceId+phone+name+email) vs any CheckoutSocialLead. Count real callers of each (rg prisma.contact, prisma.kloelLead). Plan: how to make Contact the single person entity, migrate KloelLead readers/writers, backfill KloelLead rows into Contact (dedup by workspaceId+normalized phone — note the phone-normalization fix already landed), preserve KloelLead.status/stage as Contact-linked Deal/Stage or a contact field. CAVEAT: many flows depend on KloelLead — this is L/XL. dataSafety: phone-dedup collisions, FK repointing (KloelConversation.leadId, etc.), no lost leads.' },
  { key: 'CONVERSATION', prompt: BASE + '\n\nPLAN the CONVERSATION unification. Conversation+Message (schema.prisma:672/711, FK→Contact, the canonical inbox) vs KloelConversation (1855, FK→KloelLead via leadId) + KloelMessage/MindMessage. Count callers. Plan migrating KloelConversation→Conversation (depends on the PERSON split since leadId→contactId), message model convergence (MindCanonicalService already started this). Phased, reversible, FK-safe. Note dependency on PERSON split.' },
  { key: 'PRODUCT-PLAN', prompt: BASE + '\n\nPLAN the PRODUCT-PLAN unification — INCLUDES A FLOAT-MONEY BUG. CheckoutProductPlan (schema.prisma:2954, priceInCents Int, FK→Product, 129 callers, canonical) vs legacy ProductPlan (schema.prisma:2203, price FLOAT — VIOLATES the money-in-cents rule, 41 callers). Plan converging ProductPlan callers onto CheckoutProductPlan, and CRITICALLY converting the price Float→priceInCents Int (backfill: priceInCents = round(price*100), verify no precision loss, handle existing rows). This touches checkout/pricing → owner-approval. dataSafety: float→cent rounding must be exact + verified per row; pricing must not change for existing plans.' },
  { key: 'SITE', prompt: BASE + '\n\nPLAN the SITE unification. Site (schema.prisma:4724, SiteStatus enum, multi-domain via SiteDomain[], 14 callers, structured/canonical) vs KloelSite (2587, single htmlContent Text blob, published Boolean, 12 callers — where users actually create sites today per prior work). NUANCE: the live create flow uses KloelSite (/kloel/site) + the /s/<slug> public serve; Site (/sites) is the newer structured model. Decide the canonical target + plan migrating KloelSite content into Site (htmlContent→structured content/template, published→SiteStatus, slug + domains). Reversible, no published sites lost (the /s/<slug> public URLs must keep working through cutover).' },
  { key: 'MONEY-LEDGER', prompt: BASE + '\n\nPLAN the MONEY/LEDGER field-vocabulary unification — FINANCIAL, OWNER-GATED. Two issues: (a) Float money columns duplicating canonical *InCents: KloelWallet.availableBalance/pendingBalance/blockedBalance (Float) vs the *InCents BigInt columns — converge on BigInt cents. (b) Ledger field-name split: ConnectLedgerEntry.amountCents vs KloelWalletLedger.amountInCents — one naming convention. Count callers. Ledger is APPEND-ONLY — plan must NOT mutate historical ledger rows; use additive canonical columns + compensating entries, never UPDATE money history. dataSafety: this is the highest-risk (real balances) → require owner approval, full reconciliation test (sum of cents == sum of float*100), reversible. effort almost certainly XL.' },
]

const results = await parallel(
  splits.map((s) => () => agent(s.prompt, { label: 'plan:' + s.key, phase: 'Plan', schema: PLAN_SCHEMA }))
)
return results.filter(Boolean)
