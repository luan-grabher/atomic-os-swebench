export const meta = {
  name: 'Y-peak-fanout',
  description: 'Expanded Y: 7 agents rewrite each regex-gate to extract via the frozen perception organ (token-correct, kills the residual FPs) + 4 agents build the horizon-pushing gates (liveness over the live system, deterministic harness, property-fuzz, bounded formal). Each disjoint, proven via tsx, against frozen perception.ts + contract.ts.',
  phases: [{ title: 'Perception rewrites' }, { title: 'Horizon gates' }],
};

const ROOT = '/Users/danielpenin/whatsapp_saas';
const DIR = 'scripts/mcp/atomic-edit';

const MCP_CATALOG = `
USE THE MCPs (load each tool first with ToolSearch: \`select:<tool_name>\`). Mandatory — ground every claim in real data, mutate ONLY through the atomic MCP.
— MUTATION (the ONLY write path; native Write/Edit + shell heredocs BANNED): mcp__atomic-edit__* — atomic_edit / atomic_replace_text / atomic_replace_range (surgical edits to YOUR file), atomic_create_file (new module/proof), code_read_symbol / code_outline (read structure), atomic_grep / atomic_ast_search (in-process tree-sitter search = the "Pi" engine). Every write is byte-firewalled + connection+supply-chain gated (your imports must resolve).
— READ/GRAPH (ground your fact): mcp__codegraph__* (search/callers/callees/impact/context/node/files), mcp__gitnexus__* (query/cypher/route_map/impact/shape_check), mcp__graphify-plus__* (blast_radius/metadata_for_file/stub_route_inventory/runtime_errors/hot_clusters), mcp__lsp-mesh__* (lsp_definition/references/hover/diagnostics/symbols — REAL LSP, validate your byte-fact equals the LSP fact), mcp__cognitive-hub__* (protocol_hub_openapi=NestJS routes / asyncapi=73 channels / sarif=findings / sbom=deps).
— VERIFY: mcp__test-runner__* (run_tsc/run_eslint/run_jest/run_vitest/affected_tests/coverage_for_module), mcp__pulse__* (pulse_scan/scan_module/health_by_module/top_gates — gate-less reality verifier), mcp__codacy__* (file_issues/patterns).
— LIVE/RUNTIME (the bytes-IN-MOTION surface — essential for the liveness/harness/property/formal gates, and for documenting ceilings on the static gates): mcp__plugin_railway_railway__* (get_logs/http_requests/http_error_rate/http_response_time/deploy/environment_status/list_services), mcp__sentry-bridge__* (recent_issues/errors_since_commit/project_stats/event_search), mcp__datadog__* (search-logs/aggregate-logs/get-metrics/get-monitors), mcp__postgres__* (pg_query/pg_tables/pg_table_describe — read-only DB state), mcp__codecov__* (coverage), mcp__saas-compiler__* (twin_up/twin_shadow/verify_in_prod/capture_fingerprint — production twin + verify-in-prod).
— DOCS/REASON: mcp__context7__* (resolve-library-id + query-docs — real spec of anything: tree-sitter node types, TLA+, fast-check, OTel), mcp__sequential-thinking__sequentialthinking.
`;

const FROZEN = `THE FROZEN FOUNDATION you build on (READ, never edit): ${DIR}/gates/perception.ts — the ONE perception organ. Token-correct AST extraction: importSpecs(content,rel) / decorators(content,rel) → {name,arg,line,col} / calls(content,rel) → {callee,arg0,line,col} / identifiers(content,rel). Each SELECTS nodes by real tree-sitter TYPE, so a token inside a string/comment is a string/comment node, never extracted as the thing it resembles. Returns null when no grammar → you degrade to unjudged. Lower-level: ${DIR}/native-bridge.ts exports astNodes(content,lang,types?) → AstNode[]{type,text,byteStart,byteEnd,line,column} for AST kinds perception does not expose yet (e.g. jsx_attribute). ${DIR}/gates/contract.ts — the GateModule/GateContext/GateResult/GateRed shape + makeContext (ctx.priorOf gives prior bytes / '' in lens mode). Seed: ${DIR}/connection-gate.ts, ${DIR}/server-helpers-converge.ts, ${DIR}/server-tools-converge.ts (effect gate apply→run→revert), ${DIR}/server-helpers-effect.ts (snapshot/diff/rollback shape).`;

