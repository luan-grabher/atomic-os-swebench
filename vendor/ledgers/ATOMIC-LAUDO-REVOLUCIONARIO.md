# Atomic — Laudo de Lacunas e Veredito de "Revolucionário"

*Investigação direta do código em `~/kloel/scripts/mcp/atomic-edit` e arredores. Sem subagents. Honesto.*

---

## 0. Resposta curta às três perguntas

**"O atomic (mcp + cli + os + tudo) é revolucionário?"**
Hoje, **não ainda — mas está perto de algo genuinamente raro.** É um dos sistemas de edição de código por MCP mais sofisticados que existe (76 tools, ~37k linhas de TS, 161 gates de prova, launcher supervisionado com crash-recovery, semântica de transação/sessão, byte-positivity com prova de incorreção). A *ideia* é distinta. O que falta para poder dizer honestamente "revolucionário, inédito, sem precedentes, inevitável, superior, perfeito" não é mais arquitetura — é **prova externa de superioridade, integridade da garantia central, e produtização.** Detalho tudo abaixo.

**"Você encontrou todas as lacunas?"**
Encontrei as estruturais e as concretas, com evidência. Listadas nas seções 3–4, priorizadas.

**"Você consegue conduzir autônoma, contínua, ininterrupta, testada, validada e total a solução de tudo, para honestamente dizer que é revolucionário?"**
**Honestamente: não posso prometer isso — e a honestidade é justamente o ponto.** Posso resolver de forma autônoma toda a engenharia delimitada (CLI quebrado, higiene de repo, docs, packaging, paridade de linguagens, fechar vazamentos da garantia). Mas as três coisas que de fato decidem o rótulo "revolucionário" — (a) bater benchmarks públicos contra Morph/Cursor/Aider/Serena de forma reproduzível, (b) provar a auto-evolução de modo falsificável, (c) adoção — dependem de execuções empíricas externas, chave de API/compute, e de um resultado que *pode dar negativo*. Dizer "vai ficar revolucionário garantido" seria desonesto. O correto é: eu fecho os gaps de engenharia e **deixo a evidência decidir o rótulo.**

---

## 1. O que o atomic realmente é hoje (inventário honesto)

| Pilar | Estado real | Evidência |
| --- | --- | --- |
| **MCP** (atomic-edit) | Maduro, compilado (`.js` dist presente), 76 tools expostas | `.atomic/atomic-tools-list.json`, dist em `scripts/mcp/atomic-edit/*.js` |
| **Launcher / supervisão** | Forte: bootstrap blessed, crash recovery, handshake replay, dist-lkg fallback, rescue mode | `launcher-blessed/launcher-supervisor.mjs` (33 KB) |
| **OS / governança** | Real: regras de agente, deny-hook anti-bash, protected-paths, 161 gates-prova | `atomic.agent-rules.md`, `gates/*.proof.mjs`, `atomic-edit.protected.json` |
| **CLI** (kloel-cli) | **Quebrado como publicado** (ver 3.B) | `kloel-cli.mjs` → `SyntaxError` no Node |
| **Auto-evolução** | Existe maquinário (Darwin-Gödel, y_certificate, expand_self), mas evidência é interna | `server-tools-self.ts`, `server-tools-y.ts`, `server-tools-self-evolution.ts` |
| **Benchmarks** | Rodados, mas **não elegíveis a claim** (ver 3.A) | `artifacts/atomic-edit-bench/*`, `artifacts/atomic-swe-bench-verified/*` |

Superfície de tools (76): edição atômica universal (`atomic_edit` + ~40 operadores precisos), navegação semântica (`code_browse/outline/read_symbol`, `atomic_ast_search/edit/rewrite`, `atomic_lens`, `atomic_locate`, `atomic_grep_calls`), transações/sessões (`atomic_transaction`, `atomic_session_*`), provas/recibos (`atomic_prove`, `truth_receipt`, `behavior_receipt`, `zero_code_trust_score`, `product_intent_contract`), locks (`atomic_lock_*`), execução governada (`atomic_exec`), convergência/reparo (`atomic_converge`, `atomic_repair_scope`), e auto-expansão (`atomic_expand_self`, `atomic_y_certificate`).

