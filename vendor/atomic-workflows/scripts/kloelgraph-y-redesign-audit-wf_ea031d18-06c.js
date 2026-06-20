export const meta = {
  name: 'kloelgraph-Y-redesign-audit',
  description: 'Fan-out de auditoria+redesign-spec por domínio: percorrer cada nó/overlay/flow no graph rodando (Chrome), preservar capacidades reais, remover lixo legado de sidebar, re-inventar cada overlay com design BigTech. Cada agente escreve seu spec em arquivo disjunto. Implementação serial depois.',
  phases: [
    { title: 'Audit' },
    { title: 'Adversarial' },
    { title: 'Synthesize' },
  ],
}

const FE = args.feRoot
const OUT = args.outDir
const PROTO = args.prototype
const DEV = args.devUrl

const DOMAINS = [
  { key: 'engine-nav', title: 'Motor + Navegação + Overlay-chrome (PRESERVAR + micro-polish)',
    scope: 'A constelação (buildGraph/GraphCanvas/física/galáxias/sóis), FloatingNav (Perfil/Kloel/Criar/Afiliar/Educar/Conversar/Consultar), câmera/zoom/pan/lente GPS, arrastar-vs-clicar, ThemeToggle, SettingsPanel, KloelOverlay (a casca 80%). Isto é a REVOLUÇÃO — preserve; só aponte micro-polish de bom-gosto (fps, foco, transição, contraste, mobile).',
    realHints: 'KloelGraphPrototype.jsx: GraphCanvas, FloatingNav, KloelOverlay, computeLayout/physicsTick/computeGalaxyAnchors.' },
  { key: 'perfil-dashboard', title: 'Perfil + Dashboard (Núcleo)',
    scope: 'Nó core "Perfil" → CoreSettingsPanel (Pessoal/Fiscal/Docs/Banco/Público/Equipe/Apps/Segurança) + nó "Dashboard" (DesempenhoPanel/MetricDetailPanel, métricas como nós).',
    realHints: 'Telas reais: ContaView (/settings), HomeView+HomeKpiTiles+HomeRecentActivity (/dashboard), DashboardPostPaymentPanel. Hooks: useProfile/useFiscalData/useKycDocuments/useBankAccount/useDashboardHome. Capacidades a preservar: KYC completo, 2FA, equipe/convites, apps OAuth, KPIs por período.' },
  { key: 'kloel-ia', title: 'Kloel — IA central (DeepSeek)',
    scope: 'sun-kloel: KloelMassPanel, KloelChatScreen (já usa /kloel/think DeepSeek), KloelSearchScreen, KloelImagesScreen, KloelRecentsScreen, ações Novo Chat/Buscar/Imagens/Recentes.',
    realHints: 'Reais: UniversalComposer, CommandPalette/useCommandPalette, streamAuthenticatedKloelMessage(/kloel/think), searchKloelThreads/loadKloelThreadMessages, uploadChatFile. Preservar: chat streaming, busca global, memória de imagens, recentes. Imagens/voz são EXCEÇÃO (ok manter como está).' },
  { key: 'criar-produtos', title: 'Criar / Produtos (+ matar lixo legado)',
    scope: 'sun-criar → CriarProdutosScreen + ProductOverview + 10 abas (Dados/Planos/Checkouts/URLs/Comissão/Cupons/Campanhas/Avaliações/AfterPay/IA) + CheckoutEditor + SplitEngine + NewProductModal. LIXO LEGADO EXPLÍCITO do dono: a barra topo "Meus Produtos | Afiliar-se" — remover o "Afiliar-se" (Afiliar é galáxia própria agora).',
    realHints: 'Reais: ProdutosView, ProductNerveCenter (10 abas reais: ProductNerveCenter{Planos,Checkouts,Cupons,Comissao,Aval,IA,AfterPay,Campanhas}Tab + ProductUrlsTab), /products/new (wizard), /checkout editor. Hook: useProducts. Preservar TODA a capacidade do nerve-center.' },
  { key: 'afiliar', title: 'Afiliar (galáxia própria)',
    scope: 'sun-afiliar → AfiliarScreen + Marketplace + Minhas afiliações + Meus afiliados (MyAffiliatesPanel) + AffiliateProductPanel/PartnerPanel + chat com parceiro.',
    realHints: 'Reais: AfiliarSe, ParceriasView/parcerias. Hooks: useAffiliates/usePartnerships/useAffiliateStats/usePartnerMessages. Preservar: solicitar afiliação, link rastreável, earnings, marketplace, chat parceiro, projeção de comissão.' },
  { key: 'educar', title: 'Educar (Área de Membros)',
    scope: 'sun-educar (ramos Aprender/Ensinar) → MemberAreaPanel (overview/módulos→aulas/alunos/certificado/config).',
    realHints: 'Reais: ProdutosAreaMembrosTab (=AreaMembros) + AreaMembros{List,Overview,Students,Editor,Certificate}. Hooks: useMemberAreas/useMemberAreaStats/useMemberAreaStudents/useMemberAreaMutations. Preservar: módulos/aulas (vídeo/texto/quiz/download), drip, enrollments, certificados.' },
  { key: 'conversar', title: 'Conversar (Inbox/CRM/Contatos/Anúncios/Autopilot/Canais)',
    scope: 'sun-conectar → ConversarScreen + CrmPanel + ConversationPanel + ContactPanel + OrderPanel + VendasPanel + AnunciosPanel + AutopilotPanel + AdCampaignPanel + ChannelOnboardingWizard (WhatsApp/Instagram/Facebook/TikTok/Email).',
    realHints: 'Reais: Inbox/CRM, Contatos, Anúncios (war room), Autopilot, onboarding de canais. Hooks: useContacts/useDeals/usePipelines/useCRMMutations. GAP: useAnuncios/ /api/anuncios NÃO existe (honest-empty ou criar proxy). Preservar: pipeline CRM, lead score/sentimento, autopilot eventos/follow-ups, ROAS de campanhas, lifecycle de canal.' },
  { key: 'consultar', title: 'Consultar (Carteira + Analytics)',
    scope: 'sun-carteira → WalletOverview + Saldo/Extrato/Saques/Antecipações + Vendas/Assinaturas/Abandonos/Estornos + modais de saque/antecipação.',
    realHints: 'Reais: KloelCarteira (CarteiraSaldoCard/ExtratoTable/Saque+WithdrawModal/TabAntecipacoes+AntecipateModal), Analytics (AnalyticsHeader + VendasTab/AssinaturasTab/AbandonosTab/EstornosTab +12). Hooks: useWallet*/analytics/useReports. DINHEIRO: centavos, append-only, sem float, sem valor fake. Preservar: saque/antecipação reais, extrato, relatórios.' },
  { key: 'node-taxonomy', title: 'Taxonomia de nós + conexões + textos (transversal)',
    scope: 'TODO node.type/label/subtitle/edge do grafo: nomes, hierarquia parent→child, o que cada conexão SIGNIFICA, copy de cada nó. Caçar incoerência e lixo legado de nomenclatura sidebar em TODOS os domínios. Avaliar se a taxonomia é intuitiva/BigTech.',
    realHints: 'buildGraph + build*NodesEdges + NODE_LABEL_KIND + NODE_BASE_SIZE no prototype. Avaliar densidade, legibilidade dos rótulos no canvas, zero-overlap, e se a árvore de nós conta a história certa do negócio.' },
  { key: 'design-system', title: 'Design-system global + estados + mobile/a11y/perf (transversal)',
    scope: 'Consistência BigTech entre TODOS os overlays: tokens (void/ember/Sora/JetBrains Mono, sem gradiente/emoji, raio<=6px), estados honestos (loading/empty/error/success) em cada tela, mobile (390px), acessibilidade (foco/aria/teclado), performance 60fps. Padronizar o que estiver inconsistente.',
    realHints: 'KLOEL_VISUAL_DESIGN_CONTRACT (protegido — seguir), design-tokens. Avaliar cada overlay contra o contrato visual e contra padrão BigTech (Linear/Vercel/Stripe-grade).' },
]

