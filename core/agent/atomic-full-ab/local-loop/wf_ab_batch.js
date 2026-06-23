export const meta = {
  name: 'atomic-ab-batch',
  description: 'Multi-repo A/B: DeepSeek-atomic CLI vs native-Claude one-shot on 5 hard SWE-bench-Verified instances (5 repos), scored on the official harness, then adversarial wall-mining of the atomic arm (winners included)',
  phases: [
    { title: 'Setup', detail: 'checkout pristine + native/atomic workdirs per instance' },
    { title: 'RunArms', detail: 'atomic DeepSeek CLI one-shot + native-Claude one-shot, in parallel' },
    { title: 'Walls', detail: 'mine representation walls from the atomic arm reasoning (even in wins)' },
    { title: 'Verify', detail: 'adversarially verify each wall is real + generalist' },
    { title: 'Synthesize', detail: 'edit-economy scoreboard + ranked next demolitions (Docker scoring done separately)' },
  ],
}

const LOOP = '/Users/danielpenin/atomic-os-swebench/core/agent/atomic-full-ab/local-loop'
const ISO = '/private/tmp/swe/iso-driver-claude/laa_iso.py'
const ACALL = '/Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-call.mjs'
const WFB = '/private/tmp/swe/round/WFB'
const INSTANCES = [
  'pytest-dev__pytest-5840',
  'pylint-dev__pylint-6528',
  'scikit-learn__scikit-learn-10297',
  'astropy__astropy-14508',
]

const SETUP_SCHEMA = { type:'object', additionalProperties:false, required:['id','ok','taskdir','native_wd','atomic_wd'],
  properties:{ id:{type:'string'}, ok:{type:'boolean'}, taskdir:{type:'string'}, native_wd:{type:'string'}, atomic_wd:{type:'string'}, note:{type:'string'} } }
const ATOMIC_SCHEMA = { type:'object', additionalProperties:false, required:['id','edits','diff_lines','tool_calls','files'],
  properties:{ id:{type:'string'}, edits:{type:'integer'}, diff_lines:{type:'integer'}, tool_calls:{type:'integer'}, files:{type:'array',items:{type:'string'}}, tokens:{type:'integer'}, note:{type:'string'} } }
const NATIVE_SCHEMA = { type:'object', additionalProperties:false, required:['id','diff_lines','files','summary'],
  properties:{ id:{type:'string'}, diff_lines:{type:'integer'}, files:{type:'array',items:{type:'string'}}, summary:{type:'string'} } }
const SCORE_SCHEMA = { type:'object', additionalProperties:false, required:['id','atomic_resolved','native_resolved'],
  properties:{ id:{type:'string'}, atomic_resolved:{type:'boolean'}, native_resolved:{type:'boolean'}, note:{type:'string'} } }
const WALLS_SCHEMA = { type:'object', additionalProperties:false, required:['id','walls'],
  properties:{ id:{type:'string'}, walls:{type:'array', items:{ type:'object', additionalProperties:false, required:['cls','evidence','fix','severity'],
    properties:{ cls:{type:'string'}, evidence:{type:'string'}, fix:{type:'string'}, severity:{type:'string',enum:['high','med','low']} } } } } }
const VERDICT_SCHEMA = { type:'object', additionalProperties:false, required:['cls','real','generalist','keep','reason'],
  properties:{ cls:{type:'string'}, real:{type:'boolean'}, generalist:{type:'boolean'}, keep:{type:'boolean'}, reason:{type:'string'} } }

