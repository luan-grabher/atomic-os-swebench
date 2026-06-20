export const meta = {
  name: 'kloelgraph-Y-foundation',
  description: 'Fase 0 de Y: mapear a superfície REAL do repo por domínio, sintetizar a partição disjunta de Y + contrato de fiação + prompts de despacho por fatia (com playbook de MCPs), e validar adversarialmente colisão/cobertura/viabilidade.',
  phases: [
    { title: 'Research' },
    { title: 'Synthesize' },
    { title: 'Adversarial' },
    { title: 'Finalize' },
  ],
}

const FE = args.feRoot
const WT = args.worktree
const OUT = args.outDir
const PROTO = args.prototype

const DOMAINS = [
  { key: 'foundation', title: 'Fundação · API layer + hooks + auth/providers + roteamento + #473 shell + graph-builder',
    protoSurface: 'buildGraph, BASE_SUNS, todos os build*NodesEdges, computeLayout/physicsTick, GraphCanvas, KloelInner state (products/affiliate/wallet/educar/conversar/desempenho/kloel), KloelOverlay',
    repoHints: 'frontend/src/lib/api/* (apiFetch/core.ts, ~19 módulos), hooks SWR (useProducts etc), AuthContext/Providers, app/(main)/layout.tsx + MainAppLayoutShell + KloelGraphShell (#473), middleware/proxy, design-tokens, KloelGraphPrototype.jsx + KloelGraphClient.tsx' },
  { key: 'perfil', title: 'Perfil + Dashboard(HomeView) + métricas',
    protoSurface: 'CoreSettingsPanel + Section* (pessoal/fiscal/docs/banco/publico/team/apps/seguranca), DesempenhoPanel/MetricDetailPanel, buildProfileNodesEdges, computeDesempenho/dzCards',
    repoHints: 'tela real Perfil/Settings; HomeView + HomeKpiTiles + HomeRecentActivity; hooks de dashboard/reports' },
  { key: 'kloel', title: 'Kloel (IA central): Novo Chat/Buscar/Imagens/Recentes',
    protoSurface: 'KloelMassPanel, KloelChatScreen, KloelSearchScreen, KloelImagesScreen, KloelRecentsScreen, buildKloelNodesEdges, kloelSystemPrompt',
    repoHints: 'UniversalComposer real, command palette/busca real (useCommandPalette/CommandPalette), endpoints de chat/IA' },
  { key: 'criar', title: 'Criar: Produtos + ProductNerveCenter (10 abas) + planos/checkouts + wizard',
    protoSurface: 'CriarProdutosScreen, ProductOverview, Tab{Dados,Planos,Checkouts,Urls,Comissao,Cupons,Campanhas,Avaliacoes,Afterpay,IA}, CheckoutEditor, SplitEngine, NewProductModal, buildProductSubnodes, PRODUCTS seed',
    repoHints: 'ProdutosView, ProductNerveCenter + 10 abas reais, editor de checkout real, wizard products/new, useProducts' },
  { key: 'afiliar', title: 'Afiliar: AfiliarSe + Marketplace + Meus afiliados (ParceriasView)',
    protoSurface: 'AfiliarScreen, AffiliateOverview/BranchPanel/ProductPanel/PartnerPanel, MyAffiliatesPanel, buildAffiliateNodesEdges, MARKETPLACE_SEED/MY_AFFILIATES_SEED',
    repoHints: 'AfiliarSe, ParceriasView/parcerias, marketplace, AffiliateRequest/AffiliateLink, hooks de afiliação' },
  { key: 'educar', title: 'Educar: Área de membros (Aprender/Ensinar)',
    protoSurface: 'EducarScreen, MemberAreaPanel, buildEducarNodesEdges, MEMBER_AREAS_SEED, areaStats',
    repoHints: 'AreaMembros, MemberArea/Module/Lesson/Enrollment, hooks de member-area' },
  { key: 'conversar', title: 'Conversar: Inbox/CRM/Contatos/Anuncios/Autopilot + canais',
    protoSurface: 'ConversarScreen, CrmPanel, ConversationPanel, ContactPanel, OrderPanel, VendasPanel, AnunciosPanel, AutopilotPanel, AdCampaignPanel, ChannelOnboardingWizard, buildConversarNodesEdges, CRM_SEED/CONTACTS_SEED/CONVERSATIONS_SEED/AD_*',
    repoHints: 'Inbox/CRM, Contatos, Anuncios (war room), Autopilot, onboarding real de canais WhatsApp/Instagram/Facebook/TikTok/Email' },
  { key: 'consultar', title: 'Consultar: Carteira + Analytics/Relatórios',
    protoSurface: 'WalletOverview/BranchPanel/Withdraw/Anticipate/Extrato/Vendas/Assinaturas/Abandonos/Estornos, buildWalletNodesEdges, DEFAULT_WALLET/ORDERS_SEED',
    repoHints: 'KloelCarteira (CarteiraSaldoCard/ExtratoTable/Saque/TabAntecipacoes + modais), Analytics (AnalyticsHeader, VendasTab/AssinaturasTab/AbandonosTab/EstornosTab)' },
]

