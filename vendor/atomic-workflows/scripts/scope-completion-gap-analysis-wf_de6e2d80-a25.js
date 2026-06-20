export const meta = {
  name: 'scope-completion-gap-analysis',
  description: 'Code-grounded gap analysis of the entire accumulated scope: canonicalization, WhatsApp->OmniCore dissolution, Brain/Mind/CIA/Flows/Autopilot/Voice->ONE Kloel Mind, cognitive-loop closure, production activation, functional gaps. Each dimension returns DONE vs REMAINING vs BLOCKERS, grounded in real file:line. Read-only.',
  phases: [{ title: 'Analyze', detail: '6 parallel code-grounded gap analysts' }],
}
const ROOT = '/Users/danielpenin/kloel'
const RULE = 'GROUND IN REAL CODE: grep/glob/read the actual source (NOT .md docs, NOT assumptions). Cite file:line. Be brutally honest — distinguish DONE (verified working), PARTIAL (started/flag-gated-off), REMAINING (not done), BLOCKED (needs supervised deploy / design decision). Do NOT over-claim done; do NOT over-claim remaining (verify each premise in code).'
const DIMS = [
  { key: 'canonicalization', q: 'Architectural Semantic Canonicalization completeness. Check: the 7+ canonical artifacts exist + are accurate (docs/architecture/*.md); the 6 anti-regression gates (scripts/ops/check-canonical-*.mjs) pass + cover the vocabulary/events/services/duplicates/mind/capability; the DUPLICATION_REGISTER 55 items — how many are RESOLVED in code vs flag-gated vs still-open-design-heavy. What canonicalization remains?' },
  { key: 'omnicore-dissolution', q: 'WhatsApp -> OmniCore dissolution. Check backend/src/whatsapp (does it still exist? what is left in it? is it dissolved into backend/src/marketing/channels?). Are ALL channels (Email, TikTok, Instagram, Facebook, WhatsApp) unified under one marketing/channels dispatch surface (ChannelDispatchRegistry / channel-dispatch.port)? What is still channel-specific-duplicated or un-dissolved? Grep backend/src/whatsapp + backend/src/marketing.' },
  { key: 'mind-unification', q: 'Brain + Mind + CIA + Flows + Autopilot + Copilot + Voice + Money Machine -> ONE Kloel Mind. Count the SEPARATE cognition surfaces still existing as distinct modules/services (grep backend/src/kloel/mind, /cia, autopilot, copilot, voice, flows, money). How much is actually unified under one Mind vs still parallel separate systems? Is there ONE entry that orchestrates them, or N independent ones? What remains to make it literally ONE Kloel Mind?' },
  { key: 'cognitive-loop', q: 'The cognitive loop estado->percepcao->decisao->acao->consequencia->aprendizado. Is it CLOSED end-to-end on the live surfaces? Check: does the main chat/reply path fire perception->decision(MindBandit)->action->outcome(DecisionOutcomeService)->learning(bandit recordOutcome)? Grep for the decision->outcome->bandit wiring. Which surfaces fire the full loop vs which only do part (e.g. decide but never record consequence)? What loop-closure remains?' },
  { key: 'production-activation', q: 'Production readiness / activation. Enumerate ALL the KLOEL_* default-OFF flags (grep *.flag.ts + process.env.KLOEL_), the pending additive migrations (backend/prisma/migrations newest), and the backfills. Cross-check against docs/architecture/RUNBOOK_ACTIVATION.md. What is shipped-but-OFF (needs activation), what migration is authored-but-not-applied, what destructive step is deferred? This is the operator-supervised remainder.' },
  { key: 'functional-gaps', q: 'Functional production gaps (NOT design — kloelgraph design is frozen). Grep frontend/backend for: no-op handlers (onClick that do nothing / TODO), dead routes/screens, hardcoded/fake/mock data in prod paths, missing persistence (state not saved), and stubbed endpoints (throw NotImplemented / return []). List the concrete functional incompletenesses that block "everything works in production". Ground in file:line.' },
]
phase('Analyze')
const GAP = {
  type: 'object', additionalProperties: false,
  properties: {
    dimension: { type: 'string' },
    overallStatus: { enum: ['complete', 'mostly-complete', 'partial', 'early'] },
    done: { type: 'array', items: { type: 'string' }, maxItems: 14 },
    remaining: { type: 'array', items: { type: 'string' }, maxItems: 16 },
    blockers: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    nextConcreteStep: { type: 'string' },
    grounding: { type: 'array', items: { type: 'string' }, maxItems: 12 },
  },
  required: ['dimension', 'overallStatus', 'done', 'remaining', 'nextConcreteStep'],
}
const results = await parallel(DIMS.map((d) => () =>
  agent([`Gap analysis of dimension "${d.key}" for the Kloel codebase (cwd ${ROOT}).`, RULE, d.q,
    'Return the StructuredOutput: overallStatus + done[] + remaining[] + blockers[] + nextConcreteStep + grounding[] (file:line). Be exhaustive on REMAINING — that is the point.'].join('\n'),
    { schema: GAP, phase: 'Analyze', label: `gap:${d.key}` }).catch((e) => ({ dimension: d.key, overallStatus: 'partial', done: [], remaining: ['analysis failed: ' + String(e).slice(0, 100)], nextConcreteStep: 'retry' }))))
return { results: results.filter(Boolean) }
