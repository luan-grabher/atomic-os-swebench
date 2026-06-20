export const meta = {
  name: 'swarm-buildout',
  description: 'Enxame paralelo: gates de locks/tasks, registro das tools novas no server.mjs, README — superfície atomic-swarm',
  phases: [{ title: 'Construir', detail: '4 agentes paralelos com posse exclusiva de arquivos' }],
}

const COMMON = `Você trabalha no repo /Users/danielpenin/kloel, na superfície scripts/mcp/atomic-swarm/ (servidor MCP irmão do atomic-edit). REGRAS DURAS:
1. O hook 'atomic_exec-mandatory' BLOQUEIA Bash nativo para shell. Para rodar comandos use a tool MCP mcp__atomic-edit__atomic_exec (carregue-a com ToolSearch query "select:mcp__atomic-edit__atomic_exec"). Comandos que escrevem precisam de proveEffect:true e cwd 'scripts/mcp/atomic-swarm'.
2. Para criar/editar arquivos use as tools MCP mcp__atomic-edit__atomic_create_file / mcp__atomic-edit__atomic_replace_text (carregue via ToolSearch "select:mcp__atomic-edit__atomic_create_file,mcp__atomic-edit__atomic_replace_text"). atomic_replace_text exige oldText substring contígua de newText quando aditivo; remoções exigem proofOfIncorrectness (string com 20+ chars explicando por que os bytes removidos estavam errados).
3. TOQUE SOMENTE nos arquivos que sua tarefa designa — outros agentes têm posse dos demais.
4. NÃO faça git commit — o orquestrador commita.
5. Leia primeiro os módulos relevantes com mcp__atomic-edit__atomic_read_file (ToolSearch "select:mcp__atomic-edit__atomic_read_file") para casar com as convenções existentes.
Convenções dos gates existentes (veja gates/swarm-skills.proof.mjs como modelo): shebang node, fixture isolada via process.env.ATOMIC_SWARM_REPO_ROOT apontando para dir .proof-*-<pid> dentro de gates/, import dinâmico do módulo sob teste com query-string única para furar o cache de módulos, array results com record(name, ok, detail), saída --json {ok,total,failed,results}, exit 1 se falhou, cleanup em finally.`

phase('Construir')

