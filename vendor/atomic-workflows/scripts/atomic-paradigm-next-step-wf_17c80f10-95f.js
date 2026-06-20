export const meta = {
  name: 'atomic-paradigm-next-step',
  description: 'Verify PARADIGM-ELEVATION.md load-bearing claims against the real repo, then adversarially evaluate candidate strategies for a world-shocking, leaderboard-forcing public result',
  phases: [
    { title: 'GroundTruth', detail: 'parallel readers verify the doc claims vs the actual repo' },
    { title: 'StrategyPanel', detail: 'adversarial evaluation of candidate go-public strategies' },
  ],
}

const ELEV = '/Users/danielpenin/kloel-elevation'
const ATOMIC = ELEV + '/scripts/mcp/atomic-edit'
const BENCH = ELEV + '/scripts/mcp/atomic-edit-bench'

const GT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'findings', 'overall'],
  properties: {
    area: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'status', 'evidence'],
        properties: {
          claim: { type: 'string', description: 'the doc claim being checked' },
          status: { type: 'string', enum: ['confirmed', 'refuted', 'partial', 'unverifiable-locally'] },
          evidence: { type: 'string', description: 'file paths, grep hits, command output, or what is missing' },
        },
      },
    },
    overall: { type: 'string', description: 'one-paragraph honest verdict on whether this area is as the doc describes' },
  },
}

phase('GroundTruth')

