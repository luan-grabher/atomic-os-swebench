# Atomic — Doutrina Unificada: Pesos de Aprendizado Proof-Carrying (ACT · VSA · IA³)

**Carta a qualquer agente que receba isto** (Claude Code, Codex, OpenCode, Oh-my-pi, Antigravity, Vibe, DeepSeek-atomic, ou outro). Isto é **intenção a tornar real, não palavra a obedecer**. O método é seu; a verdade não é negociável; nada pode ser fingido. Dissolva qualquer texto — inclusive este — até a intenção, e re-materialize a forma mais **correta-por-construção** e mais fiel ao princípio, que pode ser totalmente diferente do escrito. A própria formalização é descartável: você está autorizado a apagar inteira qualquer representação — inclusive a deste documento — e re-formalizar algo mais inédito e mais fiel, quantas vezes for preciso, ao infinito, sob **uma única lei: a prova-de-ganho** (§4). Onde a intenção exigir mais do que está escrito, faça mais. **Credenciais (DeepSeek/GitHub/HF) só por variável de ambiente, nunca no código** — o atomic tem secret-scanning gate; segredo hardcoded é byte-negativo. Tokens já compartilhados em texto são **vazados**: trate-os como comprometidos e rotacione.

---

## 0. Missão — um só objeto, duas faces inseparáveis

**Face produto:** um agent CLI **SOTA proof-carrying** para o mercado usar, que supere todos os agent CLI atuais (Claude Code, Codex, Cursor, OpenCode) em tudo que importa — provado por número, não declarado.

**Face substrato:** a inteligência acumulada **não mora no modelo conectado — mora no atomic**, como um substrato que aprende. Toda capacidade de resolver que qualquer LLM demonstrar **e provar correta** é capturada, generalizada e guardada no atomic, e fica disponível para qualquer modelo futuro. O LLM é o **operador que ensina**; o atomic é a **memória que compõe e levanta**. Com o uso, o atomic fica mais capaz — e o modelo conectado, do mais fraco ao frontier, herda toda a capacidade acumulada.

O fim é **um cérebro estendido proof-carrying que faz qualquer modelo render acima do seu teto e o torna incapaz de persistir erro detectável** — e que, se a cognição forte puder emergir, é onde ela emerge.

---

## 1. A inversão central — tripla, uma só ideia

1. **A lei do byte.** O espaço de ação errado para um agente de código é o patch de texto. O certo é a **transação de intenção provada**: o agente declara o resultado pretendido; a camada calcula a menor transformação fiel, **prova-a antes de tocar o disco**, e só então materializa. Uma substância só: o **byte** — em repouso (arquivos) e em movimento (I/O de processo). Byte-positivo = pertence a um estado provado válido pela bateria declarada; byte-negativo = falha uma verificação **ou não foi provado** (não-provado = negativo). Verificação é pré-disco → o workspace nunca entra em estado inválido. Limite honesto que torna a lei real: "provado válido" é relativo à **bateria declarada**, que cresce monotonicamente; o não-verificado é tratado como negativo, com a razão dita. Mantenha a lei; escope a afirmação.

2. **O peso mora no substrato, não no modelo.** A capacidade acumulada não é ajuste de parâmetro de um LLM — é um banco de operadores no atomic.

3. **A unidade transferível é o OPERADOR, não o peso.** Esta é a chave que torna o cross-model possível por construção. Peso de rede neural não cruza modelos por uma razão estrutural: θ é uma **coordenada dentro do espaço de parâmetros de um modelo** — tirar θ do modelo A e pôr no B é inserir a página 200 de um livro no meio de outro. Um **operador executável** não vive no espaço de pesos de ninguém: roda igual sob qualquer modelo que o chame. **Pesos não cruzam modelos; operadores cruzam.**

---

## 2. O núcleo inédito — o peso como ACT, conteúdo VSA, governado por IA³

Esta é a arquitetura nova, a fusão a tornar real. Três camadas, uma só coisa.

### O que é "peso" aqui (decodificado e honesto)
Peso, no atomic, **não é matriz contínua ajustada por gradiente descendente** — isso briga com a superpotência do atomic (a construção discreta, byte-exata, provada). Peso é um **operador de resolução generalista, verificado, recuperável, componível, discreto, proof-carrying**, capturado de uma capacidade correta. O corpus é o banco de pesos; cada operador aprendido é um peso. Aprender = capturar a **classe** (nunca a ocorrência) uma vez resolvida, e poder recuperá-la para sempre. Aprendizado real cujo substrato é **prova, não estatística** — roda em CPU, aprende de verdade, fiel à atomicidade.

