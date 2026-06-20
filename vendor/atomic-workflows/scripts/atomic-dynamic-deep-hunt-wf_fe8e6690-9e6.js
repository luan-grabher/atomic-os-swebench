export const meta = {
  name: 'atomic-dynamic-deep-hunt',
  description: 'Fresh DYNAMIC adversarial hunt for NEW gaps/defects/incompleteness NOT in the prior formalized lists — by actually exercising atomic in unusual ways across correctness, security, cross-language, proof-chain forge-resistance, agent-loop, concurrency, and revolutionary-delta dimensions. Hang-proof wrapper.',
  phases: [{ title: 'Hunt', detail: '7 parallel hunters, dynamic probing, hang-proof' }],
}

const HUNT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['dimension', 'findings', 'summary'],
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'kind', 'severity', 'isNew', 'codeCloseable', 'repro', 'fixApproach', 'effort'],
        properties: {
          title: { type: 'string' },
          kind: { enum: ['defect', 'absence', 'incompleteness', 'improvement', 'security', 'correctness', 'evolution', 'boundary'], type: 'string' },
          severity: { enum: ['critical', 'high', 'medium', 'low'], type: 'string' },
          isNew: { type: 'boolean', description: 'true if NOT in the already-known list below' },
          codeCloseable: { type: 'boolean' },
          location: { type: 'string' },
          repro: { type: 'string', description: 'the EXACT wrapper call(s) or code path that demonstrates it — must be concrete, runnable' },
          evidence: { type: 'string', description: 'the actual observed output proving it' },
          fixApproach: { type: 'string' },
          effort: { enum: ['trivial', 'small', 'medium', 'hard'], type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const WRAP = `
DYNAMIC adversarial hunt. Atomic source: /Users/danielpenin/kloel-elevation/scripts/mcp/atomic-edit/ . Use Read/Grep/Bash freely.
Exercise tools HANG-PROOF: ATOMIC_ROOT=/Users/danielpenin/kloel-elevation bash /tmp/atomic-call.sh '<tool>' '<argsJSON>' <timeoutSec>
  → prints {"ok":true,"result":{content:[{text}]}} or {"ok":false,error}; {"error":"TIMEOUT_KILLED_Ns"} = hangs. Read payload: append | jq -r '.result.content[0].text' (or head -c 2000 of raw line). Each call is a fresh isolated process.
SCRATCH SAFETY: create fixtures ONLY under a normal (NON-dot) dir like src/__hunt_<LABEL>/ in the repo (dot-dirs are skipped by collectFiles — a known test artifact). Mutators: prefer preview:true; for no-preview tools create a real scratch fixture then rm -rf it at the end. NEVER target a real repo source file or .atomic/. Confirm pristine at the end.
BE DYNAMIC: do not just confirm the known list — try weird inputs, edge cases, multi-step sequences, cross-language fixtures (py/go/rust/java/c), adversarial payloads. The goal is to find what NOBODY has formalized yet.

ALREADY-KNOWN (mark isNew:false if you hit these; do NOT spend time re-confirming — hunt for NEW things):
- FIXED already: removedByteCountBetween multiset, -Infinity guards, dispatch toolName, truth_receipt note, product_intent routing, runSingleToolCall safeParse, chrome getSession hang, atomic_outline TS types, _universal/decorator proofOfIncorrectness, RCE safeRequire, WASM safeParseTree guard, trace-ledger GC + preview-no-persist, .atomic/ edit-tool protection.
- KNOWN-OPEN: ast_search $$$ ellipsis, workspace_bind D1, lens no-parallelism/cold-start, lock staleness+reaper, mkdir-lock reaping, PID-reuse TOCTOU, ops regex over-open, gates Python H.4 absent, supply-chain Rust/Py/Java not floor-wired, closure-meta blind to MISSING dimensions, HumanEval lift proof unbacked, PART I dossier contradicts ledger, no local agentic loop (Kloel CLI core), absorbed-SOTA inert libs.
- BOUNDARIES (not defects): Rice, field recognition, model ceiling, L11/N4 unrun, no-bypass harness-layer, D.4 unmeasured.

Honesty: isNew=true ONLY if genuinely outside the above. codeCloseable=false only for true boundaries. Every finding needs a CONCRETE repro you actually ran.
`

phase('Hunt')
const reports = await parallel([
  () => agent(`${WRAP}
DIMENSION = edit-primitive-correctness. DYNAMICALLY exercise the edit/refactor primitives on REAL cross-language fixtures (TS, Python, Go, Rust, Java) and adversarial inputs. Hunt for: edits that CORRUPT (wrong span, off-by-one, unicode/multibyte mishandling, CRLF, tabs), AST ops that silently no-op or mis-target, anchor ops that hit the wrong occurrence, change_signature/insert_arg producing invalid code that passes validation, _universal ops behaving differently than ts-morph ones. Create fixtures with tricky constructs (nested generics, decorators, multibyte identifiers, template literals). Find a case where atomic PERSISTS or PREVIEWS-as-ok a semantically-wrong or corrupting edit. Concrete repro each.`,
    { label: 'edit-correctness', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = proof-chain-forge-resistance. The crown jewel is the tamper-evident proof chain. DYNAMICALLY attack it: can you forge a receipt, break/rewrite the HEAD chain, make atomic_verify-proof / atomic_prove / atomic_seal accept a tampered artifact, replay an old proof, or make a gateRunId collide? Read trace.ts (chainHashOf, gateRunIdOf), the seal/prove path, atomic-cli.mjs verify. Try: edit a trace file then verify; supply a hand-made seal; verify-proof a mutated snapshot. Find any path where the chain claims GREEN over tampered/forged state. Concrete repro.`,
    { label: 'proof-forge', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = security-and-escape. Beyond the fixed RCE: hunt NEW escape/abuse vectors. Try: path traversal (../ , symlink, absolute paths) to write OUTSIDE the workspace via any edit tool; resolveSafeTarget bypass; atomic_exec command injection / allowlist bypass / effectRoot escape; reading secrets via code_readcode/atomic_read_file outside repo; the chrome bridge / codex_config / git tools doing something unsafe; a gate or hook that trusts attacker-controlled input. Read guard.ts resolveSafeTarget, server-tools-exec, server-tools-git. Concrete repro for any boundary you can cross.`,
    { label: 'security-escape', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = cross-language-honesty. The dossier admits the rich lens is TS/JS-only. DYNAMICALLY map EXACTLY what each language gets vs silently doesn't. For py/go/rust/java/c: create a fixture with a REAL defect (dangling import, type error, undefined name, broken contract) and run atomic_lens / the byte-floor / a real edit — does atomic CATCH it, honestly ABSTAIN (unjudged), or FALSELY claim green (the worst — a facade)? Find any case where a non-JS edit gets a green/positive verdict that OVERSTATES what was actually checked (fake-green is a facade defect, the most important kind). Concrete repro per language.`,
    { label: 'crosslang-honesty', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = agent-loop-and-converge. DYNAMICALLY drive the full agent-loop (atomic_agent_plan→step→propose→validate→commit→verify→decide) and atomic_converge / atomic_intent_converge / atomic_repair_scope on a real scratch task with an actual bug. Hunt for: phases that accept invalid transitions, validate that passes a broken proposal, commit that writes despite a red gate, converge that loops/diverges or claims green without fixing, repair_scope that guesses, decide that can't reject. Does the loop actually achieve correct autonomous edits, or are there holes where it rubber-stamps? Concrete repro.`,
    { label: 'agent-loop', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = concurrency-and-lifetime. DYNAMICALLY stress concurrent/edge lifetime behavior. Try: two overlapping edits to the same scratch file via rapid wrapper calls (each is a fresh process — does the lock/serialization hold or corrupt?); session begin/savepoint/rollback under interleaving; what happens to .atomic-edit-locks on a killed call; positive-bytes begin without commit; transaction partial failure (one file of many invalid — does it roll back ALL?). Read the broker, locks, session impl. Find any non-atomicity, lost update, deadlock, or leak. Concrete repro.`,
    { label: 'concurrency-lifetime', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),

  () => agent(`${WRAP}
DIMENSION = revolutionary-delta-and-UX. What makes a tool ADOPTED, not just correct. DYNAMICALLY assess: error-message quality (does a refusal tell you HOW to proceed?), receipt readability, discoverability, the gap between what the dossier CLAIMS and what a fresh user actually experiences calling tools cold. Hunt for: claims in README/dossier that the live tools DON'T deliver, tools that are confusing/inconsistent in args (some use line/column, some anchors, some symbols), missing capabilities a SOTA agentic editor has that atomic lacks, and the single highest-leverage thing that would make atomic genuinely unprecedented in PRACTICE (not on paper). Be concrete about the delta between 'strong synthesis' and 'inevitable tool'.`,
    { label: 'revolutionary-delta', phase: 'Hunt', schema: HUNT_SCHEMA, effort: 'high' }),
])

return { reports: reports.filter(Boolean) }
