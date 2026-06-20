export const meta = {
  name: 'atomic-estate-inventory',
  description: 'Wave 1: read-only sweep of all atomic/kloel work across the machine → unification + preservation plan for one SWE-bench scaffold',
  phases: [
    { title: 'Sweep', detail: '10 read-only Explore agents, one per region' },
    { title: 'Synthesize', detail: 'canonical map + union plan + target scaffold + preservation manifest plan' },
  ],
}

const FACTS = `
GOAL: unify EVERY piece of accumulated atomic/kloel/SWE-bench work on this machine into ONE complete, packaged,
end-to-end scaffold that runs with DeepSeek V4 Pro and is usable on SWE-bench Verified — complete enough that the
scattered originals can later be SAFELY DELETED because everything is preserved inside the one scaffold.
THIS WAVE IS READ-ONLY INVENTORY ONLY. Do NOT edit, commit, move, delete, or run anything that mutates state.
Do NOT run git commit/checkout/stash. Reading files, git status/log/diff --stat, ls, du are fine.
MEASURED GIT STATE (already scouted, don't re-derive): kloel = branch codex/unified-open-prs-20260610, 139 dirty files, ahead 15, remote danielgonzagat/Kloel.git, 12G.
kloel-elevation = branch atomic/paradigm-elevation, 519 dirty files (huge uncommitted), worktree of Kloel.git, 303M.
wg-kloelgraph = behind 443, 2 dirty (likely stale). swebench-atomic-ab = NOT a git repo, 170M, fully untracked (our SWE-bench scaffold). aider-official-submission = 3.4G, not git.
KEY CONTEXT: the SWE-bench scaffold currently in use is /Users/danielpenin/swebench-atomic-ab/swe_modal_agent.py — it uses a THIN ~10-line reimplementation of atomic (str_replace + py_compile guard named "atomic syntax guard"), NOT the full atomic MCP.
The "complete atomic" (atomic-edit MCP with proofOfIncorrectness governance, the immortal bootstrap→supervisor→impl chain, ~114 tools, the proof lattice, atomic-exec, atomic-selfloop, formal/atomic-algebra, coglang) lives in the kloel / kloel-elevation worktrees.
MEASURED PRIOR VERDICT (be honest, don't contradict without evidence): atomic = a guarantee that an edit is applicable/valid, NOT a reasoning booster; on benchmarks its score contribution is edit-applicability, not better reasoning.
`

const INV = {
  type: 'object', additionalProperties: false,
  required: ['region','what_it_is','atomic_components','unique_capabilities','uncommitted_risk','entrypoints','functional_status','duplication','must_preserve','size_note'],
  properties: {
    region: { type: 'string', description: 'the path/region inventoried' },
    what_it_is: { type: 'string', description: '2-3 sentence summary of what lives here' },
    atomic_components: { type: 'array', items: { type: 'string' }, description: 'concrete atomic pieces present (MCP server, tools, exec engine, selfloop, lattice, skill, etc.) with file paths' },
    unique_capabilities: { type: 'array', items: { type: 'string' }, description: 'capabilities here that likely DO NOT exist elsewhere (the stuff that would be LOST on delete)' },
    uncommitted_risk: { type: 'string', description: 'summary of uncommitted/untracked work here and how at-risk it is (what is dirty, is it backed by a remote branch)' },
    entrypoints: { type: 'array', items: { type: 'string' }, description: 'how you would RUN the atomic / scaffold here e2e (commands, server bootstraps, package.json scripts) with paths' },
    functional_status: { type: 'string', description: 'does it appear to actually work / build / run? evidence (lockfiles, dist, recent logs, tests)' },
    duplication: { type: 'string', description: 'what here is a duplicate/older-or-newer copy of something in another region (helps the UNION dedup)' },
    must_preserve: { type: 'array', items: { type: 'string' }, description: 'specific high-value artifacts (with paths) that MUST be captured before any deletion' },
    size_note: { type: 'string', description: 'rough size + what is heavy (artifacts/datasets/node_modules) and safely excludable from the unified package' },
  },
}

