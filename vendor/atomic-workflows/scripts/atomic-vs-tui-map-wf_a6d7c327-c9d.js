export const meta = {
  name: 'atomic-vs-tui-map',
  description: 'Mapear exaustivamente a superfície do atomic-edit vs a TUI nativa em 8 frentes, com evidência file:line',
  phases: [
    { title: 'Mapear', detail: '8 leitores paralelos sobre o código do atomic-edit' },
    { title: 'Sintetizar', detail: 'matriz de paridade + fila ranqueada' },
  ],
}

const ROOT = 'scripts/mcp/atomic-edit'

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'síntese de 3-6 frases do estado atual desta frente' },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          evidence: { type: 'string', description: 'file:line exato + trecho curto' },
        },
        required: ['claim', 'evidence'],
      },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gap: { type: 'string', description: 'o que falta vs a TUI nativa' },
          attachPoint: { type: 'string', description: 'file:line onde a implementação se encaixaria' },
          difficulty: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
        },
        required: ['gap', 'attachPoint', 'difficulty'],
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'facts', 'gaps', 'risks'],
}

const COMMON = `Você é um leitor de código read-only no repo /Users/danielpenin/kloel. NÃO modifique nada. O alvo é ${ROOT}/ (arquivos .ts na raiz desse dir; ignore node_modules/dist). Contexto da missão: o servidor MCP "atomic-edit" (83+ tools, edição por mutação provada, envelope no-bypass) precisa cobrir TUDO que a TUI nativa do Claude Code faz — orquestração de subagentes/workflows paralelos, navegação web, browser automation, skills, edição de qualquer formato de arquivo — só que MELHOR (com prova/receipt/rollback). Sua frente é UMA fatia desse mapa. Responda com evidência file:line REAL (abra os arquivos, não chute). Seja exaustivo na sua fatia.`

phase('Mapear')