const gtPrompts = [
  {
    label: 'gt:paradigm-verify',
    p: `You are verifying claims in a self-audit dossier against the REAL repo. Repo root: ${ELEV}. Atomic dir: ${ATOMIC}.
The dossier claims: \`npm run paradigm-verify\` returns "15/15 GREEN, P1-P10 DISCHARGED, 0 skips"; there are "79 mandatory validators"; coverage floor "20 enforced / 3 partial"; Z3 confluence + nway induction "ALL GREEN"; Lean NwayConfluence.lean "exit-0"; algebra.proof "35/0"; 169,171 external pairs / 0 unsound.
TASK: Inspect (do NOT run anything that calls an LLM, Modal, or network; do NOT run proofs that spawn brokers/LSP daemons — those leak processes). Verify by reading: paradigm-verify.mjs (what it actually runs and asserts), package.json scripts, gates/invariant-taxonomy.json + coverage-baseline.json (count enforced/partial classes), the presence of formal/atomic-algebra/{confluence_z3.py,NwayConfluence.lean,nway_induction_z3.py,t3_corpus.mjs}, MANDATORY_SELF_EXPANSION_VALIDATORS in server-tools-self.ts (count). Cheap, safe local commands (node -e over JSON, grep, wc, git log) are fine. If safe to run a SINGLE pure proof that does not spawn daemons (e.g. a JSON-only proof), you may, else skip. Report each claim confirmed/refuted/partial/unverifiable-locally with concrete evidence (paths, counts, grep output).`,
  },
  {
    label: 'gt:measured-numbers',
    p: `Verify the MEASURED benchmark numbers in a dossier against the real result files. Bench dir: ${BENCH}.
Dossier claims: HumanEval 164 clean: first-attempt 86.6% -> unified funnel 98.8% (+12.2pp, vs blind +3.7pp), in funnel-humaneval-modal-result.json. ARC-AGI-1: 5.6% -> 13.0% (+7.3pp, vs blind +1.3pp), in funnel-arc1-modal-result.json. ARC-AGI-1 ceiling K-scaling: K=48 valid-candidate 29.2%, pass@2 29.2%, saturating, in arc-max-arc1-result.json. ARC-AGI-2 blocked HTTP 402.
TASK: Open each JSON (use node -e / python to parse, jq if present; files are large so extract summary fields not full dumps). Confirm the per-arm numbers actually exist and match. Look for: how many arms, sample sizes (n=164? full? n=301 paired for ARC?), whether 'unified' vs 'blind-retry' vs 'first-attempt' fields are really there, the actual percentages, cost fields. Flag any number in the doc that the file does NOT support, or any sign of small-n / partial runs. Report confirmed/refuted/partial with the actual values you found.`,
  },
  {
    label: 'gt:swebench-onarm',
    p: `Verify the PART H SWE-bench work (session 2026-Jun-18) against the real repo. Bench dir: ${BENCH}. Atomic dir: ${ATOMIC}.
Dossier claims: swebench-funnel-verifier.mjs + .proof.mjs exist and pass 6/0; swebench-funnel-runner.mjs + .proof.mjs exist 6/0; modal_swebench.py exists and "RAN end-to-end on Modal"; there is an "apply-rate wall" (model diffs don't apply because the model never sees the real repo file); H.3 claims a 21-agent classification found only 8/300 = 2.67% of SWE-bench Lite gold patches are decidable/gate-able, 97.33% Rice-semantic.
TASK: Confirm the files exist (ls, find). Read swebench-funnel-runner.mjs and swebench-funnel-verifier.mjs to confirm the ON arm (funnel) is REALLY wired vs being a label (the doc admits the OLD swebench-deepseek-prediction-runner.mjs was baseline-only with 'atomic' as just a name — check whether the NEW runner genuinely runs the funnel loop). Look for any result file or meta (swebench-funnel-meta.json, swebench-atomic-predictions.json) showing a real ON/OFF run actually happened or whether it's only smoke. Is there ANY scored SWE-bench delta on disk yet? Check for the H.3 classification artifact (a file with the 300-patch defect classification, or is it only asserted in the doc?). Report confirmed/refuted/partial with evidence.`,
  },
  {
    label: 'gt:unique-algebra',
    p: `Verify atomic's genuinely-unique technical claims (the (a)+(e) verified-edit algebra) against the real repo. Atomic dir: ${ATOMIC}.
Dossier claims this is THE empty cell in prior art: inverted byte-default (delete requires a recomputed DisproofWitness) + commute-modulo-invariant edit algebra with machine-checked obligation-preserving confluence (Z3 confluence_z3.py L1/L2/L3 + Lean NwayConfluence.lean), demonstrated on 169,171 external edit-pairs (zod/type-fest/zustand) with 0 unsound. Also the multi-agent fusion E1 (e1-confluent-routing.proof "6/0": UNIFIED throughput 4 >> atomic-core 1) and the friction router (N3/A-G1).
TASK: Confirm the artifacts exist and read enough to judge whether the claim is substantive vs aspirational: gates/algebra.ts, gates/algebra.proof.mjs, formal/atomic-algebra/{confluence_z3.py, NwayConfluence.lean, t3_corpus.mjs}, e1-confluent-routing.proof.mjs, friction-router.mjs. For confluence_z3.py: what does it actually assert (is it a real soundness theorem over an abstract model, or trivial)? For t3_corpus.mjs: is there evidence the 169k pairs were really run (a result/log/corpus file)? For E1: read e1-confluent-routing.proof.mjs — does it measure a real throughput delta or is it a mock fixture? Be a skeptic: distinguish "machine-checked over an abstract model + real external corpus" from "internal self-test on synthetic fixtures". Report confirmed/refuted/partial with evidence.`,
  },
  {
    label: 'gt:repo-state',
    p: `Establish the repo/operational state for an atomic project across two trees. Trees: ${ELEV} (branch atomic/paradigm-elevation, isolated worktree) and /Users/danielpenin/kloel (live tree).
TASK: For BOTH trees report: git branch, last 3 commits (oneline), and whether the working tree is clean or dirty (git status --short | head). Check the H.9 "blocker": the dossier says atomic must run with repoRoot = the working tree to dogfood edits, and that a workspace_bind defect (D1) means the write-broker root is fixed at process launch (~/kloel). Look for .mcp.json in ${ELEV} and report its atomic-edit env block (ATOMIC_EDIT_REPO_ROOT). Check whether there are running atomic broker/supervisor/lsp processes (ps aux | grep -iE 'atomic|broker' | grep -v grep | head) and report the count and any ppid=1 orphans. Also: how divergent are the two trees (is kloel-elevation ahead of kloel? git log comparison if both are git). Report findings with evidence. Do NOT kill any processes.`,
  },
]

const groundTruth = (await parallel(gtPrompts.map(g => () =>
  agent(g.p, { label: g.label, phase: 'GroundTruth', schema: GT_SCHEMA, agentType: 'Explore' })
))).filter(Boolean)

