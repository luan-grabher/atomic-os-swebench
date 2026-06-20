export const meta = {
  name: 'atomic-114-dogfood',
  description: 'Exercise ALL 114 atomic-edit MCP tools for real + use them to investigate atomic itself. Mutations run inside rolled-back sessions on scratch files; repo stays pristine.',
  phases: [
    { title: 'Read', detail: 'read/nav/proof/receipt tools, parallel, read-only, pointed at atomic source' },
    { title: 'Mutate', detail: 'edit/refactor/txn/agent-loop/self-mod tools, SERIALIZED, session+rollback, scratch-isolated' },
  ],
}

const TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'reachedAtomic', 'tools', 'deepFindings', 'residue'],
  properties: {
    agent: { type: 'string' },
    reachedAtomic: { type: 'boolean', description: 'did atomic_native_status succeed (MCP reachable)?' },
    tools: {
      type: 'array',
      description: 'one entry per assigned tool — ALL must appear',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'invoked', 'mutating', 'whatItDoes'],
        properties: {
          name: { type: 'string' },
          invoked: { type: 'boolean', description: 'true if actually called; false if deliberately skipped for safety' },
          mutating: { type: 'boolean' },
          whatItDoes: { type: 'string', description: '1-2 sentences from REAL execution, not docs' },
          observed: { type: 'string', description: 'key result/quote from the actual call (verdict, receipt field, error, refusal)' },
          atomicInsight: { type: 'string', description: 'what this call revealed about atomic ITS design/completeness/fragility' },
          skippedReason: { type: 'string', description: 'if invoked=false, exactly why (e.g. irreversible external effect)' },
        },
      },
    },
    deepFindings: { type: 'string', description: 'prose: what this slice reveals about atomic operational completeness, the honesty mechanisms, and any weakness/fragility discovered live' },
    residue: { type: 'string', description: 'pristine-check result: confirm scratch dir empty / session rolled back / zero damage to real repo, or report residue honestly' },
  },
}

const SAFETY = `
ATOMIC IS BOUND TO THE REAL REPO /Users/danielpenin/kloel — DO NO HARM.
- First call atomic_native_status to confirm the MCP is reachable; set reachedAtomic. If it FAILS, stop, report reachedAtomic:false and which tools you could not run.
- All tool paths are repo-relative. Confine EVERY scratch artifact to the dir: scripts/mcp/atomic-edit/.dogfood-<LABEL>/ (unique to you).
- Wrap ALL mutating work in a session: atomic_session_begin (capture sessionId) -> create scratch fixtures -> exercise tools ON YOUR SCRATCH FILES ONLY -> atomic_session_rollback at the end.
- NEVER mutate a real repo file. NEVER target an existing source file with a rename/replace/delete. Only files YOU created under your scratch dir.
- After rollback, atomic_glob 'scripts/mcp/atomic-edit/.dogfood-<LABEL>/**'. If anything remains, atomic_delete_file each, re-check, and report. residue MUST state the pristine result honestly.
- Create whatever small fixture each tool needs (a tiny .ts/.py file with a function, a call, imports, a class, a decorated method, an array literal, an exported symbol, etc.) so the tool has something real to act on. Observe the proof receipt / gate verdict each tool returns.
- For EVERY assigned tool emit a tools[] entry. If a tool is genuinely unsafe to fire (irreversible/external effect with no dry mode), set invoked:false + skippedReason and describe what it WOULD do — that still counts as exercised.
- Goal is BOTH: (1) learn what each tool really does by running it, and (2) use them to investigate atomic's own implementation under scripts/mcp/atomic-edit/.
- Return the structured object. Be concrete; quote real outputs.
`

