export const meta = {
  name: 'Y-gates-fanout',
  description: 'Build the 9 disjoint dissolvable convergence gates of Y in parallel — each agent creates one gate module + its isolated tsx proof against the frozen gates/contract.ts, using all MCPs to ground its fact, touching no shared file.',
  phases: [{ title: 'Build gates', detail: '9 disjoint gate modules, each proven in isolation via tsx' }],
};

const ROOT = '/Users/danielpenin/whatsapp_saas';
const DIR = 'scripts/mcp/atomic-edit';

const MCP_CATALOG = `
YOU MUST USE THE MCPs (load each tool's schema first with ToolSearch: \`select:<tool_name>\`, or keyword search). This is mandatory — ground every claim in real data, mutate ONLY through the atomic MCP.

— MUTATION (the ONLY allowed write path; native Write/Edit and shell heredocs are BANNED):
  • mcp__atomic-edit__* (~60 tools). atomic_create_file = create your new module/proof; atomic_edit / atomic_replace_text / atomic_replace_range = surgical edits; code_read_symbol / code_outline / code_outline_batch = read structure without reading whole files; atomic_grep / atomic_glob / atomic_outline / atomic_ast_search = universal in-process tree-sitter search (this IS the "Pi" engine — 12 languages, WASM, no daemon). Every write is byte-firewalled (snapshot→syntax-validate→atomic-rename→char-trace→rollback) AND connection-gated (a write that introduces a dangling relative import is refused — so your imports must resolve).

— READ / GRAPH (ground your gate's edge-set against the real codebase):
  • mcp__codegraph__* — codegraph_search / codegraph_callers / codegraph_callees / codegraph_impact / codegraph_context / codegraph_node / codegraph_files (SQLite+FTS5+tree-sitter, 19 langs). Find producer & consumer sites, caller edges.
  • mcp__gitnexus__* — query / cypher / route_map / impact / shape_check / context (91k-node graph; route_map returns Next.js routes; cypher = arbitrary graph queries).
  • mcp__graphify-plus__* — blast_radius / affected_specs / metadata_for_file / stub_route_inventory / hot_clusters / runtime_errors (enriched: BullMQ, NestJS DI, Next routing, API contracts).
  • mcp__lsp-mesh__* — lsp_definition / lsp_references / lsp_hover / lsp_diagnostics / lsp_symbols (REAL LSP over 14 servers). Use to VALIDATE that your static byte-fact matches ground-truth semantics — you are dissolving exactly this; prove your fact agrees with the LSP's.
  • mcp__cognitive-hub__* — protocol_hub_openapi (NestJS routes) / protocol_hub_asyncapi (73 event channels) / protocol_hub_sarif (findings) / protocol_hub_sbom (deps) / protocol_hub_manifest / protocol_hub_status. These are the protocol extracts already computed — GROUND your contract/findings/supply-chain gate on them.

— VERIFY (prove your gate is real):
  • mcp__test-runner__* — run_tsc (typecheck YOUR module), run_eslint (pure-text findings), run_jest / run_vitest, affected_tests, coverage_for_module, test_summary.
  • mcp__pulse__* — pulse_scan / pulse_scan_module / pulse_health_by_module / pulse_report / pulse_top_gates (the gate-less reality verifier — see what reality-breaks your gate should catch).
  • mcp__codacy__* — codacy_cli_analyze / codacy_get_file_issues / codacy_list_repository_tool_patterns (static-analysis findings).

— RUNTIME / DATA (use ONLY to DOCUMENT the honest ceiling — the BREATHING tier your static gate canNOT prove):
  • mcp__postgres__* (pg_query / pg_tables / pg_table_describe — read-only), mcp__sentry-bridge__* / mcp__datadog__* / mcp__railway__* (logs / metrics / traces / deployments), mcp__codecov__* (line-hit coverage).

— DOCS / REASONING:
  • mcp__context7__* — resolve-library-id + query-docs (official spec of any protocol you dissolve: SARIF 2.1.0, CycloneDX, OpenAPI, Terraform, OTel). mcp__sequential-thinking__sequentialthinking — structure your edge-resolution algorithm.
`;

