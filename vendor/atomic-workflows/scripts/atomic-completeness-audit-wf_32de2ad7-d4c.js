export const meta = {
  name: 'atomic-completeness-audit',
  description: 'Comprehensive read-only audit of atomic across 6 dimensions to produce the complete inventory of gaps/defects/absences/improvements/evolutions toward the paradigm claim — code-closeable vs honest boundary. Uses the hang-proof wrapper.',
  phases: [{ title: 'Audit', detail: '6 parallel auditors, read-only, hang-proof wrapper' }],
}

const GAP_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['dimension', 'gaps', 'summary'],
  properties: {
    dimension: { type: 'string' },
    gaps: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'kind', 'severity', 'codeCloseable', 'fixApproach', 'effort'],
        properties: {
          title: { type: 'string', description: 'one-line gap/defect/improvement' },
          kind: { enum: ['defect', 'absence', 'incompleteness', 'improvement', 'lapidacao', 'evolution', 'boundary'], type: 'string' },
          severity: { enum: ['critical', 'high', 'medium', 'low'], type: 'string' },
          codeCloseable: { type: 'boolean', description: 'true if atomic code can close it; false if it is an honest boundary (Rice, model-ceiling, field recognition)' },
          location: { type: 'string', description: 'file:line or subsystem' },
          evidence: { type: 'string', description: 'how you know — a real call result, code reading, or dossier citation' },
          fixApproach: { type: 'string', description: 'concrete approach to close it (or why it cannot be closed)' },
          effort: { enum: ['trivial', 'small', 'medium', 'hard'], type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const WRAP = `
Read-only audit. Atomic source: /Users/danielpenin/kloel-elevation/scripts/mcp/atomic-edit/ (the dossier is PARADIGM-ELEVATION.md there). Use Read/Grep/Bash freely.
To EXERCISE an atomic tool safely (hang-proof): bash /tmp/atomic-call.sh '<tool>' '<argsJSON>' <timeoutSec> with env prefix ATOMIC_ROOT=/Users/danielpenin/kloel-elevation. It prints {"ok":true,"result":{content:[{text}]}} or {"ok":false,error}. A {"error":"TIMEOUT_KILLED_Ns"} means the tool hangs (record it). NEVER call mcp__atomic-edit__* directly (it hangs).
ALREADY FIXED THIS SESSION (do NOT re-report as open): removedByteCountBetween multiset; zero_code_trust/behavior -Infinity guards; dispatch toolName guard; truth_receipt refusalNote by-kind; product_intent routing; runSingleToolCallFromEnv Zod safeParse (subsumes replace_text/prove/locate/code_*/wrap_range arg-validation); chrome getSession+spawnSync hang; atomic_outline TS node types. DEBUNKED (not a bug): rename_symbol_cross_file (was a dot-dir test artifact; works in normal dirs).
Honesty rule: classify each gap codeCloseable=true (atomic code can close it) vs false (an honest boundary — Rice/undecidability, the bundled model's capability ceiling, or field-conferred recognition). Do NOT label a boundary as a closeable defect, and do NOT label a real defect as a boundary. Be concrete with file:line/evidence.
`

phase('Audit')
const reports = await parallel([
  () => agent(`${WRAP}
DIMENSION = close-out-known. Produce a PRECISE fix spec for each STILL-OPEN dogfood item, re-verifying each in a CLEAN (non-dot, repo-root cwd) setup first (the dot-dir lesson): (1) trace-ledger — preview writes .atomic/traces/op_*.json + the dir has ~12k files with no GC ("preview persists nothing" is false); locate where preview writes the trace + whether a retention/GC exists. (2) lock_status — no TTL/staleness flag, stale 7-day lock, no reaper. (3) git_remote {} — error doesn't enumerate valid actions. (4) _universal/decorator family (rename_symbol_universal, rename_property_key_universal, replace_decorator) "commit refused for proofOfIncorrectness" — RE-VERIFY from repo-root cwd with a real fixture + proofOfIncorrectness; is it real or another path/cwd artifact? (5) ast_search $$$ ellipsis returns 0 on compound patterns — locate the ast-grep pattern compiler; is it fixable or a vendored-lib limit? (6) WASM Aborted() intermittent — characterize where the tree-sitter WASM abort originates and whether a catch→unjudged guard already exists / is missing on any path. For each: real-or-artifact, file:line, fix approach, effort.`,
    { label: 'close-out-known', phase: 'Audit', schema: GAP_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = dossier-residuals-and-boundaries. Read PARADIGM-ELEVATION.md in full (esp. §E.5 honest residuals register, C.4 acceptance tests, C.6 vs Nidus, N1-N5, F.2/F.5 frontier, G.3, H.3/H.5). Enumerate EVERY named residual, incompleteness, and honest boundary. Classify codeCloseable: e.g. "supply-chain Rust/Python/Java not floor-wired", "DisproofWitness not through every MCP entry point", "R2 soft channel hardcoded", "same-file positional/non-identifier coupling", "proofCoverage 40→39" are code-closeable; "Rice not defeated", "recognition (peer/replication/adoption) not met", "model capability ceiling", "no-bypass is harness-layer not OS/kernel" are boundaries. Give file:line where the residual lives in code.`,
    { label: 'dossier-residuals', phase: 'Audit', schema: GAP_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = gate-battery-completeness. Read gates/registry.ts (WRITE_GATES, DYNAMIC_GATES) + each gate file. Find: (a) language-coverage holes — which gates are TS/JS-only (ts-morph: binding/reexport/public-contract; prisma; config-key; type-soundness) and have NO equivalent for Python/Go/Rust/Java (the read-lens thinness on non-JS); (b) advisory-only downgrades (audit-atomicity topologyPass=false, etc.) — enforce-or-waive; (c) supply-chain floor-wiring gaps (Rust/Python/Java resolver exists but not floor-wired); (d) MISSING invariant classes the closure meta-gate hasn't named yet; (e) candidate NEW universal gates (e.g. the H.4 Python gates: py-strict-null, py-call-arity, py-structural-type, py-undef-name). Probe a couple via the wrapper (atomic_lens on a Python file). file:line + effort each.`,
    { label: 'gate-completeness', phase: 'Audit', schema: GAP_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = fresh-adversarial-defects. Hunt for NEW defects the dogfood did not find (do not repeat the fixed list). Read core files: server.ts, engine*.ts, server-helpers-*.ts, the proof-chain (atomic-cli.mjs, seal/prove), guard.ts, the broker (atomic-exec-broker.mjs), lifetime (parent-death-reaper, machine-lifetime-census). Look for: unguarded throws / missing input validation on the NORMAL MCP path (not just single-call), resource leaks (fd/proc/temp), race conditions (concurrent edits/locks), proof-chain integrity holes (can a receipt be forged / chain broken?), silent-failure or fake-green paths, off-by-one/edge cases in the edit primitives. Probe hypotheses via the wrapper. Concrete repro + file:line + severity.`,
    { label: 'adversarial-defects', phase: 'Audit', schema: GAP_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = capabilities-evolutions (the revolutionary delta). What is ABSENT that would make atomic genuinely stronger/unprecedented/superior — beyond bugfixes. Read the dossier PART C/D + ARCHITECTURE.md. Enumerate: (1) the standalone CLI-product gap — there is NO local agentic loop driver where an internal LLM (DeepSeek) drives atomic tools autonomously (today the host drives); this is THE Kloel-CLI core. (2) performance/UX lapidações: lens has no batching/parallelism (whole-dir times out), cold-start latency (gate-registry/tree-sitter warmup >60s first call), no warm path. (3) the absorbed-SOTA pieces claimed but partial (friction router, minimal-disproof-core, guidebook inheritance, PSR interface). (4) disproof-as-signal loop wiring through every entry point. (5) anything that strengthens the (a)+(e) algebra empty-cell claim (per-symbol ClosureProvider, larger external corpus). For each: what to build, effort, and whether it is code-closeable now.`,
    { label: 'capabilities-evolutions', phase: 'Audit', schema: GAP_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = proof-and-test-integrity. The anti-facade core: find claims WITHOUT discriminating proof, tautological/weak proofs, and missing regressions. (1) The 9 fixes landed THIS session (removedByteCountBetween, the -Infinity guards, dispatch guard, truth_receipt note, product_intent routing, safeParse, chrome hang, outline) currently have NO permanent registered proof (.proof.mjs) — that is an incompleteness (per the L09 paired-adversarial-proof discipline): list each as a needed regression proof. (2) Audit existing proofs for tautology/oracle-leak: the audit flagged E1 "4× tautology", H.3 "2.67% has no artifact", HumanEval "oracle-leak" — read those proofs/runners (gates/e1-confluent-routing.proof.mjs, the humaneval/funnel runners) and confirm/refute. (3) Does paradigm-verify actually discriminate (RED when broken)? (4) Any mandatory lattice validator that is PRESENT-but-not-PASSING (the L08 silently-red class). file:line + effort.`,
    { label: 'proof-integrity', phase: 'Audit', schema: GAP_SCHEMA, effort: 'high' }),
])

return { reports: reports.filter(Boolean) }