phase('Read')
const readReports = await parallel([
  () => agent(`${SAFETY}
LABEL=nav. You own these 6 READ-ONLY atomic tools (load all via one ToolSearch select): atomic_glob, atomic_grep, atomic_grep_calls, atomic_ast_search, atomic_scan_bytes, atomic_locate.
Use them to MAP atomic's own source under scripts/mcp/atomic-edit/ : glob the tree, grep for how gates/engine/proof-chain are wired, grep_calls to trace a key function's callers, ast_search for a structural pattern, scan_bytes on a real file, locate an anchor. For each: what it does + what it revealed about atomic.`,
    { label: 'read:nav', phase: 'Read', schema: TOOL_SCHEMA }),

  () => agent(`${SAFETY}
LABEL=outline. You own these 10 READ-ONLY tools: atomic_read_file, atomic_outline, code_browse, code_file_stat, code_outline, code_outline_batch, code_read_symbol, code_read_symbols_batch, code_readcode, code_readcode_batch.
Use them to read+outline atomic's core files (server.ts, engine*.ts, gates/registry.ts, server-tools-*.ts) and a Python + a Go + a Rust file if present, to see cross-language structural parsing. Note atomic_read_file's byte-classification lens behavior. For each tool: what it does + atomic insight.`,
    { label: 'read:outline', phase: 'Read', schema: TOOL_SCHEMA }),

  () => agent(`${SAFETY}
LABEL=proofmeta. You own these 13 tools (mostly read/compute): atomic_prove, atomic_y_certificate, atomic_bypass_report, atomic_lesson_rules, atomic_disproof_briefing, atomic_native_status, atomic_workspace_status, atomic_lock_status, atomic_host_reentry_receipt, atomic_positive_bytes_verify_receipt, continuity_status, atomic_git_remote, atomic_dispatch_tool.
Exercise each to understand atomic's proof/governance/continuity surface. For atomic_prove/atomic_y_certificate, try to export/inspect a proof for a recent op from the .atomic proof chain (use atomic_grep/log discovery if needed; if no opId is available, report that honestly). Use atomic_dispatch_tool only to introspect/list — do NOT dispatch a mutating tool through it. atomic_git_remote: read remotes only. Report what each reveals about how atomic certifies its own work.`,
    { label: 'read:proofmeta', phase: 'Read', schema: TOOL_SCHEMA }),

  () => agent(`${SAFETY}
LABEL=receipts. You own these 6 tools: atomic_lens, truth_receipt, behavior_receipt, zero_code_trust_score, product_intent_contract, atomic_shadow_gate.
Run atomic_lens on scripts/mcp/atomic-edit/gates (see the red-set + unjudged domains the gates SEE on atomic's own gate code). Feed truth_receipt / behavior_receipt / zero_code_trust_score a small sample evidence set to see how atomic classifies claims (real vs partial vs facade). product_intent_contract + atomic_shadow_gate: exercise read-only. For each: what it does + the anti-facade insight.`,
    { label: 'read:receipts', phase: 'Read', schema: TOOL_SCHEMA }),
])

phase('Mutate')
// SERIALIZED on purpose (one stateful broker on the real repo). Each agent fully finishes
// (incl. rollback + pristine-check) before the next begins.
const m1 = await agent(`${SAFETY}
LABEL=edit1. SERIALIZED mutation agent — you run alone. You own these 17 tools: atomic_session_begin, atomic_session_savepoint, atomic_session_commit, atomic_session_rollback, atomic_create_file, atomic_edit, atomic_replace_text, atomic_replace_range, atomic_replace_at, atomic_insert_at, atomic_insert_after_anchor, atomic_insert_before_anchor, atomic_replace_between_anchors, atomic_replace_text_in_anchor_region, atomic_delete_range, atomic_batch_replace_text, atomic_multi_create.
Open a session, create scratch .ts/.py fixtures under your scratch dir, and exercise every basic edit primitive on them. Demonstrate the never-persist-broken teeth: attempt ONE syntax-breaking edit and record the refusal + proof. Exercise atomic_session_savepoint and atomic_session_commit on a trivial scratch change, then ROLL EVERYTHING back. Report the proof-receipt shape each primitive returns.`,
  { label: 'mut:edit-basic', phase: 'Mutate', schema: TOOL_SCHEMA })

const m2 = await agent(`${SAFETY}
LABEL=edit2. SERIALIZED — you run alone, after edit1 finished + rolled back. You own these 31 AST/refactor tools: atomic_ast_edit, atomic_ast_rewrite, atomic_edit_symbol, atomic_replace_body, atomic_replace_callee, atomic_replace_operator, atomic_replace_literal, atomic_replace_literal_universal, atomic_replace_property_value, atomic_replace_property_value_universal, atomic_rename_symbol, atomic_rename_symbol_cross_file, atomic_rename_symbol_universal, atomic_rename_member, atomic_rename_property_key, atomic_rename_property_key_universal, atomic_change_signature, atomic_insert_arg, atomic_remove_arg, atomic_replace_arg, atomic_add_import, atomic_remove_import, atomic_add_decorator, atomic_replace_decorator, atomic_add_await_to_call, atomic_move_into_scope, atomic_reorder_list, atomic_wrap_range, atomic_apply_edits, atomic_apply_workspace_edit, atomic_delete_file.
Open a session. Create rich scratch fixtures (a TS module with imports, an exported function with params, a class with a decorated async method, an array literal, a property object; a second file for cross-file rename) and exercise every structural/AST tool on them. Note which are semantic (AST-true) vs textual, and which refuse on ambiguity. Roll back, delete scratch, confirm pristine.`,
  { label: 'mut:edit-ast', phase: 'Mutate', schema: TOOL_SCHEMA })

