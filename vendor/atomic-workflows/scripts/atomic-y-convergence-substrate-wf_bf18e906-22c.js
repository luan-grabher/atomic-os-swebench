export const meta = {
  name: 'atomic-Y-convergence-substrate',
  description: 'Build Y: the complete verified-edit-algebra convergence substrate at apex (commute + merge + backward-convergence + verification-grounded corpus + universal closure), contract-first, disjoint territories, integrated + proven',
  phases: [
    { title: 'Contract', detail: 'fix the shared types + interfaces all builders compile against (1 agent)' },
    { title: 'Build', detail: '6 parallel agents on disjoint NEW files — per-symbol closure, merge engine, convergence operator, corpus, universal closure, formal doc' },
    { title: 'Integrate', detail: 'wire ENTRY, single build, run every proof + smoke, report (1 agent)' },
  ],
}

const AE = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit';

const MCP_BRIEF = `
== TOOLING YOU MUST USE (atomic-edit is LAW for EVERY mutation) ==
- atomic-edit MCP (mcp__atomic-edit__*): the ONLY way you may change files. First run
  ToolSearch "select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_replace_text,mcp__atomic-edit__atomic_replace_body,mcp__atomic-edit__atomic_insert_after_anchor,mcp__atomic-edit__code_outline,mcp__atomic-edit__code_read_symbol"
  to load their schemas. atomic_create_file = new file (syntax-validated + sha-traced + rolls back on error);
  atomic_replace_text = exact unique-string splice; atomic_replace_body = replace a function body by {file,fnLine,fnColumn,newBody};
  atomic_insert_after_anchor = insert after a unique {anchorText}; code_outline / code_read_symbol = read structure WITHOUT
  reading whole files. NEVER use Edit/Write to mutate — atomic only. Atomic refuses protected files + dangling imports at the byte floor.
- Read / Grep / Glob and the Explore agent: read & search existing code (read-only) — use to understand before writing.
- codegraph MCP (mcp__codegraph__*): codegraph_callers/callees/impact/search over the indexed graph — find who calls a symbol before relying on it.
- gitnexus MCP (mcp__gitnexus__*): route_map / impact / query — code relationships and blast radius.
- test-runner MCP (mcp__test-runner__* : run_tsc/run_jest/run_eslint) and context7 MCP (up-to-date TS compiler / library docs): consult as needed.
- Bash: READ-ONLY inspection only in your phase. DO NOT run "node build.mjs" — the integrator builds ONCE at the end to avoid dist races.

== HARD RULES (anti-failure) ==
1. atomic-edit MCP for ALL mutations — no exceptions.
2. Touch ONLY your assigned files. Touching another agent's file, or any concurrent-hot engine file you were not assigned
   (server.ts, gates/repair.ts, gates/lens.ts, gates/binding-gate.ts, native-bridge.ts, server-helpers-converge.ts), is FAILURE — a live concurrent session owns those.
3. Do NOT build dist (no node build.mjs) and do NOT git commit — the integrator does both.
4. Match the existing heavily-documented code style (every gate file has a long doc header explaining the invariant + the honesty ceiling).
5. NEVER print/commit secrets. NEVER use git restore. NO eslint-disable / @ts-ignore / @ts-nocheck.
6. Ship a self-contained "<your-file>.proof.mjs" next to your component that imports the COMPILED dist and asserts both polarities — the integrator runs it.
7. Honesty doctrine: a check returns green / red / UNJUDGED — never red-by-guess, never green-by-assumption. Document the honest failure mode.
`;

const BUILD_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['component', 'filesWritten', 'publicApi', 'proofPlan', 'selfReview', 'honestLimits'],
  properties: {
    component: { type: 'string' },
    filesWritten: { type: 'array', items: { type: 'string' } },
    publicApi: { type: 'string', description: 'exported signatures other components/integrator rely on' },
    proofPlan: { type: 'string', description: 'what the .proof.mjs asserts (both polarities)' },
    selfReview: { type: 'string', description: 'why you believe it compiles + the proof passes (you did NOT build)' },
    honestLimits: { type: 'string' },
  },
};

