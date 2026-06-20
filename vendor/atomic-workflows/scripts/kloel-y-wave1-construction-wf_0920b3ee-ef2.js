export const meta = {
  name: 'kloel-Y-wave1-construction',
  description: 'Wave 1: 12 file-disjoint construction agents closing Y across loop/determinism/capability/brain-mind/omnicore/events/frontend',
  phases: [{ title: 'Wave 1 construction', detail: '12 MECE agents, atomic-edit locks, LSP self-verify, no .md, no git' }],
}

const MCP_ARSENAL = `── MCP ARSENAL (você é OBRIGADO a usar; cada um faz: ) ──
- codegraph (mcp__codegraph__*): grafo semântico do código. codegraph_search (achar símbolo), codegraph_callers/codegraph_callees (quem chama / o que chama), codegraph_impact (raio de impacto antes de mudar), codegraph_context (contexto de tarefa), codegraph_files (estrutura). USE codegraph_callers ANTES de mudar qualquer assinatura para achar TODOS os call sites.
- lsp-mesh (mcp__lsp-mesh__*): LSP real, 14 servers. lsp_definition / lsp_references (find-all-refs preciso) / lsp_hover (tipo) / lsp_rename (rename seguro cross-file) / lsp_diagnostics (erros de tipo num arquivo) / lsp_symbols. USE lsp_diagnostics DEPOIS de cada edição para garantir 0 erro de tipo no arquivo. USE lsp_references antes de renomear.
- atomic-edit (mcp__atomic-edit__*): OBRIGATÓRIO para TODA escrita. Fluxo: atomic_lock_acquire(file) → ler com code_outline/code_read_symbol (NÃO leia arquivo inteiro) → atomic_edit/atomic_replace_range/atomic_edit_symbol/atomic_rename_symbol_cross_file/atomic_add_import (sha256 + valida sintaxe + trava) → atomic_lock_release. A trava é o que evita colisão entre agentes. atomic_create_file para arquivos novos.
- postgres (mcp__postgres__*): DB read-only. pg_count (linhas), pg_table_describe (colunas), pg_query (SELECT). USE para PROVAR que sua mudança produz/lê dado real (ex.: depois de fechar o loop, conferir que a tabela passa a poder receber linhas; conferir nomes de coluna antes de query).
- cognitive-hub (mcp__cognitive-hub__*): protocol_hub_openapi (rotas NestJS), protocol_hub_asyncapi (taxonomia de eventos canônicos), protocol_hub_sarif (lint/type findings), protocol_hub_sbom (deps). Specs podem estar stale — confirme contra o código vivo.
- test-runner (mcp__test-runner__*): run_tsc/run_eslint/run_jest/affected_tests/coverage_for_module. NÃO rode tsc/eslint GLOBAL (12 agentes em paralelo = thrash). Use lsp_diagnostics no seu arquivo. Pode rodar affected_tests só nos SEUS arquivos se precisar.
- sequential-thinking (mcp__sequential-thinking__sequentialthinking): para raciocínio pesado de design antes de mexer.
- context7 (mcp__context7__*): docs oficiais (NestJS/Prisma/etc) se precisar confirmar API.
- gitnexus (mcp__gitnexus__*): grafo — MAS está 2323 commits STALE; use só p/ estrutura grosseira, valide no código vivo.
Carregue schemas via ToolSearch "select:<nome>" antes de chamar.`

