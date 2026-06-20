export const meta = {
  name: 'atomic-residual-friction-audit',
  description: 'Second-layer atomic-only audit over the POST-demolition transcripts of all 50 (winners incl.) — find the residual invisible friction that still makes a 5-step win not a 2-step win, then demolish via atomic',
  phases: [
    { title: 'Read', detail: 'one agent per instance, atomic-only, reads the FRESH post-demolition transcript + harness, finds residual friction walls even in fast wins' },
    { title: 'Synthesize', detail: 'rank residual walls by total friction, conservative concrete fix plan' },
    { title: 'Demolish', detail: 'one agent applies only the clearly-safe additive fixes via atomic' },
  ],
}
const STAGE = '/Users/danielpenin/kloel/.swebench-audit'
const ATOMIC = 'Use ONLY the atomic MCP. First: ToolSearch("select:mcp__atomic-edit__atomic_read_file,mcp__atomic-edit__atomic_grep,mcp__atomic-edit__atomic_outline,mcp__atomic-edit__code_read_symbol"); then read ONLY via mcp__atomic-edit__* (no builtin Read/Grep/Bash). Paths relative to repo root /Users/danielpenin/kloel, e.g. ".swebench-audit/transcripts2/<id>.log".'
const ids = ["astropy__astropy-12907","astropy__astropy-13033","astropy__astropy-13236","astropy__astropy-13453","astropy__astropy-13579","astropy__astropy-13977","django__django-10097","django__django-10880","django__django-10914","django__django-10973","django__django-10999","django__django-11066","matplotlib__matplotlib-13989","matplotlib__matplotlib-20488","matplotlib__matplotlib-20676","matplotlib__matplotlib-20826","matplotlib__matplotlib-20859","matplotlib__matplotlib-21568","mwaskom__seaborn-3069","pallets__flask-5014","psf__requests-1142","psf__requests-1724","psf__requests-1766","psf__requests-1921","psf__requests-2317","psf__requests-2931","pydata__xarray-2905","pydata__xarray-3151","pydata__xarray-3677","pydata__xarray-4075","pydata__xarray-4094","pydata__xarray-4356","pylint-dev__pylint-4970","pylint-dev__pylint-6903","pylint-dev__pylint-7080","pylint-dev__pylint-7277","pytest-dev__pytest-10051","pytest-dev__pytest-10081","pytest-dev__pytest-10356","pytest-dev__pytest-5262","pytest-dev__pytest-5631","pytest-dev__pytest-5787","scikit-learn__scikit-learn-10297","scikit-learn__scikit-learn-10844","scikit-learn__scikit-learn-10908","scikit-learn__scikit-learn-11310","scikit-learn__scikit-learn-11578","scikit-learn__scikit-learn-12585","sphinx-doc__sphinx-10323","sphinx-doc__sphinx-10435"]
const SCHEMA = {
  type: 'object', required: ['instance_id','actual_steps','ideal_steps','residual_walls','summary'],
  properties: {
    instance_id: { type: 'string' }, actual_steps: { type: 'number' }, ideal_steps: { type: 'number' },
    residual_walls: { type: 'array', items: { type: 'object', required: ['wall','root_cause','evidence','steps_wasted','fix'], properties: {
      wall: { type: 'string' }, root_cause: { type: 'string', description: 'harness function/line that still adds friction — NOT model weakness' },
      evidence: { type: 'array', items: { type: 'string' } }, steps_wasted: { type: 'number' }, fix: { type: 'string' } } } },
    summary: { type: 'string' } },
}
phase('Read')
const reports = (await parallel(ids.map(id => () =>
  agent(
    'ABSOLUTE principle: the model is never weak; every step of friction is an invisible harness wall. This is the SECOND-layer audit: the big walls were demolished (delta-guard, locale, ANSI, scoped-grep, P3, intersection-baseline, whole-file-parity, stagnation break) and wins now take 5-50 steps. Your job: find the RESIDUAL friction that still makes even a fast WIN slower/less direct than the ideal 1-3 steps (locate→edit→verify). Read EVERY think+action.\n\n' +
    'INSTANCE ' + id + '. ' + ATOMIC + '\n\nREAD: 1) .swebench-audit/transcripts2/' + id + '.log (the FRESH post-demolition run). 2) .swebench-audit/swe_modal_agent.py (the harness). Look for: wasted exploration before the first edit, premature run_tests on empty diff, re-reads of the same location (trim eviction), grep calls that returned noise, str_replace refusals, any tool result that under-informed the model. For each: name it, root-cause it to a harness function, quote step evidence, estimate steps_wasted, propose a concrete additive fix. Estimate ideal_steps. Strict schema.',
    { label: 'read:' + id, phase: 'Read', schema: SCHEMA, agentType: 'general-purpose' }
  )
))).filter(Boolean)
phase('Synthesize')
const PLAN = { type: 'object', required: ['walls','fix_plan','summary'], properties: {
  walls: { type: 'array', items: { type: 'object', required: ['wall','instances','count','steps_wasted','fix','safe'], properties: {
    wall: { type: 'string' }, instances: { type: 'array', items: { type: 'string' } }, count: { type: 'number' },
    steps_wasted: { type: 'number' }, fix: { type: 'string' }, safe: { type: 'boolean', description: 'low-risk additive — safe to auto-apply' } } } },
  fix_plan: { type: 'array', items: { type: 'object', required: ['target','oldText','newText','safe'], properties: {
    target: { type: 'string' }, oldText: { type: 'string' }, newText: { type: 'string' }, safe: { type: 'boolean' } } } },
  summary: { type: 'string' } } }
const plan = await agent(
  ids.length + ' second-layer auditors reported residual friction walls in the post-demolition runs (JSON):\n\n' + JSON.stringify(reports).slice(0,200000) +
  '\n\nGroup by shared root_cause, rank by instances*steps_wasted, and produce a CONSERVATIVE fix_plan of concrete additive edits to .swebench-audit/swe_modal_agent.py (each oldText verbatim, safe=true ONLY if clearly low-risk and the harness already wins 44/50 — do not risk regressions for marginal speedups). Strict schema.',
  { label: 'synthesize-residual', phase: 'Synthesize', schema: PLAN, agentType: 'general-purpose' })
phase('Demolish')
const DEMO = { type: 'object', required: ['applied','skipped','syntax_ok','summary'], properties: {
  applied: { type: 'array', items: { type: 'object', properties: { target: {type:'string'}, change: {type:'string'} } } },
  skipped: { type: 'array', items: { type: 'object', properties: { change: {type:'string'}, reason: {type:'string'} } } },
  syntax_ok: { type: 'boolean' }, summary: { type: 'string' } } }
const demolition = await agent(
  'Apply ONLY safe=true fixes from this plan to .swebench-audit/swe_modal_agent.py using ONLY the atomic MCP. PLAN:\n' + JSON.stringify(plan).slice(0,100000) +
  '\n\n1) ToolSearch("select:mcp__atomic-edit__atomic_read_file,mcp__atomic-edit__atomic_replace_text,mcp__atomic-edit__atomic_session_begin,mcp__atomic-edit__atomic_session_commit"). 2) atomic_session_begin(paths:[".swebench-audit/swe_modal_agent.py"]). 3) For each safe=true fix: atomic_read_file the region for exact text, then atomic_replace_text (it syntax-validates + needs proofOfIncorrectness from the wall root cause; if it refuses, record skipped, never force). 4) atomic_session_commit. 5) Confirm the file still parses. Strict schema.',
  { label: 'demolish-residual', phase: 'Demolish', schema: DEMO, agentType: 'general-purpose' })
return { n: reports.length, reports, plan, demolition }
