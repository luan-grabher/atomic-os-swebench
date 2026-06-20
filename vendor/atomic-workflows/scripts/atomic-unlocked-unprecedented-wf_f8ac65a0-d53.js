export const meta = {
  name: 'atomic-unlocked-unprecedented',
  description: 'Generate + adversarially filter genuinely-unprecedented contributions the current atomic foundation unlocks',
  phases: [
    { title: 'Gerar', detail: 'idea generators per lens propose unprecedented contributions on the current foundation' },
    { title: 'Atacar', detail: 'adversary per candidate: already exists / Rice-blocked / actually unlocked / strong-vs-incremental' },
  ],
}

const FOUNDATION = `ATOMIC'S CURRENT FOUNDATION — REAL + COMMITTED (verified 2026-06-07, branch codex/kloel-production-recovery-pr-20260604). Build proposals ONLY on these; they exist:
 - (a) INVERTED BYTE-DEFAULT with TEETH: removing/replacing bytes is refused unless a DisproofWitness is supplied AND RE-COMPUTED against the actual removed bytes. Kinds: 'duplicate' (removed region still present in result) and 'gate-red' (a named decidable gate returns RED + readLoci). False witness refused; free-text rationale accepted but receipt honestly labels it 'asserted'/recomputed:false. (server-helpers-negative-proof.ts)
 - (e) COMMUTE-MOD-SEMANTIC-READ-SET ALGEBRA with a MACHINE-CHECKED SOUNDNESS THEOREM (Z3): commute(P1,P2) := mod1∩mod2=∅ ∧ mod2∩read1=∅ ∧ mod1∩read2=∅; proven (UNSAT-of-negation over an abstract model = ALL configs): L1/L2 BOTH gate-obligations stay DISCHARGED in the merged state (the part no OT/CRDT/Darcs/Pijul states — they only do L3 byte-confluence). read_i INCLUDES the (a) disproof readLoci ⇒ NEGATIVE obligations preserved too. FULL refinement: runtime commute() == the proven predicate on ALL 73,728 cross-file AND ALL 73,728 same-file configs (intra-file def-use coupling via per-span identifiers). Decidable fragment only. (formal/atomic-algebra/confluence_z3.py, gates/algebra.ts, gates/algebra-refinement.proof.mjs)
 - TRI-VALUED honest receipts GREEN/RED/UNJUDGED; formal-gate.ts = a real bounded TLC model-checker (certainty within the bound, UNJUDGED past it; cites Rice).
 - NEGATIVE-OBLIGATION COUPLING: a removed-byte edit's disproof readLoci are a coupling surface in the algebra (so a merge preserves the JUSTIFICATION for deletions).
 - SELF-EXTENSION under a MONOTONIC security-baseline ratchet (counts only ratchet up) + a 31-gate validator lattice that runs on every self-edit; byte-exact rollback on any fail.
 - PROOF-CHAIN LEDGER: content-addressed, append-only; each edit binds parentSha256 + afterSha256 + the gate verdict that admitted it (chainHash). engine-proof-reexec.ts = producer-untrusted Proof-Carrying Edit re-exec (RE-EXEC engine.validate over the snapshot, Merkle inclusion, per-op gateRunId, HMAC seal).
 - Z3 TOOLCHAIN now wired (pip z3-solver) — more theorems are now formalizable/checkable in-repo.
 - EXTERNAL-CORPUS harness: ran the algebra over 169,171 real edit-pairs from 3 OSS repos, 0 false-independence vs an independent oracle.

HONEST CEILING (any proposal MUST respect — violating = instant reject):
 - RICE: "correct for ALL computation" is impossible; the engine concedes it. No proposal may claim to defeat undecidability. Strong-sense-A is forbidden; the achievable strong sense is "a guarantee class no prior system gives, PROVEN over a decidable fragment, with honest UNJUDGED elsewhere."
 - no-bypass deny-hook is DORMANT live (harness condition, not code); zero external adopters; a positional/non-identifier coupling residual remains (undecidable, named).

PRIOR ART a proposal must NOT duplicate (else it is not unprecedented):
 - Nidus (arXiv 2604.05080): sole-mutation-path + self-extension monotonic lattice, 100k-LOC production, 238 proof obligations — but BINARY pass/fail, POSITIVE proof-of-correctness, Git-as-WAL (no commute algebra, no inverted default, no honest abstention).
 - Microsoft MXC/AGT: kernel-enforced OS agent sandbox (no edit semantics, no algebra).
 - SEVerA (2603.25111): white-list + binary Dafny verification on a 4-type subset.
 - CompCert / KeY / REFINITY: positive program verification (not edits, not inverted default).
 - Coccinelle: syntactic CTL transforms. Hazel/Hazelnut: typed structure editor (Agda metatheory).
 - Proof-Carrying Code (Necula): proofs for PROGRAMS, not for EDITS.
 - Darcs (Ganesh patch algebra) / Pijul (pushout) / OT / CRDT: commute over BYTES/operations, NOT modulo a semantic read-set invariant, NO proof-gating.

SEED CANDIDATES (expand, refine, ADD new ones — these are starting points, not the answer):
 A) N-way concurrent-merge confluence theorem: extend the pairwise theorem to "a set of pairwise-commuting edits is GLOBALLY confluent AND all obligations preserved" → proof-carrying CI-free multi-agent merge (the concurrentBatches coloring gets a proof, not just a heuristic).
 B) Proof-carrying REPOSITORY: every repo state reachable ONLY by a chain of edits each gate-positive OR carrying a recomputed disproof; the whole history externally replay-verifiable (proof-chain ledger + recomputed disproofs + commute, as ONE artifact).
 C) A NEGATIVE-ACTION CALCULUS: formalize the inverted byte-default as a proof theory — an edit logic where deletion REQUIRES a refutation, with a metatheorem "no correct-by-construction byte is ever removed without a valid recomputed refutation". New formal territory.
 D) Proof-carrying TRANSFERABLE edits: an edit + its proof shipped to another repo/agent and re-verified WITHOUT trust (PCC is for programs; this is for EDITS, with the commute algebra for composition).
 E) Tri-valued edit logic with a DECIDABILITY-TIGHTNESS certificate: prove UNJUDGED is emitted iff genuinely undecidable (honesty is tight, not lazy) — to whatever extent is itself decidable.`

