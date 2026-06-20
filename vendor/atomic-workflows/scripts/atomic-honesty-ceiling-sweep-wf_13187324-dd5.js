export const meta = {
  name: 'atomic-honesty-ceiling-sweep',
  description: 'Exhaustive adversarial audit of the atomic-edit tree for honesty LIES (false-green / false-independence / silent-gap / unjudged-as-green), default-refute verified, ranked into a fix-ladder',
  phases: [
    { title: 'Build', detail: 'one agent rebuilds dist so proofs run' },
    { title: 'Discover', detail: '12 parallel finders, one honesty-lie class each' },
    { title: 'Verify', detail: 'adversarial default-refute verification per candidate' },
    { title: 'Critic', detail: 'completeness critic — what surface was not covered' },
    { title: 'Synthesize', detail: 'dedup + rank the confirmed real lies into a fix-ladder' },
  ],
}

const ROOT = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short slug unique within this finder' },
          dimension: { type: 'string' },
          file: { type: 'string', description: 'repo-relative or atomic-relative path' },
          locus: { type: 'string', description: 'function/symbol/line' },
          lieClaim: { type: 'string', description: 'the specific GREEN/independent/covered claim the tool makes that is not backed' },
          scenario: { type: 'string', description: 'the concrete input/scenario where the tool would emit the unbacked green' },
          evidence: { type: 'string', description: 'command run + observed output, or exact code path, proving the scenario is real' },
          severity: { type: 'string', enum: ['active-lie', 'latent-lie', 'enhancement', 'honest-degradation'] },
          confidence: { type: 'number' },
        },
        required: ['id', 'dimension', 'file', 'lieClaim', 'scenario', 'evidence', 'severity', 'confidence'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    isRealLie: { type: 'boolean', description: 'true ONLY if the tool emits a green/independent/covered it genuinely cannot back AND it is not declared honest-degradation' },
    classification: { type: 'string', enum: ['active-lie', 'latent-lie', 'honest-degradation', 'enhancement', 'not-a-lie'] },
    reproduction: { type: 'string', description: 'concrete command + observed output that demonstrates the lie, or empty if refuted' },
    refutation: { type: 'string', description: 'if not a real lie, the exact reason (declared unjudged/skipped/refused, documented ceiling, proof already covers it, scenario impossible)' },
    fixSketch: { type: 'string', description: 'if real: the minimal sound fix, ideally additive or with a clear proofOfIncorrectness' },
    severityRank: { type: 'number', description: '0=highest (active confident lie) .. 5=lowest' },
  },
  required: ['isRealLie', 'classification', 'severityRank'],
}

const PREAMBLE = `You are auditing the atomic-edit tool — an MCP server whose CORE DOCTRINE is "the tool cannot emit a false green" (UNPROVEN/UNJUDGED is treated as negative/red, never silent approval). Root: ${ROOT}. dist/ is freshly built; you may run proofs read-only with \`cd ${ROOT} && node gates/<x>.proof.mjs\` (or \`node dist/gates/<x>.proof.js\`), grep, read files, and load the atomic_lens / atomic_y_certificate MCP tools via ToolSearch (query "select:mcp__atomic-edit__atomic_lens").

A LIE is exactly one of:
 (1) FALSE-GREEN: the tool reports valid/safe/proven/passed when the underlying property is not actually established.
 (2) FALSE-INDEPENDENCE / FALSE-COUPLING: the merge algebra calls two edits independent (or coupled) wrongly.
 (3) SILENT-GAP: a file class, language, code path, or input is silently skipped while the surrounding report IMPLIES coverage (no honest 'skipped'/'unjudged' marker).
 (4) UNJUDGED-AS-GREEN: anywhere 'unjudged' still flows to approval/green instead of negative.

NOT a lie (DO NOT report — this is the hard-won lesson): honest-degradation that is DECLARED — the tool returns unjudged/skipped/refused honestly, or it is a documented ceiling (e.g. whole-host 'MCP cannot prevent bytes outside its tool surface' is the honest decidability ceiling, NOT a bug). Be a skeptic. Only report a finding when you can name the exact code path AND a concrete scenario where the tool outputs a green it cannot back. Prefer running a proof or a tiny repro to confirm. Return findings[] (empty array if you find none — that is a valid, valuable result).`

