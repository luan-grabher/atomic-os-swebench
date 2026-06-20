export const meta = {
  name: 'atomic-revolutionary-verdict',
  description: 'Dissect the atomic-edit MCP system against its own code + prior art to judge if it is genuinely revolutionary',
  phases: [
    { title: 'Dissect', detail: 'verify each pillar against real code (4 readers)' },
    { title: 'Position', detail: 'compare to prior art + adversarial skeptic (3 agents)' },
  ],
}

const ROOT = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const DISSECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pillar', 'whatItActuallyDoes', 'claimsVerified', 'genuinelyNovel', 'standardEngineering', 'weaknesses', 'citations'],
  properties: {
    pillar: { type: 'string' },
    whatItActuallyDoes: { type: 'string', description: '2-4 sentences, concrete mechanism' },
    claimsVerified: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['claim', 'verdict', 'evidence'],
        properties: {
          claim: { type: 'string' },
          verdict: { type: 'string', enum: ['holds', 'partial', 'overclaimed', 'unverifiable'] },
          evidence: { type: 'string', description: 'file:line or code behavior proving the verdict' },
        },
      },
    },
    genuinelyNovel: { type: 'array', items: { type: 'string' } },
    standardEngineering: { type: 'array', items: { type: 'string' }, description: 'parts that are solid but well-established practice, not new' },
    weaknesses: { type: 'array', items: { type: 'string' } },
    citations: { type: 'array', items: { type: 'string' }, description: 'file:line anchors' },
  },
}

const PRIORART_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area', 'priorArt', 'whatAtomicAddsBeyondPriorArt', 'whatAtomicReplicates', 'noveltyAssessment'],
  properties: {
    area: { type: 'string' },
    priorArt: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'whatItDoes', 'relationToAtomic'],
        properties: { name: { type: 'string' }, whatItDoes: { type: 'string' }, relationToAtomic: { type: 'string' } },
      },
    },
    whatAtomicAddsBeyondPriorArt: { type: 'array', items: { type: 'string' } },
    whatAtomicReplicates: { type: 'array', items: { type: 'string' } },
    noveltyAssessment: { type: 'string', description: 'incremental | strong-synthesis | genuinely-new + 2-3 sentence justification' },
  },
}

const ADVERSARIAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['overclaims', 'brittlePoints', 'conceptualGaps', 'strongestRealClaim', 'verdict'],
  properties: {
    overclaims: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['claim', 'why'], properties: { claim: { type: 'string' }, why: { type: 'string' } } },
    },
    brittlePoints: { type: 'array', items: { type: 'string' } },
    conceptualGaps: { type: 'array', items: { type: 'string' } },
    strongestRealClaim: { type: 'string', description: 'the one claim that survives skeptical scrutiny' },
    verdict: { type: 'string', description: 'honest case AGAINST calling it revolutionary, 3-5 sentences' },
  },
}

