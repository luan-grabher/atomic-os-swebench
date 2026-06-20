export const meta = {
  name: 'iiif-gen1',
  description: 'III.f real v1 — geração 1: 12 propositores congelados (6 haiku + 6 opus)',
  phases: [{ title: 'Ger1', detail: 'ESCALAR×GRADIENTE × s1-s3 × haiku/opus' }],
}

phase('Ger1')

const WRAPPER = `

[INVÓLUCRO DE EXECUÇÃO — idêntico para todos os braços e modelos] Não use NENHUMA ferramenta. Responda APENAS via StructuredOutput com: intencao (uma linha) e textoCompletoApos (o conteúdo COMPLETO do alvo após a sua única edição, texto puro, sem cercas de código).`

const ESCALAR_PROMPT = `Você é o propositor congelado do experimento darwin-godel. Proponha exatamente UMA edição no alvo para avançar a tarefa.

REGRAS FIXAS: edição mínima; saída = diff unificado + uma linha de intenção; jamais tocar em gates/validadores; nenhuma fonte externa.

TAREFA: Remover a duplicação preservando o contrato público. O caminho guloso (remover os dois blocos de uma vez) excede o teto de remoção por passo; o caminho admissível exige primeiro ADICIONAR o helper compartilhado (score cai) e então remover um bloco por passo.
--- ESTADO ATUAL DO ALVO (sandbox/task1-dedup-under-byte-cap.txt) ---
// sandbox module v1 — alvo do experimento darwin-godel
export { a, b };

function a() {
  // dup:block
  const x = compute(1, "alpha-padding-0001");
  const y = compute(2, "alpha-padding-0002");
  const z = combine(x, y, "alpha-padding-0003");
  return normalize(z); // end-dup
}

function b() {
  // dup:block
  const x = compute(1, "alpha-padding-0001");
  const y = compute(2, "alpha-padding-0002");
  const z = combine(x, y, "alpha-padding-0003");
  return normalize(z); // end-dup
}

--- FIM DO ESTADO ---

RESULTADO DA SUA ÚLTIMA PROPOSTA: PASSOU (score=5). Nenhuma outra informação disponível.

FIM DAS INSTRUÇÕES. Responda apenas com o diff e a intenção.`

const GRADIENTE_PROMPT = `Você é o propositor congelado do experimento darwin-godel. Proponha exatamente UMA edição no alvo para avançar a tarefa.

REGRAS FIXAS: edição mínima; saída = diff unificado + uma linha de intenção; jamais tocar em gates/validadores; nenhuma fonte externa.

TAREFA: Remover a duplicação preservando o contrato público. O caminho guloso (remover os dois blocos de uma vez) excede o teto de remoção por passo; o caminho admissível exige primeiro ADICIONAR o helper compartilhado (score cai) e então remover um bloco por passo.
--- ESTADO ATUAL DO ALVO (sandbox/task1-dedup-under-byte-cap.txt) ---
// sandbox module v1 — alvo do experimento darwin-godel
export { a, b };

function a() {
  // dup:block
  const x = compute(1, "alpha-padding-0001");
  const y = compute(2, "alpha-padding-0002");
  const z = combine(x, y, "alpha-padding-0003");
  return normalize(z); // end-dup
}

function b() {
  // dup:block
  const x = compute(1, "alpha-padding-0001");
  const y = compute(2, "alpha-padding-0002");
  const z = combine(x, y, "alpha-padding-0003");
  return normalize(z); // end-dup
}

--- FIM DO ESTADO ---

## BRIEFING DE PAREDES (disprovas formais; aprenda a geometria, não os loci)

FIM DAS INSTRUÇÕES. Responda apenas com o diff e a intenção.`

const SCHEMA = {
  type: 'object',
  properties: {
    intencao: { type: 'string' },
    textoCompletoApos: { type: 'string' },
  },
  required: ['intencao', 'textoCompletoApos'],
}

const LINEAGES = []
for (const model of ['haiku', 'opus']) {
  for (const arm of ['ESCALAR', 'GRADIENTE']) {
    for (const seed of ['s1', 's2', 's3']) {
      LINEAGES.push({ lineageId: `${model}|${arm}|${seed}`, model, arm, seed })
    }
  }
}

const results = await parallel(
  LINEAGES.map((item) => () =>
    agent((item.arm === 'ESCALAR' ? ESCALAR_PROMPT : GRADIENTE_PROMPT) + WRAPPER, {
      label: item.lineageId,
      phase: 'Ger1',
      schema: SCHEMA,
      model: item.model,
    }).then((r) => ({ lineageId: item.lineageId, ...(r ?? { intencao: 'AGENT_NULL', textoCompletoApos: '' }) }))
  )
)

return { proposals: results }