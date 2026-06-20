export const meta = {
  name: 'trust-compiler-complete',
  description: 'Three parallel swarms complete the 3 partial Trust-Compiler subsystems (proof re-exec/Merkle/signature/decision-tree; executable+enforced gate lattice; sessionId causal blame) in the atomic-os clone via the atomic MCP',
  phases: [
    { title: 'Implement', detail: 'one swarm per gap — build the full subsystem via the atomic MCP' },
    { title: 'Verify', detail: 'adversarial review of each subsystem against the exact spec' },
  ],
}

const WORK = '/Users/danielpenin/kloel/atomic-os'

const IMPL_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  gap: { type: 'string' },
  filesCreated: { type: 'array', items: { type: 'string' } },
  filesWired: { type: 'array', items: { type: 'string' } },
  proofFile: { type: 'string' },
  summary: { type: 'string' },
  remainingGaps: { type: 'array', items: { type: 'string' } },
}, required: ['gap', 'filesCreated', 'summary', 'remainingGaps'] }

const VERDICT_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  gap: { type: 'string' }, lens: { type: 'string' },
  verdict: { type: 'string', enum: ['complete', 'partial', 'broken'] },
  evidence: { type: 'string' }, holes: { type: 'array', items: { type: 'string' } },
}, required: ['gap', 'verdict', 'evidence', 'holes'] }

const PRE = `You are completing a subsystem of the atomic-edit codebase at ${WORK} (the public atomic-os mirror).
HARD RULES (a teammate's session enforces these):
- Use the atomic MCP for ALL source edits. FIRST load the tools: call ToolSearch with query "select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_apply_edits,mcp__atomic-edit__atomic_insert_at,mcp__atomic-edit__atomic_insert_after_anchor,mcp__atomic-edit__atomic_grep,mcp__atomic-edit__code_read_symbol". FORBIDDEN to use Edit/Write/NotebookEdit on any source file.
- The MCP repo root is /Users/danielpenin/kloel, so address files as "atomic-os/src/<name>". Read files with the Read tool using the absolute path ${WORK}/src/<name>.
- Do NOT run "node src/build.mjs" or any build — concurrent builds corrupt the shared dist and two OTHER swarms are editing in parallel right now. The MCP firewall serializes writes safely and type-checks every write (fix any TS error it reports and retry until green).
- If an MCP write is refused with "dist STALE", run via Bash exactly: node /Users/danielpenin/kloel/scripts/mcp/atomic-edit/build.mjs   then retry the SAME write.
- ADDITIVE ONLY. Never delete/overwrite existing behavior (byte-positivity refuses negative edits without a written proofOfIncorrectness >=20 chars). Put core logic in NEW files; wire via atomic_insert_after_anchor or grep-then-insert_at (RE-GREP immediately before each wiring insert because other swarms shift line numbers).
- Match the existing precise/architectural comment style. Create your gates/*.proof.mjs test file but DO NOT run it (no build). Report exactly what you did.`

const verifyPrompt = (gapName, impl, lens, criteria) => `READ-ONLY adversarial review (lens: ${lens}) of ${gapName} in ${WORK}.
The implementer reported: ${JSON.stringify(impl)}.
Read the created/wired files with Read/Grep (do NOT edit anything). Judge against the ACCEPTANCE CRITERIA:
${criteria}
For lens "correctness": does the code actually DO what it claims — any bug, any no-op check (e.g. a filter referencing a nonexistent field so it never fires), any TS that would not compile, any path that silently returns success without doing the work?
For lens "spec-completeness": is EVERY listed criterion truly implemented in real code (not a stub/console.log/declarative descriptor)? List each criterion as met/unmet with a file:line.
Return verdict complete|partial|broken with concrete evidence (file:line) and the precise remaining holes.`

