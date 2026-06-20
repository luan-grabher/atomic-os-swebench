export const meta = {
  name: 'swebench-full-scaling-plan',
  description: 'Cost/speed/result plan to scale the Modal+DeepSeek SWE-bench agent from 50 to all 500 Verified',
  phases: [
    { title: 'Ground', detail: 'pricing + cost envelope + leak audit + architecture, in parallel' },
    { title: 'Synthesize', detail: 'merge into one costed phased plan' },
  ],
}

// ---- Grounded facts extracted from the real harness + 50-run, passed to every agent ----
const FACTS = `
HARNESS = /Users/danielpenin/swebench-atomic-ab/swe_modal_agent.py (Python, ThreadPoolExecutor).
Per instance solve(): modal.Sandbox.create(cpu=2, memory=4096MB, timeout=14400s/4h),
image = official prebuilt docker.io/swebench/sweb.eval.x86_64.<id>:latest when USE_PREBUILT=1 (tag __ -> _1776_).
Upfront per instance BEFORE the agent loop: git-apply hidden test_patch + commit; run eval_script pip-install lines;
BASELINE = run full PASS_TO_PASS suite TWICE (intersection) + one WHOLE-FILE parity run = ~3-4 full test-suite executions.
Then INFINITE agentic loop: each step = 1 DeepSeek chat completion; many steps call run_tests (runs F2P/P2P in sandbox).
Hard ceiling = max_steps*4 = 320 steps. finally: sb.terminate() (teardown is clean; evaluator reports 0 unstopped/unremoved).
DeepSeek: trim_history(keep=44) bounds context to ~44 messages/call; temperature=0; problem_statement truncated to 6000 chars.
Concurrency flag default 12 (max_workers).
MEASURED 50-instance run (princeton-nlp/SWE-bench_Verified subset): steps per instance mean=47.3 median=16 min=0 max=361 p90=109;
4 instances hit the 320 ceiling (pytest-5787, pylint-7080, pytest-10356, matplotlib-21568); total steps summed = 2363 across 50.
Repos in Verified: django, sympy, sphinx, matplotlib, astropy, scikit-learn, pytest, pylint, requests, flask, xarray, seaborn, etc.
Single-run honest result on the 50-subset = 45/50 (hybrid) / 49/50 best-of-environments. Goal now: scale to FULL 500.
Constraint from user: fast but NOT financially aggressive on Modal. Modal is the cost concern, DeepSeek is cheap.
`

const PRICE = {
  type: 'object', additionalProperties: false,
  required: ['modal_cpu_per_vcpu_sec','modal_mem_per_gb_sec','deepseek_input_per_mtok','deepseek_cache_hit_per_mtok','deepseek_output_per_mtok','notes','confidence'],
  properties: {
    modal_cpu_per_vcpu_sec: { type: 'string', description: 'current Modal CPU price per vCPU-second (and per core-hour equiv)' },
    modal_mem_per_gb_sec: { type: 'string', description: 'current Modal memory price per GB-second' },
    modal_other: { type: 'string', description: 'image build/registry pull/egress costs relevant to a 500-run, if any' },
    deepseek_input_per_mtok: { type: 'string' },
    deepseek_cache_hit_per_mtok: { type: 'string' },
    deepseek_output_per_mtok: { type: 'string' },
    notes: { type: 'string', description: 'caveats, free tier, what could not be confirmed' },
    confidence: { type: 'string', enum: ['high','medium','low'] },
  },
}

const ENVELOPE = {
  type: 'object', additionalProperties: false,
  required: ['per_instance_sandbox_minutes','modal_usd_500','deepseek_usd_500','total_usd_500','wallclock_hours_by_concurrency','tail_cost_share','assumptions'],
  properties: {
    per_instance_sandbox_minutes: { type: 'string', description: 'estimated sandbox wall minutes: median / mean / p90 / ceiling case, with reasoning' },
    modal_usd_500: { type: 'string', description: 'estimated Modal $ for all 500 (range), show the arithmetic' },
    deepseek_usd_500: { type: 'string', description: 'estimated DeepSeek $ for all 500 (range), show the arithmetic' },
    total_usd_500: { type: 'string' },
    wallclock_hours_by_concurrency: { type: 'string', description: 'wall-clock to finish 500 at concurrency 12 / 24 / 48' },
    tail_cost_share: { type: 'string', description: 'what % of total cost the long-tail (ceiling/p90) instances consume, and the $ saved by capping them' },
    assumptions: { type: 'string' },
  },
}

const LEAKS = {
  type: 'object', additionalProperties: false,
  required: ['leaks'],
  properties: {
    leaks: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['title','where','usd_impact_500','severity','fix'],
      properties: {
        title: { type: 'string' },
        where: { type: 'string', description: 'file:line or mechanism' },
        usd_impact_500: { type: 'string', description: 'rough $ or % of Modal spend this wastes across 500' },
        severity: { type: 'string', enum: ['high','medium','low'] },
        fix: { type: 'string', description: 'concrete change' },
      },
    }},
  },
}

