export const meta = {
  name: 'atomic-revolutionary-verdict-refresh',
  description: 'Grounded, adversarial re-assessment of whether atomic-edit is revolutionary, against CURRENT code + prior art',
  phases: [
    { title: 'Mapear', detail: 'ground current atomic state, the 3 raise-claim checkpoints, prior-art, honest-ceiling' },
    { title: 'Julgar', detail: 'independent verdict lenses rate revolutionary?' },
    { title: 'Verificar', detail: 'adversarially refute each lens load-bearing claim' },
  ],
}

const REPO = '/Users/danielpenin/kloel'
const ATOMIC = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const PRIOR = `PRIOR VERDICT (2026-06-02, 10-agent grounded): "novel-but-not-revolutionary" (generous) down to "incremental-hardening" (skeptic).
Genuinely novel = the 5-part COMBINATION: (a) inverted byte-default requireNegativeActionProof (refuse delete/replace without proofOfIncorrectness+SHA), (b) sole-mutation-path no-bypass envelope, (c) self-extension-only under a validator lattice + monotonic security-baseline.json ratchet, (d) per-edit adversarial receipts with honest tri-valued GREEN/RED/UNJUDGED (formal-gate.ts = real bounded TLC, cites Rice, never green-by-guess), (e) a decidable verified-edit commute-mod-invariant algebra distinct from git/Darcs/Pijul/OT/CRDT/Unison/Hazel/PCC.
What BLOCKED the strong claim ("revolucionário/impossível no sentido forte"):
 1. Rice's theorem: strong-sense "correct for all computation" cannot exist; engine concedes via UNJUDGED (side-steps, not defeats).
 2. No-bypass DORMANT in practice: bypass-ledger all blockedByDenyHook:false = "watching", not "demonstrated barrier".
 3. The dramatic "22k reds -> ~10 self-collapse" existed only in a commit message; real audit was 197 reds / 86% FP, fixes rolled back.
 4. UNJUDGED->NEGATIVE (the most radical doctrine) NOT implemented; gates return green+unjudged (honest abstention, conventional safe default).
 5. Scope: TS/JS only, one private repo, zero external adopters, @model only in atomic's own fixtures.
Path to legitimately raise the claim: (1) no-bypass DEMONSTRATED not measured (blockedByDenyHook>0 or host-default); (2) gates run on real 844k LOC with FP-collapse LANDED + redset durably ~10; (3) decide UNJUDGED->NEGATIVE (implement or retire).`

const CURRENT_SIGNALS = `CURRENT SIGNALS (just measured on branch codex/kloel-production-recovery-pr-20260604, 2026-06-07):
 - Latest atomic commit a9ec942f7 "unify both engines into the canonical Kloel atomic (mine + codex)" — TWO engines were merged. Investigate what this means.
 - Gate count: 80 *.proof.mjs (was 28). Major growth.
 - Recent commits include: no-bypass rank-1/rank-3/rank-6/rank-7 fixes, type-soundness governing-tsconfig per file, type-soundness loads ambient types, lens stops lying on atomic-edit/**.
 - bypass-ledger.jsonl: 7 lines, blockedByDenyHook:true count = 0 (STILL dormant — no real block recorded).
 - This session IS host-launched: ATOMIC_HOST_SANDBOX=macos-sandbox-exec, ATOMIC_HOST_ATOMIC_ONLY=1, ATOMIC_HOST_WRITE_ROOT set, ATOMIC_HOST_AGENT=claude.
 - registry.ts still tracks 'unjudged' as "never counted as red / never red-by-guess" — UNJUDGED->NEGATIVE NOT implemented.
 - formal-gate.ts still cites Rice's theorem (lines 10, 80).
 - lens-redset-gates.json exists, ~13.5KB.`

phase('Mapear')

const GROUNDING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'findings', 'summary'],
  properties: {
    area: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'evidence', 'confidence'],
        properties: {
          claim: { type: 'string' },
          evidence: { type: 'string', description: 'file:line, command output, or URL — concrete proof' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    summary: { type: 'string', description: '3-5 sentence grounded synthesis of this area' },
  },
}

