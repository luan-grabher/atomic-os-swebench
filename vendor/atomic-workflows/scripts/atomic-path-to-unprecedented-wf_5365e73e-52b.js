export const meta = {
  name: 'atomic-path-to-unprecedented',
  description: 'Design + adversarially stress-test the concrete path to make atomic genuinely unprecedented (strong-sense-B) and reach its peak',
  phases: [
    { title: 'Definir', detail: 'honest acceptance test for "unprecedented", the achievable strong-sense, the field bar' },
    { title: 'Projetar', detail: '5 independent strategists each propose a complete path' },
    { title: 'Atacar', detail: 'adversary per strategy: prove it is still incremental / already exists / Rice-blocked' },
  ],
}

const REPO = '/Users/danielpenin/kloel'
const ATOMIC = '/Users/danielpenin/kloel/scripts/mcp/atomic-edit'

const STATE = `GROUNDED CURRENT STATE of atomic-edit (verified 2026-06-07, branch codex/kloel-production-recovery-pr-20260604, HEAD a9ec942f7, via a 12-agent grounded+adversarial run). This is FACT, do not re-derive — build on it.

WHAT ATOMIC IS NOW (real + shipped, verified running):
 - An MCP engine in ${ATOMIC}: 85 tools, 80 *.proof.mjs adversarial gates, 34 lattice gate modules. Two engines (mine + codex) were unified in a9ec942f7.
 - The 5 genuinely-novel parts, all REAL: (a) INVERTED byte-default — requireNegativeActionProof THROWS unless a >=20-char proofOfIncorrectness + SHA is supplied to delete/replace bytes (server-helpers-negative-proof.ts:49-81, wired in 12 mutation modules); (b) sole-mutation-path no-bypass envelope; (c) self-extension-only under a validator lattice + monotonic security-baseline.json ratchet (writeGates:14 etc, only ratchets up); (d) per-edit tri-valued honest GREEN/RED/UNJUDGED receipts — formal-gate.ts is a real bounded TLC model-checker, cites Rice, never green-by-guess; (e) a verified-edit COMMUTE-MOD-INVARIANT algebra (algebra.proof.mjs 18/0 over 3824 real edits / 7.3M pairs / 99.4% commute) distinct from git/Darcs/Pijul/OT/CRDT.

THE HONEST CEILING (Rice) — strong-sense-A is foreclosed BY THE ENGINE ITSELF: formal-gate.ts:80 "Rice's theorem is not defeated, only side-stepped for the finite bounded fragment." "Correct for ALL computation" is impossible; atomic side-steps via UNJUDGED. Any plan that pretends to defeat this is forbidden (the engine's own doctrine bans the lie).

STATE OF THE 3 CHECKPOINTS that separate "novel" from "unprecedented" (2026-06-07):
 1. NO-BYPASS DEMONSTRATED: STILL NOT. bypass-ledger.jsonl = 7 lines, ZERO blockedByDenyHook:true across ALL ledgers. Deny LOGIC is real (ranks 1/3/6/7 closed; proofs spawn the real hook → permissionDecision:deny), session IS host-launched, but NO real native edit was ever blocked in traffic. The 4,128 live exec-ledger refusals are atomic_exec's Y-admission barrier, NOT the PreToolUse deny-hook. Host launcher is opt-in, not default.
 2. FP-COLLAPSE ON REAL 844k LOC: PARTIALLY. The governing-tsconfig commits landed + reproduce live (backend/src/analytics → 0 reds; ~3,500 jest FPs gone), but the only COMMITTED durable redset artifact (.atomic/lens-redset-gates.json) still covers atomic's OWN tree, not the product. Real-app collapse is demonstrable-on-demand, NOT archived.
 3. UNJUDGED->NEGATIVE: IMPLEMENTED, scoped to write-admission (server-helpers-converge.ts:102 'strict' + the UNIVERSAL byte-floor server-helpers-io.ts:205-211 "Unjudged is not green approval... NOT written"). registry.ts default stays 'permissive' for read/lens paths by design. NOT collapsed globally.

THE FIELD CONVERGED (dominant new fact — this is what erodes "sem precedentes"):
 - Nidus (arXiv 2604.05080, Apr 2026): independently implements (b) sole-mutation-path ("repository contains exclusively states that have passed the active verification gate") + (c) self-extension under a monotonic lattice (Thm 2: Π0_imm ⊆ Πn), SELF-HOSTED ON 100k LOC IN PRODUCTION with 238 proof obligations. It DEMONSTRATES its gate where atomic only measures. BUT: binary pass/fail, "no room for honest abstention", positive proof-of-correctness (not inverted), Git-as-WAL (no commute algebra).
 - Microsoft MXC (Build 2026, 2026-06-02): kernel-enforced OS-level agent sandbox, OpenAI/Nvidia onboard, denied actions "structurally impossible". (b) is now mainstream commercial infra.
 - SEVerA (arXiv 2603.25111): white-list + binary Dafny verification on a 4-type subset. Not a competitor for the combination.
 => Defensible novelty has NARROWED to the PAIR (a) inverted byte-default + (e) commute-mod-invariant algebra, both still genuinely UNATTESTED in any surveyed system. The full 5-part combination is still unattested but (b)+(c) individually are no longer novel.
 - Atomic's gaps vs the field: ZERO external adopters, ZERO publications, private monorepo only, the algebra commute-rate is an EMPIRICAL band not a machine-checked theorem, the @model formal verifier verifies toy counters not the 844k-LOC product.

SEED HYPOTHESIS for the achievable strong-sense-B (a sharp target to stress-test, NOT a conclusion): the unprecedented core atomic can OWN = "(a)+(e) integrated: every repository state is reachable ONLY by a chain of edits each PROVEN-gate-positive OR carrying a SHA-bound proof-of-incorrectness, and concurrent such edits compose under a commute-mod-invariant algebra with a MACHINE-CHECKED soundness theorem (not an empirical band)." No system (Nidus/MXC/SEVerA/CompCert/KeY/Coccinelle/Hazel/PCC/Darcs/Pijul) delivers that conjunction. To EARN "sem precedentes" it must be: (i) a real theorem not a band, (ii) demonstrated at scale on a large/public corpus, (iii) published + reproducible artifact, (iv) ideally externally adopted.`

