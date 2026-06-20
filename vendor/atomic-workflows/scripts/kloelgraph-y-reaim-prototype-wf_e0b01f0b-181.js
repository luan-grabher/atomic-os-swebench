export const meta = {
  name: 'kloelgraph-Y-reaim-prototype',
  description: 'Re-apontar Y para o KloelGraphPrototype.jsx LITERAL (Opção C): mapear a anatomia interna do protótipo (seeds/builders/telas-inline/overlay-router) e ligar cada domínio ao hook real + componente real do repo; sintetizar partição/contrato/prompts re-mirados no protótipo; validar adversarialmente.',
  phases: [
    { title: 'Map' },
    { title: 'Synthesize' },
    { title: 'Adversarial' },
    { title: 'Finalize' },
  ],
}

const FE = args.feRoot
const WT = args.worktree
const OUT = args.outDir
const PROTO = args.prototype

const GALAXIES = [
  { key: 'engine', title: 'ENGINE + DECOMPOSIÇÃO (não é galáxia — é o seam)',
    protoSymbols: 'THEMES/ThemeProvider, FONT/MONO, GOLDEN_ANGLE, buildGraph, BASE_SUNS/STATIC_BRANCHES, computeLayout/computeGalaxyAnchors/physicsTick/applyFilters/nodeRadius, GraphCanvas, FloatingNav/SettingsPanel/ThemeToggle, KloelOverlay, NodePanel (o ROUTER de overlay: decide qual painel/tela abrir por node.type), KloelInner (estado raiz: products/affiliate/wallet/educar/conversar/desempenho/kloel/accountData/channels + todos os patch*), export default Kloel',
    job: 'Mapear o ENGINE compartilhado e desenhar a DECOMPOSIÇÃO do monólito (6577 linhas) em módulos por domínio preservando render BYTE-IDÊNTICO: extrair por domínio (a) os seeds/constantes de dados, (b) os build*NodesEdges, (c) os componentes de tela inline, deixando no arquivo-engine só engine+overlay+NodePanel-router+KloelInner que IMPORTA dos módulos. Especificar o seam exato (o que cada módulo exporta, como KloelInner/NodePanel importam) para que as galáxias virem edição body-only de arquivo próprio (zero colisão).' },
  { key: 'perfil', title: 'Perfil + Dashboard',
    protoSymbols: 'DEFAULT_ACCOUNT_DATA, buildProfileNodesEdges, PROFILE_SECTIONS, CoreSettingsPanel + Section{Pessoal,Fiscal,Documentos,Bancario,PerfilPublico,Team,Apps,Seguranca}, DesempenhoPanel/MetricDetailPanel, OPERATIONAL_DAYS/computeDesempenho/dzCards/buildOperationalDays',
    realHints: 'tela real Perfil/Settings; HomeView + HomeKpiTiles + HomeRecentActivity; hooks de dashboard/reports (useDashboardHome etc.)' },
  { key: 'kloel', title: 'Kloel (IA central)',
    protoSymbols: 'KLOEL_ACTIONS, buildKloelNodesEdges, KloelMassPanel, KloelChatScreen (chama api.anthropic — TROCAR pelo backend real de chat), KloelSearchScreen/buildKloelSearchIndex, KloelImagesScreen, KloelRecentsScreen, KloelOverlay, KloelMushroom',
    realHints: 'UniversalComposer real; command palette/busca real (useCommandPalette/CommandPalette); endpoints reais de chat/IA do Kloel (NÃO chamar api.anthropic direto no client)' },
  { key: 'criar', title: 'Criar / Produtos',
    protoSymbols: 'PRODUCTS seed, defaultProductEditor/defaultPlan/defaultCheckoutConfig, buildProductSubnodes, PRODUCT_NERVE_TABS, CriarProdutosScreen, ProductOverview, Tab{Dados,Planos,Checkouts,Urls,Comissao,Cupons,Campanhas,Avaliacoes,Afterpay,IA}, CheckoutEditor, SplitEngine, NewProductModal',
    realHints: 'ProdutosView real, ProductNerveCenter real (10 abas reais), editor de checkout real, wizard products/new, useProducts e clients lib/api/*' },
  { key: 'afiliar', title: 'Afiliar',
    protoSymbols: 'MARKETPLACE_SEED, MY_AFFILIATES_SEED, PARTNER_CHATS_SEED, AFFILIATE_BRANCHES, buildAffiliateNodesEdges, AfiliarScreen, AffiliateOverview/BranchPanel/ProductPanel/PartnerPanel, MyAffiliatesPanel',
    realHints: 'AfiliarSe real, ParceriasView/parcerias real, marketplace, useAffiliates/usePartnerships' },
  { key: 'educar', title: 'Educar',
    protoSymbols: 'MEMBER_AREAS_SEED, areaStats, buildEducarNodesEdges, EducarScreen, MemberAreaPanel',
    realHints: 'AreaMembros real, useMemberAreas/useMemberAreaStats, MemberArea/Module/Lesson/Enrollment' },
  { key: 'conversar', title: 'Conversar',
    protoSymbols: 'CRM_SEED, CONTACTS_SEED, CONVERSATIONS_SEED, AD_CAMPAIGNS_SEED/AD_RULES_SEED, ORDERS_SEED, AUTOPILOT_EVENTS_SEED/FOLLOWUPS_SEED, CONVERSAR_BRANCHES/CRM_MODULES, buildConversarNodesEdges, ConversarScreen, CrmPanel/ConversationPanel/ContactPanel/OrderPanel/VendasPanel/AnunciosPanel/AutopilotPanel/AdCampaignPanel, ChannelOnboardingWizard',
    realHints: 'Inbox/CRM real, Contatos, Anuncios (war room — /api/anuncios pode faltar→criar proxy ou repointar), Autopilot, onboarding real de canais; useCRM/conversations/useAnuncios' },
  { key: 'consultar', title: 'Consultar (Carteira + Analytics)',
    protoSymbols: 'DEFAULT_WALLET, ORDERS_SEED, ABANDONOS_SEED, WALLET_BRANCHES, buildWalletNodesEdges, WalletOverview/BranchPanel/Withdraw/Anticipate/Extrato/Vendas/Assinaturas/Abandonos/Estornos',
    realHints: 'KloelCarteira real (CarteiraSaldoCard/ExtratoTable/Saque/TabAntecipacoes + modais), Analytics (AnalyticsHeader, VendasTab/AssinaturasTab/AbandonosTab/EstornosTab); hooks wallet/analytics/reports' },
]

