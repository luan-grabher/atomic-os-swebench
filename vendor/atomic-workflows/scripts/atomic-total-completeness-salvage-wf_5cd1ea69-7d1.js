export const meta = {
  name: 'atomic-total-completeness-salvage',
  description: 'Sweep EVERY remaining atomic source on the machine (100 branches + non-branch regions) and salvage all net-new into the unified package — nothing left out',
  phases: [
    { title: 'Salvage', detail: '4 strong agents: branch net-new, /tmp atomic-loop, backups+vaults, aider+sessions' },
    { title: 'Critic', detail: 'completeness GO/NO-GO — prove zero atomic left out' },
  ],
}

const PKG = '/Users/danielpenin/atomic-os-swebench'
const KLOEL = '/Users/danielpenin/kloel'
const DOCTRINE = `
MISSION: total completeness — EVERY piece of atomic work on this machine must end up inside the unified package
${PKG}. UNION, never choice: never drop capability. Salvage net-new atomic artifacts INTO the package at sensible
paths (cp -p / git show > file; mkdir -p). 
GUARDRAILS: (1) NEVER copy a live secret — especially any DeepSeek key sk-... or .kloel/config.json; grep your
salvage for sk-/apiKey/github_pat before writing. (2) READ-ONLY on all git worktrees/repos — use git show/ls-tree/
archive, NEVER checkout/commit/reset/worktree in ${KLOEL} or any worktree (they share one .git). (3) Skip
REGENERABLE runtime junk (node_modules, dist, dist-lkg, *.tsbuildinfo, V8 caches, build-temps, .pid files, raw
multi-hundred-MB trace/loop dumps) — salvage SOURCE + unique EVIDENCE/DOCS/STATE only. (4) Write only into ${PKG};
each agent works a DISJOINT destination subtree so there are no write races.
The package already contains the FULL unioned atomic-edit (core/atomic-edit, 1201 files), vendor/{selfloop,coglang,
formal-atomic-algebra,paper,ledgers,laudos,mcp-siblings,configs}, data/, evidence/. Salvage only what is genuinely
NET-NEW vs that.`

const REP = { type:'object', additionalProperties:false, required:['region','salvaged','skipped','unique_found','secrets_skipped'], properties:{
  region:{type:'string'},
  salvaged:{type:'array', items:{type:'object', additionalProperties:false, required:['what','dest','why'], properties:{ what:{type:'string'}, dest:{type:'string'}, why:{type:'string'} }}},
  skipped:{type:'array', items:{type:'object', additionalProperties:false, required:['what','why'], properties:{ what:{type:'string'}, why:{type:'string'} }}},
  unique_found:{type:'array', items:{type:'string'}, description:'genuinely net-new atomic capability/knowledge found here (or empty)'},
  secrets_skipped:{type:'array', items:{type:'string'}},
}}

