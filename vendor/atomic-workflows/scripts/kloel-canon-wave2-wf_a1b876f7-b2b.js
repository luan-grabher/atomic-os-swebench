export const meta = {
  name: 'kloel-canon-wave2',
  description: 'Wave 2: finish recon (canonicalization gaps + production completeness) + verify the auth/pool P0 exact safe fix + map the Kloel Mind unification safe boundary — all structured + actionable',
  phases: [{ title: 'Wave2', detail: '4 focused streams: canon-gaps, prod-completeness, auth-P0-fix, mind-boundary' }],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['stream', 'summary', 'items'],
  properties: {
    stream: { type: 'string' },
    summary: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'files', 'action', 'safeNow'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          files: { type: 'string', description: 'real file:line refs verified by grep/read' },
          evidence: { type: 'string' },
          action: { type: 'string', description: 'concrete migration/fix step' },
          safeNow: { type: 'boolean', description: 'true if executable now WITHOUT colliding with concurrent agents in backend/src/kloel/{thinker,reply-engine,wrapper,stream,tool-dispatcher} or backend/src/pulse' },
        },
      },
    },
  },
}

const BASE = `Senior architect, EVIDENCE-BASED recon on KLOEL monorepo (root /Users/danielpenin/kloel). NestJS backend / Next.js frontend / BullMQ worker. Use Bash (rg/git grep/wc), Read, codegraph/lsp MCPs. Measure real code — do NOT trust .md docs. Cite real file:line + real counts; never speculate. CONCURRENT AGENTS live in backend/src/kloel/{thinker,reply-engine,openai-wrapper,stream,tool-dispatcher} + deleting backend/src/pulse → mark those collision-prone. Mission: canonicalize semantics (one official name/service/event/capability) + make everything production-ready + dissolve all cognition (Brain/Mind/CIA/Flows/Autopilot/Copilot/Voice) into ONE 'Kloel Mind'. You MUST finish by calling the StructuredOutput tool with {stream, summary, items[]}. Each item needs a real safeNow boolean.`

phase('Wave2')

const streams = [
  { key: 'canon-gaps', prompt: `${BASE}\n\nSTREAM: CANONICALIZATION GAPS. Find duplicate CAPABILITIES with multiple implementations and name the canonical one + the migration. Specifically count/locate implementations of: message dispatch (rg "sendMessage|sendText|dispatchText|wahaSend|dispatch\\(" in backend/src), phone normalization (rg "normalizePhone|normalize.*phone"), tenant/workspace resolution (rg "resolveTenant|resolveWorkspace|workspaceId.*resolve"), webhook parsing (rg "parseWebhook|webhook.*parse"), idempotency (rg "idempotenc"). Also rg emit sites for legacy non-canonical events (kloel\\.|agent\\.|autopilot\\.|bare names like message.received/product.created) vs canonical commerce.*/cognition.*/channel.*. For each duplication group: list all impls (file:line), pick canonical, give the migration action, set safeNow. Rank P0-P3.` },
  { key: 'prod-completeness', prompt: `${BASE}\n\nSTREAM: PRODUCTION COMPLETENESS. Inventory what is NOT production-ready. Find: backend controllers returning empty arrays / {ok:true} / NotImplemented (rg "return \\[\\]|return \\{ ?ok: ?true|NotImplemented|TODO|FIXME" in backend/src/*/*.controller.ts); frontend fabricated data (rg "Math\\\\.random|hardcoded" in frontend/src + literal data arrays rendered as metrics); frontend dead API calls (apiFetch to endpoints that 404). Focus TIER 3/4 facade modules: Anuncios, Marketing(frontend), Sites, Vendas, Canvas, Funnels, Webinarios, Leads. For each gap: module → exact file:line → concrete fix → safeNow. Rank by user-facing impact.` },
  { key: 'auth-P0-fix', prompt: `${BASE}\n\nSTREAM: AUTH /auth/refresh P0 — produce the EXACT minimal SAFE fix (do not guess). Read backend/src/auth/auth.token.service.ts (esp. the refresh() method, runSerializableWithRetry, and the fire-and-forget sibling sweep ~line 363) + backend/src/prisma/prisma.service.ts (constructor, no pool config) + backend/.env.example (DATABASE_URL has no connection_limit). Determine: (1) is the unawaited updateMany sweep actually a connection leak or is it benign (the promise releases its connection on completion)? (2) what is the SAFEST minimal change to stop 'too many clients' WITHOUT changing auth hot-path latency/security — e.g. cap sweep concurrency, add connection_limit to DATABASE_URL, raise P2034 retry from 1 to 3 with backoff? Give the EXACT patch (file + before/after snippet) for the lowest-risk fix, and rank alternatives. Mark safeNow=true only if you are confident it won't regress auth/payments. This is auth — be conservative.` },
  { key: 'mind-boundary', prompt: `${BASE}\n\nSTREAM: KLOEL MIND UNIFICATION BOUNDARY. The target: dissolve Brain (KloelSession/KloelMessage/KloelMemory/ChatThread/ChatMessage) + Mind (MindBelief/MindPrediction/MindPolicy/MindBanditArm/MindCase/MindGraphNode/MindGuardAudit/MindDailyReport) + CIA (backend/src/kloel/cia, ~28 files) + Flows + Autopilot + Copilot + Voice into ONE canonical 'Kloel Mind'. Map: which Prisma models + services exist for each; what is ALREADY unified (dual-write aliases? kloel.*→cognition.* event migration in-flight?); the canonical target model/service set; and CRITICALLY the boundary between what is safe-now (docs, type aliases, non-kloel-lane files, frontend) vs must-coordinate (anything in the concurrent-agents lane thinker/reply-engine/wrapper/stream/tool-dispatcher). Produce a phased plan with safeNow per phase. Do NOT propose edits to the concurrent-agents' live files.` },
]

const results = await parallel(
  streams.map((s) => () =>
    agent(s.prompt, { label: `w2:${s.key}`, phase: 'Wave2', schema: SCHEMA })
  )
)

return results.filter(Boolean)
