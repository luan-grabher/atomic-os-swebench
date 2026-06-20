export const meta = {
  name: 'atomic-dominance-abcde',
  description: 'Read-only design + adversarial de-conflict of the 5 moves to make atomic dominate factory default everywhere (content-addressing, dispatcher, bug fixes, read/search/run absorption, bypass instrumentation)',
  phases: [
    { title: 'Design', detail: 'one parallel agent per move A-E: exact files, edits, new tools, tests, risks' },
    { title: 'Harden', detail: 'adversarial de-conflict: shared-file collisions, dependency order, worktree-safe vs serial' },
  ],
}

const OURS = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit'
const PI = '/Users/danielpenin/pi-inspect/packages/natives/native/index.d.ts'

const SPEC = {
  type: 'object',
  additionalProperties: false,
  properties: {
    move: { type: 'string' },
    summary: { type: 'string' },
    files_touched: { type: 'array', items: { type: 'string' }, description: 'exact repo-relative paths, marked NEW or MODIFIED' },
    exact_changes: { type: 'array', items: { type: 'string' }, description: 'concrete edits/new tools with signatures' },
    tests: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['move', 'summary', 'files_touched', 'exact_changes', 'tests', 'risks'],
}

phase('Design')

const designs = await parallel([
  () => agent(`READ-ONLY. Design MOVE A: make CONTENT/ANCHOR/SYMBOL addressing the only agent-facing edit surface so the agent NEVER types line/column. Coordinate ops (atomic_replace_range/atomic_insert_at) become internal compilation targets; the engine LOCATES the span (via native astGrep for non-TS, ts-morph/AST for TS, or verbatim-text match) then splices.
Read in ${OURS}: server-tools-a.ts (the atomic_edit unified router + replace_text/replace_literal/edit_symbol/add_import/insert_after_anchor), engine.ts (applyEdits/posToOffset), server-tools-native.ts (the proven byte->UTF-16 + span-guard pattern), native-bridge.ts (astGrep).
Spec: how to add a content/symbol -> span LOCATOR that returns {startLine,startColumn,endLine,endColumn} so existing coordinate tools are fed internally; which agent-facing coordinate tools to mark deprecated in their description (NOT delete — back-compat); and a new ergonomic path like 'atomic_replace_text already does this — make it the documented default'. Reuse the server-tools-native.ts byte->UTF-16 + span-guard exactly. Depends on MOVE D (native astGrep) for non-TS locating.`,
    { label: 'design:A-content-addressing', phase: 'Design', schema: SPEC }),

  () => agent(`READ-ONLY. Design MOVE B: a single always-available dispatcher so the agent makes ZERO ToolSearch round-trips for common edits.
Read in ${OURS}: server.ts (registration), server-tools-a.ts (the existing 'atomic_edit' unified router and its op enum). 
Spec: extend the existing atomic_edit router op-enum to cover the high-frequency content-addressed ops (replace_text, replace_literal, edit_symbol, add_import, remove_import, insert_after_anchor, rename, create_file, delete_file) so ONE tool dispatches them all; note honestly which part is a HARNESS concern (ToolSearch deferral) that the MCP cannot control vs what consolidating the router CAN fix. Identify collision risk with MOVE A (both touch server-tools-a.ts router).`,
    { label: 'design:B-dispatcher', phase: 'Design', schema: SPEC }),

  () => agent(`READ-ONLY. Design MOVE C: fix two concrete bugs hit this session. (1) atomic_create_file with overwrite:true REFUSED an existing file ('refused: ... already exists'). (2) verify:'typecheck' ran 'tsc --noEmit (.)' from repo root and dumped the tsc HELP text (passed:false false-negative) instead of type-checking.
Read in ${OURS}: server-helpers-result.ts (commit + the create path), and grep for 'overwrite' and 'already exists' across *.ts to find where create_file's overwrite is handled; server-helpers-verify.ts (runPostEditVerify / the typecheck invocation).
Spec the EXACT fix for each: (1) where overwrite must short-circuit the 'already exists' refusal and allow the write; (2) how runPostEditVerify should invoke tsc so it actually type-checks (correct project/tsconfig, not the bare 'tsc' help). Include the exact lines.`,
    { label: 'design:C-bugs', phase: 'Design', schema: SPEC }),

  () => agent(`READ-ONLY. Design MOVE D: absorb the non-mutation 80% (read/search/run/snapshot) via the native pi-natives engine so nothing lives outside atomic AND each op BEATS Bash on speed/structure.
Read: ${PI} (grep/glob/fuzzyFind/search/summarizeCode/executeShell/isoDiff/isoStart/isoStop signatures), and ${OURS}/native-bridge.ts + native-worker.mjs (the fork-RPC pattern + which ops the worker already exposes), ${OURS}/server-tools-native.ts (tool-registration pattern).
Spec NEW tools: atomic_grep (native ripgrep), atomic_glob, atomic_outline (summarizeCode), atomic_do (executeShell under trace + iso snapshot so a shell command is reversible), atomic_snapshot/atomic_diff (iso*). For NON-mutating ops the firewall degrades: validate=parse-check or n/a, rollback=NO-OP, trace=provenance only. Specify the worker ops to add to native-worker.mjs (grep/glob/summarizeCode/executeShell/isoDiff) and the new tools file (e.g. server-tools-native-io.ts) + the one register line in server.ts. Note the executeShell session/cwd caveat from the d.ts.`,
    { label: 'design:D-absorb-io', phase: 'Design', schema: SPEC }),

  () => agent(`READ-ONLY. Design MOVE E: bypass-rate instrumentation — measure every time the AGENT reaches for Bash/Edit/Write/Grep/Read instead of an atomic equivalent, so the metric can be driven to zero.
Read in ${OURS}: trace.ts (the trace ledger), and ${OURS}/atomic-only-hook.mjs (the existing PreToolUse hook), and the project .claude/settings.json hooks block.
KEY HONESTY: the MCP server CANNOT see when the agent uses Bash/Edit — that happens in the harness. So instrumentation must live in a PreToolUse HOOK that intercepts Bash/Edit/Write/Grep/Read, classifies whether an atomic equivalent existed (e.g. a Bash 'grep'/'sed -i'/'cat >' had atomic_grep/atomic_replace/atomic_create), and appends to a bypass ledger (e.g. .atomic/bypass-ledger.jsonl) with {tool, hadAtomicEquivalent, reason}. Spec the hook script + the ledger format + a small 'atomic_bypass_report' reading it. Be honest about what's detectable (shell verbs) vs not.`,
    { label: 'design:E-bypass-meter', phase: 'Design', schema: SPEC }),
])

phase('Harden')

const specBlock = designs.filter(Boolean).map((d) => `### MOVE ${d.move}: ${d.summary}\nFILES: ${d.files_touched.join(', ')}\nCHANGES:\n- ${d.exact_changes.join('\n- ')}\nTESTS:\n- ${d.tests.join('\n- ')}\nRISKS:\n- ${d.risks.join('\n- ')}`).join('\n\n')

const plan = await agent(`Adversarial integrator. Below are 5 independent designs (A-E) to make the atomic-edit MCP dominate factory-default Claude Code everywhere. Produce ONE de-conflicted, ordered, executable build plan.

Resolve:
1. SHARED-FILE COLLISIONS: which moves touch the same files (expect server.ts registration, server-tools-a.ts router for A+B, native-bridge.ts/native-worker.mjs for D+A)? Co-editing the same file in parallel collides (sha-guard). Group moves by file-disjointness.
2. DEPENDENCY ORDER: A (content locating) depends on D (native astGrep). C bugs are independent. E is a hook (independent of MCP code). Give the exact serial order.
3. WORKTREE-SAFE vs MUST-SERIAL: which moves touch genuinely DISJOINT files (could run as isolated worktree agents) vs which share files (must serialize)?
4. TRAPS: native-locate UTF-16/byte/codepoint hazard (reuse the proven span-guard); dispatcher must not break the 50+ existing tools; atomic_do reversibility via iso is macOS-Apfs-limited; E's bypass detection is best-effort (shell verbs only); overwrite fix must not weaken the protected-file guard; tsc-verify must use the right tsconfig.
5. SMOKE: the existing 226/1 suite must stay green; each move adds its own checks.

Return: the ordered plan (step N: move, files, exact changes, the smoke that proves it), the disjoint-vs-serial grouping, and an explicit 'do NOT' list. Be brutal and concrete.

DESIGNS:
${specBlock}`,
  { label: 'harden:integrate', phase: 'Harden' })

return { designs: designs.filter(Boolean), plan }