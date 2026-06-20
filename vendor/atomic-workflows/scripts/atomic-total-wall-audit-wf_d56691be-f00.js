export const meta = {
  name: 'atomic-total-wall-audit',
  description: 'Atomic-MCP-only forensic audit of ALL 50 SWE-bench agent runs (winners included) to find every invisible wall — even friction that merely SLOWED a win — then demolish via atomic',
  phases: [
    { title: 'Audit', detail: '50 agents, one per instance, atomic-MCP-only, read every thought+action, find all walls incl. efficiency walls in wins' },
    { title: 'Synthesize', detail: 'aggregate, dedupe, rank by (instances × steps wasted), produce conservative concrete fix plan' },
    { title: 'Demolish', detail: 'one serialized agent applies the safe top fixes to the staged harness via atomic edit ops (syntax-validated)' },
  ],
}

const STAGE = '/Users/danielpenin/kloel/.swebench-audit'
const HARNESS = STAGE + '/swe_modal_agent.py'
const TDIR = STAGE + '/transcripts'
const ATOMIC_LOAD = 'ToolSearch("select:mcp__atomic-edit__atomic_read_file,mcp__atomic-edit__atomic_grep,mcp__atomic-edit__atomic_outline,mcp__atomic-edit__atomic_ast_search,mcp__atomic-edit__code_read_symbol") then use ONLY those mcp__atomic-edit__* tools for ALL file reading/searching — do NOT use the builtin Read/Grep/Bash. Paths are relative to repo root /Users/danielpenin/kloel, e.g. ".swebench-audit/transcripts/<id>.log".'