const RULES = `── REGRAS DURAS (anti-falha) ──
1. PROIBIDO ler qualquer arquivo .md. Derive tudo de código + MCPs + DB.
2. PROIBIDO editar arquivo FORA do seu "ownedPaths". Se precisar mudar um arquivo-hub de outro (ex.: domain-service-resolver.ts, kloel.module.ts, schema.prisma, kloel-tool-dispatcher.ts), NÃO edite — devolva em remainingForCEO o patch exato que o CEO deve aplicar.
3. PROIBIDO tocar arquivos protegidos: CLAUDE.md, AGENTS.md, .github/**, .husky/**, backend/eslint.config.mjs, frontend/eslint.config.mjs, worker/eslint.config.mjs, scripts/ops/check-*.mjs, scripts/ops/lib/*, backend/src/lib/ai-models.ts, ops/*.json, scripts/pulse/no-hardcoded-reality-audit.ts.
4. PROIBIDO: git commit/push/restore, prisma db push, migration destrutiva, deploy, secrets, alterar contrato financeiro sem teste, mock no caminho crítico, esconder erro, fingir sucesso.
5. TODA escrita via atomic-edit com lock. Verifique com lsp_diagnostics (0 erro no arquivo) ANTES de declarar feito.
6. Workspace isolation obrigatório em toda query (filtrar por workspaceId). Prisma TIPADO (nada de prismaAny/any).
7. Preserve o contrato externo (UI/API). Mudança mínima, reversível. Não invente comportamento de negócio.
8. Se um item exigir aplicar migration/secret/deploy/arquivo protegido → marque em blockers (owner-gated), NÃO contorne.
9. Retorne SOMENTE o objeto de receipt estruturado. Seja brutalmente honesto: "implementado e validado por LSP" vs "implementado, não validado" vs "bloqueado".`

