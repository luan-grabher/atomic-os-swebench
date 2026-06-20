export const meta = {
  name: 'pr462-architecture-fix',
  description: 'Fix the 22 mine/canonicalization architecture-guardrail violations on PR #462 (split oversized files, fix any-lines), one agent per file, each verified',
  phases: [
    { title: 'SpecSplit', detail: 'split 9 oversized spec files into part2 siblings' },
    { title: 'SourceExtract', detail: 'extract cohesive helpers from 7 oversized source files' },
    { title: 'AnyFix', detail: 'remove the word any from 5 added spec lines' },
  ],
}

const ROOT = '/Users/danielpenin/whatsapp_saas'
const BE = `${ROOT}/backend`

const SCHEMA = {
  type: 'object',
  required: ['file', 'beforeLines', 'afterLines', 'method', 'verified', 'violationCleared'],
  properties: {
    file: { type: 'string' },
    beforeLines: { type: 'number' },
    afterLines: { type: 'number' },
    newSiblings: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, lines: { type: 'number' } } } },
    method: { type: 'string', description: 'what was extracted/moved and how behavior was preserved' },
    verified: { type: 'boolean', description: 'true ONLY if the verification command (jest/tsc) passed green' },
    verifyCmd: { type: 'string' },
    verifyResult: { type: 'string' },
    violationCleared: { type: 'boolean', description: 'true if the original file is now under its line limit AND new siblings are <=400 lines with no any/disable on added lines' },
    notes: { type: 'string' },
  },
}

const COMMON = (
  `Repo root: ${ROOT}. Backend: ${BE}. You are fixing ONE architecture-guardrail violation for PR #462.\n` +
  `GATE RULES (scripts/ops/check-architecture-guardrails.mjs, PROTECTED — do NOT edit it):\n` +
  `- A NEW file (git status A vs origin/main) must be <= 400 lines.\n` +
  `- A MODIFIED file (M) must be <= 600 lines.\n` +
  `- Any ADDED line must NOT contain the word any (\\bany\\b, excluding pure-comment lines), nor @ts-ignore/@ts-expect-error/@ts-nocheck/eslint-disable/biome-ignore/nosemgrep/codacy:disable/codacy:ignore/NOSONAR/noqa.\n` +
  `HARD CONSTRAINTS:\n` +
  `- Behavior-IDENTICAL. Preserve every test assertion and every public export/class API. No suppression comments (forbidden). No git restore.\n` +
  `- Any NEW sibling file you create is itself a NEW file: it must be <= 400 lines AND contain no banned token (any/disable/etc.) on its lines, or you just created a new violation. Split further if needed.\n` +
  `- Prefer mechanical moves: for SPEC files move whole top-level describe(...) blocks (with their needed imports/setup) into a sibling .part2.spec.ts (or .part3 if part2 exists). For SOURCE files extract a COHESIVE unit (a group of private helpers, a constants/map block, or a sub-builder) into a sibling .helpers.ts (reuse an existing *.helpers.ts in the same dir if present) and import it back. Avoid circular imports.\n` +
  `- Use atomic-edit MCP tools when helpful (load via ToolSearch select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_edit,mcp__atomic-edit__code_read_symbol) — they syntax-validate. Plain Edit/Write also OK.\n` +
  `VERIFY before returning: run the file's jest spec from ${BE} with a memory cap, e.g.: NODE_OPTIONS=--max-old-space-size=2048 npx jest --runInBand --silent <relative-spec-path(s)> 2>&1 | grep -iE "Tests:|Test Suites:|FAIL". Set verified=true ONLY if 0 failures. Then re-check line counts with: wc -l <original> <new siblings>. Set violationCleared=true ONLY if original is under limit and siblings <=400.\n` +
  `Return ONLY the structured finding.`
)

