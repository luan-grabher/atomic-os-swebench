export const meta = {
  name: 'genesis-real-refusal-recon',
  description: 'Recon paralelo: fontes reais de recusa nos ledgers .atomic + API do substrato Movimento III',
  phases: [
    { title: 'Recon', detail: '4 leitores paralelos sobre ledgers, harness, engine e evidências' },
  ],
}

phase('Recon')

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, role: { type: 'string' }, approxLines: { type: 'number' } }, required: ['path', 'role'] } },
    refusalKinds: { type: 'array', items: { type: 'object', properties: { kind: { type: 'string' }, sourcePath: { type: 'string' }, sampleFields: { type: 'array', items: { type: 'string' } }, approxCount: { type: 'string' } }, required: ['kind', 'sourcePath'] } },
    apiSurface: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, signature: { type: 'string' }, file: { type: 'string' }, notes: { type: 'string' } }, required: ['name', 'file'] } },
    caveats: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'caveats'],
}

const COMMON = `REGRAS DURAS: trabalho 100% READ-ONLY. Use SOMENTE as ferramentas Read/Grep/Glob (NÃO use Bash — há deny-hook na sessão). NÃO modifique nenhum arquivo. Repo: /Users/danielpenin/kloel. Seu texto final é dado bruto para outro agente, não mensagem humana.`

const results = await parallel([
  () => agent(`${COMMON}
TAREFA A1 — censo de recusas REAIS nos ledgers do atomic:
1. Glob .atomic/*.jsonl e .atomic/**/*.jsonl (use hidden se preciso; o dir é /Users/danielpenin/kloel/.atomic). Liste cada arquivo com tamanho aproximado (linhas, via Read parcial).
2. Para cada ledger, leia AMOSTRAS (primeiras ~5 linhas e, se possível, algumas do fim) e identifique se contém REGISTROS DE RECUSA/NEGAÇÃO: procure campos/valores como blockedByDenyHook, refused, denial, deny, reject, rejected, proofOfIncorrectness, byte-floor, negative, "ok":false, permissionDecision, prevented. Use Grep com padrões como 'blockedByDenyHook|refused|denied|reject|proofOfIncorrectness|prevented' por arquivo (maxCount baixo) para censo.
3. Para cada KIND de recusa achado: sourcePath, campos presentes no registro (liste os nomes de campos JSON), contagem aproximada de ocorrências.
4. Caveats: ledgers gigantes que você só amostrou, campos com segredos redatados, etc.
Retorne via StructuredOutput.`, { label: 'A1:ledger-census', phase: 'Recon', schema: SCHEMA, agentType: 'Explore' }),

  () => agent(`${COMMON}
TAREFA A2 — API exata do substrato Movimento III (consumirei para gerar corpus REAL):
Leia INTEIROS: scripts/mcp/atomic-edit-evolution/disproof-corpus-harness.mjs, lesson-harness.mjs, e os proofs correspondentes (disproof-corpus.proof.mjs, lesson.proof.mjs). Extraia:
1. O SHAPE EXATO do registro DisproofWitness/corpus entry (todos os campos obrigatórios, como o sha é computado — canonicalSha256 de quê), o formato do chain (previous sha? dedup key semântica?).
2. Assinaturas exportadas: appendWitnessJsonl?, selectDisproofs (v1), funções de briefing + briefingDigest, held-out (como sha256(id+"darwin-godel-heldout-v1") top-20% é aplicado), métricas M1-M5.
3. O CONTRATO CLI (stdin JSON {archiveText} etc — NUNCA JSONL cru) — quais subcomandos existem e seus inputs/outputs exatos.
4. Como o lesson-harness/sintetizador de leis (III.d, commit c1f9a7efb) consome o corpus — shape de lesson/law.
Caveats: qualquer acoplamento com canonicalSha256 do harness do engine. Retorne via StructuredOutput.`, { label: 'A2:substrate-api', phase: 'Recon', schema: SCHEMA, agentType: 'Explore' }),

  () => agent(`${COMMON}
TAREFA A3 — onde o ENGINE registra recusas hoje (somente LEITURA do subtree scripts/mcp/atomic-edit/** — ele está sob lock de outro agente, jamais modifique):
1. Grep no subtree por escrita de ledgers de recusa: padrões 'exec-ledger|deny|refus|reject|appendFile|writeFile.*jsonl|bypass-report|negative'. Identifique CADA caminho .atomic/*.jsonl que o engine escreve e QUAL função escreve (file:line).
2. Em server-helpers-negative-proof.ts e onde requireNegativeActionProof é chamado: quando uma edição é RECUSADA por falta de proofOfIncorrectness, isso é registrado em algum ledger? Onde? Shape?
3. atomic_expand_self: quando o lattice REPROVA e faz rollback, o que é persistido (receipt de falha? em qual arquivo?). Procure por 'rolledBack|rollback|rejected' em server-tools-self.ts e helpers.
4. O deny-hook (codex-atomic-only-hook): onde grava blockedByDenyHook:true? Qual arquivo de ledger?
Retorne file:line para cada achado via StructuredOutput.`, { label: 'A3:engine-refusal-sinks', phase: 'Recon', schema: SCHEMA, agentType: 'Explore' }),

  () => agent(`${COMMON}
TAREFA A4 — estado atual do meu território de evidências:
1. Glob e liste: .atomic/evolution/** (tudo), docs/evidence/darwin-godel-* (tudo), scripts/mcp/atomic-edit-evolution/** (só listar, A2 lê o conteúdo).
2. Leia o pré-registro (docs/evidence/darwin-godel-* que contenha o pré-registro III.f) e extraia: as métricas M1-M5 EXATAS como definidas, os braços A/B/SOMBRA, a regra held-out, critérios de morte da tese.
3. Leia curves.csv / run-ledger do piloto (se em .atomic/evolution/ ou no dir de evidências) e resuma o formato das curvas.
4. Caveats: o que do pré-registro AINDA não tem artefato materializado (ex.: held-out list concreta).
Retorne via StructuredOutput.`, { label: 'A4:evidence-state', phase: 'Recon', schema: SCHEMA, agentType: 'Explore' }),
])

const [ledgers, substrate, engineSinks, evidence] = results
return { ledgers, substrate, engineSinks, evidence }