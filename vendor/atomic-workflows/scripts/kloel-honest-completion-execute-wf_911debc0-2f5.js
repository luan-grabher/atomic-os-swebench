export const meta = {
  name: 'kloel-honest-completion-execute',
  description: 'Execution wave: each worktree-isolated agent implements one grounded item, verifies (tsc+tests), commits in its worktree, returns a review packet',
  phases: [{ title: 'Execute', detail: 'worktree-isolated implement + verify + commit per item' }],
}

const RESULT = {
  type: 'object',
  additionalProperties: false,
  required: ['item', 'status', 'filesChanged', 'tscErrors', 'testsSummary', 'commitSha', 'worktreePath', 'summary', 'openQuestions', 'needsHumanReview'],
  properties: {
    item: { type: 'string' },
    status: { type: 'string', enum: ['implemented', 'partial', 'blocked', 'no-change-needed'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    tscErrors: { type: 'number', description: 'backend (or frontend) tsc --noEmit error count after the change' },
    testsSummary: { type: 'string', description: 'which tests run + pass/fail counts' },
    commitSha: { type: 'string', description: 'git rev-parse HEAD in the worktree after committing, or "none"' },
    worktreePath: { type: 'string', description: 'pwd of the worktree' },
    summary: { type: 'string', description: 'what was actually changed, grounded' },
    openQuestions: { type: 'string', description: 'anything that needs product data, a decision, or is unsafe to do autonomously — be honest' },
    needsHumanReview: { type: 'boolean' },
  },
}

const COMMON = `
You are in an isolated git worktree of the Kloel repo (NestJS backend at backend/, Next.js frontend at frontend/). The branch is feat/kloel-production-ship-20260608.

RULES:
- Implement ONLY your assigned item. Stay in your file domain to avoid conflicts.
- GROUND every change in real files you read — cite file:line in your summary. Do NOT hand-wave.
- Be ADDITIVE and SAFE: feature-flag any behavior change default-OFF; never break existing callers; never drop columns/data.
- HONESTY: if part of the task needs product data that does not exist, or is unsafe to do autonomously, do the SAFE part and report the rest in openQuestions. Do NOT fake completion. Do NOT write swallowed catches (the ai-constitution gate forbids empty .catch(()=>{}) / catch{} — always log).
- VERIFY before committing: backend changes → run \`cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"\` (must be 0) and the relevant \`npx jest <pattern>\`. frontend → \`cd frontend && npx tsc --noEmit\` (no \`timeout\` — it does not exist on macOS).
- COMMIT in this worktree when green: \`git add <your files> && git commit -m "<conventional, lowercase subject <=90 chars>"\` (do NOT use --no-verify, do NOT push). Then report \`git rev-parse HEAD\` and \`pwd\`.
- Return the structured result packet.
`

phase('Execute')

const AGENTS = [
  {
    label: 'exec:cognition-leaks',
    prompt: `${COMMON}
ITEM: Fix the cognition learning leaks + close the loop (verified from prod DB: self-model 2.6M rows unbounded; 3782 'cognition.self_modification.proposed' outbox events all status=pending, never consumed; opportunityCount=0 on ALL — the self-evolution detector is starved).

READ FIRST (grounded):
- backend/src/kloel/mind/self-model/mind-self-model.service.ts — snapshot() appends a versioned row every tick (~30s) with NO pruning. timeline()/latest() read APIs must keep working.
- backend/src/kloel/mind/self-evolution/mind-self-modification.service.ts — proposeOptimization() only yields opportunities when MindPrediction rows with surprise>0.7 AND >=3 per predicate in 24h exist; with ~7 predictions total it is ALWAYS empty. runEvolutionCycle() upserts the outbox row (6h bucket).
- backend/src/kloel/mind/coordination/mind-event-ingestor.service.ts — @Cron(EVERY_MINUTE) that claims+processes ONLY 'cognition.decision_made'. No consumer for self_modification.proposed.
- backend/src/kloel/mind/mind-cognitive-consolidation.helper.ts — wires 8 dormant detectors into the long-tick, emits 'cognition.consolidation_scan' with no consumer.

IMPLEMENT (all additive, flag-gated default-ON only if safe; pruning gated by a retention const):
1. Self-model retention: add prune(workspaceId) to mind-self-model.service.ts that keeps the last N versions per workspace (N=200 const) and/or deletes snapshots older than 90 days; call it after snapshot() append (best-effort, never blocks). Add a unit spec.
2. Outbox consumer: extend mind-event-ingestor.service.ts with processSelfModifications() that claims pending 'cognition.self_modification.proposed' events, marks them dispatched (status + dispatchedAt), and TTL-expires stale ones (>7d → mark 'expired' or delete). Wire into the existing cron. Add a spec.
3. Widen opportunity detection so the loop is not starved: lower the per-predicate threshold sensibly and ALSO surface opportunities from belief drift / bandit underperformance (read what signals exist: RAC_MindBelief has samples/variance, RAC_MindBanditArm has pulls/wins). Be conservative + flag-gated if it changes emitted volume. Document the rationale.
4. If feasible, give 'cognition.consolidation_scan' a minimal consumer (or fold its handling into the ingestor). If it needs product data that doesn't exist, report in openQuestions.

Domain: backend/src/kloel/mind/ ONLY. If you must edit mind.module.ts, keep edits MINIMAL and clearly delimited.`,
  },
  {
    label: 'exec:percept-dissolve',
    prompt: `${COMMON}
ITEM: Dissolve the 5 duplicate percept-emit helpers into ONE canonical factory (854 lines of near-identical try/catch/upsert + 5 copies of formatUnknownError).

READ FIRST (grounded):
- backend/src/kloel/mind/cia/cia-percept-emit.helper.ts (193 lines)
- backend/src/autopilot/autopilot-percept-emit.helper.ts (198)
- backend/src/flows/flows-percept-emit.helper.ts (94)
- backend/src/voice/voice-percept-emit.helper.ts (186)
- backend/src/growth/money-percept-emit.helper.ts (183)
Each: identical try/catch/upsert into RAC_MindOutboxEvent + a private formatUnknownError + exported event-type consts + local-only param interfaces.

IMPLEMENT:
- Create backend/src/kloel/mind/coordination/percept-emit.factory.ts exporting a single emitPerceptToMindSpine(prisma, logger, { eventType, subject, idempotencyKey, payload }) that contains the ONE canonical try/catch/upsert + the single formatUnknownError.
- Rewire all 5 helpers to delegate to the factory (keep their public function signatures + event-type consts so callers are untouched — byte-identical default behavior).
- Verify each helper's existing spec still passes; add a factory spec.
- This is pure canonicalization: behavior must be byte-identical, only duplication removed.

Domain: the 5 helper files + the new factory. Do NOT touch module providers.`,
  },
  {
    label: 'exec:ledger-additive-prep',
    prompt: `${COMMON}
ITEM: SharedLedger / money Float→BigInt — ONLY the ADDITIVE, SAFE prep (NO destructive Float drops, NO reader flip).

READ FIRST (grounded): docs/architecture/MIGRATION_PLAYBOOK.md lines 254-305; backend/prisma/schema.prisma (KloelWalletLedger ~2006, MarketplaceTreasuryLedger ~4276, WalletAnticipation ~2855, ConnectLedgerEntry ~4424 is the reference model WITH balanceAfter); backend/src/payments/ledger/ledger.service.ts (reference), backend/src/kloel/wallet-ledger.service.ts, backend/src/payments/marketplace-treasury.service.ts.

IMPLEMENT (additive only):
1. New port: backend/src/common/shared-ledger.port.ts — a SharedLedger interface (appendWithinTx) + computeBalanceAfter(prior, direction, amountCents) helper with the invariant balanceAfter == prior + signed(direction)*amountCents. Add a unit spec for the helper. Modeled on ConnectLedgerEntry. Do NOT yet route the 5 services through it.
2. Schema (additive, ALL new columns nullable): add balanceAfterAvailableCents/balanceAfterPendingCents/balanceAfterBlockedCents (BigInt?) to KloelWalletLedger; balanceAfterAvailableCents/PendingCents/ReservedCents (BigInt?) to MarketplaceTreasuryLedger; originalAmountInCents/feeAmountInCents/netAmountInCents (BigInt?) to WalletAnticipation. Create the prisma migration (additive ADD COLUMN, nullable — safe). Run \`cd backend && npx prisma validate\`.
3. Dual-write (flag-gated DEFAULT OFF): in wallet-ledger.service + marketplace-treasury.service + the WalletAnticipation write site, populate the new *Cents balanceAfter columns from the already-in-tx bucket balances, gated by KLOEL_*_BALANCEAFTER_DUALWRITE (=== 'true', default OFF), fail-open. Add specs asserting the invariant when the flag is on.

Do NOT: drop any Float column, flip any reader, set any flag default-ON. Report the destructive/reader stages in openQuestions as deferred.
Domain: backend/prisma/schema.prisma + migration + backend/src/common + backend/src/payments + backend/src/kloel/wallet*.`,
  },
  {
    label: 'exec:channels-verify',
    prompt: `${COMMON}
ITEM: OmniCore channel unification — VERIFY the canonical paths are green so the flags are safe to flip in prod (the actual prod flag-flip is done by the operator, not here).

READ + RUN (grounded):
- backend/src/marketing/instagram/instagram-marketing.service.dispatch.spec.ts and .resolver.spec.ts
- backend/src/marketing/channels/email/email-routing.spec.ts
Run: \`cd backend && npx jest instagram-marketing.service.dispatch instagram-marketing.service.resolver email-routing 2>&1 | tail -30\`. Report pass/fail counts.
- Confirm each flag's OFF path is inert/fallback (read instagram-canonical-dispatch.flag.ts, instagram-resolver-unify.flag.ts, email-routing-facade.flag.ts).
- TikTok: confirm it is platform-blocked (no outbound API), NOT a flag gap — read tiktok-dispatch.adapter.ts.

IMPLEMENT (small): if any spec is red, FIX the minimal code so it passes (that's the real gap). If all green, make NO code change — instead append a short "Activation readiness" section to docs/architecture/RUNBOOK_ACTIVATION.md listing the 3 flags verified-safe-to-activate (KLOEL_INSTAGRAM_CANONICAL_DISPATCH, KLOEL_INSTAGRAM_RESOLVER_UNIFY, KLOEL_EMAIL_ROUTING_FACADE) with the spec evidence, and note TikTok as platform-blocked. Commit that doc.
Report in openQuestions: the exact prod env flags the operator should set.
Domain: backend/src/marketing (only if a spec needs a fix) + docs/architecture/RUNBOOK_ACTIVATION.md.`,
  },
  {
    label: 'exec:frontend-quality',
    prompt: `${COMMON}
ITEM: Frontend quality — find and fix REAL user-facing gaps (Wave-1 static pass found little; dig deeper and more specifically).

INVESTIGATE (grounded, frontend/src): grep for the concrete anti-patterns and read the hits:
- Buttons/handlers that are no-ops: \`onClick={() => {}}\`, \`onClick={() => undefined}\`, handlers whose body is only a console.log / // TODO / // FIXME, \`disabled\` buttons that should work, \`href="#"\` with no handler.
- Dead/placeholder screens: 'Em breve', 'Coming soon', 'Em construção', 'TODO', 'Lorem', 'placeholder', hardcoded mock arrays rendered as if real data (literal data not from an API/hook).
- Forms whose submit never calls an API (no fetch/apiFetch/mutation/use*Mutation in the submit path).
Pick the TOP 5-8 highest-value, clearly-broken, SAFE-to-fix issues. Fix them properly (wire the handler to the real action/API that already exists nearby; remove or correctly gate dead screens; replace fake data with the real hook if one exists). Do NOT invent backend endpoints — if the real action doesn't exist, report it in openQuestions instead of faking.
Verify \`cd frontend && npx tsc --noEmit\` = 0 and \`cd frontend && npx next build --turbopack\` succeeds (the Vercel builder). Commit.
Be honest in summary: if you genuinely find few real issues, say so with evidence rather than inventing fixes.
Domain: frontend/src ONLY.`,
  },
]

const results = await parallel(
  AGENTS.map((a) => () => agent(a.prompt, { label: a.label, phase: 'Execute', schema: RESULT, isolation: 'worktree' })),
)

return results.filter(Boolean)