const MAP_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    domain: { type: 'string' },
    protoSeeds: { type: 'array', items: { type: 'string' } },
    protoBuilders: { type: 'array', items: { type: 'string' } },
    protoInlineScreens: { type: 'array', items: { type: 'string' } },
    realHooks: { type: 'array', items: { type: 'object', additionalProperties: true } },
    realScreens: { type: 'array', items: { type: 'object', additionalProperties: true } },
    decompositionModule: { type: 'string' },
    wiringSteps: { type: 'array', items: { type: 'string' } },
    overlaySwapStrategy: { type: 'string' },
    filesToCreate: { type: 'array', items: { type: 'string' } },
    filesToEdit: { type: 'array', items: { type: 'string' } },
    collisionRisk: { type: 'string' },
    feasibility: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
  required: ['domain', 'wiringSteps', 'filesToEdit', 'feasibility'],
}

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    sliceCount: { type: 'number' },
    peakConcurrency: { type: 'number' },
    decompositionFirst: { type: 'boolean' },
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
  properties: { lens: { type: 'string' }, findings: { type: 'array', items: { type: 'string' } }, fixes: { type: 'array', items: { type: 'string' } }, verdict: { type: 'string' } },
  required: ['lens', 'verdict'],
}

log('Re-apontando Y para o protótipo literal — mapeando engine + 7 galáxias em paralelo')