const RULES = `
HARD RULES (anti-failure — violating these breaks the parallel fleet):
1. Create EXACTLY TWO new files, both under ${DIR}/gates/ , via mcp__atomic-edit__atomic_create_file:
     ${DIR}/gates/<NAME>.ts        — your GateModule (default export const = the module object), implementing the FROZEN interface in ${DIR}/gates/contract.ts (read it first; import its types with \`import { type GateModule, type GateContext, type GateResult, type GateRed, makeContext } from './contract.js';\`).
     ${DIR}/gates/<NAME>.proof.ts  — a standalone tsx proof: build an overlay/changedFiles fixture, call makeContext(...) then your gate's run(ctx), assert it RED on a planted dangling/violating case and GREEN on a resolving case, print "PROOF PASS"/"PROOF FAIL" and process.exit accordingly.
2. TOUCH NO OTHER FILE. Do NOT edit contract.ts, server-*.ts, smoke, build.mjs, or any sibling gate. Wiring into convergeStatic/atomicWrite/the registry is the human integrator's job — NOT yours.
3. Do NOT run \`node build.mjs\` (it collides with the other 8 agents on dist/). Do NOT \`git add\`/\`git commit\`. 
4. Prove ONLY via:  npx tsx ${DIR}/gates/<NAME>.proof.ts   (run it with Bash; it self-builds via tsx, no shared dist). Also run mcp__test-runner__run_tsc scoped to your two files if possible.
5. Your gate states ONE exoneration-free fact, language-agnostic, no daemon. kind:'static' for pure byte/edge facts; kind:'dynamic' only for the probe gate (execution-based). If your gate cannot decide from the bytes it has, return { unjudged:true } — never red-by-guess, never green-by-assumption. Mirror the seed style of ${DIR}/connection-gate.ts and ${DIR}/server-helpers-converge.ts.
6. Resolve your OWN relative imports (only ./contract.js) so the byte-floor connection gate does not refuse your create.
`;

const SEED = `Study the shipped seed FIRST (read with code_outline / Read): ${DIR}/connection-gate.ts (the reference gate shape — extractImportSpecifiers, relative resolution, NEW-wire-only semantics), ${DIR}/server-helpers-converge.ts (gateSyntax + gateConnection + convergeStatic), ${DIR}/server-helpers-io.ts (atomicWrite byte floor), ${DIR}/server-tools-converge.ts (atomic_converge + the effect gate apply→run→revert), ${DIR}/server-helpers-effect.ts (captureEffectSnapshot/diffEffect/rollbackEffect), ${DIR}/native-bridge.ts (the tree-sitter/"Pi" perception: validate/astGrep/nativeGrep). Match their style and the Mutation Firewall law (perception LOCATES spans; the engine SPLICES bytes).`;

const GATE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gateName', 'kind', 'moduleFile', 'proofFile', 'invariant', 'proofPassed', 'proofOutputTail', 'redProven', 'greenProven', 'ceiling', 'mcpsUsed', 'integrationNotes'],
  properties: {
    gateName: { type: 'string' },
    kind: { type: 'string', enum: ['static', 'dynamic'] },
    moduleFile: { type: 'string' },
    proofFile: { type: 'string' },
    invariant: { type: 'string', description: 'the one-line green/red rule' },
    proofPassed: { type: 'boolean', description: 'did `npx tsx <proof>` exit 0 with PROOF PASS' },
    proofOutputTail: { type: 'string', description: 'last ~15 lines of the proof run' },
    redProven: { type: 'string', description: 'the exact dangling/violating case it caught (with the GateRed it emitted)' },
    greenProven: { type: 'string', description: 'the resolving case it passed' },
    ceiling: { type: 'string', description: 'BRUTAL honesty: what this gate canNOT judge from bytes, and whether it returns unjudged or defers to the dynamic/effect gate' },
    mcpsUsed: { type: 'array', items: { type: 'string' }, description: 'which MCPs you actually called to ground the gate' },
    integrationNotes: { type: 'string', description: 'exactly what the integrator must do to wire this into convergeStatic / the byte floor / the lens' },
  },
};