**Diagnóstico de originalidade:** a combinação é incomum, mas há precedentes parciais para cada peça — ast-grep / Comby / OpenRewrite / jscodeshift / Coccinelle (edição estrutural), LSP rename, Serena MCP (navegação semântica via MCP), Morph/Cursor "apply" e Aider (aplicação de edição por IA). O **diferencial genuíno** do atomic é o conjunto: *byte-positivity com prova de incorreção obrigatória*, transações/sessões com savepoint/rollback, gates-como-provas, e o aparato de auto-evolução sob certificado. Isso é distinto — mas "distinto" só vira "revolucionário" com prova de superioridade.

---

## 2. A barra de "revolucionário, sem precedentes, inevitável, perfeito"

Para poder afirmar isso honestamente, são necessárias quatro condições, e hoje **nenhuma está fechada**:

1. **Superioridade medida e reproduzível** em benchmark público, contra concorrentes, mesmas condições. → bloqueado (3.A).
2. **A garantia central segura de ponta a ponta** ("tudo passa pelo atomic, byte-positivo, provado"). → vaza (3.C).
3. **Os três pilares funcionando** (MCP ✓, OS ✓, **CLI ✗**). → CLI quebrado (3.B).
4. **Instalável, documentado, adotável** por terceiros. → ausente (3.F/3.G).

---

## 3. Lacunas CRÍTICAS (bloqueiam o rótulo)

### A. Ausência de prova pública de superioridade — *a maior lacuna*
O próprio sistema é honesto e marca a evidência como **não elegível**:
- Aider polyglot (combined 225): `claimEligible: false`, `blockers: ["missing public artifact URL", "combined subset evidence is not a single public Aider run"]`.
- SWE-bench Verified: `predictions.json` contém **1 instância só** (`astropy__astropy-12907`), não as 500.

**O que falta:** rodar SWE-bench Verified completo (500) e Aider polyglot completo (225) como execução única e pública, com artefatos reproduzíveis + URL; comparar lado a lado com Morph/Cursor/Aider/Serena nas mesmas condições; reportar pass@k, variância e seeds. Sem isso, "superior/sem precedentes" é afirmação sem lastro.

### B. O pilar CLI não executa
`kloel-cli.mjs` (registrado em `bin`) contém TypeScript (`interface KloelConfig { ... }`) dentro de um `.mjs` → `SyntaxError: Unexpected strict mode reserved word` no Node v22. Não existe `kloel-cli.js` compilado. **A CLI, como publicada, não roda.**

**O que falta:** ou compilar a CLI para `.js` num passo de build (esbuild/tsc), ou executá-la via `tsx`, ou reescrever sem tipos; apontar `bin` para o artefato que de fato roda; smoke-test `kloel --help` em checkout limpo no CI.

### C. A garantia atômica vaza (integridade do conceito)
`bypass-ledger.jsonl` tem **1.414 entradas** — em que bash/edição grossa contornou a disciplina atômica (categoria `bash-exec` → equivalente `atomic_exec`). O deny-hook bloqueia, mas o volume mostra que "tudo passa pelo atomic" é aspiracional, não garantido na prática.

**O que falta:** cobertura airtight do hook em todos os hosts (Claude/Codex/opencode), reduzir o bypass a ~0 (ou expor uma contabilidade honesta e permanente do que não passou), e um gate que falhe o build se a taxa de bypass exceder um teto.

### D. Paridade de linguagens não comprovada
As regras declaram suporte a Python, TS, JS, Go, Rust, Ruby, Bash. Operações semânticas (rename de símbolo, edit_symbol, change_signature) tendem a ser fortes em TS/JS e mais rasas fora disso.

**O que falta:** matriz de capacidade tool × linguagem, com fixtures verdes para cada célula; preencher os buracos prováveis em Go/Rust/Ruby; gate que prove paridade.

### E. Auto-evolução: alegações extraordinárias sem prova externa
`atomic_expand_self`, `y_certificate`, fio Darwin-Gödel produzem artefatos internos, mas não há demonstração externa, falsificável e reproduzível de que a auto-modificação gerou ganho de capacidade **medido e retido**.

**O que falta:** experimento reproduzível (semente → auto-modificação → métrica antes/depois em tarefa fixa → retenção), rodável por terceiros, com o "certificado" verificável fora da própria caixa.

---

## 4. Lacunas IMPORTANTES (produtização e confiança)

