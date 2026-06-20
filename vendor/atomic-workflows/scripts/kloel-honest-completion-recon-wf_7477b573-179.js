export const meta = {
  name: 'kloel-honest-completion-recon',
  description: 'Grounded recon wave for the 6 unfinished Kloel items — each agent reads real files and returns a concrete, file-grounded change-set + risk',
  phases: [{ title: 'Recon', detail: 'one grounded agent per unfinished item' }],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['item', 'whatExists', 'preciseGap', 'changeSet', 'risk', 'safeAutonomous', 'firstStep', 'estCommits'],
  properties: {
    item: { type: 'string' },
    whatExists: { type: 'string', description: 'Grounded in real files read — cite file:line. What is ALREADY there.' },
    preciseGap: { type: 'string', description: 'The exact remaining gap, grounded.' },
    changeSet: {
      type: 'array',
      description: 'Concrete files to change and what to do in each.',
      items: {
        type: 'object', additionalProperties: false, required: ['file', 'change'],
        properties: { file: { type: 'string' }, change: { type: 'string' } },
      },
    },
    risk: { type: 'string', enum: ['safe-autonomous', 'needs-human-gate', 'dangerous'] },
    safeAutonomous: { type: 'boolean' },
    firstStep: { type: 'string', description: 'The single first concrete action to take.' },
    estCommits: { type: 'number' },
  },
}

phase('Recon')