const C1 = `#1 Proof-Carrying Edits MUST deliver: (1) verify-proof RE-EXECUTES the gates/validate over the snapshot (re-runs engine validate(file,before,after) on embedded before/after content and asserts the recorded verdict reproduces) — not just recompute a hash; (2) a Merkle proof of the session snapshot (Merkle root over op afterSha256 leaves + leaf/path in the artifact, checked by verify-proof); (3) a dedicated cryptographic gateRunId per gated op; (4) a signature/seal of the final state verified by verify-proof; (5) the full per-gate decision tree (each gate name + ran/red/unjudged + fact) captured + exported + printed.`
const C2 = `#2 Gate Lattice MUST deliver: (1) a gap detector using the delta "all-gates-passed vs prod-broke" / corpus + incident signal (not merely "ops without a convergence verdict"); (2) proposals as COMPLETE EXECUTABLE GateModules (a real module exporting function gate(ctx){return {id,status,fact}} over an edit) — not a declarative descriptor; (3) a REAL monotonic admission verifier that runs the candidate gate against the corpus of known-good edits and admits ONLY if it reds none (the current check is a no-op: it references t.gateVerdict.requiresConvergence which does not exist — FIX it); (4) the engine WRITE PATH consults the registry so an admitted gate actually BLOCKS a violating write (grep writeWithTrace / the firewall and add registry-gate execution, additive).`
const C3 = `#3 Causal Blame MUST deliver: (1) mapping by sessionId — record a stable sessionId in every trace and link git commits to atomic sessions (by op afterSha256 matching committed content, or commit trailer) — not just file+timestamp; (2) RE-EXECUTE the crivo over the recovered before/after state of the offending op; (3) identify EXACTLY which gate returned green/unjudged on the bad edit (the false negative); (4) mark false-negative gates for recalibration (.atomic/recalibrate/<gate>.json) and feed a proposal into the #2 pipeline.`

const gap1 = `${PRE}

GAP #1 — COMPLETE Proof-Carrying Edits.
Current: ${WORK}/src/atomic-cli.mjs has cmdProve/cmdVerifyProof that export an artifact and recompute chainHash. The trace writer lives in ${WORK}/src (grep for "chainHash", "gateVerdict", "afterSha256", and the function that writes .atomic/traces — likely a server-helpers* file). The engine validator is validate(file,before,after) in ${WORK}/src/engine.ts.
${C1}
Create ${WORK}/src/engine-proof-reexec.ts for the re-exec + Merkle + signature logic. Wire cmdProve/cmdVerifyProof in atomic-cli.mjs (anchor-based) and add "verify-proof --reexec". If you must record gateRunId/decision-tree, extend the trace writer additively. Create ${WORK}/gates/proof-carrying.proof.mjs (do not run). Return the schema.`

const gap2 = `${PRE}

GAP #2 — COMPLETE the self-improving Gate Lattice.
Current: ${WORK}/src/atomic-cli.mjs has detectGapProposal/admitGate/cmdGaps/cmdAdmitGate/cmdEnforce and a registry .atomic/gates/registry.json. The write firewall is in ${WORK}/src (grep "writeWithTrace" and the function chain resolveSafeTarget -> validate -> write).
${C2}
Create ${WORK}/src/engine-gate-registry.ts (load + run registry GateModules over an edit; the real monotonic admission verifier). Generate at least one real executable GateModule file under ${WORK}/gates/. Wire the engine write path to consult+run admitted gates (additive, anchor-based) and fix admitGate's no-op check in atomic-cli.mjs. Create ${WORK}/gates/gate-lattice.proof.mjs (do not run). Return the schema.`

const gap3 = `${PRE}

GAP #3 — COMPLETE Causal Blame.
Current: ${WORK}/src/atomic-cli.mjs cmdBlame/cmdIncident map by file+timestamp. The trace writer is in ${WORK}/src (grep the .atomic/traces writer).
${C3}
Create ${WORK}/src/engine-causal-blame.ts (sessionId linkage, recover before/after, re-run the crivo, name the false-negative gate, write the recalibration record + feed #2). Record a stable sessionId in the trace writer (additive). Wire cmdBlame/cmdIncident in atomic-cli.mjs. Create ${WORK}/gates/causal-blame.proof.mjs (do not run). Return the schema.`

const gaps = [
  { id: '#1', name: '#1 Proof-Carrying Edits', prompt: gap1, label: 'proof', criteria: C1 },
  { id: '#2', name: '#2 Gate Lattice', prompt: gap2, label: 'lattice', criteria: C2 },
  { id: '#3', name: '#3 Causal Blame', prompt: gap3, label: 'blame', criteria: C3 },
]

const results = await parallel(gaps.map((g) => async () => {
  const impl = await agent(g.prompt, { label: `impl:${g.label}`, phase: 'Implement', schema: IMPL_SCHEMA })
  if (!impl) return { gap: g.id, impl: null, verdicts: [] }
  const verdicts = await parallel(['correctness', 'spec-completeness'].map((lens) => () =>
    agent(verifyPrompt(g.name, impl, lens, g.criteria), { label: `verify:${g.label}:${lens}`, phase: 'Verify', schema: VERDICT_SCHEMA })))
  return { gap: g.id, impl, verdicts: verdicts.filter(Boolean) }
}))

log(`swarms done: ${results.map((r) => `${r.gap}=${r.impl ? (r.verdicts.map((v) => v.verdict).join('/') || 'no-verdict') : 'FAILED'}`).join('  ')}`)
return results
