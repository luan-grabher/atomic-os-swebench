export const meta = {
  name: 'kloel-mission-swarm-2',
  description: 'Swarm 2: wire memory+capability+ECC into the live chat turn, CDN-runtime katex/mermaid, artifacts panel',
  phases: [{ title: 'Wire', detail: 'parallel agents wire scaffolds into the live turn + fill render gaps' }],
}

const COMMON = `Working dir: /Users/danielpenin/kloel (NestJS backend + Next.js frontend). Branch shared with another active agent — ONLY touch files in YOUR track, never git commit/push. HARD RULES: no facade/fake data, real events only; no 'any'/'as any'/@ts-ignore; no console.log/debugger in production; match style; preserve Kloel visual identity exactly. Prefer atomic-edit MCP tools (mcp__atomic-edit__*, load via ToolSearch); Edit acceptable. VERIFY before returning: frontend typecheck (cd /Users/danielpenin/kloel/frontend && node ./node_modules/.bin/tsc --noEmit); backend typecheck (cd /Users/danielpenin/kloel/backend && node ./node_modules/.bin/tsc -p tsconfig.build.json --noEmit); targeted tests (frontend: npx vitest run <file>; backend: node ./node_modules/.bin/jest <spec>, never npx jest). Backend test env: DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_saas_test JWT_SECRET=test_secret. Swarm-1 already landed (committed): the per-user MemoryService (backend/src/kloel/mind/memory/memory.service.ts), CapabilityRouter+manifest (backend/src/kloel/manifest/*), ECC capabilities (backend/src/kloel/capabilities/*), real reasoning SSE, and KloelMarkdown — exist and are tested. Your job is to WIRE them into the live turn / fill gaps.`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['track', 'status', 'filesChanged', 'verification', 'notes'],
  properties: {
    track: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    verification: { type: 'string' },
    notes: { type: 'string' },
    blockers: { type: 'string', description: 'real external blockers or none' },
  },
}

