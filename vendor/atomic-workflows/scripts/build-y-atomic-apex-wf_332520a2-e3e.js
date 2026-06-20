export const meta = {
  name: 'build-Y-atomic-apex',
  description: 'Build Y — the atomic MCP at its apex of inescapable convergence — across 5 disjoint, parallel, MCP-using build-fronts. Each mutates ONLY via the atomic firewall + locks, typechecks, authors its proof; integration is the main loop.',
  phases: [
    { title: 'BuildY', detail: '5 disjoint fronts in parallel: byte-floor, lens-tool, session, ledger+behavioral-wire, gate-receipt' },
  ],
}

const REPO = '/Users/danielpenin/whatsapp_saas'
const ATOMIC = `${REPO}/scripts/mcp/atomic-edit`

const ARSENAL = `
YOU MUST USE THE FULL SESSION MCP STACK (load any tool via ToolSearch('select:<name>') then call it). Understand → mutate → prove:
- **atomic-edit** = THE mutation firewall. MANDATORY for EVERY write; Write/Edit/cat>heredoc are BANNED. Tools: atomic_create_file, atomic_edit, atomic_edit_symbol, atomic_replace_range, atomic_insert_before_anchor/after_anchor, atomic_add_import, atomic_replace_text, code_outline + code_read_symbol (read ONE symbol, never the whole file), atomic_lock_acquire/release (CLAIM YOUR FILES FIRST — anti-collision), atomic_converge. Every write passes snapshot→validate→atomic-write→char-trace→rollback. Dogfood: your code must pass its own floor.
- **codegraph** (READ semantic graph): codegraph_callers/callees/impact/search/node — find EVERY caller of a symbol BEFORE you change it (e.g. codegraph_callers "atomicWrite"); codegraph_impact = blast radius.
- **gitnexus** (READ 91k-node graph): gitnexus_impact, route_map, query — cross-file impact.
- **test-runner** (PROVE): run_tsc (typecheck — DO run this on your changed files, no full rebuild), run_jest/run_vitest, run_eslint, affected_tests.
- **pulse** (REGRESSION): pulse_scan / pulse_health_by_module.
- **task-graph** (COORDINATION): task_lock_acquire/release — claim your front so no other agent collides.
- **graphify-plus** (IMPACT): blast_radius, affected_specs.
- **context7** (DOCS): resolve-library-id + query-docs for TS compiler API / MCP SDK / tree-sitter if needed.
DISCIPLINE: acquire an atomic_lock on your files FIRST. Mutate ONLY through atomic-edit tools. DO NOT run \`node build.mjs\` (it rmSync's the live dist — the integration phase rebuilds). Typecheck via test-runner run_tsc or \`tsc --noEmit\` on your files only. Author your proof file but DO NOT rely on a full rebuild to run it. Honest tri-state everywhere (green/red/unjudged) — never red-by-guess, never green-by-assumption. Release your lock when done.`

const BUILD_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    unit: { type: 'string' },
    lockId: { type: 'string' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    mutationsApplied: { type: 'array', items: { type: 'string' }, description: 'each atomic-edit op + what it did' },
    typecheckPassed: { type: 'boolean' },
    proofFileAuthored: { type: 'string', description: 'path of the .proof.mjs/.ts authored (empty if none)' },
    status: { type: 'string', enum: ['built', 'partial', 'blocked'] },
    blockers: { type: 'array', items: { type: 'string' } },
    integrationNotes: { type: 'string', description: 'exactly what the integration phase must do: register-in-server.ts lines, rebuild, which proof to run, expected result' },
  },
  required: ['unit', 'filesTouched', 'typecheckPassed', 'status', 'integrationNotes'],
}