const TASKS = [
  {
    label: 'recon:cognition-learning-defects',
    prompt: `Repo: /Users/danielpenin/kloel (NestJS backend). GROUNDED recon — read real files, cite file:line. Do NOT hand-wave.

CONTEXT (verified from prod DB): cognition learns at the substrate (beliefs update, 28 bandit pulls, 7/7 predictions resolved) BUT two defects: (a) RAC_MindSelfModel has 2.6M rows, max version 21847, NO pruning → unbounded bloat; (b) 3782 RAC_MindOutboxEvent rows of eventType 'cognition.self_modification.proposed' are ALL status='pending', oldest 7.5 days — NOTHING consumes them.

INVESTIGATE (read these areas):
- backend/src/kloel/mind/self-model/*.ts — where/how the self-model is snapshotted (find the write site that bumps 'version'); is there ANY pruning/retention? What is the safe pruning policy (keep last N versions per workspace)?
- The emit site of 'cognition.self_modification.proposed' (grep RAC_MindOutboxEvent / mindOutboxEvent.create / eventType). Who writes it, how often?
- Is there ANY dispatcher/consumer/worker that reads RAC_MindOutboxEvent and marks status dispatched? grep for status: 'dispatched', outbox drain, mind-event-spine, MindEventIngestor.
- What is the safe minimal fix: (1) self-model retention/prune (cron or on-write cap), (2) a bounded consumer OR a cap+TTL for the proposed self-modifications so they don't accumulate forever, ideally feeding back into the loop.

Return the structured finding (concrete files + changes + risk).`,
  },
  {
    label: 'recon:dormant-consumers-adapters',
    prompt: `Repo: /Users/danielpenin/kloel. GROUNDED recon — read real files, cite file:line.

CONTEXT: backend/src/kloel/mind/mind-cognitive-consolidation.helper.ts wires 8 dormant detectors (recovery/role/offer/defens/commem/hypproof/cash/goal-field) into the long-tick and emits 'cognition.consolidation_scan' — but (verified) outbox events pile up with NO consumer. Also these modules are NOT yet on the loop with real data: incent, agency, evol, wisdom, legit, daily-dashboard.

INVESTIGATE:
- Read mind-cognitive-consolidation.helper.ts fully. What does each of the 8 detectors actually do / produce? Is the emitted 'cognition.consolidation_scan' consumed anywhere?
- For incent, agency, evol, wisdom, legit, daily-dashboard (grep their dirs under backend/src/kloel/ or backend/src/): what does each compute, and what DATA SOURCE does each need to run on real events? What is the concrete adapter (which existing service/event feeds it)?
- Is there a generic outbox→handler dispatch path that a consumer could hook into (MindEventIngestor / spine)? 
- Concrete: what is the minimal wiring to give the 8 emitted events a real consumer, and to activate the 6 modules on real data (or honestly mark which truly need product data that doesn't exist).

Return the structured finding.`,
  },
  {
    label: 'recon:dissolve-vs-delete',
    prompt: `Repo: /Users/danielpenin/kloel. GROUNDED recon — read real files, cite file:line. Be CONSERVATIVE: do NOT recommend deleting product features.

GOAL: Daniel wants 'dissolve all cognition (CIA/Flows/Autopilot/Copilot/Voice/Money) into ONE Kloel Mind; delete what is NOT cognition.' Already done: percept flags flipped so these feed the Mind loop. NOT done: structural dissolution + deletion of genuinely-dead/duplicate code.

INVESTIGATE each of backend/src/kloel/cia, flows, autopilot, copilot/kloel-copilot, voice, growth (money):
- What is it REALLY (a product feature users rely on, OR pure internal cognition, OR dead/duplicate scaffolding)?
- What does 'dissolve into one Mind' concretely mean for it that is NOT already done by the percept flag — is there duplicate state/logic that should be unified onto the Mind substrate (beliefs/bandits/spine) vs kept as a product surface?
- Identify SPECIFIC dead code / duplicate implementations / unused exports that are genuinely safe to delete (cite file:line + why safe — no callers, superseded). Do NOT include anything with real callers or product value.

Return the structured finding (risk should be 'dangerous' for any actual deletion of non-trivial code; 'safe-autonomous' only for provably-dead code).`,
  },
  {
    label: 'recon:money-sharedledger-bigint',
    prompt: `Repo: /Users/danielpenin/kloel. GROUNDED recon — read real files, cite file:line.

GOAL: money-ledgers canonicalization — Float→BigInt (cents) for monetary fields, a SharedLedger abstraction. Money must never be Float.

INVESTIGATE:
- grep prisma/schema.prisma for Float fields that hold money (amount, price, balance, commission, value, total, fee, etc.). List them with model:field.
- Find the existing ledger/commission/balance services (backend/src/payments, wallet/carteira, growth, affiliate). How is money currently typed/stored (Float? Int cents? Decimal?). Is there already a partial cents/BigInt convention?
- What is the SharedLedger design — a single canonical money-movement abstraction? Does any doc/plan describe it (docs/architecture)?
- The concrete migration risk: changing Float→BigInt on a live prod table with data is DANGEROUS (precision, in-flight reads). What is the safe phased approach (add new cents column, dual-write, backfill, cutover) vs a risky in-place ALTER?

Return the structured finding. risk is almost certainly 'dangerous' or 'needs-human-gate' for the actual column changes; flag any safe prep (new typed helper, new column additive) as 'safe-autonomous'.`,
  },
  {
    label: 'recon:frontend-quality-findings',
    prompt: `Repo: /Users/danielpenin/kloel (Next.js frontend in frontend/). GROUNDED recon — read real files, cite file:line.

GOAL: the frontend deploys but has real quality gaps: no-op buttons (onClick does nothing / TODO), dead screens (routes that render nothing/placeholder), fake/hardcoded data shown as real, missing persistence (forms that don't save). 

INVESTIGATE (sample broadly, prioritize by user-visibility):
- grep frontend/src for onClick handlers that are empty, '// TODO', console.log-only, or no-op; buttons with no wired action.
- Find screens/pages that render placeholder/'Em breve'/'Coming soon'/Lorem/hardcoded mock arrays presented as real data.
- Forms whose submit does not call an API (no fetch/mutation) — missing persistence.
- Pick the TOP ~10 HIGHEST-VALUE real issues (user-facing, clearly broken), each with file:line and the concrete fix.

Return the structured finding with changeSet = the top ~10 concrete fixes. risk: 'safe-autonomous' for the genuine ones.`,
  },
  {
    label: 'recon:channel-unification',
    prompt: `Repo: /Users/danielpenin/kloel. GROUNDED recon — read real files, cite file:line.

GOAL: OmniCore channel unification — WhatsApp dissolved into marketing, connected to Email + TikTok + Meta (Instagram/Facebook/WhatsApp). Some migrations are flag-gated and OFF: Instagram canonical dispatch, email routing facade, TikTok outbound.

INVESTIGATE backend/src/marketing (channels/) and meta/:
- Find the flags gating: Instagram canonical dispatch, email routing facade/canonical, TikTok outbound. grep for *_CANONICAL, *_FACADE, *_ENABLED in marketing/channels.
- For each: is the canonical path BUILT and tested (so the flag is safe to flip), or is it half-built? What is blocking TikTok outbound specifically?
- What is the concrete, SAFE activation: which flags can be flipped now (canonical path equivalent + fallback), and which need code completion first?

Return the structured finding. Be honest about which are safe-to-activate vs need-work.`,
  },
]

const findings = await parallel(
  TASKS.map((t) => () => agent(t.prompt, { label: t.label, phase: 'Recon', schema: SCHEMA, agentType: 'Explore' })),
)

return findings.filter(Boolean)