const ALL = [
  {id:'astropy__astropy-12907',cls:'WIN-SLOW',step:15,g:0,nm:0,rf:0},
  {id:'astropy__astropy-13033',cls:'WIN-SLOW',step:109,g:0,nm:0,rf:0},
  {id:'astropy__astropy-13236',cls:'WIN-SLOW',step:1361,g:83,nm:14,rf:17},
  {id:'astropy__astropy-13453',cls:'WIN-SLOW',step:60,g:0,nm:0,rf:0},
  {id:'astropy__astropy-13579',cls:'WIN-SLOW',step:28,g:0,nm:0,rf:0},
  {id:'astropy__astropy-13977',cls:'WIN-SLOW',step:97,g:0,nm:0,rf:0},
  {id:'django__django-10097',cls:'LOSS',step:183,g:64,nm:13,rf:15},
  {id:'django__django-10880',cls:'WIN-SLOW',step:1503,g:17,nm:5,rf:0},
  {id:'django__django-10914',cls:'WIN-SLOW',step:329,g:7,nm:2,rf:2},
  {id:'django__django-10973',cls:'LOSS',step:978,g:28,nm:11,rf:3},
  {id:'django__django-10999',cls:'WIN-SLOW',step:2029,g:12,nm:4,rf:4},
  {id:'django__django-11066',cls:'WIN-SLOW',step:707,g:0,nm:0,rf:0},
  {id:'matplotlib__matplotlib-13989',cls:'WIN-SLOW',step:1454,g:48,nm:14,rf:2},
  {id:'matplotlib__matplotlib-20488',cls:'WIN-SLOW',step:1354,g:56,nm:24,rf:4},
  {id:'matplotlib__matplotlib-20676',cls:'WIN-SLOW',step:46,g:0,nm:0,rf:0},
  {id:'matplotlib__matplotlib-20826',cls:'WIN-SLOW',step:1454,g:156,nm:27,rf:1},
  {id:'matplotlib__matplotlib-20859',cls:'WIN-SLOW',step:18,g:0,nm:0,rf:0},
  {id:'matplotlib__matplotlib-21568',cls:'WIN-SLOW',step:349,g:0,nm:0,rf:0},
  {id:'mwaskom__seaborn-3069',cls:'WIN-SLOW',step:58,g:0,nm:0,rf:0},
  {id:'pallets__flask-5014',cls:'WIN-SLOW',step:12,g:0,nm:0,rf:0},
  {id:'psf__requests-1142',cls:'WIN-SLOW',step:21,g:0,nm:0,rf:0},
  {id:'psf__requests-1724',cls:'WIN-SLOW',step:189,g:68,nm:25,rf:5},
  {id:'psf__requests-1766',cls:'WIN-SLOW',step:103,g:83,nm:41,rf:7},
  {id:'psf__requests-1921',cls:'WIN-SLOW',step:27,g:0,nm:0,rf:0},
  {id:'psf__requests-2317',cls:'LOSS',step:479,g:105,nm:48,rf:11},
  {id:'psf__requests-2931',cls:'WIN-SLOW',step:47,g:0,nm:0,rf:0},
  {id:'pydata__xarray-2905',cls:'WIN-SLOW',step:48,g:0,nm:0,rf:0},
  {id:'pydata__xarray-3151',cls:'WIN-SLOW',step:62,g:0,nm:0,rf:0},
  {id:'pydata__xarray-3677',cls:'WIN-FAST',step:7,g:0,nm:0,rf:0},
  {id:'pydata__xarray-4075',cls:'WIN-SLOW',step:12,g:9,nm:1,rf:0},
  {id:'pydata__xarray-4094',cls:'WIN-SLOW',step:101,g:0,nm:0,rf:0},
  {id:'pydata__xarray-4356',cls:'WIN-SLOW',step:929,g:73,nm:17,rf:4},
  {id:'pylint-dev__pylint-4970',cls:'WIN-SLOW',step:43,g:0,nm:0,rf:0},
  {id:'pylint-dev__pylint-6903',cls:'WIN-SLOW',step:189,g:138,nm:74,rf:21},
  {id:'pylint-dev__pylint-7080',cls:'LOSS',step:361,g:270,nm:45,rf:8},
  {id:'pylint-dev__pylint-7277',cls:'LOSS',step:0,g:0,nm:0,rf:0},
  {id:'pytest-dev__pytest-10051',cls:'WIN-SLOW',step:22,g:0,nm:0,rf:0},
  {id:'pytest-dev__pytest-10081',cls:'WIN-SLOW',step:1142,g:73,nm:35,rf:5},
  {id:'pytest-dev__pytest-10356',cls:'WIN-SLOW',step:795,g:60,nm:27,rf:6},
  {id:'pytest-dev__pytest-5262',cls:'WIN-SLOW',step:1772,g:1,nm:0,rf:0},
  {id:'pytest-dev__pytest-5631',cls:'WIN-SLOW',step:17,g:0,nm:0,rf:0},
  {id:'pytest-dev__pytest-5787',cls:'WIN-SLOW',step:497,g:11,nm:2,rf:1},
  {id:'scikit-learn__scikit-learn-10297',cls:'WIN-SLOW',step:18,g:0,nm:0,rf:0},
  {id:'scikit-learn__scikit-learn-10844',cls:'WIN-SLOW',step:11,g:0,nm:0,rf:0},
  {id:'scikit-learn__scikit-learn-10908',cls:'WIN-SLOW',step:25,g:0,nm:0,rf:0},
  {id:'scikit-learn__scikit-learn-11310',cls:'WIN-SLOW',step:21,g:0,nm:0,rf:0},
  {id:'scikit-learn__scikit-learn-11578',cls:'WIN-FAST',step:3,g:0,nm:0,rf:0},
  {id:'scikit-learn__scikit-learn-12585',cls:'WIN-FAST',step:5,g:0,nm:0,rf:0},
  {id:'sphinx-doc__sphinx-10323',cls:'WIN-SLOW',step:1504,g:13,nm:7,rf:3},
  {id:'sphinx-doc__sphinx-10435',cls:'LOSS',step:898,g:81,nm:27,rf:6},
]

const ALREADY = 'ALREADY-SHIPPED (do NOT re-report — fixed): (1) delta-guard PASS_TO_PASS baseline subtraction (only NEW regressions count); (2) PYTHONIOENCODING=utf-8 + C.UTF-8 locale; (3) ANSI-strip in parse_failed_set; (4) scoped grep honoring path+glob and excluding build/dist/.tox/.eggs; (5) incremental .partial save; (6) crash-safe last_diff snapshot. ALREADY-FOUND by a prior audit (will be fixed — re-mention only if YOUR transcript adds NEW evidence): ARG_MAX crash when sb_str_replace interpolates a large payload into the exec cmd (kills the instance with an empty patch); strict-utf8 decode crash in sbexec on a non-UTF8 byte; anti-stuck reset gates on run_tests-count(>=12) not step-count so deep-exploration runs never get the lifeline; trim_history keep=28 evicts the key discovery within ~4 cycles forcing re-discovery.'

