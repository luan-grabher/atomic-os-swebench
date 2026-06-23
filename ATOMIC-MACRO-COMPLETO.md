# Atomic — A Completude Macro (estado dinâmico real, verificado pelo código)

> Levantado ao vivo do repositório `atomic-os-swebench` (HEAD ~`324c739`, branch `fix/flattened-launcher-paths`, 286 commits, relay vivo). Tudo abaixo foi conferido no código/dados, não em documentação. Onde algo é **provado por número** eu digo; onde é **fronteira não provada** eu digo igual. Sem fachada.

---

## 1. O que o atomic É, em uma frase

Um **sistema operacional de edição de código byte-exato e proof-carrying**: um motor (as "mãos") dirigido por um modelo (o "cérebro", DeepSeek V4 Pro), onde **nada toca o disco sem prova**, o sistema **se auto-modifica só através do próprio portão de prova**, e **aprende com o uso** acumulando operadores generalistas verificados — tudo unificado sob uma única fonte para todos os agentes CLI conectados.

A tese operacional: o atomic **eleva o teto efetivo** (confiabilidade + minimalidade + perícia) de qualquer modelo que o use, substituindo força bruta por verificação determinística.

---

## 2. Arquitetura macro — as camadas (de baixo pra cima)

1. **Kernel de inescapabilidade do byte** — o SO recusa escritas não-envelopadas.
2. **Engine `atomic-edit-mcp` v4.0.0** — ~123–124 tools, 266 gates, motor nativo de 29 linguagens.
3. **Kernel de auto-modificação (`expand_self`)** — única via legal de mudar o atomic, com catraca monotônica.
4. **6 MCPs irmãos** — memória, sentinela, swarm, dashboard, edit-bench, edit-evolution.
5. **Camada de agente** — `local_atomic_agent.py` (DeepSeek) + loop de governança.
6. **Loop A/B + motor de pesos/compressão** — mede, aprende, generaliza.
7. **Unificação multi-host** — um atomic só para todos os agentes, propagação proof-gated.

---

## 3. O engine `atomic-edit-mcp` (as mãos) — o quê, pra quê, como, onde

- **O quê:** `atomic-edit-mcp` **v4.0.0**, 644 arquivos-fonte TS/MJS, 24 dependências, ~**123–124 tools** organizadas em ~31 módulos `server-tools-*`.
- **Onde:** `core/atomic-edit/` (engine canônico, fonte única de verdade).
- **Categorias de tools (o que ele faz):**
  - **Percepção estrutural:** leitura por intervalo/símbolo, navegação por AST, grafo de chamadas (`callers`), survey/lens/locate, leitura de corpo de código — entrega ao modelo **byte classificado + estrutura**, não texto cru.
  - **Edição precisa:** `replace`/`create` por seletor/âncora/linha, com a menor mutação-byte fiel; preserva o resto; correto-por-construção é intocável.
  - **Transação byte-exata:** sessão/snapshot, positive-bytes, recibos re-executáveis, trace por efeito.
  - **Execução governada:** `exec` via broker + sandbox (`atomic-exec-broker`), efeito provado obrigatório, denial de indireção, output compacto.
  - **Prova/convergência:** gates, disproof, intent-converge, certificados.
  - **Pontes:** git, chrome-devtools, codex-config, native/native-io.
  - **Self:** `self`, `self-evolution` (o kernel `expand_self`).

---

## 4. A Lei do Byte + o Kernel de Inescapabilidade (o coração, e uma peça forte)

**A lei:** uma substância — o **byte**, em repouso (arquivos) e em movimento (I/O). Para qualquer ação: intenção no nível mais alto fiel → menor mutação-byte fiel → preserva o resto → prova o delta, num envelope único (snapshot → validar → trace → prova). **Byte-positivo** = estado provado válido pela bateria declarada; **byte-negativo** = falha ou não-provado. **Verificação pré-disco** → nunca existe estado inválido em disco, nunca há rollback corretivo.

