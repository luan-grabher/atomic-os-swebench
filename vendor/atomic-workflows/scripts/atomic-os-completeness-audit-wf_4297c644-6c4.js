export const meta = {
  name: 'atomic-os-completeness-audit',
  description: 'Audit atomic-os (universal standalone) vs the live Kloel atomic-edit v4 + packaging/publish completeness → prioritized finish plan',
  phases: [
    { title: 'Audit', detail: 'parallel finders: tool-gap, engine/grammar-gap, packaging/UX, correctness/health' },
    { title: 'Synthesize', detail: 'merge into a prioritized completeness plan + highest-value increment' },
  ],
}

const OS = `${args.work}/atomic-os`            // the cloned standalone package (builds + 64 tools, smoke 11/11)
const KL = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'  // live Kloel atomic-edit v4 source (read-only)

const FINDING = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'inAtomicOs', 'missingFromAtomicOs', 'verdict', 'plan'],
  properties: {
    summary: { type: 'string' },
    inAtomicOs: { type: 'array', items: { type: 'string' }, description: 'what atomic-os already has (do not re-add)' },
    missingFromAtomicOs: { type: 'array', items: { type: 'string' }, description: 'each gap: what — Kloel source file:line — universal-useful? (PORT|SKIP) + why — which atomic-os file it registers into' },
    verdict: { type: 'string', description: 'is this dimension complete-enough for "any dev"? honest yes/no + the crux' },
    plan: { type: 'array', items: { type: 'string' }, description: 'ranked concrete steps with file paths' },
  },
}

const finders = [
  { key: 'tool-gap', prompt:
    `Compare the registered MCP tool SETS. atomic-os tools are registered across ${OS}/src/server-tools-*.ts (smoke confirms 64). Kloel atomic-edit v4 tools are registered across ${KL}/server-tools-*.ts (a, a-2, a-3, b, c, converge, d, dispatch, self, y, etc.). Enumerate the tool NAMES in each (grep the tool registration calls / the name: fields), then produce the EXACT set of tools present in Kloel but NOT in atomic-os. For EACH missing tool, judge: is it a UNIVERSAL developer capability (e.g. an edit/search/refactor/verify op any dev wants) → PORT, or a Kloel-doctrine-specific self-governance tool (expand_self, y_certificate, abolish-unjudged, lens internals, bypass-policy) that is NOT broadly useful → SKIP with the reason. For PORT items, name the Kloel source file the tool's handler lives in + which atomic-os server-tools file it would register into. Be precise; this drives the port.` },
  { key: 'engine-grammar', prompt:
    `Compare the ENGINE + GRAMMAR coverage. atomic-os engine is ${OS}/src/engine*.ts + lang-bridge.ts; grammars are the tree-sitter-* deps in ${OS}/package.json (12 langs). Kloel atomic-edit is ${KL}/engine*.ts + advanced*.ts; its package.json lists grammars and recent work (per project memory) added CSS/HTML/SQL grammar coverage + a security gate + real-grammar validate + a honest lens. Determine: (1) which LANGUAGES/grammars Kloel supports that atomic-os lacks (css/html/sql?) and whether adding them to atomic-os is a simple package.json dep + lang-bridge mapping; (2) any ENGINE capability (validate/converge/lens/security-scan) newer in Kloel and universal-useful. Report file:line + portability. Skip Kloel-only self-expansion lattice internals.` },
  { key: 'packaging-ux', prompt:
    `Audit atomic-os PACKAGING + onboarding for a brand-new external developer. Read ${OS}/package.json, ${OS}/README.md, ${OS}/docs/INSTALL.md, ${OS}/docs/CLI_ACTIVATION_MATRIX.md, ${OS}/integrations/** (codex, opencode), ${OS}/src/atomic-edit-mcp-launcher.sh. Verify END-TO-END a dev could: install (npm i / npx), build, configure the MCP in Claude Code, Cursor, Codex, OpenCode, and a generic MCP client (are the JSON config snippets correct + present for each?), and run it. Flag: any broken/missing bin path, any residual Kloel/host-monorepo coupling or hardcoded path, missing npx-usability, missing "publish to npm" readiness (files field, .npmignore, prepublish build), stale version/tool-count claims (README says how many tools vs the real 64?), and any doc that overpromises vs what the smoke proves. Honest verdict on "any dev can adopt this in 5 min".` },
  { key: 'correctness-health', prompt:
    `Assess CORRECTNESS of atomic-os as shipped. Build is confirmed OK and smoke is 11/11 (lists 64 tools, one edit applies+persists, path-escape refused) — but that exercises only a few tools. Read ${OS}/src/smoke.mjs and the server-tools files to identify HIGH-VALUE tools NOT covered by smoke (ast edits, multi-file transaction, rename_symbol_universal, lsp WorkspaceEdit, grep/glob native, converge/verify). Identify any tool whose handler looks like a stub, throws "not implemented", or depends on something not bundled (a missing helper, a Kloel-only path, ts-morph vs web-tree-sitter mismatch). Check the launcher.sh for cross-platform issues (bash-only, macOS vs linux paths, the build-if-stale logic). Propose the minimal additional smoke coverage that would prove the package is trustworthy for any dev. Do NOT propose porting Kloel doctrine.` },
]

const audit = await parallel(
  finders.map((f) => () => agent(f.prompt, { label: `audit:${f.key}`, phase: 'Audit', schema: FINDING }).then((r) => ({ key: f.key, ...r }))),
)

const synthesis = await agent(
  `Synthesize a GROUNDED, PRIORITIZED completeness plan for atomic-os (the public universal standalone MCP at ${OS}). It already builds + runs + passes 11/11 smoke with 64 tools. Inputs:\n${JSON.stringify(audit.filter(Boolean), null, 2)}\n\n` +
  `Produce: (1) HONEST STATE — is atomic-os already "complete + universal for any dev", or what's the real gap? (2) RANKED finish queue — each = {what, exact files, why it matters for an external dev, how to verify (build+smoke), size S/M/L, PORT-or-SKIP rationale}. Separate UNIVERSAL improvements (port these: missing dev-useful tools, missing grammars, doc/publish fixes, more smoke) from KLOEL-DOCTRINE items (explicitly skip + say why they're not universal). (3) The SINGLE highest-leverage increment to do first. (4) npm-publish readiness checklist. (5) Honest risks (the source repo is actively churned by another agent — extract from Kloel HEAD; pushing to a public repo). Be concrete with file paths. No hedging.`,
  { label: 'synthesize', phase: 'Synthesize' },
)

return { audit: audit.filter(Boolean), synthesis }
