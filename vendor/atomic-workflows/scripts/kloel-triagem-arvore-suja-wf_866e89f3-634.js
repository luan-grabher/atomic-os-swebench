export const meta = {
  name: 'kloel-triagem-arvore-suja',
  description: 'Triagem read-only dos 168 itens sujos: lotes commitáveis, lixo, segredos',
  phases: [{ title: 'Triagem', detail: '6 analistas em paralelo sobre grupos disjuntos do diff' }],
}

const SCHEMA = {
  type: 'object',
  properties: {
    batches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          commitHeader: { type: 'string', description: 'conventional commit, max 100 chars' },
          rationale: { type: 'string' },
          coherent: { type: 'boolean', description: 'true se o trabalho parece completo e commitável' },
          risk: { type: 'string' },
        },
        required: ['name', 'files', 'commitHeader', 'rationale', 'coherent'],
      },
    },
    exclude: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          reason: { type: 'string' },
          action: { type: 'string', enum: ['gitignore', 'delete', 'leave-uncommitted', 'ask-daniel'] },
        },
        required: ['path', 'reason', 'action'],
      },
    },
    secretsFound: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['batches', 'exclude', 'secretsFound', 'notes'],
}

const COMMON = `
CONTEXTO: repo /Users/danielpenin/kloel, branch feat/kloel-honest-completion-20260609. Há trabalho acumulado não commitado de várias sessões-máquina. tsc backend e frontend = 0 erros. O padrão da branch é commits "integrate accumulated machine work" por lotes coerentes.

FERRAMENTAS (obrigatório): o Bash nativo é bloqueado por hook para comandos não-git. Carregue PRIMEIRO via ToolSearch query "select:mcp__atomic-edit__atomic_exec,mcp__atomic-edit__atomic_read_file,mcp__atomic-edit__atomic_grep". Use atomic_exec para comandos read-only (git diff/show/log, ls, du, file, wc) — eles passam sem proveEffect. Se um comando for recusado como "mutable-or-unknown", re-rode com proveEffect:true e effectRoot ".atomic-scratch". NÃO EDITE NADA — você é read-only.

SUA TAREFA: para o grupo de arquivos abaixo, (1) rode git diff -- <arquivo> (ou git status/ls para untracked; para untracked leia o conteúdo) e caracterize cada mudança; (2) julgue coerência: trabalho completo e commitável vs. WIP quebrado vs. lixo/debris; (3) procure perigos: segredos/tokens/API keys hardcoded, console.log de debug esquecido, código comentado, paths absolutos de máquina; (4) agrupe em LOTES de commit coerentes (tema único por lote) com header conventional-commit <=100 chars (ex.: "feat(mind): ...", "test(kloel): ...", "chore(mcp): ..."); (5) liste o que NAO deve ser commitado em exclude com ação (gitignore/delete/leave-uncommitted/ask-daniel). Em secretsFound, liste APENAS o path+linha (NUNCA ecoe o valor do segredo). Seja decisivo: o objetivo é proteger trabalho real via commit e descartar lixo.`

