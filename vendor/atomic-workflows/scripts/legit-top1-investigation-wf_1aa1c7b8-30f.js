export const meta = {
  name: 'legit-top1-investigation',
  description: 'Can DeepSeek V4 Pro legitimately reach top-1 on aider polyglot? Research the real top, vet all honest levers, assess complete-atomic, synthesize verdict.',
  phases: [
    { title: 'Research', detail: 'real leaderboard + legit levers + atomic-on-single-file, in parallel' },
    { title: 'Verify', detail: 'adversarially vet each lever for leaderboard-legality + realistic headroom' },
    { title: 'Synthesize', detail: 'honest verdict + best empirical next step' },
  ],
}

const CONTEXT = `
INVESTIGATION CONTEXT (measured tonight, all real runs):
- Benchmark: aider POLYGLOT (225 Exercism exercises across cpp/go/java/javascript/python/rust).
  Protocol: 2 tries. try-1 = blind (model sees the stub + problem, NOT the test file).
  try-2 = model is given the RAW pytest/test failure output only. Score = % cases whose hidden
  tests pass after try-2. This is the STANDARD harness.
- Model under test: deepseek/deepseek-v4-pro (a real model on the DeepSeek API).
- MEASURED on the clean/standard harness (no cheating):
    * atomic edit format (whole-file + pre-write syntax validation): ~80% try-2 (79.6%, one shard being repaired).
    * whole + parser-hardening: 76.9% try-2.
    * raw upstream whole: running (expected lower).
- A PRIOR submission claimed 94.2% but that was an ORACLE LEAK: a modified retry harness injected the
  hidden test SOURCE into the model's try-2 prompt. We proved + removed it. The ~14-point drop (94.2 -> ~80)
  WAS the leak. So clean DeepSeek V4 Pro on polyglot is ~80%.
- "Complete atomic" the user wants to inject = an MCP toolkit (~114 tools: guarded edits with sha verification,
  AST transforms, atomic writes, formal proofs, distributed locks, a multi-agent 'swarm'). It is an editing-SAFETY
  and MULTI-FILE-navigation system.
- LEADERBOARD-LEGAL means: standard 2-try protocol, NO injection of hidden test source on retry, reproducible with
  'aider --model deepseek/deepseek-v4-pro --edit-format X [standard flags]'. Anything that modifies what the model
  sees beyond the raw test output, or modifies scoring, is ILLEGAL (non-comparable).
The user keeps asking: is there ANY honest way to reach genuine TOP-1, using all identified gaps + the complete atomic?
Be brutally honest and evidence-grounded. Do not give false hope; do not be dismissive without reasons.
`;

phase('Research')

const LEADERBOARD_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['current_top_score_pct', 'top_entries', 'notes'],
  properties: {
    current_top_score_pct: { type: 'number', description: 'Best legit pass_rate_2 on the public aider polyglot leaderboard as of mid-2026' },
    top_entries: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['model', 'pass_rate_2', 'source'],
      properties: { model: {type:'string'}, edit_format: {type:'string'}, pass_rate_2: {type:'number'}, source: {type:'string'} } } },
    notes: { type: 'string', description: 'methodology caveats, whether scores are comparable, dating' },
  },
}

const LEVERS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['levers'],
  properties: { levers: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['name', 'mechanism', 'est_headroom_pts', 'leaderboard_legal', 'rationale'],
    properties: {
      name: {type:'string'},
      mechanism: {type:'string', description:'concretely how it would raise the score'},
      est_headroom_pts: {type:'number', description:'realistic points it could add to a ~80% base, honest estimate'},
      leaderboard_legal: {type:'boolean'},
      rationale: {type:'string'},
    } } } },
}

const ATOMIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['polyglot_impact_pts', 'reasoning', 'where_atomic_actually_wins', 'recommended_alt_benchmark'],
  properties: {
    polyglot_impact_pts: { type: 'number', description: 'honest estimate of points the FULL 114-tool atomic MCP would add on single-file polyglot (can be ~0)' },
    reasoning: { type: 'string' },
    where_atomic_actually_wins: { type: 'string', description: 'what task profile the complete atomic genuinely helps' },
    recommended_alt_benchmark: { type: 'string' },
  },
}

