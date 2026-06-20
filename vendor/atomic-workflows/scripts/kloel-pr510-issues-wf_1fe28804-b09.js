export const meta = {
  name: 'kloel-pr510-issues',
  description: 'Resolve the 9 open issues with real code or evidence-based closure',
  phases: [{ title: 'Resolve', detail: '7 agents across the 9 issues' }],
}

const REPORT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['resolved-code', 'resolved-evidence', 'partial', 'blocked'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    whatChanged: { type: 'string' },
    validation: { type: 'string' },
    closureComment: { type: 'string' },
  },
  required: ['status', 'filesChanged', 'whatChanged', 'validation', 'closureComment'],
}

const COMMON = `Repo: /Users/danielpenin/kloel (branch do PR 510). Outra sessão commita em paralelo — mudanças mínimas, só no seu escopo, NÃO commite, NÃO comente/feche issues no GitHub (o orquestrador faz). Leia a issue com: gh issue view <N> -R danielgonzagat/Kloel. Valide com evidência colada. Backend: jest + npm run typecheck. Worker: vitest + npm run typecheck. closureComment = comentário de fechamento pronto (pt-BR, com evidência e SHAs/arquivos) que o orquestrador postará. Retorne SÓ o sumário estruturado.`

const TASKS = [
  {
    key: 'i413-prisma-pool',
    prompt: `${COMMON}
ISSUE #413 [prod-debt] Prisma connection pool exhaustion: 7 services "Too many database connections opened" daily. RESOLVA DE VERDADE:
1. Leia a issue. Encontre a configuração real de PrismaClient no backend e worker (PrismaService, datasource url, connection_limit/pool_timeout params).
2. Diagnostique: múltiplos PrismaClient instanciados? connection_limit ausente (default = num_cpus*2+1 por instância)? scripts/jobs criando clients próprios?
3. Implemente o fix canônico: connection_limit + pool_timeout parametrizados via env com defaults seguros aplicados ao datasource URL em UM ponto canônico por runtime (backend PrismaService, worker prisma provider), e elimine instanciamentos duplicados provados.
4. Spec cobrindo a construção da URL com limites. Valide: typechecks + jest/vitest direcionados.`,
  },
  {
    key: 'i412-stripe-guard',
    prompt: `${COMMON}
ISSUE #412 [prod-debt] Stripe em modo teste (sk_test_*) bloqueando cobranças reais. A troca da chave é operacional (do Daniel), mas o CÓDIGO pode impedir o estado silencioso:
1. Leia a issue e o bootstrap do Stripe no backend (StripeService/config).
2. Implemente guarda de ambiente: em NODE_ENV=production (ou RAILWAY_ENVIRONMENT=production), se STRIPE_SECRET_KEY começa com sk_test_, logar erro estruturado stripe_test_key_in_production e (a) bloquear cobranças reais com mensagem clara OU (b) no mínimo alarme persistente — escolha o que o código atual suporta sem quebrar dev/test.
3. Spec cobrindo: produção+sk_test => guarda dispara; dev+sk_test => silêncio; produção+sk_live => silêncio.
4. closureComment deve dizer explicitamente que o swap da chave live continua pendente do Daniel (operacional).`,
  },
  {
    key: 'i423-spec-lint',
    prompt: `${COMMON}
ISSUE #423 [testing-debt] Wave L3+L4 spec drafts (auth + KYC + Stripe webhooks) precisam de lint hardening. RESOLVA DE VERDADE:
1. Leia a issue para identificar os specs exatos.
2. Rode o eslint do backend neles, corrija TODAS as violações (sem desabilitar regras; ajuste o código dos specs).
3. Rode os specs corrigidos (jest) e o guard: node scripts/ops/run-eslint-seatbelt.mjs --frozen se aplicável.`,
  },
  {
    key: 'i421-coverage-p0',
    prompt: `${COMMON}
ISSUE #421 [coverage] 12 arquivos P0 sem teste / 56% média ponderada. Ataque máximo realista:
1. Leia a issue, extraia a lista dos 12 P0.
2. Verifique quais JÁ ganharam testes desde a abertura (git log dos arquivos; a sessão acumulada adicionou dezenas de specs). Liste DONE vs FALTA com evidência.
3. Para os 3-4 P0 restantes de maior risco SEM teste: escreva specs reais cobrindo os caminhos principais (não smoke vazio).
4. Valide: jest direcionado verde. closureComment com a tabela DONE/FALTA e por que os restantes (se houver) ficam para a próxima onda.`,
  },
  {
    key: 'i422-godmodule',
    prompt: `${COMMON}
ISSUE #422 [architecture] KLOEL god-module split readiness (K3 autópsia parcial). A sessão acumulada PRODUZIU a prontidão pedida:
1. Leia a issue (o que K3 pedia exatamente).
2. Verifique no repo: docs/architecture/CANONICAL_DOMAINS_2026-06-10.md (16 domínios, 13 vazamentos mapeados incl. 26 controllers de comércio dentro do kloel/, dois WalletService), SERVICE_CATALOG_2026-06-10.md, WHATSAPP_DISSOLUTION_PLAN.md, MIND_UNIFICATION_PLAN.md — confronte item a item com o que a issue pede; aponte lacunas reais se existirem.
3. Se faltar algo pequeno e concreto (ex.: tabela de prontidão go/no-go por fatia), escreva docs/architecture/KLOEL_SPLIT_READINESS_2026-06-10.md consolidando.
4. closureComment: mapa issue-pedido -> artefato-entregue com paths.`,
  },
  {
    key: 'i418-419-debt',
    prompt: `${COMMON}
ISSUES #418 (stub inventory K6: 47 itens/~116h) e #419 (K4: 5 melhorias ROI + 10 quick wins). Ataque honesto:
1. Leia as duas issues, extraia as listas.
2. Para cada item, verifique o estado ATUAL no código (muita coisa pode ter sido fechada pelas ondas acumuladas — prove com paths/commits).
3. Implemente os quick-wins de #419 que forem ≤30min cada e zero-risco (ex.: configs, headers, índices óbvios) — máximo 4, com validação.
4. closureComment para CADA issue: tabela item->status(FECHADO com evidência | ABERTO com estimativa), e o que esta onda fechou. Se a maioria seguir aberta, status='partial' e o comentário recomenda manter a issue aberta com checklist atualizado.`,
  },
  {
    key: 'i414-420-ops',
    prompt: `${COMMON}
ISSUES #414 (rotacionar credenciais expostas na sessão de 20-21/05) e #420 (roadmap 10x K5). São operacionais/estratégicas — produza o máximo verificável:
1. #414: leia a issue; verifique no repo ATUAL (HEAD) que nenhum dos segredos citados permanece em código/তconfigs versionados (rg pelos identificadores/prefixos citados SEM imprimir valores); verifique se .env* estão gitignored. closureComment: o que foi verificado limpo no repo + lista do que SÓ o Daniel pode rotacionar (provedores), recomendando manter aberta até rotação confirmada -> status='partial'.
2. #420: leia a issue; confronte os 4 eixos (broadcast/voice/interactive/cognitive audit) com o que JÁ existe no código hoje (campaigns/broadcast, voice/, interactive?, mind observability) com paths; closureComment com o estado real por eixo e o delta restante. status='resolved-evidence' se a issue pedia o levantamento, senão 'partial'.`,
  },
]

phase('Resolve')
const results = await Promise.all(
  TASKS.map(t =>
    agent(t.prompt, { label: t.key, phase: 'Resolve', schema: REPORT })
      .then(r => ({ key: t.key, ...(r || {}) }))
      .catch(e => ({ key: t.key, status: 'blocked', error: String(e).slice(0, 200) })),
  ),
)
return results