const groundingTasks = [
  {
    key: 'state',
    prompt: `You are grounding the CURRENT state of the atomic-edit engine for a "is it revolutionary?" verdict. Repo: ${REPO}. Engine dir: ${ATOMIC}.
${PRIOR}
${CURRENT_SIGNALS}
TASK: Read the actual code. Report what atomic IS NOW, concretely:
 - What did the engine UNIFICATION (commit a9ec942f7) actually do? Run \`git show --stat a9ec942f7\` and \`git log --oneline -5 a9ec942f7\`. Two engines "mine + codex" merged into "canonical Kloel atomic" — what changed structurally?
 - How many tools does the MCP expose now? (grep the server registration / tool list). How many gates in the lattice? List the gate categories.
 - What languages are covered at perception+edit+validation+security now (TS/JS/CSS/HTML/SQL/Shell)? Verify in native-bridge.ts / lang-bridge.ts / security gate APPLIES_RE.
 - Is the verified-edit ALGEBRA (commute-mod-invariant) still present and operating? Where (algebra.proof.mjs, closure-universal)?
Cite file:line and command output. Be precise about what is REAL+SHIPPED vs aspirational.`,
  },
  {
    key: 'checkpoints',
    prompt: `You are verifying the THREE checkpoints that the prior verdict said would raise the claim from "novel" to "revolutionary". Repo: ${REPO}. Engine dir: ${ATOMIC}.
${PRIOR}
${CURRENT_SIGNALS}
TASK: For EACH of the 3 checkpoints, determine the CURRENT honest state with evidence:
 CHECKPOINT 1 — Is no-bypass DEMONSTRATED (not just measured)? Read .atomic/bypass-ledger.jsonl (count blockedByDenyHook:true). Check the no-bypass rank fixes (commits e2a6d47a5, 9dff793d2, 26e226f5b, 2fecf9632) — read those diffs (\`git show <sha> --stat\`). Are PreToolUse deny hooks wired AND firing? Check .claude/settings.json hooks + scripts/mcp/atomic-edit/*hook*.mjs. Is the host launcher the DEFAULT or opt-in? Distinction: "the deny LOGIC exists and ranks are closed" vs "a real native code-edit was actually BLOCKED in a live session (blockedByDenyHook>0)".
 CHECKPOINT 2 — Did the FP-collapse LAND on the real app (not rollback)? Read .atomic/lens-redset-gates.json (how many reds now?). Check the type-soundness governing-tsconfig commit 3722b50bd and ed6070f4c, 8f2e8ab7f. Is the redset durably small (~10s) or still large? Are the gates run on the real 844k-LOC product or only on atomic's own tree? Look for evidence the FP-collapse is a committed ARTIFACT vs a commit-message claim.
 CHECKPOINT 3 — Was UNJUDGED->NEGATIVE decided? Read gates/registry.ts runGates: does unjudged still default to permissive (green+unjudged, honest abstention) or was it collapsed into NEGATIVE/RED? Search for any flag/config that inverts this.
For each checkpoint output a finding: claim = "Checkpoint N: <state>", evidence = concrete, confidence. Be brutally honest — "closed", "partially closed", or "unchanged".`,
  },
  {
    key: 'priorart',
    prompt: `You are re-surveying PRIOR ART and field convergence for a "is atomic-edit revolutionary?" verdict, as of 2026-06. Use web search/fetch.
${PRIOR}
TASK: The prior verdict found the field "converging on pieces" (Sandlock, Microsoft MXC, Agent Safehouse, Nidus arXiv 2604.05080, VeriGuard, per-action crypto receipts arXiv 2603.14332) and strong-end verified-transformation prior art (CompCert, KeY/REFINITY, Coccinelle CTL, Hazel/Hazelnut, proof-carrying code).
 - Search for ANY newer (late-2025/2026) system that packages the SAME 5-part combination: inverted byte-default (refuse-unproven), sole-mutation-path agent sandbox, self-extension-only under a proof lattice, per-edit tri-valued honest receipts, AND a verified-edit commute-mod-invariant algebra. Does any single system do ALL of it?
 - Specifically search: "agent code editing sandbox proof", "verified code transformation algebra commute invariant", "AI agent no-bypass mutation gate", "proof-carrying code edit LLM 2026", "tri-valued verification receipt agent", "self-extending agent tool proof lattice".
 - Is the COMBINATION still unattested in surveyed prior art? Which individual pieces now have strong precedent (so atomic must NOT claim novelty on them)?
Output findings with URLs as evidence. Distinguish "combination unattested" (still true / no longer true) from per-piece precedent.`,
  },
  {
    key: 'ceiling',
    prompt: `You are grounding the HONEST CEILING — what atomic-edit fundamentally CANNOT claim — for a "revolutionary?" verdict. Repo: ${REPO}. Engine dir: ${ATOMIC}.
${PRIOR}
TASK: The strong dream sentence is "tecnologia revolucionária, inédita, sem precedentes, que produz resultados impossíveis no sentido forte." Determine, from the code itself, what blocks the STRONG sense:
 - Read gates/formal-gate.ts around the Rice citation (lines ~10-12, 80-81). Does the engine ITSELF concede undecidability? Quote it. This means "correct for ALL computation" is mathematically impossible — atomic side-steps via UNJUDGED, it does not defeat Rice.
 - Read the verified-edit algebra: is the commute-mod-invariant result DECIDABLE-fragment only? (empirical commute rate, bounded). Where does it honestly abstain (unjudged closure)?
 - Is there any place atomic claims more than it proves (false-green risk)? Check the lens honesty proofs and y_certificate scope (mcp-controlled = Y_COMPLETE vs whole-host = Y_BLOCKED).
 - The deepest honest statement: atomic is byte-positive-by-construction IN THE DECIDABLE FRAGMENT, honest (UNJUDGED not faked) at the ceiling. Confirm or refute that this is exactly where it sits.
Output findings: where the strong claim is mathematically/empirically blocked, with file:line quotes. confidence each.`,
  },
]