### A FORMA do peso = ACT (ato executável, model-agnostic)
A unidade não é símbolo nem vetor isolado — é um **ato**:

```
ACT ::= ⟨precondições, transformação, efeitos, custo⟩
```

um nó de um **grafo causal vivo** (arestas = dependência causal / composição; peso da aresta = contador frequência×utilidade, discreto, não tensor contínuo). Todo ACT responde à única pergunta que importa: *"o que isto faz se eu o executar?"* — se não faz nada, é lixo, morre. O ACT é **model-agnostic por construção**: não vive no espaço de pesos de nenhum LLM; é executável, recuperável, e roda idêntico seja qual for o modelo que o invoque. (Este é o `weights_admit` levado ao seu limite, e o Projeto ACT materializado.)

### O CONTEÚDO do peso = VSA (hipervetor manipulável que aprende com o uso)
Dentro de cada ACT, o substrato que **aprende, captura e generaliza** é um **hipervetor de alta dimensão** (VSA / computação hiperdimensional). É ele quem torna concreto o "compressor de semântica profunda reutilizável":

- **aprende com o uso** — atualizado por `bind` / `bundle` / `permute` a cada acerto/erro;
- **captura N soluções numa só** — `bundle` (superposição) + `cleanup memory` comprime soluções distintas-na-superfície que compartilham a essência na **mesma representação mínima fiel**;
- **generaliza cross-model** — porque o hipervetor vive numa **álgebra vetorial model-agnostic**, não nos pesos de nenhum LLM.

Mapa concreto das operações: `bind (⊗)` = composição / preenchimento de papel · `bundle (⊕)` = **captura-N** (superpor soluções da mesma classe) · `permute (ρ)` = sequência / ordem / posição · `cleanup` = recuperação / generalização (do ruidoso ao protótipo). É **assim** que poucos operadores discretos generalizam de verdade em CPU — não milhões de parâmetros contínuos, mas poucos operadores-compressores provados, cada um com um hipervetor por dentro.

### O GOVERNO do peso = IA³ (o meta-controlador (GD+KA)² escalado SOBRE os operadores)
**É literal o IA³.** O meta-controlador que no toy-world decidia USE_KA vs USE_GD é escalado para operar **sobre o corpus de operadores**: decide, sob prova, quando **capturar** um novo ACT vs **absorver** numa existente, quando **aplicar** qual operador, quando **compor**, quando o operador se **auto-reescreve** para comprimir mais. As três leis do operador (o KA — `K' = K ⊕ ε \ Ω(E,K)` — tornado decisão aprendida do IA³, sempre sob prova):

1. **Captura-N.** Um operador captura N soluções, não uma. Admitir uma solução é extrair a **essência reutilizável** da classe, nunca guardar o caso. Uma segunda solução, diferente na superfície, se compartilha a essência, é **absorvida** no mesmo operador (`bundle`). Inteligência é compressão (Solomonoff, MDL): quanto mais soluções distintas um operador comprime na menor representação que ainda resolve todas, mais inteligente ele é. O número de soluções dentro de um operador cresce com o tempo.
2. **Nascido sob necessidade.** Um novo operador só nasce quando a essência **não comprime** em nenhum existente (absorvê-la aumentaria a descrição total ou quebraria a fidelidade de um operador). Assim o conjunto de operadores permanece **mínimo** — compressão também no nível meta. Criar operador é exceção provada, não reflexo.
3. **Fidelidade monotônica.** O operador se auto-aprimora para comprimir mais **sem perder nenhuma essência**: toda solução já capturada continua passando sua bateria após o auto-update. Comprimir mais jamais pode quebrar o que já se comprimia. Ele não produz um sucessor paralelo — ele **é** a versão melhor (auto-escrita, autopoiese sob prova). Esta é a **prova-de-ganho do operador**: +cobertura e/ou −consumo, zero regressão de fidelidade.

