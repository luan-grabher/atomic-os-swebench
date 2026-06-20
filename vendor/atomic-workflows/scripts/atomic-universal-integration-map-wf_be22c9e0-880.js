export const meta = {
  name: 'atomic-universal-integration-map',
  description: 'Read-only: map exact integration surface to absorb pi-natives universal engine into our atomic-edit MCP, then adversarially harden the plan',
  phases: [
    { title: 'Map', detail: 'parallel readers over our envelope, universal seams, oh-my-pi wrappers, pi-natives contracts, build/vendor story' },
    { title: 'Harden', detail: 'adversarial review of the integration spec for ABI/segfault/governance-bypass/rollback traps' },
  ],
}

const OURS = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit'
const PI = '/Users/danielpenin/pi-inspect'

const FINDING = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'tight prose summary of what was found' },
    facts: { type: 'array', items: { type: 'string' }, description: 'concrete file:symbol facts, signatures, paths' },
    integration_points: { type: 'array', items: { type: 'string' }, description: 'exact functions/files where pi-natives slots in, with how' },
    risks: { type: 'array', items: { type: 'string' }, description: 'traps, gotchas, fragilities discovered' },
  },
  required: ['summary', 'facts', 'integration_points', 'risks'],
}

phase('Map')

const map = await parallel([
  () => agent(`READ-ONLY. Map the Mutation-Firewall WRITE PATH and tool-registration of our atomic-edit MCP at ${OURS}.
Read: server.ts, server-core.ts, trace.ts, guard.ts, founder.ts, engine.ts, and a couple server-tools-*.ts to see the tool shape.
Answer precisely: (1) how is a new MCP tool registered (function name, file, schema convention)? (2) the exact write primitive every mutation goes through (splice/atomic write fn signature)? (3) how sha256 before/after + syntax-validate + trace ledger + protected-file guard are invoked around a write — name the functions and files. (4) the rollback mechanism. Return the exact signatures I must reuse to wrap a NEW tool so it stays inside the firewall.`,
    { label: 'map:envelope', phase: 'Map', schema: FINDING }),

  () => agent(`READ-ONLY. Map the existing UNIVERSAL seam of our atomic-edit MCP at ${OURS}.
Read fully: engine-universal.ts and lang-bridge.ts.
Answer: (1) every exported function in each, with signature. (2) which use regex/char-walking vs which shell out to python3 tree_sitter. (3) the EXACT functions/lines where pi-natives (astEdit dryRun / astGrep / summarizeCode / in-process tree-sitter parse) would REPLACE the current weak impl — give a replacement map: old-fn -> pi-natives-call. (4) who calls these (grep callers in server-tools-*.ts) so we know blast radius.`,
    { label: 'map:universal-seam', phase: 'Map', schema: FINDING }),

  () => agent(`READ-ONLY. Study how oh-my-pi itself wraps the native engine, at ${PI}/packages/coding-agent/src/tools/.
Read: splice.ts, ast-plan.ts, atomic-eval.ts, intention.ts, convert-reexport.ts, tree-snapshot.ts.
Answer: (1) the proven calling conventions for astEdit / astGrep / executeShell / iso* — exact option objects they build, dryRun discipline, how they apply computed changes, error handling. (2) how they snapshot + rollback (tree-snapshot.ts / iso). (3) any safety patterns (limits, parse-error handling, governance) I should copy. Return copy-ready patterns, not vague description.`,
    { label: 'map:ohmypi-wrappers', phase: 'Map', schema: FINDING }),

  () => agent(`READ-ONLY. Extract the COMPLETE type contract of the pi-natives napi addon from ${PI}/packages/natives/native/index.d.ts.
For each of: astEdit, astGrep, summarizeCode, executeShell, isoDiff/isoStart/isoStop/isoProbe/isoResolve, grep, glob — give the full input option type AND the full result type (including nested types like AstReplaceChange, AstReplaceFileChange, AstFindMatch, SummaryResult, ShellRunResult, IsoFileChange). Also: getSupportedLanguages/supportsLanguage. Return every field with its type. This is the API surface I will wrap.`,
    { label: 'map:contracts', phase: 'Map', schema: FINDING }),

  () => agent(`READ-ONLY. Map the BUILD + LAUNCHER + VENDOR story for our atomic-edit MCP.
Read: ${OURS}/build.mjs, ${OURS}/../atomic-edit-mcp-launcher.sh, ${OURS}/package.json if any, and inspect ${PI}/packages/natives/native/ (index.js, index.d.ts, the .node files present) + ${PI}/packages/natives/package.json.
Answer: (1) how build.mjs compiles ts->dist (so I know how to add native-bridge.ts). (2) exactly how pi-natives/native/index.js loads the .node (the loader logic that failed when I required index.js directly). (3) what files I must vendor into atomic-edit/vendor/pi-natives/ for self-contained loading. (4) is there a linux-x64 .node prebuilt anywhere in pi-inspect, or only darwin-arm64? (5) napi ABI: any version pin that could break loading under node v25.`,
    { label: 'map:build-vendor', phase: 'Map', schema: FINDING }),
])

phase('Harden')

const spec = map.filter(Boolean).map((m, i) => `### Finding ${i + 1}\n${m.summary}\nFACTS:\n- ${m.facts.join('\n- ')}\nINTEGRATION:\n- ${m.integration_points.join('\n- ')}\nRISKS:\n- ${m.risks.join('\n- ')}`).join('\n\n')

const hardened = await agent(`You are an adversarial systems reviewer. Below is a mapping of how we plan to absorb the pi-natives universal engine (Rust napi addon: astEdit/astGrep/summarizeCode/executeShell/iso*) into our atomic-edit MCP, keeping the Mutation Firewall law (pi-natives computes changes via dryRun; OUR engine is the only writer; sha256+trace+protected-guard+rollback around every write).

Attack this plan. Find what BREAKS in production:
- In-process native addon: a Rust panic/segfault kills the whole MCP server (all 50+ tools die). Is worker-thread isolation needed? What does oh-my-pi do?
- astEdit dryRun semantics: does dryRun reliably return per-file char-level changes we can re-apply through OUR splice, or does it only return counts? (check the contract finding) If only counts, the "dry-run then firewall-write" plan is BROKEN — what's plan B?
- Governance bypass: astEdit on a directory could mass-edit protected files. How do we enforce protected-file guard BEFORE applying computed changes?
- Multi-file rollback: astEdit touches N files; if file 3 fails validation, how do we roll back files 1-2 atomically? Does iso* give us this?
- ABI: darwin-arm64 only; CI/prod is linux. Honest blocker?
- ast-grep pattern ergonomics: expressing edits as patterns vs our symbol-selector tools — what class of edits does astEdit NOT cover that our TS tools do?

Return: the hardened, ordered, minimal build plan (concrete steps, files to touch, tool names) with each risk's mitigation, AND an explicit list of what is NOT achievable (honest ceiling). Be brutal. No optimism.

MAPPING:
${spec}`,
  { label: 'harden:adversarial', phase: 'Harden' })

return { mappings: map.filter(Boolean), hardened_plan: hardened }