phase('Definir')

const DEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'answer', 'falsifiable_tests', 'key_points'],
  properties: {
    question: { type: 'string' },
    answer: { type: 'string', description: 'the definitional answer, grounded' },
    falsifiable_tests: {
      type: 'array',
      description: 'concrete pass/fail tests an external skeptic would accept',
      items: { type: 'string' },
    },
    key_points: { type: 'array', items: { type: 'string' } },
  },
}

const defTasks = [
  {
    key: 'acceptance',
    prompt: `Define the ACCEPTANCE TEST for "atomic-edit is genuinely unprecedented / revolutionary" that an external, hostile expert (a PL/systems researcher who knows Nidus, MXC, CompCert) would actually ACCEPT in 2026. Not marketing — a falsifiable bar. What concrete, checkable conditions, if met, would force even a skeptic to say "ok, nobody has done THIS conjunction before, and it is demonstrated, not claimed"? Consider: theorem vs empirical band, scale of demonstration, reproducible artifact, external replication/adoption, and the specific (a)+(e) pair. Output the test as falsifiable_tests.`,
  },
  {
    key: 'strong-sense',
    prompt: `Define the achievable STRONG-SENSE-B for atomic — the strongest honest claim it can EARN without violating Rice (which formal-gate.ts:80 concedes). The dream sentence is "tecnologia revolucionária, inédita, sem precedentes, que produz resultados impossíveis no sentido forte." Strong-sense-A (defeat undecidability) is forbidden. So define the precise GUARANTEE CLASS atomic can uniquely OWN and PROVE — the "strong-impossible result" reinterpreted as "a guarantee that is provably impossible for any PRIOR system's architecture to give, yet decidable+sound for atomic's." Stress-test the SEED HYPOTHESIS in the context. Is "(a)+(e) integrated with a machine-checked soundness theorem" the right core, or is there a sharper/larger unique guarantee? Output the exact sentence + falsifiable_tests for it.`,
  },
  {
    key: 'field-bar',
    prompt: `Define what the FIELD requires before calling something "unprecedented" — beyond code correctness. Nidus has a paper + 100k-LOC production self-host + 238 proof obligations; MXC has commercial backing. Atomic has zero publications, zero external adopters, a private monorepo. Use web research if useful. What is the minimal RECOGNITION/DEMONSTRATION bar (publication, open artifact, independent replication, benchmark others run, real-traffic demonstration) that converts "interesting private engine" into "field-recognized unprecedented technology"? Be concrete and ordered by leverage. Output as falsifiable_tests.`,
  },
]

