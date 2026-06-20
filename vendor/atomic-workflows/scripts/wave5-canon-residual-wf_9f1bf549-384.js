export const meta = {
  name: 'wave5-canon-residual',
  description: 'Wave 5: 4 file-disjoint agents on residual canonicalization — resolveWorkspaceId 4->1, memory data-layer tail, sendMessage dedup+register, vocab/artifact refresh',
  phases: [{ title: 'Wave5', detail: '4 verify-then-complete agents, full MCP arsenal, atomic-edit locks, LSP self-verify' }],
}

const ARSENAL = `
USE THE FULL MCP ARSENAL (load via ToolSearch "select:<name>"):
- mcp__codegraph__* : search/callers/callees/context/impact — ORIENT (index ~stale), VERIFY via live grep + LSP.
- mcp__lsp-mesh__* : lsp_diagnostics (REAL per-file errors = your self-verify on EVERY touched file), lsp_references/definition/hover/symbols. NO global tsc (concurrent agents thrash it).
- mcp__atomic-edit__* : THE DEFAULT, edit ONLY through these. code_outline/code_read_symbol (read structurally), atomic_edit/atomic_insert_*/atomic_edit_symbol/atomic_rename_symbol_cross_file/atomic_add_import; atomic_lock_acquire before editing a file + atomic_lock_release after (anti-collision contract w/ the other agents — if a file is locked by another agent, SKIP it and report, do not wait forever).
- mcp__postgres__* : pg_query/pg_count/pg_table_describe.
- mcp__cognitive-hub__* : protocol_hub_openapi (routes), protocol_hub_asyncapi (events), protocol_hub_sbom. orient.
- mcp__test-runner__* : run_jest (run YOUR slice's specs), coverage_for_module, run_eslint.
HARD RULES: (1) NEVER read .md for decisions — code + tools only (you MAY WRITE the docs you own). (2) Edit ONLY via atomic-edit + lock every file. (3) VERIFY-THEN-COMPLETE: measure landed state first. (4) Self-verify every touched source file via lsp_diagnostics + run your slice's specs; NO global tsc. (5) Preserve UX shell, workspace isolation, typed Prisma, idempotency; NO fake data / no-op-to-pass / faked success / disable-comments (eslint-disable/@ts-ignore/etc are BANNED) / secrets; NEVER git restore. (6) Stay STRICTLY inside OWNED files; for a HUB file you don't own (kloel.module, domain-service-resolver, kloel-tool-dispatcher, prisma/schema.prisma) return the exact patch in hub_patches_for_leader. (7) Wrong NestJS DI wiring CRASHES prod boot (tsc won't catch) — confirm deps resolvable before injecting. (8) CANONICALIZATION SAFETY: do NOT unify things that look alike but are different domains (e.g. 'Lead' as a commercial STAGE is legitimately distinct from 'Contact' the entity). Audit-and-document beats risky renames. changed-eslint flags NEW eslint on changed lines — keep changed lines clean.
Base: committed checkpoint 23d02e49b, branch chore/canonicalization-helpers-mega-pr-2026-05-28, repo /Users/danielpenin/whatsapp_saas. backend/worker/frontend tsc all GREEN — keep green. Return ONLY the structured receipt.
`

const RECEIPT = {
  type: 'object', additionalProperties: false,
  required: ['slice', 'status', 'landed_before', 'changes', 'self_verify', 'blockers', 'hub_patches_for_leader'],
  properties: {
    slice: { type: 'string' }, status: { type: 'string', enum: ['complete', 'partial', 'blocked'] },
    landed_before: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'what'], properties: { file: { type: 'string' }, what: { type: 'string' } } } },
    hub_patches_for_leader: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'patch'], properties: { file: { type: 'string' }, patch: { type: 'string' } } } },
    self_verify: { type: 'string' }, blockers: { type: 'array', items: { type: 'string' } },
  },
}

