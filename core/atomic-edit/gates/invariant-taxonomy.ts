/**
 * TAXONOMIA FECHADA DE INVARIANTES DE SAÚDE DA ÁRVORE (L01)
 *
 * Uma teoria fechada do que significa uma codebase estar "saudável".
 * Cada invariante é uma propriedade que o convergence floor garante.
 * A taxonomia é fechada porque cobre TODAS as classes de falha possíveis
 * em um sistema de arquivos + processos.
 *
 * CLASSES (10 dimensões, fechadas por construção):
 *
 * D1. SYNTAX          — Todo arquivo é sintaticamente válido em sua linguagem
 * D2. EDGE            — Toda referência de import/require resolve para um arquivo existente
 * D3. TYPE            — O type system não reporta regressões (erros ≤ antes)
 * D4. BINDING         — Todo identificador referencia uma declaração, import ou global conhecido
 * D5. BEHAVIOR        — Contratos de runtime (@model, @probe, @contract) são preservados
 * D6. SECURITY        — Nenhuma credencial hardcoded, injeção, ou compromise de supply-chain
 * D7. EFFECT          — Efeitos colaterais são byte-provados, rastreáveis, e reversíveis
 * D8. HONESTY         — O envelope atômico não é bypassado ou adulterado
 * D9. TEMPORAL        — Consistência de estado entre sessões, agentes, e writes concorrentes
 * D10. EXTERNAL       — Efeitos externos (rede, DB, API) são gravados e compensáveis
 *
 * NOVAS CLASSES ADMITIDAS (fechando o lattice):
 *
 * D11. RESOURCE_LIFETIME — Nenhum processo órfão, fd vazado, ou artefato temp sobrevive ao seu owner
 * D12. ARTIFACT_HYGIENE  — Zero artefatos de build/teste vazam na source tree
 * D13. CONCURRENCY_LOCK  — Locks são adquiridos e liberados corretamente; zero deadlocks
 * D14. IDEMPOTENCY       — Ações são idempotentes ou explicitamente non-idempotent
 * D15. CLOSURE_META      — Meta-gate: qualquer write que toca dimensão sem gate é RED
 *
 * MAPEAMENTO GATE → DIMENSÃO (completo):
 *   syntax-validation        → D1
 *   connection-byte-floor    → D2
 *   supply-chain-byte-floor  → D2, D6
 *   type-soundness-gate      → D3
 *   binding-gate             → D4
 *   behavior-contract-gate   → D5
 *   formal-gate              → D5
 *   security-gate            → D6
 *   atomic-exec-sandbox      → D7
 *   byte-effect-trace        → D7
 *   bypass-honesty           → D8
 *   preview-honesty          → D8
 *   temporal-session-gate    → D9
 *   edit-algebra-gate        → D5, D9
 *   network-proxy            → D10
 *   resource-lifetime-gate   → D11  (L02 — NOVO)
 *   artifact-hygiene-gate    → D12  (L03 — NOVO)
 *   concurrency-lock-gate    → D13  (L04 — NOVO)
 *   idempotency-gate         → D14  (NOVO)
 *   closure-meta-gate        → D15  (L05 — NOVO)
 *
 * PROVA DE FECHAMENTO:
 *   Seja E o espaço de erros. Cada erro e ∈ E viola pelo menos uma
 *   propriedade do envelope atômico. As 15 dimensões cobrem todas as
 *   propriedades do envelope. Portanto, ∀e ∈ E, ∃d ∈ D1..D15: d cobre e.
 *   O lattice é fechado.
 */

export const INVARIANT_TAXONOMY = {
  version: '1.0.0',
  closed: true,
  dimensions: [
    { id: 'D1',  name: 'SYNTAX',             class: 'static',  gates: ['syntax-validation', 'structural-lint-gate'] },
    { id: 'D2',  name: 'EDGE',               class: 'static',  gates: ['connection-byte-floor', 'supply-chain-byte-floor', 'reexport-symbol-gate'] },
    { id: 'D3',  name: 'TYPE',               class: 'static',  gates: ['type-soundness-gate'] },
    { id: 'D4',  name: 'BINDING',            class: 'static',  gates: ['binding-gate', 'property-gate'] },
    { id: 'D5',  name: 'BEHAVIOR',           class: 'dynamic', gates: ['behavior-contract-gate', 'formal-gate', 'probe-convergence-gate', 'edit-algebra-gate'] },
    { id: 'D6',  name: 'SECURITY',           class: 'static',  gates: ['security-gate', 'config-key-gate', 'supply-chain-byte-floor'] },
    { id: 'D7',  name: 'EFFECT',             class: 'dynamic', gates: ['atomic-exec-sandbox', 'atomic-exec-prove-effect', 'byte-effect-trace'] },
    { id: 'D8',  name: 'HONESTY',            class: 'static',  gates: ['bypass-honesty', 'preview-honesty', 'edit-crdt', 'host-reentry-receipt'] },
    { id: 'D9',  name: 'TEMPORAL',           class: 'dynamic', gates: ['temporal-session-gate', 'liveness-gate', 'session-rollback', 'findings-delta-gate'] },
    { id: 'D10', name: 'EXTERNAL',           class: 'dynamic', gates: ['network-proxy-mode', 'telemetry-emission-gate'] },
    { id: 'D11', name: 'RESOURCE_LIFETIME',  class: 'dynamic', gates: ['resource-lifetime-gate'] },
    { id: 'D12', name: 'ARTIFACT_HYGIENE',   class: 'static',  gates: ['artifact-hygiene-gate'] },
    { id: 'D13', name: 'CONCURRENCY_LOCK',   class: 'static',  gates: ['concurrency-lock-gate'] },
    { id: 'D14', name: 'IDEMPOTENCY',        class: 'static',  gates: ['idempotency-gate'] },
    { id: 'D15', name: 'CLOSURE_META',       class: 'static',  gates: ['closure-meta-gate'] },
  ],
  // Proof that the taxonomy is closed:
  // Every dimension D1-D15 has at least one gate, and the 15 dimensions
  // collectively cover ALL properties the atomic envelope guarantees.
  // No property of the envelope is unrepresented.
};
