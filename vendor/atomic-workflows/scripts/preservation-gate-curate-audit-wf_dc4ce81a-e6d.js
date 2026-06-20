export const meta = {
  name: 'preservation-gate-curate-audit',
  description: 'WAVE E: curate valuable gap-artifacts into the package + adversarial completeness critic → GO/NO-GO for the delete gate',
  phases: [
    { title: 'Curate', detail: '3 agents: one per value-bucket, copy KEEP into package, report drops' },
    { title: 'Critic', detail: 'adversarial completeness GO/NO-GO before irreversible deletion' },
  ],
}

const QUAR = '/Users/danielpenin/atomic-snapshot-20260619-193711'
const PKG = '/Users/danielpenin/atomic-os-swebench'
const FACTS = `
GOAL: this is the PRE-DELETION gate. The package ${PKG} is the curated unified scaffold (its own git, master).
The quarantine ${QUAR} is the BYTE-COMPLETE faithful backup of all originals (4480 files + MANIFEST.sha256) —
nothing is ever lost from it. Reconciliation found these quarantine artifacts are NOT yet in the package
(they're "gaps"); bucketed in /tmp/gaps_buckets.json. Your job: decide which gap artifacts carry UNIQUE,
IRREPLACEABLE value worth CURATING INTO THE PACKAGE (so the pushed off-machine copy has them), vs which are
scratch/regenerable/secret/redundant and stay only in the quarantine. Decide BY CLASS/PATTERN, not per-file
(buckets have 100s-1000s of files). COPY the KEEP items into the package at a sensible path (cp -p, preserve).
Quarantine paths in the buckets are relative to ${QUAR}/ (e.g. "Users/danielpenin/swebench-atomic-ab/..." lives at ${QUAR}/Users/danielpenin/swebench-atomic-ab/...; "kloel-toplevel/..." lives at ${QUAR}/kloel-toplevel/...).
HARD RULE: NEVER copy any secret — especially .kloel/config.json (LIVE DeepSeek apiKey). Skip it explicitly.
The package already contains: core/agent/ (the 655-line swe_modal_agent.py + merge_preds/solved_ids/run_pass),
data/swebench-predictions/preds-all-49of50.jsonl + v1/v2/v3, data/ids/, evidence/final-50.json + hybrid-50 + forensics/,
vendor/ledgers/ (the ATOMIC-*.md + AGENTS/ARCHITECTURE/RUNBOOK/etc from elevation-toplevel), the full unioned atomic-edit.
`

const KEEP = { type:'object', additionalProperties:false, required:['bucket','kept','dropped','unique_value','secrets_skipped'], properties:{
  bucket:{type:'string'},
  kept:{type:'array', items:{type:'object', additionalProperties:false, required:['klass','dest','count','why'], properties:{
    klass:{type:'string'}, dest:{type:'string', description:'package path copied to'}, count:{type:'integer'}, why:{type:'string'} }}},
  dropped:{type:'array', items:{type:'object', additionalProperties:false, required:['klass','count','why'], properties:{
    klass:{type:'string'}, count:{type:'integer'}, why:{type:'string', description:'why it is safe to leave only in quarantine (scratch/regenerable/redundant/secret)'} }}},
  unique_value:{type:'array', items:{type:'string'}, description:'specific artifacts of unique irreplaceable value you found (or empty)'},
  secrets_skipped:{type:'array', items:{type:'string'}},
}}