const ARCH = {
  type: 'object', additionalProperties: false,
  required: ['recommended_plan','concurrency','per_instance_cap','two_pass_strategy','checkpoint_resume','budget_guardrail','exact_commands','risks'],
  properties: {
    recommended_plan: { type: 'string', description: 'the phased rollout in order' },
    concurrency: { type: 'string', description: 'recommended max_workers and why (speed vs Modal account limits/spend rate)' },
    per_instance_cap: { type: 'string', description: 'recommended hard step AND wall-clock cap to kill the tail without hurting result; current is 320 steps / 14400s' },
    two_pass_strategy: { type: 'string', description: 'cheap first pass over all 500 then escalate only failures (best-of-N / higher temp / more steps) — design it' },
    checkpoint_resume: { type: 'string', description: 'how to never re-run a solved instance; .partial usage; merge_preds' },
    budget_guardrail: { type: 'string', description: 'how to cap total Modal $ / abort if overspending' },
    exact_commands: { type: 'string', description: 'copy-paste shell commands for the full run' },
    risks: { type: 'string' },
  },
}

phase('Ground')
const [price, leaks, arch] = await parallel([
  () => agent(
    `Find the CURRENT (2026) published pricing for: (1) Modal CPU Sandboxes — price per vCPU-second and per GB-second of memory, plus any image-build / container-registry-pull / egress charges that would apply to running ~500 short-lived 2-vCPU/4GB sandboxes that each pull a prebuilt public Docker image; (2) DeepSeek V4 Pro API token pricing — input (cache-miss), input (cache-hit), and output per million tokens. Use web search; cite the pricing pages. If V4 Pro isn't separately published, use the closest current DeepSeek tier and say so.\n${FACTS}`,
    { label: 'pricing-research', phase: 'Ground', schema: PRICE, agentType: 'compound-engineering:ce-web-researcher' }),
  () => agent(
    `You are a cost-efficiency auditor. Read ${'/Users/danielpenin/swebench-atomic-ab/swe_modal_agent.py'} end to end. Identify the changes that most reduce Modal $ when scaling this harness from 50 to 500 instances, WITHOUT lowering the resolved score. Focus on: the 3-4 full-suite baseline runs done upfront per instance (cost × 500); the very generous 14400s/4h sandbox wall and 320-step ceiling letting runaway instances bill huge sandbox time; whether the same prebuilt image is pulled redundantly across concurrent sandboxes of the same repo/version; oversized cpu/memory; any place a sandbox can stay alive longer than needed. For each, give file:line, estimated $ or % of Modal spend wasted across 500, severity, and a concrete fix. Be specific and grounded in the actual code.\n${FACTS}`,
    { label: 'cost-leak-audit', phase: 'Ground', schema: LEAKS }),
  () => agent(
    `Design the concrete operational plan to run all 500 SWE-bench Verified instances through this harness: fast but financially conservative on Modal. Decide recommended concurrency (max_workers) trading wall-clock against Modal spend-rate and account limits; a hard per-instance step AND wall-clock cap to kill the long tail (4/50 burned the 320 ceiling — these dominate cost); a TWO-PASS escalate-failures strategy (cheap single-shot first pass over all 500 with a low cap, then a second more expensive pass — best-of-N / higher temperature / raised cap — ONLY on the unresolved set, which is the main cost/result lever); checkpoint/resume so a solved instance is never re-run (the harness already writes <out>.partial incrementally and there is a merge_preds.py); a total-$ budget guardrail / abort; and the exact copy-paste shell commands (the harness CLI is: python3 swe_modal_agent.py --ids-file IDS --out OUT --concurrency N ; env USE_PREBUILT=1 ; official scoring via swebench run_evaluation --modal). List risks.\n${FACTS}`,
    { label: 'architecture', phase: 'Ground', schema: ARCH }),
])

phase('Synthesize')
const synth = await agent(
  `Synthesize ONE decision-ready recommendation (markdown, Brazilian Portuguese) for scaling this SWE-bench agent from 50 to all 500 Verified instances — optimizing cost-benefit, speed, and result, being fast but NOT financially aggressive on Modal.\n\nInputs:\nPRICING = ${JSON.stringify(price)}\nCOST_ENVELOPE_INPUTS = ${FACTS}\nLEAK_AUDIT = ${JSON.stringify(leaks)}\nARCHITECTURE = ${JSON.stringify(arch)}\n\nUsing the measured step distribution (mean 47.3, median 16, p90 109, 4/50 hit the 320 ceiling; ~2363 total steps for 50) and the sandbox config (2 vCPU, 4GB), COMPUTE a grounded cost envelope for 500: per-instance sandbox minutes (median/mean/p90/ceiling), total Modal $ range, total DeepSeek $ range, combined $, wall-clock to finish at concurrency 12/24/48, and what % of cost the long tail consumes. Show the arithmetic compactly.\n\nThen deliver: (1) the single recommended plan in phases with the key cost levers ranked by $ saved; (2) a tight cost/speed table; (3) the top 3 harness changes to make BEFORE the full run (from the leak audit) with their $ impact; (4) exact copy-paste commands for a cheap first pass over all 500 + escalate-only-failures second pass + official scoring + a budget guardrail. Be concrete and honest about uncertainty in the $ numbers.`,
  { label: 'synthesis', phase: 'Synthesize', schema: {
    type: 'object', additionalProperties: false,
    required: ['cost_envelope','recommended_plan_md','cost_speed_table_md','pre_run_changes_md','commands_md','headline'],
    properties: {
      headline: { type: 'string', description: 'one-line bottom-line: rough total $ and wall-clock for 500, and the single biggest lever' },
      cost_envelope: { type: 'string', description: 'the computed $ + wall-clock envelope with arithmetic' },
      recommended_plan_md: { type: 'string' },
      cost_speed_table_md: { type: 'string' },
      pre_run_changes_md: { type: 'string' },
      commands_md: { type: 'string' },
    },
  }})

return { price, leaks, arch, synth }