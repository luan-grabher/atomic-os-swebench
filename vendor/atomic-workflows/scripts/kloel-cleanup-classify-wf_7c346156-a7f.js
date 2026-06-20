export const meta = {
  name: 'kloel-cleanup-classify',
  description: 'Read-only classification of the whole repo for the Kloel rename+cleanup: per-item DELETE/MOVE/KEEP/ASK with wiring evidence',
  phases: [{ title: 'Classify', detail: '6 buckets classified in parallel with build-wiring verification' }],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bucket', 'items'],
  properties: {
    bucket: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'verdict', 'reason'],
        properties: {
          path: { type: 'string', description: 'repo-relative path or glob' },
          gitTracked: { type: 'boolean' },
          verdict: { type: 'string', enum: ['KEEP', 'DELETE', 'MOVE', 'ASK'] },
          reason: { type: 'string', description: 'one line with the deciding evidence (imported by X / orphan / pulse-scanner artifact / agent-cli / junk / protected)' },
        },
      },
    },
  },
}

const ROOT = '/Users/danielpenin/whatsapp_saas'
const RULES = `
You are classifying files in the KLOEL monorepo (NestJS backend, Next.js frontend, BullMQ worker) for a mass cleanup. Repo root: ${ROOT}.
Classification rules:
- KEEP = required to BUILD or RUN Kloel (backend/frontend/worker/frontend-admin/e2e), OR Kloel CI/infra config, OR imported/referenced by Kloel build. When unsure if something is wired in, GREP for imports/references across backend/src, frontend/src, worker/src, package.json scripts before deciding.
- DELETE = PULSE certification SCANNER system (scripts/pulse/**, root PULSE_*.json, ratchet.json, VALIDATION_LOG.md, artifacts/pulse*, pulse scanner docs) OR genuinely useless/orphan/legacy/dead junk with ZERO references.
- MOVE = AI-agent-CLI tooling (claude/codex/agents/opencode/kilo/hermes/serena/omx/world/beads/canon-fleet/etc.) that is NOT part of the Kloel build — it gets deleted from GitHub but MOVED out of the folder on the Mac (so verdict MOVE).
- ASK = genuinely ambiguous, OR a PROTECTED file (CLAUDE.md, AGENTS.md, .github/workflows/ci-cd.yml, backend/eslint.config.mjs, frontend/eslint.config.mjs, worker/eslint.config.mjs, ops/*.json, scripts/ops/check-*.mjs, scripts/ops/lib/*.mjs, .husky/pre-push, backend/src/lib/ai-models.ts, the locked auditor scripts/pulse/no-hardcoded-reality-audit.ts), OR anything whose deletion MIGHT affect the Kloel build.
CRITICAL LANDMINE: files with 'pulse' in the name under backend/src, frontend/src, worker/src are KLOEL RUNTIME CODE (AI guardrails: pulse-gates, pulse-truth-snapshot, pulse-self-model — imported by app.module.ts/kloel.module.ts) → KEEP, NOT delete.
CONSTRAINT: scripts/mcp/** (MCP servers) and .mcp.json must NOT be deleted/moved — verdict KEEP (owner said don't touch MCPs yet).
Use Bash (git ls-files, grep -r) and Read. Be precise and evidence-based. Prefer ASK over DELETE when uncertain. Return ONLY the structured verdict list.`

phase('Classify')