// Build a compact digest for the strategy panel (barrier is justified: strategists must reason on VERIFIED state, not doc claims)
const digest = groundTruth.map(g =>
  `### ${g.area}\nVERDICT: ${g.overall}\n` +
  g.findings.map(f => `- [${f.status}] ${f.claim} :: ${f.evidence}`).join('\n')
).join('\n\n')

log('Ground-truth complete; dispatching adversarial strategy panel on the VERIFIED state.')

phase('StrategyPanel')

const STRAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['strategy', 'thesis', 'impactScore', 'feasibilityScore', 'honestyRisk', 'externalRequirements', 'timeToPublicResult', 'whatForcesLeaderboardUpdate', 'fatalRisks', 'concreteFirstStep', 'verdict'],
  properties: {
    strategy: { type: 'string' },
    thesis: { type: 'string', description: 'the core bet of this strategy in 2-3 sentences' },
    impactScore: { type: 'integer', minimum: 1, maximum: 10, description: 'impact on the goal (shock the world + force public-leaderboard reclassification)' },
    feasibilityScore: { type: 'integer', minimum: 1, maximum: 10, description: 'how achievable given the VERIFIED current state' },
    honestyRisk: { type: 'string', description: 'how this could read as facade / fail the anti-facade discipline; honest exposure' },
    externalRequirements: { type: 'string', description: 'LLM/Modal budget, third-party verification, the field, etc.' },
    timeToPublicResult: { type: 'string', description: 'realistic estimate from now to a defensible public artifact' },
    whatForcesLeaderboardUpdate: { type: 'string', description: 'the SPECIFIC mechanism by which the world/leaderboards would have to react, or why they would NOT' },
    fatalRisks: { type: 'array', items: { type: 'string' } },
    concreteFirstStep: { type: 'string', description: 'the single most concrete next action this week' },
    verdict: { type: 'string', description: 'honest bottom line: is this THE move, a supporting move, or a trap?' },
  },
}

const COMMON = `You are a ruthless, honest strategist advising on how to take the "atomic" verified-edit substrate PUBLIC in a way that genuinely shocks the field and FORCES public benchmark leaderboards to reclassify — without facade (the project's sacred rule: every claim carries reproducible evidence; the only mission-failure is dressing a flat curve). Today is 2026-06-18.

VERIFIED CURRENT STATE (from a ground-truth audit of the real repo — trust THIS over optimistic prose):
${digest}

KEY HONEST FACTS already established by the project itself:
- The FUNNEL (smart retry against the task's own deterministic verifier, freezing accepted units) moves end-task numbers a lot (HumanEval 86.6%->98.8%) BUT the atomic-SPECIFIC differentiator (granular recomputable feedback vs blind resample) separates only modestly (HumanEval +3.7pp) and is noise on ARC (+1.3pp).
- SWE-bench gate evolution is HARD-CAPPED at ~2.7% (only 8/300 Lite gold patches are statically decidable; 97.33% are Rice-semantic). Gates are a durable Python-parity asset, NOT a score lever. The funnel/model is the 97% lever.
- SWE-bench leaderboards have credibility rot: ~99% vendor-self-reported, OpenAI abandoned Verified for contamination, scaffold-vs-model gap 10-35pts. The honest third-party-verified trio: bash-only Verified (76.8% Opus 4.5), SEAL Pro (59.1%), SWE-rebench (65.3%).
- atomic's GENUINELY unique, prior-art-empty cell is the (a)+(e) machine-checked obligation-preserving confluence edit algebra + inverted byte-default — but there is NO public leaderboard for "provably-confluent multi-agent editing" (D.4 would CREATE the category, needs K-agent compute).
- Open model in use: DeepSeek V4 Pro via Modal (massive parallel, isolated execution). The strategic frame: "any model + atomic rises, same model same prompt, so the delta is 100% atomic's."

Evaluate ONLY your assigned strategy. Be adversarial and quantitative. Score impact and feasibility 1-10. Name the SPECIFIC mechanism by which a leaderboard would be forced to update — or admit it would not. Fill the schema.`