const DOMAIN_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    domain: { type: 'string' },
    realScreens: { type: 'array', items: { type: 'object', additionalProperties: true } },
    realDataHooks: { type: 'array', items: { type: 'object', additionalProperties: true } },
    realEndpoints: { type: 'array', items: { type: 'string' } },
    prototypeSeeds: { type: 'array', items: { type: 'string' } },
    prototypePanels: { type: 'array', items: { type: 'string' } },
    wiringDelta: { type: 'array', items: { type: 'string' } },
    overlayStrategy: { type: 'string' },
    collisionFiles: { type: 'array', items: { type: 'string' } },
    feasibility: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['domain', 'realScreens', 'wiringDelta', 'collisionFiles', 'feasibility'],
}

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    sliceCount: { type: 'number' },
    peakConcurrency: { type: 'number' },
    slices: { type: 'array', items: { type: 'object', additionalProperties: true } },
    dependencyOrder: { type: 'array', items: { type: 'string' } },
    artifactsWritten: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['sliceCount', 'slices', 'artifactsWritten', 'summary'],
}

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    lens: { type: 'string' },
    collisionsFound: { type: 'array', items: { type: 'string' } },
    coverageGaps: { type: 'array', items: { type: 'string' } },
    feasibilityRisks: { type: 'array', items: { type: 'string' } },
    fixes: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string' },
  },
  required: ['lens', 'verdict'],
}

log('Fase 0 de Y — mapeando ' + DOMAINS.length + ' domínios em paralelo (ancorado no repo real)')

phase('Research')
const maps = (await parallel(DOMAINS.map(d => () => agent(
  'Você é um agente de PESQUISA (read-only) mapeando o domínio "' + d.title + '" para fiar o KloelGraph à realidade do Kloel.\n\n' +
  'VISÃO DE Y:\n' + args.vision + '\n\nMAPA NÓ→TELA REAL:\n' + args.nodeMap + '\n\n' +
  'WORKTREE (trabalhe SEMPRE aqui): ' + WT + '\nFRONTEND: ' + FE + '\nPROTÓTIPO: ' + PROTO + '\n' +
  'Superfície do protótipo neste domínio: ' + d.protoSurface + '\nPistas das telas/hook reais: ' + d.repoHints + '\n\n' +
  'TAREFA — produza um mapa PRECISO e ANCORADO (anti-invenção):\n' +
  '1. Localize as TELAS REAIS do repo deste domínio (caminho exato do componente). Use Grep/Glob/Read + mcp codegraph (codegraph_search/node/context) + mcp gitnexus (route_map/query/api_impact). Para cada tela: { name, path, route, opensFromNode }.\n' +
  '2. Localize os HOOKS/clients de dados reais (frontend/src/lib/api/*, hooks SWR) e os ENDPOINTS reais que servem este domínio. Para cada: { name, path, endpoint, method }.\n' +
  '3. Liste os SEEDS do protótipo deste domínio (constantes *_SEED/DEFAULT_*) e os PAINÉIS reinventados inline que serão substituídos pela tela real no overlay.\n' +
  '4. wiringDelta: passos concretos para (a) derivar nós de dados reais e (b) renderizar a tela real no overlay 80% no lugar do painel inline — preservando 100% do visual do grafo; onde não houver dado/endpoint real, especifique o ESTADO HONESTO (loading/empty/error), nunca seed falso.\n' +
  '5. overlayStrategy: como montar a tela real dentro do KloelOverlay sem reestilizar/recortar (casca quase invisível).\n' +
  '6. collisionFiles: TODOS os arquivos que este domínio precisa criar/editar (caminhos exatos) — isto define a disjunção entre fatias. Prefira CRIAR módulos novos (hook/adapter/bridge) e tocar o monólito o mínimo possível.\n' +
  '7. feasibility (alta/média/baixa) + blockers (ex.: backend não rodando, endpoint inexistente, tela ausente).\n' +
  'NÃO edite nada nesta fase. Retorne só o objeto estruturado.',
  { label: 'research:' + d.key, phase: 'Research', schema: DOMAIN_SCHEMA }
)))).filter(Boolean)