const GROUPS = [
  {
    key: 'kloel-core',
    files: `MODIFICADOS (tracked):
backend/src/common/shared-ledger.replay.spec.ts
backend/src/kloel/guest-chat.action-intent.helpers.spec.ts
backend/src/kloel/guest-chat.format-tool-result.helpers.ts
backend/src/kloel/kloel-composer.service.helpers.ts
backend/src/kloel/kloel-composer.service.spec.ts
backend/src/kloel/kloel-stream-events.spec.ts
backend/src/kloel/kloel-stream-events.ts
backend/src/kloel/kloel-stream-writer.spec.ts
backend/src/kloel/kloel-stream-writer.ts
backend/src/kloel/kloel-thinker-think.helpers.ts
backend/src/kloel/kloel-thinker.service.composer.spec.ts
backend/src/kloel/kloel-thinker.service.spec.ts
backend/src/kloel/kloel-thread.helpers.spec.ts
backend/src/kloel/kloel-thread.helpers.ts
backend/src/kloel/kloel-thread.service.spec.ts
backend/src/kloel/kloel.controller.ts
backend/src/kloel/ledger-balance-after-backfill.service.spec.ts
backend/src/kloel/manifest/capability-manifest.builder.ts
backend/src/kloel/money-cutover-bootstrap.service.spec.ts
backend/src/kloel/wallet-anticipation-backfill.service.spec.ts
backend/src/kloel/wallet-anticipation-backfill.service.ts
backend/src/kloel/wallet.anticipation.dualwrite.spec.ts
backend/src/kloel/wallet.anticipation.read.spec.ts`,
  },
  {
    key: 'mind',
    files: `MODIFICADOS (tracked):
backend/src/kloel/mind/aliases/mind-cutover-bootstrap.service.spec.ts
backend/src/kloel/mind/aliases/mind-memory-backfill.service.spec.ts
backend/src/kloel/mind/aliases/mind-memory-backfill.service.ts
backend/src/kloel/mind/aliases/mind-message-backfill.service.spec.ts
backend/src/kloel/mind/aliases/mind-message-backfill.service.ts
backend/src/kloel/mind/aliases/mind-message.service.ts
backend/src/kloel/mind/coordination/commerce-outcome-learner.service.ts
backend/src/kloel/mind/coordination/mind-event-ingestor.service.spec.ts
backend/src/kloel/mind/coordination/mind-runtime.helpers.spec.ts
backend/src/kloel/mind/coordination/mind-runtime.helpers.ts
backend/src/kloel/mind/coordination/percept-emit.factory.spec.ts
backend/src/kloel/mind/memory/memory-graph.types.ts
backend/src/kloel/mind/memory/memory.service.retrieval.ts
backend/src/kloel/mind/memory/memory.service.spec.helpers.ts
backend/src/kloel/mind/memory/memory.service.spec.ts
backend/src/kloel/mind/memory/memory.service.ts
backend/src/kloel/mind/mind-cognitive-consolidation.helper.ts
backend/src/kloel/mind/mind.spec.ts
backend/src/kloel/mind/self-evolution/mind-self-modification.service.ts
backend/src/kloel/mind/self-evolution/mind-self-modification.widen.spec.ts
backend/src/kloel/mind/self-model/mind-self-model.service.spec.ts
NOTA: memory.service.ts tem o maior diff (179+/175-). Eu (orquestrador) já removi um import morto de Prisma em mind-message-backfill.service.ts — isso faz parte do diff atual e é correto.`,
  },
  {
    key: 'marketing-e-debris-raiz',
    files: `MODIFICADOS (tracked):
backend/src/marketing/channel-message-dispatch.helpers.ts
backend/src/marketing/channels/whatsapp/inbound-catchup-percept-guard.spec.ts
backend/src/marketing/channels/whatsapp/inbound-processor.inline-autopilot.ts
DEBRIS A AVALIAR (untracked, na RAIZ do repo — inspecione conteúdo com ls/du e julgue):
020dfc8e2d25052abd5482ce6f8f732e/ 035dda89d0755306026f2d9419159853/ 0c85319dd0a5e1c62c34f441c42ce82b/ 11e4001ba07859031343006fa292af9c/ 126265aca8f4221b8836dd22b5c86004/ 1478c11b843ac9dce0ecab551f034ddf/ 1bc08325e1f3fa2acc9d447fa5932c95/ 1cd8e2ceec87de20d9a842282afac44c/ 29f550f5c86c29b66287c31758b6c7eb/ 45ec04a3087f824e16ce9e71027f13f2/ 4fada9c987f810751a3703ad070b0574/ 5790c37a299b499657c0eaec3d187f98/ 5d406ffa3ef1e36be83c02c976c1772a/ 909073dea1f127d9cf0eb420813fc5b9/ 91cc78563e12f0865516f054c94739e6/ EJEuuTQj7eFOh1Q-jIeEO/ a4c72c2703af0767607634441c856ca9/ dc581a4cbf2031fc548debcd0a487415/ fb1804aba414bbc9c74cd02f8db25250/`,
  },
  {
    key: 'frontend',
    files: `MODIFICADOS (tracked):
frontend/src/components/kloel/AgentConsole.tsx
frontend/src/components/kloel/AgentConsole.types.ts
frontend/src/components/kloel/dashboard/KloelDashboard.message.helpers.spec.ts
frontend/src/components/kloel/dashboard/KloelDashboard/useBrainRouter.ts
frontend/src/components/kloel/dashboard/KloelDashboardSendMessage.ts
frontend/src/components/kloel/dashboard/KloelDashboardView.test.tsx
frontend/src/components/kloel/dashboard/ReasoningTimeline.test.tsx
frontend/src/components/kloel/dashboard/ReasoningTimeline.tsx
frontend/src/components/kloel/graph/KloelGraphShell.spec.tsx
frontend/src/components/kloel/memory/MemoryGraphView.test.tsx
frontend/src/components/kloel/memory/MemoryGraphView.tsx
frontend/src/lib/__tests__/kloel-message-ui-trace.test.ts
frontend/src/lib/__tests__/kloel-message-ui.test.ts
frontend/src/lib/__tests__/kloel-stream-events.test.ts
frontend/src/lib/api/memory-graph.ts
frontend/src/lib/kloel-message-metadata.ts
frontend/src/lib/kloel-message-reasoning.ts
frontend/src/lib/kloel-message-sanitize.ts
frontend/src/lib/kloel-message-trace.ts
frontend/src/lib/kloel-stream-events.ts
DEBRIS A AVALIAR (untracked): frontend/.atomic-test-tmp/`,
  },
  {
    key: 'atomic-edit',
    files: `MODIFICADOS (tracked):
scripts/mcp/atomic-edit/.gitignore
scripts/mcp/atomic-edit/atomic-exec-broker.mjs
scripts/mcp/atomic-edit/dist-freshness.mjs
scripts/mcp/atomic-edit/gates/compiled-mcp-y-certificate.proof.mjs
scripts/mcp/atomic-edit/gates/dist-freshness.proof.mjs
scripts/mcp/atomic-edit/gates/positive-byte-materializer.proof.mjs
scripts/mcp/atomic-edit/gates/self-expansion-replace-text.proof.mjs
scripts/mcp/atomic-edit/gates/self-expansion-validator-lattice.proof.mjs
scripts/mcp/atomic-edit/gates/type-soundness-gate.proof.mjs
scripts/mcp/atomic-edit/gates/whole-host-y-certificate.proof.mjs
scripts/mcp/atomic-edit/gates/y-certificate-mandatory-domains.proof.mjs
scripts/mcp/atomic-edit/server-tools-chrome-devtools.ts
scripts/mcp/atomic-edit/server-tools-positive-bytes.ts
scripts/mcp/atomic-edit/server-tools-self.ts
scripts/mcp/atomic-edit/server-tools-y.ts
scripts/mcp/atomic-edit/server.ts
scripts/mcp/chrome-devtools-cdp-browser.sh
NOVOS (untracked):
scripts/mcp/atomic-edit/gates/self-evolution-harness.proof.mjs
scripts/mcp/atomic-edit/gates/self-evolution-mcp-tool.proof.mjs
scripts/mcp/atomic-edit/self-evolution-harness.mjs
scripts/mcp/atomic-edit/server-tools-self-evolution.ts
DELETADOS (tracked, working tree): tmp/last60-edit-deletion-audit.md, tmp/last60-full-worker-audit/README.md
DEBRIS NA RAIZ (untracked): .atomic-algebra.err .atomic-algebra.out .atomic-compiled-current.err .atomic-compiled-current.out .atomic-compiled-proof.err .atomic-compiled-proof.out .atomic-self-current.err .atomic-self-current.out .atomic-self-evolution-proof.err .atomic-self-evolution-proof.out .atomic-self-expansion-lattice.err .atomic-self-expansion-lattice.out .atomic-self-expansion-lattice2.err .atomic-self-expansion-lattice2.out .atomic-type-old-json.err .atomic-type-old-json.out .atomic-type-soundness.err .atomic-type-soundness.out
NOTA: o .gitignore modificado (+23 linhas) provavelmente já cobre parte desse debris — verifique com git check-ignore.`,
  },
  {
    key: 'mcp-fleet',
    files: `NOVOS (untracked) — frota MCP inteira. Inspecione cada um (conteúdo dos .sh/.mjs; para diretórios: ls -R, tamanho com du -sh, presença de node_modules):
scripts/mcp/check-stripe-mcp.sh
scripts/mcp/check-stripe-stack.sh
scripts/mcp/codacy-mcp-launcher.sh
scripts/mcp/codebody-navigator-mcp/
scripts/mcp/codecov-mcp-launcher.sh
scripts/mcp/codecov-mcp-server.mjs
scripts/mcp/cognitive-hub-mcp-launcher.sh
scripts/mcp/cognitive/
scripts/mcp/dap-bridge-mcp-launcher.sh
scripts/mcp/datadog-mcp-launcher.sh
scripts/mcp/github-mcp-launcher.sh
scripts/mcp/gitnexus-mcp-launcher.sh
scripts/mcp/graphify-plus-mcp/
scripts/mcp/kaisser-mcp/
scripts/mcp/kloel-os-mcp/
scripts/mcp/lsp-mesh-mcp-launcher.sh
scripts/mcp/mcp-suite-child-runtime.mjs
scripts/mcp/mcp-suite-command-runtime.mjs
scripts/mcp/mcp-suite-postgres-runtime.mjs
scripts/mcp/mcp-suite-runtime.mjs
scripts/mcp/mcp-suite-server.mjs
scripts/mcp/mcp-suite-task-runtime.mjs
scripts/mcp/mcp-suite-tool-handlers.mjs
scripts/mcp/mcp-suite-toolsets.mjs
scripts/mcp/mercadopago-mcp-launcher.sh
scripts/mcp/obsidian-mcp-launcher.sh
scripts/mcp/postgres-mcp/
scripts/mcp/pulse-mcp/
scripts/mcp/railway-mcp-launcher.sh
scripts/mcp/saas-compiler-mcp/
scripts/mcp/sentry-bridge-mcp/
scripts/mcp/sentry-mcp-launcher.sh
scripts/mcp/smoke-stdio-transport-modes.mjs
scripts/mcp/stripe-mcp-launcher.sh
scripts/mcp/task-graph-mcp/
scripts/mcp/test-runner-mcp/
scripts/mcp/vercel-mcp-launcher.sh
scripts/mcp/wrap-cl-to-nl.mjs
tools/cognitive-hub/
tools/lsp-mesh/
ATENCAO ESPECIAL: launchers de servicos (stripe, datadog, github, sentry, railway, vercel, mercadopago, obsidian, codacy, codecov) frequentemente embutem tokens — varra com atomic_grep por padroes de credencial (sk_live, sk_test, ghp_, dd-api, Bearer, api[_-]?key, token=, password). Se um arquivo embute segredo REAL → exclude com action ask-daniel e liste em secretsFound (path+linha, NUNCA o valor). Verifique tambem se diretorios contem node_modules (nao commitar; propor gitignore).`,
  },
]

phase('Triagem')
log('Disparando 6 analistas read-only sobre grupos disjuntos do diff')
const results = await parallel(
  GROUPS.map((g) => () =>
    agent(`${COMMON}\n\nGRUPO "${g.key}":\n${g.files}`, {
      label: `triagem:${g.key}`,
      phase: 'Triagem',
      schema: SCHEMA,
    }).then((r) => ({ group: g.key, ...r })),
  ),
)
const ok = results.filter(Boolean)
log(`Triagem concluída: ${ok.length}/6 grupos analisados`)
return { groups: ok }