phase('Map')
const maps = (await parallel(GALAXIES.map(g => () => agent(
  'Você é agente de MAPEAMENTO (read-only) para re-apontar Y ao KloelGraphPrototype.jsx LITERAL (Opção C escolhida pelo dono).\n\n' +
  'DECISÃO:\n' + args.decision + '\n\n' +
  'WORKTREE (alvo): ' + WT + '\nFRONTEND: ' + FE + '\nPROTÓTIPO LITERAL: ' + PROTO + '\nPesquisa pré-existente (reuse hooks/telas reais; foi mirada no #473, mas a pesquisa de hooks/telas serve): ' + args.priorResearch + '\n\n' +
  'DOMÍNIO: ' + g.title + '\nSímbolos do protótipo neste domínio: ' + g.protoSymbols + '\n' + (g.realHints ? 'Pistas das telas/hooks reais: ' + g.realHints + '\n' : '') + '\n' +
  'TAREFA (ancore tudo lendo o código real — anti-invenção; use Read/Grep/Glob + codegraph + gitnexus):\n' +
  (g.key === 'engine'
    ? '1. Leia o protótipo e mapeie o ENGINE compartilhado (física/layout/GraphCanvas/KloelInner/KloelOverlay/NodePanel-router).\n2. Desenhe a DECOMPOSIÇÃO em módulos por domínio preservando render BYTE-IDÊNTICO: para cada domínio, que seeds/builders/telas-inline extrair, e o seam exato (exports de cada módulo + como KloelInner e NodePanel passam a importar). O arquivo-engine fica só com engine+overlay+NodePanel-router+KloelInner. Liste filesToCreate (módulos) e a ordem.\n3. Defina o GATE de render byte-idêntico (serialize por nó {id,parentId,type,label,subtitle,parentId,pos} em ordem congelada) que valida que a decomposição não mudou nada.\n4. collisionRisk + feasibility + blockers (ex.: atomic-edit caiu; backend down).'
    : '1. Liste os SEEDS, os build*NodesEdges e os COMPONENTES DE TELA INLINE deste domínio dentro do protótipo (nomes exatos).\n2. Ache o HOOK/client real do repo que fornece os dados reais (caminho + endpoint) e o COMPONENTE DE TELA REAL do repo a renderizar no overlay (caminho exato — verifique por Glob/Grep; se não existir equivalente real, diga e mantenha o painel do protótipo).\n3. wiringSteps: como (a) trocar o seed pelo hook real no builder (honest-empty: loading/empty/error→zero nós entidade, nunca seed); (b) trocar a tela inline pelo COMPONENTE REAL dentro do KloelOverlay/NodePanel sem reestilizar (casca quase invisível), cuidando de providers/props que o componente real exige.\n4. overlaySwapStrategy: como montar o componente real no overlay (import direto vs rota); filesToCreate (módulo do domínio + adapter de dados) e filesToEdit (só o próprio módulo após decomposição).\n5. collisionRisk + feasibility + blockers.'
  ) + '\nNÃO edite nada. Retorne só o objeto estruturado.',
  { label: 'map:' + g.key, phase: 'Map', schema: MAP_SCHEMA }
)))).filter(Boolean)

log('Mapeamento: ' + maps.length + '/' + GALAXIES.length + ' domínios')