// ── Phase 1: Contract ────────────────────────────────────────────────────────
phase('Contract');
const contract = await agent(
  `${MCP_BRIEF}\n\n== PHASE: CONTRACT (you run FIRST, alone — you fix the shared surface everyone else compiles against) ==\n` +
  `The verified-edit algebra already exists at ${AE}/gates/algebra.ts (commute(), EditFact, buildEditFact, closureOf, concurrentBatches) — READ it first (code_outline + Read). Your job: fix the SHARED contract so the 6 parallel builders never diverge.\n` +
  `1. In ${AE}/gates/algebra.ts, ADD (do not change existing exports) the canonical shared interfaces the other components import: \n` +
  `   - MergeResult { merged?: string; byteIdentical: boolean; refused: boolean; reason: string }\n` +
  `   - ConvergeResult { converged: boolean; finalReds: number; appliedEdits: number; needsIntent: boolean }\n` +
  `   - CorpusTriple { kind: 'repair' | 'commute'; sha: string; payload: unknown }\n` +
  `   - ClosureProvider = (repoRoot: string, rel: string) => { set: Set<string>; capped: boolean }  (so per-symbol/universal closure can be injected into commute later)\n` +
  `   Keep them additive + exported; algebra.ts must still pass its existing proof.\n` +
  `2. In ${AE}/gates/contract.ts, ADD an OPTIONAL method to the GateModule interface: \`proposeFixes?(ctx: GateContext): { file: string; byteStart: number; byteEnd: number; replacement: string; rationale: string }[]\` — purely additive so all 14 existing gates still compile untouched.\n` +
  `3. Create ${AE}/../../../docs/architecture/VERIFIED_EDIT_ALGEBRA.md with a skeleton: title, the commute theorem, and empty sections (### Merge · ### Convergence operator · ### Corpus · ### Universal closure · ### API · ### Honest limits) for B6 to fill.\n` +
  `Return the exact exported signatures you added (publicApi) so the builders reference them verbatim.`,
  { label: 'C0-contract', phase: 'Contract', schema: BUILD_SCHEMA },
);

const CTX = `\n== FIXED CONTRACT (from phase 1 — import these verbatim from gates/algebra.js; contract.ts now has proposeFixes?) ==\n${JSON.stringify(contract, null, 2)}\n`;

