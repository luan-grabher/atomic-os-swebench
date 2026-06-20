export const meta = {
  name: 'kloel-canonicalization-wave4',
  description: 'Dep prune, Mind parity harness, persistence-owner decision brief, live product smoke',
  phases: [{ title: 'Execute', detail: '4 agents: prune, harness, brief, smoke' }],
}

const REPORT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['fixed', 'partial', 'blocked', 'wrote-artifact', 'verified'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    whatChanged: { type: 'string' },
    validation: { type: 'string' },
    risks: { type: 'string' },
  },
  required: ['status', 'filesChanged', 'whatChanged', 'validation', 'risks'],
}

const COMMON = `Repo: /Users/danielpenin/kloel. Outra sessão commita em paralelo — mudanças mínimas, só no seu escopo, NÃO commite. Valide e cole evidência (últimas linhas). Backend: jest + 'npm run typecheck'. Worker: vitest + 'npm run typecheck'. Retorne SÓ o sumário estruturado.`

const TASKS = [
  {
    key: 'dep-prune',
    prompt: `${COMMON}
MISSÃO: podar @nestjs/event-emitter do backend. Premissa verificada pelo orquestrador: zero referências a EventEmitter2/@nestjs/event-emitter em backend/src e backend/test (os matches de 'EventEmitter' são CrmEventEmitterService etc., invólucros do spine — NÃO toque neles).
1. Re-confirme: rg -n "@nestjs/event-emitter|EventEmitter2" backend/src backend/test → deve ser vazio.
2. Remova a linha de backend/package.json e rode cd backend && npm install para atualizar o lockfile do root (confira onde o lockfile vive: raiz ou backend/).
3. Valide: npm run typecheck; npm run backend:boot-smoke na raiz se existir (cheque package.json raiz) OU cd backend && npx jest src/app.controller.spec.ts como smoke mínimo.`,
  },
  {
    key: 'mind-parity-harness',
    prompt: `${COMMON}
MISSÃO: preparar o harness de paridade da fatia F0-F1 do docs/architecture/MIND_UNIFICATION_PLAN.md SEM ligar nenhuma flag em produção.
1. Leia o plano (seções F0/F1) e o código real: kloel/real-reward-signal.flag.ts, decision-outcome.service.ts (KLOEL_DECISION_LEDGER_DUALWRITE), mind/aliases/* (KLOEL_MINDMESSAGE_*).
2. Construa specs de paridade que rodem COM as flags ligadas via env de teste (jest setProcessEnv/spyOn) e provem: (a) dual-write do decision ledger grava RAC_DecisionOutcome E RAC_MindPolicy com payloads equivalentes; (b) com KLOEL_REAL_REWARD_SIGNAL on, chat_reply NÃO fecha como WIN imediato (a decisão fica pendente até sweep); (c) flags off => comportamento atual intacto (regressão zero).
3. Se já existirem specs cobrindo isso parcialmente, estenda em vez de duplicar.
4. Valide: jest direcionado dos specs novos + suites adjacentes dos services tocados + backend typecheck.
Artefato adicional: apêndice curto docs/architecture/MIND_F1_FLAGON_RUNBOOK.md (novo arquivo) com o passo-a-passo de ligar em prod: ordem das flags, métricas a observar, critério de rollback.`,
  },
  {
    key: 'persistence-owner-brief',
    prompt: `${COMMON}
MISSÃO (análise + recomendação, SEM mudar código de produção): decisão do dono único da persistência outbound (resíduo F1-B do DUPLICATION_REGISTER_SEMANTIC_2026-06-10.md — janela NULL-externalId).
1. Mapeie os dois caminhos por completo: backend inbox.saveMessageByPhone (via whatsapp-message-dispatcher) vs worker createOutboundMessageDeduped (outbound-message-dedup.ts) — quem chama cada um, que campos cada um grava, que eventos ws cada um emite, e QUANDO externalId fica NULL em cada lado (prove com código).
2. Para cada opção (A: backend dono único — worker para de persistir; B: worker dono único — dispatcher para de salvar; C: status quo + backfill de externalId), liste: arquivos a mudar, riscos, impacto em eventos do inbox em tempo real, e esforço.
3. Recomende UMA opção com justificativa de uma frase.
Artefato: docs/architecture/OUTBOUND_PERSISTENCE_OWNER_DECISION.md (novo arquivo). status='wrote-artifact'.`,
  },
  {
    key: 'product-smoke',
    prompt: `${COMMON}
MISSÃO (somente leitura/observação, nenhuma edição): smoke do produto vivo após as mesclagens da sessão paralela. Use as ferramentas chrome-devtools MCP (carregue via ToolSearch: query 'chrome-devtools').
1. http://localhost:3000 responde? Se 500, capture o erro do corpo/console e reporte.
2. Login se necessário: admin+e2e@example.com / password (form em auth.root.localhost:3000/login). Navegue a app.root.localhost:3000/chat.
3. Verifique: qual universo renderiza ([data-testid="kloel-graph-shell"] presente = Shell; ausente + labels estáticos = protótipo)? Console com erros? Envie UMA mensagem simples no chat se o composer existir e reporte se streamou (reasoning/resposta) ou falhou.
4. Reporte fatos com evidência (innerText/console extratos curtos). status='verified' ou 'blocked'.`,
  },
]

phase('Execute')
const results = await Promise.all(
  TASKS.map(t =>
    agent(t.prompt, { label: `w4:${t.key}`, phase: 'Execute', schema: REPORT })
      .then(r => ({ key: t.key, ...(r || {}) }))
      .catch(e => ({ key: t.key, status: 'blocked', error: String(e).slice(0, 200) })),
  ),
)
return results