const AGENTS = [
  {
    key: 'w5-resolveworkspace',
    slice: `SLICE: canonicalize resolveWorkspaceId — there are 4 separate definitions; collapse to ONE canonical helper, alias/migrate the rest.
VERIFY FIRST: grep -rn "function resolveWorkspaceId|const resolveWorkspaceId|resolveWorkspaceId =" backend/src worker/src to find the 4 defs + their files; codegraph_callers resolveWorkspaceId to map usage. Compare the 4 impls — are they truly identical semantics (same input->workspaceId resolution) or domain-divergent? Only unify TRULY-equivalent ones.
OWN (edit only): the files DEFINING resolveWorkspaceId (the 4) + a canonical location (pick the most-central existing one, e.g. a common/ util, as the single source). 
DO NOT touch: files that only CALL it unless the call is in a def-file you own; if a caller in a non-owned file imports a deprecated def, leave it importing (the alias re-export keeps it working) and note it.
COMPLETE: pick/keep ONE canonical resolveWorkspaceId; convert the other 3 def-sites into re-exports (\`export { resolveWorkspaceId } from '<canonical>'\`) or thin wrappers delegating to canonical, marked @deprecated. Behavior byte-identical. If two defs have DIVERGENT semantics, do NOT merge — document the divergence in the receipt as a blocker (it is a real bug surface). Self-verify lsp_diagnostics + run specs touching these files.`,
  },
  {
    key: 'w5-memory-datalayer',
    slice: `SLICE: finish the Brain->Mind memory data-layer tail (w3/w4 left 16 free-fn helper callsites + activation seams).
OWN (edit only): backend/src/marketing/channels/whatsapp/account-agent.gap-detector.ts + account-agent.input-session.ts + account-agent.product-materializer.ts + account-agent.service.ts; backend/src/kloel/unified-agent-actions-sales.service.helpers.ts + unified-agent-actions-sales.service.ts; and any other free-fn helper file with a direct prisma.kloelMemory/kloelMessage callsite whose OWNING service already injects MindMemoryItemService/MindMessageService (verify before editing).
DO NOT touch: kloel.module, resolver, mind/aliases internals, schema.prisma, guest-chat/reply-engine.
VERIFY FIRST: account-agent.service.ts ALREADY injects @Optional MindMemoryItemService + has getter mindMemoryItems (mindMemory?.items ?? prisma.kloelMemory); unified-agent-actions-sales.service.ts same. The seam pattern (from w4-memory receipt): (a) extend the helper's deps type with optional \`mindMemory?: PrismaService['kloelMemory']\`; (b) in the helper change \`deps.prisma.kloelMemory.X\` -> \`(deps.mindMemory ?? deps.prisma.kloelMemory).X\`; (c) in the OWNING service caller add \`mindMemory: this.mindMemoryItems\` to the deps object. All additive+optional => byte-identical default.
COMPLETE: apply that seam for account-agent (gap-detector/input-session/product-materializer at the kloelMemory callsites + the service caller wiring) and uaa-sales (helpers line ~210 + service caller). For helpers whose owning service does NOT inject the alias, leave + report. Self-verify lsp_diagnostics + run account-agent + uaa-sales specs (run_jest) green.`,
  },
  {
    key: 'w5-sendmessage-dedup',
    slice: `SLICE: audit sendMessage (21 definitions) and canonicalize true duplicates onto the ChannelDispatch path; document the rest.
VERIFY FIRST: grep -rn "sendMessage" backend/src worker/src --include=*.ts | filter to DEFINITIONS (method/function decls); for each, code_read_symbol to classify: (A) canonical dispatch (ChannelMessageDispatchService / ChannelDispatchРort / ChannelTransportRegistry), (B) legitimate per-channel transport adapter method (whatsapp/instagram/email/tiktok provider — these are SUPPOSED to be distinct, do NOT merge), (C) true duplicate that should route through the canonical dispatch. Use codegraph_callers to see usage.
OWN (edit only): the source files of any class-(C) TRUE-duplicate sendMessage you migrate to delegate to the canonical dispatch + docs/architecture/DUPLICATION_REGISTER.md.
DO NOT touch: per-channel adapter providers (class B — legitimate), kloel.module, resolver, schema.prisma, the other 6 architecture docs (owned by w5-vocab-artifacts).
COMPLETE: migrate ONLY clear class-(C) dups to delegate to the canonical send path (preserve return contract — if it differs, leave + document). Update DUPLICATION_REGISTER.md with the full sendMessage family analysis (the 21 defs classified A/B/C, canonical = which, migrations done, legit-distinct = which + why). Be conservative: when unsure if a send is a true dup, DOCUMENT it, do not merge. Self-verify lsp_diagnostics + run channel/dispatch specs.`,
  },
  {
    key: 'w5-vocab-artifacts',
    slice: `SLICE: ubiquitous-language audit (Lead/Contact/Customer/Client/Prospect/User) + refresh 5 canonical artifacts to post-Wave-4 reality. AUDIT + DOC ONLY — no risky source renames.
OWN (edit only, DOCS): docs/architecture/CANONICAL_VOCABULARY.md, CANONICAL_DOMAINS.md, CAPABILITY_MAP.md, SERVICE_CATALOG.md, DEPRECATION_MAP.md. (NOT DUPLICATION_REGISTER.md — owned by w5-sendmessage-dedup.)
DO NOT touch: any source .ts file (this is an audit slice), DUPLICATION_REGISTER.md, the other slices' source.
VERIFY FIRST (tools, not .md): grep counts + codegraph for the entity vocab — how is Lead vs Contact vs Customer vs Client vs Prospect vs User used across frontend/src + backend/src + prisma schema? protocol_hub_openapi for route nouns; pg_table_describe for the entity tables. Determine the CANONICAL entity (likely Contact) and which terms are legitimately domain-specific stages (Lead = commercial stage, Customer = post-purchase) vs accidental synonyms to deprecate.
COMPLETE: update CANONICAL_VOCABULARY.md with the official term table (canonical + allowed-context + deprecated synonyms + evidence counts); refresh CANONICAL_DOMAINS.md (the real domains incl. the unified Kloel Mind + OmniCore marketing), CAPABILITY_MAP.md, SERVICE_CATALOG.md, DEPRECATION_MAP.md to reflect that backend/src/whatsapp is dissolved, brain folded into mind, prismaAny~1, etc. Everything evidence-based (cite the tool-measured counts). Self-verify: docs are internally consistent; no source touched. Return the vocab table + a prioritized list of safe future renames (for a later wave) in the receipt.`,
  },
]

phase('Wave5')
log(`Wave 5: dispatching ${AGENTS.length} file-disjoint agents on residual canonicalization (base 23d02e49b)`) 

const results = await parallel(
  AGENTS.map((a) => () =>
    agent(`${ARSENAL}\n\n=== YOUR SLICE: ${a.key} ===\n${a.slice}`, { label: a.key, phase: 'Wave5', schema: RECEIPT })
  )
)
return results.filter(Boolean)
