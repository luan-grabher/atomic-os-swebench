export const meta = {
  name: 'machine-fix-wave-C',
  description: 'Wave C: judgment backlog (marketplace placebo->honest, auth-guard judgment, whatsapp human-handoff consent, kloel cognitive controller tests), atomic-only, conservative on financial/auth',
  phases: [{ title: 'WaveC', detail: 'parallel judgment fixes + cognitive controller test coverage' }],
}

const ROOT = '/Users/danielpenin/whatsapp_saas'
const BE = `${ROOT}/backend`

const SCHEMA = {
  type: 'object',
  required: ['track', 'done', 'verified', 'summary'],
  properties: {
    track: { type: 'string' },
    done: { type: 'boolean' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    verified: { type: 'boolean' },
    verifyResult: { type: 'string' },
    summary: { type: 'string' },
    deferred: { type: 'string', description: 'anything left for human judgment + why' },
  },
}

const LAW = (
  `Repo root: ${ROOT}. PROJECT LAW: atomic-edit MCP for ALL mutations (ToolSearch select:mcp__atomic-edit__atomic_edit,mcp__atomic-edit__atomic_replace_text,mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__code_read_symbol,mcp__atomic-edit__atomic_add_import). NO Edit/Write, NO heredoc. Bash only for read/verify.\n` +
  `GUARDRAILS: no new \\bany\\b word / no @ts-ignore/eslint-disable/etc on added lines; new files <=400 lines, modified <=600; behavior-identical unless fixing a real bug; money bigint cents; never touch protected files (ops/*.json, scripts/ops/check-*, eslint.config.*, ai-models.ts, no-hardcoded-reality-audit.ts). Per REGRA MESTRA: where no real backend data exists, use an HONEST empty/setup state — do NOT fabricate data.\n` +
  `VERIFY: npx eslint changed files (0) + the relevant jest spec green. verified=true only if green. Return ONLY the structured finding.`
)

const tracks = [
  {
    key: 'marketplace-placebo',
    p: `Track: ${BE}/src/.../marketplace.service.ts getAffiliateLink returns hardcoded clicks:0 / sales:0 (placebo). Find it (grep -rn "getAffiliateLink" ${BE}/src). If a real data source exists (e.g. a clicks/conversions table or AuditLog/WebhookEvent the link's stats can be aggregated from), replace the hardcoded 0s with a real Prisma aggregation scoped by workspaceId + the affiliate/link id. If NO real source exists, keep it as an HONEST zero baseline but document it clearly (a comment that this is a real-but-empty baseline pending click tracking) — do NOT invent fake numbers. Add/extend a spec asserting the real query (or the honest baseline). Verify.`,
  },
  {
    key: 'auth-guard-judgment',
    p: `Track (risk=high-financial-auth, BE CONSERVATIVE): the discovery flagged 'Missing JwtAuthGuard on TikTok/Meta auth endpoints calling resolveWorkspaceId()' + 'WorkspaceGuard allows unauthenticated requests'. INVESTIGATE each: read the TikTok + Meta auth controllers in ${BE}/src. For EACH flagged endpoint determine: is it an OAuth CALLBACK invoked by the provider (no user JWT — MUST stay public; adding a guard BREAKS oauth) OR a user-action endpoint invoked by the logged-in user (needs JwtAuthGuard)? Add @UseGuards(JwtAuthGuard) ONLY to clear user-action endpoints that read user/workspace data without auth. For OAuth callbacks, leave them + note. For WorkspaceGuard: read it; if it truly allows a request through when unauthenticated (no req.user) in a way that leaks cross-workspace data, harden it to reject; if the 'allows unauthenticated' is by-design for a public path, leave + note. If ANY case is uncertain, DEFER it (report, do not change). Verify auth specs pass.`,
  },
  {
    key: 'whatsapp-handoff',
    p: `Track: WhatsApp human-handoff auto-reclaim overwrites conversation mode without consent (discovery flag). Find the auto-reclaim logic (grep -rn "handoff\\|reclaim\\|conversationMode\\|human" ${BE}/src ${ROOT}/worker for the autopilot/inbox handoff path). The bug: when autopilot auto-reclaims a conversation, it overwrites a human-set mode without checking whether a human explicitly took over. Fix: do NOT auto-reclaim if the conversation was explicitly handed to a human (respect the human-handoff flag); only auto-reclaim timed-out/abandoned ones. Behavior change is the FIX (respect handoff). Add/extend a spec. Verify.`,
  },
  {
    key: 'kloel-controller-tests',
    p: `Track: 6 unspecced kloel cognitive reply-engine CONTROLLER files (~1414 LOC, governance/needs-tests). Find them: list ${BE}/src/kloel/*.controller.ts (and kloel subdir controllers) WITHOUT a matching *.spec.ts. Write focused specs for the highest-value ones (the reply/chat/stream controllers): assert route wiring, auth guard presence, DTO validation, and that the controller delegates to the service + returns the real result (not a placebo). Reuse repo helpers (castMock, partialMatch). Each new spec <=400 lines, no \\bany\\b. The reply-engine now returns real replies in tests when OPENAI_API_KEY is set (set it in beforeAll if a controller test drives buildAssistantReply). Verify each new spec green.`,
  },
]

const results = await parallel(tracks.map((t) => () =>
  agent(`${LAW}\n\n${t.p}`, { label: `fixC:${t.key}`, phase: 'WaveC', schema: SCHEMA })
))

return { wave: 'C', results: results.filter(Boolean) }