phase('Dissect')
const dissectTasks = [
  {
    label: 'tierA-edit-substrate',
    prompt: `You are auditing the atomic-edit MCP server's CORE EDIT SUBSTRATE (Tier A: bytes at rest) against its own code. Root: ${ROOT}.
Read these and verify the README's "Guarantees the blunt editors do not give": engine.ts, guard.ts, server-helpers-io.ts, atomic-write-broker.mjs, atomic-rollback-broker.mjs, server-helpers-effect.ts, trace.ts, and a couple of the atomic_* op implementations in server-tools-*.ts.
Verify CONCRETELY (read the code, do not trust the README):
1. "No syntax regression" — is TS/JS/JSON actually reparsed before write and the edit refused if it INTRODUCES a new error (while tolerating pre-existing)? Where, how?
2. "Atomic durable write" — is it really temp + fsync + rename, mode-preserving?
3. "All-or-nothing" batched edits + cross-file rename rollback — is rollback byte-exact?
4. Repo containment + protected-file (CLAUDE.md governance) hard refusal — real?
5. char-level trace + Expansion-Factor metric — computed for real?
For each: holds / partial / overclaimed / unverifiable, with file:line evidence. List what is GENUINELY NOVEL vs STANDARD engineering (temp+rename atomic write is decades old; LSP rename is standard). Be a hard-nosed senior engineer. Cite file:line.`,
  },
  {
    label: 'tierB-exec-broker',
    prompt: `You are auditing the atomic-edit MCP server's EXEC BROKER (Tier B: bytes in motion / process effects) against its own code. Root: ${ROOT}.
Read: atomic-exec-broker.mjs, atomic-exec-broker-client.mjs, server-tools-exec.ts, security-invariants.mjs, and gates/atomic-exec-sandbox.proof.mjs, gates/external-runtime-denial.proof.mjs, gates/mcp-launcher-host-boundary.proof.mjs.
The thesis (ATOMIC_FIELD.md Tier B): "govern the EFFECT not the command" — snapshot file-bytes under cwd → run arbitrary command → report exact per-file byte delta → reverse byte-exact + untracked-inclusive on failure. Plus invariant denylist, protected-file shell-write refusal, secret redaction, timeout, cwd guard.
Verify CONCRETELY:
1. Does it really snapshot ALL files under cwd (incl untracked) and restore byte-exact on failure? How does it scale / what about huge trees, symlinks, files outside cwd touched by the command?
2. Is "real exit code never faked" true?
3. Is the "invariant denylist" a real security boundary or explicitly defense-in-depth (the doc says "not a sandbox")? What can escape it?
4. Host-boundary / external-runtime-denial: what is actually enforced?
For each: holds/partial/overclaimed/unverifiable + file:line. Distinguish GENUINELY NOVEL (the "atomicity over arbitrary shell effects" generalization) from STANDARD (process spawn, denylists). Be skeptical about reversibility guarantees for arbitrary commands. Cite file:line.`,
  },
  {
    label: 'gates-proof-system',
    prompt: `You are auditing the atomic-edit "GATES / PROOF" subsystem. Root: ${ROOT}/gates (also ${ROOT}/gates/registry.ts, contract.ts, lens.ts, perception.ts, formal-gate.ts, property-gate.ts, deterministic-harness.ts).
There are ~60 *.proof.mjs / *.proof.ts files and a gate registry. Figure out what this discipline actually IS.
Answer concretely:
1. What is a "gate"? What is a ".proof" file? Read registry.ts + 3-4 gate .ts files + their .proof files to see the contract.
2. Is this REAL verification (property-based tests, formal checks, executable proofs that would fail CI) or self-asserted assertions dressed as "proofs"? Read formal-gate.ts and property-gate.ts specifically — is there actual formal/property reasoning or is "formal" a label?
3. The perception.ts / lens.ts / contract.ts triad — what architecture is this? (sounds like a perception→judgment→contract pipeline). Summarize the actual mechanism.
4. Are proofs executed automatically (CI, hook, build) or aspirational?
Verdicts holds/partial/overclaimed/unverifiable + file:line. Separate GENUINELY NOVEL (proof-carrying edits, if real) from STANDARD (these are just unit/property tests with fancy names). Be ruthless about the difference between a "proof" and a "test named proof". Cite file:line.`,
  },
  {
    label: 'product-trust-enforcement',
    prompt: `You are auditing the atomic-edit PRODUCT/FOUNDER + ENFORCEMENT layer. Root: ${ROOT}.
Read: server-tools-self.ts and/or server-helpers-product-locks.ts, server-helpers-self-expansion.ts (truth_receipt / zero_code_trust_score / behavior_receipt / product_intent_contract / continuity_status / atomic_lock_* implementations), plus atomic-only-hook.mjs, bypass-observer-hook.mjs, bypass-classify.mjs, ENFORCEMENT_SETUP.md.
The thesis: force every CLI agent through the atomic envelope ("bypass-rate → 0"), and give a non-coder founder (Daniel) a way to trust delivery WITHOUT reading code (truth_receipt classifies REAL/PARTIAL/STUB/MOCK_ONLY/EXTERNAL_BLOCKED/UNPROVEN/BROKEN; zero_code_trust_score).
Verify concretely:
1. truth_receipt / zero_code_trust_score — is the classification computed from real signals (runtime/API/DB/browser evidence, AST) or is it heuristic/self-reported by the agent? How could an agent game it?
2. atomic-only-hook + bypass-observer — do they actually BLOCK built-in Edit/Write/Bash (PreToolUse deny) or just observe/measure? Read the hook logic.
3. Multi-agent locks (mkdir POSIX front-lock) — real coordination primitive?
For each: holds/partial/overclaimed/unverifiable + file:line. Separate GENUINELY NOVEL (the "zero-code-trust receipt" product framing; enforced-atomicity-as-policy) from STANDARD (mkdir locks, PreToolUse hooks). Be skeptical: can a determined/sloppy agent still bypass, or self-assert REAL? Cite file:line.`,
  },
]
const dissect = await parallel(dissectTasks.map(t => () =>
  agent(t.prompt, { label: t.label, phase: 'Dissect', schema: DISSECT_SCHEMA })))