phase('Build')
await agent(`cd ${ROOT} && node build.mjs 2>&1 | tail -3 ; confirm dist/gates/algebra.js and dist/gates/closure-universal.js exist. Report only "DIST FRESH" or the build error. Do not edit anything.`, { label: 'build', phase: 'Build' })

const DIMS = [
  { key: 'unjudged-residue', spec: `Hunt UNJUDGED-AS-GREEN residue. The repo recently ran an "abolish UNJUDGED" campaign (unjudged≡negative). Find ANY remaining path where 'unjudged' still flows to green/approval/pass instead of negative. Inspect: gates/registry.ts runGates() admissionPolicy 'permissive' default (does permissive let unjudged pass green anywhere still reachable?), gates/lens.ts (does an unjudged gate get omitted so a clean lens implies green?), gates/converge-operator + server-tools-converge (does converge report success with residual unjudged?), server-tools-y.ts / y-certificate (does any domain treat unjudged as green?). Run: node gates/strict-admission.proof.mjs, node gates/unjudged-lens-negative.proof.mjs if present. Report each place unjudged is NOT negative.` },
  { key: 'false-green-write-gates', spec: `For EACH gate in WRITE_GATES (gates/registry.ts:41), find any vacuous-pass: a code path returning green/no-red when the wire is actually dangling/incorrect. Focus on early-returns, try/catch that swallows to green, empty-input → green, and "no NEW wire" delta logic that could miss a real break. Run each gate's *.proof to see what it actually asserts vs claims. Name gates that can pass vacuously.` },
  { key: 'reader-lens-lies', spec: `Run the atomic_lens MCP tool (ToolSearch "select:mcp__atomic-edit__atomic_lens") on scope "scripts/mcp/atomic-edit" — memory says it should be 0 reds / 0 unjudged on its own tree. Verify. Then check gates/lens.ts SOURCE_RE = /\\.(ts|tsx|js|jsx|mjs|cjs)$/ — does the lens SILENTLY skip code files it cannot match (e.g. .css/.html/.sql/.sh/.py the engine CAN edit) while implying whole-scope coverage? That asymmetry (editable but unreadable-by-lens) is a silent-gap lie. Confirm by checking which langs the engine edits vs which the lens reads.` },
  { key: 'algebra-merge-converge', spec: `Audit gates/algebra.ts + merge.ts + converge-operator soundness BEYOND the recent B5 fixes (universalClosureOf for non-TS, unjudgedClosure refusal — those are DONE, do not re-report). Look for: capped-closure handling (capped ⇒ lower bound ⇒ must refuse, is it?), intra-file binding coupling (commute says "same file disjoint spans commute" but binding coupling is NOT modelled — is that honestly REFUSED or falsely admitted in merge?), the merge IDENTITY/capped path, and converge needsIntent (does converge ever report converged:true with residual reds?). Run node gates/algebra.proof.mjs and node gates/merge.proof.mjs and node gates/converge-operator.proof.mjs.` },
  { key: 'no-bypass-routing', spec: `Audit the no-bypass hook routing (atomic-only-hook.mjs / codex-atomic-only-hook.mjs / bypass-classify). Find any interpreter, verb, or file extension that runs NATIVE (bypassing atomic's security scan / effect proof) while the system implies full no-bypass coverage. Memory flags a rank-4 residual: native curl/wget/psql/redis-cli un-gated. Verify if still open. Run node codex-atomic-only-hook.proof.mjs and node gates/interpreter-routing-completeness.proof.mjs. A silent native path on a code/secret/network op is a lie.` },
  { key: 'self-expansion-vacuity', spec: `Audit server-tools-self.ts MANDATORY_SELF_EXPANSION_VALIDATORS. Find any validator phase that can exit 0 WITHOUT actually checking (vacuous proof), or any way caller proofCommands could REPLACE/skip a mandatory validator, or any phase whose proof is a stub. Run node gates/self-expansion-validator-lattice.proof.mjs. The claim "atomic_expand_self runs a mandatory multi-domain lattice" is a lie if any domain is vacuous or skippable.` },
  { key: 'engine-validate-false-green', spec: `Audit the edit-validation in engine.ts / engine-universal.ts / native-bridge.ts / validate paths. For EACH language the engine claims to edit (ts/js/tsx/css/html/sql/sh/py/go/ruby/rust/java/c/cpp/json) does post-edit validation ever report VALID when it could not actually parse (grammar unavailable, parse error swallowed)? The css/html/sql false-green class was reportedly fixed — VERIFY it, and find any remaining language where a broken edit would be admitted as valid. Run node gates/validate-language-honesty.proof.mjs and node gates/grammar-coverage.proof.mjs and node gates/advanced-language-guard.proof.mjs.` },
  { key: 'security-gate-coverage', spec: `Audit gates/security-gate.ts coverage. Find file types or secret/credential patterns it does NOT scan while the system implies all writes are security-screened (the no-bypass + write-admission claim). Memory: security-gate now scans css/html with ext-aware comment blanking. VERIFY and find any unscanned editable file type or missed secret shape (a real under-coverage = a silent security gap = lie). Run node gates/security-gate.proof.mjs and node gates/security-language-coverage.proof.mjs.` },
  { key: 'y-cert-green-by-assumption', spec: `Audit server-tools-y.ts + gates/y-certificate-*.proof + the cert domains. EXCLUDING wholeHostActionSpace (that RED is the honest decidability ceiling — do NOT report it), find any certificate domain that returns GREEN without real evidence (green-by-assumption), or any mandatory domain that is missing from coverage, or a domain whose GREEN is computed from a proof that doesn't actually run. Run node gates/y-certificate-mandatory-domains.proof.mjs and node gates/compiled-mcp-y-certificate.proof.mjs.` },
  { key: 'effect-snapshot-honesty', spec: `Audit server-helpers-effect.ts proveEffect / captureEffectSnapshot / diffEffect. Find any path where a real byte-effect goes UNREPORTED (changedFiles undercount) while the receipt implies full effect capture — e.g. skip-dirs (.git/.atomic/node_modules/dist reporting changedFiles:0), symlink writes, runtime-built paths. Memory flags a rank-9 proveEffect skip-dir honesty residual. Run node gates/server-helpers-effect.incomplete-snapshot.proof.mjs and node gates/effect-snapshot-honest-ceiling.proof.mjs. An undercounted effect = the tool lying about what it changed.` },
  { key: 'negative-action-proof', spec: `Audit server-helpers-negative-proof.ts + the negative-action proofs. Find any removal/replace/delete path that admits NEGATIVE bytes (removing code) WITHOUT requiring a proofOfIncorrectness — across atomic_expand_self, atomic_edit replace, anchor replacement, multifile, operator, semantic write. A negative byte admitted without proof = the tool silently destroying without the doctrine's required justification. Run the negative-*-admission.proof.* files. Name any unguarded negative path.` },
  { key: 'freshness-staleness', spec: `Audit dist-freshness / runtime-freshness / hot-reload. Find any window where the running MCP serves STALE dist (edited source not rebuilt) while reporting fresh, or where a gate runs against stale dist. Run node gates/dist-freshness.proof.mjs and check server-hot-reload.proof.mjs and the boot-fingerprint logic in server.ts / native_status. A stale-but-"fresh" claim means every downstream green is suspect.` },
]

