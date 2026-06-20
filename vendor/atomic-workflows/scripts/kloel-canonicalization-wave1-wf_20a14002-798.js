export const meta = {
  name: 'kloel-canonicalization-wave1',
  description: 'Parallel deep inventory: WhatsApp dissolution, Mind unification, canonical catalogs',
  phases: [{ title: 'Map', detail: '6 parallel deep readers writing architecture artifacts' }],
}

const SUMMARY = {
  type: 'object',
  properties: {
    artifactPath: { type: 'string' },
    headline: { type: 'string' },
    counts: { type: 'string' },
    topFindings: { type: 'array', items: { type: 'string' } },
  },
  required: ['artifactPath', 'headline', 'counts', 'topFindings'],
}

const COMMON = `Repo: /Users/danielpenin/kloel (NestJS backend/, Next.js frontend/, worker/). ANOTHER agent session is committing code in parallel — you MUST NOT modify any existing file. Your ONLY write is creating your NEW artifact file under /Users/danielpenin/kloel/docs/architecture/ (create the dir if needed). Read CODE, not .md docs — derive truth from source. Be exhaustive within your scope, cite exact file paths, use tables. Write the artifact in pt-BR, engineering-grade, actionable (an agent must be able to execute migrations from it). Return ONLY the structured summary.`

