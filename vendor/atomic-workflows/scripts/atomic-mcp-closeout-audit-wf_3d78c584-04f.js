export const meta = {
  name: 'atomic-mcp-closeout-audit',
  description: 'Adversarial multi-lens audit of the atomic-edit MCP to find latent gaps before declaring it complete',
  phases: [{ title: 'Audit' }],
}

const ROOT = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit'
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          title: { type: 'string' },
          file: { type: 'string' },
          evidence: { type: 'string', description: 'concrete proof: file:line + the actual code/grep output' },
          fix: { type: 'string', description: 'the minimal concrete fix' },
          falsePositiveRisk: { type: 'string', description: 'why this might NOT be a real bug' },
        },
        required: ['severity', 'title', 'file', 'evidence', 'fix', 'falsePositiveRisk'],
      },
    },
  },
  required: ['findings'],
}

const LENSES = [
  { key: 'fs-atomicity', prompt: `Audit ALL file write/delete/rename paths in ${ROOT} for correctness bugs in the class of "temp-file + rename silently loses file mode" (we just fixed that one in atomicWrite). Look hard for: lost metadata (mode/mtime/symlink-following — does it follow or clobber symlinks?/ownership), partial-write windows, missing fsync, TOCTOU between stat and write, EXDEV cross-device rename failure (renameSync fails across filesystems — /tmp vs repo), leftover temp files when an error throws between create and rename, directory-vs-file confusion. Inspect: server-helpers-io.ts, server-core.ts, server-helpers-multifile.ts, engine.ts, lang-bridge.ts, nav.ts, advanced*.ts. Report ONLY real, evidenced bugs.` },
  { key: 'exec-security', prompt: `Adversarially audit server-tools-exec.ts (the atomic_exec shell operator) in ${ROOT}. The atomic invariant: never bypass the protected-file guard, never silently destroy, never fake success, always trace. Find concrete holes: (a) denylist regex evasion (extra whitespace/newlines, quoting, git config aliases, base64|sh, eval/$(...), env-var indirection, leading "cd / &&"); (b) CRITICAL CHECK — atomic_exec can WRITE to governance-protected files via shell redirection (e.g. echo x >> CLAUDE.md, sed -i on backend/eslint.config.mjs) because it does NOT consult the PROTECTED set that guard.ts/resolveSafeTarget enforces for byte-edits — confirm this gap and propose how the denylist should refuse writes to the protected set; (c) cwd containment can be escaped by the command body itself; (d) snapshot/rollback uses git checkout <stashSha> -- . — is that correct + safe? Cross-reference guard.ts (resolveSafeTarget, the protected config).` },
  { key: 'dead-code', prompt: `Find orphan/dead code in ${ROOT}. A file is live if reachable from server.ts imports (the MCP) OR build.mjs ENTRY OR a test/hook entrypoint (*.test.mjs, *-hook.mjs, smoke*.ts, audit-atomicity.mjs, benchmark.ts). For every .ts/.mjs NOT reachable, prove it (grep showing zero importers). Also find: exported registrar functions never called in server.ts; exported symbols imported by nobody. Context: server-basic-tools.ts + server-semantic-tools.ts were already deleted as dead — confirm none of that class remains. Give each orphan with grep proof.` },
  { key: 'enforcement', prompt: `Audit the enforcement layer in ${ROOT}: atomic-only-hook.mjs, bypass-observer-hook.mjs, bypass-classify.mjs, bypass-report.mjs. Goal = make the atomic tools the ONLY edit path (bypass-rate -> 0) when wired as a PreToolUse hook in .claude/settings.json (owner-gated). Determine: is the hook actually correct + complete? Does it block raw Edit/Write and file-mutating Bash while allowing the atomic_* tools? Read its stdin/stdout JSON protocol — does it match Claude Code's PreToolUse hook contract (permissionDecision/exit codes)? What's missing/buggy to make it shippable so the owner only has to paste a settings.json snippet? Be concrete.` },
  { key: 'invariant', prompt: `Audit whether EVERY mutating tool in ${ROOT} upholds the atomic envelope invariants: (1) writes only through resolveSafeTarget (protected-file + path-escape guard), (2) never returns success without syntax-validating, (3) always persists a trace, (4) is rollback-capable. Enumerate mutating tools across server-tools-*.ts + server-helpers-*.ts and flag any that write/delete WITHOUT the protected guard, or report ok without validation, or skip the trace. atomic_create_file, atomic_delete_file, atomic_edit family, multifile, locate. Give per-tool gaps with file:line evidence.` },
]

phase('Audit')
const results = await parallel(
  LENSES.map((l) => () =>
    agent(l.prompt + `\n\nReturn ONLY evidenced, real findings (empty array if the lens is clean). Read actual files; do not speculate.`, {
      label: `audit:${l.key}`,
      phase: 'Audit',
      schema: SCHEMA,
    }).then((r) => ({ lens: l.key, findings: r?.findings ?? [] }))
  )
)

const all = results.filter(Boolean).flatMap((r) => (r.findings || []).map((f) => ({ ...f, lens: r.lens })))
const bySev = (s) => all.filter((f) => f.severity === s)
return {
  totalFindings: all.length,
  critical: bySev('critical'),
  high: bySev('high'),
  medium: bySev('medium'),
  low: bySev('low'),
  perLens: results.map((r) => ({ lens: r.lens, count: (r.findings || []).length })),
}