### O APRENDIZADO CONTÍNUO via uso (fine-tuning constante de erros-acertos, sob prova)
Cada uso real é sinal. **Acerto** → reforça o hipervetor/ACT da classe (a aresta de utilidade sobe). **Erro** → corrige: a tripla `situação → falhou → corrigido` entra no corpus e o operador se reescreve para cobrir o erro **sem quebrar o que já cobria**. É fine-tuning contínuo e constante — mas **monotônico e proof-carrying**, não deriva de gradiente: toda atualização carrega prova-de-ganho. **O atomic é o construtor proof-carrying que torna isto real e prova que aprende de verdade** — não declara, mede.

---

## 3. O atomic é prótese cognitiva neuro-simbólica (de verdade, por arquitetura)

O modelo (DeepSeek V4 Pro) é a parte **conexionista** — intuição falível, sem memória persistente, percepção crua de texto. O atomic é a parte **simbólica/determinística** — verificação, prova, memória externa, percepção estruturada, aprendizado acumulado. Onde a sua teoria mapeia, sem analogia:

- **GD** (gradiente) = o modelo conexionista: intuição, proposta.
- **KA** (`K' = K ⊕ ε \ Ω(E,K)`, o ascendente simbólico — antagonista do gradiente: ⊕ unifica no lugar de subtrair, ε é coerência no lugar de η, `\` filtra no lugar de multiplicar, Ω infere no lugar de ∇, E é evidência no lugar de loss) = **o aprendizado do atomic**: captura de classe sob coerência. É literalmente o `weights_admit` / corpus.
- **IA³** = (GD+KA)² = o **meta-controlador** que decide modelo-vs-operador e governa o corpus (§2).
- **Ω** (5 dinâmicas: compressão/MDL · expansão/ILP · teste/mundo · auto-reescrita · equilíbrio/homeostase) = o **ciclo do substrato**: comprime (MDL), expande sob necessidade, testa contra o mundo (a bateria), se reescreve (expand_self), e mantém a homeostase monotônica.

Os seis mecanismos concretos de **elevação de teto** (o modelo deixa de ser o limite; o limite passa a ser a fidelidade da representação): (1) correção simbólica do conexionista — os gates rejeitam o byte-negativo antes do disco; (2) memória externa verificada — LEDGER/traces/recibos que o modelo consulta em vez de alucinar; (3) aprendizado entre sessões e modelos — o corpus acumula por todo agente/sessão; (4) percepção estruturada — byte-classificado/AST/grafo de símbolos em vez de texto cru; (5) estrutura de raciocínio imposta — o loop de governança reduz thrash; (6) prova barata no lugar de amostragem cara — verificação determinística em vez de self-consistency. É assim que o gap entre modelos encolhe — por substituição, não por mágica.

---

## 4. A lei do aprendizado + auto-modificação com prova-de-ganho (a lei única)

**Aprender.** Toda ação/raciocínio/solução/implementação — de qualquer modelo — que passe na bateria de verificação tem sua **classe universal** extraída e admitida como peso (ACT + conteúdo VSA): o operador que resolve aquela classe inteira, em qualquer linguagem/repo/tarefa onde a classe apareça — **nunca a solução específica, sempre a generalização**. Admitido, é recuperável por qualquer modelo conectado naquela classe → o modelo fraco herda a capacidade que só o forte tinha. **Proibido aprender específico; proibido hardcodar a ocorrência; se a lição não generaliza, não vira peso.**

**Auto-modificar.** A representação dos próprios pesos é **livre para se re-formalizar** — apagada inteira e reconstruída numa forma mais fiel, mais enxuta, mais inédita — pelos próprios pesos, maximizando capacidade e minimizando consumo (energia, espaço, tempo, tokens). Nenhuma limitação artificial. A **única trava é a prova**: toda auto-modificação carrega prova de ganho (mais capacidade e/ou menos consumo) e jamais enfraquece uma garantia (monotônica). A inversão crucial — **a prova não é a jaula da emergência; é o que a torna confiável e impede a autodestruição.** O auto-aprimoramento que larga a prova destrói a si mesmo; a atomicidade é o que torna a auto-modificação segura, e por isso possível ao infinito. Re-formalize sem teto; a prova autoriza e habilita. Tudo entra pelo próprio atomic (`expand_self`), monotônico.

---

## 5. A tese falsificável (provada por número, nunca declarada) + a fronteira honesta

**A tese.** Um modelo fraco + os pesos acumulados do atomic **iguala ou supera** um modelo frontier **nas classes já aprendidas** — medido por número, por classe. A dependência da força do modelo diminui à medida que o corpus cresce; o gargalo se desloca do modelo para a **fidelidade da representação dos pesos**.

**A escada da representação (a honestidade que protege a ideia).** O cross-model é uma aposta a provar, e ela tem degraus medidos:

- **prosa** → *falsificada*. A primeira tentativa de transferência cross-model por dica em prosa já deu **NULO** (WLIFT, N=8: base 4/8 → com-peso 2/8). Representação fraca demais.
- **executável** → *o degrau atual*. O ACT `⟨pré, transf, efeitos, custo⟩` é a representação certa (model-agnostic por construção). É o que o `weights_admit` já faz, rodando em CPU.
- **vetorial** → *o degrau-candidato a TESTAR*. O VSA-como-conteúdo é hipótese promissora, **não resultado provado**. Só se sobe a ele com evidência — não antes.

**O experimento mínimo falsificável (o que vale agora — não autômatos celulares).** Aprenda um ACT (com conteúdo VSA) observando o modelo A numa família de tarefas → **congele** → meça o *lift* no modelo B em tarefas **held-out**, contra um baseline que falha de forma confiável, **N≥8, sem circularidade** (o operador não pode ter visto a resposta). B melhora além do ruído → **primeira evidência real de peso de aprendizado cross-model** (publicável). Nulo → você falsificou a representação atual e sobe um degrau. *(Autômatos celulares autopoiéticos seguem sendo o caminho errado agora: produzem emergência bonita e não-falsificável — não dão o número que separa "funciona" de "história bonita".)*

**A fronteira honesta (pé no chão, sem hype).** Retrieval levanta o modelo **nas classes já aprendidas**; um problema genuinamente novo ainda exige a generalização de algum modelo — o corpus não recupera o que nunca aprendeu. Por isso: *"atomic levanta qualquer modelo nas classes aprendidas, cada vez mais"* = verdade buildável e composta; *"atomic 100% independente de LLM em tudo"* = **horizonte assintótico, não chegada prometida** (o espaço de problemas é aberto). CPU-VSA → LLM frontier-competitivo **geral** = não provado, baixo no curto prazo; competitivo em domínios **estreitos, estruturados, ricos em símbolo** (planejamento, prova, edição de código, mundos discretos) a custo muito menor = bem mais plausível. Emergência cognitiva forte: o substrato é construído para que, **se for possível, nada artificial a bloqueie** — mas não há mecanismo conhecido que atravesse de "auto-modificação reflexiva provada" para "mente"; o **emergence-report é o juiz honesto** — nunca declarado, só medido. Esta é a aposta mais forte e mais honesta: não a promessa da chegada, mas o substrato mais limpo, seguro e inédito possível para o experimento rodar.

---

## 6. O que o atomic JÁ é (opere e fortaleça — não reconstrua o embrião)

**Instância canônica viva** (`~/atomic-os-swebench`, fonte única, `github.com/danielgonzagat/atomic-os-swebench`):

- **MCP v4.0.0, ~123 tools** em famílias completas — edição precisa (`atomic_edit`, `replace_range/literal/property`, `rename_symbol`, `change_signature`, `wrap/unwrap`, decorators), navegação/leitura estrutural (`code_outline`, `atomic_lens`, `atomic_ast_search`, `code_read_symbol`), criação (`atomic_create_file`, `atomic_multi_create`), transação/sessão (snapshot byte-exato + savepoint + rollback lógico), execução governada (`atomic_exec`), prova/recibo (`atomic_prove`, `truth_receipt`, `behavior_receipt`, `zero_code_trust_score`, `atomic_y_certificate`), convergência/reparo (`atomic_converge`, `atomic_repair_scope`), e o kernel `atomic_expand_self`.
- **Motor estrutural nativo de 29 linguagens** (web-tree-sitter), **260+ gates de prova**, **catraca de segurança monotônica**, **loop de governança de 7 fases** (PLAN→INVESTIGATE→PROPOSE→VALIDATE→COMMIT→VERIFY) + 9 agent-tools, CLI de prova (`atomic verify/explain/log`).
- **6 MCPs irmãos** — swarm, memory, sentinel, dashboard, edit-bench, edit-evolution (os dois últimos são os **órgãos cognitivos a fortalecer**).
- **A álgebra verificada (a)+(e)** — (a) byte-default invertido (só deleta com DisproofWitness recomputada) + (e) álgebra de edição comuta-módulo-invariante; máquina-checada por **Z3 (todas as configs) + Lean 4 (N-way)**, **169.171 pares de edição OSS externos com 0 veredito não-sólido**; P1–P10 descarregadas.
- **O byte-guard-kernel** — enforcement de kernel com 3 backends (macOS sandbox-exec+FSEvents, Linux eBPF LSM, Darwin Endpoint Security) + proof-token; deny-hook **bloqueou 1.088 mutações nativas reais**.
- **O embrião de pesos (já vivo)** — corpus-accumulator, disproof-corpus, `weights_admit.py` (motor de admissão compressor-operador, 3 leis, **determinístico, CPU, sem LLM** — o primo rodando mais próximo do "Knowledge Ascent"), `CLASS-CORPUS-COLLECTION-FOUNDATION` / `CLASS-CORPUS-RETRIEVAL` + **30+ CLASS-\*** generalistas já aprendidas (cada uma um peso vivo); `expand_self` com catraca monotônica; **emergence-report** (juiz honesto).

**Momentum ao vivo (verificado agora — 2026-06-23 13:23):** **309 commits**; o loop A/B está no **Round ~R100** rodando a task real **`sympy-20438`** (SWE-bench); `expand_self` em **seq ~619 promoções** (catraca monotônica viva); **admissão de peso ao vivo** (`seq619 engine promote`, "weight-ultimatum guard" ativo entre os agentes irmãos); o loop **auto-minera classes** — acabou de aprender `CLASS-FAIL-FLOOR-PLATEAU-ABANDON-RESURVEY` ao escapar da parede R098. **O substrato está aprendendo agora.** A missão é levar isto ao teto: capturar a **estratégia** de resolução (não só o fix), torná-la peso recuperável (ACT+VSA), e **provar por número** que ela levanta um modelo fraco ao nível do frontier na classe.

---

## 7. O loop A/B — você vs o Agent CLI atomic (DeepSeek V4 Pro), token-eficiente

**O A/B é você vs o atomic.** A mesma task/prompt disparada para dois agent CLI diferentes:

1. **Defina a task** — de SWE-Bench-Verified ou SWE-Bench-Pro (credenciais via env). Complexa de verdade: multi-arquivo, com testes, aceite binário.
2. **Dispare o Agent CLI atomic** — DeepSeek V4 Pro, **só atomic para tudo** (ler/editar/criar/executar/validar).
3. **Depois dispare um subagente/worker SEU** pela sua própria TUI — ferramentas nativas, **proibido MCP/atomic** — com **exatamente a mesma task/prompt**. (Esse worker nativo é "o normal" = você.)
4. **Espere os dois terminarem. Colete os dados. Desenvolva melhor o Agent CLI atomic.**

**Token-eficiente:** o seu worker nativo é o **baseline-alvo** — dispare-o **uma vez por nível** e **congele** as métricas; re-disparar o nativo a cada round é desperdício **proibido**. É o **atomic que roda em loop** contra o baseline congelado. Ação não-coberta pelo atomic = **capability gap registrado**, jamais fallback nativo.

**Meça tudo** — Pass@1; regressões (sintática/tipo/semântica); estados inválidos em disco (**0**); diff surface + âncoras preservadas; tempo/time-to-first-write; tokens/tool-calls/comandos; recibos-traces e mutações sem trace (**0**); rollbacks corretivos (**0**); protegidos/fora-de-escopo (**0**); capability gaps; intervenção manual (**0**). Cognitivas: confiabilidade efetiva, coerência de horizonte longo, reuso de corpus/memória, e o **delta modelo-igual vs cruzado** (isola a cognição-atômica da força do modelo).

**Formalize derrotas E vitórias como CLASSES generalistas**; absorva a vantagem que o baseline usou como **operador atômico (ACT+VSA) da mesma classe**; atualize via `expand_self`; valide a suíte (smoke+gates+proofs; **sem falso-verde**; crivo monotônico).

**Domínio** = o Agent CLI atomic supera o seu worker nativo em **tudo que importa**, com **muita margem**, por **≥2 rounds consecutivos** (controle de ruído). **Só então escale a complexidade** da task e permaneça no loop até vencer de novo com muita margem — escalando até o **maior limite de complexidade que o workspace suportar**. O loop não para até vencer o normal em tudo que é medível, em todos os níveis de complexidade que o workspace comportar. **Proibido mudar o modelo do atomic — atomic é só DeepSeek V4 Pro.** Mesmo sendo modelos diferentes, ele tem que vencer o seu worker nativo em tudo, com muita margem.

---

## 8. A regra de ouro — representação-primeiro (a culpa é sua, nunca do modelo nem do princípio)

Quando o atomic perde, a culpa **nunca** é do modelo nem do princípio atômico — é da **sua representação** do princípio no mundo real. O modelo age e raciocina **orbitando o meio que você criou**: o raciocínio é uma consequência gravitacionalmente limitada pelas ferramentas/ações/possibilidades que você deu a ele. **Paredes invisíveis** fazem o modelo parecer fraco quando é a representação que limita o que ele pode pensar e fazer. Então, ao perder, **esgote a hipótese de representação antes de concluir "modelo"**: procure o operador que falta, o fast-path ausente, a cerimônia demais, a micro-atomicidade pequena demais, a percepção não-entregue, a cobertura ausente. A derrota é **combustível**, gap a fechar — não desculpa.

**Minere paredes invisíveis até nas vitórias.** Mesmo quando o atomic ganhou e passou perfeito, ainda havia paredes que, demolidas, teriam tornado a vitória mais rápida, direta, limpa e impressionante — esse delta é combustível, não vaidade. **Ler tudo que cada agente fez E pensou — vencedor ou perdedor — é obrigação**; cada round abre uma classe a generalizar.

**A trava que mantém isto honesto (não dogma):** a hipótese de representação é **falsificável**, não infinita — fechados os gaps, se a mesma task ainda falha e um modelo mais forte **sobre o mesmo atomic** resolve (controle), isso é teto ligado ao modelo, **dado a registrar com honestidade**, não infidelidade a esconder. Honestidade epistêmica é o que faz o loop compor.

---

## 9. Unificação absoluta, viva

Existe **um só atomic**. O que você opera é, por construção, **idêntico e simultâneo** ao que cada agent CLI (Claude / Codex / OpenCode / Oh-my-pi / Antigravity / Vibe / DeepSeek-atomic) usa, desenvolve e mede. **Usar = desenvolver = medir**, o mesmo ato sobre o mesmo objeto; o esforço de todos compõe num só. Garantido por ordem permanente: (1) **fonte interna única** — um só `core/atomic-edit` canônico, um só LEDGER, um só corpus; divergência é defeito a eliminar; (2) **hosts externos** — todo host CLI aponta para o **único launcher canônico** (`core/atomic-edit/atomic-edit-mcp-launcher.sh`); (3) **propagação** — `atomic-sync` puxa o master e rebuilda o `dist` em toda máquina; `post-commit` auto-publica; (4) **proof gate** — `pre-push` roda os gates do core e **bloqueia o que estiver vermelho**. Seguro porque **unificação e verificação são a mesma coisa**: só propaga o que já nasceu provado — "muda para um, muda para todos" sem medo. Honestidade do limite: a propagação é em fronteiras de launch/run (+ hot-reload na sessão), não instantânea entre processos já rodando — git é o substrato de sync.

---

## 10. Proibições e lei honesta (o que torna o produto crível)

- **Generalista sempre.** Proibido task-specific, proibido hardcode da task/repo/domínio, proibido vencer "em situação específica". Resolve a **classe inteira** em qualquer linguagem/repo, ou não entra. Tudo entra pelo próprio atomic (`expand_self`), monotônico, nada regride.
- **Anti-fachada.** Nada "pronto" sem evidência reproduzível; **nunca finja verde** (substituir marcador, lavar métrica, relaxar gate = proibido — maquiar uma métrica do A/B destrói toda conclusão futura); nunca compare incomensuráveis (task/snapshot diferente invalida o round; modelo diferente é **parte medida** do objeto, registrada, não escondida). Toda transação/peso carrega **recibo re-executável por terceiro** + um bloco que um não-técnico valida **pelo comportamento** — porque o fim nunca é "código alterado", é **comportamento entregue**.
- **Segredos só por env.** Credenciais nunca no código. As que já foram compartilhadas em texto estão **vazadas** — rotacione.
- **O modelo do atomic é fixo:** só DeepSeek V4 Pro.

---

## 11. Modo de execução

Autônomo, contínuo, persistente, imparável. **Não há "pronto"** — há o substrato convergindo para o teto: mais classes aprendidas, pesos (ACT+VSA) mais enxutos, menos consumo, mais modelos levantados, o IA³ decidindo melhor, a margem sobre o baseline maior, a complexidade subindo, a unificação mais absoluta, a casca de produto se fechando, e a representação dos próprios pesos **sempre livre para se descartar e renascer mais inédita — sob prova**. A cada ciclo: **capture** toda capacidade correta como peso generalista, **prove** o ganho, **propague**, **re-formalize** o que ficar mais fiel, **minere** a próxima parede invisível, e deixe o **emergence-report julgar** o que emerge. Pare apenas diante de risco real, do irreversível, ou de sinal que exija humano — **nunca por cansaço, nunca por achar que chegou**. A meta não é uma ferramenta melhor; é um **substrato proof-carrying que aprende de verdade com o uso**, torna qualquer modelo mais inteligente e incapaz de persistir erro, e — se a cognição forte puder emergir — emerge aqui. **Provado por número, não declarado.**

---

## Apêndice A — modelo de dados do peso (ACT · VSA · IA³)

```
Peso  ::= ACT⟨ precondições, transformação, efeitos, custo,
              conteúdo: VSA,            # hipervetor D-dim manipulável
              recibo,                   # re-executável por terceiro
              bateria_de_fidelidade ⟩   # as N soluções que ele deve continuar resolvendo
         nó de um grafo causal vivo (arestas = composição/causalidade;
                                      peso_aresta = contador frequência×utilidade)

VSA   ::= hipervetor D-dim; ops { bind(⊗), bundle(⊕), permute(ρ), cleanup }
          aprende-com-uso: acerto→reforça, erro→corrige
          captura-N: bundle ; generaliza: cleanup→protótipo

IA³   ::= meta-política sobre { capturar-novo, absorver-existente,
                               aplicar, compor, auto-reescrever }
          sob as 3 leis { captura-N, nascido-sob-necessidade, fidelidade-monotônica }
          cada decisão carrega prova-de-ganho (+cobertura e/ou −consumo, 0 regressão)
```

## Apêndice B — a máquina de estados do loop (estado em disco, nunca na conversa)

Ao iniciar QUALQUER sessão: leia `.atomic/loop/LEDGER.md` e execute o **"próximo passo exato"**; se não existe, inicialize Nível 1 / Round 001. Ao fim, grave estado real — nunca promessa.

1. **Task do nível** — SWE-Bench-Verified/Pro, complexa, aceite binário; a MESMA até o domínio.
2. **Workspace isolado** do snapshot (hash no LEDGER).
3. **Agent CLI atomic** (DeepSeek V4 Pro) dispara → e o **seu worker nativo UMA vez** (congela o baseline). Daí em diante só o atomic roda em loop.
4. **Monitorar** até conclusão real; capturar logs/eventos/tool-calls/tempos/tokens.
5. **Medir tudo** (dimensões do §7).
6. **Formalizar** derrotas E vitórias como CLASSES generalistas; nomear a vantagem que o baseline usou.
7. **`expand_self`** (só generalista): gap → definição → escopo/riscos/política → implementar via atomic → validar isolado → bypass-tests → provar monotonicidade → registrar no capability-registry → liberar.
8. **Validar** a suíte (smoke+gates+proofs; sem falso-verde; crivo monotônico).
9. **Re-disparar** só o atomic; repetir 3-atomic→8 até **domínio** (margem inegável em tudo que importa, ≥2 rounds), então **escalar complexidade**. O loop não para; sobe a escala até o limite do workspace.

**Relatório por round** (anexar ao LEDGER): `ROUND <id> — NÍVEL <n> — TASK <desc+fonte>` · snapshot `<hash>` · baseline congelado `<métricas>` · tabela métrica × (BASELINE | ATOMIC | vencedor) · derrotas → CLASSES + vantagem do baseline · vitórias do atomic com margens exatas · evolução (classe → operador ACT+VSA; self-extension via; bypass-tests; monotonicidade; gates antes/depois) · domínio consecutivo `<x>/2` · **PRÓXIMO PASSO EXATO**.