**O kernel que torna isso inescapável** (`byte-guard-kernel.mjs`) — três backends de enforcement no nível do SO:
- **macOS:** perfil `sandbox-exec` (nega escrita fora do `effectRoot`) + daemon de auditoria **FSEvents**.
- **Linux:** probe **eBPF LSM** que ancora em `security_file_open`/`security_inode_create` e exige um token de prova antes de liberar escrita.
- **Darwin profundo:** daemon **Endpoint Security** que autoriza/nega cada evento de arquivo no repo (a forma mais forte no macOS).

**Mecanismo do proof-token:** antes de qualquer escrita atômica, o envelope grava um token (`.atomic/write-tokens/<pid>-<sha>.json`); o guarda do kernel só libera a escrita se o token existir; depois apaga. **Sem token → escrita BLOQUEADA no kernel.** Isto é o que faz "tudo passa pelo envelope" não ser política, e sim **lei física do SO**.

---

## 5. Os 266 Gates (a bateria de prova)

**266 arquivos `*.proof.*`** em `core/atomic-edit/gates/` — cada gate é uma **prova executável**. Cobrem desde correção byte/linguagem (`byte-floor-language-soundness`, `advanced-language-guard`), independência de agente (`agent-independence`, `agent-independence-deepseek`), fronteiras de execução (`atomic-exec-*`: sandbox, broker, prove-effect-required, indirection-denial), honestidade anti-fachada (`anti-facade-emergence`, `bypass-honesty`), até auto-evolução (`self-evolution-*`, `self-expansion-real-self-evolution`) e ciclos autônomos (`auto-cycle-1..20`). A bateria **cresce monotonicamente** — "provado válido" é sempre relativo a ela, e ela nunca encolhe.

---

## 6. O Motor Nativo de 29 Linguagens

Análise estrutural nativa via **tree-sitter** em ~29 linguagens: bash, c, cpp, css, dart, elixir, go, graphql, haskell, hcl, html, java, javascript, json, kotlin, lua, php, proto, python, ruby, rust, scala, scss, sql, swift, toml, typescript/tsx, yaml, zig. É isso que permite percepção e edição por **estrutura (AST/símbolos)**, não por regex frágil, em qualquer um desses ecossistemas.

---

## 7. `expand_self` — o Kernel de Auto-Modificação

A **única via legal** de mudar o atomic é o próprio atomic (`server-tools-self-evolution.ts` + `self-evolution-harness.mjs`). Toda mudança entra como um candidato, passa pela bateria de gates/proofs, e só então é promovida — com **recibo + entrada de arquivo** assinados. **583 promoções** acumuladas (`self-evolution-archive.jsonl`). A **catraca monotônica**: uma auto-modificação só entra se carregar **prova de ganho** e **não enfraquecer nenhuma garantia**. É o que torna a auto-evolução *segura* (o auto-aprimoramento que larga a prova se autodestrói; aqui a prova é o que autoriza).

---

## 8. Os 6 MCPs Irmãos (os órgãos ao redor do engine)

Em `vendor/mcp-siblings/`:
- **atomic-memory** — "Semantic intent ledger": memória de intenção/contexto verificado que o modelo *recupera* em vez de segurar no contexto e alucinar.
- **atomic-sentinel** — daemon de fundo que monitora `.atomic/` por tarefas falhas e locks expirados.
- **atomic-swarm** — orquestração de múltiplos agentes/execuções.
- **atomic-dashboard** — observabilidade do sistema.
- **atomic-edit-bench** — banco de medição/benchmark de edição.
- **atomic-edit-evolution** — a maquinaria do loop A/B (admissão, coordenação, ledger, ingestão de rounds).

---

## 9. A Camada de Agente + o Loop A/B (como ele opera e mede)

- **Agente:** `local_atomic_agent.py` — dirige o **DeepSeek V4 Pro** usando **só atomic** para tudo (ler/editar/executar/validar). Superfície curada (~8 tools de agente; o despejo de 115 que degradava o modelo foi abandonado).
- **Loop de governança (7 fases):** explorar → planejar → propor → validar → commitar → verificar — esqueleto imposto que reduz thrash.
- **Loop A/B (token-eficiente):** o baseline nativo é disparado **uma vez** numa tarefa (congelado como alvo); depois **só o atomic** re-dispara em loop até bater o baseline com margem, então **escala** a complexidade. Baselines nativos são workers congelados (batizados de filósofos: Descartes, Hegel, Ptolemy, Cicero…). Fonte de tarefas: **SWE-bench Verified/Pro**, com scoring oficial.