const FRONTS = [
  {
    key: 'inventario',
    prompt: `${COMMON}
FRENTE 1 — INVENTÁRIO DE TOOLS + REGISTRO. Enumere TODAS as tools registradas pelo servidor (procure nos server-tools-*.ts por registrações; identifique o mecanismo de registro/registry e onde as tools são montadas no servidor MCP). Liste: nome da tool, arquivo:linha da registração, 1 linha do que faz. Identifique também: como uma NOVA tool é adicionada (qual arquivo precisa mudar, existe um padrão de shard?), e se há limite/validação de schema. Inclua as tools espelhadas (mirror das 83) e onde esse espelhamento é definido.`,
  },
  {
    key: 'locks',
    prompt: `${COMMON}
FRENTE 2 — SUBSISTEMA DE LOCKS. Leia ${ROOT}/server-helpers-product-locks.ts e qualquer outro arquivo de lock (grep por lock). Documente: formato do lock file (.atomic-edit-locks?), semântica de heartbeat (existe expiração por staleness? TTL? lease?), como atomic_lock_acquire/release/status funcionam, como o expand_self e os writes verificam locks (enforcement real ou advisory?), o que acontece com lock cujo heartbeat parou há 7h (caso real: frontId atomic-edit-darwin-godel-thread, owner codex-gpt5, heartbeat 2026-06-09T19:18Z). Há mecanismo de steal/expire? Onde exatamente (file:line) entraria um lease TTL com expiração automática? Há locks de leitura vs escrita? Locks por subtree?`,
  },
  {
    key: 'exec-rede',
    prompt: `${COMMON}
FRENTE 3 — EXEC/SANDBOX/REDE. Leia ${ROOT}/server-tools-exec.ts, atomic-exec-broker*.mjs, e o que mais tocar sandbox. Documente: a arquitetura broker host-launched, classificação de comandos (read-only vs proveEffect), POR QUE rede é negada (file:line da política), onde uma capability de rede read-only gateada (fetch com receipt: URL+sha256+redaction+ledger) poderia se encaixar sem quebrar a doutrina fail-closed. Existe algum caminho de rede hoje (o chrome_devtools bridge usa rede?)? Como o broker decide o sandbox-exec profile?`,
  },
  {
    key: 'browser',
    prompt: `${COMMON}
FRENTE 4 — PONTE CHROME-DEVTOOLS. Leia ${ROOT}/server-tools-chrome-devtools.ts inteiro. Documente: como chrome_devtools_call/list_tools/reset funcionam (proxy para o MCP chrome-devtools? spawn próprio? CDP direto?), que tools do chrome-devtools ficam acessíveis, que evidência/receipt é produzida por chamada, o que falta vs o conjunto claude-in-chrome (navigate, find, form_input, get_page_text, gif_creator, read_console, read_network, computer/screenshot) e vs chrome-devtools MCP (lighthouse, performance trace, heapsnapshot). Como ativar a ponte (precisa Chrome rodando com CDP? launcher?).`,
  },
  {
    key: 'universal',
    prompt: `${COMMON}
FRENTE 5 — MOTOR UNIVERSAL + TETO DE DECIDIBILIDADE. Leia ${ROOT}/engine-universal.ts, engine-universal-*.ts, lang-bridge.ts, native-bridge.ts e onde validate decide gramática por extensão (grep extToGrammar / extensão). Documente: as 12 linguagens WASM atuais e SE css/html/sql estão noutra bateria; o caminho de validação de um write (quem chama validate, o que acontece com extensão desconhecida — recusa? byte-floor?); onde está o "teto de decidibilidade" na prática (file:line das recusas); que formatos hoje são INEDITÁVEIS pelo atomic e por quê; onde encaixar camadas: sonda estrutural (yaml/toml/md parse), verificação de header binário, e piso byte-exato universal com receipt para formato arbitrário.`,
  },
  {
    key: 'expand-self',
    prompt: `${COMMON}
FRENTE 6 — MECÂNICA EXPAND_SELF + LATTICE. Leia ${ROOT}/server-helpers-self-expansion.ts e gates/ (liste os gates). Documente: o fluxo completo de atomic_expand_self (janela de admissão, monotonicidade de capacidade, lattice de validadores — cite cada validador e file:line), restrições conhecidas (replace_text precisa newText⊇oldText OU proofOfIncorrectness — confirme no código), como tools NOVAS foram adicionadas historicamente (olhe self-evolution-archive.jsonl, últimas ~10 entradas: que intents, que arquivos), e quanto tempo/custo um expand_self típico leva (o lattice roda build completo?). Também: o expand_self verifica locks de outros agentes antes de aplicar?`,
  },
  {
    key: 'build-flaky',
    prompt: `${COMMON}
FRENTE 7 — BUILD/DIST FRESHNESS FLAKY. Leia ${ROOT}/build.mjs, dist-freshness.mjs, server-helpers-hot-reload.ts, server-hot-reload.proof.mjs. Documente: como o build é disparado (quem chama build.mjs? o dispatch verifica freshness a cada call?), a janela de corrida conhecida (dist flaky no meio de uma sequência de expand_self — root-cause provável: build concorrente? dist parcialmente escrito? cache?), existe mutex/lockfile de build?, onde (file:line) entraria serialização de build + retry automático. Procure também processos/arquivos temporários órfãos (.atomic-exec-sandbox-*, atomic-behavior-gate-*) que indiquem crashes no meio do build.`,
  },
  {
    key: 'orquestracao',
    prompt: `${COMMON}
FRENTE 8 — GAP DE ORQUESTRAÇÃO + SKILLS. Grep no ${ROOT} por agent/workflow/parallel/queue/job/scheduler/skill. Documente: existe HOJE alguma primitiva de orquestração (fan-out, fila de jobs, sessões paralelas — olhe atomic_session_*, atomic_transaction, server-tools-dispatch.ts)? Como atomic_transaction e as sessions funcionam (são a base de um scheduler?)? Existe algo sobre skills (SKILL.md, manifest)? Para o design: o que o atomic precisaria para (a) executar N jobs atomic_exec em paralelo com receipts agregados e rollback conjunto, (b) registrar/carregar skills com verificação de hash, (c) coordenar múltiplos agentes LLM concorrentes (os locks são a única primitiva hoje?). Aponte attach points file:line.`,
  },
]

const maps = await parallel(FRONTS.map(f => () =>
  agent(f.prompt, { label: `map:${f.key}`, phase: 'Mapear', schema: MAP_SCHEMA })
))

phase('Sintetizar')

const byKey = {}
FRONTS.forEach((f, i) => { byKey[f.key] = maps[i] })

const synthesis = await agent(`Você é o arquiteto-sintetizador. Abaixo estão 8 mapas (JSON) do servidor MCP atomic-edit, um por frente. Produza:
1. MATRIZ DE PARIDADE: para cada capacidade da TUI nativa do Claude Code (Bash, Read/Write/Edit, Glob/Grep, Agent/subagentes paralelos, Workflow, WebFetch, WebSearch, Skills, browser automation claude-in-chrome, chrome-devtools MCP, TodoList/Tasks, notebooks) — o que o atomic JÁ cobre (com a evidência dos mapas), o que cobre PARCIALMENTE, o que NÃO cobre.
2. FILA RANQUEADA de implementação para fechar 100% dos gaps, cada item com: attach point file:line (dos mapas), dificuldade, dependências entre itens, e qual vantagem ATÔMICA (prova/receipt/rollback) o item entrega que a TUI nativa NÃO tem.
3. RISCOS/CONFLITOS: lock do codex-gpt5, doutrina fail-closed vs rede, custo do lattice por expand_self.
Seja concreto e completo. NÃO modifique nada.

MAPAS:
${JSON.stringify(byKey, null, 2).slice(0, 180000)}`, { label: 'sintese', phase: 'Sintetizar' })

return { maps: byKey, synthesis }