export const meta = {
  name: 'atomic-114-dogfood-v2',
  description: 'Exhaustively exercise the atomic-edit tool surface via a HANG-PROOF timeout wrapper (perl-alarm single-call). Mutators run in preview (zero persist). Maps each tool + surfaces atomic open-items to fix.',
  phases: [
    { title: 'Map', detail: 'all agents parallel; every atomic call via /tmp/atomic-call.sh with hard timeout; preview for mutators' },
  ],
}

const TOOL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['agent', 'reachedAtomic', 'tools', 'deepFindings', 'openItems', 'residue'],
  properties: {
    agent: { type: 'string' },
    reachedAtomic: { type: 'boolean' },
    tools: {
      type: 'array', description: 'one entry per assigned tool — ALL must appear',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'status', 'whatItDoes'],
        properties: {
          name: { type: 'string' },
          status: { enum: ['ok', 'refused-as-designed', 'timeout-hang', 'error', 'skipped'], type: 'string' },
          whatItDoes: { type: 'string', description: '1-2 sentences from the REAL call' },
          observed: { type: 'string', description: 'key quote from actual output (verdict / receipt field / error)' },
          atomicInsight: { type: 'string' },
        },
      },
    },
    deepFindings: { type: 'string', description: 'what this slice reveals about atomic operational completeness + honesty mechanisms' },
    openItems: { type: 'array', items: { type: 'string' }, description: 'concrete atomic defects/gaps/hangs/incompleteness found — we WILL fix these' },
    residue: { type: 'string', description: 'pristine-check: confirm preview persisted nothing + any scratch dir rm-ed; repo untouched' },
  },
}

const HOWTO = `
You exercise atomic-edit tools through a HANG-PROOF wrapper. NEVER call mcp__atomic-edit__* directly (a direct MCP call cannot be timed out and froze the previous run).

WRAPPER:  bash /tmp/atomic-call.sh '<toolName>' '<argsJSON>' <timeoutSec>
- prints ONE json line: {"ok":true,"result":{"content":[{"type":"text","text":"..."}]}}  OR  {"ok":false,"error":"..."}.
- {"ok":false,"error":"TIMEOUT_KILLED_<N>s"} => the tool HANGS (buggy). Record status:'timeout-hang' and MOVE ON. Retry at most ONCE.
- read the human payload:  bash /tmp/atomic-call.sh ... | jq -r '.result.content[0].text 2>/dev/null' | head -c 2000   (fallback: head -c 2000 of the raw line).
- Each call is a FRESH isolated process: safe to run, but in-memory state does NOT persist across calls (on-disk files DO).

RULES:
1. FIRST: bash /tmp/atomic-call.sh atomic_native_status '{}' 20  -> reachedAtomic = (ok:true).
2. Timeout: default 30s; use 60s for whole-repo / exec / typecheck / convergence / batch tools.
3. MUTATING tools: put "preview":true in the argsJSON whenever supported (create_file, edit, replace_*, insert_*, delete_range/file, transaction, apply_edits, apply_workspace_edit, ast_rewrite, ast_edit, change_signature, replace_body, converge with commit:false, repair_scope is read-only-ish). Preview runs the FULL pipeline (validate+gates+proof receipt) and persists NOTHING.
4. Mutators WITHOUT preview (rename_symbol / rename_member / rename_property_key* / replace_callee / replace_operator / replace_literal* / replace_property_value* / insert_arg / remove_arg / replace_arg / add_import / remove_import / add_decorator / replace_decorator / add_await_to_call / move_into_scope / reorder_list / wrap_range / edit_symbol): create ONE persisted scratch fixture first —  bash /tmp/atomic-call.sh atomic_create_file '{"file":".dogfood-<LABEL>/f.ts","content":"<REAL code with the needed construct>"}' 30  — exercise the tool on .dogfood-<LABEL>/f.ts (works: it is on disk), then AT THE END:  rm -rf /Users/danielpenin/kloel/.dogfood-<LABEL>  and confirm it is gone. NEVER target a real repo file with a mutator.
5. Once, demonstrate the teeth: preview a syntax-breaking replace -> expect REJECTION ("file NOT modified").
6. For EVERY assigned tool, emit a tools[] entry. If a tool is genuinely unsafe to fire for real (irreversible external effect, e.g. codex_config / codex_memory / self_evolution that rewrites atomic source / chrome with no browser), set status:'skipped' and describe what it WOULD do from its signature + impl under scripts/mcp/atomic-edit/.
7. THREE outputs per tool: what it really does + atomicInsight + (in openItems) any bug/hang/gap/incompleteness you hit. We will FIX the openItems next, so be specific (tool, args, exact error/behavior).
`