log('Pesquisa concluída: ' + maps.length + '/' + DOMAINS.length + ' domínios mapeados')

phase('Synthesize')
const plan = await agent(
  'Você é o agente SÍNTESE. Receba os mapas de domínio (JSON abaixo) e produza a partição executável de Y + o contrato de fiação + os prompts de despacho por fatia.\n\n' +
  'MAPAS:\n' + JSON.stringify(maps, null, 2) + '\n\n' +
  'PLAYBOOK DE MCPs (embuta NO PROMPT de CADA fatia, integral):\n' + args.playbook + '\n\n' +
  'VISÃO DE Y:\n' + args.vision + '\n\nWORKTREE: ' + WT + '\nESCREVA OS ARTEFATOS EM: ' + OUT + '\n\n' +
  'REGRAS DE PARTIÇÃO (anti-falha):\n' +
  '- Fatias devem ser DISJUNTAS POR ARQUIVO (use collisionFiles dos mapas). Se dois domínios colidem num arquivo, a edição daquele arquivo vira responsabilidade da fatia Fundação/Integração (serial), não das galáxias.\n' +
  '- Ordem de dependência: Fundação (contrato + camada de dados do graph-builder + DECOMPOSIÇÃO do monólito em módulos por galáxia, preservando render byte-idêntico) roda PRIMEIRO e serial; só então as 7 galáxias em paralelo; depois overlay-bridge/roteamento; depois mobile/a11y/perf; depois verificação; por fim integração no (main) + remover sidebar atrás do flag.\n' +
  '- Estado honesto obrigatório onde backend ausente (nunca seed falso).\n\n' +
  'ESCREVA (via Write/atomic) estes arquivos em ' + OUT + ':\n' +
  '1. Y_PARTITION.md — tabela das 12 fatias (id, escopo, arquivos disjuntos, depende-de, concorrência), o número total de fatias, o pico simultâneo, e o pipeline de fases.\n' +
  '2. WIRING_CONTRACT.md — contrato compartilhado: (a) como cada tipo de nó deriva de dados reais (hook→builder); (b) como o overlay 80% renderiza a tela real (sem reestilizar); (c) regra de "visual 100% idêntico = mesma casca/layout/interação, dado real, estado honesto"; (d) deep-linking (?node=, voltar/avançar, ?graph=1); (e) convenções (tokens, apiFetch/swrFetcher).\n' +
  '3. slice-prompts/<id>.md — UM prompt de despacho pronto por fatia, cada um contendo: escopo exato, arquivos a criar/editar, o PROTOCOLO POR FATIA, e o PLAYBOOK DE MCPs integral. Cada prompt deve mandar o agente: travar arquivos (task-graph), ancorar no real (codegraph/gitnexus), fiar via atomic-edit preservando visual, gate verde (test-runner), verificar no Chrome (chrome-devtools em ' + args.devUrl + '), pulse limpo.\n\n' +
  'Retorne o objeto estruturado (sliceCount, peakConcurrency, slices[], dependencyOrder[], artifactsWritten[] com caminhos absolutos, blockers[], summary).',
  { label: 'synthesize', phase: 'Synthesize', schema: PLAN_SCHEMA }
)

