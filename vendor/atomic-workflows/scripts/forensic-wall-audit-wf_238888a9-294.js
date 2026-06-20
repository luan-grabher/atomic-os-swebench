export const meta = {
  name: 'forensic-wall-audit',
  description: 'Forensically read every thought+action of each failing SWE-bench agent run to find the invisible harness walls (never model weakness) and propose concrete fixes',
  phases: [
    { title: 'Forensic', detail: 'one agent per failing instance reads the full transcript + harness code, classifies the wall, proposes a fix' },
    { title: 'Synthesize', detail: 'group walls by root cause, rank by instances affected, produce a prioritized concrete fix plan' },
  ],
}

const HARNESS = '/Users/danielpenin/swebench-atomic-ab/swe_modal_agent.py'
const TDIR = '/Users/danielpenin/swebench-atomic-ab/forensics/transcripts'

// The unresolved set — each still fails AFTER the per-delta-guard fix. Symptoms from the forensic summary table.
const FAILURES = [
  { id: 'django__django-10097',  sym: 'target=F forever, 183 steps' },
  { id: 'django__django-10880',  sym: 'target=F forever, 877 run_tests, 1503 steps' },
  { id: 'django__django-10914',  sym: 'target=F forever, 329 steps' },
  { id: 'django__django-10973',  sym: 'target=F forever, diff=39L, 978 steps' },
  { id: 'django__django-10999',  sym: 'target=F forever, 1944 run_tests, 2029 steps (extreme churn)' },
  { id: 'django__django-11066',  sym: 'target=F forever, 707 steps' },
  { id: 'sphinx-doc__sphinx-10323', sym: 'target=P reached but all=F, 812 run_tests, 1504 steps (pre-delta log)' },
  { id: 'sphinx-doc__sphinx-10435', sym: 'target=F forever, 898 steps' },
  { id: 'matplotlib__matplotlib-20826', sym: 'diff=0L EMPTY patch after 601 run_tests — never landed an edit' },
  { id: 'pylint-dev__pylint-7080', sym: 'diff=0L EMPTY patch after 155 run_tests — never landed an edit' },
  { id: 'pylint-dev__pylint-6903', sym: 'target=F, made an 8-line edit but target never passed' },
  { id: 'pylint-dev__pylint-7277', sym: 'Modal image BUILD failed (cached failed image) — agent never even started' },
  { id: 'psf__requests-1724', sym: 'target=F with diff=0L (empty), baseline had 24 preexisting p2p fails' },
  { id: 'psf__requests-1766', sym: 'target=F, 2-line edit, baseline had 22 preexisting p2p fails' },
  { id: 'psf__requests-2317', sym: 'target=F forever, 311 run_tests, 479 steps' },
]

const FORENSIC_SCHEMA = {
  type: 'object',
  required: ['instance_id','outcome','wall_class','root_cause','evidence','what_model_tried','why_not_model_fault','proposed_fix','confidence'],
  properties: {
    instance_id: { type: 'string' },
    outcome: { type: 'string', description: 'one of: target-F-forever | empty-patch | regression-stuck | build-error | other' },
    wall_class: { type: 'string', description: 'short tag for the invisible wall, e.g. "django-runner-test-id-format", "str_replace-keeps-refusing", "grep-cannot-find-symbol", "no-run_tests-output-shown-to-model", "image-build-cache-poisoned"' },
    root_cause: { type: 'string', description: 'precise mechanism: which TOOL/LOOP/CODE in swe_modal_agent.py limited the agent. Reference function names / lines. NOT "the model was confused".' },
    evidence: { type: 'array', items: { type: 'string' }, description: 'concrete quotes / step numbers from the transcript proving the wall (e.g. "step 44: str_replace -> REFUSED old not unique, repeated 9x")' },
    what_model_tried: { type: 'string', description: 'the agent\'s actual approach/strategy as seen in THINK + actions' },
    why_not_model_fault: { type: 'string', description: 'explicit: why this is an environmental wall, not weak reasoning — what a correctly-equipped agent would have been able to do' },
    proposed_fix: { type: 'string', description: 'CONCRETE change to swe_modal_agent.py (function, what to change, why it removes the wall). Be specific enough to implement.' },
    affects_other_instances: { type: 'array', items: { type: 'string' }, description: 'other instance ids in the set likely blocked by the SAME wall' },
    needs_live_repro: { type: 'boolean', description: 'true if the transcript alone cannot confirm the wall and a sandbox reproduction (running the harness test_cmd) is required' },
    confidence: { type: 'number' },
  },
}

