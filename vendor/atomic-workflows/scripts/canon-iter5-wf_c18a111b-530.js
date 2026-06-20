export const meta = {
  name: 'canon-iter5',
  description: 'Canonicalization iter 5: Voice→Mind percept + getWorkspaceId→resolveWorkspaceId tenant canonicalization',
  phases: [{ title: 'Execute', detail: '2 executors: voice-percept, tenant-resolver-converge' }],
}
const SCHEMA = {
  type: 'object',
  required: ['task', 'status', 'filesChanged', 'behaviorPreserved', 'verification', 'summary'],
  properties: {
    task: { type: 'string' }, status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } }, behaviorPreserved: { type: 'boolean' },
    verification: { type: 'string' }, summary: { type: 'string' }, notes: { type: 'string' },
  },
}
phase('Execute')
const results = await parallel([
  () => agent(
    `Wire the Voice subsystem to emit a cognition percept into the Kloel Mind spine in /Users/danielpenin/kloel — ADDITIVE, flag-gated (default OFF). Doctrine: all cognition → ONE Mind. Replicate the Flows/CIA percept idiom (study backend/src/kloel/mind/cia/cia-percept-emit.helper.ts + .flag.ts — idempotent prisma.mindOutboxEvent.upsert of a cognition.* eventType, flag process.env.X==='true' DEFAULT OFF, fire-and-forget try/catch).
Find the Voice subsystem (backend/src/voice and/or backend/src/kloel voice/clone surfaces). The census noted Voice is mostly transcription-only with no reply turn — so find ANY genuine cognition/commercial signal it produces (e.g. voice clone created, transcription completed, a voice action executed) and emit it as a percept (e.g. cognition.voice.clone_created / cognition.voice.action_executed) behind a new flag KLOEL_VOICE_PERCEPT_ENABLED (DEFAULT OFF). If there is genuinely NO meaningful cognition seam (pure media transcoding with no decision/action/learning signal), set status="blocked" and explain precisely what Voice does and why no percept is warranted — do NOT invent a fake signal.
Use atomic-edit MCP (builtin Edit fallback). Add a test (OFF=no emit, ON=emit) if a seam exists. VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep -iE "voice"\` empty for your files; run touched specs. DO NOT COMMIT. Return schema. task="voice-percept".`,
    { label: 'exec:voice-percept', phase: 'Execute', schema: SCHEMA }
  ),
  () => agent(
    `Canonicalize tenant resolution in /Users/danielpenin/kloel: converge the non-validating \`getWorkspaceId\` helper onto the canonical \`resolveWorkspaceId\` (backend/src/auth/workspace-access.ts:119, which THROWS on missing access) — SECURITY-SENSITIVE, so be CAREFUL and per-site.
getWorkspaceId (backend/src/kloel/product-sub-resources/helpers/common.helpers.ts:20) returns \`req.user?.workspaceId || req.workspaceId || ''\` with NO assertWorkspaceAccess and an empty-string fallback — a footgun. ~13 files use it.
FOR EACH of the ~13 call sites (grep them):
- Determine whether replacing getWorkspaceId(req) with resolveWorkspaceId(req) is SAFE: it is safe ONLY if the caller does NOT rely on the empty-string-fallback behavior (i.e. an unauthenticated/missing-workspace request reaching this code should legitimately throw/401, OR there is already a downstream ensureWorkspaceProductAccess that would catch ''). resolveWorkspaceId THROWS instead of returning '' — confirm each call site's surrounding guard handles a thrown Forbidden/Unauthorized the same way (controllers under JwtAuthGuard+WorkspaceGuard already guarantee req.user.workspaceId, so resolveWorkspaceId is strictly safer there).
- Convert ONLY the safe ones; for any site where throwing would change a deliberate empty-string/anonymous path, LEAVE it and list it under notes as needs-human-review.
- Update imports. Behavior change is INTENDED to be "stricter/safer" (throw vs silent '') ONLY where that is correct.
Use atomic-edit MCP (builtin Edit fallback). Run/adjust tests for converted sites. VERIFY: \`cd backend && npx tsc -p tsconfig.build.json --noEmit | grep -E "<converted files>"\` empty; run touched specs; \`npm run check:boundaries\` + \`npm run check:casts\` exit 0. DO NOT COMMIT. behaviorPreserved=false is acceptable here IF the only change is silent-'' → safe-throw at properly-guarded sites (explain). Return schema. task="tenant-resolver-converge".`,
    { label: 'exec:tenant-resolver', phase: 'Execute', schema: SCHEMA }
  ),
])
return results.filter(Boolean)