const parcels = [
  { name: 'supply-chain-gate', kind: 'static',
    atom: 'SBOM / dependency closure — every dependency edge terminates at a real installed part, or it dangles.',
    build: 'A gate that, for a changed source file, judges its BARE import specifiers (the half connection-gate.ts explicitly leaves out: `if (!spec.startsWith(".")) return true`). Resolve each bare specifier against node_modules by byte-existence: package X resolves iff node_modules/X/package.json exists (handle scoped @org/x and subpath imports X/sub). NEW-bare-import-only semantics (a pre-existing unresolved import never blocks an unrelated edit; no write may INTRODUCE an import of a package not present in the installed tree). Builtins (node:fs, fs, path…) resolve true.',
    ground: 'Use protocol_hub_sbom (962 components / dependency edges) + read package.json + ls node_modules via atomic_glob. context7 for CycloneDX/SBOM spec. Document the version/CVE/license join as the ceiling.' },
  { name: 'reachability-gate', kind: 'static',
    atom: 'LCOV static half — a source file reachable from a root via import/call edges, or an orphan island.',
    build: 'A gate that builds the import (+ call, best-effort via tree-sitter) edge set over the overlay+repo and flags files with NO inbound edge from any root (entrypoints, route files, index, tests) as orphans → reds. For the WRITE direction, only flag if THIS write makes a file newly-orphaned or introduces an orphaned new file. Use the shared resolveRelImport for edges.',
    ground: 'codegraph_callers/codegraph_files + graphify-plus metadata_for_file/blast_radius + pulse coverage-calculator notion (structuralGraphCoverage = connected/relevant, orphanFiles = reds). Ceiling: reachable ≠ exercised ≠ correct; line-hit is the dynamic gate.' },
  { name: 'contract-edge-gate', kind: 'static',
    atom: 'OpenAPI + AsyncAPI + GraphQL + gRPC — a declared interface is a set of edges; every use-site edge resolves against a declare-site edge.',
    build: 'A gate parameterised over four producer/consumer edge-kinds: (a) HTTP: producer = controller decorator routes (method,path), consumer = apiFetch/fetch literals → consumer ⊆ producer; (b) events: producer = emit literals, consumer = @OnEvent/subscribe literals; (c) GraphQL: producer = SDL type→fields, consumer = selection sets; (d) gRPC: producer = proto service→methods, consumer = stub calls. GREEN iff every consumer edge has a producer; reds = dangling call/event/field/method. NEW-edge-only semantics. Keep it pragmatic: cover HTTP + events solidly (the repo has real data), GraphQL/gRPC best-effort or unjudged if absent.',
    ground: 'protocol_hub_openapi (NestJS routes) + protocol_hub_asyncapi (73 channels) + gitnexus route_map + codegraph_search for apiFetch/emit call sites. Ceiling: value/shape semantics + cross-service producers not on disk.' },
  { name: 'findings-delta-gate', kind: 'static',
    atom: 'SARIF — a finding is (where, which-rule, verdict); refuse the write that INTRODUCES a new pure-text single-file finding.',
    build: 'A gate that runs a pure-text analyzer (eslint --format=json, the pure-fn single-file subset) against the CANDIDATE content of each changed file and computes the DELTA vs the file prior content: red iff a NEW finding appears (same NEW-only logic checkConnectionByteFloor uses for imports). Each red = GateRed{file, locus:Lline:col, fact:ruleId+message}. Whole-program/type-flow rules (no-unsafe-assignment etc.) → mark unjudged / defer to the effect gate (do not fake).',
    ground: 'mcp__test-runner__run_eslint + parseEslintJson already in server-helpers-io.ts + codacy_get_file_issues + protocol_hub_sarif. context7 SARIF 2.1.0. Ceiling: type-aware/cross-file rules need the type system → effect gate.' },
  { name: 'binding-gate', kind: 'static',
    atom: 'LSP definition/references — a referenced name binds to exactly one declaration reachable in the overlay+tree, or it is unbound.',
    build: 'A gate that, for a changed source file, parses it (tree-sitter via native-bridge astGrep/validate), collects referenced identifiers in the changed region and asserts each binds to: a local/param/declared name, an imported name (whose module resolves via resolveRelImport or is bare), or a known global — else red (unbound name). Tiered precision exactly like engine-rename.ts: ts-morph (if available) → tree-sitter scope → regex word-boundary floor. NEW-unbound-only semantics.',
    ground: 'lsp-mesh lsp_definition/lsp_references to VALIDATE your byte-fact equals the LSP fact on sample symbols; codegraph_node. Ceiling: type-directed resolution at overload/generic/dynamic-dispatch → precision per-language, runtime-only bindings leave the bytes.' },
  { name: 'render-conformance-gate', kind: 'static',
    atom: 'CDP static half — a component declares affordances (onClick handler, href/route, aria-role); each declared affordance wires to a resolvable target, or it is a dead UI wire.',
    build: 'A gate over changed React/JSX (or HTML-string) components: extract declared interactive affordances (onClick={X}, href="/r", router.push("/r"), <Link href>) and assert each target resolves — handler X is a defined/imported symbol (reuse binding logic spirit), route /r resolves to a real Next.js route/page. Red = button/handler/route pointing at nothing (the dangling-wire fact for UI). NEW-affordance-only semantics. Frameworks: cover Next.js/React; others unjudged.',
    ground: 'graphify-plus stub_route_inventory + Next routing metadata + gitnexus route_map + codegraph for handler symbols. Ceiling: painted-pixel/timing/layout/real-network are NOT byte facts — document, never claim.' },
  { name: 'telemetry-emission-gate', kind: 'static',
    atom: 'OpenTelemetry inferred half — a declared span/log/metric edge resolves to emission code that is actually called, or it is a dead telemetry wire.',
    build: 'A gate over changed instrumented code: find declared telemetry edges (logger.X, span/tracer.startSpan, metric.inc, structured-log keys) and assert the emitter is real and reachable (reuse reachability spirit: the emitting function is called from some path). Red = a contracted telemetry point that no live path emits. Explicitly carry the OBSERVED tier as unjudged (TRUTH_INFERRED vs TRUTH_OBSERVED): static says "could emit", never "did emit in prod".',
    ground: 'pulse otel-runtime (OTEL_SOURCE_REAL/SIMULATED/NOT_AVAILABLE, buildStaticTraceSeed) + protocol_hub_asyncapi + sentry-bridge/datadog to DOCUMENT the observed ceiling. Ceiling: p99/observed-span/"did it boot" = the world, not bytes → unjudged-honest, deferred to live probe.' },
  { name: 'iac-reference-gate', kind: 'static',
    atom: 'K8s/Terraform LS — within a config closure, every declared reference points at a defined symbol, or it dangles.',
    build: 'A gate over changed HCL/YAML infra files: extract DEFINED symbols (terraform resource/variable/output/module names; k8s Deployment labels, named blocks) and REFERENCED symbols (${var.x}, module.y.output, depends_on, Service selector → Deployment label) and assert every reference ∈ definitions ∪ providers (provider/bare refs out-of-scope, mirroring connection-gate bare handling). Red = dangling intra-config reference. NEW-reference-only semantics. Use tree-sitter HCL/YAML if a grammar is available, else a robust regex parser.',
    ground: 'atomic_grep/atomic_ast_search over *.tf/*.yaml + context7 for Terraform/K8s reference syntax. Ceiling: live-cloud existence (AMI id, IAM role, CRD admission) needs terraform plan / kubectl --dry-run=server → dynamic/remote, not bytes.' },
  { name: 'probe-convergence-gate', kind: 'dynamic',
    atom: 'DAP — for a deterministic execution on a fixed input, "did control reach point L and with what value" is a single-valued fact.',
    build: 'A DYNAMIC gate (kind:"dynamic") that generalises the existing effect gate (server-tools-converge.ts effectCommand → apply→run→revert-byte-exact). Given a probe spec {file, locus, expectFact, runCommand}, it: writes an ephemeral assertion/print at the locus into the overlay candidate, runs the deterministic command (childProcess.spawnSync /bin/bash -c, timeout, maxBuffer), parses the observed reached-bit/value off stdout, and reverts byte-exact (reuse captureEffectSnapshot/diffEffect/rollbackEffect SHAPE — but DO NOT import/edit those shared files; re-implement a minimal snapshot/revert inside your gate module so you stay disjoint). GREEN iff the probe converges to the asserted fact; else red. Honestly mark non-deterministic execution (race/clock) as the ceiling.',
    ground: 'Read server-helpers-effect.ts + server-tools-converge.ts for the shape; pulse runtime-probes/executor.ts (HTTP probe analog); test-runner run_jest for a real deterministic command. Ceiling: adversarial schedule/flaky/live-DB are NOT one-shot facts → unjudged or honest-fail.' },
];

