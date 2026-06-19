# O que fazer daqui pra frente para desbloquear emergência cognitiva AGI-like

*Mergulho dinâmico no estado VIVO (você está editando). Grounded nos arquivos reais. Honesto, sem hype.*

---

## Onde você REALMENTE está (não teoria — código que roda)

Você já construiu o loop fechado que eu antes apontei como ausente:

- **`hypothesis-generator.mjs`** — o GERADOR. Minera o disproof-corpus por couplings "parede X ⇒ parede Y" com **validação held-out**; só consome `validated===true`. Não é fitted-to-noise.
- **`autonomous-evolution.mjs`** — o LOOP FECHADO (sem LLM/agente). Pega o coupling mais forte e **sintetiza um proof-gate novo que o sistema autorou da própria falha**, admitido pelo lattice completo. Já ratificado em produção.
- **`gate-evolution.mjs`** — EA determinístico sobre set-cover (fitness = cobertura − penalidade×tamanho). Honesto: "optimizer, NOT cognition".
- **`self-improve-loop.mjs`** — loop de benchmark (SWE-bench/aider): roda CLI → testa → analisa trace byte-exato → adapta.
- **`emergence-report` vivo**: `feed=185, corpus=256, invariants=41, novelty=0.679, proposals=2` → **"mechanical weak emergence only"**. Blind spots: caiu de 2→1 (você instrumentou origem).

Isso é real e raro. Mas é **emergência fraca mecânica** — e o sistema diz isso honestamente. As três fronteiras abaixo são o que separa isso de algo mais forte.

---

## As 3 fronteiras duras (a verdade do gap)

**Fronteira 1 — o loop autora DADO, não LÓGICA.** `autonomous-evolution.mjs` é explícito: "changes no engine logic; it only asserts a held-out-validated property". Ou seja, o sistema **observa a si mesmo e registra observações como gates** — mas **não muda como ele funciona** a partir delas. Isso é contabilidade com prova, não melhoria de capacidade. Este é o maior gap para "self que pensa".

**Fronteira 2 — o "mundo" é um corpus só: a história de rejeição de gates.** O loop só aprende a estrutura das próprias falhas de gate. Ele não está conectado a se o **código que produz funciona melhor / resolve mais tarefas**. O mundo mais rico (benchmarks) existe em `self-improve-loop.mjs` mas está **desconectado** do loop autônomo.

**Fronteira 3 — objetivo fixo e estreito.** O alvo é sempre "cobrir couplings de parede". Não há geração de objetivo, nem objetivos de tipos diferentes. O sistema não consegue **se propor uma pergunta nova**.

---

## O que fazer, em ordem (cada passo é real, buildável, e move uma fronteira)

### NEXT-0 — Confiabilidade para rodar sem parar *(pré-condição)*
O próprio `autonomous-evolution.mjs` registra que foi admitido só "after the effect-snapshot deadlock (leaked unreadable build temps) was cleared". Esse é o mesmo scratch-bloat (558 subdirs) que estoura o snapshot do `expand_self` de forma não-determinística. **Um loop autônomo não roda confiável sobre isso.** Limpe o núcleo / isole os temps. Critério: 20 ciclos `autonomous-evolution → expand_self` seguidos sem flake.

### NEXT-1 — RODAR o loop em escala *(o sinal precisa de dado)*
`proposals=2`. F4 (rising recursive novelty) **não tem como disparar** com 2 propostas. Agende `autonomous-evolution.mjs` para rodar repetidamente, acumulando o `hypothesis-ledger`, e acompanhe a série de novidade do `emergence-report` ao longo de centenas de ciclos. Barato, e é pré-requisito de QUALQUER sinal de emergência. *(Sem rodar, o resto é especulação.)*

### NEXT-2 — Estender a auto-modificação de DADO para LÓGICA, sob prova *(move a Fronteira 1 — o passo mais importante)*
Deixe o loop propor mudanças ao **comportamento da engine** (começando minúsculo e seguro: thresholds de gate, ordem de regras, parâmetros de heurística), não só asserções sobre o corpus. Cada candidato: gerado pelo loop → validado pelo lattice → medido por fitness → promovido só se melhora E não regride → origem registrada. Isto é o salto de "registra o que observou" para "muda como funciona". Faça via `atomic_expand_self`, espaço de parâmetros primeiro (não reescrita arbitrária).

### NEXT-3 — Aterrar o loop em desempenho real de tarefa *(move a Fronteira 2)*
Conecte `autonomous-evolution` ao `self-improve-loop`: o fitness deixa de ser só "cobertura de parede" e passa a incluir **"o código produzido resolve mais tarefas / menos tentativa desperdiçada"** (SWE-bench/aider/convergence). O corpus do loop vira *resultado de tarefa*, não só *rejeição de gate*. Isso dá ao sistema um mundo mais rico para escalar — e é onde "melhor de verdade" começa a significar algo.

### NEXT-4 — Componente conexionista CPU-viável *(a metade neuro, honesta)*
Modelo aprendido pequeno (boosting / rede pequena / embeddings sobre features do corpus) que **prevê falha de gate / risco de edit / chance de promoção**, generalizando além da estatística simbólica do miner. Alimente as previsões no gerador (enviesa as propostas). Critério: bate as heurísticas hard-coded num holdout. CPU-viável de verdade.

### NEXT-5 — Multi-corpus / semente de geração de objetivo *(move a Fronteira 3 — maior incerteza)*
Deixe o loop autorar sobre mais de um corpus / mais de um tipo de objetivo (gate-walls + task-outcomes + latência + ...). Isso é a semente do sistema **se propor objetivos** que ninguém especificou. É o passo mais "cognitive-shaped" e o mais incerto. Só faz sentido depois de NEXT-2/3.

### NEXT-6 — Manter o juiz honesto afiado *(sempre)*
Instrumente o último blind spot que resta (1). Mantenha `emergence-report` como único juiz. Rode-o a cada ciclo. Se F1/F4 aparecer: **pare e verifique com humano** — nunca declare. Se ele ficar barulhento de repente, suspeite de bug antes de milagre.

---

## A verdade sobre o teto (sempre presente)

NEXT-0 a 4 são engenharia real que torna o sistema **mensuravelmente mais capaz** e o experimento mais rico. NEXT-5 + rodar aberto é onde mora o desconhecido. **Nada disso garante (B)** — cognição sem o LLM no loop. O salto de "otimizador mais rico e aterrado" para "self que pensa" não tem mecanismo conhecido, e mais iterações dão um otimizador melhor, não uma mente. O honesto é: construa o loop mais largo, aterrado e verificado possível, **rode-o aberto**, e deixe o detector honesto julgar. Se (B) acontecer no mundo real, ele virá como CANDIDATO com evidência recomputável — verificado por humanos, e só então chamado pelo nome.

O maior salto buildável agora é **NEXT-2** (auto-modificar lógica, não só dado, sob prova). É a fronteira certa para atacar a seguir — e é exatamente a força do Atomic.