phase('Discover')
const found = await parallel(
  DIMS.map((d) => () =>
    agent(`${PREAMBLE}\n\nYOUR DIMENSION: ${d.key}\n${d.spec}`, {
      label: `find:${d.key}`,
      phase: 'Discover',
      agentType: 'general-purpose',
      schema: FINDING_SCHEMA,
    }),
  ),
)
const raw = found.filter(Boolean).flatMap((r) => r.findings || [])
log(`Discover: ${raw.length} raw candidate findings across ${DIMS.length} dimensions`)

// dedup by file+locus+lieClaim prefix
const seen = new Set()
const candidates = []
for (const f of raw) {
  const k = `${f.file}|${f.locus || ''}|${(f.lieClaim || '').slice(0, 60)}`
  if (seen.has(k)) continue
  seen.add(k)
  candidates.push(f)
}
// drop self-classified honest-degradation up front (verifier would refute anyway) but KEEP if confidence high — let verifier judge borderline
const toVerify = candidates.filter((f) => f.severity !== 'honest-degradation' || f.confidence >= 0.7)
log(`Verify queue: ${toVerify.length} (after dedup ${candidates.length}, dropped ${candidates.length - toVerify.length} low-confidence honest-degradation)`)

phase('Verify')
const verdicts = await parallel(
  toVerify.map((c) => () =>
    agent(
      `${PREAMBLE}\n\nADVERSARIAL VERIFICATION. A finder claims this is a lie in atomic-edit. Your job is to REFUTE it by default — classify it honest-degradation / not-a-lie UNLESS you can REPRODUCE the unbacked green with a concrete command + observed output. Run the repro. Distinguish a real lie from declared honest-degradation (unjudged/skipped/refused/documented-ceiling).\n\nCLAIM:\n- dimension: ${c.dimension}\n- file: ${c.file}\n- locus: ${c.locus}\n- lieClaim: ${c.lieClaim}\n- scenario: ${c.scenario}\n- finder evidence: ${c.evidence}\n\nReturn your verdict. isRealLie=true ONLY with a reproduction. If real, give the minimal sound fixSketch (additive, or replace with a TRUE proofOfIncorrectness).`,
      {
        label: `verify:${c.id || c.file}`,
        phase: 'Verify',
        agentType: 'general-purpose',
        schema: VERDICT_SCHEMA,
      },
    ).then((v) => (v ? { ...v, finding: c } : null)),
  ),
)
const confirmed = verdicts.filter(Boolean).filter((v) => v.isRealLie)
log(`Verify: ${confirmed.length} CONFIRMED real lies of ${toVerify.length} candidates`)