phase('Synthesize')
const plan = await agent(
  'Você é SÍNTESE. Com os mapas (JSON) abaixo, escreva a partição executável de Y RE-MIRADA NO PROTÓTIPO LITERAL + contrato + prompts de despacho.\n\n' +
  'MAPAS:\n' + JSON.stringify(maps, null, 2) + '\n\nPLAYBOOK DE MCPs (embuta integral em CADA slice-prompt):\n' + args.playbook + '\n\nDECISÃO:\n' + args.decision + '\n\nESCREVA EM: ' + OUT + ' (no worktree ' + WT + ').\n\n' +
  'REGRAS:\n- Fatias DISJUNTAS POR ARQUIVO. A DECOMPOSIÇÃO (extrair o monólito em módulos) é a Fase 0 SERIAL e deve preservar render byte-idêntico (gate Chrome em ' + args.devUrl + '). Só depois as 7 galáxias em paralelo (cada uma edita body-only do seu módulo + cria seu adapter de dados). Depois overlay/routing/deep-linking; depois mobile/a11y/perf; depois verificação + integração (remover sidebar atrás do flag).\n- Estado honesto obrigatório (sem seed falso). Grafo byte-idêntico ao protótipo.\n- Cada slice-prompt: escopo, arquivos, PROTOCOLO POR FATIA, e o PLAYBOOK integral.\n\n' +
  'ARQUIVOS A ESCREVER (via Write):\n1. ' + OUT + '/Y_PARTITION.md (fatias, ordem, concorrência, pipeline) \n2. ' + OUT + '/WIRING_CONTRACT.md (decomposição/seam do protótipo; nó→dado real; overlay→componente real; regra visual-idêntico; deep-linking)\n3. ' + OUT + '/slice-prompts/*.md (um por fatia)\n\nRetorne objeto (sliceCount, peakConcurrency, decompositionFirst=true, slices[], dependencyOrder[], artifactsWritten[] absolutos, blockers[], summary).',
  { label: 'synthesize', phase: 'Synthesize', schema: PLAN_SCHEMA }
)

log('Síntese: ' + plan.sliceCount + ' fatias; ' + (plan.artifactsWritten || []).length + ' artefatos')

phase('Adversarial')
const LENSES = [
  { k: 'colisao', p: 'COLISÕES entre fatias paralelas (mesmo arquivo/símbolo). Em especial: a decomposição preserva render byte-idêntico? As galáxias são realmente body-only de arquivos disjuntos? Liste colisão + conserto.' },
  { k: 'cobertura', p: 'LACUNAS vs Opção C: toda tela inline tem destino (componente real OU manter painel do protótipo, decidido explicitamente)? Todos os seeds têm hook real ou estado honesto? deep-linking/mobile/a11y/perf/build cobertos? Liste o que falta.' },
  { k: 'viabilidade', p: 'RISCOS reais: atomic-edit indisponível (fallback?), backend down (verificação?), componente real exige providers/contexto que o overlay não tem, "visual idêntico do grafo" quebrado pela decomposição. Liste risco + mitigação honesta.' },
]
const reviews = (await parallel(LENSES.map(l => () => agent(
  'REVISOR ADVERSARIAL (lente: ' + l.k + '). Leia os artefatos em ' + OUT + ' e o protótipo ' + PROTO + '.\n\n' + l.p + '\n\nSeja concreto (cite arquivo/fatia). Retorne objeto (lens, findings, fixes, verdict=APROVADO|REPROVADO).',
  { label: 'review:' + l.k, phase: 'Adversarial', schema: REVIEW_SCHEMA }
)))).filter(Boolean)

phase('Finalize')
const finalPlan = await agent(
  'FINALIZAÇÃO. Aplique os consertos das revisões e re-escreva os artefatos em ' + OUT + ' já corrigidos (Y_PARTITION.md, WIRING_CONTRACT.md, slice-prompts/*).\n\nREVISÕES:\n' + JSON.stringify(reviews, null, 2) + '\n\nPLANO:\n' + JSON.stringify(plan, null, 2) + '\n\nGaranta: decomposição-primeiro serial com gate render-idêntico; 7 galáxias paralelas body-only disjuntas; estado honesto; cada slice-prompt com PLAYBOOK integral. Escreva via Write. Retorne objeto final.',
  { label: 'finalize', phase: 'Finalize', schema: PLAN_SCHEMA }
)

return {
  sliceCount: finalPlan.sliceCount,
  peakConcurrency: finalPlan.peakConcurrency,
  dependencyOrder: finalPlan.dependencyOrder,
  artifactsWritten: finalPlan.artifactsWritten,
  blockers: finalPlan.blockers,
  domainsMapped: maps.length,
  reprovado: reviews.filter(r => r && /REPROV/i.test(r.verdict || '')).length,
  summary: finalPlan.summary,
}