const strategies = [
  {
    label: 'strat:swebench-delta',
    p: `${COMMON}\n\nYOUR ASSIGNED STRATEGY — "SWE-bench verified-trio open-model ON/OFF delta": Fix the apply-rate wall with atomic-full structured edits (atomic_apply_edits), run a real mechanism-attributable ON vs OFF run on the third-party-verified trio (bash-only Verified / SEAL Pro / SWE-rebench) with DeepSeek V4 Pro, scored by the official harness, then submit + get vals.ai re-verification. The headline: "open model + atomic ~= or > closed frontier model, reproducibly, delta 100% atomic's." Stress-test whether this actually forces a leaderboard update given (a) the atomic-specific delta is honestly modest and (b) most of the lift is "funnel = smart retry" which other agent loops also do. Is the honest headline strong enough to be viral? What is the strongest TRUE version of this claim?`,
  },
  {
    label: 'strat:confluence-category',
    p: `${COMMON}\n\nYOUR ASSIGNED STRATEGY — "Create and own the new category: provably-confluent multi-agent editing (D.4 + E1)": Lean into atomic's genuine empty cell — the machine-checked obligation-preserving confluence algebra + inverted byte-default. Build/run the D.4 4-arm multi-agent throughput benchmark (no-floor / Nidus-style / atomic-core / UNIFIED) showing UNIFIED strictly dominates on confluent multi-agent correct-throughput at zero broken-persisted-states — a capability NO prior system can exhibit. Publish the Z3+Lean proofs + 169k external corpus + the benchmark as a paper + reproducible artifact. Stress-test: does "we invented a benchmark and won it" force ANY existing leaderboard to update, or is it dismissed as self-serving? How real is the 169k-corpus + Z3/Lean evidence as a credibility anchor? Is "new category nobody asked for" a path to shock-the-world, or a research-niche result? What would make the field unable to ignore it?`,
  },
  {
    label: 'strat:ceiling-reframing',
    p: `${COMMON}\n\nYOUR ASSIGNED STRATEGY — "The capability-ceiling reframing (scientific shock, not a leaderboard climb)": atomic's deepest honest insight is that benchmarks measure FIRST-ATTEMPT aim, not the model's CAPABILITY CEILING; the truth funnel (verifier-gated, byte-positive monotone convergence) measures the ceiling, and the gap is a large un-measured prize. Publish a multi-benchmark study (HumanEval/+, MBPP+, ARC, SWE) showing first-attempt vs ceiling across SEVERAL open models, with the honest boundary (P=0 capability limit + budget). The shock = "every published benchmark number understates the model; here is the real ceiling, for free, no hand-code." Stress-test: is this a Nature/arXiv-viral reframing or an obvious point dressed up? Does it FORCE leaderboard reclassification (e.g. leaderboards adding a 'ceiling' column / pass@k-with-verifier) or just spark discourse? How defensible is the leak-free claim across benchmarks? Where does it collapse?`,
  },
  {
    label: 'strat:adversary-credibility',
    p: `${COMMON}\n\nYOUR ROLE — ADVERSARIAL CREDIBILITY AUDITOR (not advocating a strategy; attacking ALL of them): Assume the operator goes public with the strongest honest atomic result. Enumerate exactly how the field/leaderboard-maintainers/HN/reviewers would DISMISS it, and which of those attacks are fatal vs survivable. Cover: (1) "the funnel is just retry/best-of-n with a verifier — known since AlphaCode/pass@k; not novel"; (2) leak/contamination accusations (does the verifier ever see hidden tests? the ARC train-pair-verifier and SWE FAIL_TO_PASS handling); (3) "internal attempts hidden = unfair compute comparison"; (4) self-invented benchmark = self-serving; (5) Z3/Lean proofs over an abstract model prove nothing about the real implementation; (6) DeepSeek-specific, won't generalize. For the schema 'strategy' field put "Credibility attack surface". impactScore = how DAMAGING the attacks are (10 = sink the launch). For whatForcesLeaderboardUpdate, instead describe THE single framing that survives every attack (the unattackable minimal claim). concreteFirstStep = the one pre-emptive defense to build before going public.`,
  },
]

const panel = (await parallel(strategies.map(s => () =>
  agent(s.p, { label: s.label, phase: 'StrategyPanel', schema: STRAT_SCHEMA })
))).filter(Boolean)

return { groundTruth, panel }