// ---------- Phase: Setup ----------
function setupAgent(id) {
  const nwd = `${WFB}/${id}/native`, awd = `${WFB}/${id}/atomic`, td = `${LOOP}/tasks/SWE-${id}`
  return agent(
    `Run these EXACT bash commands in order (report failures, do not improvise):\n` +
    `cd ${LOOP} && source /tmp/.atomic_creds.sh\n` +
    `python3 swe_suite_setup.py ${id} 2>&1 | tail -2\n` +
    `rm -rf "${nwd}" "${awd}"; mkdir -p "${WFB}/${id}"\n` +
    `cp -R /private/tmp/swe/suite/${id}/pristine "${nwd}"\n` +
    `cp -R /private/tmp/swe/suite/${id}/pristine "${awd}"\n` +
    `git -C "${nwd}" reset --hard -q HEAD; git -C "${nwd}" clean -fdq\n` +
    `git -C "${awd}" reset --hard -q HEAD; git -C "${awd}" clean -fdq\n` +
    `ls "${td}/PROBLEM.md" && git -C "${awd}" rev-parse --short HEAD\n` +
    `Then return ok=true if PROBLEM.md exists and both workdirs are git checkouts. ` +
    `id="${id}", taskdir="${td}", native_wd="${nwd}", atomic_wd="${awd}".`,
    { label:`setup:${id}`, phase:'Setup', effort:'low', schema:SETUP_SCHEMA })
}

// ---------- Phase: RunArms ----------
function atomicAgent(s) {
  const out = `${LOOP}/evidence/WFB/${s.id}__atomic.json`
  return agent(
    `You orchestrate the ATOMIC arm (DeepSeek-V4-Pro CLI). Run this EXACT bash command and WAIT for it (it can take 5-12 min):\n` +
    `cd ${LOOP} && mkdir -p evidence/WFB && source /tmp/.atomic_creds.sh && export DEEPSEEK_MODEL=deepseek-v4-pro && export ATOMIC_CALL=${ACALL} && ` +
    `python3 ${ISO} --workdir "${s.atomic_wd}" --task "${s.taskdir}/PROBLEM.md" --gate NONE --out "${out}" --max-steps 60 2>&1 | tail -3\n` +
    `Then read ${out} (JSON) and report: id="${s.id}", edits=edits_applied, diff_lines, tool_calls=sum of tool_calls values, ` +
    `files=the set of files in final_diff (paths after '+++ b/'), tokens. If the run produced no JSON, return edits=0 diff_lines=0 tool_calls=0 files=[] note="run failed".`,
    { label:`atomic:${s.id}`, phase:'RunArms', schema:ATOMIC_SCHEMA })
}
function nativeAgent(s) {
  return agent(
    `You are the NATIVE baseline solver (native tools only: Read/Edit/Grep/Glob/Bash — NO atomic/MCP). Work ONLY inside ${s.native_wd} (a git checkout).\n` +
    `RULES: modify ONLY source files (never tests — hidden grader). ONE-SHOT: do NOT run the test suite. Make the minimal, correct fix, then stop.\n` +
    `1. Read ${s.taskdir}/PROBLEM.md fully.\n2. Explore with Grep/Read to locate the root cause.\n3. Make the smallest faithful source edit(s) and SAVE to disk.\n` +
    `4. Report: id="${s.id}", the files you changed, diff_lines (run \`git -C ${s.native_wd} diff HEAD --stat\`), and a one-sentence summary.`,
    { label:`native:${s.id}`, phase:'RunArms', schema:NATIVE_SCHEMA })
}

// ---------- Phase: Walls (mine the atomic arm, even in wins) ----------
function wallsAgent(ab) {
  const out = `${LOOP}/evidence/WFB/${ab.id}__atomic.json`
  return agent(
    `LAW: every atomic loss/tie/imperfect-win is a REPRESENTATION wall in the atomic agent (local_atomic_agent.py), never the model (locked DeepSeek-V4-Pro). Mine walls even when atomic WON.\n` +
    `Read ${out} — fields: reasoning_trace, messages, transcript, final_diff, tool_calls, edits_applied. This instance: atomic edits=${ab.atomic?.edits}, diff_lines=${ab.atomic?.diff_lines}, tool_calls=${ab.atomic?.tool_calls}, files=${JSON.stringify(ab.atomic?.files||[])}.\n` +
    `Find GENERALIST representation walls (NOT task-specific): wasted/redundant reads, ceremony, missing operators, perception not delivered (selector misses, truncated reads), wrong-file edits, slow paths, force-edit friction, anything that made the run slower/less direct than it should be — EVEN IF it resolved. For each wall give: cls (a CLASS-NAME-IN-KEBAB), evidence (quote the transcript step), fix (a generalist agent-layer change), severity. Return id="${ab.id}", walls (0-5; empty only if the run was genuinely flawless).`,
    { label:`walls:${ab.id}`, phase:'Walls', effort:'high', schema:WALLS_SCHEMA })
}