const FRONTS = [
  {
    key: 'F1-byte-floor',
    spec:
      `FRONT F1 — FULL-GATE BYTE FLOOR (the foundational unit; ~40 LOC). FILE: ${ATOMIC}/server-helpers-io.ts (the atomicWrite function, lines 26-50).\n`
      + `TODAY (verified): atomicWrite runs ONLY checkConnectionByteFloor + checkSupplyChainByteFloor (2 of 8 WRITE_GATES). The other 6 (contract-edge, binding, render-conformance, telemetry-emission, iac-reference, findings-delta, type-soundness) run ONLY in convergeStatic (server-helpers-converge.ts:102), so atomic_edit/atomic_rename_symbol can land a dead route / dead React handler / NEW tsc error. The io.ts:27 docstring CLAIMS inescapable convergence — make it TRUE.\n`
      + `BUILD: in atomicWrite, after the existing connection+supply-chain checks, build a 1-entry overlay \`new Map([[relPath, content]])\` (compute relPath from absPath via REPO_ROOT) and call \`runGates(WRITE_GATES, REPO_ROOT, overlay, [relPath])\` (import WRITE_GATES + runGates from ./gates/registry.js). THROW on any red, mirroring the existing connection/supply-chain throws (io.ts:33-50), naming the gate+locus. CRITICAL anti-false-red: (a) honor the connection-gate pending-set (gates/connection-gate.ts:33 registerPendingWrites) so a multi-file A→B write set isn't reddened mid-set; (b) UNJUDGED must stay NON-blocking (runGates already separates threw/can't-decide from red — only throw on res.reds, never on unjudged); (c) the heavy typeSoundness gate runs tsc — bracket it behind the same buffered-batch boundary registerPendingWrites already brackets converge with (server-tools-converge.ts:95-103), OR if simpler, run the FAST static gates at the byte floor and leave typeSoundness to converge — DECIDE based on per-edit latency, document the choice. Read connection-gate.ts + registry.ts + converge's pending-set usage with codegraph/code_read_symbol FIRST.\n`
      + `PROVE (author ${ATOMIC}/server-helpers-io.byte-floor.proof.mjs): (1) an atomicWrite of a file introducing a NEW unresolved reference / dead wire is THROWN (refused) at the byte floor — NOT only at converge; (2) a valid write passes; (3) a multi-file set via the pending-set is NOT false-reddened; (4) unjudged stays non-blocking. Mirror gates/type-soundness-gate.proof.mjs structure (import from dist, in-memory tmp).\n`
      + `WARNING: this is the most critical file in the MCP. A wrong pending-set or batch boundary breaks ALL mutation. Use codegraph_callers "atomicWrite" to see every caller before changing it.`,
  },
  {
    key: 'F2-lens-tool',
    spec:
      `FRONT F2 — LENS-AS-MCP-TOOL (~80 LOC, mostly a NEW file). Create ${ATOMIC}/server-tools-lens.ts.\n`
      + `TODAY (verified): runLens (gates/lens.ts:84, whole-repo cap-8000 sweep returning the red-set {gate,file,locus,fact}) and repairScope (gates/repair.ts:173) are CLI-only — grep for them in server-tools-*.ts is EMPTY. The proven eye + hand are unreachable by any agent.\n`
      + `BUILD: a new server-tools-lens.ts exporting a register function (mirror the shape of another server-tools-*.ts register fn — read one with code_outline first) that registers: (1) atomic_lens { scope } → await runLens(REPO_ROOT, scope) (already returns the exact shape); (2) atomic_grep_calls { name, scope } → walk scope source files, call perception.calls() (gates/perception.ts) per file, return only matches whose callee===name, SKIP files where the accessor returns null (honest unjudged); (3) atomic_repair_scope { scope } → repairScope(REPO_ROOT, scope). Reuse existing functions VERBATIM — zero new analysis. Import runLens from ./gates/lens.js, repairScope from ./gates/repair.js, calls from ./gates/perception.js.\n`
      + `INTEGRATION NOTE: provide the EXACT line to add to server.ts (the tool registry) to call your register fn — the integration phase will add it.\n`
      + `PROVE (author ${ATOMIC}/server-tools-lens.proof.mjs): atomic_grep_calls finds a real call and returns ZERO matches for a name that appears only inside a string/comment (token-correctness); atomic_lens returns a red-set shape over a tiny tmp repo.`,
  },
  {
    key: 'F3-session',
    spec:
      `FRONT F3 — atomic_session (~150 LOC, a NEW file). Create ${ATOMIC}/server-tools-session.ts.\n`
      + `TODAY (verified): captureEffectSnapshot/diffEffect/rollbackEffect (server-helpers-effect.ts:40-140, byte-exact git-decoupled snapshot + char-level diff + untracked-inclusive revert) have 3 self-contained callers — no primitive makes a MULTI-tool plan atomic.\n`
      + `BUILD: a new server-tools-session.ts registering: atomic_session_begin (captureEffectSnapshot at REPO_ROOT → returns sessionId, store {snap, savepoints[]} in an in-process Map), atomic_session_savepoint {sessionId, name} (diffEffect against the live snap → push a named marker; does NOT re-snapshot, so the rollback target stays the original bytes), atomic_session_rollback {sessionId, toSavepoint?} (rollbackEffect to the named savepoint's file-set or full), atomic_session_commit {sessionId} (diffEffect → emit the merged [-removed-]{+added+} receipt across ALL files touched, clear the Map). The existing edit/exec tools need NO change — they write through atomicWrite inside the open window. Import the three effect fns from ./server-helpers-effect.js. Read effect.ts with code_read_symbol FIRST.\n`
      + `INTEGRATION NOTE: provide the EXACT server.ts registration line.\n`
      + `PROVE (author ${ATOMIC}/server-tools-session.proof.mjs): begin → two edits via atomicWrite → rollback restores byte-exact (sha256 identical to pre-begin); begin → edit → savepoint → edit → rollback-to-savepoint restores to the savepoint state.`,
  },
  {
    key: 'F4-ledger-behavioral',
    spec:
      `FRONT F4 — PROOF-CHAINED MUTATION LEDGER + WIRE THE BEHAVIORAL GATE (~140 LOC). FILES: ${ATOMIC}/trace.ts, ${ATOMIC}/server-tools-converge.ts, ${ATOMIC}/gates/registry.ts. (Acquire locks on all three.)\n`
      + `PART A — Proof-Chained Ledger. TODAY (verified): writeTrace (trace.ts:276-292) content-addresses each op by afterSha256 but has ZERO parent pointer; atomic_converge holds the gate verdict in conv.gates and THROWS IT AWAY (no writeTrace in the converge commit path). BUILD: add 3 fields to AtomicEditTrace (trace.ts:122): parentSha256:string, gateVerdict (the RegistryRun shape from gates/registry.ts), chainHash:string. In writeTrace: read .atomic/HEAD (last chainHash), set parentSha256=HEAD, compute chainHash=sha256(parent‖afterSha256‖canonicalJSON(sorted gateVerdict)), write the trace, then atomically rename .atomic/HEAD to the new chainHash (reuse the temp+rename idiom at trace.ts:285-287). In server-tools-converge.ts AFTER the green commit (line ~159), call buildTrace+writeTrace passing conv.gates as the verdict — converge currently persists NO proof.\n`
      + `PART B — Wire the already-built, already-proven behavior-contract-gate (gates/behavior-contract-gate.ts, 6/6 proven this session, currently UNWIRED). Add its import + entry to DYNAMIC_GATES in gates/registry.ts. Then, in server-tools-converge.ts, extend the dynamic-gate path so that when a written file carries a captured behavioral contract, the behavior-contract-gate runs with the PRIOR bytes captured BEFORE the commit (today DYNAMIC_GATES run post-commit with an empty overlay, so priorOf=disk=NEW → inert). The minimal honest coupling: before committing, snapshot prior content of each target; after writing, run behavior-contract-gate with an overlay/prior that lets it compare prior-vs-new; red → byte-exact revert. Read converge's existing effectSnap/probe flow (server-tools-converge.ts:130-157) with code_read_symbol FIRST and mirror it.\n`
      + `PROVE (author ${ATOMIC}/proof-chain.proof.mjs): two sequential writeTrace calls chain (child.parentSha256===parent.chainHash); a tampered gateVerdict makes the recomputed chainHash mismatch the child's parent pointer. And confirm gates/behavior-contract-gate.proof.mjs STILL passes 6/6 after the registry change.\n`
      + `WARNING: converge.ts is the commit path. Be surgical; don't alter the existing gate ordering.`,
  },
  {
    key: 'F5-gate-receipt',
    spec:
      `FRONT F5 — GATE-SOURCED TRUTH RECEIPT (~120 LOC). FILE: ${ATOMIC}/server-tools-h.ts (truth_receipt/behavior_receipt/zero_code_trust_score) + a new mapper.\n`
      + `TODAY (verified): server-tools-h.ts imports ONLY from server-helpers-product-locks — ZERO import of any gate/registry. So the receipt's REAL/runtime_probe evidence is 100% hand-supplied → an agent can attach a FABRICATED runtime_probe and mint a REAL/100 receipt.\n`
      + `BUILD: (1) a new tool atomic_prove { claim, directive } that — writes the directive (e.g. // @liveness url=... or // @property ... or // @model ...) into a throwaway probe file via atomicWrite, runs runGates(DYNAMIC_GATES, ...) (import from ./gates/registry.js), reverts byte-exact, and maps the RegistryRun verdict into a receipt evidence entry kind='runtime_probe' (liveness/probe green) or kind='formal_proof' (formal-gate green) carrying a gate-run id. (2) import that mapper into server-tools-h.ts and make truth_receipt REFUSE a kind='runtime_probe' evidence item UNLESS it carries a valid gate-run id from a real gate run. Keep the existing evidenceWeight cap discipline (server-tools-h.ts:142-163 — test/build can't reach 100; only gate-derived runtime_probe can). Read server-tools-h.ts truth_receipt + the dynamic gates (liveness-gate.ts, formal-gate.ts) with code_read_symbol FIRST.\n`
      + `INTEGRATION NOTE: provide the EXACT server.ts registration line for atomic_prove.\n`
      + `PROVE (author ${ATOMIC}/gate-sourced-receipt.proof.mjs): a hand-attached runtime_probe WITHOUT a gate-run id is REFUSED by truth_receipt; a real liveness-green via atomic_prove mints a REAL-tier evidence item.`,
  },
]