const BUCKETS = [
  { label:'toplevel-config', key:'toplevel-config', hint:'kloel/kloel-elevation top-level configs+docs. KEEP genuinely useful ones (.mcp.json server registration, AGENTS.md, atomic.agent-rules.md, ARCHITECTURE/RUNBOOK/SECURITY/TESTING.md, PLANO-DE-LIMPEZA.md, atomic-edit.protected.json) into vendor/configs/. DROP pure tooling boilerplate (.eslintrc/.prettierrc/biome/knip/cspell/markdownlint/release-please/.tmp-*-trace/HUD_LAST_REFRESH) — regenerable. package.json/tsconfig at toplevel: the atomic-edit has its own, so DROP unless unique. NEVER copy config.json.' },
  { label:'experiment-scripts', key:'swebench-experiment-scripts', hint:'swebench-atomic-ab experiment .py/.sh/.md/.txt. KEEP the value-bearing harness+debug knowledge (swebench_ab.py the A/B harness, swe_agent.py, scale_run.py, repro_dj.py, verify_dj*.py, diag_build*.py, warm_7277.py, test_registry.py, merge_preds.py if not already, and the ids-*.txt sets) into core/agent/experiments/. DROP truly trivial duplicates already in core/agent/.' },
  { label:'preds-and-other', key:'swebench-preds-artifacts', extraKeys:['other','state-data'], hint:'~1198 preds-*.jsonl/.partial/.detail + consolidated-*.json + agent-deepseek-*.json. These are SUPERSEDED intermediate prediction runs — the FINAL preds-all-49of50 + final-50.json + hybrid-50 + the v1/v2/v3 are ALREADY in the package. KEEP only any artifact representing a UNIQUE result not captured by those (e.g. a distinct eval report, the parity/on/off A/B preds). DROP the rest as superseded scratch (safe — they live in quarantine). For state-data: config.json is a SECRET — skip; convergence-results/swarm-ledgers are data → only KEEP a sample if uniquely valuable.' },
]

phase('Curate')
const curation = await parallel(BUCKETS.map(b => () =>
  agent(
    `Curate the "${b.key}" gap bucket for the pre-deletion preservation gate.\nBucket keys to process from /tmp/gaps_buckets.json: ${JSON.stringify([b.key, ...(b.extraKeys||[])])}.\nGUIDANCE: ${b.hint}\nRead /tmp/gaps_buckets.json, inspect representative files in the quarantine, decide KEEP-classes vs DROP-classes, and COPY the KEEP items into ${PKG} at sensible paths (mkdir -p as needed, cp -p). Report by class. Be decisive — quarantine is the full backup, so DROP is safe for scratch/regenerable/redundant; only KEEP genuine unique value so the pushed copy is comprehensive.\n${FACTS}`,
    { label:`curate:${b.label}`, phase:'Curate', schema:KEEP })
))

phase('Critic')
const cur = curation.filter(Boolean)
const critic = await agent(
  `Adversarial COMPLETENESS CRITIC for the pre-deletion gate. The curation agents reported:\n${JSON.stringify(cur)}\n\nThis gates an IRREVERSIBLE deletion of the user's original scattered worktrees. Verify, adversarially:\n1. Run \`cd ${PKG} && git status --porcelain | head\` and \`git add -A\` is NOT yet done — check what new files curation added.\n2. Is anything UNIQUE and IRREPLACEABLE still only in the quarantine ${QUAR} and NOT in the package after curation? Spot-check the dropped classes — try to find one genuinely-valuable artifact wrongly dropped. Pay attention to: the unioned atomic-edit value (already verified), the selfloop/coglang/formal/paper/ledgers (in vendor/), the 49/50 evidence, the experiment harness.\n3. Confirm NO secret (.kloel/config.json / live apiKey) was copied into the package (grep the package for sk-/apiKey live values).\n4. The quarantine itself is the byte-complete backup — confirm it is intact (file count vs its MANIFEST).\nGive a GO / NO-GO verdict for declaring the package a safe-to-rely-on preservation of all valuable content (so originals could be deleted, with the quarantine as on-machine net + a pending off-machine push). List any remaining gaps that must be fixed before GO.`,
  { label:'completeness-critic', phase:'Critic', schema:{ type:'object', additionalProperties:false,
    required:['verdict','curation_added','remaining_gaps','secret_clean','quarantine_intact','rationale'],
    properties:{
      verdict:{type:'string', enum:['GO','NO-GO']},
      curation_added:{type:'string', description:'what new files curation copied into the package'},
      remaining_gaps:{type:'array', items:{type:'string'}},
      secret_clean:{type:'boolean'},
      quarantine_intact:{type:'boolean'},
      rationale:{type:'string'},
    }}, effort:'high' })

return { curation: cur, critic }