// ── Phase 1: SPEC splits (9) ──
const SPECS = [
  { f: 'src/auth/auth.service.spec.ts', lines: 610, lim: 600, kind: 'M' },
  { f: 'src/autopilot/autopilot-cycle-executor.service.spec.ts', lines: 601, lim: 600, kind: 'M' },
  { f: 'src/kloel/cognitive-loop-liveness.proof.spec.ts', lines: 589, lim: 400, kind: 'A' },
  { f: 'src/kloel/cognitive-loop-realdb.proof.integration.spec.ts', lines: 403, lim: 400, kind: 'A' },
  { f: 'src/kloel/cross-service-canonical-aliases.spec.ts', lines: 402, lim: 400, kind: 'A' },
  { f: 'src/kloel/domain-service-resolver.service.spec.ts', lines: 425, lim: 400, kind: 'A' },
  { f: 'src/kloel/kloel-thinker.service.spec.ts', lines: 624, lim: 600, kind: 'M' },
  { f: 'src/kloel/unified-agent-actions.service.spec.ts', lines: 601, lim: 600, kind: 'M' },
  { f: 'src/partnerships/partnerships.service.spec.ts', lines: 606, lim: 600, kind: 'M' },
]

// ── Phase 2: SOURCE extractions (7) ──
const SOURCES = [
  { f: 'src/affiliate/affiliate.service.ts', lines: 433, lim: 400, kind: 'A', hint: 'extract private helper methods or a constants/types block into affiliate.service.helpers.ts (create if absent); keep the @Injectable class + its public methods intact.' },
  { f: 'src/kloel/capability-registry-v2/partitions/tier-1-products.ts', lines: 470, lim: 400, kind: 'A', hint: 'this exports a const capability array. Move ~half the capability objects into a sibling tier-1-products.part2.ts exporting a PART array, then in the original do export const TIER_1_PRODUCTS_CAPABILITIES = [...PART1, ...PART2]. Keep the exported name + order stable.' },
  { f: 'src/kloel/domain-service-resolver.service.ts', lines: 481, lim: 400, kind: 'A', hint: 'extract the compound-dispatch handlers (executeCompound/invokeService/invokeImageSetter) and/or the SERVICE_TOKEN_MAP builder into domain-service-resolver.helpers.ts; keep the @Injectable KloelDomainServiceResolver class + tryExecute public API intact. Beware the import cycle — keep the lazy getServiceTokenMap pattern.' },
  { f: 'src/marketing/channel-message-dispatch.service.ts', lines: 465, lim: 400, kind: 'A', hint: 'extract per-channel dispatch helper functions or payload-builders into channel-message-dispatch.helpers.ts; keep the service class API intact.' },
  { f: 'src/kloel/mind/coordination/mind-event-taxonomy.ts', lines: 404, lim: 400, kind: 'A', hint: 'only 4 lines over — move a cohesive constants/map block or a group of exported helpers into a sibling mind-event-taxonomy.part2.ts and re-export; keep all existing exports importable from the original path (re-export from it).' },
  { f: 'src/checkout/checkout.service.ts', lines: 701, lim: 600, kind: 'M', hint: 'PAYMENT-CRITICAL — be conservative. Extract a cohesive non-financial unit (e.g. mapping/validation/formatting helpers) into the EXISTING checkout.service.helpers.ts. Do NOT alter ledger/split/amount logic. Verify with the checkout specs.' },
  { f: 'src/kloel/guest-chat.service.ts', lines: 645, lim: 600, kind: 'M', hint: 'extract cohesive helpers into an existing guest-chat.*.helper(s).ts sibling (e.g. guest-chat.terminal-hooks.helper.ts or a new guest-chat.dispatch.helpers.ts); keep the service class + SSE path intact.' },
]

const specResults = parallel(SPECS.map((s) => () =>
  agent(
    `${COMMON}\n\nTARGET SPEC FILE: ${s.f} (currently ${s.lines} lines, status ${s.kind}, limit ${s.lim}). ` +
    `Split it so ${s.f} is <= ${s.lim} lines. Move whole top-level describe() block(s) into a new sibling ${s.f.replace(/\.spec\.ts$/, '.part2.spec.ts')} (use .part3 if part2 already exists), copying the needed imports + any shared top-level setup/helpers into the new file (or import them). Both files must run independently. New sibling must be <= 400 lines.\n` +
    `Verify: cd ${BE} && NODE_OPTIONS=--max-old-space-size=2048 npx jest --runInBand --silent ${s.f} ${s.f.replace(/\.spec\.ts$/, '.part2.spec.ts')} 2>&1 | grep -iE "Tests:|Test Suites:|FAIL".`,
    { label: `spec:${s.f.split('/').pop()}`, phase: 'SpecSplit', schema: SCHEMA },
  ),
))