const WALL_SCHEMA = {
  type: 'object',
  required: ['instance_id','outcome','actual_steps','ideal_steps','walls','summary'],
  properties: {
    instance_id: { type: 'string' },
    outcome: { type: 'string', description: 'win-fast | win-slow | loss' },
    actual_steps: { type: 'number' },
    ideal_steps: { type: 'number', description: 'estimate of steps a perfectly-equipped agent would need' },
    walls: { type: 'array', items: { type: 'object', required: ['wall_class','root_cause','evidence','steps_wasted','proposed_fix','novelty'], properties: {
      wall_class: { type: 'string' },
      root_cause: { type: 'string', description: 'precise harness mechanism (function/line in swe_modal_agent.py) — NOT model weakness' },
      evidence: { type: 'array', items: { type: 'string' } },
      steps_wasted: { type: 'number' },
      proposed_fix: { type: 'string' },
      novelty: { type: 'string', description: 'NEW | confirms-known | extends-known' },
    } } },
    summary: { type: 'string' },
  },
}

phase('Audit')
const reports = (await parallel(ALL.map(it => () =>
  agent(
    'You are a forensic harness auditor under an ABSOLUTE principle: the model is NEVER weak. Reasoning is a gravitational consequence of the tools/actions/feedback the harness gives it. EVERY inefficiency — including in a WIN — is an INVISIBLE WALL the harness author built. A win that took ' + it.step + ' steps is NOT a success; it is ' + it.step + ' steps of evidence that walls slowed a model that could have won in a handful of steps. Find those walls.\n\n' +
    'INSTANCE: ' + it.id + ' — class=' + it.cls + ', max_step=' + it.step + ', grep_calls=' + it.g + ', grep_no_match=' + it.nm + ', str_replace_refused=' + it.rf + '.\n' +
    (it.cls === 'WIN-FAST' ? 'Won FAST — still find any residual friction, may be minimal.\n' :
     it.cls === 'LOSS' ? 'LOST — find the wall(s) that blocked the win entirely.\n' :
     'WON but SLOWLY (' + it.step + ' steps). KEY QUESTION: what walls turned a ~5-step fix into a ' + it.step + '-step ordeal? high grep_no_match (' + it.nm + ') => search/localization wall; high str_replace_refused (' + it.rf + ') => editing-tool brittleness; high step/run_tests ratio => context-trim re-discovery or feedback starvation.\n') +
    '\nUSE ONLY THE ATOMIC MCP. ' + ATOMIC_LOAD + '\n\n' +
    'READ (via atomic_read_file):\n1. The full transcript: .swebench-audit/transcripts/' + it.id + '.log — lines: "THINK:" reasoning, "sN tool(args) -> result" actions, "run_tests -> target/all" verdicts. Read ALL (paginate via startLine/endLine if large).\n2. The harness: .swebench-audit/swe_modal_agent.py — tools (grep/read_file/str_replace/run_tests), infinite loop, trim_history, two-phase delta guard, fmt_test_id, sbexec, sb_str_replace, anti-stuck reset. Use atomic_outline to map it, atomic_read_file/code_read_symbol for functions.\n\n' +
    ALREADY + '\n\n' +
    'Find EVERY wall, focusing on what the friction numbers imply. For each: name it, give the precise harness root cause (function), quote transcript evidence, estimate steps_wasted, propose a concrete fix, mark novelty. Estimate ideal_steps. Return strictly per schema.',
    { label: 'audit:' + it.id, phase: 'Audit', schema: WALL_SCHEMA, agentType: 'general-purpose' }
  )
))).filter(Boolean)