const RECEIPT = {
  type: 'object',
  required: ['wp', 'deliveredPct', 'filesChanged', 'verification'],
  properties: {
    wp: { type: 'string' },
    deliveredPct: { type: 'number', description: '0-100 da fatia de Y deste agente' },
    filesChanged: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'summary'],
        properties: { path: { type: 'string' }, summary: { type: 'string' } },
      },
    },
    symbolsAddedOrChanged: { type: 'array', items: { type: 'string' } },
    callSitesMigrated: { type: 'number' },
    verification: {
      type: 'object',
      properties: {
        lspClean: { type: 'boolean', description: 'lsp_diagnostics sem erros nos arquivos alterados' },
        dbChecked: { type: 'string', description: 'o que foi conferido via postgres' },
        notes: { type: 'string' },
      },
    },
    mcpToolsUsed: { type: 'array', items: { type: 'string' } },
    remainingForCEO: { type: 'array', items: { type: 'string' }, description: 'patches em arquivos-hub que o CEO deve aplicar + o que falta' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

// model omitido = herda Opus (tarefas cognitivamente difíceis). 'sonnet' = mecânicas.
const WPS = [
  {
    label: 'loop-bandit',
    scope: `FECHAR o elo bandit do loop cognitivo. Hoje: closeOutcome chama mindBandit.recordOutcome({arm:'engage',decisionType:'chat_reply'}) (decision-outcome.service.ts:100-117) MAS nenhum código registra os arms → prisma.mindBanditArm.update falha com P2025 silencioso → RAC_MindBanditArm=0, RAC_DecisionOutcome=0.
TAREFA: (a) garantir que os arms 'engage'/'silence' para decisionType 'chat_reply' sejam REGISTRADOS (bandit.register/ensureArms) na primeira decisão de cada workspace (idempotente), antes do recordOutcome; (b) recordOutcome deve fazer upsert do arm se ausente (não falhar com P2025); (c) garantir que closeOutcome de fato persista DecisionOutcome. Use codegraph_callers em recordOutcome, register, closeOutcome. Prove via pg_table_describe RAC_MindBanditArm + RAC_DecisionOutcome (colunas/unique key workspaceId_decisionType_arm).`,
    ownedPaths: ['backend/src/kloel/decision-outcome.service.ts', 'backend/src/kloel/mind/policy/mind-bandit.service.ts', 'backend/src/kloel/mind/policy/mind-policy.service.ts'],
  },
  {
    label: 'loop-predict-surprise',
    scope: `LIGAR os estágios predição+surpresa. Hoje: MindPredictorService.predictReply/predictConversion têm ZERO callers; MindSurpriseService.resolveBinary tem ZERO callers (chat usa math puro e nunca persiste em RAC_MindPrediction); MindBelief tem 15 linhas todas alpha=beta=1 (observeBinary nunca atualizou).
TAREFA: (a) no caminho de reply (kloel-reply-engine.decision-outcome.helpers.ts), ANTES de agir, chamar predictReply para gravar uma MindPrediction; (b) no fechamento, chamar surprise.resolveBinary (que faz findOpen+resolve+observeBinary) em vez de só computeSurprise; (c) garantir que observeBinary realmente atualize alpha/beta de MindBelief. Use codegraph_callers/callees em predictReply, resolveBinary, observeBinary. Prove o caminho com lsp_references.`,
    ownedPaths: ['backend/src/kloel/mind/inference/mind-predictor.service.ts', 'backend/src/kloel/mind/inference/mind-surprise.service.ts', 'backend/src/kloel/mind/inference/mind-belief.service.ts', 'backend/src/kloel/kloel-reply-engine.decision-outcome.helpers.ts'],
  },
  {
    label: 'loop-scheduler',
    scope: `MULTI-TENANT no loop de fundo. Hoje: MindBackgroundScheduler.executeTick hardcoded em 'ws-test-001' (mind-bg.scheduler.ts:162); registerWorkspace/deregisterWorkspace são no-op stubs. CommerceOutcomeLearnerService.maybeCloseDecision (commerce-outcome-learner.service.ts:162) abandona se event.correlationId ausente.
TAREFA: (a) registerWorkspace deve realmente enfileirar ticks por workspace (sem hardcode); executeTick deve iterar workspaces reais (query distinct workspaceId de uma fonte segura, ex.: MindWorkspaceState); (b) garantir que o correlationId/outcomeKey seja propagado para o feedback chegar ao bandit. NÃO toque mind-bandit/mind-policy (são de outro agente) — se precisar, devolva em remainingForCEO.`,
    ownedPaths: ['backend/src/kloel/mind/mind-bg.scheduler.ts', 'backend/src/kloel/mind/coordination/commerce-outcome-learner.service.ts'],
  },
  {
    label: 'determinism-router',
    scope: `ROTEADOR DETERMINÍSTICO no caminho streaming (anti-padrão proibido pelo dono). Hoje: GuestChatService.chat() (SSE) e KloelService.think() vão direto pro LLM; só chatSync()/thinkSync() passam pelo IntentRouter. O tool_call do LLM é o ÚNICO gatilho de ação no path autenticado (kloel-thinker-think.helpers.ts:261).
TAREFA: (a) em chat() e think(), chamar IntentRouter.classify ANTES do LLM; se requiresTool → planner/executor determinístico (mesma lógica de runDeterministicAction) e só usar LLM para verbalizar/conversar; (b) no path de tool_call do LLM (kloel-tool-router.executeAssistantToolCalls), aplicar a confirmação MUTATION_SENSITIVE; (c) persistir o receipt no AuditLog (DB), não só em WORLD_LEDGER.jsonl. Tornar IntentRouter NÃO-@Optional (ou assert no boot). Use codegraph_context "kloel chat streaming entrypoint".`,
    ownedPaths: ['backend/src/kloel/guest-chat.service.ts', 'backend/src/kloel/kloel.service.ts', 'backend/src/kloel/kloel-thinker-think.helpers.ts', 'backend/src/kloel/kloel-tool-router.ts', 'backend/src/kloel/operation-receipt.helpers.ts'],
  },
  {
    label: 'capability-services-new',
    scope: `CRIAR os serviços de domínio AUSENTES que 30 capabilities referenciam (hoje retornam 'unknown_service'): ThemeService.set, AIConfigService.update + ProductAIConfigService.get, NpsService.get, ChurnService.get, AbandonmentService.list, RefundService.list, ReviewService.listForProduct(+approve/reply/delete), SubscriptionService.list/update, ShippingService.configure, MessagingService.sendWhatsApp/sendAudio/sendDocument/sendVoiceNote, BrandService.setVoice, ChannelService.list/connect/send, LeadService.get, DocumentService.upload, SessionService.search, SearchService.web. Para CADA um: criar arquivo NOVO em backend/src/kloel/services-v2/<nome>.service.ts, @Injectable, método com assinatura (workspaceId, args), Prisma TIPADO + workspace isolation, REUTILIZANDO serviços de domínio existentes quando houver (ex.: ReviewService deve chamar o ProductReview real; MessagingService deve usar ChannelMessageDispatchService — confirme via codegraph_search se já existe lógica). NÃO duplicar regra que já existe — embrulhar o serviço de domínio existente. AudioService JÁ EXISTE (backend/src/kloel/audio.service.ts) — não recrie, só liste em remainingForCEO para registro. Devolva em remainingForCEO o mapa exato {nome→classe→arquivo} para o CEO registrar no SERVICE_TOKEN_MAP + providers.`,
    ownedPaths: ['backend/src/kloel/services-v2/'],
    model: 'sonnet',
  },
  {
    label: 'capability-map-fix',
    scope: `CORRIGIR o mapa de capabilities (NÃO toque o resolver nem o module — outro agente). Em backend/src/kloel/capability-registry-v2/partitions/*: (a) renomear/realinhar tier-8 para incluir Marketplace corretamente OU mover marketplace.* para um tier-8 dedicado (decida e documente no receipt); (b) adicionar capability canônica coupons.update (CouponService.update existe) e coupons.list; (c) adicionar mutations de reviews (products.review_* → ReviewService) e IA por produto (products.set_ai_config → ProductAIConfigService) e campanhas (products.link_campaign → CampaignService); (d) marcar os 109 IDs legacy snake_case com maturity:'deprecated' (o campo existe em capability-registry-v2.types.ts) apontando para o ID canônico equivalente. Use code_outline nas partitions.`,
    ownedPaths: ['backend/src/kloel/capability-registry-v2/partitions/'],
    model: 'sonnet',
  },
  {
    label: 'domain-purity-dispatch',
    scope: `INVERTER o despacho + matar prisma-direto (anti-padrão 2.2). Hoje kloel-tool-dispatcher.service.ts:134-153 roda runDirectDispatch (executores prisma-direto) ANTES; DomainServiceResolver.tryExecute só é fallback. 13 executores tocam prisma cru (118 hits).
TAREFA: (a) inverter ordem: tentar DomainServiceResolver.tryExecute PRIMEIRO; fast-path só p/ o que o resolver não cobre; (b) migrar os executores prisma-direto para chamar os serviços de domínio (CrmService, CheckoutService, WorkspaceService, BillingService, SalesService) — use codegraph_search p/ achar os métodos certos. Onde o serviço de domínio não existir ainda, deixe o prisma-direto MAS marque em remainingForCEO (o agente capability-services-new pode estar criando). NÃO edite domain-service-resolver SERVICE_TOKEN_MAP nem kloel.module (devolva requests).`,
    ownedPaths: ['backend/src/kloel/kloel-tool-dispatcher.service.ts', 'backend/src/kloel/kloel-tool-dispatcher.fast-path.helpers.ts', 'backend/src/kloel/kloel-tool-executor-crm.service.ts', 'backend/src/kloel/kloel-business-config-tools.service.ts', 'backend/src/kloel/kloel-product-sub-resource-tools.service.ts', 'backend/src/kloel/kloel-chat-checkout.tool.ts', 'backend/src/kloel/kloel-wallet-sales-tools.service.ts', 'backend/src/kloel/mind/coordination/mind-capability-executor.service.ts'],
  },
  {
    label: 'brainmind-memory',
    scope: `MIGRAR os 141 call sites prisma.kloelMemory para o alias canônico MindMemoryItemService (backend/src/kloel/mind/aliases/mind-memory-item.service.ts), começando pelos de maior concentração: agent-runtime/, memory-management.service.ts, memory-crud.service.ts, dashboard.service.ts. Use codegraph_callers + grep p/ achar TODOS. Onde o alias não tiver o método, adicione-o no alias (envolvendo prisma.kloelMemory por enquanto — a migration canônica é owner-gated). NÃO aplique migration, NÃO edite schema.prisma. Também: canonizar os 8 eventos snake_case (turn_start/memory_write/etc) que vivem em agent-runtime.memory-manager.ts + kloel-chat-tools.agent-runtime.helpers.ts para nomes dot-namespaced (estes arquivos são SEUS). Prove com pg_count RAC_KloelMemory (174) que o caminho continua íntegro.`,
    ownedPaths: ['backend/src/kloel/agent-runtime/', 'backend/src/kloel/memory-management.service.ts', 'backend/src/kloel/memory-crud.service.ts', 'backend/src/kloel/mind/aliases/', 'backend/src/dashboard/dashboard.service.ts', 'backend/src/kloel/kloel-chat-tools.agent-runtime.helpers.ts'],
  },
  {
    label: 'brainmind-cleanup',
    scope: `LIMPAR entropia cognitiva. (a) Apagar os 5 stubs sentinela em backend/src/cia/ top-level (o CIA real vive em backend/src/kloel/mind/cia/) — confirme via codegraph que nada de produção importa de backend/src/cia/* exceto re-exports; se algo importar, redirecione o import para kloel/mind/cia. (b) Resolver a duplicata kloel/healthymoney/ (3 files) vs kloel/healthy-money/ (11 files) — confirme qual é canônico por callers, migre imports, apague o legado. (c) Desligar callers de KloelGlobalPrior (2 non-spec) migrando-os para MindGlobalPrior (NÃO apague o model do schema — owner-gated; só pare de usar). Use codegraph_callers em cada classe antes de apagar. NUNCA apague sem prova de não-uso.`,
    ownedPaths: ['backend/src/cia/', 'backend/src/kloel/healthymoney/', 'backend/src/kloel/healthy-money/', 'backend/src/kloel/kloel-global-prior.service.ts', 'backend/src/kloel/kloel-decision-outcome.service.ts'],
    model: 'sonnet',
  },
  {
    label: 'omnicore-registry',
    scope: `UNIFICAR omnichannel. Hoje DOIS registries paralelos: ChannelDispatchRegistry (common/channel-dispatch) e ChannelTransportRegistry (kloel/channel-transport.registry.ts). TikTok fora do enum ChannelKind (channel-dispatch.port.ts) e sem adapter. TRÊS ChannelKind competindo (port enum, kloel/channel/types union, inbox/omnichannel.helpers uppercase).
TAREFA: (a) eleger ChannelDispatchRegistry+ChannelMessageDispatchService como canônico; migrar os callers de ChannelTransportRegistry (kloel-tool-executor-whatsapp, unified-agent-actions-messaging, kloel-tool-dispatcher) para ele e deprecar o transport registry; (b) adicionar ChannelKind.TIKTOK no enum + TikTokDispatchAdapter implementando ChannelDispatchPort + registrar no MarketingChannelsModule; (c) unificar os 3 ChannelKind num único exportado de channel-dispatch.port.ts; (d) adicionar sendMessage(input):Promise<ChannelSendResult> ao ChannelDispatchPort e fazer os 14 senders implementarem; (e) migrar billing-checkout-helper dynamic-import(WhatsappService) para ChannelMessageDispatchService. CUIDADO: kloel-tool-dispatcher.service.ts é de OUTRO agente — só devolva o patch em remainingForCEO.`,
    ownedPaths: ['backend/src/common/channel-dispatch/', 'backend/src/kloel/channel-transport.registry.ts', 'backend/src/kloel/channel/', 'backend/src/marketing/channels/', 'backend/src/marketing/channel-message-dispatch.service.ts', 'backend/src/inbox/omnichannel.service.ts', 'backend/src/inbox/omnichannel.helpers.ts', 'backend/src/billing/billing-checkout-helper.service.ts'],
  },
  {
    label: 'event-taxonomy',
    scope: `CANONIZAR eventos. (a) 15 eventos legacy de 2 segmentos (product.updated×22, message.received×15, plan.updated×15, product.created×14, sale.created×11, product.published, product.deleted, coupon.created, inbound.received, concept.detected, pipeline.*, plan.deleted, lead.created, campaign.scheduled) → nome canônico com domínio (commerce.product.updated, channel.message.received, etc) seguindo a taxonomia do protocol_hub_asyncapi; estender MIND_EVENT_ALIASES (mind-event-taxonomy.ts) e o dual-emit (event-taxonomy.canonical-aliases.ts) e WIRE o dual-emit nos emitters; (b) 4 wrong-domain 3-seg (checkout.session.completed em webhooks/payment-webhook-stripe.*, agent.job.due, pipeline.state.changed, identity.contact.resolved) → prefixo de domínio correto, ATOMICAMENTE (são usados como WHERE filter — não quebre a fila). Use protocol_hub_asyncapi para os nomes canônicos. NÃO toque agent-runtime/ nem inbox/omnichannel (outros agentes).`,
    ownedPaths: ['backend/src/products/', 'backend/src/plans/', 'backend/src/webhooks/payment-webhook-stripe.handlers2.ts', 'backend/src/webhooks/payment-webhook-stripe.handlers2.helpers.ts', 'backend/src/admin/pipeline/admin-pipeline.service.ts', 'backend/src/kloel/mind/coordination/mind-event-taxonomy.ts', 'backend/src/kloel/mind/coordination/mind-event-spine.service.ts', 'backend/src/kloel/event-taxonomy.canonical-aliases.ts', 'backend/src/kloel/checkout-event-emitter/', 'backend/src/kloel/campaign-emitter/', 'backend/src/kloel/crm-emitter/', 'backend/src/kloel/post-sale-emitter/'],
    model: 'sonnet',
  },
  {
    label: 'frontend-polish',
    scope: `HONESTIDADE do chat frontend (backend intacto). (a) onboarding-chat (frontend/src/app/(public)/onboarding-chat/onboarding-chat.hooks.ts) — mensagens só em useState; persistir via backend thread OU mostrar empty-state honesto no reload (não perder contexto em silêncio); mover kloel_onboarding_role do localStorage p/ sessão backend OU comentar como pref intencional. (b) kloel-conversations.ts:159 — o idle-timeout de 45s começa ANTES do 1º byte; começar só após headers/primeiro chunk (ou 90s p/ first-byte, 45s entre chunks). (c) chat-container.agent-stream.ts:54-91 — chamar onDisconnected() no fim limpo do stream (done=true), não só no catch. (d) KloelDashboardView.tsx:155 — adicionar 'audio/x-m4a' ao accept. Use lsp_diagnostics no frontend workspace (typescript@frontend).`,
    ownedPaths: ['frontend/src/'],
    model: 'sonnet',
  },
]

const results = await parallel(
  WPS.map((wp) => () => {
    const prompt = `Você é um engenheiro sênior PI executando UMA fatia de Y (o delta para o Kloel virar organismo cognitivo canônico pronto em produção). Você reporta a um CEO (Claude Opus) que vai LER, TESTAR e COMPLETAR seu código — entregue o máximo correto e honesto.

${MCP_ARSENAL}

${RULES}

── SUA FATIA: ${wp.label} ──
${wp.scope}

── SEUS ARQUIVOS (ownedPaths — só edite DENTRO destes) ──
${wp.ownedPaths.join('\n')}

Execute agora: codegraph/lsp para mapear → atomic-edit (lock) para escrever → lsp_diagnostics para validar → postgres para provar dado quando aplicável. Retorne o receipt estruturado.`
    return agent(prompt, {
      label: wp.label,
      phase: 'Wave 1 construction',
      schema: RECEIPT,
      ...(wp.model ? { model: wp.model } : {}),
    }).then((r) => ({ ...r, _label: wp.label }))
  })
)

return results.filter(Boolean)