const results = await parallel([
  () => agent(`${COMMON}

SUA TAREFA (posse exclusiva: scripts/mcp/atomic-swarm/gates/swarm-locks.proof.mjs):
Crie o gate de prova do módulo swarm-locks.mjs (leia-o primeiro). Casos obrigatórios:
1. lockAcquire cria o lock (mkdir anti-TOCTOU) com leaseMs clampado e heartbeatTimestampMs; segundo acquire do mesmo frontId é recusado (error.swarmRefusal === true).
2. lockStatus lista o lock com heartbeatAgeMs numérico e expired === false.
3. lockHeartbeat com owner errado é recusado; com owner certo renova heartbeatTimestampMs (valor maior ou igual, e o gate deve dormir alguns ms para garantir estritamente maior).
4. lockSteal com lease vivo é recusado (mensagem contém 'structurally impossible' ou 'still live').
5. Staleness sintético: reescreva o lock file diretamente via fs com heartbeatTimestampMs igual ao timestamp atual MENOS 7200000 (duas horas atrás — compute no código do gate) e leaseMs 60000; aí lockSteal SUCEDE, o novo record tem stolenFrom com o owner anterior, e o ledger .atomic/swarm-locks-ledger.jsonl (dentro da fixture) ganhou entrada tool='swarm_lock_steal' com priorRecord.
6. Lock legado: escreva record JSON sem leaseMs e sem heartbeatTimestampMs (só heartbeatAt ISO antigo): isExpired retorna null e lockSteal é RECUSADO (legacy nunca auto-expira).
7. lockRelease com owner errado recusado; com owner certo remove o dir.
Depois RODE o gate via atomic_exec {command:'node gates/swarm-locks.proof.mjs --json', cwd:'scripts/mcp/atomic-swarm', proveEffect:true, intent:'provar gate swarm-locks'} e itere até ok:true. Retorne: o JSON final do gate + caminho do arquivo criado.`, { label: 'gate:locks' }),

  () => agent(`${COMMON}

SUA TAREFA (posse exclusiva: scripts/mcp/atomic-swarm/gates/swarm-tasks.proof.mjs):
Crie o gate de prova do módulo swarm-tasks.mjs (leia-o primeiro; assinatura: taskUpdate(args, {runAcceptance}) — segundo parâmetro permite injetar um runner stub no teste; é async, use await). Casos obrigatórios:
1. taskCreate exige subject; cria task com id incremental e status pending.
2. Task SEM acceptanceCommand pode ser completada livremente e completion.verified === false (paridade TodoWrite, mas honesta no receipt).
3. Task COM acceptanceCommand: taskUpdate para completed SEM runAcceptance é recusado (fail-closed, error.swarmRefusal === true) e o status NÃO muda no store.
4. Com runAcceptance stub que retorna {ok:true, exitCode:1, stdout:'', stderr:'red'}: completion recusada, e o ledger .atomic/swarm-tasks-ledger.jsonl (na fixture) tem entrada com refusedCompletion.
5. Com runAcceptance stub {ok:true, exitCode:0, stdout:'green', stderr:''}: completa com completion.verified === true e stdoutSha256 com 64 hex.
6. Persistência: novo import do módulo (query-string diferente) relê o store e a task completada está lá.
Depois RODE via atomic_exec {command:'node gates/swarm-tasks.proof.mjs --json', cwd:'scripts/mcp/atomic-swarm', proveEffect:true} e itere até ok:true. Retorne: JSON final do gate + caminho.`, { label: 'gate:tasks' }),

  () => agent(`${COMMON}

SUA TAREFA (posse exclusiva: scripts/mcp/atomic-swarm/server.mjs e scripts/mcp/atomic-swarm/swarm-batch.mjs):
1. Em swarm-batch.mjs: exporte a função sendToBroker (hoje é function local — adicione 'export' na declaração; mudança aditiva mínima).
2. Em server.mjs: registre 8 tools novas seguindo EXATAMENTE o padrão das existentes (ok()/fail(), zod inputSchema raw-shape, try/catch):
   - swarm_lock_acquire {frontId, owner, objective, leaseMs?, allowedFiles?, blockedFiles?, acceptanceCriteria?} → lockAcquire
   - swarm_lock_heartbeat {frontId, owner} → lockHeartbeat
   - swarm_lock_status {} → lockStatus
   - swarm_lock_steal {frontId, newOwner, objective?, leaseMs?} → lockSteal
   - swarm_lock_release {frontId, owner} → lockRelease
   (imports de './swarm-locks.mjs')
   - swarm_task_create {subject, description?, acceptanceCommand?, acceptanceCwd?} → taskCreate
   - swarm_task_list {} → taskList
   - swarm_task_update {id, status?, subject?, description?} → await taskUpdate(args, {runAcceptance}) onde runAcceptance só é definido se brokerEndpoint() retornar endpoint: nesse caso runAcceptance = async (command, cwd) => sendToBroker(endpoint, {command, cwd: path.resolve(REPO_ROOT, cwd ?? '.'), effectRoot: path.resolve(REPO_ROOT, cwd ?? '.'), timeoutMs: 60000, env: {}}, 60000). Sem broker, passe undefined (o módulo recusa completion gated — fail-closed). Importe path de 'node:path', {taskCreate, taskList, taskUpdate} de './swarm-tasks.mjs', {lockAcquire, lockHeartbeat, lockStatus, lockSteal, lockRelease} de './swarm-locks.mjs', e sendToBroker de './swarm-batch.mjs'.
   Nas descriptions das tools de lock, deixe explícito: lease TTL + heartbeat + steal SÓ com staleness provada (sem flag de força) + ledger auditado em .atomic/swarm-locks-ledger.jsonl. Na de task_update: completar task gated exige acceptance command com exit 0 via broker governado (fail-closed sem broker).
3. Atualize a lista 'ledgers' do swarm_status acrescentando '.atomic/swarm-locks-ledger.jsonl' e '.atomic/swarm-tasks-ledger.jsonl', e bump da versão do servidor para '1.1.0'.
4. Valide: atomic_exec {command:'node --check server.mjs && node --check swarm-batch.mjs', cwd:'scripts/mcp/atomic-swarm', proveEffect:true}. Se o operador && for recusado pelo envelope, rode os dois node --check em chamadas separadas. Itere até passar.
Retorne: resumo das mudanças + resultado do node --check.`, { label: 'server:register' }),

  () => agent(`${COMMON}

SUA TAREFA (posse exclusiva: scripts/mcp/atomic-swarm/README.md):
Leia swarm-core.mjs, swarm-fetch.mjs, swarm-search.mjs, swarm-skills.mjs, swarm-batch.mjs, swarm-locks.mjs, swarm-tasks.mjs e server.mjs e escreva um README.md conciso (até 120 linhas) em PT-BR documentando: missão (paridade-TUI com prova: cada ação deixa receipt sha256 + ledger append-only em .atomic/), doutrina fail-closed (recusa explícita, nunca degrada silenciosamente; sem credenciais; broker obrigatório para shell), tabela das tools (nome → o que faz → ledger), formato dos receipts, como rodar os gates (node gates/NOME.proof.mjs --json), e a relação com o atomic-edit (superfície irmã fora da janela selada; locks compartilham .atomic-edit-locks/ com lease/steal auditado). Crie via atomic_create_file. Retorne o caminho + contagem de linhas.`, { label: 'docs:readme' }),
])

return { results: results.map((r, i) => ({ agent: ['gate:locks', 'gate:tasks', 'server:register', 'docs:readme'][i], output: typeof r === 'string' ? r.slice(0, 3000) : r })) }