phase('BuildY')
const results = await parallel(
  FRONTS.map((f) => () =>
    agent(
      `You are one of 5 PARALLEL build-fronts constructing "Y" — the atomic MCP at its apex of inescapable convergence. Your front is INDEPENDENT and file-disjoint from the others; build ONLY your unit. Repo: ${REPO}.\n${ARSENAL}\n\n=== YOUR UNIT ===\n${f.spec}\n\n`
      + `PROCEDURE: (1) atomic_lock_acquire on your file(s). (2) Use codegraph/gitnexus + code_read_symbol to UNDERSTAND the exact insertion points and every caller BEFORE mutating. (3) Mutate ONLY via atomic-edit tools (the firewall). (4) Typecheck your changed files (test-runner run_tsc or tsc --noEmit on just your files — do NOT run node build.mjs). (5) Author your proof file (do not depend on a full rebuild to run it — the integration phase runs all proofs). (6) atomic_lock_release. Return the structured status — be precise in integrationNotes (exact server.ts lines to add, exact proof command, expected result) so the integration phase can finish without re-deriving your work. If blocked, return status='blocked' with the exact blocker — never fake green.`,
      { label: f.key, phase: 'BuildY', schema: BUILD_SCHEMA },
    ),
  ),
)

return {
  fronts: results.filter(Boolean).map((r) => ({
    unit: r.unit, status: r.status, files: r.filesTouched, typecheck: r.typecheckPassed,
    proof: r.proofFileAuthored, blockers: r.blockers || [], integrationNotes: r.integrationNotes,
  })),
  builtCount: results.filter(Boolean).filter((r) => r.status === 'built').length,
  blocked: results.filter(Boolean).filter((r) => r.status === 'blocked').map((r) => ({ unit: r.unit, blockers: r.blockers })),
}