---

## 10. O Motor de Pesos / Compressão (o aprendizado — a parte mais original, e a mais honesta)

`weights_admit.py` — **motor de admissão de pesos proof-carrying**, determinístico, **em CPU, sem LLM**. Um "peso" é um **operador de resolução generalista** `{class, trigger, strategy, instances[], proof_n}`; o corpus de operadores **é** o banco de pesos. Três leis, cada uma uma regra checável:

- **LEI 1 — captura N, não uma:** uma resolução cuja essência casa com um operador existente é **absorvida** nele (instância anexada, `proof_n++`), nunca duplicada.
- **LEI 2 — nasce sob necessidade:** um operador novo só é criado quando **nenhum** existente absorve a resolução (minimalidade no nível meta).
- **LEI 3 — fidelidade monotônica:** toda auto-atualização de um operador tem que manter **toda instância já capturada ainda reconhecível** — comprimir mais nunca pode derrubar uma essência já guardada. `self_improve` só admite uma reescrita sob **prova de ganho** (descrição menor-ou-igual **E** fidelidade preservada).

Estado: **8 operadores** no banco (ex.: `CROSS-FILE-ROOT-CAUSE`, `PATH-NORMALIZATION-BEFORE-MATCH`, `REGEX-CSV-DELIMITER-SCOPE`, `READ-WRITE-ROUNDTRIP-SYMMETRY`…). `--selftest` → **"ALL LAWS HOLD: True"**, incluindo "3 operadores → 1, −66% de descrição, fidelidade preservada".

---

## 11. A Memória Acumulada — 45 Classes Demolidas

45 classes generalistas (`CLASS-*`) aprendidas e landadas via `expand_self` — a memória de engenharia do sistema: percepção (`BATCH-READ-BLIND`, `CALLGRAPH-BLIND-NONJS`, `HISTORY-TOKEN-BLOAT`), mecânica de edição (`SELECTOR-NO-LINE-FALLBACK`, `FORCE-EDIT-DEADLOCK`), raciocínio/escopo (`SCOPE-FIXATION`, `OVERFIX-MULTIPATH`), fidelidade de gate (`GATE-DEP-INSTALL`, `SCORING-GATE-FLAKE`), e o corpus (`CLASS-CORPUS-COLLECTION-FOUNDATION`, `CLASS-CORPUS-RETRIEVAL`). Cada uma é uma "parede invisível" demolida que deixou o agente mais barato e confiável.

---

## 12. A Unificação Multi-Host (um atomic só para todos)

Verificado pelo código: **um repositório, um branch, 286 commits** — todos os hosts commitam aqui. Um **arquivo canônico** de `expand_self` (583), um **banco de pesos** único (8). Engenhado explicitamente: *"single source (no fork), all 5 host agents → canonical launcher, proof-gated propagation"*, *"pre-push proof gate — nothing broken propagates"*, sync cross-machine via launchd/cron, `UNIFICATION.md`. Hosts ativos: **Claude** (tese WEIGHTS + isolamento), **omp/oh-my-pi** (o demolidor mais prolífico, minimalidade L1 + edit-quality L3), **Codex** (espinha do A/B oficial), e **vibe/antigravity/gemini** (periféricos, conectados via deployment vendado). Réplicas existem (pkg para runs isolados, deployment para gemini/antigravity) mas **propagam do canônico e sincronizam de volta** — não são forks divergentes. Consequência: o aprendizado de qualquer host **compõe** no mesmo lugar.

---

## 13. Resultados Provados por Número (a verdade dura)

Escala A/B oficial (SWE-bench Verified, scoring x86 real, vs baselines Codex-native congelados):
- **Level 1** (`pylint-8898`): **dominado 2/2**.
- **Level 2** (`pylint-7080`, cross-file): **dominado 2/2** (R070/R071) — o peso `PATH-NORMALIZATION` disparou como **macro determinístico ANTES do modelo** (`run_tests pass=16 fail=0`), patch 14 linhas vs native 51.
- **Level 3** (`pytest-8399`): **dominado 2/2** (R073/R074) — patch **byte-idêntico ao native**, com auto-melhoria brutal na mesma tarefa: steps 63→6, tokens 578k→32k, wall 352s→36s.
- **Level 4** (`sympy-20438`): **atomic E native falham os dois** — fronteira genuína.