const grounding = await parallel(
  groundingTasks.map((t) => () =>
    agent(t.prompt, { label: `ground:${t.key}`, phase: 'Mapear', schema: GROUNDING_SCHEMA })
  )
)
const groundFacts = grounding.filter(Boolean)
const groundDigest = groundFacts
  .map((g) => `### ${g.area}\n${g.summary}\n` + g.findings.map((f) => `- [${f.confidence}] ${f.claim} — ${f.evidence}`).join('\n'))
  .join('\n\n')

log(`Grounding complete: ${groundFacts.length}/4 areas. Dispatching judge panel.`)

phase('Julgar')

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'rating', 'one_line', 'load_bearing_claim', 'key_evidence', 'what_would_change_rating'],
  properties: {
    lens: { type: 'string' },
    rating: {
      type: 'string',
      enum: [
        'revolucionário-sentido-forte',
        'revolucionário-relativo',
        'novo-mas-não-revolucionário',
        'endurecimento-incremental',
        'convencional',
      ],
    },
    one_line: { type: 'string', description: 'PT-BR, one sentence verdict' },
    load_bearing_claim: { type: 'string', description: 'the single strongest claim your rating depends on — will be adversarially tested' },
    key_evidence: { type: 'array', items: { type: 'string' } },
    what_would_change_rating: { type: 'string', description: 'PT-BR, what concrete change would move the rating up or down one notch' },
  },
}

const lenses = [
  { key: 'generosa', stance: 'the MOST CHARITABLE honest reading. Give atomic every benefit of the doubt that the EVIDENCE actually supports — but you may not invent evidence or ignore the Rice ceiling. What is the highest rating the grounded facts honestly justify?' },
  { key: 'tecnica', stance: 'a systems/PL researcher judging TECHNICAL DEPTH and genuine novelty of the mechanism (the algebra, the tri-valued receipts, the no-bypass envelope, self-extension). Is the engineering deep and new, or a clever recombination of known parts?' },
  { key: 'cetica', stance: 'a hostile skeptic whose JOB is to argue atomic is NOT revolutionary — find every gap, every dormant feature, every aspirational-vs-shipped delta, every place a known system already does this. Default to the LOWEST defensible rating.' },
  { key: 'prior-art', stance: 'judge "revolutionary RELATIVE TO WHAT EXISTS" strictly. Revolutionary means the field had nothing like the COMBINATION before. Weigh atomic against CompCert, KeY, Coccinelle, Hazel, PCC, Darcs/Pijul, and the 2026 agent-sandbox systems. Is the combination genuinely without precedent?' },
]

const verdicts = await parallel(
  lenses.map((l) => () =>
    agent(
      `You are rendering a verdict on: "atomic-edit é revolucionário?" through ONE lens.
YOUR LENS (${l.key}): ${l.stance}
${PRIOR}
GROUNDED CURRENT FACTS (from 4 grounding agents that read the live code + prior art):
${groundDigest}
Rating scale (pick exactly one): revolucionário-sentido-forte (defeats the impossible) | revolucionário-relativo (the combination is genuinely unprecedented, field-shifting) | novo-mas-não-revolucionário (real novelty, but incremental/recombinant) | endurecimento-incremental (solid hardening of known ideas, little new) | convencional.
Output your verdict per the schema. load_bearing_claim must be the SINGLE strongest factual claim your rating rests on (it will be adversarially refuted next). Write one_line and what_would_change_rating in Brazilian Portuguese.`,
      { label: `judge:${l.key}`, phase: 'Julgar', schema: VERDICT_SCHEMA }
    )
  )
)
const panel = verdicts.filter(Boolean)

phase('Verificar')

const REFUTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['claim', 'survives', 'verdict_text', 'confidence'],
  properties: {
    claim: { type: 'string' },
    survives: { type: 'boolean', description: 'true if the claim holds up under refutation attempt' },
    verdict_text: { type: 'string', description: 'PT-BR: why it survives or why it falls' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
}

const refutations = await parallel(
  panel.map((v) => () =>
    agent(
      `Adversarially REFUTE this load-bearing claim behind a "${v.lens}" verdict (${v.rating}) on whether atomic-edit is revolutionary.
CLAIM TO REFUTE: "${v.load_bearing_claim}"
GROUNDED FACTS available:
${groundDigest}
Try your hardest to show the claim is FALSE, overstated, aspirational-not-shipped, or already done by prior art. Default to survives=false if you are uncertain — the claim must EARN survival. If it genuinely holds against your best attack, survives=true. Write verdict_text in Brazilian Portuguese, citing the specific evidence that defeats or confirms it.`,
      { label: `refute:${v.lens}`, phase: 'Verificar', schema: REFUTE_SCHEMA }
    )
  )
)

return {
  grounding: groundFacts,
  panel,
  refutations: refutations.filter(Boolean),
}
