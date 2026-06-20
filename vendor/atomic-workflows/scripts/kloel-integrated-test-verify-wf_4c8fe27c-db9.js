export const meta = {
  name: 'kloel-integrated-test-verify',
  description: 'Run full backend jest + frontend/worker vitest + prisma validate, absorb output, return structured pass/fail for commit gating',
  phases: [{ title: 'Verify' }],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['exitCode', 'passed', 'summary', 'failures'],
  properties: {
    exitCode: { type: 'integer' },
    passed: { type: 'boolean' },
    summary: { type: 'string', description: 'suites/tests passed/failed counts if parseable' },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'test', 'error'],
        properties: {
          file: { type: 'string' },
          test: { type: 'string' },
          error: { type: 'string', description: '1-3 line verbatim error excerpt' },
        },
      },
    },
  },
}

const TASKS = [
  {
    key: 'backend-jest',
    prompt: `You are a CI verifier. Use ToolSearch with query "select:mcp__test-runner__run_jest" to load the tool, then call mcp__test-runner__run_jest with { timeoutMs: 900000 } (no testPath = run ALL backend unit jest suites). The output may be enormous — DO NOT echo it. Parse it and return ONLY the structured summary: exitCode, passed (exitCode===0), summary (e.g. "X suites Y tests, Z failed"), and for each FAILED test the file + test name + a 1-3 line verbatim error excerpt (empty array if all pass).`,
  },
  {
    key: 'frontend-vitest',
    prompt: `You are a CI verifier. Use ToolSearch with query "select:mcp__test-runner__run_vitest" to load the tool, then call mcp__test-runner__run_vitest with { package: "frontend", timeoutMs: 900000 } (no filter = run ALL frontend vitest). The output may be enormous — DO NOT echo it. Parse it and return ONLY the structured summary: exitCode, passed (exitCode===0), summary, and for each FAILED test the file + test name + a 1-3 line verbatim error excerpt (empty array if all pass).`,
  },
  {
    key: 'worker-vitest',
    prompt: `You are a CI verifier. Use ToolSearch with query "select:mcp__test-runner__run_vitest" to load the tool, then call mcp__test-runner__run_vitest with { package: "worker", timeoutMs: 600000 } (no filter). The output may be large — DO NOT echo it. Parse it and return ONLY the structured summary: exitCode, passed (exitCode===0), summary, and for each FAILED test the file + test name + a 1-3 line verbatim error excerpt (empty array if all pass).`,
  },
  {
    key: 'prisma-validate',
    prompt: `You are a CI verifier checking Prisma schema validity. Use ToolSearch with query "select:mcp__atomic-edit__atomic_exec" to load atomic_exec. Then call it with: { command: "cd \\"$(git rev-parse --show-toplevel)\\" && (npm run prisma:validate 2>&1 | tail -20); echo EXIT_PV=\${PIPESTATUS[0]:-$?}", cwd: "/Users/danielpenin/whatsapp_saas/frontend/src/components/kloel/conta", proveEffect: true, env: { NODE_COMPILE_CACHE: "" }, timeoutMs: 120000 }. The cwd MUST be that small leaf dir (the repo root is too big for the byte snapshot). Ignore the verbose effect.files (node compile cache). Return: exitCode (from EXIT_PV), passed (EXIT_PV===0), summary (the prisma validate message), failures (empty unless validation failed, then file="schema.prisma", test="prisma validate", error=the message).`,
  },
]

phase('Verify')
const results = await parallel(
  TASKS.map((t) => () =>
    agent(t.prompt, { label: t.key, phase: 'Verify', schema: SCHEMA }).then((r) => ({ key: t.key, ...(r || { exitCode: -1, passed: false, summary: 'agent returned null', failures: [] }) }))
  )
)
return results