const REGIONS = [
  { label: 'kloel-mcp-atomic-edit', path: '/Users/danielpenin/kloel/scripts/mcp/atomic-edit (and kloel/scripts/mcp/*)', focus: 'THE heart: the atomic-edit MCP server, its ~114 tools, proofOfIncorrectness admission, the immortal bootstrap→supervisor→impl chain (blessed/LKG/rescue), broker/server. Map every tool and the bootstrap entrypoint.' },
  { label: 'kloel-atomic-exec-selfloop', path: '/Users/danielpenin/kloel/atomic-exec and /Users/danielpenin/kloel/scripts/atomic-selfloop', focus: 'the execution engine + the Atomic-AGI self-loop (P0-P8, invariants, emergence-report). What runs, what is proof-carrying.' },
  { label: 'kloel-formal-coglang', path: '/Users/danielpenin/kloel/formal/atomic-algebra, /Users/danielpenin/kloel/scripts/coglang, /Users/danielpenin/kloel/docs/atomic', focus: 'the formal proof lattice/algebra, the CogLang cognitive substrate, and the atomic docs. What is the canonical spec.' },
  { label: 'kloel-swebench-artifacts', path: '/Users/danielpenin/kloel/.swebench-audit, /Users/danielpenin/kloel/artifacts/atomic-swe-bench-verified, /Users/danielpenin/kloel/artifacts/atomic-edit-bench', focus: 'prior SWE-bench / atomic-edit-bench runs, predictions, audit artifacts inside kloel. What results/predictions exist that must be preserved.' },
  { label: 'kloel-root-and-dirty', path: '/Users/danielpenin/kloel (top level: package.json, build, the 139 dirty files, branch codex/unified-open-prs)', focus: 'overall repo structure, how the pieces wire together, what the 139 uncommitted files are (git status --porcelain + diff --stat, read-only), the build/deploy story.' },
  { label: 'kloel-elevation', path: '/Users/danielpenin/kloel-elevation (branch atomic/paradigm-elevation, 519 dirty files)', focus: 'this worktree has 519 uncommitted files — the paradigm-elevation mission (PART J.5 Track 1 COMPLETE). What is UNIQUE here vs kloel main, what would be lost. This is the highest uncommitted-risk region.' },
  { label: 'swebench-atomic-ab', path: '/Users/danielpenin/swebench-atomic-ab (our active SWE-bench scaffold, 170M, UNTRACKED)', focus: 'the swe_modal_agent.py loop + all preds + the harness work from 0→49/50. NONE of it is under git. Map the active scaffold and everything that must be preserved.' },
  { label: 'aider-official-submission', path: '/Users/danielpenin/aider-official-submission (3.4G, not git)', focus: 'what is this — an aider-based SWE-bench submission scaffold? Does it contain a working agent loop / submission machinery worth absorbing or is it a heavy dataset/checkout? Identify the reusable scaffold parts vs the heavy excludable data.' },
  { label: 'graph-and-skills', path: '/Users/danielpenin/wg-kloelgraph, /Users/danielpenin/.claude/skills/atomic-edit, /Users/danielpenin/.codex/skills/atomic-code-editing', focus: 'the kloelgraph (stale, behind 443) + the two DEPLOYED atomic skill variants (claude vs codex). How do the skills differ, which is newest, are they generated from kloel.' },
  { label: 'state-dirs', path: '/Users/danielpenin/.atomic, /Users/danielpenin/.kloel (has swebench-predictions), /Users/danielpenin/.config/kloel, /Users/danielpenin/Library/Application Support/Kloel', focus: 'runtime state, caches, blessed/LKG snapshots, swebench-predictions. What is durable state that must be preserved vs disposable cache.' },
]

phase('Sweep')
const inv = await parallel(REGIONS.map(r => () =>
  agent(
    `READ-ONLY inventory of this region for a unification+preservation mission.\nREGION: ${r.path}\nFOCUS: ${r.focus}\n\nProduce a precise, evidence-backed inventory. Open the key files, read package.json/scripts, check git status/log/diff --stat (READ-ONLY — never commit/checkout/stash/edit). Be concrete with file paths. The downstream goal is to fold everything valuable here into ONE unified scaffold and then safely delete the original — so be exhaustive about what is UNIQUE and MUST be preserved.\n${FACTS}`,
    { label: r.label, phase: 'Sweep', schema: INV, agentType: 'Explore' })
))

phase('Synthesize')
const plan = await agent(
  `You are the chief architect for unifying all accumulated atomic/kloel/SWE-bench work into ONE complete, packaged, end-to-end scaffold that runs with DeepSeek V4 Pro on SWE-bench — complete enough that the scattered originals can be SAFELY DELETED afterward.\n\nInventory of every region (read-only sweep):\n${JSON.stringify(inv.filter(Boolean))}\n\n${FACTS}\n\nDeliver a decision-ready plan (Brazilian Portuguese in the markdown fields). Be brutally honest and concrete:\n1. CANONICAL MAP: for each capability (atomic-edit MCP, atomic-exec, selfloop, formal lattice, coglang, the SWE-bench loop, skills), which copy is canonical/newest and which are stale duplicates — resolve divergence by UNION, never by dropping capability.\n2. TARGET SCAFFOLD ARCHITECTURE: the structure of the ONE unified package — an ACTIVE CORE (the agent loop + the COMPLETE atomic wired as its edit/exec engine + DeepSeek V4 Pro brain, e2e runnable on SWE-bench) plus VENDORED/PRESERVED modules (formal proofs, selfloop, coglang, artifacts) kept intact so nothing is lost. Give the directory layout.\n3. PRESERVATION-FIRST SAFETY: the exact order of operations so NOTHING is lost — snapshot/commit the 660+ uncommitted files and the untracked 170M scaffold BEFORE any unification; a content-hash manifest proving every source artifact is captured; deletion gated behind e2e-green + manifest-verified. Concurrent git surgery across shared Kloel worktrees is forbidden (serial only).\n4. BUILD PHASES: the next waves of agents (assemble, wire, verify) with what each does. Worktree-isolation for any parallel file mutation.\n5. HONEST SCORE NOTE: state plainly whether wiring the full atomic into the solve loop is expected to raise the SWE-bench score (per the measured verdict it is edit-applicability, not reasoning) and that the real test is the ON/OFF A/B — while affirming the unification's standalone value (single packaged model-agnostic scaffold, zero work lost).\n6. RISKS + the single most dangerous step.`,
  { label: 'unification-plan', phase: 'Synthesize', schema: {
    type: 'object', additionalProperties: false,
    required: ['headline','canonical_map_md','target_architecture_md','preservation_safety_md','build_phases_md','honest_score_note_md','risks_md'],
    properties: {
      headline: { type: 'string', description: 'one-line: what the unified scaffold is and the single biggest preservation risk to handle first' },
      canonical_map_md: { type: 'string' },
      target_architecture_md: { type: 'string' },
      preservation_safety_md: { type: 'string' },
      build_phases_md: { type: 'string' },
      honest_score_note_md: { type: 'string' },
      risks_md: { type: 'string' },
    },
  }})

return { inv, plan }