phase('Build gates');

const results = await parallel(parcels.map((p) => () => agent(
  `You are ONE of 9 parallel agents building the convergence gates of "Y" (the complete inescapable atomic-convergence crivo). Your disjoint parcel is the **${p.name}**.\n\n` +
  `ATOM you are dissolving: ${p.atom}\n\nWHAT TO BUILD: ${p.build}\n\nGROUND IT: ${p.ground}\n\n` +
  `${SEED}\n\n${RULES}\n\n${MCP_CATALOG}\n\n` +
  `DELIVERABLE: a real, tsx-PROVEN GateModule. Read gates/contract.ts, implement the interface, create your two files via atomic_create_file, ground your fact with the MCPs above (actually call them — codegraph/cognitive-hub/lsp-mesh/pulse/test-runner), prove RED-on-violation + GREEN-on-resolve via \`npx tsx ${DIR}/gates/${p.name}.proof.ts\`, and report exactly. If a part is genuinely undecidable from bytes, return unjudged — be brutally honest about the ceiling, do not fake green. Filenames: module=${DIR}/gates/${p.name}.ts , proof=${DIR}/gates/${p.name}.proof.ts .`,
  { label: p.name, phase: 'Build gates', schema: GATE_SCHEMA },
)));

return { gates: results.map((r, i) => r ? { ...r } : { gateName: parcels[i].name, failed: true }) };