const SPEC_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    domain: { type: 'string' },
    specFile: { type: 'string' },
    nodesTraversed: { type: 'array', items: { type: 'string' } },
    capabilitiesToPreserve: { type: 'array', items: { type: 'string' } },
    legacyCruftToRemove: { type: 'array', items: { type: 'object', additionalProperties: true } },
    redesignDirectives: { type: 'array', items: { type: 'object', additionalProperties: true } },
    realScreenMapping: { type: 'array', items: { type: 'object', additionalProperties: true } },
    honestStates: { type: 'string' },
    chromeEvidence: { type: 'string' },
    externalBlocked: { type: 'array', items: { type: 'string' } },
    implementationOrder: { type: 'array', items: { type: 'string' } },
  },
  required: ['domain', 'specFile', 'capabilitiesToPreserve', 'redesignDirectives'],
}

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: { lens: { type: 'string' }, findings: { type: 'array', items: { type: 'string' } }, fixes: { type: 'array', items: { type: 'string' } }, verdict: { type: 'string' } },
  required: ['lens', 'verdict'],
}

log('Y-redesign fan-out: ' + DOMAINS.length + ' auditores de domínio percorrendo o graph no Chrome em paralelo')

phase('Audit')
const specs = (await parallel(DOMAINS.map(d => () => agent(
  'Você é AUDITOR DE REDESIGN do domínio "' + d.title + '" do KloelGraph. Objetivo: PERCORRER no Chrome cada nó/overlay/flow do seu domínio, PRESERVAR as capacidades reais, MATAR o lixo legado de sidebar, e especificar o REDESIGN BigTech de cada overlay. Você NÃO edita o prototype (implementação é serial depois) — você produz o SPEC.\n\n' +
  'MANDATO DO DONO:\n' + args.mandate + '\n\nJÁ FEITO (não refazer):\n' + args.status + '\n\n' +
  'PLAYBOOK DE MCPs (obrigatório usar TODOS):\n' + args.playbook + '\n\n' +
  'ALVO: worktree ' + args.worktree + ' · prototype ' + PROTO + ' · dev ' + DEV + '\n' +
  'SEU ESCOPO: ' + d.scope + '\nPistas reais: ' + d.realHints + '\n\n' +
  'TAREFA:\n' +
  '1. Chrome: navegue ' + DEV + ', abra o overlay de CADA nó do seu domínio (pointerdown+pointerup+click no aria-label "Abrir <Label>"), percorra TODAS as abas/seções/sub-nós/modais. Meça layout (getBoundingClientRect), leia textos, conte affordances. resize 1440x900 e 390x844. Capture evidência (chromeEvidence) e erros de console.\n' +
  '2. codegraph/gitnexus: localize o COMPONENTE REAL do repo do seu domínio e ENUMERE todas as capacidades que ele já entrega (capabilitiesToPreserve) — nada pode ser perdido.\n' +
  '3. Identifique o LIXO LEGADO de sidebar (legacyCruftToRemove): cada item com {o-que, onde file:line/nó, por-que-é-legado, o-que-fica-no-lugar}. (ex. do dono: aba "Afiliar-se" no topo de Produtos.)\n' +
  '4. redesignDirectives: para CADA overlay/tela do domínio, um diretriz BigTech CONCRETO e acionável {nó/tela, problema-atual, redesign (layout/hierarquia/spacing/copy/interação/estado), por-que-superior}. Use design de alto padrão (Linear/Vercel/Stripe-grade), simplicidade, intuição, bom gosto. Preserve capacidade, eleve a forma.\n' +
  '5. realScreenMapping: nó → componente/rota real → como entra no overlay (consome dados reais já fiados no eixo-D).\n' +
  '6. honestStates: como cada tela se comporta em loading/empty/error/success (sem backend agora = honest-empty).\n' +
  '7. ESCREVA tudo via atomic_create_file em ' + OUT + '/' + d.key + '.md (markdown rico, acionável, com file:line e specs por nó). Marque o que é EXTERNAL_BLOCKED (precisa backend).\n' +
  'Retorne o objeto estruturado (com specFile = o caminho escrito).',
  { label: 'audit:' + d.key, phase: 'Audit', schema: SPEC_SCHEMA }
)))).filter(Boolean)