phase('Gerar')

const GEN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'candidates'],
  properties: {
    lens: { type: 'string' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'what_it_is', 'the_unprecedented_claim', 'why_unlocked_now', 'what_it_takes', 'form'],
        properties: {
          name: { type: 'string' },
          what_it_is: { type: 'string', description: 'PT-BR, 1-2 sentences plain' },
          the_unprecedented_claim: { type: 'string', description: 'the precise new guarantee/result, and why no prior system has it' },
          why_unlocked_now: { type: 'string', description: 'which CURRENT atomic foundation piece makes this newly possible' },
          what_it_takes: { type: 'string', description: 'PT-BR: concrete work (theorem to prove / artifact to build), and the honest hardest part' },
          form: { type: 'string', enum: ['theorem', 'system/artifact', 'formal-calculus', 'benchmark', 'hybrid'] },
        },
      },
    },
  },
}

const lenses = [
  { key: 'formal-pl', focus: 'Formal PL / type theory / proof theory. Propose new THEOREMS or CALCULI the (a)+(e)+tri-valued foundation enables — e.g. a refutation-required edit logic, an N-way confluence-with-obligation-preservation theorem, a metatheory of the inverted default. Be a POPL/ICFP-grade theorist.' },
  { key: 'verification', focus: 'Program verification / proof-carrying systems. Propose contributions around proof-carrying EDITS, producer-untrusted re-verification, repository-level proof chains, extraction linking the model to the real gates. Think CompCert/seL4/PCC lineage, applied to edits.' },
  { key: 'concurrency', focus: 'Distributed systems / concurrency theory. The commute algebra is a concurrency primitive. Propose unprecedented results on CI-free verified multi-agent merge, conflict-free verified replication of EDITS (a verified analogue of CRDTs but for gated edits), global confluence, scheduling with proof.' },
  { key: 'crypto-provenance', focus: 'Cryptography / provenance / supply-chain. The proof-chain ledger + recomputed disproofs + SHA binding. Propose unprecedented artifacts: cryptographic edit-provenance that is externally replay-verifiable, tamper-evident negative-action audit, a transferable proof object. Distinguish hard from prior crypto-ledger work.' },
  { key: 'agent-safety', focus: 'AI-agent safety / verifiable agency. Propose unprecedented contributions for autonomous agents: a verifiable-agency guarantee class, an agent that can PROVE its own edits safe to a third party, a benchmark others run, controlled self-growth with a machine-checked monotonic-safety theorem. Be honest where Nidus/MXC already cover ground.' },
  { key: 'cross-domain', focus: 'Cross-domain analogy. Borrow a deep idea from another field (databases/serializability, programming-by-refutation, abstract interpretation, separation logic, category theory of patches) and propose an unprecedented atomic contribution that fuses it with the (a)+(e) foundation. Aim for genuinely new conjunctions.' },
]

