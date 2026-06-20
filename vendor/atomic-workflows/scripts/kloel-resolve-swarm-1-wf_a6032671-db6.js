export const meta = {
  name: 'kloel-resolve-swarm-1',
  description: 'Swarm 1 — resolve the unambiguous findings: Lean honesty bluff, OAuth cross-workspace lookup, MFA rate limit, stale PT-BR tests, missing embedding-write test coverage. Edit-only (no commit/push), then verify typecheck+tests.',
  phases: [
    { title: 'Fix', detail: '5 disjoint-file fix agents in parallel' },
    { title: 'Verify', detail: 'typecheck + targeted tests + atomic gate' },
  ],
}

const ROOT = '/Users/danielpenin/kloel'
const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    finding: { type: 'string' },
    status: { type: 'string', enum: ['FIXED', 'PARTIAL', 'BLOCKED', 'INVESTIGATED_NO_CHANGE'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    whatChanged: { type: 'string' },
    selfVerify: { type: 'string', description: 'command run + verbatim key result proving the fix compiles/passes or that nothing broke' },
    risk: { type: 'string', description: 'any risk of regression + what you did to bound it' },
    notes: { type: 'string' },
  },
  required: ['finding', 'status', 'filesChanged', 'whatChanged', 'selfVerify', 'risk'],
}
const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    checks: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { check: { type: 'string' }, command: { type: 'string' }, status: { type: 'string', enum: ['PASS', 'FAIL', 'PARTIAL'] }, keyOutput: { type: 'string' } },
      required: ['check', 'command', 'status', 'keyOutput'] } },
    overall: { type: 'string', enum: ['ALL_GREEN', 'MOSTLY_GREEN', 'BROKEN'] },
    regressionsIntroduced: { type: 'string' },
  },
  required: ['checks', 'overall', 'regressionsIntroduced'],
}

const COMMON = `You are fixing a real finding in the Kloel monorepo at ${ROOT}. EDIT the actual working-tree files to RESOLVE it. Rules: (1) minimal, correct, idiomatic fix matching surrounding code; (2) do NOT git commit or push — leave changes in the working tree; (3) do NOT touch files outside your assigned area (other agents edit other files concurrently); (4) ALWAYS self-verify: compile/run the relevant test for the file you changed and paste the verbatim result; if your change breaks something you cannot fix cleanly, REVERT your edit (git checkout -- <file>) and report BLOCKED rather than leaving the tree broken; (5) the repo mandates Brazilian-Portuguese user-facing strings and follows a 'no false-green / unjudged≡negative' honesty doctrine — align with it.`

phase('Fix')

