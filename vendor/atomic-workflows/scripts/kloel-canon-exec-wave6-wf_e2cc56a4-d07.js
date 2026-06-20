export const meta = {
  name: 'kloel-canon-exec-wave6',
  description: 'Wave 6: safe non-gated dedups — ops-alert webhook POST unification (worker), string-coercion canonicalization (backend), CPF/CNPJ digit-strip to sanitizeDocumentDigits — worktree-isolated, validated',
  phases: [{ title: 'Execute', detail: 'ops-alert, string-coercion, cpf-cnpj' }],
}

const RESULT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['task', 'done', 'summary'],
  properties: {
    task: { type: 'string' }, done: { type: 'boolean' },
    filesChanged: { type: 'string' }, diff: { type: 'string' }, validation: { type: 'string' },
    summary: { type: 'string' }, committedSha: { type: 'string' }, risk: { type: 'string' },
  },
}

const BASE = 'Senior engineer on KLOEL monorepo (root /Users/danielpenin/kloel), ISOLATED git worktree off branch HEAD. HARD RULE: NEVER edit the concurrent-agents lane (backend/src/kloel/thinker, reply-engine, openai-wrapper, stream, tool-dispatcher files + backend/src/pulse). Behavior-preserving, minimal, reversible. Validate: tsc on the affected workspace (ignore worktree node_modules type-def noise for react/express/jest; count only errors referencing YOUR files) AND eslint on changed files (report both). Run affected jest/vitest suites. Commit in worktree + --no-verify. Call StructuredOutput with honest risk. If a consolidation would change behavior, SKIP it and report (correctness over coverage).'

phase('Execute')

const tasks = [
  { key: 'OPS-ALERT', prompt: BASE + '\n\nTASK OPS-ALERT (worker/ NON-lane): the ops-alert webhook POST is duplicated across worker/queue-dlq-notifier.ts:92 notifyOps (richest), worker/processor-health-monitor.ts:26-66, worker/dlq-monitor.ts:6-44, and a 4th site. A prior wave SKIPPED this because the 4 sites send DISTINCT payload shapes + DIFFERENT env-var precedence. The SAFE consolidation: extract ONLY the shared HTTP POST mechanism (the fetch call + timeout + error handling) into one helper (worker/ops-webhook-post.helper.ts postOpsWebhook(url, payload)), and have each site keep its OWN env resolution + its OWN payload shape but call the shared POST. Do NOT unify the payloads or env precedence. If the POST mechanics differ materially (timeout/headers), keep them separate + report. Validate tsc+eslint+vitest. Report what you unified vs preserved.' },
  { key: 'STRING-COERCION', prompt: BASE + '\n\nTASK STRING-COERCION (backend, NON-lane sites only): canonical coercion primitives are backend/src/common/parse.ts (readString, readTrimmedString, readStringArray) + backend/src/common/types.ts asString. Local reimplementations to migrate: backend/src/kloel/unified-agent-actions-workspace.helpers.ts:20 coerceString, backend/src/kloel/product-sub-resources/helpers/common.helpers.ts:203 coerceString. CRITICAL: backend/src/marketing/tiktok-marketing.helpers.ts:124 readString + :129 readStringArray have a NAME COLLISION with common/parse but a DIFFERENT contract (returns null+trims vs canonical undefined+untrimmed) — do NOT blindly swap; either rename the local tiktok ones to avoid the collision (leaving their behavior), or migrate per-callsite ONLY if the null-vs-undefined difference is provably harmless. SKIP backend/src/kloel/kloel-tool-dispatcher.helpers.ts asString (LANE — protected). Prefer the 2 clear kloel coerceString migrations; be conservative on tiktok. Validate tsc+eslint+jest. Report which you migrated vs left + why.' },
  { key: 'CPF-CNPJ', prompt: BASE + '\n\nTASK CPF-CNPJ (backend, NON-lane, payment-ADJACENT so be careful): the canonical document-digit normalizer is backend/src/sales/sales.helpers.shared.ts:99 sanitizeDocumentDigits(raw) (already used across sales.service.*). Several checkout/payment sites re-inline a non-digit strip for CPF/CNPJ — an inline regex that removes every non-digit character from the document string (the same thing sanitizeDocumentDigits does) — e.g. backend/src/checkout/checkout-payment.arms.ts:175 and :243 (customerCPF). Replace ONLY the CPF/CNPJ document-digit strips that are behavior-identical to sanitizeDocumentDigits with an import of the canonical helper. Do NOT touch PHONE strips (handled by CANON-PHONE-01) or any strip with different semantics. This touches checkout/payment — verify behavior-identical per site; if any differs, SKIP it. Validate tsc+eslint+jest (run checkout/payment specs). Report diff + per-site confirmation.' },
]

const results = await parallel(
  tasks.map((t) => () => agent(t.prompt, { label: 'exec6:' + t.key, phase: 'Execute', schema: RESULT_SCHEMA, isolation: 'worktree' }))
)
return results.filter(Boolean)
