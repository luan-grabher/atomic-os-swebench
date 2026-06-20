export const meta = {
  name: 'swarm-i-behavior-preserving-consolidations',
  description: 'Resolve the behavior-preserving consolidation duplications the conservative pass deferred: unify the 4 hand-rolled MindMessage dual-write helpers into one service (P2-9), and any other N-identical-impls->1 dedup. Atomic-edit only, behavior-preserving, no frontend, no-commit.',
  phases: [{ title: 'Consolidate', detail: 'parallel: prove N impls are equivalent -> extract ONE canonical -> repoint callers' }],
}

const ROOT = '/Users/danielpenin/kloel'
const ATOMIC = 'HARD RULE: ONLY mcp__atomic-edit__* tools for code edits. NEVER Write/Edit/sed. Investigation = Grep/Glob/Read/Bash(read-only). Do NOT git commit. Report filesChanged.'
const SAFE = 'SAFETY: BEHAVIOR-PRESERVING consolidation ONLY — you are replacing N byte-equivalent (or semantically-identical) implementations with ONE shared canonical impl that all callers delegate to. PROVE equivalence first (read all N, confirm same flag-check / same write / same fail-open). The extracted single impl must produce IDENTICAL runtime behavior (same flag gate, same prisma write, same fail-open swallow). NO frontend. No schema. No public-API change. Add a test for the shared impl. If the N impls are NOT actually equivalent (subtle differences), DO NOT force-merge — outcome=skipped-unsafe + document the differences.'

const TRACKS = [
  {
    key: 'P2-9-mindmessage-dualwrite',
    prompt: 'P2-9: the MindMessage dual-write is hand-rolled 4x — inbox.service.ts (dualWriteChannelMindMessage ~47), kloel-thread.service.ts (dualWriteThreadMindMessage ~67), chat.service.ts (~86), kloel-lead-processor-helpers.ts (dualWriteLeadConversationMindMessage ~147). Each: check isMindMessageDualWriteEnabled() -> prisma.mindMessage.create({workspaceId, source, role, content}) -> fail-open catch+warn. PROVE all 4 are semantically identical (same flag, same create shape, same fail-open). Extract ONE canonical MindMessageDualWriteService.mirror(prisma|deps, {workspaceId, source, role, content}) (or a pure helper if DI is awkward — match the repo idiom) that does exactly that, and repoint all 4 callers to it (preserving each call site’s source discriminator: channel/thread/dashboard/lead_conversation). Behavior-identical. Add a spec for the shared mirror (flag-OFF no-op, flag-ON create, fail-open). Update/keep the 4 callers’ existing tests green.',
  },
  {
    key: 'P3-5-brainruntime-alias',
    prompt: 'P3-5: BrainRuntimeService alias re-export + naming overlap (MindRuntime + MindSelfModelService canonical). Investigate. If BrainRuntimeService is purely an alias re-export of a canonical Mind* service with ZERO behavioral divergence, consolidate the alias (repoint importers to the canonical name via atomic_rename_symbol_cross_file or remove the dead re-export with proof of non-use). If self-model vs consciousness overlap requires real logic merge, SKIP that part (skipped-unsafe) — only do the safe alias cleanup. Behavior-preserving.',
  },
]

phase('Consolidate')
const RES = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string' },
    outcome: { enum: ['fixed', 'skipped-unsafe', 'skipped-not-real', 'failed'] },
    equivalenceProven: { type: 'boolean' },
    canonicalImpl: { type: 'string' },
    callersRepointed: { type: 'number' },
    filesChanged: { type: 'array', items: { type: 'string' }, maxItems: 16 },
    testAdded: { type: 'boolean' },
    typecheck: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['id', 'outcome', 'note'],
}
const results = await parallel(
  TRACKS.map((t) => () =>
    agent(
      [`Consolidation ${t.key} (cwd ${ROOT}).`, ATOMIC, SAFE, t.prompt,
       'After: `cd backend && npx tsc -p tsconfig.build.json --noEmit` + run the affected callers’ specs. Report. Return StructuredOutput (id=key).'].join('\n'),
      { schema: RES, phase: 'Consolidate', label: `i:${t.key}` },
    ).catch((e) => ({ id: t.key, outcome: 'failed', note: String(e).slice(0, 160) })),
  ),
)

phase('Verify')
const verify = await parallel(
  results.filter((r) => r && r.outcome === 'fixed').map((r) => () =>
    agent(
      [`Adversarially verify consolidation ${r.id} (cwd ${ROOT}). Files: ${JSON.stringify(r.filesChanged || [])}. Read the git diff.`,
       'PROVE the extracted single impl is behavior-identical to the N it replaced (same flag gate, same write, same fail-open), every caller is repointed (no orphaned old helper still used divergently), no frontend, no public-API change, typecheck passes. If a caller’s behavior subtly changed, set outcome=skipped-unsafe. Return StructuredOutput (id + final outcome).'].join('\n'),
      { schema: RES, phase: 'Verify', label: `verify:${r.id}` },
    ).catch(() => r),
  ),
)
return { results: results.filter(Boolean), verify: verify.filter(Boolean) }
