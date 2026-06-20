export const meta = {
  name: 'kloel-tudo-wave1',
  description: 'Recon + execução: render parity, janelas Mac, bugs P1/P2 de produção, raciocínio real, memória, residual de canonicalização',
  phases: [
    { title: 'Recon', detail: 'verificadores paralelos código-fundamentados por trilha' },
    { title: 'Executar', detail: 'implementação disjunta, sem commit, com testes' },
  ],
}

const FORBIDDEN = `ARQUIVOS PROIBIDOS (agente concorrente está editando — NÃO modifique nenhum deles):
- qualquer arquivo *.spec.ts atualmente modificado no git status
- backend/src/marketing/channels/whatsapp/whatsapp-session.service.ts e whatsapp.service.ts
- frontend/package.json, frontend/next.config.ts, frontend/tsconfig.json
- backend/test/mocks/bullmq.ts, .atomic/security-baseline.json
- scripts/mcp/atomic-edit/* 
Se sua correção EXIGIR tocar um desses, NÃO toque — reporte como 'blocked-collision' com o plano exato.`

const RECON_SCHEMA = {
  type: 'object',
  required: ['trackId', 'status', 'facts', 'plan'],
  properties: {
    trackId: { type: 'string' },
    status: { type: 'string', enum: ['already-done', 'actionable', 'partial', 'blocked', 'not-a-bug'] },
    facts: { type: 'array', items: { type: 'string' }, description: 'fatos verificados com file:line' },
    plan: { type: 'string', description: 'plano exato de execução com file:line, ou vazio' },
    files: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

const EXEC_SCHEMA = {
  type: 'object',
  required: ['trackId', 'outcome', 'summary', 'filesChanged', 'validation'],
  properties: {
    trackId: { type: 'string' },
    outcome: { type: 'string', enum: ['implemented', 'partial', 'blocked', 'skipped'] },
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string', description: 'comandos de teste/tsc rodados e resultados EXATOS' },
    pending: { type: 'string' },
  },
}

const COMMON = `Repo: /Users/danielpenin/kloel (branch feat/kloel-honest-completion-20260609). Backend NestJS + Prisma, frontend Next.js. Verifique TUDO no código atual — memórias/planos antigos estão obsoletos. Seja brutalmente honesto: se já está implementado de verdade, diga already-done; se a alegação de bug é falsa, diga not-a-bug. NUNCA proponha churn cosmético.`

const TRACKS = [
  {
    id: 'render-parity',
    recon: `${COMMON}
TRILHA render-parity (Movimento II Q1/Q2/Q3 — paridade de renderização Claude.ai no chat).
Estado conhecido: frontend/src/components/kloel/KloelMarkdown.tsx linha ~83 tem remarkPlugins={[remarkGfm, remarkKloelMath]} e linha ~185 tem branch language-mermaid. NÃO há deps katex/mermaid/remark-math no package.json.
Investigue:
1. O que é remarkKloelMath? (ache a implementação) — renderiza matemática DE VERDADE (LaTeX visual) ou é facade/placeholder que só estiliza texto cru?
2. O branch language-mermaid renderiza diagrama de verdade (client-side render) ou só mostra código/download card?
3. Inline HTML no corpo da resposta: existe rehype-raw ou equivalente sanitizado? Ou HTML aparece como texto?
4. Tabelas, código com highlight, SVG inline: confirme o que JÁ funciona.
Para cada gap REAL, dê o plano exato. IMPORTANTE: package.json é PROIBIDO (concorrente) — se precisar de dep nova, o plano deve dizer qual dep e o orquestrador instala; prefira soluções dependency-free de qualidade real (ex: render via CDN dynamic import é proibido? avalie o padrão do codebase). Cite file:line para tudo.`,
    exec: true,
  },
  {
    id: 'mac-windows',
    recon: `${COMMON}
TRILHA mac-windows (Movimento II Q4 — controles de janela estilo Mac).
Alvo: frontend/src/components/kloel/KloelGraphOverlay.tsx + KloelGraphShell.tsx (+ KloelGraphPendingOverlay.tsx extraído recentemente).
Requisito do Daniel: (a) substituir X de fechar por bolinha VERMELHA topo-esquerdo (hover→X aparece dentro, click→fecha); (b) bolinha VERDE topo-direito (hover→setas expand, click→fullscreen toggle); (c) redimensionamento do painel estilo macOS (expandir/contrair, mínimo→máximo sem quebrar design); (d) REMOVER lógica de fechar tela ao interagir com graph/pílula/navegação — telas só fecham por clique explícito no controle; (e) mobile = 1 tela por vez, vermelho fecha verde expande, sem multi-janela.
Verifique o estado ATUAL: o que já existe? Onde está o X atual? Onde está a lógica de auto-close (focusGalaxy? backdrop onClick?)? NUNCA tocar KloelGraphTheme.tsx / KloelGraphLiteralCanvas.tsx (imutáveis). Dê plano exato com file:line.`,
    exec: true,
  },
  {
    id: 'prod-bugs-frontend',
    recon: `${COMMON}
TRILHA prod-bugs-frontend (2 bugs P1 de produção, do assessment do PR488 — podem já ter sido corrigidos).
1. P1 auth-logout: a função getMe (procure em frontend/src/lib/auth.ts ou similar) supostamente NÃO usa o apiFetch com refresh-on-401 — um 401 derruba o usuário pra logout em vez de tentar refresh do token. Verifique se ainda é verdade.
2. P1 pending-approvals: KloelDashboardView supostamente deixou de renderizar PendingApprovalsStrip (aprovações pendentes invisíveis pro usuário). Procure PendingApprovalsStrip — existe? é importado/renderizado em algum lugar vivo?
Para cada um: still-exists (com file:line e plano de fix mínimo) ou already-fixed/not-a-bug (com prova).`,
    exec: true,
  },
  {
    id: 'prod-bugs-backend',
    recon: `${COMMON}
TRILHA prod-bugs-backend (3 bugs P2 de produção, do assessment do PR488 — podem já ter sido corrigidos).
1. kloel-thread.controller-helpers.ts: sanitizer supostamente corrompe metadata generatedSiteHtml/generatedImageUrl.
2. reports-orders.service.ts: filtro first-purchase aplicado DEPOIS da paginação → totais errados.
3. member-area: query de areaId não tratada (unhandled).
Para cada: verifique no código atual se ainda existe; se sim, plano de fix mínimo comportamento-preservante com file:line + qual spec cobre; se não, prova de que foi corrigido.`,
    exec: true,
  },
  {
    id: 'real-reasoning',
    recon: `${COMMON}
TRILHA real-reasoning (Movimento I — raciocínio real no chat, RECON APENAS, não execute).
Requisito: o balão de raciocínio do chat deve ser 100% movido por eventos reais (DeepSeek reasoning_content → reasoning_delta streaming; tool_use/tool_result reais na timeline; ZERO texto hardcoded tipo 'Analisando'/'Processando'/'Gerando'; sem typewriter sobre texto fixo; sem delay artificial).
Sabido: commits 72d0c6fe7/e86a8c454/6a86ffc31 (branch anterior) implementaram reasoning_content→reasoning_delta. Verifique NESTA branch:
1. grep gate: existe algum array de frases fake de raciocínio ou string literal de pensamento no frontend? (grep por 'Analisando', 'Processando', 'Pensando', arrays de frases em componentes de reasoning/thinking)
2. O backend emite reasoning_delta real do DeepSeek? (ache o adapter/stream)
3. O frontend renderiza streaming real? Qual componente? Tem fallback honesto quando o modelo não emite reasoning?
4. Tool steps na timeline são 1:1 com tool calls reais?
Reporte estado por gate com file:line + o que falta de verdade.`,
    exec: false,
  },
  {
    id: 'memory-canon-residual',
    recon: `${COMMON}
TRILHA memory-canon-residual (RECON APENAS).
1. Memória por usuário: confirme que remember() (kloel-thinker.service.ts ~155) e recall()→dynamicContext (kloel-workspace-context.service.ts ~179) seguem vivos nesta branch. O nó Memória/memory-graph no frontend: existe painel/nó de memória renderizado no Graph? (procure memory-graph, MemoryGraph, panel)
2. Canonicalização residual autonomous-safe: as memórias dizem 'esgotado', mas verifique 2 coisas concretas: (a) os 6 gates canônicos ainda passam? (rode node scripts/ops/check-canonical-mind-access.mjs se existir, e liste scripts/ops/check-*.mjs); (b) grep por TODO/FIXME novos em backend/src/kloel/mind/ que indiquem trabalho seguro pendente.
Reporte fatos com file:line, sem propor churn.`,
    exec: false,
  },
]

phase('Recon')
const results = await pipeline(
  TRACKS,
  t => agent(t.recon, { label: `recon:${t.id}`, phase: 'Recon', schema: RECON_SCHEMA }),
  (recon, track) => {
    if (!recon) return null
    if (!track.exec || (recon.status !== 'actionable' && recon.status !== 'partial')) {
      return { recon, exec: null }
    }
    return agent(
      `${COMMON}
Você é o EXECUTOR da trilha ${track.id}. Um verificador confirmou o trabalho. Fatos verificados:
${recon.facts.map(f => '- ' + f).join('\n')}

PLANO (re-verifique cada file:line antes de editar — a árvore pode ter mudado):
${recon.plan}

${FORBIDDEN}

REGRAS DE EXECUÇÃO:
- Mudanças mínimas, comportamento-preservante onde aplicável; qualidade de produção, não mock, não facade.
- NUNCA tocar frontend/src/components/kloel/KloelGraphTheme.tsx nem KloelGraphLiteralCanvas.tsx.
- NÃO commitar nada. NÃO rodar git add/commit. Apenas editar arquivos + validar.
- Valide: rode o typecheck do pacote tocado (cd frontend && npx tsc --noEmit, ou cd backend && npx tsc -p tsconfig.build.json) e os testes dos arquivos tocados (jest/vitest --run no spec relevante). Se o shell for bloqueado por hook exigindo atomic_exec, use a ferramenta mcp__atomic-edit__atomic_exec (carregue via ToolSearch select:mcp__atomic-edit__atomic_exec). Para jest use --reporters=default; para vitest use --pool=threads.
- Se um teste falhar por causa SUA, corrija; se falhar pré-existente, reporte sem mascarar.
Retorne o resultado estruturado com validação EXATA (comandos + exit codes + contagens de teste).`,
      { label: `exec:${track.id}`, phase: 'Executar', schema: EXEC_SCHEMA }
    ).then(exec => ({ recon, exec }))
  }
)

const out = results.filter(Boolean).map((r, i) => ({
  track: TRACKS[i] ? TRACKS[i].id : 'unknown',
  recon: r.recon,
  exec: r.exec,
}))
return out