log('Auditoria: ' + specs.length + '/' + DOMAINS.length + ' specs produzidos')

phase('Adversarial')
const LENSES = [
  { k: 'bigtech-taste', p: 'Lente BOM-GOSTO BIGTECH: leia os specs em ' + OUT + ' e o resultado no Chrome (' + DEV + '). Onde o redesign proposto ainda é mediano/genérico/"AI-slop" em vez de Linear/Vercel/Stripe-grade? Aponte cada tela que precisa de mais originalidade/refinamento/hierarquia, concreto.' },
  { k: 'legacy-cruft', p: 'Lente CAÇA-LIXO-LEGADO: vasculhe TODOS os specs + o prototype por resquícios de sidebar/telas-fixas que sobraram (abas, breadcrumbs, botões "voltar para X", navegação duplicada, textos que pressupõem menu lateral). O dono citou a aba Afiliar-se em Produtos como exemplo — ache TODOS os análogos. Liste {onde, por-que-legado, remoção}.' },
  { k: 'flow-coherence', p: 'Lente COERÊNCIA DE FLOW: o usuário consegue, só pelo graph, completar cada jornada ponta-a-ponta (criar produto, afiliar-se, dar aula, conversar/vender, sacar)? Onde um flow quebra, exige sair do graph, ou perde contexto? Onde dois domínios deveriam conectar e não conectam (ex. Vendas aparece em Carteira E em Conversar)? Liste gaps + conserto.' },
]
const reviews = (await parallel(LENSES.map(l => () => agent(
  'REVISOR ADVERSARIAL DE DESIGN (lente: ' + l.k + '). Use chrome-devtools em ' + DEV + ' para ver o estado real e leia os specs em ' + OUT + '.\n\n' + l.p + '\n\nSeja concreto e cite arquivo/nó/tela. Retorne {lens, findings, fixes, verdict=APROVADO|REPROVADO}.',
  { label: 'review:' + l.k, phase: 'Adversarial', schema: REVIEW_SCHEMA }
)))).filter(Boolean)

