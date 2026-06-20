export const meta = {
  name: 'atomic-Y-close-decidable-field',
  description: 'Close the decidable red field to 100%: 6 decider-adapters (alias resolver, re-export symbol, Prisma ref, config-key, structural-lint, eslint/prettier --fix) wired into both directions (write floor + read lens) + the convergence operator, disjoint territories, integrated + proven',
  phases: [
    { title: 'Build', detail: '6 parallel agents — alias resolver (contract.ts), re-export/prisma/config/structural-lint/lint-fix gates (new files)' },
    { title: 'Integrate', detail: 'wire registry WRITE_GATES/LENS_GATES + converge proposers + ENTRY, single build, run every proof + smoke, report (1 agent)' },
  ],
}

const AE = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit';

const MCP_BRIEF = `
== TOOLING YOU MUST USE (atomic-edit is LAW for EVERY mutation) ==
- atomic-edit MCP (mcp__atomic-edit__*): the ONLY way you may change files. ToolSearch
  "select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_replace_text,mcp__atomic-edit__atomic_insert_after_anchor,mcp__atomic-edit__code_outline,mcp__atomic-edit__code_read_symbol"
  to load schemas. atomic_create_file=new file (syntax-validated, sha-traced, rolls back on error);
  atomic_replace_text=exact unique-string splice; atomic_insert_after_anchor=insert after a unique {anchorText};
  code_outline/code_read_symbol=read structure WITHOUT whole-file reads. NEVER Edit/Write. Atomic refuses protected files + dangling imports.
- Read / Grep / Glob + the Explore agent: read & search existing code (read-only).
- test-runner MCP (mcp__test-runner__*): run_tsc (the COMPLETE type decider), run_eslint (the COMPLETE structural-rule decider over the finite catalog) — use to GROUND-TRUTH which reds your gate must reproduce. Scope to a file; do NOT build dist.
- cognitive-hub MCP (mcp__cognitive-hub__*): protocol_hub_openapi (674 NestJS routes), protocol_hub_asyncapi (122 event channels), protocol_hub_sarif (the 8592 findings), protocol_hub_manifest — the framework CONTRACT INDICES your reference gates resolve against.
- postgres MCP (mcp__postgres__*): pg_tables / pg_table_describe — the LIVE DB schema, to cross-check Prisma model/column names (read-only).
- lsp-mesh MCP (mcp__lsp-mesh__*): lsp_definition/lsp_references for symbol resolution. CAVEAT proven in the field map: lsp_diagnostics does NOT surface async payloads here and lsp_code_actions times out — so use IN-PROCESS ts-morph (the binding-gate.ts pattern) as your real decider, not the LSP wrapper.
- codegraph / gitnexus MCP: callers/callees/route_map/impact — relationships + blast radius before you change anything.
- context7 MCP: up-to-date TS compiler / library API docs.

== HARD RULES (anti-failure) ==
1. atomic-edit for ALL mutations.
2. Touch ONLY your assigned file(s). Touching another agent's file, or ANY concurrent-hot engine file you were not assigned
   (server.ts, gates/repair.ts, gates/lens.ts, gates/binding-gate.ts, gates/findings-delta-gate.ts, gates/behavior-contract-gate.ts, native-bridge.ts, server-helpers-io.ts, server-helpers-converge.ts), is FAILURE — a live concurrent session owns those.
3. Do NOT run "node build.mjs" and do NOT git commit — the integrator builds once + the orchestrator commits.
4. Match the existing heavily-documented gate style (long doc header: the invariant, the decider it adapts, the honesty ceiling). Implement the frozen GateModule shape from gates/contract.ts (name, kind, appliesTo, run; optional proposeFixes). Use makeContext's resolver/overlay/priorOf — never your own disk read — so your gate works in BOTH the WRITE floor (delta) and the READ lens (absolute).
5. Tri-state honesty: green / red(file,locus,fact) / UNJUDGED. Never red-by-guess, never green-by-assumption. A non-literal / dynamic / unresolvable case returns unjudged, NOT red. Document the honest failure mode + the Rice line where your class stops being decidable.
6. Ship a self-contained "<your-file>.proof.mjs" importing the COMPILED ../dist — the integrator runs it. Assert BOTH polarities (a real red reddens; a valid case stays green; an undecidable case is unjudged).
7. NO secrets in output. NO git restore. NO eslint-disable/@ts-ignore.
`;

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['component', 'filesWritten', 'redClass', 'deciderAdapted', 'publicApi', 'proofPlan', 'riceLine', 'selfReview'],
  properties: {
    component: { type: 'string' },
    filesWritten: { type: 'array', items: { type: 'string' } },
    redClass: { type: 'string', description: 'the decidable red class this closes' },
    deciderAdapted: { type: 'string', description: 'the complete decider it adapts (tsc/module-resolver/eslint/Prisma-index/Joi-index) + how reached' },
    publicApi: { type: 'string', description: 'exported gate + any helper signatures the integrator wires' },
    proofPlan: { type: 'string', description: 'both-polarity + unjudged assertions in the .proof.mjs' },
    riceLine: { type: 'string', description: 'exactly where this class stops being decidable (→ unjudged)' },
    selfReview: { type: 'string', description: 'why it compiles + the proof passes (you did NOT build)' },
  },
};