phase('Salvage')
const salv = await parallel([
  () => agent(
    `Salvage the 11 net-new atomic-edit files that exist on some Kloel.git branch but are MISSING from the package. The path->branches map is in /tmp/branch_netnew.json (paths are relative to scripts/mcp/atomic-edit). For each: \`cd ${KLOEL} && git show <branch>:scripts/mcp/atomic-edit/<path>\` (read-only), inspect it. If it is genuine unique capability (e.g. move.ts engine op, the 7 language/grammar/lens gate proofs, GRAMMARS.md, atomic-exec-broker-parent-reap.proof.mjs), write it into ${PKG}/core/atomic-edit/<path> (union — these paths don't exist in the package so no overwrite). Skip junk (e.g. 'vendor/vendor', a stale ATOMIC-IMPROVEMENT-LEDGER.md already in vendor/ledgers). Pick the NEWEST branch's version if a path is on multiple branches (sort branch names, prefer higher ab-number / paradigm-elevation). Also: quickly scan a few representative branches' scripts/mcp/ for any SIBLING atomic-* server dir (atomic-swarm/sentinel/memory/dashboard/evolution) file net-new vs vendor/mcp-siblings and salvage those too.\n${DOCTRINE}`,
    { label:'salvage:branches', phase:'Salvage', schema:REP }),
  () => agent(
    `Sweep /private/tmp/atomic-loop (205M — the atomic self-loop RUNTIME, incl. worktrees r016-allin/r016-block which are detached checkouts of the kloel HEAD). Find atomic artifacts that are NET-NEW vs the package and not regenerable: unique loop EVIDENCE (emergence-report outputs, evolution-archive samples, invariant ledgers, loop run summaries, EVIDENCE.md-style proofs), unique scripts, unique self-loop state. Salvage them into ${PKG}/vendor/atomic-loop-evidence/ (sample large jsonl, don't copy raw 100MB+ dumps). Skip the r016 worktree source (it's identical to kloel HEAD already in the package) and all regenerable runtime/build junk. Report what was unique vs redundant.\n${DOCTRINE}`,
    { label:'salvage:tmp-loop', phase:'Salvage', schema:REP }),
  () => agent(
    `Sweep these for net-new atomic content: /Users/danielpenin/kloel-elevation-backup-20260619 (9.1M backup — may hold unique uncommitted elevation state), /Users/danielpenin/Obsidian-kloel-relic-2026-05-20 (+ its KLOEL subdir), and /Users/danielpenin/Documents/Obsidian Vault/Kloel (knowledge vaults — atomic design notes/specs/decisions). Diff against the package; salvage genuinely unique atomic docs/specs/state into ${PKG}/vendor/relics/ (vaults) and ${PKG}/vendor/elevation-backup-delta/ (only files in the backup that differ from / are absent in the package's elevation content). Skip duplicates already preserved. Report unique knowledge found.\n${DOCTRINE}`,
    { label:'salvage:backup-vaults', phase:'Salvage', schema:REP }),
  () => agent(
    `Two fronts. (1) Fully capture the AIDER atomic variant: /Users/danielpenin/aider-official-submission contains an aider-based atomic coder (aider/coders/atomic_coder.py + the atomic edit-format files + any modal runner). Find ALL atomic-specific files (the edit-format impl, prompts, the 225/225 polyglot proof harness if present) — NOT the whole 3.4G aider checkout — and salvage them into ${PKG}/vendor/aider-atomic/ so the aider integration is preserved completely (the prior union only vendored a 13-file diff; make it complete). (2) Salvage unique atomic WORKFLOW SCRIPTS: /Users/danielpenin/.claude/projects/*/workflows/scripts/*.js that encode atomic orchestration logic (proofOfIncorrectness etc.) and /Users/danielpenin/.gemini/antigravity-cli/brain/*/scratch atomic artifacts — copy genuinely unique ones into ${PKG}/vendor/atomic-workflows/. Skip this-session's own scripts duplicated elsewhere. Report.\n${DOCTRINE}`,
    { label:'salvage:aider-sessions', phase:'Salvage', schema:REP }),
])

phase('Critic')
const sv = salv.filter(Boolean)
const critic = await agent(
  `COMPLETENESS CRITIC for the 'nothing left out' atomic unification. Salvage agents reported:\n${JSON.stringify(sv)}\n\nVerify adversarially that NO atomic source/capability remains outside the package ${PKG}:\n1. \`cd ${PKG} && git status --porcelain\` — list what the salvage added.\n2. Re-check the branch dimension: pick 5 atomic branches at random from /tmp/atomic_branches.txt and \`cd ${KLOEL} && git ls-tree -r --name-only <branch> -- scripts/mcp/atomic-edit\` — confirm every non-regenerable path now exists in ${PKG}/core/atomic-edit/ (the salvage should have closed the 11-file gap).\n3. Machine sweep: \`grep -rIl 'proofOfIncorrectness' /Users/danielpenin --include='*.ts' --include='*.mjs'\` excluding node_modules/the package/the quarantine/kloel/kloel-elevation — are there atomic-edit instances in regions NOT yet considered? Name any.\n4. Confirm no secret (sk-/apiKey/config.json) was salvaged into the package (grep).\nGive GO (nothing atomic of value left out) or NO-GO (with the exact remaining gaps to salvage). Be exhaustive — the user's hard requirement is literally 'nada fica de fora'.`,
  { label:'completeness-critic', phase:'Critic', schema:{ type:'object', additionalProperties:false,
    required:['verdict','added','remaining_atomic_outside','secret_clean','rationale'],
    properties:{
      verdict:{type:'string', enum:['GO','NO-GO']},
      added:{type:'string'},
      remaining_atomic_outside:{type:'array', items:{type:'string'}},
      secret_clean:{type:'boolean'},
      rationale:{type:'string'},
    }}, effort:'high' })

return { salvage: sv, critic }