log('Revisão de design: ' + reviews.length + ' lentes')

phase('Synthesize')
const plan = await agent(
  'SÍNTESE: consolide os ' + specs.length + ' specs de domínio + as ' + reviews.length + ' revisões adversariais num plano de IMPLEMENTAÇÃO SERIAL único, ordenado e acionável, que EU (loop principal) vou executar via atomic-edit no KloelGraphPrototype.jsx.\n\n' +
  'SPECS:\n' + JSON.stringify(specs, null, 2).slice(0, 60000) + '\n\nREVISÕES:\n' + JSON.stringify(reviews, null, 2).slice(0, 20000) + '\n\n' +
  'Escreva via atomic_create_file em ' + OUT + '/_IMPLEMENTATION_PLAN.md:\n' +
  '- Lista priorizada de mudanças (cada uma: domínio, nó/tela, ação concreta, file:line-âncora, gate de verificação no Chrome).\n' +
  '- Primeiro o lixo legado a remover (rápido, alto impacto), depois o redesign por overlay, depois polish transversal (design-system/mobile/a11y).\n' +
  '- O que é implementável agora (sem backend) vs EXTERNAL_BLOCKED.\n' +
  'Retorne {sliceCount, artifactsWritten:[...absolutos], blockers:[...], summary}.',
  { label: 'synthesize', phase: 'Synthesize', schema: { type: 'object', additionalProperties: true, properties: { sliceCount: { type: 'number' }, artifactsWritten: { type: 'array', items: { type: 'string' } }, blockers: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['artifactsWritten', 'summary'] } }
)

return {
  domainsAudited: specs.length,
  reviews: reviews.length,
  reprovado: reviews.filter(r => r && /REPROV/i.test(r.verdict || '')).length,
  artifactsWritten: plan.artifactsWritten,
  blockers: plan.blockers,
  summary: plan.summary,
}