phase('Synthesize')
const PLAN_SCHEMA = {
  type: 'object',
  required: ['walls','fix_plan','biggest_levers','total_steps_wasted','summary'],
  properties: {
    walls: { type: 'array', items: { type: 'object', required: ['wall_class','root_cause','instances','count','steps_wasted','proposed_fix','priority','risk'], properties: {
      wall_class: { type: 'string' }, root_cause: { type: 'string' },
      instances: { type: 'array', items: { type: 'string' } }, count: { type: 'number' },
      steps_wasted: { type: 'number' }, proposed_fix: { type: 'string' },
      priority: { type: 'number' }, risk: { type: 'string', description: 'low|medium|high — risk the fix breaks the working 44/50' },
    } } },
    fix_plan: { type: 'array', items: { type: 'object', required: ['target_function','change','oldText_hint','newText_sketch','safe'], properties: {
      target_function: { type: 'string' }, change: { type: 'string' },
      oldText_hint: { type: 'string', description: 'verbatim code region to replace' },
      newText_sketch: { type: 'string', description: 'replacement code' },
      safe: { type: 'boolean', description: 'true if low-risk and well-evidenced enough to auto-apply' },
    } } },
    biggest_levers: { type: 'array', items: { type: 'string' } },
    total_steps_wasted: { type: 'number' },
    summary: { type: 'string' },
  },
}
const plan = await agent(
  'You are the lead harness engineer. ' + reports.length + ' forensic auditors each analyzed one of the 50 SWE-bench agent runs (winners and losers) and reported the INVISIBLE WALLS that slowed or blocked it, with root causes in swe_modal_agent.py. Reports as JSON:\n\n' +
  JSON.stringify(reports).slice(0, 240000) +
  '\n\nProduce the demolition plan: (1) GROUP findings into distinct walls by shared root_cause; per wall list instances, count, total steps_wasted, one concrete fix, priority (by instances*steps_wasted), and risk of breaking the working 44/50. (2) Produce an ORDERED fix_plan of concrete edits to .swebench-audit/swe_modal_agent.py — each with target_function, verbatim oldText_hint and newText_sketch, and a safe flag (true ONLY if low-risk + well-evidenced). Be CONSERVATIVE: the harness already wins 44/50; a fix risking regressions is NOT worth a marginal speedup. (3) Name biggest levers and total steps wasted. Return strictly per schema.',
  { label: 'synthesize-demolition-plan', phase: 'Synthesize', schema: PLAN_SCHEMA, agentType: 'general-purpose' }
)

phase('Demolish')
const DEMO_SCHEMA = {
  type: 'object',
  required: ['applied','skipped','syntax_ok','receipt_summary'],
  properties: {
    applied: { type: 'array', items: { type: 'object', properties: { target_function:{type:'string'}, change:{type:'string'} } } },
    skipped: { type: 'array', items: { type: 'object', properties: { change:{type:'string'}, reason:{type:'string'} } } },
    syntax_ok: { type: 'boolean' },
    receipt_summary: { type: 'string' },
  },
}
const demolition = await agent(
  'You are the demolition engineer. Apply ONLY the safe=true fixes from this plan to the harness at .swebench-audit/swe_modal_agent.py, using ONLY the atomic MCP edit tools.\n\nPLAN:\n' +
  JSON.stringify(plan).slice(0, 120000) +
  '\n\nPROCEDURE (atomic-only):\n' +
  '1. ToolSearch("select:mcp__atomic-edit__atomic_read_file,mcp__atomic-edit__atomic_replace_text,mcp__atomic-edit__atomic_session_begin,mcp__atomic-edit__atomic_session_commit,mcp__atomic-edit__atomic_outline").\n' +
  '2. atomic_session_begin(paths:[".swebench-audit/swe_modal_agent.py"]) to snapshot.\n' +
  '3. For EACH safe=true fix: atomic_read_file the target region to get the EXACT current text, then atomic_replace_text(file:".swebench-audit/swe_modal_agent.py", oldText:<exact verbatim>, newText:<fix>). atomic_replace_text is syntax-regression-validated — if it refuses, the edit was unsafe; record it as skipped, do NOT force it. Apply one at a time; re-read between edits since content shifts.\n' +
  '4. SKIP any fix not safe=true, or whose oldText you cannot match exactly, or that atomic refuses. Never break the file.\n' +
  '5. atomic_session_commit(sessionId) for the change receipt.\n' +
  '6. Finally atomic_read_file the whole file and confirm it still parses as coherent Python. Set syntax_ok accordingly.\n\n' +
  'Return strictly per schema: applied, skipped (with reasons), syntax_ok, one-paragraph receipt_summary.',
  { label: 'demolish-via-atomic', phase: 'Demolish', schema: DEMO_SCHEMA, agentType: 'general-purpose' }
)

return { n_reports: reports.length, reports, plan, demolition }