// ============ RUN ============
phase('Setup')
const ab = await pipeline(
  INSTANCES,
  (id) => setupAgent(id),
  async (s) => {
    if (!s || !s.ok) return null
    const [atomicR, nativeR] = await parallel([ () => atomicAgent(s), () => nativeAgent(s) ])
    return { setup:s, atomic:atomicR, native:nativeR }
  },
)
const results = ab.filter(Boolean).map(r => ({ id:r.setup.id, atomic:r.atomic, native:r.native }))
log(`A/B run done: ${results.length}/${INSTANCES.length}. ` +
    results.map(r => `${r.id}: atomic ${r.atomic?.edits}e/${r.atomic?.diff_lines}L vs native ${r.native?.diff_lines}L`).join(' | '))

// ============ WALLS + VERIFY ============
phase('Walls')
const walled = await pipeline(
  results,
  (r) => wallsAgent(r).then(w => ({ ...r, walls: w?.walls || [] })),
  async (r) => {
    if (!r.walls.length) return r
    const verdicts = await parallel(r.walls.map(w => () =>
      agent(`Adversarially verify this claimed representation wall in the atomic agent. Default to real=false if the evidence is weak or the "fix" is task-specific.\n` +
            `CLASS: ${w.cls}\nEVIDENCE: ${w.evidence}\nPROPOSED FIX: ${w.fix}\n` +
            `Decide: real (is it a genuine wall, not noise?), generalist (does the fix help ALL repos/langs, not just this task?), keep (real AND generalist). Give a one-line reason.`,
        { label:`verify:${r.id}:${w.cls}`, phase:'Verify', effort:'high', schema:VERDICT_SCHEMA })))
    const confirmed = r.walls.filter((w,i) => verdicts[i] && verdicts[i].keep)
    return { ...r, confirmed_walls: confirmed }
  },
)

// ============ SYNTHESIZE ============
phase('Synthesize')
const payload = walled.filter(Boolean).map(r => ({
  id:r.id,
  atomic:{edits:r.atomic?.edits, diff_lines:r.atomic?.diff_lines, tool_calls:r.atomic?.tool_calls, files:r.atomic?.files},
  native:{diff_lines:r.native?.diff_lines, files:r.native?.files},
  confirmed_walls:r.confirmed_walls||[],
}))
const synth = await agent(
  `Synthesize the multi-repo A/B (DeepSeek-atomic vs native-Claude, one-shot edit-economy; official Docker resolution is scored SEPARATELY and is NOT in this data). DATA:\n` +
  JSON.stringify(payload, null, 1) + `\n\n` +
  `Produce a markdown report: (1) an edit-economy scoreboard table (instance | atomic edits/diff/calls | native diff/files | edit-quality winner + why); ` +
  `(2) headline by-number findings on edit-economy and any atomic root-cause/quality edges (deeper-root fix, fewer files) — note resolution is pending separate scoring; ` +
  `(3) the de-duplicated, severity-ranked list of CONFIRMED generalist representation walls across all instances = the next demolitions, each with its generalist fix; ` +
  `(4) honest bounds (what is NOT proven without the official resolution scores). Be precise and quote numbers. This is the round's durable record.`,
  { label:'synthesize', phase:'Synthesize', effort:'high' })
return { scoreboard: payload, report: synth }