const RULES = `
HARD RULES (anti-failure — the fleet is disjoint):
1. Touch ONLY the file(s) named in YOUR parcel. Do NOT edit perception.ts, native-bridge.ts, contract.ts, registry.ts, server-*.ts, smoke, build.mjs, or any OTHER gate. Registry/io/lens/smoke wiring is the human integrator's job.
2. Mutate via mcp__atomic-edit__* only. Resolve your own relative imports (the byte floor refuses dangling ones).
3. Do NOT run \`node build.mjs\` (collides with the other agents on dist/). Do NOT git add/commit.
4. Prove via:  npx tsx <your proof file>  (Bash). REWRITE agents: your gate already has gates/<gate>.proof.ts — after rewriting, it MUST still print PROOF PASS (you preserved write-direction behavior) AND you must additionally show the rewrite removed the string/comment FP (extract via perception, not whole-file regex). NEW-gate agents: create gates/<name>.proof.ts proving RED on violation + GREEN on resolve + unjudged when the live target / model is unavailable.
5. Token-correct or unjudged — NEVER red-by-guess, never green-by-assumption. Extract via perception/astNodes (AST), never raw-regex the whole file. If a fact is undecidable from what you can reach, return { unjudged: true }.
6. Run mcp__test-runner__run_tsc (or tsc) on your file(s) to confirm they typecheck under the build options (module ESNext, moduleResolution Bundler, target ES2022, types node, strict).
`;

const REWRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gate', 'file', 'whatRewired', 'proofPassed', 'fpRemovedEvidence', 'proofOutputTail', 'ceiling', 'mcpsUsed'],
  properties: {
    gate: { type: 'string' }, file: { type: 'string' },
    whatRewired: { type: 'string', description: 'which regex extractor(s) you replaced with which perception accessor(s)' },
    proofPassed: { type: 'boolean', description: 'gates/<gate>.proof.ts still PROOF PASS after the rewrite' },
    fpRemovedEvidence: { type: 'string', description: 'concrete proof the rewrite no longer extracts a pattern embedded in a string/comment/template (the residual the lens exposed)' },
    proofOutputTail: { type: 'string' },
    ceiling: { type: 'string', description: 'what perception cannot reach for this gate (e.g. no HCL grammar) and how you degrade honestly' },
    mcpsUsed: { type: 'array', items: { type: 'string' } },
  },
};
const NEWGATE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gateName', 'kind', 'moduleFile', 'proofFile', 'fact', 'proofPassed', 'redProven', 'greenProven', 'unjudgedProven', 'horizonPushed', 'ceiling', 'mcpsUsed', 'integrationNotes'],
  properties: {
    gateName: { type: 'string' }, kind: { type: 'string' }, moduleFile: { type: 'string' }, proofFile: { type: 'string' },
    fact: { type: 'string', description: 'the one exoneration-free fact this gate settles' },
    proofPassed: { type: 'boolean' },
    redProven: { type: 'string' }, greenProven: { type: 'string' },
    unjudgedProven: { type: 'string', description: 'proof it returns unjudged (not a guess) when the live target / model / harness is unavailable' },
    horizonPushed: { type: 'string', description: 'exactly which part of the old breathing ceiling this gate now converts into a byte-fact, and how far' },
    ceiling: { type: 'string', description: 'the residual that remains genuinely irreducible even after this gate' },
    mcpsUsed: { type: 'array', items: { type: 'string' } },
    integrationNotes: { type: 'string' },
  },
};