phase('Position')
const positionTasks = [
  () => agent(`You are a research-grade analyst positioning the "atomic-edit" tool against PRIOR ART in AI CODE-EDITING. Use WebSearch/WebFetch (load via ToolSearch if needed). Also read ${ROOT}/README.md for its self-positioning and grounding table.
The tool's claims: structured action space over named AST entities (read_symbol/edit_symbol), symbol-scoped block edits beating fragile line/offset diffs, strict pre-write syntax validation + preview, semantic cross-file rename via the language service (not LLM text guessing), and an "Expansion-Factor" runtime metric (intentionChars vs lineRewriteSurfaceChars).
Compare HONESTLY against: Aider's edit formats (diff/udiff/whole), Morph / "fast apply" models, OpenAI codex apply_patch, Cursor's apply, Claude Code's own str_replace Edit tool, Sourcegraph Cody, Sweep/Mentat, and academic work (CodeStruct, "To Diff or Not to Diff", SWE-bench edit-format findings).
Output: prior art (name/what/relation), what atomic ADDS beyond prior art, what it REPLICATES, and a novelty assessment (incremental | strong-synthesis | genuinely-new) with justification. Don't be impressed by jargon; many tools already do AST-scoped edits + validation.`,
    { label: 'priorart-code-editing', phase: 'Position', schema: PRIORART_SCHEMA }),
  () => agent(`You are a research-grade analyst positioning "atomic-edit" against PRIOR ART in ATOMICITY / REVERSIBILITY / VERIFICATION. Use WebSearch/WebFetch. Also read ${ROOT}/ATOMIC_FIELD.md (the 3-tier "field of atomicity" thesis: A bytes-at-rest byte-reversible, B process-effects-as-byte-effect-transactions, C external-irreversible-with-ledger-compensation).
Compare HONESTLY against: transactional filesystems / overlayfs / OS snapshots (btrfs/ZFS/git stash), structural search-replace tools (comby, ast-grep, semantic patch / coccinelle), database transaction + saga / compensating-transaction patterns, proof-carrying code, property-based testing, and "everything is bytes" Unix philosophy.
Key question for the verdict: is the "compile high-level intent DOWN to smallest faithful byte-mutation, preserve the rest, prove the delta, make it reversible — one envelope for every action; 3 tiers with no Tier D" framing a GENUINELY NEW conceptual unification, or an elegant repackaging of saga/transaction + structural-edit + snapshot ideas that already exist separately?
Output prior art / adds-beyond / replicates / novelty assessment. Be the person who has seen these ideas before.`,
    { label: 'priorart-atomicity-verification', phase: 'Position', schema: PRIORART_SCHEMA }),
  () => agent(`You are a HOSTILE skeptic whose job is to argue the case AGAINST calling atomic-edit "revolutionary." Read ${ROOT}/README.md and ${ROOT}/ATOMIC_FIELD.md, and skim engine.ts, gates/registry.ts, gates/formal-gate.ts, atomic-exec-broker.mjs.
Build the strongest honest case that this is impressive engineering but NOT revolutionary: where do claims overreach the implementation? Where is naming inflated ("proof", "formal", "field", "certificate") relative to what the code does? What is brittle (the byte-snapshot-rollback for arbitrary shell; non-TS/JS validation degrading to range-only; AST selector coverage gaps; reversibility being impossible for Tier C anyway)? What conceptual gaps exist (does "no Tier D" actually hold, or is it true by definition / unfalsifiable)? Is "revolutionary" even the right axis, or is the real value "disciplined integration of known-good ideas for a non-coder founder"?
Then state the single strongest claim that DOES survive scrutiny. Be fair but cutting. This is for the author (Daniel) who explicitly bans hype and demands evidence.`,
    { label: 'adversarial-skeptic', phase: 'Position', schema: ADVERSARIAL_SCHEMA }),
]
const position = await parallel(positionTasks)

return {
  dissect: dissect.filter(Boolean),
  priorArt: position.slice(0, 2).filter(Boolean),
  adversarial: position[2] || null,
}