const defs = (await parallel(
  defTasks.map((t) => () => agent(`${STATE}\n\nTASK: ${t.prompt}`, { label: `define:${t.key}`, phase: 'Definir', schema: DEF_SCHEMA }))
)).filter(Boolean)

const defDigest = defs
  .map((d) => `### ${d.question}\n${d.answer}\nFALSIFIABLE TESTS:\n${d.falsifiable_tests.map((t) => `  - ${t}`).join('\n')}`)
  .join('\n\n')

log(`Definição pronta (${defs.length}/3). Despachando 5 estrategistas + ataque adversarial em pipeline.`)

phase('Projetar')

const STRAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['angle', 'crossing_claim', 'thesis', 'milestones', 'hardest_risk', 'why_it_earns_the_title'],
  properties: {
    angle: { type: 'string' },
    thesis: { type: 'string', description: 'PT-BR, 2-3 sentences: the path in one breath' },
    crossing_claim: {
      type: 'string',
      description: 'the SINGLE thing this path delivers that crosses incremental->unprecedented. Will be adversarially refuted.',
    },
    milestones: {
      type: 'array',
      description: 'ordered, each with a falsifiable acceptance criterion',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'what', 'acceptance', 'effort'],
        properties: {
          name: { type: 'string' },
          what: { type: 'string', description: 'PT-BR' },
          acceptance: { type: 'string', description: 'PT-BR, falsifiable pass/fail' },
          effort: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
        },
      },
    },
    hardest_risk: { type: 'string', description: 'PT-BR: the one thing most likely to make this NOT cross the line' },
    why_it_earns_the_title: { type: 'string', description: 'PT-BR: why a skeptic would concede "sem precedentes" after this' },
  },
}

const ADV_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['crossing_claim', 'crosses_the_line', 'attack', 'salvage'],
  properties: {
    crossing_claim: { type: 'string' },
    crosses_the_line: {
      type: 'string',
      enum: ['crosses', 'crosses-with-residual', 'still-incremental', 'already-exists', 'rice-blocked'],
    },
    attack: { type: 'string', description: 'PT-BR: the hardest argument that it does NOT cross / already exists / is Rice-blocked' },
    salvage: { type: 'string', description: 'PT-BR: what would have to change for it to genuinely cross — or "nada salva" if structurally impossible' },
  },
}

