export const meta = {
  name: 'kloel-mission-swarm-1',
  description: 'Swarm 1: real reasoning surface + render parity + Mac windows + memory-graph/capability/ECC scaffolds for Kloel chat',
  phases: [{ title: 'Implement', detail: 'parallel agents, disjoint file domains, each verifies' }],
}

const COMMON = `Working dir: /Users/danielpenin/kloel (Kloel monorepo: NestJS backend + Next.js frontend). This branch is shared with another active agent — ONLY touch the files in YOUR track, never git commit/push (a central process commits). HARD RULES: no facade, no hardcoded/fake reasoning text, real model/agent events only; never use 'any'/'as any'/@ts-ignore; no console.log/debugger in production code; match surrounding style; preserve the existing Kloel visual identity (colors/fonts/Sigma) exactly. Prefer the atomic-edit MCP tools (mcp__atomic-edit__*, load via ToolSearch) for guarded edits; the Edit tool is acceptable if atomic is impractical. VERIFY before returning: frontend typecheck = (cd /Users/danielpenin/kloel/frontend && node ./node_modules/.bin/tsc --noEmit); backend typecheck = (cd /Users/danielpenin/kloel/backend && node ./node_modules/.bin/tsc -p tsconfig.build.json --noEmit); run targeted tests for files you changed (frontend: npx vitest run <file>; backend: node ./node_modules/.bin/jest <spec> — never npx jest, it hits an EPERM). Backend test env vars if needed: DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_saas_test JWT_SECRET=test_secret.`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['track', 'status', 'filesChanged', 'verification', 'notes'],
  properties: {
    track: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    verification: { type: 'string', description: 'exact commands run + pass/fail' },
    notes: { type: 'string' },
    blockers: { type: 'string', description: 'external/infra blockers that cannot be solved in-repo, or none' },
  },
}

