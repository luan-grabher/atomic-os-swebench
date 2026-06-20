export const meta = {
  name: 'strict-mode-fix-pr488',
  description: 'Fix all 275 backend strict-mode type errors across 76 file-groups for PR #488 T13',
  phases: [{ title: 'Fix', detail: 'one agent per disjoint file-group fixes its strict errors' }],
}

const N = args && Number.isInteger(args.count) ? args.count : 76
const RULES = `Fix each error PROPERLY:
- TS18048/TS2532/TS2531/TS18047 (possibly undefined/null): add a guard (early return/throw matching surrounding patterns), optional chaining ?., nullish default ??, or narrow the type. Preserve existing happy-path behavior; for a genuinely-absent value handle it the way nearby code does.
- TS2345/TS2322 (not assignable, usually null/undefined -> non-null): guard/default the value or correct the type so the assignment/argument is valid.
- TS7006 (implicit any param): add the correct explicit type inferred from usage; never 'any'.
- TS2783/TS2538/TS2769/TS2339: read the code and apply the minimal correct fix.
HARD RULES: never use 'any', 'as any', '@ts-ignore', '@ts-expect-error'. Avoid '!' non-null assertions unless provably safe (justify in risky). No console.log/debugger. Do not add unused vars/params (noUnusedLocals/noUnusedParameters are ON). Match surrounding style. Preserve runtime behavior. Do NOT edit any tsconfig*.json. Do NOT git commit/push. Do NOT run the full project tsc (central verification runs separately). Read the actual code around each error line before editing. You may use atomic-edit MCP tools (mcp__atomic-edit__*, load via ToolSearch) for guarded edits if helpful; the Edit tool is also fine.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'filesChanged', 'status', 'risky'],
  properties: {
    label: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    status: { type: 'string', enum: ['all-fixed', 'partial', 'blocked'] },
    risky: { type: 'string', description: 'any non-null assertions or behavior changes flagged, or "none"' },
    notes: { type: 'string' },
  },
}

const labels = Array.from({ length: N }, (_, i) => 'g' + i)

const results = await parallel(
  labels.map((label) => () =>
    agent(
      `You fix TypeScript strict-mode errors in a small set of backend files for PR #488. Working dir: /Users/danielpenin/kloel/backend (NestJS + Prisma).

Step 1: Read your assignment file: /Users/danielpenin/kloel/.git/strict-task-${label}.json . It has { files: [paths], errors: { path: [exact tsc error lines with file:line:col + message] } }. The project's REAL tsconfig has strict OFF; a probe config tsconfig.strict-probe.json turns it ON — your job is to make ONLY your assigned files pass strict.

Step 2: For EACH assigned file, open it, locate each error by its line:col, and fix it. ${RULES}

Step 3: Return the structured result. status='all-fixed' if you addressed every listed error for every assigned file; 'partial' if some remain; 'blocked' if you could not edit. Put any '!' usages or behavior changes in 'risky'.

label=${label}`,
      { label: `strict:${label}`, phase: 'Fix', schema: SCHEMA },
    ),
  ),
)

const fixed = results.filter(Boolean)
return {
  groups: N,
  returned: fixed.length,
  allFixed: fixed.filter((r) => r.status === 'all-fixed').length,
  partial: fixed.filter((r) => r.status === 'partial').map((r) => r.label),
  blocked: fixed.filter((r) => r.status === 'blocked').map((r) => r.label),
  risky: fixed.filter((r) => r.risky && r.risky !== 'none').map((r) => ({ label: r.label, risky: r.risky })),
  filesChanged: fixed.flatMap((r) => r.filesChanged || []),
}
