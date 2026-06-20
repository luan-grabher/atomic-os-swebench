export const meta = {
  name: 'kloel-Y-wave2-construction',
  description: 'Wave 2: 8 file-disjoint agents — activate cognitive loop in reply path, finish memory/channel/policy/event/purity migrations, prove capabilities, raise coverage',
  phases: [{ title: 'Wave 2 construction', detail: '8 MECE agents building on Wave-1 green tree' }],
}

const MCP_ARSENAL = `── MCP ARSENAL (OBRIGATÓRIO usar) ──
codegraph (mcp__codegraph__*): codegraph_callers/callees (achar TODOS os call sites ANTES de mudar assinatura), codegraph_search, codegraph_context, codegraph_impact. CRÍTICO: depois de ligar um produtor, use codegraph_callers para PROVAR que ele saiu de 0 callers.
lsp-mesh (mcp__lsp-mesh__*): lsp_references (find-all-refs), lsp_definition, lsp_diagnostics (0 erro no arquivo APÓS editar), lsp_rename (rename seguro).
atomic-edit (mcp__atomic-edit__*): OBRIGATÓRIO p/ TODA escrita — atomic_lock_acquire → code_outline/code_read_symbol (não leia arquivo inteiro) → atomic_edit/atomic_edit_symbol/atomic_add_import/atomic_replace_range → atomic_lock_release. Lock = anti-colisão entre agentes.
postgres (mcp__postgres__*): pg_count/pg_table_describe/pg_query — PROVE que sua mudança produz/lê dado real (read-only).
cognitive-hub (mcp__cognitive-hub__*): protocol_hub_asyncapi (nomes canônicos de evento), openapi, sarif, sbom.
test-runner (mcp__test-runner__*): NÃO rode tsc/eslint GLOBAL (8 agentes em paralelo = thrash). Use lsp_diagnostics. Pode rodar run_jest só nos SEUS specs.
sequential-thinking, context7 (docs NestJS/Prisma). gitnexus está 2323 STALE — só estrutura grosseira.
Carregue schemas via ToolSearch "select:<nome>".`

const RULES = `── REGRAS DURAS (anti-falha) ──
1. PROIBIDO ler .md. 2. PROIBIDO editar fora do seu ownedPaths — patches em arquivos-hub (kloel.module.ts, kloel-tool-dispatcher.service.ts, domain-service-resolver.service.ts, schema.prisma, capability-registry-v2.const.ts) voltam em remainingForCEO. 3. PROIBIDO arquivos protegidos (CLAUDE.md, AGENTS.md, .github/**, .husky/**, *eslint.config.mjs, scripts/ops/check-*, backend/src/lib/ai-models.ts, scripts/pulse/no-hardcoded-reality-audit.ts). 4. PROIBIDO git, prisma db push, migration destrutiva, deploy, secrets, mock no caminho crítico, fingir sucesso, esconder erro. 5. TODA escrita via atomic-edit+lock; verifique lsp_diagnostics=0 antes de declarar feito. 6. Workspace isolation + Prisma tipado (sem any/prismaAny). 7. Mudança mínima, preserve contrato externo, NÃO invente negócio. 8. Spec ripple: se mudar constructor, atualize os specs correspondentes (estão no seu ownedPaths ou devolva patch). 9. Retorne SÓ o receipt. Honesto: "validado por LSP/jest" vs "implementado não validado" vs "bloqueado".`