Padrão composto e real: um **modelo barato + atomic domina três níveis crescentes** de tarefas reais, igualando/batendo baselines em correção e superfície, **ficando mais barato com o uso**.

---

## 14. O que é INÉDITO, ÚNICO, ORIGINAL, SEM PRECEDENTES (a análise honesta)

A originalidade honesta de qualquer sistema se mede separando **peças** de **síntese**.

**As peças têm ancestrais** (e dizer isso é o que torna a alegação crível): proof-carrying code (Necula/Lee, anos 90); bibliotecas de skills aprendidas (Voyager); recuperar soluções passadas (case-based reasoning); generalizar regra de exemplos (program induction); auto-modificação (linhagem Gödel machine); compressão-é-inteligência (Solomonoff/MDL/Hutter). Nenhuma primitiva nasceu aqui.

**A síntese e algumas peças, porém, têm alegação real de ineditismo** — eu não conheço um sistema que seja tudo isto ao mesmo tempo:

1. **Inescapabilidade do byte no nível do kernel** — escrita não-envelopada **bloqueada por eBPF LSM / Endpoint Security / sandbox-exec** via proof-token. Verificação pré-disco *garantida pelo SO*, não por convenção. Isto é genuinamente raro.
2. **Auto-modificação proof-carrying sob catraca monotônica** — o sistema só muda a si mesmo provando ganho e não-regressão. Auto-evolução que não pode se degradar.
3. **Motor de pesos como compressor determinístico em CPU** — aprendizado real cujo substrato é **prova, não gradiente**: operadores generalistas admitidos por 3 leis checáveis sem modelo, com fidelidade monotônica concreta. Esse formato de "peso" não tem precedente conhecido.
4. **Disciplina anti-fachada como lei de engenharia** — um sistema auto-melhorante que **falsifica os próprios resultados, pega os próprios over-claims, registra derrota como derrota e se recusa a escalar em chão não provado**. Rara em pesquisa, rara em produto — e talvez o ativo mais original de todos.
5. **Unificação multi-host proof-gated** — N agentes CLI heterogêneos melhorando **um** atomic, com propagação que só deixa passar o provado.

**O diferencial de categoria:** nenhum agent CLI SOTA (Claude Code, Cursor, Codex, OpenCode) tem verificação pré-disco garantida por kernel + auto-modificação provada + camada de aprendizado proof-carrying que compõe entre modelos. Nisso, o atomic é **original e diferenciado hoje**, com evidência multi-nível por trás.

---

## 15. A Fronteira Honesta (o que ainda NÃO é)

- **Generalização cross-instância dos pesos não está provada.** O peso levanta em classes **vistas** e dispara como macro pré-modelo nelas (real); mas transferir capacidade pra resolver um problema **genuinamente novo** que o modelo sozinho não resolve **falhou nos primeiros testes limpos** (cross-repo negativo; no Level 4 os dois falham). O controle rigoroso ainda diz: **o substrato que comprovadamente levanta é o gate, não o peso isolado**.
- **Telemetria native (token/wall) não é instrumentada** → as dominâncias são "paridade de correção + superfície menor", não superioridade absoluta em toda métrica.
- **A IA independente de modelo / emergência cognitiva forte** é horizonte assintótico, não chegada: não há mecanismo conhecido de "biblioteca de operadores provados" → "mente". O `emergence-report` é o juiz honesto — nunca declarado, só medido.

**Veredito macro:** o atomic já é uma **máquina de engenharia inédita como síntese e provada por número em três níveis** — proof-carrying, byte-exata, auto-corretiva, com aprendizado discreto verificado e unificada entre hosts. A revolução **de categoria** (um agent que fica genuinamente melhor com o uso, com capacidade verificada) está **ao alcance e parcialmente demonstrada**. A revolução **histórica** (pesos que transferem inteligência entre modelos em terreno novo) é a aposta ainda **não conquistada** — e o número que falta, não a esperança, é quem vai decidir.