const m3 = await agent(`${SAFETY}
LABEL=txn. SERIALIZED — you run alone, after edit2. You own these 13 tools: atomic_transaction, atomic_lock_acquire, atomic_lock_release, atomic_positive_bytes_begin, atomic_positive_bytes_append, atomic_positive_bytes_commit, atomic_positive_bytes_abort, atomic_seal, atomic_repair_scope, atomic_converge, atomic_intent_converge, atomic_apply_eslint_dry_run_fixes, atomic_workspace_bind.
On scratch fixtures inside a session: exercise the positive-bytes append-only layer (begin/append/commit, then begin/abort), atomic_transaction (multi-edit atomicity), lock_acquire/release on a scratch path, atomic_converge / atomic_intent_converge (the gate-convergence operator) on a slightly-broken scratch file to watch it drive to green, atomic_repair_scope, atomic_apply_eslint_dry_run_fixes (dry). atomic_workspace_bind: exercise read-only/observe (note the D1 write-incapable-bind behavior if it appears) and do NOT leave the workspace re-rooted. Roll back, confirm pristine.`,
  { label: 'mut:txn', phase: 'Mutate', schema: TOOL_SCHEMA })

const m4 = await agent(`${SAFETY}
LABEL=agentloop. SERIALIZED — you run alone, after txn. You own these 9 tools: atomic_agent_plan, atomic_agent_step, atomic_agent_propose, atomic_agent_validate, atomic_agent_commit, atomic_agent_verify, atomic_agent_decide, atomic_agent_status, atomic_agent_sessions.
Drive a FULL agent-loop on a trivial scratch task in your own session: plan -> step -> propose -> validate -> (commit to a SCRATCH file only) -> verify -> decide -> status, then atomic_agent_sessions. Capture each phase's output and the trajectory model. Roll back / delete the scratch commit, confirm pristine. This reveals atomic's built-in autonomous edit loop — the closest thing to a self-driving CLI core.`,
  { label: 'mut:agent-loop', phase: 'Mutate', schema: TOOL_SCHEMA })

const m5 = await agent(`${SAFETY}
LABEL=selfmod. SERIALIZED — you run alone, LAST. You own these 9 high-risk tools: atomic_expand_self, atomic_self_evolution, atomic_codex_config_replace_text, atomic_codex_memory_note_create, atomic_delete_generated_tree, atomic_exec, chrome_devtools_list_tools, chrome_devtools_call, chrome_devtools_reset.
DRY/OBSERVE ONLY. Do NOT persist any change to atomic's own source, codex config, codex memory, generated trees, external git, or a browser, and do NOT run any destructive shell command.
- atomic_expand_self / atomic_self_evolution: invoke in the most read-only/plan/status mode you can; if the only mode mutates atomic's source, set invoked:false + skippedReason and describe what it would do (this is the C-V self-improvement seed — explain its mechanism from the call signature + any dry output + reading its impl under scripts/mcp/atomic-edit/).
- atomic_exec: run only a harmless read command (e.g. 'node --version' or 'ls scripts/mcp/atomic-edit/gates | head'); never destructive.
- chrome_devtools_list_tools: list available DevTools tools; chrome_devtools_call: only a benign introspection call IF a browser is connected, else skip with reason; chrome_devtools_reset: only if you opened something.
- atomic_codex_config_replace_text / atomic_codex_memory_note_create / atomic_delete_generated_tree: describe + skip (irreversible/out-of-scope) unless a pure-dry mode exists.
Report what each reveals about atomic's self-modification + integration surface.`,
  { label: 'mut:self-mod', phase: 'Mutate', schema: TOOL_SCHEMA, effort: 'high' })

return {
  read: readReports.filter(Boolean),
  mutate: [m1, m2, m3, m4, m5].filter(Boolean),
}