phase('Forensic')
const reports = (await parallel(FAILURES.map(f => () =>
  agent(
    `You are a forensic harness auditor. A from-scratch SWE-bench agent (DeepSeek brain, tools running in a Modal sandbox) FAILED to resolve instance ${f.id}. Observed symptom: ${f.sym}.\n\n` +
    `GOVERNING PRINCIPLE (absolute): the model is NEVER the problem. Reasoning is a gravitational consequence of the tools/actions/feedback/possibilities the harness provides. Every failure is an INVISIBLE WALL built into the harness — a broken tool, a missing capability, a loop that starves the model of the feedback it needs, a test runner that never actually executes the target test. Your job is to find that wall with evidence, never to conclude "the model was weak/confused/lost".\n\n` +
    `READ THESE FILES:\n` +
    `1. The FULL transcript of the run: ${TDIR}/${f.id}.log — every line is prefixed with its source log. Lines contain: "THINK:" (the model's internal reasoning, when logged), tool actions "sN grep/read_file/str_replace(args) -> result", and "run_tests -> target=P/F all=P/F" verdicts. Read ALL of it.\n` +
    `2. The harness itself: ${HARNESS} — the tools the agent had (grep, read_file, str_replace, run_tests), the infinite loop, the two-phase guard, fmt_test_id (test-id normalization), the per-repo test_cmd construction, the anti-stuck reset. THIS is where the walls live.\n\n` +
    `DIAGNOSTIC CHECKLIST (work through it against the transcript):\n` +
    `- Did run_tests target EVER flip to P? If it stayed F across hundreds of runs, the wall is likely that the harness NEVER ACTUALLY RUNS/PARSES the FAIL_TO_PASS test for this repo (wrong test_cmd, wrong test-id format via fmt_test_id, wrong runner). django uses tests/runtests.py with unittest ids "method (module.Class)"; sphinx uses tox; neither is pytest. Inspect fmt_test_id and the test_cmd path for this repo and state precisely how a wrong id/command makes target unmeasurable. Note: the run_tests OUTPUT text is NOT in the transcript (only the verdict is logged) — if you cannot confirm the runner output from the transcript, set needs_live_repro=true and say exactly what sandbox command should be run to confirm.\n` +
    `- If the final patch is EMPTY (diff=0L) despite many run_tests, the agent could not LAND an edit. Count str_replace attempts and their results: how many "REFUSED: old not found / not unique / syntax guard"? A high refuse rate means the editing tool (str_replace exact-match) is too brittle for what the model is trying — propose a more forgiving / better-targeted edit primitive or better locate feedback.\n` +
    `- Count grep "(no matches)" results: is the model blind because grep is mis-scoped, anchored wrong, or the symbol is in a blocked file?\n` +
    `- Is the model starved of feedback (truncated output, no line numbers, refused reads of needed files)?\n` +
    `- For build-error: the image build is cached-failed; the wall is the harness reusing a poisoned cached image with no rebuild/repair path.\n\n` +
    `Quote specific step numbers and tool results as evidence. Then propose a CONCRETE fix to ${HARNESS} (name the function, the change, and why it removes the wall). Identify which OTHER instances in this set share the same wall. Return strictly per the schema.`,
    { label: `forensic:${f.id}`, phase: 'Forensic', schema: FORENSIC_SCHEMA, agentType: 'general-purpose' }
  )
))).filter(Boolean)

phase('Synthesize')
const SYNTH_SCHEMA = {
  type: 'object',
  required: ['walls','ranked_plan','biggest_lever','summary'],
  properties: {
    walls: { type: 'array', items: { type: 'object', required: ['wall_class','root_cause','instances','count','proposed_fix','priority'], properties: {
      wall_class: { type: 'string' }, root_cause: { type: 'string' },
      instances: { type: 'array', items: { type: 'string' } }, count: { type: 'number' },
      proposed_fix: { type: 'string' }, priority: { type: 'number', description: '1=highest' },
      needs_live_repro: { type: 'boolean' },
    } } },
    ranked_plan: { type: 'array', items: { type: 'string' }, description: 'ordered, concrete implementation steps for swe_modal_agent.py, biggest-lever-first' },
    biggest_lever: { type: 'string' },
    summary: { type: 'string' },
  },
}
const synthesis = await agent(
  `You are the lead harness engineer. ${reports.length} forensic auditors each diagnosed one FAILED SWE-bench agent run, finding the INVISIBLE HARNESS WALL (never model weakness) that blocked it. Here are their structured reports as JSON:\n\n` +
  JSON.stringify(reports, null, 1) +
  `\n\nSynthesize: (1) GROUP the findings into distinct walls by shared root_cause. (2) For each wall, list the instances affected, the count, and a single concrete fix to /Users/danielpenin/swebench-atomic-ab/swe_modal_agent.py. (3) RANK walls by number of instances recoverable (biggest lever first) — the django/sphinx non-pytest runner wall is expected to be largest (~8 instances). (4) Produce a ranked, concrete implementation plan (ordered code-change steps for the harness) and name the single biggest lever. Flag which walls need live sandbox reproduction to confirm. Return strictly per schema.`,
  { label: 'synthesize-walls', phase: 'Synthesize', schema: SYNTH_SCHEMA, agentType: 'general-purpose' }
)

return { n_reports: reports.length, reports, synthesis }
