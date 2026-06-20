export const meta = {
  name: 'final-six-wall-demolition',
  description: 'Atomic-only deep read of the 6 still-unresolved SWE-bench instances to find each one exact remaining wall and the concrete harness fix to reach 50/50',
  phases: [
    { title: 'Diagnose', detail: 'one agent per remaining instance reads its full transcript + harness, cracks the exact wall' },
    { title: 'Plan', detail: 'synthesize the concrete, safe harness fixes that would convert them' },
  ],
}
const STAGE = '/Users/danielpenin/kloel/.swebench-audit'
const ATOMIC = 'Use ONLY the atomic MCP for reading. First: ToolSearch("select:mcp__atomic-edit__atomic_read_file,mcp__atomic-edit__atomic_outline"); then read ONLY via mcp__atomic-edit__*. Paths relative to repo root /Users/danielpenin/kloel, e.g. ".swebench-audit/six/<id>.log".'
const SIX = [
  {id:'pylint-dev__pylint-7080', sym:'equipped harness (outline/read_symbol/glob/keep44): localizes _is_ignored_file/expand_modules correctly, edits, but target FAIL_TO_PASS never passes — synthesis of the ignore-paths recursion fix not landing'},
  {id:'pylint-dev__pylint-6903', sym:'16 edits applied, target never P — synthesis of the cpu-count/_query_cpu fix not landing'},
  {id:'sphinx-doc__sphinx-10435', sym:'5 edits, target never P, reset=2 — latex inline-code rendering fix synthesis not landing'},
  {id:'psf__requests-2317', sym:'target=P reached 12x but ends all=F with 1 regression / oscillates F — a p2p test breaks; may be network-dependent (httpbin) un-runnable locally'},
  {id:'sphinx-doc__sphinx-10323', sym:'local all=P / local_pass=True BUT official PASS_TO_PASS fails test_literal_include_linenos + test_linenothreshold — those 2 tests do not run faithfully in my sandbox (env divergence), so a regression on them is invisible to the local guard'},
  {id:'pylint-dev__pylint-7277', sym:'Modal image build cached-fail (im-WFm0z26…) — agent never started; build wall, no transcript'},
]
const SCHEMA = {
  type:'object', required:['instance_id','wall_type','root_cause','is_harness_wall','concrete_fix','confidence'],
  properties:{
    instance_id:{type:'string'},
    wall_type:{type:'string', description:'synthesis-feedback | regression-invisible | env-test-divergence | network-unrunnable | build-cache | other'},
    root_cause:{type:'string', description:'the precise mechanism in swe_modal_agent.py OR the environment that prevents conversion — what does the model NOT see/have that a correctly-equipped agent would?'},
    is_harness_wall:{type:'boolean', description:'true if a harness/tool/feedback change could plausibly convert it; false if it is a genuine environment limit (network, build infra) outside the agent loop'},
    evidence:{type:'array', items:{type:'string'}},
    concrete_fix:{type:'string', description:'the specific change to swe_modal_agent.py (function + what) that would remove the wall, OR the infra action for env/build walls'},
    confidence:{type:'number'},
  },
}
phase('Diagnose')
const reports = (await parallel(SIX.map(it => () =>
  agent(
    'ABSOLUTE principle: the model is never weak; a failure is an invisible wall in the harness/tools/feedback. We are at 44/50 official; these are the last 6. Find the EXACT wall blocking ' + it.id + ' and the concrete fix to convert it.\n\n' +
    'Symptom: ' + it.sym + '\n\n' + ATOMIC + '\n\nREAD: 1) .swebench-audit/six/' + it.id + '.log (its full run). 2) .swebench-audit/swe_modal_agent.py (the harness: run_tests two-phase feedback, the target=F message out_t[-1800:], the regression P5 re-run, intersection-baseline, whole-file parity confirm, outline/read_symbol/glob tools). KEY QUESTIONS: When target=F persists despite edits — does the feedback show the model the FULL failing assertion(s), or a truncated tail / only the first of many (data-driven tests make it oscillate case-by-case)? For requests-2317 — is the breaking p2p test network-dependent? For sphinx-10323 — can the 2 env-divergent tests be made to run locally (eval_script setup), or must the guard at least WARN the model not to touch them? For pylint-7277 — is it purely a build-infra rebuild? Classify wall_type, set is_harness_wall honestly (do NOT claim a fix for a genuine network/build limit), and give the concrete harness change. Strict schema.',
    { label:'diag:'+it.id, phase:'Diagnose', schema:SCHEMA, agentType:'general-purpose' }
  )
))).filter(Boolean)
phase('Plan')
const PLAN={type:'object',required:['convertible','fixes','genuine_limits','summary'],properties:{
  convertible:{type:'array',items:{type:'string'},description:'instance ids a harness fix can plausibly convert'},
  genuine_limits:{type:'array',items:{type:'string'},description:'ids blocked by real env/infra limits outside the loop'},
  fixes:{type:'array',items:{type:'object',required:['target','change','converts','safe'],properties:{target:{type:'string'},change:{type:'string'},converts:{type:'array',items:{type:'string'}},safe:{type:'boolean'}}}},
  summary:{type:'string'}}}
const plan = await agent(
  '6 diagnosers reported the last walls (JSON):\n'+JSON.stringify(reports)+
  '\n\nProduce the path to 50/50: which are convertible by a harness fix vs genuine env/infra limits; the concrete ordered fixes to swe_modal_agent.py (target function, change, which ids it converts, safe flag); be honest about genuine limits (network/build) — do not invent a fix. Strict schema.',
  { label:'plan-to-50', phase:'Plan', schema:PLAN, agentType:'general-purpose' })
return { reports, plan }