const TRACKS = [
  {
    label: 'wire-context',
    prompt: `TRACK wire-context — inject per-user MEMORY and the CAPABILITY MANIFEST into the model context before each official chat turn.

Discover the chat turn's context-assembly seam: where kloel-thinker builds the messages/system context sent to the model (search backend/src/kloel for kloel-thinker.service.ts, the think helpers, context builder, where user_profile / system prompt is assembled before the provider call). This is a hot central file — be surgical, additive, and behind safe guards (the services degrade to empty on error).

Wire:
1. Before the model call: call MemoryService.retrieveRelevant(userId/workspaceId, message, scope) + buildMemoryContextForModel(...) and inject the compact result (userProfileStatic/Dynamic, relevantMemories, preferences, constraints) into the system context — NOT a giant dump, only the relevant compact block. Nothing leaks to the user (no echo to the visible answer).
2. Also inject the CapabilityRouter.select(message, context) -> manifest-injection compact block (manifest-injection.builder) into the same context so the model knows the obligations/optional capabilities available — hidden from user.
3. After the turn completes, call MemoryService.extractFromTurn(...) (fire-and-forget, .catch swallow) so new memories are captured.
Use the real userId/workspaceId already on the request. Guard everything so a memory/manifest failure never breaks a chat turn. Verify: backend typecheck + the touched thinker spec(s); add a focused test proving the memory + manifest context is injected when available and the turn still works when they throw. ${COMMON}`,
  },
  {
    label: 'wire-ecc-dispatch',
    prompt: `TRACK wire-ecc-dispatch — make the 3 in-repo ECC capabilities (backend/src/kloel/capabilities/*: structured-text-extractor, response-depth-advisor, prompt-refiner) actually invocable by the chat agent loop.

Discover the tool/capability dispatch seam (search backend for the tool dispatcher / KloelToolDispatcherService / where tools are registered and routed). Register the KloelCapabilitiesService capabilities so the agent can call them during a turn (as internal capabilities, NEVER surfaced as user-facing buttons or leaked skill names). Wire KloelCapabilitiesModule into the module graph if needed. Do NOT touch kloel-thinker.service.ts (wire-context owns it) — touch only the dispatcher/registration files and the capabilities dir. Add a proof spec showing a capability is invoked through the dispatcher and returns a real result. Verify: backend typecheck + the proof spec + the existing capability specs still green. ${COMMON}`,
  },
  {
    label: 'render-runtime-cdn',
    prompt: `TRACK render-runtime-cdn — make KaTeX + Mermaid render for REAL by loading them at runtime from CDN (the npm install is blocked by a root-owned cache, so do NOT add npm deps).

File: frontend/src/components/kloel/KloelMarkdown.tsx (and a small NEW co-located helper if needed for the CDN loader; do NOT touch files other tracks own). Swarm-1 left lightweight placeholder renderers and isolated swap points — replace them with real CDN-loaded rendering: (a) KaTeX — lazy-load katex from a CDN (script + stylesheet injected once, idempotent) and render inline single-dollar / block double-dollar math; (b) Mermaid — lazy-load mermaid UMD from CDN, call mermaid.render on fenced mermaid blocks to produce SVG, sandbox-safe. Loaders must be idempotent, SSR-safe (guard typeof window), and fail gracefully to the raw text if the CDN is unreachable. Keep the existing segment-aware sanitizer (code preserved verbatim, prose rewritten) and Kloel visual style. Verify: frontend typecheck + KloelMarkdown test (extend it to assert math/mermaid blocks produce the expected rendered containers, mocking the CDN global). ${COMMON}`,
  },
  {
    label: 'artifacts-panel',
    prompt: `TRACK artifacts-panel — add an ARTIFACTS panel to the Kloel chat: assistant-produced rich artifacts (markdown, html, svg, mermaid, code, pdf/doc cards) open in a side/overlay panel, editable + persistent per conversation, with a download/save action — matching the Kloel visual identity (reuse the existing graph-overlay/window chrome and theme tokens; do NOT restyle).

Discover how the chat renders assistant messages and where a panel could mount (search frontend for the dashboard chat surface, the message renderer, any existing artifact/file-card handling — Swarm-1 added file cards in ReasoningTimeline; build the panel alongside, do NOT edit ReasoningTimeline.tsx or KloelMarkdown.tsx which other tracks own). Create NEW files: an Artifact type (id, conversationId, kind markdown|html|svg|mermaid|react|pdf|code, title, content, downloadUrl?, editable, createdAt), an ArtifactsPanel component (opens via the Mac-window chrome, renders the artifact, Download button, basic edit for text kinds), and a hook/store to collect artifacts from the assistant stream (real file events only — no fake artifacts). Wire the panel mount into the chat surface minimally. Verify: frontend typecheck + a panel unit test. If an artifact kind needs a heavy renderer, render the real lightweight version and note it. ${COMMON}`,
  },
]

const results = await parallel(
  TRACKS.map((t) => () => agent(t.prompt, { label: t.label, phase: 'Wire', schema: SCHEMA })),
)
const ok = results.filter(Boolean)
return {
  swarm: 'kloel-mission-swarm-2',
  tracks: TRACKS.length,
  returned: ok.length,
  done: ok.filter((r) => r.status === 'done').map((r) => r.track),
  partial: ok.filter((r) => r.status === 'partial').map((r) => r.track),
  blocked: ok.filter((r) => r.status === 'blocked').map((r) => ({ track: r.track, blockers: r.blockers })),
  filesChanged: ok.flatMap((r) => r.filesChanged || []),
  externalBlockers: ok.filter((r) => r.blockers && r.blockers !== 'none').map((r) => ({ track: r.track, blockers: r.blockers })),
  perTrack: ok.map((r) => ({ track: r.track, status: r.status, verification: r.verification, notes: r.notes })),
}