const fixes = [
  { key: 'lean-honesty', label: 'fix: Lean false-green bluff', prompt: `${COMMON}
FINDING: scripts/mcp/atomic-edit/gates/algebra-nway.proof.mjs (and possibly sibling gates) prints a HARDCODED success string like "PROVEN (all-N) ... Lean (NwayConfluence.lean, exit 0)" WITHOUT ever invoking Lean; lean/lake are NOT installed. The Z3 portion (confluence_z3.py / nway_induction_z3.py) is genuinely machine-checked. This is a false-green that violates the repo's own no-false-green doctrine.
TASK: 
1. grep the gates dir + formal/ for the bluff strings: \`grep -rnE "PROVEN|exit 0|Lean" ${ROOT}/scripts/mcp/atomic-edit/gates ${ROOT}/formal\` and read algebra-nway.proof.mjs.
2. Check toolchain: \`which lean lake z3 python3 2>&1\`.
3. Make the Lean claim HONEST: the script must actually attempt to run Lean (e.g. \`lake build\` or \`lean <file>\`) and ONLY print a PROVEN/exit-0 success for the Lean all-N induction if Lean is present AND returns exit 0. If the Lean toolchain is ABSENT, it must print an honest status (e.g. "Lean all-N: UNVERIFIED — lean/lake not installed; Z3 base+step: PROVEN") and must NOT emit a green/PROVEN for the unrun Lean part. Keep the genuine Z3 run intact and still report its real result.
4. Preserve the script's overall exit semantics so it doesn't falsely fail the whole gate — distinguish 'Z3 proven (real)' from 'Lean unverified (toolchain absent)'.
5. Self-verify: run \`node ${ROOT}/scripts/mcp/atomic-edit/gates/algebra-nway.proof.mjs\` and paste output showing it now reports honestly.` },

  { key: 'oauth-scope', label: 'fix: OAuth cross-workspace lookup', prompt: `${COMMON}
FINDING: an OAuth resolver does \`findMany({ where: { email } })\` (or findFirst by email) WITHOUT a workspaceId filter — a cross-workspace email lookup (multi-tenant smell). It is mitigated by a ConflictException but is a real namespace-pollution/pre-registration risk. Approx auth-oauth-resolver ~line 90.
TASK:
1. LOCATE it: \`grep -rnE "findMany|findFirst" ${ROOT}/backend/src/auth | grep -i "email" \` and read the resolver + its callers to UNDERSTAND the flow. CRITICAL: OAuth callback may legitimately not know the workspace yet — do NOT blindly add a WHERE that breaks login. 
2. Determine the SAFEST correct fix: if the lookup must be cross-workspace by design, harden it (scope to workspace when the workspace context IS known; ensure the result cannot let one tenant's email pollute another's; tighten the ConflictException path; add an explicit comment explaining the multi-tenant invariant). If it should be workspace-scoped, add the workspaceId predicate.
3. Implement the fix WITHOUT breaking OAuth login.
4. Self-verify: run the auth/oauth tests \`cd ${ROOT}/backend && npx jest auth --silent 2>&1 | tail -20\` (or the specific oauth/login specs). If anything goes red that was green, REVERT and report BLOCKED with your analysis.` },

  { key: 'mfa-ratelimit', label: 'fix: MFA verifyCode rate limit', prompt: `${COMMON}
FINDING: MFA verifyCode lacks a layer-level rate limit (brute-force risk on the TOTP/SMS code). Files: backend/src/auth/account-mfa.service.ts and/or backend/src/admin/auth/admin-mfa.service.ts and their controllers.
TASK:
1. Read the MFA verify path and how the rest of the codebase does rate limiting (\`grep -rnE "Throttle|throttler|rateLimit|attempts" ${ROOT}/backend/src/auth ${ROOT}/backend/src/common | head\`). Reuse the EXISTING rate-limit mechanism/pattern — do not invent a new one if @nestjs/throttler or an attempts-counter helper already exists.
2. Add a sensible limit to the verifyCode endpoint/method (e.g. N failed attempts per window, then lockout/backoff), consistent with existing patterns. Prefer a method/route-level guard so you do NOT edit shared module files that another agent may touch.
3. Self-verify: \`cd ${ROOT}/backend && npx jest mfa --silent 2>&1 | tail -20\` and typecheck the changed file. Revert+BLOCKED if you break existing MFA tests.` },

  { key: 'stale-tests', label: 'fix: stale PT-BR tool-name tests', prompt: `${COMMON}
FINDING: 6 specs fail because they assert raw English tool names but the live code now emits PT-BR localized labels: kloel-thinker.service.spec.ts (5 fails: list_products/search_web/create_site/get_wallet_balance) and kloel-tool-router.spec.ts (1 fail: get_wallet_balance -> 'consulta operacional').
TASK:
1. First run \`cd ${ROOT}/backend && npx jest kloel-thinker.service kloel-tool-router --silent 2>&1 | tail -40\` to see exact expected-vs-received.
2. DETERMINE the correct fix: read the runtime code that emits these events. If the canonical machine tool-id is STILL present (only the human-facing LABEL was localized to PT-BR), update the test assertions to match the localized output (PT-BR is the repo mandate). BUT if the canonical tool-id was REPLACED by a PT-BR string (which would break machine consumers/dispatcher/frontend), that is a REAL BUG — fix the CODE to keep the canonical id and only localize the display label, instead of editing the tests.
3. Apply whichever is correct.
4. Self-verify: rerun the two suites and paste the green result (target 0 failures in both). Revert+report if you can't get them green cleanly.` },

  { key: 'embed-test', label: 'fix: embedding-write test coverage', prompt: `${COMMON}
FINDING: the embedding persistence path (memory.service.ts writeEmbedding -> raw SQL \`UPDATE "RAC_MemoryNode" SET "embedding" = ...::vector\`, ~lines 335-347, EMBED_DIM=1536, model text-embedding-3-small) is exercised by ZERO tests. memory.service.spec.ts:262 explicitly builds the service with undefined VectorService (degrades to recency ranking), so the embed->writeEmbedding->::vector UPDATE is never covered.
TASK:
1. Read backend/src/kloel/mind/memory/memory.service.ts (the writeEmbedding/embedOrNull/extractFromTurn path) and memory.service.spec.ts to learn the existing test harness/mocks (how prisma + $executeRaw and VectorService are mocked).
2. ADD a focused test (additive — do not weaken existing tests) that injects a VectorService stub returning a 1536-length vector, drives the extract/persist path, and asserts the raw ::vector UPDATE is invoked with the embedding (assert on the $executeRaw / raw-SQL mock, and that a <1536-length or null embedding skips the write per the guard at ~line 328/262).
3. Self-verify: \`cd ${ROOT}/backend && npx jest mind/memory/memory.service --silent 2>&1 | tail -20\` — the new test must PASS and existing ones must stay green.` },
]

const fixResults = await parallel(fixes.map(f => () => agent(f.prompt, { schema: FIX_SCHEMA, phase: 'Fix', label: f.label })))
const done = fixResults.filter(Boolean)
log(`Fix phase: ${done.filter(r => r.status === 'FIXED').length}/${fixes.length} FIXED, ${done.filter(r => r.status === 'BLOCKED').length} blocked`)

phase('Verify')

const verify = await agent(`${COMMON}
You are the VERIFY gate for Swarm 1. Confirm the 5 fixes landed correctly and introduced NO regressions. Run and report each:
1. Backend typecheck: \`cd ${ROOT}/backend && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -15; echo "EXIT:$?"\` (must be 0 errors).
2. The previously-failing kloel suites: \`cd ${ROOT}/backend && npx jest kloel-thinker.service kloel-tool-router --silent 2>&1 | tail -15\` (target 0 fails).
3. Memory suite incl. the new embed test: \`cd ${ROOT}/backend && npx jest mind/memory/memory.service --silent 2>&1 | tail -12\`.
4. Auth + MFA suites (regression check): \`cd ${ROOT}/backend && npx jest auth mfa --silent 2>&1 | tail -15\`.
5. The atomic Lean-honesty gate now reports honestly: \`node ${ROOT}/scripts/mcp/atomic-edit/gates/algebra-nway.proof.mjs 2>&1 | tail -15\`.
6. List exactly which files differ from HEAD now: \`cd ${ROOT} && git status --short | grep -vE "^.M (backend/src/kloel/(kloel-thinker|guest-chat|kloel-stream)|frontend)" | head\` — actually just run \`git -C ${ROOT} diff --name-only HEAD | head -60\` and report which look like THIS swarm's changes vs pre-existing dirty work.
Set overall=ALL_GREEN only if typecheck is 0 and no suite regressed. Report any regression explicitly.`, { schema: VERIFY_SCHEMA, phase: 'Verify', label: 'verify swarm 1' })

return { fixes: done, verify }