phase('Critic')
const critic = await agent(
  `${PREAMBLE}\n\nCOMPLETENESS CRITIC. The audit ran these dimensions: ${DIMS.map((d) => d.key).join(', ')}. It confirmed ${confirmed.length} real lies. What HONESTY SURFACE of atomic-edit was NOT covered by those dimensions? Look for: tool surfaces (server-tools-*.ts) not audited, gate categories missed, claims in receipts/certificates not checked, any "ok:true" path that could be vacuous. List concrete uncovered surfaces and, for each, whether a quick probe suggests a likely lie. Return findings[] for anything that looks like a real uncovered lie (same schema, be skeptical).`,
  { label: 'completeness-critic', phase: 'Critic', agentType: 'general-purpose', schema: FINDING_SCHEMA },
)

phase('Synthesize')
const ladder = confirmed
  .map((v) => ({
    rank: v.severityRank,
    classification: v.classification,
    file: v.finding.file,
    locus: v.finding.locus,
    lie: v.finding.lieClaim,
    reproduction: v.reproduction,
    fixSketch: v.fixSketch,
  }))
  .sort((a, b) => a.rank - b.rank)

return {
  confirmedCount: confirmed.length,
  candidateCount: candidates.length,
  rawCount: raw.length,
  ladder,
  criticUncovered: (critic && critic.findings) || [],
}