phase('Build');
const COMPONENTS = [
  {
    key: 'A1-alias-resolver',
    task: `Owns ONLY ${AE}/gates/contract.ts (the resolveRelImport inside makeContext) — and you may ALSO create ${AE}/gates/contract.alias.proof.mjs. Close red class #6 (tsconfig path-alias resolution). TODAY resolveRelImport returns null for any non-'.' specifier, so '@/...' imports are green-by-skip in the connection gate. ADD an alias-resolution branch: read the nearest tsconfig.json's compilerOptions.paths (and KLOEL's '@/*' -> '<package>/src/*' — frontend/src, backend/src, worker/src by the importing file's package), expand the alias, then run the EXISTING candidate-extension probe (the .ts/.tsx/.js/index.* list already in resolveRelImport). Purely ADDITIVE — the existing '.'-relative branch is byte-identical; you only add the '@'/paths branch BEFORE the 'return null'. This makes the connection gate (WRITE) reddens a NEW dangling alias import (delta-protected: legacy tolerated) AND the lens (READ) report all of them. Do NOT touch server-helpers-io.ts (the sync byte floor — deferred, too hot). Proof: an '@/'-import to a real file resolves (closure grows); an '@/'-import to a nonexistent file resolves to null (→ the connection gate would red it); a bare 'react' stays null (supply-chain's concern). Run the existing algebra.proof + smoke mentally — your change must not break resolveRelImport's relative behavior.`,
  },
  {
    key: 'A2-reexport-symbol',
    task: `Owns ONLY new files ${AE}/gates/reexport-symbol-gate.ts + reexport-symbol-gate.proof.mjs. Close red class #7 (named re-export symbol resolution): 'export { Foo } from "./m"' is green in the crivo today if './m' resolves as a FILE, even when './m' no longer EXPORTS Foo. Adapt the decider = in-process ts-morph (the binding-gate.ts pattern; the LSP wrapper is unusable per the field map). For each changed TS file, find re-export specifiers, resolve the target via ctx.resolveRelImport, and check (ts-morph) that each re-exported name is actually exported by the target module; if not → red {file, locus, fact:'re-exports {name} not exported by {target}'}. Unjudged on: namespace re-export (export * ), dynamic, target unresolvable, ts-morph load failure. NEW-only delta via ctx.priorOf. Implement the GateModule shape (kind:'static'). Proof both polarities + unjudged.`,
  },
  {
    key: 'A3-prisma-reference',
    task: `Owns ONLY new files ${AE}/gates/prisma-reference-gate.ts + prisma-reference-gate.proof.mjs. Close red class #11's escape hatch (Prisma model/column references on the prismaAny / queryRaw path tsc cannot see). Adapt the decider = the schema.prisma index (read backend/prisma/schema.prisma — 179 models; optionally cross-check live names via mcp__postgres__pg_table_describe read-only). Pattern: exactly like iac-reference-gate.ts. For changed files, find prismaAny.<model>.<op> and prisma.$queryRaw column refs against literal model/column names; red an unknown model/column; UNJUDGED on dynamic/string-built names (the Rice line — a column in a runtime-built SQL string is undecidable). NEW-only delta. GateModule kind:'static'. Proof both polarities + unjudged. Do NOT touch the Prisma schema; read-only.`,
  },
  {
    key: 'A4-config-key',
    task: `Owns ONLY new files ${AE}/gates/config-key-gate.ts + config-key-gate.proof.mjs. Close red class #12 (config-key membership). Adapt the decider = the closed Joi key set (read backend/src/config/app-config.module.ts — the validationSchema keys; find the exact path via Grep for 'Joi.object' / 'ConfigModule'). For changed files, find configService.get('LITERAL') / config.get<...>('LITERAL') calls; red a literal key NOT in the schema; UNJUDGED on non-literal keys (config.get(varName) — undecidable, the Rice line). Pattern: iac-reference-gate.ts. NEW-only delta. GateModule kind:'static'. Proof both polarities + unjudged.`,
  },
  {
    key: 'A5-structural-lint',
    task: `Owns ONLY new files ${AE}/gates/structural-lint-gate.ts + structural-lint-gate.proof.mjs. Close the single-file DECIDABLE structural-lint bucket (the 922-finding / ~12-rule bucket NOT requiring type info). Adapt the decider = ESLint's finite rule catalog (ground-truth with mcp__test-runner__run_eslint on a sample file to see exact messageIds). Reimplement token-correct via the perception organ (native-bridge astNodes / code_outline — the findings-delta-gate.ts pattern, but in YOUR new file, do NOT edit findings-delta) the single-file-decidable rules: no-unused-vars (the big one, 821), prefer-const, no-empty, no-useless-escape. Each must be token-correct (skip strings/comments). DO NOT implement type-aware rules (no-floating-promises etc. — those are Stratum 2, deferred). red {file,locus,messageId}; unjudged where scope analysis is uncertain. NEW-only delta. GateModule kind:'static'. Proof both polarities + unjudged.`,
  },
  {
    key: 'A6-lint-fix-gate',
    task: `Owns ONLY new files ${AE}/gates/lint-fix-gate.ts + lint-fix-gate.proof.mjs. Build the DYNAMIC gate that converges the mechanically-fixable lint population (prettier = 51% of fixable findings, + eslint --fix's fixable subset) AND emits the fixes as repair proposals for the convergence operator — the thing that stops the corpus being import-fix-dominated. Pattern: the apply->run->revert-byte-exact transaction of probe-convergence-gate.ts (kind:'dynamic'), reusing the overlay discipline. For a changed file: run eslint --fix / prettier --write on a COPY of the overlay content in-memory (or a temp file), diff; if the formatted result differs, the gate's proposeFixes-style output is the byte-splice to the formatted form (deterministic, idempotent, green-convergent). The gate itself: green if already formatted, red(with the proposed fix available) if not — but since this is auto-fixable, expose the fix so converge applies it. Honest: only the FIXABLE subset; non-fixable lint stays the structural gate's concern. Proof: an unformatted snippet yields a fix that, applied, is idempotent (second run = no change); an already-clean snippet = green.`,
  },
];