const buckets = [
  {
    key: 'pulse-scanner',
    prompt: `${RULES}\n\nBUCKET: PULSE certification SCANNER system. Enumerate every file that belongs to the PULSE scanner/certification tooling: scripts/pulse/** , root-level PULSE_*.json, ratchet.json, VALIDATION_LOG.md, artifacts/pulse* , any docs/** about PULSE, any .github/workflows steps named pulse, package.json scripts invoking pulse, .world/WORLD_LEDGER*. For EACH, give a verdict (DELETE for scanner artifacts; ASK for protected ones like ci-cd.yml pulse steps, CLAUDE.md pulse sections, the locked auditor scripts/pulse/no-hardcoded-reality-audit.ts). EXCLUDE backend/frontend/worker src 'pulse'-named files (those are Kloel runtime → do not list, or list as KEEP). Run: git ls-files | grep -i pulse ; ls PULSE_*.json ; and grep package.json for pulse.`,
  },
  {
    key: 'agent-cli-tracked',
    prompt: `${RULES}\n\nBUCKET: AI-agent-CLI tracked dirs/files. Classify these (all should be MOVE unless protected/MCP): .agents .claude .codex .opencode .opencode-prompts .kilo .hermes .omx .serena .world .pr198-agents .beads .canon-fleet .gitnexus .codegraph .atomic .task-graph AGENTS.md CODEX.md opencode.json .coderabbit.yaml .serena . For each, FIRST verify it is NOT imported/required by the Kloel build (grep backend/src frontend/src worker/src package.json for references). Verdict MOVE for agent tooling. Verdict ASK for: CLAUDE.md (protected), AGENTS.md (protected but owner wants agent stuff gone — mark ASK), .mcp.json (MCP, KEEP). List git-tracked status per item (git ls-files <dir> | head).`,
  },
  {
    key: 'root-configs',
    prompt: `${RULES}\n\nBUCKET: root-level config files. Classify each: .codacy.yml .coderabbit.yaml knip.json biome.json .markdownlint.json .markdownlint-cli2.yaml .sqlfluff .cspell.json .backup-manifest.json .backup-policy.json .backup-validation.log .data-retention.json .dr-test.log .release-please-manifest.json release-please-config.json .eslint-seatbelt.tsv codecov.yml commitlint.config.cjs .env.example .editorconfig .gitignore .dockerignore .prettierrc.json .prettierignore .eslintrc.json package.json package-lock.json railway.toml docker-compose.yml docker-compose.prod.yml docker-compose.test.yml README.md ARCHITECTURE.md SECURITY.md TESTING.md RUNBOOK.md CHANGELOG.md . KEEP the ones that drive the Kloel build/CI/format/lint/deploy. For quality tools (codacy/coderabbit/knip/markdownlint/sqlfluff/cspell), check if they are wired into package.json scripts or CI; if actively used → KEEP, if orphan → ASK. For .backup-*/.data-retention/.dr-test.log/.release-please/.eslint-seatbelt → check usage, likely ASK or DELETE if orphan.`,
  },
  {
    key: 'untracked-junk',
    prompt: `${RULES}\n\nBUCKET: UNTRACKED on-disk junk (NOT in git). Run: git status --porcelain --ignored | head -300 ; and ls -1A ${ROOT}. Classify untracked scratch/cache items: 32-hex-char-named files, .r_*.txt, .CONSOLIDATED*.txt, .FACTS.txt, agent-audit-* dirs, claude_statusline_git_*, repro-tmpdir-write, xcrun_db, typescript-language-server501, v8-compile-cache-501, node-compile-cache, HUD_LAST_REFRESH.json, SESSION_STATE.md, .tabhooks.txt, .mcp-cache, .codex-hook-tmp, .atomic-edit-locks, .tmp, test-results, jest_dx, .CONSOLIDATED, .vercel, opencode (untracked dir), graphify-out . Verdict DELETE for clear scratch/cache/agent-audit junk. Verdict KEEP for build caches needed by Kloel: node_modules, .next, frontend/.next. Verdict ASK for .env.pulse.local (gitignored secrets), .vercel (deploy state — KEEP actually). Do NOT touch node_modules. Note which are likely ACTIVE concurrent-agent scratch (recent mtime) → mark ASK.`,
  },
  {
    key: 'top-dirs',
    prompt: `${RULES}\n\nBUCKET: top-level Kloel dirs + their orphan sub-parts. Verify these are KEEP and find any non-Kloel subfolders inside them: backend frontend worker frontend-admin e2e docs intents tools state ops docker nginx . Specifically scan docs/ for agent/pulse subfolders (docs/atomic, docs/ai, docs about pulse/agents → MOVE or DELETE), scan tools/ and state/ and intents/ for orphan content. Run: ls -1 docs/ ; ls -1 tools/ ; ls -1 state/ ; ls -1 intents/ . KEEP the dirs themselves; list sub-paths that are agent-CLI (MOVE) or pulse (DELETE).`,
  },
  {
    key: 'scripts-subtree',
    prompt: `${RULES}\n\nBUCKET: scripts/ subtree. Run: ls -1 scripts/. Classify each subdir: scripts/pulse (DELETE — but the locked auditor no-hardcoded-reality-audit.ts is ASK), scripts/mcp (KEEP — MCP servers, do not touch), scripts/ops (KEEP — protected Kloel infra, check-*.mjs is protected), scripts/cognitive (check if wired into Kloel — cognitive-hub MCP data extract, likely KEEP or MCP), scripts/dev scripts/orchestration scripts/ci scripts/db scripts/migrations etc. For each subdir verify via grep whether package.json scripts or CI reference it. Agent/orchestration-only scripts → MOVE; pulse → DELETE; Kloel build/db/ci → KEEP.`,
  },
]

const results = await parallel(
  buckets.map((b) => () =>
    agent(b.prompt, { label: `classify:${b.key}`, phase: 'Classify', schema: VERDICT_SCHEMA, agentType: 'Explore' })
  )
)

return results.filter(Boolean)
