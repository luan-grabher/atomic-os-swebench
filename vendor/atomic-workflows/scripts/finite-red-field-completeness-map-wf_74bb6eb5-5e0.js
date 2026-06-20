export const meta = {
  name: 'finite-red-field-completeness-map',
  description: 'Enumerate 100% of the DECIDABLE (finite) red field, map each class to the complete decider that already exists in this repo, find the coverage gap vs the 13 gates, and produce the adapter plan to reach total finite completeness + the precise Rice boundary',
  phases: [
    { title: 'Enumerate', detail: 'the complete finite decidable red field + the available complete deciders + the Rice boundary, grounded in real tooling' },
    { title: 'Map', detail: 'coverage: each red class -> complete decider -> existing gate -> gap -> adapter' },
    { title: 'Synthesize', detail: 'the canonical Finite Red Field + Decider-Adapter Completeness map + the honest undecidable remainder' },
  ],
}

const AE = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit';
const RULES = `Daniel rejects abstraction. Be a rigorous computability/PL theorist AND a grounded engineer. Every class/claim MUST cite a real decider (tsc/LSP, module resolver, eslint/biome rule set, OpenAPI/AsyncAPI/Prisma index) or a real file in ${AE}/gates. Distinguish DECIDABLE (finite, closeable) from SEMI-DECIDABLE (sample-bounded, Rice wall) from UNDECIDABLE (forever unjudged). Never claim a semantic property is decidable. Cite Rice's theorem precisely. No vague words without a mechanism.`;

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area', 'findings'],
  properties: {
    area: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['redClass', 'stratum', 'completeDecider', 'availableInRepo', 'existingGate', 'gap', 'repairProposer'],
        properties: {
          redClass: { type: 'string', description: 'the invariant class (e.g. "name binds to a declaration")' },
          stratum: { type: 'string', description: 'decidable-finite | semi-decidable-sample-bounded | undecidable' },
          completeDecider: { type: 'string', description: 'the existing complete decider (tsc/LSP/module-resolver/eslint/OpenAPI-index/Prisma/...)' },
          availableInRepo: { type: 'string', description: 'is that decider reachable here? cite lsp-mesh / cognitive-hub / tsc / eslint / prisma / a gate file' },
          existingGate: { type: 'string', description: 'which of the 13 gates covers it today, or NONE' },
          gap: { type: 'string', description: 'what is uncovered + why' },
          repairProposer: { type: 'string', description: 'does the decider also emit a fix (code-action / --fix)? → feeds the convergence operator' },
        },
      },
    },
  },
};

phase('Enumerate');
const lenses = [
  { k: 'compiler-typechecker-field', p: `The compiler/type-checker decidable field: syntax well-formedness, name binding, type soundness, exhaustiveness. For each red class, the complete decider is tsc / the LSP. Is it reachable here? (lsp-mesh MCP lsp_diagnostics over 14 servers; mcp__lsp-mesh__*; the type-soundness-gate.) Which gate covers it; what's the gap; does tsserver emit code-actions (the repair proposer)? Cite Rice on where type-level Turing-completeness bites in theory vs terminates in practice.` },
  { k: 'linker-import-resolution-field', p: `The module-resolution/linker decidable field: relative + alias + bare import resolution, supply-chain, re-export/barrel resolution, orphan/reachability. Complete decider = the module resolution algorithm (+ the bundler). Map to connection-gate/supply-chain-gate/reachability-gate in ${AE}/gates; find the gap (dynamic require, string-built specifier — where it leaves decidable territory).` },
  { k: 'linter-structural-rule-field', p: `The linter's FINITE structural rule set: the complete eslint/biome rule catalog (no-unused, no-shadow, no-floating-promise, etc.). Complete decider = eslint/biome itself. findings-delta-gate implements 2 of 26 — quantify the full catalog as the finite field, and the adapter (run eslint --format json → normalize to GateRed; eslint --fix = the repair proposer). Which rules are decidable-finite vs which (e.g. no-floating-promise) need flow analysis but still terminate.` },
  { k: 'contract-reference-integrity-field', p: `The reference-integrity field against framework contracts: HTTP call→real route, event emit→real @OnEvent handler, Prisma query→real model/column, config key→real schema, DI token→real provider. Complete decider = the framework's contract INDEX (cognitive-hub: protocol_hub_openapi/asyncapi; the Prisma schema; the NestJS DI graph; gitnexus route_map). Map to contract-edge-gate/telemetry-emission-gate/iac-reference-gate; the gap (string-built routes, dynamic providers).` },
  { k: 'rice-boundary-and-dynamic-field', p: `The Rice boundary: rigorously partition what is SEMI-decidable (property-gate K-sample, liveness-gate live probe, deterministic-harness, formal-gate bounded model checking) — sample/bound-limited, never 100% — from what is UNDECIDABLE (functional correctness, termination, intent). State precisely: what can the substrate NEVER cover, and why claiming otherwise violates Rice. What is the maximal honest claim (total over decidable + unjudged over the rest)? Read the dynamic gates in ${AE}/gates to ground this.` },
];

const enumerate = await parallel(lenses.map((l) =>
  () => agent(`${RULES}\n\n== ENUMERATE: ${l.k} ==\n${l.p}\n\nRead the real gates under ${AE}/gates and probe the real deciders (ToolSearch the lsp-mesh / cognitive-hub / test-runner MCPs if useful). Return the structured findings.`,
    { label: `enum:${l.k}`, phase: 'Enumerate', schema: SCHEMA })
));

phase('Map');
const coverage = await agent(
  `${RULES}\n\nFour decidable-field enumerations + the Rice boundary (JSON):\n${JSON.stringify(enumerate.filter(Boolean), null, 2)}\n\n` +
  `Produce the COVERAGE MATRIX: dedupe into the canonical list of decidable red classes (Stratum 1). For each: the complete decider, whether it is reachable in THIS repo today, the existing gate (or NONE), the gap, and the repair proposer. Then compute: what % of the finite decidable field is covered by the current 13 gates, and what the remaining adapters are (the small set of decider-adapters that would close Stratum 1 to 100%). Be quantitative. Mark the Stratum 2/3 remainder as the honest unjudged frontier. Return prose + a table.`,
  { label: 'coverage-matrix', phase: 'Map' }
);

phase('Synthesize');
const synthesis = await agent(
  `${RULES}\n\nEnumerations:\n${JSON.stringify(enumerate.filter(Boolean), null, 2)}\n\nCoverage matrix:\n${coverage}\n\n` +
  `Write the canonical answer for Daniel (repo owner, wants surgical truth): (1) WHAT IS 100% of the finite red field — the complete enumeration of Stratum 1 (decidable), stated as a closed finite lattice with its generating deciders. (2) HOW to reach total finite computational completeness — the adapter-over-complete-deciders thesis (NOT hand-written gates): name each adapter (LSP→types/binding, module-resolver→imports, eslint→structural, contract-index→references), the exact first one to build on the current code, and how each decider's fix-emission (code-action/--fix) feeds the convergence operator so the corpus stops being import-fix-dominated. (3) THE RICE LINE — exactly what is forever uncoverable (Stratum 2 sample-bounded, Stratum 3 undecidable) and why the maximal honest claim is "total over the decidable, unjudged over the rest". (4) The honest caveat: where "decidable in practice" hides a theoretical non-termination (TS type Turing-completeness) and how the budget→unjudged pattern handles it. Flowing expert prose, quantitative where possible, zero filler.`,
  { label: 'synthesis', phase: 'Synthesize' }
);

return { enumerate: enumerate.filter(Boolean), coverage, synthesis };