const angles = [
  { key: 'teorema', focus: `FORMALIZE (a)+(e) INTO A PUBLISHED THEOREM. Turn the empirical commute band (algebra.proof.mjs) into a MACHINE-CHECKED soundness theorem (Coq/Lean/TLA+ proof that commute-mod-invariant merge preserves every gate-invariant), and the inverted-default into a formal accountability property over the edit history. Ship as an arXiv paper + open, reproducible artifact. This is the path that turns "clever band" into "proven first".` },
  { key: 'demonstrar', focus: `DEMONSTRATE AT SCALE + OVERTAKE NIDUS. Nidus demonstrates its gate on 100k LOC in production; atomic only measures. Path: make no-bypass DEMONSTRATED-IN-TRAFFIC (blockedByDenyHook>0, host launcher as DEFAULT not opt-in), run the full gate lattice on the real 844k-LOC kloel product with the redset durably collapsed ~10 and COMMITTED as a versioned artifact, and run the commute-algebra as a live merge gate on real concurrent edits. Demonstration is the currency Nidus already spent.` },
  { key: 'auge-interno', focus: `REACH THE INTERNAL PEAK (auge). Close every internal gap so the engine is flawless on its own terms: byte-floor UNJUDGED-refusal on EVERY tool path (not just writes), UNJUDGED->NEGATIVE collapsed globally where sound, 100% language coverage honestly (real grammars for css/html/sql, not JS-grammar proxy), zero stale-dist/build breakage, every gate green, the @model formal verifier applied to REAL product invariants (not toy counters). Peak = no honest auditor can find a false-green, a crash, or a silent gap anywhere.` },
  { key: 'garantia-nova', focus: `INVENT A GUARANTEE CLASS NOBODY ELSE CAN GIVE. Go beyond (a)+(e): what is the single provable property that is STRUCTURALLY impossible for Nidus (binary, no abstention, Git-WAL), MXC (kernel-deny, no edit semantics), CompCert (compile not edit-provenance) to deliver, yet decidable+sound for atomic? E.g. "full cryptographic edit-provenance: every byte in the repo traces to a chain of SHA-bound proofs, replayable and externally verifiable, where removal required a falsifiable proof-of-incorrectness." Define it sharply and make it the headline result.` },
  { key: 'campo-adocao', focus: `WIN FIELD RECOGNITION + ADOPTION. "Sem precedentes" is partly a field judgment, not just a code property. Path: open-source the engine (the atomic-os public repo already exists per memory), ship "npx atomic-os init" governance installer, publish AtomicBench (a benchmark OTHERS run comparing verifiable-agency engines), get >=1 external adopter, and get independent replication of the core theorem. Recognition is a PRECONDITION of the title — an unadopted private engine cannot be "the technology that changed how X is done".` },
]

const designed = await pipeline(
  angles,
  (a) => agent(
    `You are ONE of five independent strategists answering Daniel's question: "what do we DO to make atomic genuinely unprecedented / revolutionary in the achievable strong sense, AND reach its peak?"
${STATE}

ACCEPTANCE DEFINITIONS (from the Definir phase — your path must satisfy these to count):
${defDigest}

YOUR ASSIGNED ANGLE: ${a.focus}

Produce a COMPLETE, ORDERED path from your angle. Each milestone needs a FALSIFIABLE acceptance criterion (a skeptic could run it and get pass/fail). Be concrete and grounded in the real engine (${ATOMIC}) — cite real files/gates where relevant. crossing_claim = the SINGLE deliverable from your path that genuinely crosses "incremental hardening" -> "unprecedented" (it WILL be attacked). Do NOT claim to defeat Rice. Write thesis/milestones/risk/why in Brazilian Portuguese.`,
    { label: `strat:${a.key}`, phase: 'Projetar', schema: STRAT_SCHEMA }
  ),
  async (strat, a) => {
    const adversary = await agent(
      `You are a HOSTILE adversary. A strategist proposed this path (angle: ${a.key}) to make atomic "unprecedented". Your job: prove the crossing_claim does NOT actually cross the line.
CROSSING CLAIM: "${strat.crossing_claim}"
THESIS: ${strat.thesis}
WHY THEY SAY IT EARNS THE TITLE: ${strat.why_it_earns_the_title}

CONTEXT (facts you can use against it):
${STATE}

ACCEPTANCE BAR it must clear:
${defDigest}

Attack hardest: is it STILL just incremental hardening of known ideas? Does it ALREADY EXIST (Nidus/MXC/SEVerA/CompCert/KeY/Coccinelle/Hazel/PCC/Darcs/Pijul)? Is it secretly RICE-BLOCKED (claims more than the decidable fragment allows)? Is the "demonstration" actually reproducible/external, or just internal self-assertion? Classify with crosses_the_line. If it genuinely survives your best attack, say 'crosses' or 'crosses-with-residual' and name the residual. salvage = what would have to change. Write in Brazilian Portuguese.`,
      { label: `attack:${a.key}`, phase: 'Atacar', schema: ADV_SCHEMA }
    )
    return { angle: a.key, strat, adversary }
  }
)

const strategies = designed.filter(Boolean)

return {
  definitions: defs,
  strategies,
}
