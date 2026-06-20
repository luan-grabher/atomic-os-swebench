export const meta = {
  name: 'atomic-origin-trace',
  description: 'Trace the pre-code atom of each dev-protocol family (LSP/DAP/CDP/OpenAPI/AsyncAPI/OTel/SARIF/SBOM/tree-sitter/LSIF/GraphQL/gRPC/IaC-LS/test-reports/CI) and map each to its atomic-MCP convergence-gate equivalent, plus an adversarial feasibility pass on the universal green-convergence reading lens.',
  phases: [
    { title: 'Trace atoms', detail: 'one agent per protocol cluster: pre-code idealization → single atomic fact → universal atomic-MCP equivalent → honest ceiling' },
    { title: 'Stress-test lens', detail: 'adversarial feasibility of the correct-by-construction green-convergence scanner over 100% of bytes' },
  ],
};

const REPO = '/Users/danielpenin/whatsapp_saas';
const GROUND = `Ground every claim in this repo when relevant: the atomic-edit MCP at ${REPO}/scripts/mcp/atomic-edit (read connection-gate.ts, server-helpers-io.ts atomicWrite, server-helpers-converge.ts, server-tools-converge.ts — the just-shipped "inescapable convergence at the byte floor": every write refuses introducing a dangling relative import; the CONNECTION fact is exoneration-free — a relative import resolves or it dangles). Also: PULSE at ${REPO}/scripts/pulse (gate-less reality verifier), the cognitive-hub + lsp-mesh MCPs (protocol aggregators). The owner is a senior, brutally-honest builder who HATES sophistication-for-its-own-sake ("aramaico alienígena"). Be plain, real, technical. Separate what is GENUINELY atomic+universal+implementable from what is aspirational or impossible. Never overclaim.`;

const TRACER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cluster', 'atoms', 'clusterVerdict'],
  properties: {
    cluster: { type: 'string' },
    atoms: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['protocol', 'preCodeIdea', 'humanComplexityAdded', 'atomicFact', 'universalEquivalent', 'honestCeiling'],
        properties: {
          protocol: { type: 'string' },
          preCodeIdea: { type: 'string', description: 'The indivisible question/idealization that existed ONLY in the world of ideas BEFORE any code was written — the absolute floor this protocol is an expansion of. What primitive human need did the inventor reach for?' },
          humanComplexityAdded: { type: 'string', description: 'The wrong expansion: why it became complex/non-universal — the assumption of HUMAN execution (editor UX, IDE round-trips, per-language servers) that does NOT apply to an agentic CLI AI.' },
          atomicFact: { type: 'string', description: 'The single exoneration-free fact underneath — the binary/graph truth that needs no gate, no language bias, no guessing (analogous to "a relative import resolves or it dangles").' },
          universalEquivalent: { type: 'string', description: 'The atomic-preserving, language-agnostic correspondent that dissolves this protocol into the atomic MCP as ONE more convergence gate. Concrete and implementable: what does the crivo compute over the bytes? How is it correct-by-construction?' },
          honestCeiling: { type: 'string', description: 'BRUTAL HONESTY: what about this protocol genuinely CANNOT be replaced by static byte-convergence (e.g. live runtime state, type inference needing a full type system, cross-service contracts). State it plainly.' },
        },
      },
    },
    clusterVerdict: { type: 'string', description: 'One-paragraph synthesis: is this whole cluster dissolvable into the atomic convergence crivo, partially, or not at all — and the single deepest insight.' },
  },
};

const clusters = [
  { name: 'Code semantics (the symbol layer)', protocols: 'LSP, tree-sitter, LSIF/SCIP', focus: 'meaning, definition, references, navigation, AST. The "olhos para o código". Trace why LSP needs a per-language SERVER and whether the agent actually needs the server or only the FACT the server computes.' },
  { name: 'Declared contracts (the interface shape)', protocols: 'OpenAPI, AsyncAPI, GraphQL introspection, gRPC/Protobuf', focus: 'the declared shape of an HTTP/event/typed interface — the "mapa das portas". Trace the atom: a contract is a promise; the atomic fact is whether code HONORS its own declared shape (request/response/event/message types match usage).' },
  { name: 'Live runtime & observability', protocols: 'DAP (debug), CDP (browser), OpenTelemetry/OTLP (logs/traces/metrics)', focus: 'the live process — "estetoscópio do processo vivo / sistema nervoso sensorial". This is the HARDEST cluster: a running process is NOT a byte-at-rest. Be especially honest about whether static byte-convergence can EVER replace runtime observation.' },
  { name: 'Findings & supply-chain inventory', protocols: 'SARIF (static-analysis findings), SBOM/SPDX/CycloneDX (dependency inventory)', focus: 'the "prontuário de defeitos / DNA de dependências". Trace: a finding is just a (location, rule, verdict) tuple; an SBOM is just the closure of import edges. Both look very dissolvable into a convergence crivo — verify that.' },
  { name: 'Proof & deploy gate', protocols: 'JUnit/LCOV test reports, CI/CD checks API, Kubernetes/Terraform language servers', focus: 'the "sistema de prova / semáforo de produção". Trace: a test result is the dynamic-effect gate; coverage is a byte-reachability fact; a CI check is an aggregate verdict; IaC-LS is contract-honoring for infra. Where is the atom, where is the irreducible runtime?' },
];