const sourceResults = parallel(SOURCES.map((s) => () =>
  agent(
    `${COMMON}\n\nTARGET SOURCE FILE: ${s.f} (currently ${s.lines} lines, status ${s.kind}, limit ${s.lim}). ` +
    `Reduce it to <= ${s.lim} lines by EXTRACTION. ${s.hint}\n` +
    `Verify: cd ${BE} && find a spec that imports this file (e.g. ${s.f.replace(/\.ts$/, '.spec.ts')} or a partition/integration spec) and run it: NODE_OPTIONS=--max-old-space-size=2048 npx jest --runInBand --silent <spec> 2>&1 | grep -iE "Tests:|Test Suites:|FAIL". If no direct spec, run the directory's specs. Also confirm imports resolve.`,
    { label: `src:${s.f.split('/').pop()}`, phase: 'SourceExtract', schema: SCHEMA },
  ),
))

// ── Phase 3: any-line fixes (1 agent, 5 lines across files NOT in the size lists) ──
const anyResult = agent(
  `${COMMON}\n\nFix these 5 ADDED lines that contain the banned word any (architecture gate no_new_any), in ${BE}. Behavior-IDENTICAL:\n` +
  `1. src/kloel/account.service.spec.ts:110 — \`expect.any(Function),\`: replace with a matcher that has no \"any\" word. Preferred: capture the call arg (mock.mock.calls[i][j]) and assert typeof === 'function' in a separate expect; OR if it is inside toHaveBeenCalledWith, restructure to capture the recorded arg and assert typeof. Keep the assertion strength (it IS a function).\n` +
  `2. src/kloel/kloel-reply-engine.emotional-tone.helpers.spec.ts:133 — \`expect.any(Object),\`: replace with \`expect.objectContaining({})\` (matches any object, no \"any\" word). Behavior-equivalent.\n` +
  `3. src/kloel/kloel-tool-executor-crm.service.spec.ts:395 — \`...toHaveBeenCalledWith('ws-isolated', expect.any(Object))\`: replace expect.any(Object) with expect.objectContaining({}).\n` +
  `4. src/marketing/facebook-messenger.routes.boot.spec.ts:88 — test title string \"does not silently lose any of the 6 declared routes\": reword to remove the word any, e.g. \"...lose even one of the 6 declared routes\" or \"...preserves all 6 declared routes\". Title text only — no logic change.\n` +
  `5. src/marketing/instagram/instagram-marketing.routes.boot.spec.ts:89 — same, \"...any of the 8 declared routes\" -> reword to drop \"any\" (e.g. \"preserves all 8 declared routes\").\n` +
  `After editing, GREP to confirm none of these 5 lines still contain \\bany\\b. Verify: cd ${BE} && NODE_OPTIONS=--max-old-space-size=2048 npx jest --runInBand --silent src/kloel/account.service.spec.ts src/kloel/kloel-reply-engine.emotional-tone.helpers.spec.ts src/kloel/kloel-tool-executor-crm.service.spec.ts src/marketing/facebook-messenger.routes.boot.spec.ts src/marketing/instagram/instagram-marketing.routes.boot.spec.ts 2>&1 | grep -iE "Tests:|Test Suites:|FAIL". Set verified=true only if 0 failures.`,
  { label: 'anyfix:5-spec-lines', phase: 'AnyFix', schema: SCHEMA },
)

const [specs, sources, anyfix] = await Promise.all([specResults, sourceResults, anyResult])
return { specSplits: specs.filter(Boolean), sourceExtractions: sources.filter(Boolean), anyFix: anyfix }