const TASKS = [
  {
    key: 'whatsapp-dissolution',
    prompt: `${COMMON}
MISSÃO: plano executável da dissolução de backend/src/whatsapp (~397 arquivos) dentro de backend/src/marketing (~170 arquivos) — o Kloel é marketing omnichannel; WhatsApp é só um canal.
1. Inventarie backend/src/whatsapp: liste módulos/services/controllers/gateways/processors com responsabilidade de cada um (1 linha).
2. Inventarie backend/src/marketing igual.
3. Para CADA service/controller do whatsapp classifique: DISSOLVE (capacidade genérica de marketing/mensageria que deve viver em marketing com o WhatsApp como mero channel adapter), CHANNEL_ADAPTER (específico do protocolo WhatsApp/Meta — vira adapter sob marketing/channels/whatsapp), DELETE (obsoleto/morto/duplicado — prove não-uso citando ausência de imports), ou AMBIGUOUS.
4. Identifique famílias duplicadas entre os dois (envio de mensagem, sessão de canal, webhook parsing, templates) com paths exatos.
5. Escreva o plano de migração em fatias seguras ordenadas (re-export adapters primeiro, movimentação depois, deleção por último), com gates de validação por fatia (typecheck/testes afetados).
Artefato: /Users/danielpenin/kloel/docs/architecture/WHATSAPP_DISSOLUTION_PLAN.md`,
  },
  {
    key: 'mind-unification',
    prompt: `${COMMON}
MISSÃO: plano executável da unificação Brain+Mind+camada cognitiva → um único órgão "Kloel Mind".
1. Inventarie o Brain: entidades KloelSession/KloelMessage/KloelMemory/ChatThread/ChatMessage no prisma/schema.prisma + services em backend/src/kloel que as orquestram; eventos kloel.message.created/kloel.action.executed.
2. Inventarie o Mind: backend/src/kloel/mind (MindBelief, MindPrediction, MindPolicy, MindBanditArm, MindCase, MindGraphNode, MindGuardAudit, MindDailyReport, bandits Thompson, consolidação hebbiana, mind-commercial-graph).
3. Inventarie as outras camadas cognitivas: CIA (advisor/cognitive-health/runtime), Flows, Autopilot, Copilot, Voice, Money Machine — onde vivem, o que cada uma decide/aprende.
4. Mapeie o loop estado→percepção→decisão→ação→consequência→aprendizado: quais módulos implementam cada estágio HOJE e onde há dois módulos no mesmo estágio (duplicação cognitiva).
5. Proponha a topologia canônica Kloel Mind (um módulo, estágios explícitos), o destino de cada módulo atual (ABSORB/ADAPTER/DELETE com prova), e fatias de migração seguras com gates.
Artefato: /Users/danielpenin/kloel/docs/architecture/MIND_UNIFICATION_PLAN.md`,
  },
  {
    key: 'event-taxonomy',
    prompt: `${COMMON}
MISSÃO: taxonomia canônica de eventos do sistema inteiro.
1. Extraia TODOS os nomes de eventos emitidos/consumidos: grep por .emit(, eventEmitter, EventPattern, @OnEvent, publish(, queue names (BullMQ), strings 'kloel.', 'channel.', '.created', '.updated', 'message_', 'WA_' em backend/src, worker/, frontend/src/lib. Liste evento → emissores → consumidores (paths).
2. Agrupe por ocorrência semântica (ex.: 3 nomes diferentes para 'mensagem recebida').
3. Proponha a taxonomia canônica domínio.entidade.fato (channel.message.received, checkout.completed, payment.approved...) com tabela DE→PARA para cada nome legado.
4. Liste eventos órfãos (emitidos sem consumidor ou vice-versa) — candidatos a deleção.
Artefato: /Users/danielpenin/kloel/docs/architecture/EVENT_TAXONOMY.md`,
  },
  {
    key: 'duplication-register',
    prompt: `${COMMON}
MISSÃO: registro de duplicações semânticas P0–P3 nas famílias de maior risco.
Caçe implementações múltiplas da MESMA capacidade (código pode diferir; semântica igual):
1. Despacho de mensagem: sendMessage/sendText/dispatch/reply em backend/src + worker — toda função que envia mensagem a canal externo.
2. Normalização de telefone: normalizePhone/formatPhone/parsePhone/digitsOnly.
3. Resolução de tenant/workspace: resolveTenant/workspaceId extraction/getWorkspace em guards/middlewares/services.
4. Parsing de webhook: handlers de webhook por canal.
5. Sessão de canal: whatsappSession/waSession/connection/instance/channelSession (código + schema.prisma).
Para cada família: tabela com cada implementação (path, assinatura, quem chama), divergências de comportamento, gravidade P0(diverge em produção)/P1(inconsistência)/P2(entropia)/P3(leve), implementação canônica proposta e plano de migração curto.
Artefato: /Users/danielpenin/kloel/docs/architecture/DUPLICATION_REGISTER.md`,
  },
  {
    key: 'domains-services',
    prompt: `${COMMON}
MISSÃO: mapa canônico de domínios + catálogo de serviços.
1. Liste todos os módulos de backend/src/* (cada dir), worker/* e os clusters de frontend/src/components/* com contagem de arquivos (use find|wc) e responsabilidade real (leia os module/service principais, não adivinhe por nome).
2. Derive os domínios canônicos reais (Identity/Workspace/Channel/Conversation/Message/Campaign/Product/Checkout/Payment/Affiliate/CRM/Mind/Analytics/Billing/Infra — ajuste ao que existe) e mapeie cada dir → domínio. Marque dirs órfãos/ambíguos/legados.
3. Catálogo de serviços: para os ~30 services mais centrais (por imports), registre: nome, responsabilidade, o que NÃO deve fazer, dependências.
4. Aponte lógica de domínio vazando no lugar errado (ex.: regra comercial dentro de controller, canal dentro do Mind).
Artefatos: /Users/danielpenin/kloel/docs/architecture/CANONICAL_DOMAINS.md e /Users/danielpenin/kloel/docs/architecture/SERVICE_CATALOG.md (escreva os dois; artifactPath = o primeiro)`,
  },
  {
    key: 'vocabulary',
    prompt: `${COMMON}
MISSÃO: dicionário canônico de termos (linguagem ubíqua).
1. Conte e localize as variantes concorrentes nos códigos backend+frontend+worker+schema.prisma: Lead vs Contact vs Customer vs Client vs Prospect; whatsappSession vs waSession vs connection vs instance vs channelSession; Conversation vs Chat vs Thread vs Inbox; Campaign vs Broadcast vs Blast; Workspace vs Tenant vs Company vs Account; Product vs Offer vs Plan.
2. Para cada conceito: proponha o termo canônico (baseado em qual variante domina o schema/eventos/UI), tabela de uso permitido, termos proibidos e onde cada termo proibido vive hoje (paths com contagem).
3. Gates anti-regressão propostos: regras grep-áveis (ex.: proibido novo identifier 'waSession') prontas para virar check de CI.
Artefato: /Users/danielpenin/kloel/docs/architecture/CANONICAL_VOCABULARY.md`,
  },
]

phase('Map')
const results = await Promise.all(
  TASKS.map(t =>
    agent(t.prompt, { label: `map:${t.key}`, phase: 'Map', schema: SUMMARY })
      .then(r => ({ key: t.key, ...(r || {}) }))
      .catch(e => ({ key: t.key, error: String(e).slice(0, 200) })),
  ),
)
return results