const TRACKS = [
  {
    label: 'm1-backend-reasoning',
    prompt: `TRACK m1-backend-reasoning — UN-SUPPRESS REAL REASONING IN THE BACKEND STREAM (the spine of the mission).

Current truth (already investigated): the backend captures DeepSeek delta.reasoning_content but DISCARDS the text in 3 places, streaming only the duration. Make the real reasoning tokens flow over SSE.

Files (yours, disjoint): backend/src/kloel/kloel-stream-events.ts, backend/src/kloel/kloel-stream-writer.ts, backend/src/kloel/kloel-thinker-think.helpers.ts, and their specs (backend/src/kloel/kloel-stream-events.spec.ts, kloel-stream-writer.spec.ts, kloel-thinker.service.spec.ts where reasoning is asserted).

Exact changes:
1. kloel-stream-events.ts: createKloelReasoningDeltaEvent(text) must return an object { type:'reasoning_delta', text, done:false } using the REAL text arg (it currently hardcodes text to empty string).
2. kloel-stream-writer.ts: add a private accumulator (e.g. lastReasoningText set to empty string); inside the streaming loop where reasoningPiece = delta?.reasoning_content and the if(reasoningPiece) block lives — accumulate lastReasoningText += reasoningPiece AND emit a reasoning_delta SSE event carrying reasoningPiece using the writer's existing emit mechanism (study how emitAnswerChunk / emitReasoningDone emit via safeWrite). getLastReasoning() must return text:this.lastReasoningText with durationMs. Update the now-obsolete comment that says provider reasoning text must never be serialized — the product now streams it.
3. kloel-thinker-think.helpers.ts: persist the real reasoning text (it currently does reasoningText: lastReasoning.text || undefined — that now carries real text; keep that path, ensure real text flows).
4. Flip the guard test in kloel-stream-events.spec.ts (the one asserting reasoning text is empty) to assert the real text is carried. Update any kloel-stream-writer.spec / kloel-thinker.service.spec assertions that expected empty reasoning.

This is Daniel's explicit product decision (reasoning must be REAL and COMPLETE, not suppressed) — reverse the privacy suppression fully. Verify with the touched specs + backend typecheck. ${COMMON}`,
  },
  {
    label: 'm1-frontend-reasoning',
    prompt: `TRACK m1-frontend-reasoning — RENDER THE REAL REASONING TEXT TOKEN-BY-TOKEN in the chat, in Kloel's existing skin.

Current truth: frontend drops reasoning_delta text and ReasoningTimeline.tsx renders the thinking step as an EMPTY blinking caret (no text). Make it render the streamed reasoning text live.

Files (yours, disjoint): frontend/src/components/kloel/dashboard/ReasoningTimeline.tsx, frontend/src/lib/kloel-stream-events.ts (frontend stream parser), frontend/src/components/kloel/dashboard/KloelDashboardSendMessage.ts, frontend/src/lib/kloel-message-ui.ts, and the assistant reasoning types feeding ReasoningTimeline.

Exact changes:
1. frontend kloel-stream-events.ts: stop dropping the reasoning_delta text — parse and surface it (it currently forces empty / drops it).
2. KloelDashboardSendMessage.ts: accumulate streamed reasoning_delta text into the assistant reasoning state (a streamed thinking buffer), marking t0 on first delta and computing real durationMs from timestamps on reasoning_done.
3. ReasoningTimeline.tsx: render the accumulated reasoning text inside the thinking step (around lines 201-228 it currently shows only a blinking caret) — show the real streamed text with whiteSpace pre-wrap + the live caret while processing; keep tool steps + files + duration + collapse-on-complete behavior. Use the EXISTING Kloel theme tokens/fonts already in the file — do NOT change colors/fonts/visual identity. The header collapses to the real summary if present, else shows live thinking. No hardcoded phrases.
4. Honest empty state preserved: if the model emits no reasoning text and no tools, render nothing (no fabricated thinking).

The reasoning_delta event carries a text field in the contract — the backend track is making it real; build the frontend to the contract. Verify with ReasoningTimeline / send-message tests + frontend typecheck. ${COMMON}`,
  },
  {
    label: 'm2-render-parity',
    prompt: `TRACK m2-render-parity — CLAUDE.AI-LEVEL RENDER PARITY in the Kloel chat markdown renderer.

File (yours, disjoint): frontend/src/components/kloel/KloelMarkdown.tsx (and any small co-located helper it already imports for rendering — but NOT files owned by other tracks). First read it to see what is already supported (GFM/tables/code/SVG/images per the codebase).

Add, only if missing, rendered support for: (a) LaTeX/math via KaTeX (inline single-dollar and block double-dollar math) using a maintained remark/rehype katex plugin feasible in this Next stack; (b) Mermaid diagrams (fenced code blocks whose language tag is mermaid) rendered to SVG client-side, lazy-loaded; (c) safe inline-HTML / iframe-sandboxed HTML artifact blocks (sandboxed, CSP-safe, no token/cookie access). Keep the existing segment-aware sanitizer behavior (prose rewritten, fenced/inline code preserved verbatim). Match the existing Kloel visual style. Add deps only via package.json if the repo build allows; if a dep is heavy/unavailable, implement the lightest real renderer and note it. Verify: frontend typecheck + any KloelMarkdown test. ${COMMON}`,
  },
  {
    label: 'm2-mac-windows',
    prompt: `TRACK m2-mac-windows — MAC-STYLE WINDOW CONTROLS for Kloel screens/overlays/artifacts.

Discover the overlay/window/panel component(s) that render opened screens over the graph (search frontend/src for the graph overlay / screen container / pop-up close button — likely a KloelGraph overlay / a screen window component with an X/close SVG). Touch ONLY those window-chrome files (disjoint from other tracks; do NOT touch ReasoningTimeline or KloelMarkdown).

Implement: (1) replace the X close control with a top-left RED circle (hover reveals the X inside; click closes the screen/pop-up); (2) a top-right GREEN circle (hover reveals the diagonal expand arrows; click toggles fullscreen); (3) macOS-style resize (expand/contract) on desktop so the user can arrange multiple screens simultaneously and keep several open; (4) REMOVE the logic that closes an open screen when the user interacts with the graph pill/navigator — open screens close ONLY via the red control; (5) perfectly adaptive layout: nothing breaks and the design stays beautiful from minimum-collapsed to maximum-expanded; (6) mobile: one screen at a time, red=close, green=expand, no multi-window. Preserve the existing Kloel visual identity. Verify: frontend typecheck + relevant tests. ${COMMON}`,
  },
  {
    label: 'm3-memory-graph',
    prompt: `TRACK m3-memory-graph — PER-USER MEMORY GRAPH scaffold (in-repo, real, on the existing stack).

Goal: typed MemoryNode/MemoryEdge persisted per user, plus an extract -> retrieve -> inject loop that feeds relevant memory into the model context before each turn — using the repo EXISTING Postgres + pgvector + VectorService + mind/* (the repo already has per-user user_profile injection and pgvector; build ON it, do not start from zero). External self-hosting of supermemory/Mem0 (Railway/Vercel deploy) is OUT OF SCOPE for you — implement the in-repo engine equivalent and FLAG the deploy as an external blocker.

Discover the existing memory/mind/vector code (search backend for VectorService, user_profile, mind/, pgvector). Then add (own, disjoint NEW files, and a Prisma migration; do NOT edit files other tracks own): MemoryNode + MemoryEdge Prisma models (id, userId, scope, type one of fact|preference|project|goal|decision|entity|document|summary|contradiction, content, summary, confidence, importance, recency, embedding, createdAt, expiresAt, pinned, forgotten) and edges (from, to, relation one of supports|contradicts|updates|extends|belongs_to|references|replaces, weight); a MemoryService with extractFromTurn (fact vs preference, contradiction resolution, forget/expire), retrieveRelevant (pgvector + scope rank), and buildMemoryContextForModel (compact injection: userProfileStatic/Dynamic, relevantMemories, preferences, constraints). Wire retrieval into the chat turn context assembly if a clean seam exists; else expose the service and note the wiring point. Per-user isolation (userId) enforced. Verify: backend typecheck + a new MemoryService unit spec proving extract/contradiction/forget. ${COMMON}`,
  },
  {
    label: 'm3-capability-manifest',
    prompt: `TRACK m3-capability-manifest — FACTORY CAPABILITY MANIFEST + ROUTER scaffold (in-repo, real).

Goal: every model call silently carries a manifest describing what the codebase offers the model to use/call (mandatory journey obligations + optional capabilities), and a router that selects only the relevant capabilities per turn (not a dump). Nothing leaks to the user; no capability becomes a frontend button.

Discover the existing tool/capability surface (search backend for the tool dispatcher, capability registry v2, tool definitions). Build ON it. Add (own, NEW disjoint files; do NOT edit the existing CapabilityRegistryV2Service or files other tracks own — create a manifest builder + router alongside): a CapabilityManifest type (id, internalName, description, triggers, inputs/outputs, safetyProfile, hiddenFromUser true) and a builder that derives the manifest from the existing registry; a CapabilityRouter.select(message, context) that returns the relevant subset; and a compact manifest-injection assembled into the model context before the official action. Hidden-from-user enforced (the sanitizer must never surface internalName). Verify: backend typecheck + a router unit spec. ${COMMON}`,
  },
  {
    label: 'ecc-harvest',
    prompt: `TRACK ecc-harvest — MINE github.com/affaan-m/ECC for genuinely useful capabilities and reimplement the top ones in-repo, used by the chat, zero leakage.

Clone to a temp research dir that is NOT added to the Kloel git index: run (git clone --depth 1 https://github.com/affaan-m/ECC /Users/danielpenin/kloel/.ecc-research). If network is blocked, report it as a blocker and stop. Inventory and classify everything (real capability vs template vs license-risk vs demo/mock). Pick the 2-3 highest-value, license-clean capabilities and REIMPLEMENT them by intent as in-repo Kloel capabilities (NEW disjoint files under backend, e.g. a capabilities directory — do NOT edit other tracks files), wired so the chat can invoke them. Strip any external branding; Kloel identity only; no skill name leaks to the user. For each implemented capability, write a proof test asserting it runs. License audit: if a license forbids copying, reimplement from scratch by intent. Verify: backend typecheck + the capability proof spec(s). Report which ECC skills you implemented and the proof. ${COMMON}`,
  },
]

const results = await parallel(
  TRACKS.map((t) => () => agent(t.prompt, { label: t.label, phase: 'Implement', schema: SCHEMA })),
)

const ok = results.filter(Boolean)
return {
  swarm: 'kloel-mission-swarm-1',
  tracks: TRACKS.length,
  returned: ok.length,
  done: ok.filter((r) => r.status === 'done').map((r) => r.track),
  partial: ok.filter((r) => r.status === 'partial').map((r) => r.track),
  blocked: ok.filter((r) => r.status === 'blocked').map((r) => ({ track: r.track, blockers: r.blockers })),
  filesChanged: ok.flatMap((r) => r.filesChanged || []),
  externalBlockers: ok.filter((r) => r.blockers && r.blockers !== 'none').map((r) => ({ track: r.track, blockers: r.blockers })),
  perTrack: ok.map((r) => ({ track: r.track, status: r.status, verification: r.verification, notes: r.notes })),
}