phase('Trace atoms');

const work = [
  ...clusters.map((c) => () => agent(
    `You are tracing the ATOMIC ORIGIN of a family of developer protocols, for a formalization the owner will use to decide the future of the atomic-edit MCP.\n\n` +
    `CLUSTER: ${c.name}\nPROTOCOLS: ${c.protocols}\nFOCUS: ${c.focus}\n\n` +
    `THE CORE THESIS you are testing per protocol: every one of these protocols was invented BEFORE agentic CLI AIs existed. At the moment each was conceived, a human mind reached for an indivisible primitive (the absolute floor — byte-level, the origin of atomicity) and then EXPANDED it the WRONG way: it wrapped the atom in complexity built around HUMAN execution (IDE round-trips, per-language servers, editor UX), which does NOT match how an agentic AI acts on a codebase. Your job: (1) recover the pre-code idealization (the atom in the world of ideas), (2) name the wrong human-complexity expansion, (3) extract the single exoneration-free atomic FACT underneath, (4) design its universal/language-agnostic correspondent that dissolves the protocol into the atomic MCP as ONE more correct-by-construction convergence gate, (5) state the BRUTAL honest ceiling (what cannot be dissolved).\n\n` +
    `The seed pattern is already shipped: the CONNECTION gate (a relative import resolves or it dangles — exoneration-free, no language server, judged at the byte-write floor). Every equivalent you propose must be of THAT character: a fact, not a heuristic; universal, not per-language; computed over bytes/edges, not requiring a live human or a running daemon (unless you prove it irreducibly does, which is the honest ceiling).\n\n` +
    GROUND,
    { label: `trace:${c.name.split(' ')[0].toLowerCase()}`, phase: 'Trace atoms', schema: TRACER_SCHEMA },
  )),
  () => agent(
    `You are the ADVERSARIAL FEASIBILITY reviewer for the boldest claim in the formalization: the "ATOMIC READING LENS" — a single universal/generalist/agnostic scanner that:\n` +
    `  - traverses 100% of any codespace/codebase/repo,\n` +
    `  - passes EVERY byte through one crivo where ALL gates/principles/atomicities must converge SIMULTANEOUSLY to green (correct-by-construction),\n` +
    `  - but, knowing AI context is limited, REPORTS ONLY the RED — for each non-converged byte: exact byte, location, the specific gate(s) it failed, and everything that blocked correct-by-construction,\n` +
    `  - so the AI can apply the needed atomicity universally/massively until the whole repo is correct-by-construction and production-ready.\n\n` +
    `The owner himself flagged the key risk: "if you analyze only raw bytes, this probably does NOT work — that's why it must be the crivo = correct-by-construction." Pressure-test EXACTLY that. Your output must brutally separate:\n` +
    `  - whatWorks: which gates are genuinely byte-local + exoneration-free + universal (connection, syntax-via-tree-sitter, dependency-closure, contract-self-consistency, finding-tuples) and CAN run over 100% of bytes as a green/red crivo;\n` +
    `  - whatBreaks: where the lens is a fantasy if taken literally — gates that need a full type system, whole-program/cross-file context, runtime execution, cross-repo/network state, or human intent; and the context-window math of "report only red" at repo scale;\n` +
    `  - designSketch: the most HONEST implementable version of the lens (what it actually computes, how red is reported atomically, how it streams so context never overflows, how correct-by-construction replaces raw-byte naivety);\n` +
    `  - honestVerdict: is the end-state ("an MCP that makes ANY codebase production-ready, stable, correct-by-construction") real, partially real, or marketing? Say it straight.\n\n` +
    `Ground in the real seam: the just-shipped byte-floor connection gate proves the SMALL version works (every write must converge green); the question is whether the READ/scan direction generalizes to all gates over a whole repo. Also weigh PULSE (${REPO}/scripts/pulse) which already attempts whole-repo reality-verification without gates — what does it teach about feasibility and cost?\n\n` +
    GROUND,
    { label: 'stress:reading-lens', phase: 'Stress-test lens', schema: {
      type: 'object', additionalProperties: false,
      required: ['thesis', 'whatWorks', 'whatBreaks', 'designSketch', 'honestVerdict'],
      properties: {
        thesis: { type: 'string' },
        whatWorks: { type: 'array', items: { type: 'string' } },
        whatBreaks: { type: 'array', items: { type: 'string' } },
        designSketch: { type: 'string' },
        honestVerdict: { type: 'string' },
      },
    } },
  ),
];

const results = await parallel(work);
return { traces: results.slice(0, clusters.length).filter(Boolean), lens: results[results.length - 1] };