log('Síntese: ' + plan.sliceCount + ' fatias, pico ' + (plan.peakConcurrency || '?') + '; ' + (plan.artifactsWritten || []).length + ' artefatos escritos')

phase('Adversarial')
const LENSES = [
  { k: 'colisao', p: 'Caça COLISÕES: dois agentes de fatias diferentes editando o mesmo arquivo/símbolo ao mesmo tempo. Liste cada colisão concreta e o conserto (mover edição para fase serial ou redesenhar a fronteira da fatia).' },
  { k: 'cobertura', p: 'Caça LACUNAS DE COBERTURA de Y: alguma tela do mapa nó→tela, algum estado (loading/empty/error), deep-linking, mobile, a11y, perf, ou build/test que NENHUMA fatia cobre. Liste o que falta e em qual fatia encaixar.' },
  { k: 'viabilidade', p: 'Caça RISCOS DE VIABILIDADE: passos que não sobrevivem ao real (backend ausente, endpoint inexistente, "visual idêntico + dado real" impossível sem stack, decomposição que muda o render). Liste o risco e a mitigação honesta.' },
]
const reviews = (await parallel(LENSES.map(l => () => agent(
  'Você é REVISOR ADVERSARIAL (lente: ' + l.k + ') do plano de partição de Y. Leia os artefatos em ' + OUT + ' (Y_PARTITION.md, WIRING_CONTRACT.md, slice-prompts/*).\n\n' + l.p + '\n\n' +
  'Seja concreto e cite arquivo/fatia. Retorne o objeto estruturado (lens, collisionsFound, coverageGaps, feasibilityRisks, fixes, verdict=APROVADO|REPROVADO).',
  { label: 'review:' + l.k, phase: 'Adversarial', schema: REVIEW_SCHEMA }
)))).filter(Boolean)

const reprovado = reviews.filter(r => r && /REPROV/i.test(r.verdict || '')).length
log('Revisão adversarial: ' + (reviews.length - reprovado) + ' aprovaram, ' + reprovado + ' reprovaram')

phase('Finalize')
const finalPlan = await agent(
  'Você é o agente FINALIZAÇÃO. Aplique os consertos das revisões adversariais ao plano e re-escreva os artefatos em ' + OUT + ' (Y_PARTITION.md, WIRING_CONTRACT.md, slice-prompts/*) já corrigidos.\n\n' +
  'REVISÕES:\n' + JSON.stringify(reviews, null, 2) + '\n\nPLANO ATUAL:\n' + JSON.stringify(plan, null, 2) + '\n\n' +
  'Garanta: fatias disjuntas por arquivo, ordem de dependência correta (Fundação→decomposição serial→7 galáxias→overlay/routing→mobile/a11y/perf→verificação→integração), estados honestos, e cada slice-prompt com o PLAYBOOK DE MCPs integral. Escreva via Write/atomic. Retorne o objeto estruturado final (sliceCount, peakConcurrency, slices[], dependencyOrder[], artifactsWritten[] absolutos, blockers[], summary).',
  { label: 'finalize', phase: 'Finalize', schema: PLAN_SCHEMA }
)

return {
  sliceCount: finalPlan.sliceCount,
  peakConcurrency: finalPlan.peakConcurrency,
  dependencyOrder: finalPlan.dependencyOrder,
  artifactsWritten: finalPlan.artifactsWritten,
  blockers: finalPlan.blockers,
  domainsMapped: maps.length,
  adversarialReprovado: reprovado,
  summary: finalPlan.summary,
}