const [leaderboard, levers, atomic] = await parallel([
  () => agent(
    `${CONTEXT}\n\nTASK: Find the REAL current top of the aider polyglot leaderboard (mid-2026). Use web search/fetch: the official aider.chat leaderboard page (aider.chat/docs/leaderboards/), recent announcements, and any reputable coverage. Report the top legit pass_rate_2 and the top ~5 entries (model, edit format, score, source URL). Note methodology and whether the scores are directly comparable to a fresh standard-harness run. Be precise about numbers; cite sources.`,
    { label: 'real-leaderboard-top', phase: 'Research', schema: LEADERBOARD_SCHEMA }),
  () => agent(
    `${CONTEXT}\n\nTASK: Enumerate EVERY legitimate (leaderboard-legal, no oracle leak) lever that could raise DeepSeek V4 Pro's ~80% clean polyglot score. Consider: choice of edit format (whole/diff/architect/atomic) for THIS model; model settings (reasoning effort, thinking tokens, temperature, top_p); prompt/format tuning within a format; making the model use the raw try-2 test output better; reducing avoidable losses (malformed-edit failures, syntax errors, lazy elisions); editor/architect two-model setups that are still standard. For each lever give a concrete mechanism and an HONEST headroom estimate in points on a ~80% base. Flag any lever that is NOT leaderboard-legal. Do not invent generous numbers — most edit-format tricks move 0-3 points; the model's reasoning is the ceiling.`,
    { label: 'legit-levers', phase: 'Research', schema: LEVERS_SCHEMA }),
  () => agent(
    `${CONTEXT}\n\nTASK: Brutally honest assessment: how many points would injecting the COMPLETE 114-tool atomic MCP (guarded edits, AST transforms, proofs, distributed locks, multi-agent swarm) add on the SINGLE-FILE, self-contained polyglot puzzles? Reason from first principles about what determines a polyglot try-2 pass (model reasoning to produce correct code for one file) vs what those tools do (safe/atomic edit application, multi-file navigation, refactoring, coordination). Then state where the complete atomic GENUINELY wins (task profile) and which benchmark would actually demonstrate it. Give a number (can be ~0) and defend it.`,
    { label: 'atomic-on-polyglot', phase: 'Research', schema: ATOMIC_SCHEMA }),
])

phase('Verify')

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['verdicts', 'realistic_max_honest_score_pct', 'top1_reachable'],
  properties: {
    verdicts: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['lever', 'leaderboard_legal_confirmed', 'realistic_headroom_pts', 'reason'],
      properties: {
        lever: {type:'string'},
        leaderboard_legal_confirmed: {type:'boolean'},
        realistic_headroom_pts: {type:'number', description:'after skeptical adjustment; overlapping levers should not double-count'},
        reason: {type:'string'},
      } } },
    realistic_max_honest_score_pct: { type: 'number', description: 'best plausible honest score stacking non-overlapping legal levers on ~80%' },
    top1_reachable: { type: 'boolean', description: 'can DeepSeek V4 Pro legitimately beat the current leaderboard top on polyglot?' },
  },
}

const verify = await agent(
  `${CONTEXT}\n\nYou are an ADVERSARIAL skeptic. Here is the research:\n\nREAL LEADERBOARD TOP:\n${JSON.stringify(leaderboard, null, 2)}\n\nPROPOSED LEGIT LEVERS:\n${JSON.stringify(levers, null, 2)}\n\nFULL-ATOMIC ASSESSMENT:\n${JSON.stringify(atomic, null, 2)}\n\nTASK: For EACH proposed lever, confirm it is truly leaderboard-legal (no hidden-test leakage, standard 2-try protocol, reproducible) and replace any optimistic headroom with a skeptical, NON-DOUBLE-COUNTED estimate (levers that overlap, e.g. 'better edit format' and 'reduce malformed failures', must not be summed twice). Then compute the realistic MAX honest score by stacking only non-overlapping legal levers on the ~80% measured base, and state plainly whether that beats the current leaderboard top (i.e., legit top-1 reachable). Default to skepticism; the burden of proof is on each lever.`,
  { label: 'adversarial-verify', phase: 'Verify', schema: VERIFY_SCHEMA })

phase('Synthesize')

const synthesis = await agent(
  `${CONTEXT}\n\nALL FINDINGS:\nLEADERBOARD: ${JSON.stringify(leaderboard)}\nLEVERS: ${JSON.stringify(levers)}\nATOMIC: ${JSON.stringify(atomic)}\nADVERSARIAL VERIFY: ${JSON.stringify(verify)}\n\nTASK: Write the honest verdict for the user (who badly wants legit top-1), in clear Brazilian Portuguese, ~250-350 words. Cover: (1) what top-1 actually requires now (real number); (2) where clean DeepSeek V4 Pro stands (~80%) and why; (3) whether honest top-1 on polyglot is reachable, and the realistic max honest score; (4) the single best EMPIRICAL test worth running next to maximize the honest score (e.g., which edit format / reasoning setting to benchmark); (5) the straight answer to 'does the complete atomic change anything here' + where it WOULD win. Be a candid friend: no false hope, no hand-waving, concrete and respectful. Return ONLY the PT-BR verdict text.`,
  { label: 'final-verdict', phase: 'Synthesize' })

return { leaderboard, levers, atomic, verify, synthesis }