const gens = (await parallel(
  lenses.map((l) => () =>
    agent(
      `You are an idea generator answering Daniel's question: "given atomic's CURRENT complete state, what MORE can we create/invent/formalize/realize that is genuinely unprecedented (strong sense, no precedent)?"
YOUR LENS: ${l.focus}
${FOUNDATION}
Propose 3-5 candidates. Each must build on a SPECIFIC current-foundation piece (why_unlocked_now), make a PRECISE unprecedented claim (not vague), respect the Rice ceiling (no defeating undecidability), and not duplicate the listed prior art. Prefer DEEP and genuinely-new over safe/incremental — but every claim must be honest. Write what_it_is / what_it_takes in Brazilian Portuguese.`,
      { label: `gen:${l.key}`, phase: 'Gerar', schema: GEN_SCHEMA }
    )
  )
)).filter(Boolean)

const candidates = []
for (const g of gens) for (const c of (g.candidates || [])) candidates.push({ ...c, lens: g.lens })
log(`Geradas ${candidates.length} candidatas de ${gens.length} lentes. Atacando cada uma.`)

phase('Atacar')

const ATK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'verdict', 'precedent_check', 'rice_check', 'unlocked_check', 'strength', 'attack', 'salvage_or_kill'],
  properties: {
    name: { type: 'string' },
    verdict: { type: 'string', enum: ['genuinely-unprecedented', 'unprecedented-with-caveat', 'incremental', 'already-exists', 'rice-blocked', 'not-actually-unlocked'] },
    precedent_check: { type: 'string', description: 'closest prior art and whether it already does this' },
    rice_check: { type: 'string', description: 'does it secretly need to defeat undecidability? decidable-fragment honest?' },
    unlocked_check: { type: 'string', description: 'is it REALLY enabled by current atomic, or does it need something we do not have?' },
    strength: { type: 'string', enum: ['foundational', 'strong', 'modest', 'weak'], description: 'honest magnitude if real' },
    attack: { type: 'string', description: 'PT-BR: the hardest argument against it' },
    salvage_or_kill: { type: 'string', description: 'PT-BR: what would make it genuinely unprecedented, or why it cannot be' },
  },
}

const attacked = await parallel(
  candidates.map((c) => () =>
    agent(
      `You are a HOSTILE expert (knows Nidus/MXC/SEVerA/CompCert/seL4/PCC/Darcs/Pijul/CRDT/POPL literature). Judge whether this proposed atomic contribution is GENUINELY unprecedented (strong sense) and actually unlocked by the current foundation.
CANDIDATE (${c.lens}): ${c.name}
WHAT: ${c.what_it_is}
UNPRECEDENTED CLAIM: ${c.the_unprecedented_claim}
WHY UNLOCKED NOW: ${c.why_unlocked_now}
WHAT IT TAKES: ${c.what_it_takes}

${FOUNDATION}

Attack hardest: does prior art ALREADY do it? Is it secretly RICE-BLOCKED (claims undecidable-for-all)? Is it ACTUALLY unlocked by current atomic or does it need something we lack? Is it strong-sense-unprecedented or just incremental recombination? Default to the LOWER verdict unless it earns higher. Be precise about the closest prior work. Write attack/salvage_or_kill in Brazilian Portuguese.`,
      { label: `atk:${c.name}`.slice(0, 48), phase: 'Atacar', schema: ATK_SCHEMA }
    )
  )
)

const byName = new Map(candidates.map((c) => [c.name, c]))
const results = attacked.filter(Boolean).map((a) => ({ ...a, candidate: byName.get(a.name) }))

return { totalCandidates: candidates.length, results }
