export const meta = {
  name: 'atomic-mcp-investigation',
  description: 'Deep-read the upgraded atomic-edit MCP source + produce an honest architectural assessment and a reproducible replica blueprint',
  phases: [
    { title: 'Read', detail: 'agents deep-read each atomic-MCP cluster (engine/perception/convergence-gates/server-surface/doctrine/self-repair)' },
    { title: 'Synthesize', detail: 'honest verdict + the stack-of-ideas + the reproducible replica blueprint' },
  ],
}

const ROOT = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit';

const PREAMBLE = `You are reverse-engineering the UPGRADED atomic-edit MCP engine at ${ROOT}. READ the real source (Read/Grep/Glob/code_outline). Be a rigorous, HONEST systems analyst — no marketing, no sycophancy. For every claimed innovation, state the actual mechanism (what code does it) and judge novelty soberly (is it genuinely new, a known pattern well-applied, or marketing?). Goal: understand it deeply enough to REBUILD it. cwd is the repo root; the engine source is under scripts/mcp/atomic-edit/.`;

const READ_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['cluster', 'files', 'coreIdeas', 'howItWorks', 'honestStrengths', 'honestLimits'],
  properties: {
    cluster: { type: 'string' },
    files: { type: 'array', items: { type: 'string' }, description: 'key source files read' },
    coreIdeas: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'mechanism', 'noveltyVerdict'],
        properties: {
          name: { type: 'string' },
          mechanism: { type: 'string', description: 'the actual code/algorithm that implements it' },
          noveltyVerdict: { type: 'string', description: 'genuinely-novel | known-pattern-well-applied | marketing — with one-line why' },
        },
      },
    },
    howItWorks: { type: 'string', description: 'the end-to-end flow of this cluster, concrete' },
    honestStrengths: { type: 'string' },
    honestLimits: { type: 'string', description: 'real limitations / overclaims / failure modes' },
  },
};

phase('Read');
const clusters = [
  { c: 'transaction & byte-floor engine', f: `The core mutation transaction engine: snapshot -> validate -> char/byte-level trace -> rollback. Find the engine (engine.ts / transaction / splice / batch / atomic_do / byte-effect capture / rollbackOnNonZero). How does EVERY mutation flow through one chokepoint? How are bytes (not lines) the unit of truth? How is rollback honest?` },
  { c: 'perception organ (AST/read)', f: `The READ/perception side: native-bridge.ts (web-tree-sitter WASM, ast-grep matcher), code_outline / code_read_symbol / code_browse, the "frozen read contract", token-correct AST extraction. How does it LOCATE spans (start_byte/end_byte) without writing? Which languages? How is it self-contained (no native binary / no PI)?` },
  { c: 'convergence + gates library', f: `The convergence layer: atomic_converge, server-tools-converge.ts, and scripts/mcp/atomic-edit/gates/* (binding-gate, contract-edge-gate, findings-delta-gate, iac-reference-gate, liveness-gate, property-gate, render-conformance-gate, reachability-gate, deterministic-harness). What is "inescapable convergence at the byte-write floor"? What does each gate enforce, and how are they "dissolved" into one converge effect? What is the "absolute lens / delta gates judge committed bytes via ctx.priorOf"?` },
  { c: 'server/MCP tool surface + firewall', f: `server.ts and the ~50 MCP tools + the governance guard / mutation firewall (protected-file refusal, no-shell-write kernel). How are semantic ops (rename_member, change_signature, etc.) compiled DOWN to the core byte-splice? How does the firewall make bypass impossible? The tool taxonomy.` },
  { c: 'doctrine + A/B evolution', f: `The doctrine/docs (README, principle docs) + any A/B evolution history. The stated PRINCIPLES (atomic action principle, mutation firewall, omnipresence doctrine, de-hardcode principle). What is the design philosophy and how does the code embody it? Be honest about which principles are realized in code vs aspirational.` },
  { c: 'self-repair (the HAND) + verify', f: `The self-repair / "HAND" (correct-by-construction find->repair loop) + atomic_verify (parallel/incremental/delta-tsc) + truth/zero-code-trust receipts. How does it find and repair to convergence? How is "correct-by-construction" achieved vs guess-and-check?` },
];

const reads = await parallel(clusters.map((u) =>
  () => agent(`${PREAMBLE}\n\n=== YOUR CLUSTER: ${u.c} ===\n${u.f}\n\nReturn the structured analysis. Read the real files; cite paths; judge novelty honestly.`,
    { label: `read:${u.c.slice(0, 26)}`, phase: 'Read', schema: READ_SCHEMA })
));

phase('Synthesize');
const synthesis = await agent(
  `${PREAMBLE}\n\nSix cluster analyses of the upgraded atomic-edit MCP (JSON):\n${JSON.stringify(reads.filter(Boolean), null, 2)}\n\n` +
  `Produce, as a senior systems architect writing for the repo owner (Daniel, who built it and believes it is revolutionary for agentic CLI AIs):\n` +
  `1) ARCHITECTURAL MAP — the engine in one tight diagram-in-prose: perception -> intention -> convergence/gates -> byte-floor transaction -> trace/rollback -> receipt. Name the real components.\n` +
  `2) THE STACK OF CONSECUTIVE EXCELLENT IDEAS — enumerate the distinct ideas (Daniel's framing) in build order, each with the mechanism + an honest novelty verdict (genuinely-novel / known-pattern-well-applied / marketing).\n` +
  `3) HONEST VERDICT — is it "revolutionary for agentic CLI AIs operationally"? Be precise + brutally honest (no sycophancy): WHERE it is a genuine step-change (e.g. mutation reliability / inescapable convergence / bypass-rate->0 that COMPOUNDS), and WHERE the claim is overstated (e.g. raw speed/throughput on trivial tasks, the "10x on everything" framing). Ground every claim in the mechanism. If it IS revolutionary in a specific dimension, say so plainly; if a claim is marketing, say so plainly.\n` +
  `4) THE REPLICA — the minimal reproducible blueprint: the smallest set of components + invariants that re-creates this technology's essence (so a competent engineer could rebuild it). State the irreducible core vs the elaboration.\n` +
  `5) WHAT I'D ADD/CHANGE — 3-5 concrete, honest improvements or risks.\n` +
  `Write it as flowing expert prose, not bullet soup. Honesty over flattery — Daniel explicitly values brutal honesty.`,
  { label: 'synthesize-assessment', phase: 'Synthesize' }
);

return { reads: reads.filter(Boolean), synthesis };