const builds = await parallel(COMPONENTS.map((c) =>
  () => agent(`${MCP_BRIEF}\n== PHASE: BUILD — ${c.key} ==\n${c.task}\n\nWork ONLY in your assigned file(s). atomic-edit for every write. Implement the frozen GateModule contract from gates/contract.ts. Return the structured result.`,
    { label: c.key, phase: 'Build', schema: SCHEMA }),
));

phase('Integrate');
const integration = await agent(
  `${MCP_BRIEF}\n\n== PHASE: INTEGRATE (LAST, alone) ==\nSix adapters were built (results below). Wire + prove the field-closure:\n${JSON.stringify(builds.filter(Boolean), null, 2)}\n\n` +
  `1. atomic-edit ${AE}/gates/registry.ts: import + add the new STATIC gates (reexport-symbol, prisma-reference, config-key, structural-lint) to WRITE_GATES (they auto-flow into LENS_GATES via the spread). Add lint-fix-gate to DYNAMIC_GATES. (A1's alias change is inside contract.ts:resolveRelImport — no registry entry, it strengthens every gate's resolver automatically.)\n` +
  `2. atomic-edit ${AE}/build.mjs ENTRY: add every new gates/*.ts so they compile.\n` +
  `3. If A6 exposes a fix-proposer, atomic-edit ${AE}/gates/converge-operator.ts to register the lint-fix proposer alongside the existing binding/connection proposers (so the convergence corpus spans formatting/dead-code, not import-only). If it does not cleanly compose, leave a documented TODO — do not force.\n` +
  `4. Bash (cwd ${AE}): "node build.mjs" — fix any compile error via atomic-edit in the builders' own files ONLY (never the concurrent-hot list).\n` +
  `5. Run EVERY proof: each new *.proof.mjs, plus algebra/merge/converge-operator/corpus/closure-universal/type-soundness-gate/contract proofs, plus "node smoke.mjs". The smoke + algebra/binding proofs are the regression net for A1's load-bearing resolveRelImport change — they MUST stay green.\n` +
  `6. Report: per-component PASS/FAIL with proof tail, final smoke count, the resolveRelImport regression check, any fixes you made, anything that could not integrate (with the precise reason). Do NOT git commit.`,
  { label: 'A7-integrate', phase: 'Integrate' },
);

return { builds: builds.filter(Boolean), integration };