const rewrites = [
  { gate: 'contract-edge', task: 'HIGHEST VALUE — kills the self-FP the lens exposed. Replace extractHttpConsumerPaths/extractOnEventListeners/extractControllerRoutes/extractEmittedEvents (whole-file regex) with perception.decorators (for @Controller/@Get/@Post/@OnEvent → name+arg) and perception.calls (for apiFetch/fetch/.emit → callee+arg0). A @OnEvent("x") written inside a template literal or comment must NO LONGER be extracted (prove it). Keep consumer-subset-of-producer + NEW-edge-only via ctx.priorOf + GraphQL/gRPC unjudged.' },
  { gate: 'supply-chain', task: 'Replace the imported extractImportSpecifiers use with perception.importSpecs (token-correct). Keep node:module isBuiltin + the node_modules walk + NEW-bare-only via ctx.priorOf + alias skip. A require("m") written in a comment must no longer be a bare-import (prove it).' },
  { gate: 'reachability', task: 'Build the import-edge reach graph from perception.importSpecs instead of regex. Keep root detection (entrypoints/spec/route/proof), orphan = no-root-reaches, bounded walk (MAX_UNIVERSE), unjudged-on-cap. Optionally add call-edges via perception.calls.' },
  { gate: 'telemetry-emission', task: 'Extract telemetry emissions (this.logger.warn/error, tracer.startSpan, counter.inc) via perception.calls (member callees kept whole as callee). Keep handle-declared-in-file + the OBSERVED tier returned unjudged (TRUTH_INFERRED vs TRUTH_OBSERVED). A logger.x written in a string/comment must no longer be an emission.' },
  { gate: 'render-conformance', task: 'JSX affordances (onClick={h}, href="/r", router.push("/r"), <Link href>). perception has no JSX-attribute accessor — use native-bridge astNodes(content,"tsx",new Set(["jsx_attribute","jsx_opening_element"])) to LOCATE attributes token-correctly (an onClick written in a string/comment is NOT a jsx_attribute node). Keep handler-binds + route-resolves + unjudged on unobservable route tree.' },
  { gate: 'iac-reference', task: 'HONEST DEGRADE — HCL/YAML have NO tree-sitter grammar in this engine (perception.langOf returns undefined → null). Import blankComments from ../connection-gate and blank #/// comments before your existing HCL/YAML regex so comment-embedded refs stop FPing; document that full token-correctness for IaC needs an HCL/YAML grammar (a real ceiling here). Keep intra-config resolution + live-cloud unjudged.' },
  { gate: 'findings-delta', task: 'LOWEST PRIORITY — it already length-preservingly blanks literals/comments (token-correct-ish). Verify no whole-file-regex FP remains; if its key extraction can route through perception.identifiers/calls, do so; else confirm + document it is already token-correct. Keep type-aware deferral + NEW-only delta + unjudged.' },
];

const newGates = [
  { name: 'liveness-gate', kind: 'dynamic',
    fact: 'A declared wire resolves in the LIVE graph (bytes-in-motion), not just the static one: a consumed (method,path) endpoint actually RESPONDS, a declared span is actually OBSERVED, a declared route actually SERVES — read from a reachable running instance.',
    build: 'Create gates/liveness-gate.ts (GateModule, kind:"dynamic"). The fact: extend resolve-or-dangles to the running system. For changed files carrying call-sites/spans, probe a reachable live target — an HTTP endpoint (fetch the (method,path), GREEN iff it responds non-5xx), an observed span/log (read via the runtime MCPs). Resolve the target from env (e.g. a base URL) or the runtime MCPs (railway http_requests / get_logs, sentry project_stats, datadog metrics). GREEN = the live wire resolves; RED = a call-site whose endpoint 404s/5xx in the live instance (a dangling LIVE wire); UNJUDGED = no live target reachable (never green-by-assumption — this is the honest core: static says COULD, live says DOES, absent says unjudged). This is the first real push of the breathing horizon: it converts "is it serving" from forever-unprovable into a byte-fact WHEN observable.',
    ground: 'Use mcp__plugin_railway_railway__http_requests/get_logs/environment_status + mcp__sentry-bridge__project_stats + mcp__postgres__pg_query + mcp__saas-compiler__verify_in_prod to read the live surface and to PROVE your gate returns unjudged when nothing is reachable and a verdict when it is. context7 for OTel/HTTP semantics.' },
  { name: 'deterministic-harness', kind: 'dynamic',
    fact: 'A non-deterministic runtime fact (race/clock/PRNG) becomes single-valued under CONTROLLED non-determinism: green only if the probe converges to the same asserted value under every seeded clock/PRNG/schedule we drive.',
    build: 'Create gates/deterministic-harness.ts (GateModule, kind:"dynamic"). Generalize probe-convergence: given a probe command, run it N times under a Node preload that FREEZES the wall clock (the time/perf timers) and SEEDS the PRNG (the random source) — and, where feasible, perturbs async ordering — with a different seed/clock each run. GREEN iff every run converges to the asserted fact; RED iff a run contradicts it; UNJUDGED iff runs disagree in a way the harness cannot control (true thread-scheduling is only partially controllable in Node — document this honestly). This pushes the race ceiling: a flaky fact the old probe marked unjudged becomes DECIDABLE for the clock/PRNG class.',
    ground: 'Read server-helpers-effect.ts + server-tools-converge.ts for the apply→run→revert SHAPE (re-implement a MINIMAL local snapshot/revert — do not import/edit them). context7 for deterministic-simulation-testing and Node --require preload + fake-timers. mcp__test-runner__run_jest for a real seedable command.' },
  { name: 'property-gate', kind: 'dynamic',
    fact: 'An asserted invariant holds for ALL generated inputs: green iff a property-based generator produces no counterexample over N runs; a counterexample is a real RED with the shrunk input.',
    build: 'Create gates/property-gate.ts (GateModule, kind:"dynamic"). Driven by a directive in the changed file, e.g. // @property fn=<exportedFn> invariant=<boolean expr over result> gen=<int|string|array spec>. Generate K inputs (fast-check-style if available, else a built-in generator), run the function (apply→run→revert the ephemeral harness), assert the invariant; RED with the (shrunk) counterexample; GREEN if none in K; UNJUDGED if no runner/directive. This pushes the unenumerated-inputs horizon probabilistically — far, not to certainty (document the probabilistic bound).',
    ground: 'context7 resolve-library-id for "fast-check" (check if installed via atomic_grep over node_modules; else built-in generator). mcp__test-runner__run_vitest for a real fn. Honest ceiling: probabilistic, not exhaustive.' },
  { name: 'formal-gate', kind: 'dynamic',
    fact: 'For a FINITE bounded model, an invariant holds for EVERY state/input by exhaustive enumeration — genuine for-all certainty within the model bound.',
    build: 'Create gates/formal-gate.ts (GateModule, kind:"dynamic"). Driven by a directive declaring a SMALL finite domain + an invariant (e.g. // @model states=<enumerable> transition=<fn> invariant=<predicate>), exhaustively enumerate the bounded state/input space and prove the invariant for ALL — a model checker in miniature. GREEN = invariant holds across the WHOLE enumerated space (real for-all, bounded); RED = a concrete counterexample state; UNJUDGED = space too large to enumerate within a cap, or no directive (never claim beyond the bound). This is the one gate that yields CERTAINTY (for the modeled subset), the formal-methods push.',
    ground: 'context7 for "TLA+ / bounded model checking" semantics. Keep it real but bounded: exhaustive enumeration with a hard state cap, unjudged past it. Prove it catches a real invariant violation in a tiny finite model and certifies a holding one.' },
];