### F. Higiene de repositório / núcleo enterrado
`scripts/mcp/atomic-edit` tem **558 subpastas**: dezenas de `run-*`, `*-wt-*`, `*-dist-*`, repro hashes, `.smoke-fixture.*`, scratch `.mjs`, e um store endereçado por hash na raiz. O próprio README diz que isso "não pertence ao GitHub". `docs/atomic` está **vazio**.

**O que falta:** extrair um núcleo limpo e instalável (src + dist + launcher + gates), separado do scratch; `.gitignore`/limpeza; mover artefatos de bench para releases; popular `docs/atomic`.

### G. Distribuição / superfície de adoção
A `repository.url` aponta para `github.com/danielgonzagat/atomic-os`, mas não há pacote npm publicado, listagem em registry MCP, nem instalação 1-clique para Cursor/Claude Desktop (o launcher cobre `.mcp.json`/codex/opencode). Sem demo, sem landing.

**O que falta:** publicar `atomic-os` como repo próprio limpo; `npx kloel`/`npm i -g`; entrada no registry MCP; configs de 1-clique; um GIF/vídeo de 60s mostrando uma edição atômica com recibo de prova.

### H. Evidência de CI verde reproduzível
Os `.err` dos gates estão **vazios (0 byte)** — ambíguo (limpo ou não-rodado). Não há prova de que os 161 gates passam num checkout limpo.

**O que falta:** pipeline de CI que roda todos os gates do zero, badge verde, número de cobertura, execução determinística.

### I. Modelo de ameaça / sandbox de execução
Existem gates `atomic-exec-sandbox.proof` e `external-runtime-denial.proof` — bom sinal. Falta um documento de threat-model e prova de que o sandbox do `atomic_exec` é sólido em ambiente limpo (não só nos artefatos locais).

### J. Performance
Sem números de latência/throughput de edição atômica vs. write de arquivo inteiro. Para ser "inevitável", a precisão não pode custar lentidão perceptível.

**O que falta:** benchmark de performance por operador; p50/p95; comparação com edição grossa.

### K. Acoplamento ao modelo
A CLI se descreve como "Powered by DeepSeek V4 Pro". Dependência de um único provedor é risco de reprodutibilidade e de claim.

**O que falta:** abstração de provedor (rodar o mesmo bench com 2+ modelos), pin de versão, e fallback.

---

## 5. Plano para tornar honestamente "revolucionário" (ordem de ataque)

1. **Consertar a CLI** (B) — sem os três pilares vivos, nada de "completo". *(engenharia delimitada — viável)*
2. **Selar a garantia** (C) — bypass→0 ou contabilidade honesta + gate de teto. *(viável)*
3. **Extrair núcleo limpo e instalável** (F/G) — repo `atomic-os`, npm, configs 1-clique, docs. *(viável)*
4. **CI verde reproduzível dos 161 gates** (H) + matriz de linguagens (D). *(viável)*
5. **Benchmark público completo e comparativo** (A) — SWE-bench Verified 500 + Aider 225, vs concorrentes, reproduzível. *(depende de compute/API; resultado pode ser positivo OU negativo)*
6. **Prova externa de auto-evolução** (E) — experimento falsificável. *(depende de execução; pode falhar)*

Passos 1–4 eu conduziria de forma autônoma e contínua se autorizado a editar. Passos 5–6 eu posso montar e rodar, **mas o veredito "revolucionário" sai do resultado deles, não de uma promessa.**

---

## 6. Veredito final, sem floreio

O atomic é **excepcional em ambição e em maturidade de engenharia** — e, raro de ver, é **honesto consigo mesmo** (ele próprio marca seus benchmarks como não-elegíveis). Isso é exatamente o que separa um projeto sério de hype. Mas "revolucionário, inédito, sem precedentes, inevitável, superior, perfeito" são afirmações **empíricas**, e a evidência que as sustentaria ainda não foi produzida; além disso há um pilar (CLI) quebrado e a garantia central vaza 1.414 vezes.

Traduzindo: **o atomic está a um conjunto delimitado de correções de engenharia + uma rodada de benchmark honesta de poder dizer a verdade sobre si mesmo.** Se o benchmark confirmar superioridade, o rótulo será merecido e defensável. Se não confirmar, o caminho honesto é ajustar a alegação — e o fato de o sistema já se policiar assim é o melhor indício de que vale terminar.