phase('Map')
const reports = await parallel([
  () => agent(`${HOWTO}\nLABEL=nav. Tools (use wrapper): atomic_glob, atomic_grep, atomic_grep_calls, atomic_ast_search, atomic_scan_bytes, atomic_locate, atomic_outline, atomic_read_file. Point them at atomic's own source under scripts/mcp/atomic-edit/ to map gates/engine/proof-chain wiring. NOTE: atomic_grep_calls hung last run — confirm via the timeout.`,
    { label: 'nav', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=code. Tools: code_browse, code_file_stat, code_outline, code_outline_batch, code_read_symbol, code_read_symbols_batch, code_readcode, code_readcode_batch. Use them to browse+outline+read atomic's core (server.ts, engine*.ts, gates/registry.ts, server-tools-*.ts) and a .py/.go/.rs file. Watch for batch tools that hang or overflow.`,
    { label: 'code', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=proofmeta. Tools: atomic_lens, atomic_prove, atomic_y_certificate, atomic_bypass_report, atomic_lesson_rules, atomic_disproof_briefing, atomic_native_status, atomic_workspace_status, continuity_status, atomic_dispatch_tool, atomic_git_remote, atomic_host_reentry_receipt, atomic_lock_status, atomic_positive_bytes_verify_receipt. Run atomic_lens on scripts/mcp/atomic-edit/gates (60s). For atomic_prove/atomic_y_certificate discover a real opId from the .atomic proof chain (atomic_grep the .atomic/traces or use log) — if none, report honestly. dispatch_tool: introspect only. Map atomic's proof/governance/continuity surface + its self-certification.`,
    { label: 'proofmeta', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=receipts. Tools: truth_receipt, behavior_receipt, zero_code_trust_score, product_intent_contract, atomic_shadow_gate. Feed identical evidence (a runtime_probe:passed + a mock:passed) to truth_receipt vs behavior_receipt vs zero_code_trust_score and COMPARE verdicts (a prior run found the scorers over-credit caller-supplied status while truth_receipt refuses without a gateRunId — verify/refute this live; it is a key open-item). product_intent_contract + atomic_shadow_gate read-only.`,
    { label: 'receipts', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=edit-basic. Tools (preview:true): atomic_create_file, atomic_edit, atomic_replace_text, atomic_replace_range, atomic_replace_at, atomic_insert_at, atomic_insert_after_anchor, atomic_insert_before_anchor, atomic_replace_between_anchors, atomic_replace_text_in_anchor_region, atomic_delete_range, atomic_delete_file, atomic_batch_replace_text, atomic_multi_create, atomic_transaction, atomic_apply_edits, atomic_apply_workspace_edit. Exercise each in preview on scratch fixtures; capture the proof-receipt shape; demonstrate the syntax-break rejection. Note atomic_edit's op enum (it is the unified entry).`,
    { label: 'edit-basic', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=ast1. Tools: atomic_ast_edit, atomic_ast_rewrite, atomic_edit_symbol, atomic_replace_body, atomic_replace_callee, atomic_replace_operator, atomic_replace_literal, atomic_replace_literal_universal, atomic_replace_property_value, atomic_replace_property_value_universal, atomic_change_signature, atomic_wrap_range, atomic_move_into_scope, atomic_reorder_list. Use preview where supported, else a scratch fixture (rule 4). These are the structural/AST refactors — note which are AST-true (ts-morph/tree-sitter) vs textual, and which REFUSE on ambiguity.`,
    { label: 'ast1', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=ast2. Tools (mostly no-preview => scratch fixture per rule 4): atomic_rename_symbol, atomic_rename_symbol_cross_file, atomic_rename_symbol_universal, atomic_rename_member, atomic_rename_property_key, atomic_rename_property_key_universal, atomic_insert_arg, atomic_remove_arg, atomic_replace_arg, atomic_add_import, atomic_remove_import, atomic_add_decorator, atomic_replace_decorator, atomic_add_await_to_call. Create a TS fixture with imports, an exported function with params, a decorated async method, a property object, and a SECOND file for cross-file rename. Note the difference between the _universal (tree-sitter, multi-language) vs ts-morph variants.`,
    { label: 'ast2', phase: 'Map', schema: TOOL_SCHEMA }),

  () => agent(`${HOWTO}\nLABEL=converge. Tools: atomic_converge (commit:false), atomic_intent_converge, atomic_repair_scope, atomic_apply_eslint_dry_run_fixes, atomic_seal, atomic_delete_generated_tree (preview/dry — do NOT delete a real tree), atomic_expand_self, atomic_self_evolution. For converge/repair_scope: feed a slightly-broken scratch fixture and watch the gate-convergence operator drive toward green WITHOUT committing. atomic_expand_self / atomic_self_evolution: invoke in the most read-only/plan/status mode; if the only mode rewrites atomic's own source, status:'skipped' + describe the mechanism from impl. This slice is the C-V self-improvement seed — characterize it precisely.`,
    { label: 'converge', phase: 'Map', schema: TOOL_SCHEMA, effort: 'high' }),

  () => agent(`${HOWTO}\nLABEL=integration. Tools (mostly describe/dry): atomic_codex_config_replace_text, atomic_codex_memory_note_create, atomic_exec, chrome_devtools_list_tools, chrome_devtools_call, chrome_devtools_reset. atomic_exec: run ONE harmless read command (e.g. node --version) to see the governed-exec receipt; never destructive. chrome_devtools_list_tools: list. chrome_devtools_call/reset: only if a browser is connected, else status:'skipped'+describe. codex_config/codex_memory: describe + skip (irreversible/out-of-scope) unless a pure dry/preview mode exists. Map atomic's integration/host surface.`,
    { label: 'integration', phase: 'Map', schema: TOOL_SCHEMA }),
])

return { reports: reports.filter(Boolean) }