const RECEIPT = {
  type: 'object',
  required: ['wp', 'deliveredPct', 'filesChanged', 'verification'],
  properties: {
    wp: { type: 'string' },
    deliveredPct: { type: 'number' },
    filesChanged: { type: 'array', items: { type: 'object', required: ['path', 'summary'], properties: { path: { type: 'string' }, summary: { type: 'string' } } } },
    symbolsAddedOrChanged: { type: 'array', items: { type: 'string' } },
    callSitesMigrated: { type: 'number' },
    proof: { type: 'string', description: 'codegraph_callers/pg/jest evidence that the change is LIVE (e.g. predictReply 0->N callers)' },
    verification: { type: 'object', properties: { lspClean: { type: 'boolean' }, jest: { type: 'string' }, notes: { type: 'string' } } },
    mcpToolsUsed: { type: 'array', items: { type: 'string' } },
    remainingForCEO: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

const WPS = [
  {
    label: 'w2-loop-replypath',
    scope: `ATIVAR O LOOP COGNITIVO no caminho de chat REAL (Wave 1 montou os helpers mas não ligou). Aplique EXATAMENTE:
(A) kloel-reply-engine.service.ts: injete \`@Optional() private readonly mindPredictor?: MindPredictorService\` (import de './mind/inference/mind-predictor.service'; JÁ é provider no kloel.module) no FIM do constructor (sem deslocar args existentes). 
(B) buildAssistantReplyImpl (kloel-reply-engine.helpers.ts): logo APÓS o recordChatReplyDecision, chame \`predictChatReply(<predictor>, logger, { workspaceId, surface:'dashboard' })\` (import de './kloel-reply-engine.decision-outcome.helpers'). Threade o mindPredictor do service até o impl via o objeto de params/deps que o impl recebe.
(C) kloel-reply-engine.degraded-path.helper.ts: adicione \`readonly mindPredictorService?: MindPredictorService\` em ReplyEngineDegradedDeps; troque as 2 chamadas \`computeChatSurprise(...)\` por \`resolveChatReplySurprise(deps.mindSurpriseService, deps.logger, { workspaceId, observed:<outcome|0>, surface:'dashboard' })\` (import já no bloco). Mantenha observeRepliedToUserBelief. Adicione mindPredictorService aos 2 objetos de deps montados em kloel-reply-engine.service.ts (~applyReplyEngineDegradedPath / applyReplyEnginePostReply).
(D) kloel-thinker.service.ts: injete \`@Optional() private readonly intentRouter?: IntentRouterService\` (de './intent-router/intent-router.service') e \`@Optional() private readonly audit?: AuditService\` (de '../audit/audit.service') no FIM do constructor. Na linha ~117: \`const deterministicAction = deterministicWorkspaceId ? (classifyDeterministicIntent(this.intentRouter, message, \\\`dashboard:\${mode}\\\`, allowedTools ?? ['*']) ?? detectActionIntent(message)) : null;\` (import classifyDeterministicIntent de './kloel-thinker-think.helpers'). Adicione \`...(this.audit ? { audit: this.audit } : {})\` ao branchCtx (ThinkBranchContext) em ~267.
PROVE com codegraph_callers que predictReply e resolveBinary saíram de 0 callers para ≥1. Atualize os specs afetados (estão no seu ownedPaths). Rode run_jest nos seus specs.`,
    ownedPaths: ['backend/src/kloel/kloel-reply-engine.service.ts', 'backend/src/kloel/kloel-reply-engine.helpers.ts', 'backend/src/kloel/kloel-reply-engine.decision-outcome.helpers.ts', 'backend/src/kloel/kloel-reply-engine.degraded-path.helper.ts', 'backend/src/kloel/kloel-thinker.service.ts', 'backend/src/kloel/kloel-reply-engine.service.spec.ts', 'backend/src/kloel/kloel-thinker.service.spec.ts'],
  },
  {
    label: 'w2-memory-rest',
    scope: `Migrar os ~85 call sites restantes \`this.prisma.kloelMemory.*\` -> \`this.mindMemory.items.*\` (injetar MindMemoryItemService de '../mind/aliases/mind-memory-item.service' — JÁ é provider/export no KloelModule e mind.module, DI resolve). Pattern do Wave 1: add import, injetar no constructor, trocar chamadas, atualizar specs (mindMemoryStub p/ positional, ou provider TestingModule). Use codegraph_search "prisma.kloelMemory" + grep p/ achar TODOS nos SEUS paths. NÃO toque reply-engine* (outro agente) nem mind/policy/* (outro agente). Prove pg_count RAC_KloelMemory=174 intacto.`,
    ownedPaths: ['backend/src/kloel/unified-agent-actions-memory.helpers.ts', 'backend/src/kloel/unified-agent-actions-context.helpers.ts', 'backend/src/kloel/onboarding.service.ts', 'backend/src/kloel/product-memory-sync.helpers.ts', 'backend/src/kloel/kloel-tool-executor.helpers.ts', 'backend/src/kloel/kloel-workspace-context-data.service.ts', 'backend/src/kloel/kloel-lead-processor.service.ts', 'backend/src/kloel/memory-search.service.ts', 'backend/src/kloel/memory-stats.ts', 'backend/src/marketing/channels/whatsapp/account-agent.service.ts'],
    model: 'sonnet',
  },
  {
    label: 'w2-domain-purity-executors',
    scope: `Migrar executores prisma-direto -> serviços de domínio (anti-padrão 2.2), mantendo prisma como fallback GUARDADO (\`if (!this.svc) { ...legacy prisma... }\`, igual ao toolDeleteCoupon existente). Para CADA: injetar o serviço de domínio @Optional, rotear a operação, manter fallback. kloel-tool-executor-crm -> CrmService (createContact/upsertContact/listContacts/moveLead); kloel-business-config-tools -> WorkspaceService/ProductService; kloel-chat-checkout.tool -> CheckoutService; kloel-wallet-sales-tools -> SalesService/WalletService; mind-capability-executor -> ProductService/CrmService/DashboardService (read projections — baixa prioridade, migre só os triviais). Os serviços de domínio precisam estar no kloel.module providers — se faltar, DEVOLVA em remainingForCEO o patch de provider exato (NÃO edite kloel.module). Atualize specs afetados.`,
    ownedPaths: ['backend/src/kloel/kloel-tool-executor-crm.service.ts', 'backend/src/kloel/kloel-business-config-tools.service.ts', 'backend/src/kloel/kloel-chat-checkout.tool.ts', 'backend/src/kloel/kloel-wallet-sales-tools.service.ts', 'backend/src/kloel/mind/coordination/mind-capability-executor.service.ts'],
  },
  {
    label: 'w2-channel-merge',
    scope: `Convergir os 2 registries de canal em UM (ChannelMessageDispatchService canônico). BLOCKER PRIMEIRO: ChannelTransportRegistry.send roda MindGuardsService.evaluate({decisionType:'send_message'}) antes de enviar; o layer canônico NÃO tem esse gate. Antes de migrar callers, COMPONHA o MindGuards no caminho canônico (injete MindGuardsService + MindGuardContextBuilderService em ChannelMessageDispatchService e avalie antes de despachar; se bloqueado, retorne ChannelSendResult blocked). DEPOIS migre os callers de ChannelTransportRegistry para ChannelMessageDispatchService.dispatch(workspaceId, channel, recipientId, content, {mediaUrl,mediaType}): kloel-whatsapp-tools, kloel-tool-executor-whatsapp, unified-agent-actions-messaging, inbox.service (reply path), cart-recovery, cia-send-helpers. Marque ChannelTransportRegistry @deprecated. kloel-tool-dispatcher.service.ts é hub — DEVOLVA o patch. NÃO edite channel-message-dispatch.service.ts se isso colidir — ele é seu se precisar do guard; sim, você o possui.`,
    ownedPaths: ['backend/src/kloel/channel-transport.registry.ts', 'backend/src/kloel/kloel-whatsapp-tools.service.ts', 'backend/src/kloel/kloel-tool-executor-whatsapp.service.ts', 'backend/src/kloel/unified-agent-actions-messaging.service.ts', 'backend/src/inbox/inbox.service.ts', 'backend/src/kloel/cart-recovery.service.ts', 'backend/src/kloel/mind/cia/cia-send-helpers.service.ts', 'backend/src/marketing/channel-message-dispatch.service.ts'],
  },
  {
    label: 'w2-brainmind-policy',
    scope: `Completar a unificação Brain->Mind no policy. Adicione a MindGlobalPriorService um método bridge \`getPriorTuple(channel, decisionType, action): Promise<{mean:number, observations:number}|null>\` (consultando mindGlobalPrior/mindBanditArm — confirme schema via pg_table_describe). Migre mind-policy.service.ts: trocar a injeção @Optional KloelGlobalPriorService -> MindGlobalPriorService e a chamada em mixWithGlobalPrior() para getPriorTuple. DEVOLVA em remainingForCEO o patch p/ remover KloelGlobalPriorService de kloel.module (providers+exports+import) — NÃO edite kloel.module. NÃO apague o model do schema (owner-gated). Atualize mind-policy.service.spec.ts.`,
    ownedPaths: ['backend/src/kloel/mind/policy/mind-policy.service.ts', 'backend/src/kloel/mind/policy/mind-policy.service.spec.ts', 'backend/src/kloel/mind/memory/mind-global-prior.service.ts', 'backend/src/kloel/mind/memory/mind-global-prior.service.spec.ts'],
    model: 'sonnet',
  },
  {
    label: 'w2-event-tail',
    scope: `Canonizar a cauda de eventos com segurança. (a) telemetry.ts: identity.contact.resolved->cognition.identity.contact_resolved (236), pipeline.shadow_recorded->cognition.pipeline.shadow_recorded (334), pipeline.auto_fallback->cognition.pipeline.auto_fallback (384). (b) payment.service.ts:192 sale.created->commerce.sale.created E product/plan recordCommercial sites — MAS estes são eventType gravados em DB e usados como WHERE filter; ANTES de trocar, garanta que o read-path (readReplayEvents/claimPendingEvents) use expandEventNameAliasesAll() para aceitar AMBOS os nomes (a infra existe em mind-event-taxonomy.ts). Use protocol_hub_asyncapi p/ nomes canônicos. Confirme via codegraph_callers que nenhum WHERE filtra o nome antigo sem a expansão. Se risco de quebrar fila, faça dual-emit em vez de rename direto.`,
    ownedPaths: ['backend/src/kloel/commercial-decision-orchestrator/telemetry.ts', 'backend/src/kloel/payment.service.ts', 'backend/src/products/product.service.ts', 'backend/src/plans/plan.service.ts'],
    model: 'sonnet',
  },
  {
    label: 'w2-capability-contracts',
    scope: `Garantir que TODA capability tem (serviço registrado, método existente). Para cada domainService string nas partitions capability-registry-v2 (NÃO edite as partitions — outro escopo; só LEIA), confirme via codegraph_search que o método existe na classe. CRIE os métodos/serviços faltantes que Wave 1 deixou: (1) ReviewService.create (em services-v2/review.service.ts) — cria ProductReview workspace-isolado; (2) CampaignsService.linkToProduct — em campaigns.service.ts (vincula campaign a productId); (3) PixelService (NOVO services-v2/pixel.service.ts) — configure(workspaceId,args) embrulhando ProductService.setPixels/ProductAIConfig; (4) AgentJobService (NOVO services-v2/agent-job.service.ts) — create/list/setEnabled sobre o model de agent jobs (confirme model via pg_tables/schema). Prisma tipado, @Injectable. DEVOLVA em remainingForCEO o mapa {classe->arquivo} p/ registrar no SERVICE_TOKEN_MAP + kloel.module.`,
    ownedPaths: ['backend/src/kloel/services-v2/review.service.ts', 'backend/src/kloel/services-v2/pixel.service.ts', 'backend/src/kloel/services-v2/agent-job.service.ts', 'backend/src/campaigns/campaigns.service.ts'],
    model: 'sonnet',
  },
  {
    label: 'w2-test-proof',
    scope: `Provar comportamento + subir cobertura crítica. (1) Crie um teste de integração backend (jest, com prisma real ou mock honesto NÃO no caminho crítico) que: monta o CapabilityRegistryV2 + DomainServiceResolver e, para 6-8 capabilities chave (products.create, urls.add, coupons.create, sales.create_pix [mock do provider de pagamento só na borda externa], get_sales_summary), invoca o resolver e assere que o método de domínio é chamado / retorna receipt — provando o caminho chat->capability->domínio. Coloque em backend/src/kloel/capability-registry-v2/capability-execution.integration.spec.ts. (2) Suba os coverageThreshold de checkout-payment.service (>=80/80) e inbox.service em backend/package.json (jest.coverageThreshold) — e ADICIONE os testes que faltam p/ atingir, senão NÃO suba o threshold (honesto). (3) Crie spec p/ mind-prediction.service.ts (325 LOC, 0 spec). Rode run_jest nos seus novos specs.`,
    ownedPaths: ['backend/src/kloel/capability-registry-v2/capability-execution.integration.spec.ts', 'backend/src/kloel/mind/mind-prediction.service.spec.ts', 'backend/package.json'],
    model: 'sonnet',
  },
]

const results = await parallel(
  WPS.map((wp) => () => {
    const prompt = `Você é um engenheiro sênior PI numa Wave de enxame (loop infinito até Y=X em produção). Reporta a um CEO (Opus) que vai LER/TESTAR/COMPLETAR seu código. Wave 1 já está integrada e o backend está VERDE (tsc=0) — você constrói EM CIMA dela.

${MCP_ARSENAL}

${RULES}

── SUA FATIA: ${wp.label} ──
${wp.scope}

── SEUS ARQUIVOS (ownedPaths — só edite DENTRO; specs correspondentes inclusos quando listados) ──
${wp.ownedPaths.join('\n')}

Execute: codegraph/lsp mapear -> atomic-edit(lock) escrever -> lsp_diagnostics validar -> codegraph_callers/pg/jest PROVAR que está LIVE. Retorne o receipt.`
    return agent(prompt, {
      label: wp.label,
      phase: 'Wave 2 construction',
      schema: RECEIPT,
      ...(wp.model ? { model: wp.model } : {}),
    }).then((r) => ({ ...r, _label: wp.label }))
  })
)

return results.filter(Boolean)