phase('Perception rewrites');
const rewriteResults = await parallel(rewrites.map((r) => () => agent(
  `You are ONE of 11 parallel agents completing expanded Y. Your parcel: REWRITE the **${r.gate}** gate to extract via the frozen perception organ (token-correct), removing the regex string/comment false-positives the lens exposed.\n\n` +
  `FILE (edit ONLY this + its proof): ${DIR}/gates/${r.gate}-gate.ts (proof: ${DIR}/gates/${r.gate}-gate.proof.ts)\n\nTASK: ${r.task}\n\n` +
  `${FROZEN}\n\n${RULES}\n\n${MCP_CATALOG}\n\n` +
  `DELIVERABLE: the gate, rewritten to perceive via perception.ts/astNodes, with its EXISTING proof still PROOF PASS (write-direction preserved) AND concrete evidence the string/comment/template FP is gone. Remove any now-dead helper (e.g. a local regex extractor, an unused priorContent). Report exactly.`,
  { label: `rewrite:${r.gate}`, phase: 'Perception rewrites', schema: REWRITE_SCHEMA },
)));

phase('Horizon gates');
const newResults = await parallel(newGates.map((g) => () => agent(
  `You are ONE of 11 parallel agents completing expanded Y. Your parcel: BUILD the **${g.name}** — a gate that pushes the breathing horizon (converts a runtime fact the static crivo could never prove into a byte-fact WHERE observable, honest unjudged elsewhere).\n\n` +
  `FACT: ${g.fact}\n\nBUILD: ${g.build}\n\nGROUND: ${g.ground}\n\n` +
  `${FROZEN}\n\n${RULES}\n\n${MCP_CATALOG}\n\n` +
  `Create EXACTLY ${DIR}/gates/${g.name}.ts (GateModule of the frozen contract, kind:'${g.kind}') + ${DIR}/gates/${g.name}.proof.ts. Prove RED-on-violation + GREEN-on-resolve + UNJUDGED-when-unobservable (the honesty core: never green-by-assumption when the live target/model/harness is absent). Actually call the runtime MCPs to ground it. Be brutally honest about the residual that stays irreducible even after your gate. Report exactly.`,
  { label: `gate:${g.name}`, phase: 'Horizon gates', schema: NEWGATE_SCHEMA },
)));

return { rewrites: rewriteResults.map((r, i) => r ?? { gate: rewrites[i].gate, failed: true }), newGates: newResults.map((r, i) => r ?? { gateName: newGates[i].name, failed: true }) };