// ── Phase 2: Build (6 parallel, disjoint NEW files) ──────────────────────────
phase('Build');
const COMPONENTS = [
  {
    key: 'B1-per-symbol-closure',
    task: `Owns ONLY ${AE}/gates/algebra.ts (the closure functions) + ${AE}/gates/algebra.proof.mjs (extend, do not rewrite). Upgrade closureOf from per-FILE (current: file + transitive relative/@ imports) to per-SYMBOL precision: instead of "the whole file's import targets", compute the specific imported symbols the edited byte-spans actually reference, using read-only AST (mcp__atomic-edit__code_read_symbol / code_outline, or a tree-sitter read). This TIGHTENS the over-approximation (fewer false couplings → higher, truer commute rate) while staying SOUND (when symbol resolution is uncertain, fall back to the file-level closure — never under-approximate). Add a proof case showing a per-symbol pair that per-file called coupled but per-symbol correctly calls independent. Keep all existing commute() behavior + the existing proof green.`,
  },
  {
    key: 'B2-merge-engine',
    task: `Owns ONLY new files ${AE}/gates/merge.ts + ${AE}/gates/merge.proof.mjs. Implement the THIRD MERGE MODE: \`merge(repoRoot, traceA, traceB): MergeResult\` — build both EditFacts (import buildEditFact + commute from gates/algebra.js), and IF commute, apply both byte-splices to the base content in BOTH orders and assert byte-identical (the confluence theorem operationalized) → return {merged, byteIdentical:true, refused:false}; if NOT commute → {refused:true, reason}. The proof must include a TWO-AGENT CONFLUENCE DEMO on a temp project: two independent edits merged without any integration test (byte-identical both orders), AND two coupled edits correctly refused. This is the live proof that "merge without CI" is sound.`,
  },
  {
    key: 'B3-convergence-operator',
    task: `Owns ONLY new files ${AE}/gates/converge-operator.ts + ${AE}/gates/converge-operator.proof.mjs. Implement the gates running BACKWARD: a registry-wide \`converge(repoRoot, overlay): ConvergeResult\` that, given a near-miss overlay with reds, repairs to a green fixpoint. Do NOT edit the concurrent-hot gates — instead keep an EXTERNAL proposer registry in YOUR file: PROPOSERS for the binding red (insert missing import from a known sibling/builtin) and the connection red (the resolveRelImport target). Loop: collect reds (you may import runGates from gates/registry.js read-only), gather proposed splices, apply only the subset that STRICTLY decreases total reds and adds no new red (the HAND's monotone acceptance), re-gate, repeat (cap ~8), else needsIntent. Proof: a RED overlay (missing import) converges to green; an unrepairable red returns needsIntent (never guessed).`,
  },
  {
    key: 'B4-verification-corpus',
    task: `Owns ONLY new files ${AE}/gates/corpus.ts + ${AE}/gates/corpus.proof.mjs. Implement the OUTWARD axis: \`emitRepairTriple(...)\` and \`emitCommuteTriple(...)\` that append one JSONL line each to \`<repoRoot>/.atomic/corpus/triples.jsonl\` — a human-label-free, sha-anchored, locus-precise training corpus. A repair triple = { kind:'repair', sha, payload:{ redBefore, appliedSplice, redAfter, gateWentGreen } }; a commute triple = { kind:'commute', sha, payload:{ fileA, fileB, commute, sharedLocus } }. The reward is the registry's own red-count delta (deterministic, replayable), NOT a human/model label. Proof: emit both kinds to a temp dir, read back, assert schema + that the reward equals redBefore-redAfter.`,
  },
  {
    key: 'B5-universal-closure',
    task: `Owns ONLY new files ${AE}/gates/closure-universal.ts + ${AE}/gates/closure-universal.proof.mjs. Generalize the closure beyond TS relative imports to be UNIVERSAL: (a) across the tree-sitter languages the engine supports (py import, go import, ruby require, etc. — use read-only native-bridge astNodes patterns or per-language import regexes), and (b) per-GATE closures (e.g. an HTTP route string for contract-edge, an event name for telemetry). Export a ClosureProvider (the contract type) the integrator can inject into commute so the algebra works on any language, not just TS. Proof: a python file importing a sibling, and a TS file, both produce correct closures; an unknown language returns a conservative {file} + unjudged-style note (never a wrong-but-confident closure).`,
  },
  {
    key: 'B6-formal-spec-doc',
    task: `Owns ONLY docs/architecture/VERIFIED_EDIT_ALGEBRA.md (fill the skeleton C0 created — touch NOTHING else). Write the complete formal spec + operator's guide: the commute theorem (partial commutative monoid on the green manifold; closure as sound over-approximation; the Rice-sidestep = decides a DECIDABLE relation, conservative so failure mode is uselessness not unsoundness), the API of every component (merge, converge, corpus, universal closure, commute, concurrentBatches), the unprecedented-delta table vs git/Darcs/Pijul/OT/CRDT/Unison/Hazel/PCC/RLVR, the empirical result (real .atomic/traces: ~58-63 edits, ~88% commute, discriminating 88/12, 9 concurrent batches), how to OPERATE it (the CLI + the merge demo), and the honest limits (small frontend-heavy sample, per-file vs per-symbol, regex resolver). Cite real file paths.`,
  },
];

const builds = await parallel(COMPONENTS.map((c) =>
  () => agent(`${MCP_BRIEF}${CTX}\n== PHASE: BUILD — component ${c.key} ==\n${c.task}\n\nWork ONLY in your assigned files. Use atomic-edit for every write. Return the structured result.`,
    { label: c.key, phase: 'Build', schema: BUILD_SCHEMA }),
));

// ── Phase 3: Integrate + prove ───────────────────────────────────────────────
phase('Integrate');
const integration = await agent(
  `${MCP_BRIEF}\n\n== PHASE: INTEGRATE (you run LAST, alone) ==\n` +
  `Six builders wrote disjoint components (results below). Wire + prove the whole substrate:\n${JSON.stringify(builds.filter(Boolean), null, 2)}\n\n` +
  `1. Using atomic-edit, add every new gates/*.ts the builders created to the ENTRY array in ${AE}/build.mjs (after 'gates/algebra.ts') so they compile to dist.\n` +
  `2. If B5 produced a ClosureProvider, wire it into algebra.ts's commute path ONLY if it is a clean injection (else leave a documented TODO — do not force it).\n` +
  `3. Run (Bash, from ${AE}): "node build.mjs" — fix any compile error via atomic-edit (in the builders' files only; do NOT touch concurrent-hot engine files).\n` +
  `4. Run every new "*.proof.mjs" the builders wrote, plus "node smoke.mjs" and "node gates/algebra.proof.mjs" and "node gates/type-soundness-gate.proof.mjs". \n` +
  `5. Report: per-component PASS/FAIL with the proof tail, the final smoke count, any fixes you made, and any component that could not integrate (with the precise reason). Do NOT git commit — the orchestrator commits after reviewing your report.`,
  { label: 'I9-integrate', phase: 'Integrate' },
);

return { contract, builds: builds.filter(Boolean), integration };
