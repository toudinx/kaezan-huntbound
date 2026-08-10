# W10 — UX do helper e confiança do jogador

> Pesquisa de referência para **Kaezan Huntbound**.
> Tema: como expor automação de combate ao jogador sem exigir microgerenciamento e sem virar caixa-preta.
> Pesquisa realizada em agosto/2026.
> **Não** contém implementação. Contém taxonomia, comparação, proposta de UX e riscos.
>
> Convenção deste documento:
> **[F]** = fato observado em fonte pública consultada · **[H]** = hipótese/proposta nossa · **[?]** = decisão aberta

---

## 0. Resumo executivo

Sete conclusões, antes do detalhamento:

1. **O eixo que decide tudo é a *unidade de configuração*** — não a quantidade de opções. Configurar *números* (threshold), *intenção* (postura), *ordem* (prioridade) ou *regras* (condição→ação) são quatro produtos diferentes com quatro curvas de frustração diferentes.
2. **Sistemas de regras (gambits) escalam mal com o tamanho do kit.** FFXII precisa de 12 slots por personagem porque tem dezenas de ações. Nosso kit é de **4–6 ações relevantes por classe** — isso muda o cálculo completamente e nos permite ficar num nível de complexidade muito menor sem perder teto.
3. **O default precisa ganhar o jogo.** Nenhum conteúdo deve exigir regra customizada. Se exigir, criamos um imposto de setup e a automação vira obrigação, não conveniência.
4. **Confiança não vem de o helper ser bom; vem de o helper ser previsível e auditável.** A literatura de automação chama o oposto de *automation surprise*: "o que ele está fazendo agora?" [F]. Morte inexplicada é o evento que destrói confiança — não morte.
5. **Override manual tem que ser instantâneo, sem confirmação e sem penalidade.** Input humano sempre vence. E o jogador precisa saber, o tempo todo e sem abrir menu, *quem está no comando*.
6. **O maior diferencial disponível para nós é o "por quê", não o "o quê".** Praticamente nenhuma referência mostra ao jogador a razão de uma decisão. Uma *caixa-preta de morte* (replay dos 5s finais, decisão a decisão) é barata de fazer e é a feature de confiança com melhor custo/benefício.
7. **Complexidade deve ser desbloqueada, não configurada.** FFXII acertou ao vender slots e condições como progressão [F]. Isso resolve onboarding, ritmo e faz o helper virar eixo de construção de conta — coerente com nosso pilar.

---

## 1. Modelos de configuração — taxonomia

Seis níveis, do mais fechado ao mais aberto. Cada nível é um produto distinto, com público, custo e modo de falha próprios.

### N0 — Toggle único

Um botão liga/desliga. Toda a lógica é interna e fixa.

- Exemplos [F]: Black Desert Mobile (botão Auto-Combat ao lado da barra de HP), Honkai: Star Rail (Auto-Battle), Granblue Fantasy (Full Auto).
- Custo de entrada: **zero**.
- Teto: baixo. A qualidade do jogo é a qualidade do algoritmo do dev.
- Modo de falha: o jogador vê a IA fazer algo obviamente errado e não tem nenhuma alavanca. É exatamente o que aconteceu com HSR: a comunidade reclama que o auto gasta Ultimate e Skill Points em momentos inúteis, e que não sabe usar personagens de suporte [F].

### N1 — Toggle + parâmetros escalares

Ligado/desligado, mais alguns números (thresholds, percentuais, delays).

- Exemplos [F]: Black Desert Mobile permite configurar o gatilho de poção de HP em `Settings → Convenience → HP Potion`; bots de Tibia (ElfBot NG) expõem tipo de poção e tempo de espera em milissegundos na aba *Healing*.
- Custo de entrada: baixo, **se** os números forem poucos e nomeados em linguagem de jogo ("curar em 50%") em vez de linguagem de sistema ("healThreshold").
- Teto: médio-baixo. Resolve cura/poção muito bem; não resolve rotação nem posicionamento.
- Modo de falha: proliferação de campos numéricos sem hierarquia (a aba *Healing* típica de bot vira um formulário de 20 campos).

### N2 — Postura / intenção

O jogador escolhe um *comportamento nomeado*, não regras. O sistema traduz para números internos.

- Exemplos [F]: Dragon Age: Origins tem, além das táticas, um menu de **Behavior** — o que o personagem faz quando nenhuma tática se aplica e o jogador não deu ordem. Persona 3 usa comandos de Tactics ("Act Freely", "Knock Down", "Full Assault"). Dragon's Dogma usa *Inclinations* dos pawns.
- Custo de entrada: **muito baixo** — é escolher um adjetivo.
- Teto: médio. Cobre 70–90% do que a maioria dos jogadores quer.
- Modo de falha: **opacidade**. Dragon's Dogma é o caso-limite: as inclinações são valores numéricos ocultos de 0 a 1000, só aparecem no status acima de 600, mudam sozinhas conforme o comportamento do jogador, e a única forma confiável de corrigi-las é com poções compradas com moeda escassa [F]. O jogador percebe que o pawn mudou, não entende por quê, e não tem alavanca barata. Resultado documentado: frustração.
- Persona 3 mostra o mesmo problema por outro ângulo: o meme "Mitsuru Marin Karin" existe porque o comportamento padrão ("Act Freely") era ruim e a correção (trocar para "Knock Down") não era descoberta [F].

> **Leitura importante:** postura é o modelo com melhor relação esforço/resultado — desde que a postura seja **legível**. A diferença entre "ótimo" e "detestado" aqui não é a mecânica, é mostrar o que a postura faz.

### N3 — Prioridade ordenada (sem condições)

Uma lista ordenada de ações/alvos. Primeiro item viável vence. Não há `SE`.

- Exemplos [F]:
  - **Warframe / precepts**: os mods de comportamento do companion são usados em ordem de prioridade; o slot superior esquerdo é o de maior prioridade, o inferior direito o menor, e precepts de prioridade alta interrompem os de prioridade baixa.
  - **RimWorld / work tab**: grade de prioridades 1–4 por colono e por tipo de trabalho; empate é desempatado pela ordem das colunas (esquerda vence).
  - **ElfBot / aba Targeting**: alvo escolhido por critério ordenado — *Health* (menor HP primeiro), *Proximity* (mais próximo), *Stick* (mantém o alvo atual enquanto visível).
- Custo de entrada: baixo. Arrastar itens numa lista é uma interação universal.
- Teto: médio-alto — e surpreendentemente alto quando o número de ações é pequeno.
- Modo de falha: não expressa contexto ("use isso *só* quando houver 3+ inimigos"). O jogador tenta expressar contexto reordenando e obtém comportamento errado.
- **Warframe tem outra lição relevante:** o comportamento da IA é um *loadout* (mods equipáveis), não um menu de opções. A configuração vira build. Isso encaixa exatamente na nossa filosofia de "decisão humana via construção".

### N4 — Regras condicionais ordenadas (gambits)

`SE <condição> ENTÃO <ação> EM <alvo>`, avaliadas de cima para baixo, primeira verdadeira vence.

- Exemplos [F]:
  - **Final Fantasy XII / Gambits**: cada gambit é alvo + ação + prioridade; o sistema varre de cima até achar a primeira condição verdadeira e executa; enquanto ela for verdadeira, nada abaixo roda. Os slots são progressivos, chegando a 12, comprados no License Board. Hiroyuki Ito descreveu a motivação como criar um "jogo online single-player": aliados agindo sozinhos, mas do jeito que o jogador quer.
  - **Dragon Age: Origins / Tactics**: mesma semântica (condição + ação, ordem crescente, primeira verdadeira vence). Slots começam em 2 no level 1 e crescem com level (3, 6, 10, 15, 20, 25, 30) e com pontos na habilidade *Combat Tactics*. Traz **presets por classe/playstyle** (ex.: preset "Healer" prioriza cura), tipicamente com ~10 táticas preenchidas.
  - **Pillars of Eternity II: Deadfire / AI editor**: condicional + ação + tipo de alvo + prioridade de alvo, editável por personagem. Comunidade produziu mods só para adicionar *condições* novas — sinal de que o vocabulário de condições é o gargalo real, não a quantidade de slots.
  - Fora de jogos: IFTTT, filtros do Gmail, automações do Home Assistant, Apple Shortcuts. Mesma gramática, mesmos modos de falha. [sem fonte consultada — conhecimento geral]
- Custo de entrada: **alto**. Exige entender avaliação ordenada e first-match-wins.
- Teto: alto.
- Modos de falha, todos documentados no gênero:
  - **Sprawl**: 12 slots × N personagens vira manutenção. Toda mudança de build obriga revisão.
  - **Regra morta**: uma regra acima captura o caso e a de baixo nunca dispara. É invisível sem ferramenta de debug.
  - **Vocabulário insuficiente**: a condição que o jogador precisa não existe (vide os mods de Deadfire).
  - **Imposto de setup**: o jogo fica chato antes de estar configurado.

### N5 — Scripting completo (DSL/Lua)

O jogador escreve código.

- Exemplos [F]: Ragnarok Online expõe a IA do Homunculus em `AI.lua`/`Util.lua`, com pasta `USER_AI` para scripts próprios, e existe ecossistema comunitário (ex.: *Rampage AI Lite*, *YggAI*, alternável em jogo com `/hoai`). ElfBot NG embute uma linguagem de script (TCL) além das abas de Healing/Cavebot/Targeting.
- Custo de entrada: proibitivo para a maioria.
- Teto: total.
- Modo de falha: **o meta migra para o script**. Quando a IA é programável de verdade, o jogo ótimo passa a ser "baixe o script certo", e a decisão deixa de ser do jogador — vira consumo de configuração alheia. Em RO isso é aceito porque o Homunculus é secundário. Para nós, onde o helper é o pilar de combate, seria fatal.

---

## 2. Comparação

### 2.1 Comparação por modelo

| Nível | Unidade configurada | Custo de entrada | Teto | Explicabilidade | Custo quando a build muda | Falha típica |
|---|---|---|---|---|---|---|
| N0 Toggle | nada | nenhum | baixo | nula (caixa-preta) | zero | impotência diante de erro óbvio |
| N1 Números | threshold | baixo | médio-baixo | alta (o número é a explicação) | baixo | formulário de 20 campos |
| N2 Postura | intenção | muito baixo | médio | **depende inteiramente de mostrar o que traduz** | zero | opacidade (Dragon's Dogma) |
| N3 Prioridade | ordem | baixo | médio-alto | alta (a lista é o algoritmo) | médio | não expressa contexto |
| N4 Regras | condição→ação | alto | alto | média (exige trace) | **alto** | sprawl, regra morta, imposto de setup |
| N5 Script | lógica | proibitivo | total | baixa | alto | meta vira "baixe o script" |

### 2.2 Comparação por jogo

| Jogo / sistema | Modelo | Tamanho típico da config | Como resolve prioridade | Override manual | Feedback da decisão | O que roubar |
|---|---|---|---|---|---|---|
| **FFXII** Gambits | N4 | até 12 slots/personagem [F] | ordem, primeira verdadeira vence [F] | jogador assume controle direto | nenhum além de ver a ação | **slots e condições como progressão comprável** |
| **Dragon Age: Origins** | N2+N4 | 2→~12 slots [F] + menu Behavior [F] | ordem crescente [F] | pausa tática + ordem direta | nenhum | **presets por classe já preenchidos** [F] |
| **PoE II: Deadfire** | N4 | script por personagem, editável | condicional + prioridade de alvo [F] | pausa + ordem | nenhum | vocabulário de condições é o gargalo real |
| **Dragon's Dogma** Pawns | N2 | 3 inclinações relevantes [F] | valores ocultos 0–1000 [F] | comandos ("Go!", "Help!") | **nenhum — e é o problema** | como **não** fazer postura |
| **Persona 3** Tactics | N2 | 1 comando/personagem [F] | interno | trocar comando | nenhum | default ruim vira meme [F] |
| **Warframe** Precepts | N3 | 1–10 slots de mod [F] | ordem espacial dos slots [F] | — | ícone da habilidade | **IA como loadout equipável** |
| **RimWorld** Work tab | N3 | grade 1–4 [F] | número + ordem das colunas [F] | ordem direta prioritária | tooltip do que o colono está fazendo | **grade legível de relance** |
| **Granblue** Full Auto | N0/N1 | toggle + Auto Guard [F] | interno, esquerda→direita [F] | **skill manual durante Full Auto** [F] | — | **override sem sair do auto** |
| **Honkai: Star Rail** | N0/N1 | toggle + opção de não usar Ultimate [F] | interno (SP, fraqueza, HP, status) [F] | manual a qualquer turno | — | válvula de escape mínima ("IA joga, eu solto o Ult") |
| **Black Desert Mobile** | N1 | toggle + % de poção [F] | interno | qualquer input | — | poção configurável é o mínimo aceitável |
| **ElfBot NG** (Tibia) | N1+N3+N5 | abas: Healing, Cavebot, Targeting, Nav… [F] | listas ordenadas por critério [F] | pausar cavebot mantendo healing [F] | log de texto | **separação por módulos independentes** e **pausa parcial** |
| **RO Homunculus** | N5 | arquivo Lua [F] | o que o script disser | — | — | evitar: o meta vira o script |
| IFTTT / Gmail / Home Assistant | N4 | ilimitado | ordem/first-match | — | histórico de execução | **histórico de execução é a única defesa contra sprawl** |
| Aviação (autopilot) | — | modos | — | desengate imediato | **anunciador de modo permanente** | *mode awareness* como requisito, não enfeite [F] |

### 2.3 O padrão que emerge

Cruzando as colunas, três coisas aparecem consistentemente:

1. **Quase ninguém mostra o porquê.** A coluna "feedback da decisão" é quase toda vazia. Todos os sistemas de gambit assumem que, como o jogador escreveu as regras, ele entende o comportamento. Isso é falso assim que há mais de 4 regras — porque o difícil não é lembrar as regras, é saber **qual delas disparou**.
2. **Os sistemas amados por design (FFXII, DA:O) são exatamente os que exigem mais trabalho.** Eles funcionam em jogos de 60+ horas com pausa tática. Nosso jogo é de **sessões de 15–30 minutos** — o orçamento de paciência para configuração é uma ordem de grandeza menor.
3. **Os sistemas de sessão curta (gacha/mobile) são N0/N1 e sofrem de impotência**, não de complexidade. A reclamação nunca é "tem opção demais"; é "ele desperdiça meu recurso e não posso impedir".

> **Leitura importante:** as duas famílias falham em pontos opostos. O espaço vazio entre elas — **poucas alavancas, mas alavancas reais, com o porquê visível** — é onde Huntbound deve morar.

---

## 3. Nível ideal de complexidade para Huntbound

### 3.1 A restrição que muda o cálculo

O contexto do projeto define **4–6 ações realmente relevantes por classe**, mais runas, dash e postura.

Isso é decisivo. Um sistema de gambits existe para resolver combinatória. Com 5 ações e recursos escassos, a política "use a ação de maior prioridade que esteja disponível e cujo alvo seja válido" é próxima do ótimo na maior parte das lutas. **[H]** O ganho marginal de um sistema de regras completo sobre uma simples lista ordenada é pequeno — e o custo de UX é enorme.

### 3.2 Recomendação

**Alvo: N2 + N3 como camada principal. N4 estritamente racionado. N5 nunca.**

Concretamente, um orçamento de complexidade em três camadas:

| Camada | Quem usa | O que expõe | Meta de adoção |
|---|---|---|---|
| **0 — Nada** | todo mundo, sempre | helper ligado por padrão, preset automático por classe | 100% dos jogadores conseguem limpar a diária sem abrir nada |
| **1 — Ajuste** | jogador interessado | preset + 3 sliders de intenção + ordem das ações | ~40–60% mexem alguma vez |
| **2 — Regras** | otimizador | 3 slots de regra condicional (até 6 no endgame) | **<25% usam — e isso é sucesso, não fracasso** |

**Contrato de design que decorre disso:**

> **Nenhum conteúdo do jogo pode exigir uma regra da Camada 2 para ser vencido.**
> Camada 2 é eficiência (tempo de run, consumo de poção, consistência), nunca viabilidade.

Isso é testável e deve virar critério de aceitação de conteúdo, incluindo bosses (ver W11).

### 3.3 Por que não N4 como camada principal

- Sessão de 15–30 min não paga o custo de autoria de gambits.
- O helper é **pilar**, não conveniência. Se configurar for pré-requisito para jogar, o pilar vira barreira.
- Sprawl é multiplicado pelo nosso design: 5 classes × várias builds × dungeon livre vs. sincronizada. Regras que dependem de números absolutos quebram no modo sincronizado.
- Manutenção: toda mudança de build/carta/sigil invalidaria configurações. **[H]** É o mesmo custo que já matou o entusiasmo por táticas de DA:O em replays.

### 3.4 Por que não ficar em N0/N1

- É exatamente a reclamação de HSR: sem alavanca sobre desperdício de recurso [F].
- E, no nosso caso, energia/resina torna cada run *valiosa*. Desperdício automatizado de um recurso limitado é a pior combinação possível.

---

## 4. Proposta de UX para Huntbound

### 4.1 Arquitetura: módulos independentes

**[H]** O helper não é um sistema; são **6 canais independentes**, cada um com estado próprio e cada um pausável separadamente. Isso vem direto do padrão de abas dos bots de Tibia (Healing / Targeting / Cavebot / Nav), que existe há duas décadas e cuja utilidade mais citada é justamente "pausar o cavebot mantendo o healing" [F].

| # | Módulo | Responsabilidade | Default no MVP |
|---|---|---|---|
| 1 | **Sobrevivência** | cura, poção, escape de emergência | **sempre ligado, não desligável no MVP** |
| 2 | **Alvo** | escolha e troca de alvo | ligado |
| 3 | **Ações** | uso de skills/runas na prioridade definida | ligado |
| 4 | **Movimento** | espaçamento, kite, follow, avoid | ligado, escopo reduzido |
| 5 | **Loot** | coleta segundo filtro | ligado |
| 6 | **Navegação** | rota dentro da dungeon | **desligado por padrão no MVP** [?] |

Motivos para o Sobrevivência ser especial: é onde a confiança nasce e morre. Se o helper deixa morrer, nada mais importa. E é o módulo mais fácil de acertar (é N1 puro: dois thresholds).

Motivos para Navegação ser conservadora: é o módulo mais próximo de "o jogo joga sozinho" e o que mais conflita com input manual. **[H]** No vertical slice, navegação automática deve ser opcional e limitada a "ir para o próximo grupo/sala", não a percorrer a dungeon inteira.

### 4.2 A tela do helper

Uma única tela, três blocos verticais, sem abas na Camada 0/1:

```
┌─ HELPER ─────────────────────── Knight ──┐
│                                          │
│  PRESET  [ Padrão ▾ ]      ⟳ restaurar   │
│                                          │
│  ── INTENÇÃO ──────────────────────────  │
│  Agressividade   ▁▂▃█▅▂▁   Equilibrado   │
│      → mantém 1 tile de distância        │
│      → não puxa grupos adjacentes        │
│  Consumíveis     ▁▂█▃▂▁▁   Econômico     │
│      → poção só abaixo de 45% HP         │
│      → nunca usa poção de boss em trash  │
│  Espaçamento     ▁█▃▂▁▁▁   Corpo a corpo │
│      → engaja adjacente, sem kite        │
│                                          │
│  ── PRIORIDADE DE AÇÕES ───────────────  │
│  ⣿ 1  Exori          [sempre]            │
│  ⣿ 2  Golpe Pesado   [alvo ≥ 60% HP]     │
│  ⣿ 3  Runa X         [3+ inimigos]       │
│  ⣿ 4  Ataque básico  [sempre]            │
│                                          │
│  ── ALVO ──────────────────────────────  │
│  Escolher:  [ Mais fraco ▾ ]             │
│  Manter alvo até morrer          [✓]     │
│                                          │
│  ▸ Regras avançadas (0/3)                │
└──────────────────────────────────────────┘
```

Cinco decisões de UX embutidas nesse esboço, cada uma respondendo a uma falha documentada:

1. **Sliders de intenção mostram a tradução embaixo, em linguagem de jogo.** É a correção direta do erro de Dragon's Dogma: postura sem número visível vira opacidade [F]. Aqui a postura é a interface e o número é a explicação — os dois aparecem.
2. **A lista de prioridade é o algoritmo.** Não há tradução escondida entre o que o jogador vê e o que o helper faz. Ordem de cima para baixo, primeira ação viável vence — mesma semântica de FFXII/DA:O [F], mas sobre 4–6 itens em vez de 12 slots vazios.
3. **Condições aparecem como *chips* dentro da linha da ação, não como uma regra separada.** Isso funde N3 e N4: o jogador ganha 80% do poder de gambits sem nunca montar uma regra. O chip padrão é `[sempre]`; trocar por `[3+ inimigos]` é um dropdown, não uma sintaxe.
4. **Sem slots vazios.** A tela do FFXII/DA:O começa vazia e comunica "você tem trabalho a fazer". A nossa começa preenchida com o kit da classe e comunica "isto já funciona; mexa se quiser". Presets preenchidos são o acerto de DA:O [F] — nós levamos ao limite.
5. **Regras avançadas ficam atrás de um disclosure fechado, com contador `0/3`.** O contador comunica o orçamento antes de o jogador entrar.

### 4.3 Vocabulário de condições (fechado)

**[H]** Um vocabulário pequeno e fechado, exposto como chips. O gargalo real observado em Deadfire foi a falta de condições certas, não o excesso [F] — logo, é melhor ter 14 condições boas e cobrir os casos reais do que uma gramática aberta.

| Categoria | Condições |
|---|---|
| Sempre | `sempre` |
| Contagem | `2+ inimigos perto`, `3+ inimigos perto`, `alvo único` |
| Vida | `meu HP ≤ X%`, `HP do alvo ≥ X%`, `HP do alvo ≤ X%` |
| Recurso | `mana ≥ X%`, `mana ≤ X%` |
| Tipo | `alvo é boss`, `alvo é elite` |
| Distância | `alvo adjacente`, `alvo distante` |
| Estado | `sem buff X ativo`, `alvo com debuff Y` |
| Perigo | `estou em área de perigo` |

Percentuais são **sempre relativos**, nunca absolutos — requisito não-negociável por causa do modo sincronizado/modulado, que altera stats absolutos e quebraria qualquer regra escrita em valores brutos.

### 4.4 Complexidade como progressão

**[H]** Adotar o mecanismo do FFXII (slots e condições compradas no License Board [F]), mas com nosso vocabulário:

- Slots de regra avançada: 1 no início, 3 no meio, até 6 no endgame.
- Condições novas destravam por progressão (bestiary/bossiary, árvore, cartas/sigils).
- Presets adicionais destravam ao vencer conteúdo relevante.

Três benefícios simultâneos: onboarding sem parede, o helper vira eixo de construção de conta (coerente com o pilar), e a Camada 2 nunca aparece antes de o jogador ter contexto para usá-la.

**Risco a monitorar:** transformar isso em mais uma moeda/grind. Deve ser desbloqueio por marco, não por farm. **[?]**

---

## 5. Presets recomendados

### 5.1 Presets globais

Seis, no máximo. Nomes em linguagem de jogador, não de sistema.

| Preset | Quando o jogador usa | Comportamento característico |
|---|---|---|
| **Padrão** | default de todo personagem novo | equilíbrio; sobrevive; não desperdiça |
| **Farm** | diária, dungeon abaixo do nível | máximo throughput; loot amplo; puxa grupos; consumível barato liberado |
| **Econômico** | conta sem recursos, farm longo | minimiza poção/consumível; aceita run mais lenta; recua mais cedo |
| **Boss** | boss semanal, alvo único | alvo único; segura cooldowns; prioridade de avoid alta; nunca desperdiça consumível de boss |
| **Sobrevivência** | conteúdo sincronizado acima da faixa | thresholds de cura altos; kite agressivo; DPS é secundário |
| **Assistido** | jogador quer jogar de verdade | **só Sobrevivência + Loot automáticos**; alvo, ações e movimento são do jogador |

O preset **Assistido** é estrategicamente importante: é a resposta para o jogador que gosta do combate e teme que o helper roube o jogo dele. Ter esse preset visível desde o começo comunica que a automação é escolha, não imposição. **[H]** É provavelmente o preset mais usado no vertical slice, quando o objetivo é justamente validar se o combate é divertido.

### 5.2 Defaults por classe

Cada classe entra com uma prioridade de ações e uma postura já montadas — o padrão de DA:O de entregar presets por classe pré-preenchidos [F].

| Classe | Espaçamento default | Alvo default | Nota |
|---|---|---|---|
| Knight | corpo a corpo, engaja | mais perigoso / mais próximo | segura posição; não persegue fora do grupo |
| Paladin | distância média, kite leve | mais fraco (finaliza) | mantém linha de tiro |
| Sorcerer | distância, kite forte | agrupamento (AoE) | prioriza posição de AoE antes de castar |
| Druid | distância média | menor HP aliado → senão inimigo | cura entra antes de dano por padrão |
| Monk | corpo a corpo, reposicionamento | mais próximo | usa dash/postura para engajar |

### 5.3 Regras de produto sobre presets

- Preset é **ponto de partida**, não trava: mexer em qualquer coisa cria "Padrão (modificado)" com botão de restaurar sempre visível.
- Preset é copiável entre personagens da mesma classe e exportável como código curto (padrão de código de build). **[H]** Isso desativa o pior cenário de sprawl sem introduzir scripting.
- Presets são salvos **por personagem e por modo** (livre vs. sincronizado), porque a intenção correta muda entre os dois. **[?]** — validar se isso não é complexidade demais para o MVP.

---

## 6. Regras avançadas opcionais (Camada 2)

### 6.1 Gramática

Uma forma única, sem aninhamento, sem `E`/`OU` no MVP:

```
QUANDO <condição>  →  <ação>  EM <alvo>
```

- Avaliação de cima para baixo; **primeira verdadeira vence**; nada abaixo roda naquele tick — semântica idêntica a FFXII e DA:O [F], que é o padrão que os jogadores do gênero já conhecem.
- Regras avançadas são avaliadas **antes** da lista de prioridade de ações. A lista é o fallback.
- O módulo Sobrevivência é avaliado **antes de tudo** e não é sobrescrevível por regra no MVP. É a garantia de que uma regra mal escrita não mata o jogador.

### 6.2 Orçamento e limites

- 3 slots iniciais no endgame inicial, até 6 no máximo. **Cap rígido.**
- Sem `E`/`OU`, sem regras aninhadas, sem variáveis, sem contadores no MVP. Cada uma dessas adições é um passo em direção a N5.
- Sem regras de navegação/waypoint — é a fronteira que separa "helper" de "cavebot" e a que mais arrisca transformar o jogo em configuração de bot.

### 6.3 Ferramentas obrigatórias no editor de regras

Estas não são polimento; são o que impede o sprawl documentado em todos os sistemas N4:

| Ferramenta | O que faz | Falha que previne |
|---|---|---|
| **Detector de regra morta** | marca regra que nunca dispararia porque uma acima a captura | regra morta invisível (falha clássica de gambits) |
| **Contador de disparos** | mostra quantas vezes cada regra disparou na última run | jogador não sabe se a regra funciona |
| **Pré-visualização** | "nesta run, esta regra teria disparado ~8×" | escrever no escuro |
| **Aviso de conflito** | regra que contradiz o preset/slider | inconsistência silenciosa |
| **Aviso de build alterada** | ao trocar skill/carta/sigil, sinaliza regras que referenciam algo que mudou | config apodrecida após respec |

O contador de disparos é o equivalente do histórico de execução de ferramentas de automação (IFTTT/Home Assistant) — na prática, é a única defesa real contra acúmulo de regras inúteis.

---

## 7. Feedback visual

Princípio: **comunicar mudança de estado, não narrar cada ação.** A literatura de automação aponta que os erros de modo vêm da combinação entre modelo mental incompleto e interface que não indica de forma saliente o estado e o comportamento do sistema [F]. Ou seja: o requisito é *consciência de modo*, não legenda contínua.

### 7.1 HUD permanente — "quem está no comando"

Uma tira compacta de 6 ícones (um por módulo), sempre visível, sem texto:

- **Aceso** = módulo automático.
- **Apagado** = manual/desligado.
- **Piscando** = suspenso temporariamente por input do jogador.

É o anunciador de modo do cockpit, reduzido a 6 pontos. Custo de tela quase zero, e resolve a pergunta "por que ele não está curando?" antes que ela vire desconfiança.

### 7.2 Intenção — o que vem a seguir

Ícone-fantasma da próxima ação escolhida, sobreposto à barra de ações, ~0,3–0,5s antes de executar. **[H]** Transforma o helper de "reativo e inexplicável" em "previsível": o jogador consegue interceptar antes, e é o que torna o override significativo em vez de corretivo.

### 7.3 Motivo — micro-tags de decisão

Rótulo curto e efêmero perto do personagem, **apenas em mudança de estado**:

- `Curando — HP 42%`
- `Trocando alvo — mais fraco`
- `Kite — 3 adjacentes`
- `Evitando — área`
- `Poupando poção — Econômico`

Regras anti-spam, obrigatórias:
- só em transição de estado, nunca por ação repetida;
- no máximo 1 tag a cada ~1,5s;
- fade rápido (~1s);
- nunca cobre o personagem nem a barra de vida.

Verbosidade configurável: **Desligado / Mínimo / Explicado / Debug**. Default: **Mínimo**. O modo *Explicado* deve ser ligado automaticamente nas primeiras runs e depois oferecer "já entendi, pode diminuir" — onboarding que se desliga sozinho.

### 7.4 Por que uma ação **não** foi usada

Falha silenciosa é a maior fonte de desconfiança. Na tela do helper e no tooltip da barra: ação indisponível fica esmaecida **com o motivo** — `sem mana`, `em recarga`, `condição não atendida (3+ inimigos)`, `alvo inválido`.

### 7.5 Relatório pós-run

Tela curta ao fim da dungeon, junto da recompensa:

- tempo de run, dano tomado, mortes;
- poções/consumíveis gastos (e quanto o preset economizou vs. o padrão);
- top 3 ações mais usadas;
- regras que dispararam / regras que nunca dispararam;
- **1 sugestão acionável, no máximo** — ex.: "você assumiu o controle 6 vezes para curar; quer subir o limiar de cura para 60%?".

Uma sugestão, nunca uma lista. Lista de sugestões é nagging e produz o efeito oposto ao pretendido.

---

## 8. Override manual

### 8.1 Regra de ouro

> **Input humano sempre vence. Sem confirmação, sem diálogo, sem penalidade, sem cooldown.**

Precedência: `input do jogador > módulo Sobrevivência > regras avançadas > prioridade de ações > postura`.

O precedente mais próximo é Granblue: o jogador pode selecionar skills manualmente **sem sair do Full Auto** [F]. E HSR expõe a válvula mínima "auto joga, eu solto o Ultimate" [F]. Ambos existem porque a alternativa — ter que desligar a automação para agir — é insuportável.

### 8.2 Três formas de override

| Forma | Gatilho | Efeito | Retorno ao automático |
|---|---|---|---|
| **Pontual** | jogador usa uma skill | aquela ação executa imediatamente; helper cede o tick | imediato |
| **Suspensão de módulo** | jogador age no domínio de um módulo (mover-se, escolher alvo) | aquele módulo suspende | ~2–3s de inatividade, ou ao reengajar [?] |
| **Assumir controle** | tecla dedicada | **todos** os módulos exceto Sobrevivência suspendem | mesma tecla, explicitamente |

Suspensão é **por módulo**, nunca global implícita. Mover-se manualmente não pode desligar a cura — é exatamente o caso de uso que os usuários de bot de Tibia mais citam ("pausar o cavebot e continuar o healing") [F].

### 8.3 Coisas que o helper nunca pode fazer

- Cancelar uma ação iniciada pelo jogador.
- Trocar um alvo que o jogador fixou manualmente (só sai quando morre ou quando o jogador libera) — o conceito de *Stick* dos targeters de Tibia [F].
- Reverter movimento manual "de volta para a posição correta".
- Exigir confirmação para qualquer coisa durante o combate.
- Mudar de configuração sozinho. **Nenhum valor configurável pode se alterar por comportamento do jogador** — é a lição direta das inclinações que mudam sozinhas em Dragon's Dogma [F].

### 8.4 Override que vira configuração

**[H]** Proposta distintiva: o jogo observa overrides repetidos e **oferece** virar regra.

> "Você curou manualmente 4 vezes com HP acima do limiar. Subir o limiar de cura para 60%?"  `[Sim] [Não] [Não perguntar]`

Isso responde diretamente ao briefing — "não queremos que o jogador precise microgerenciar dezenas de regras". Aqui, o jogador **joga**, e a configuração se escreve sozinha a partir do que ele já demonstrou querer.

Regras de contenção, obrigatórias:
- no máximo 1 sugestão por run, sempre no relatório pós-run, **nunca durante o combate**;
- só após ≥3 ocorrências do mesmo padrão;
- sempre reversível em um clique;
- "não perguntar" desliga permanentemente a categoria.

Risco: se calibrado mal, vira assistente intrusivo. **[?]** Candidato a teste no vertical slice, não a certeza.

---

## 9. Logging / debug

Dois produtos diferentes com a mesma fonte de dados.

### 9.1 Requisito de base: determinismo

**[H]** A decisão do helper deve ser **função pura de (estado do jogo, configuração)**. Sem aleatoriedade na escolha de ação. Consequências:

- o mesmo estado sempre produz a mesma decisão → o jogador consegue construir modelo mental;
- bug reportável = `seed + configuração + trace`;
- comportamento testável automaticamente.

Se houver necessidade de variação (evitar robotização visual), que seja em *timing*/animação, nunca em *escolha*.

### 9.2 Trace de decisão (interno)

Buffer circular, últimos ~60s ou ~2000 entradas. Por entrada:

`tick · módulo · regra/prioridade que venceu · condições avaliadas e seus valores · ação escolhida · alvo · resultado`

Registrar também **decisões negativas**: por que a ação de prioridade 1 foi rejeitada. Sem isso não se depura nada — o comportamento estranho quase sempre é "a regra que você esperava foi rejeitada por um motivo bobo".

### 9.3 Caixa-preta de morte (voltada ao jogador)

**A feature de confiança com melhor custo/benefício do documento.**

Ao morrer, oferecer "O que aconteceu?" → linha do tempo dos últimos ~5 segundos:

```
-4.8s  HP 92%  → Exori (3 inimigos)
-3.1s  +2 inimigos entram no alcance
-2.4s  HP 61%  → Golpe Pesado          [cura não disparou: limiar 45%]
-1.2s  HP 38%  → poção de HP           [em recarga 0.8s]
-0.4s  HP 11%  → cura                  [tarde demais]
 0.0s  morte
```

Efeito: a morte deixa de ser arbitrária e vira **um número errado que o jogador pode consertar** — com um botão "ajustar limiar para 60%" ali mesmo. É a conversão direta de frustração em agência.

### 9.4 Overlay de desenvolvimento

Para o time, no vertical slice: alcance de aggro/target, alvo atual e candidatos com score, caminho planejado, zonas de avoid, próxima ação e regra vencedora, thresholds ativos.

### 9.5 Métricas agregadas

Instrumentar desde o vertical slice:

- mortes por hora com helper ativo, por preset e por dungeon;
- overrides por minuto (e de qual módulo) — **pico de override = módulo mal calibrado**;
- % de jogadores que abriram a tela do helper / mexeram / criaram regra;
- consumíveis gastos por run vs. teórico;
- regras nunca disparadas (por regra, agregado);
- taxa de aceitação das sugestões pós-run.

---

## 10. Riscos de frustração

Ordenados por severidade estimada. Cada um com mitigação e sinal de alerta mensurável.

| # | Risco | Por que acontece | Mitigação | Sinal de alerta |
|---|---|---|---|---|
| 1 | **Morte inexplicável** | caixa-preta; jogador não vê o motivo | caixa-preta de morte (§9.3); Sobrevivência sempre ativo e prioritário | mortes/hora com helper ativo acima do baseline manual |
| 2 | **Imposto de setup** | jogo chato antes de configurar | presets preenchidos; contrato de que nenhum conteúdo exige Camada 2 | tempo até a 1ª run bem-sucedida sem abrir o helper |
| 3 | **Desperdício de recurso limitado** | IA gasta consumível/cooldown em momento inútil (caso HSR [F]) | slider de Consumíveis; preset Econômico; nunca gastar item de boss em trash | consumíveis/run muito acima do teórico |
| 4 | **Sprawl de regras** | N4 sem limite | cap rígido de 3–6; detector de regra morta; export/import | média de regras por personagem > 4 |
| 5 | **Config apodrecida** | build/carta/sigil muda e a config vira lixo silenciosamente | aviso de build alterada; thresholds relativos | pico de mortes logo após respec |
| 6 | **Confusão de modo** | jogador não sabe quem controla | tira de 6 ícones sempre visível; "assumir controle" explícito | overrides que não produzem efeito percebido |
| 7 | **Boss que o helper não sabe jogar** | mecânica exige leitura humana | contrato com W11: mecânica legível pelo helper **ou** explicitamente sinalizada como manual | mortes concentradas em uma mecânica específica |
| 8 | **Excesso de confiança (AFK)** | jogador confia demais e perde run/recursos | comportamento de recuo em HP crítico; helper prefere abortar a morrer **[?]** | mortes com zero input nos 30s anteriores |
| 9 | **Desconfiança (nunca liga)** | jogador não acredita e joga tudo manual | preset Assistido visível; modo Explicado no onboarding | % que joga a diária 100% manual |
| 10 | **Spam de feedback** | narrar toda ação | tags só em transição; verbosidade configurável | jogadores desligando o feedback logo cedo |
| 11 | **Agência dissolvida** | helper faz tudo, jogo joga sozinho | energia limita ganho; decisões pré-run (build/rota/risco/dificuldade) | sessão sem nenhuma decisão significativa do jogador |
| 12 | **Sugestões intrusivas** | override→regra mal calibrado | 1 por run, só pós-run, "não perguntar" permanente | taxa de aceitação baixa + uso de "não perguntar" |
| 13 | **Auto-loot errado** | pega lixo / perde raro / perde tempo | filtro de loot separado e simples (raridade + lista de exceções), não regras | loot manual frequente após a run |
| 14 | **Quebra no modo sincronizado** | config escrita em valores absolutos | percentuais relativos obrigatórios; preset por modo | mortes desproporcionais no sincronizado |

> **O risco #11 é o único que não se resolve na UX do helper.** Ele se resolve no design do jogo: energia/resina limitando ganho, e decisão humana concentrada em build, rota, dificuldade e gasto de recursos. Se o combate automatizado for a única coisa que acontece na sessão, nenhuma quantidade de feedback visual salva.

---

## 11. Decisões abertas

1. **[?]** Regras avançadas pertencem ao personagem, à classe ou ao preset?
2. **[?]** Slots/condições como desbloqueio por marco ou como item equipável (modelo Warframe)? O modelo de item é mais coerente com "helper como build", mas adiciona inventário.
3. **[?]** Navegação automática entra no MVP ou fica para depois do vertical slice?
4. **[?]** Preset separado por modo (livre vs. sincronizado) — necessário ou complexidade prematura?
5. **[?]** O helper pode abortar a run para preservar recursos? Isso protege o jogador ou tira agência?
6. **[?]** O módulo Sobrevivência algum dia se torna desligável (para desafio/conquistas)?
7. **[?]** "Override vira regra" entra no vertical slice ou é feature pós-validação?
8. **[?]** Sugestão pós-run deve existir no MVP, ou o relatório começa apenas informativo?

---

## 12. O que testar no vertical slice

Ordem de prioridade, alinhada à pergunta central do projeto:

1. **Preset Assistido** — o combate é divertido quando só cura e loot são automáticos? (Isso valida "Tibia + dash + postura é divertido" antes de validar o helper.)
2. **Preset Padrão** — a run é limpa **sem tocar em nada**? Este é o teste do contrato da §3.2.
3. **Sliders de intenção com tradução visível** — o jogador entende o que mudou?
4. **Lista de prioridade com chips de condição** — o jogador reordena espontaneamente? Usa os chips?
5. **Caixa-preta de morte** — depois de ver, o jogador ajusta e volta, ou desliga o helper?
6. **Tira de módulos + override pontual** — o jogador percebe quem está no comando?

Regras avançadas (Camada 2) **não precisam existir no vertical slice**. Se as camadas 0 e 1 já sustentarem o loop, isso é a validação mais importante deste documento.

---

## 13. Fontes

### Sistemas de regras e táticas
- [Gambits — Final Fantasy Wiki](https://finalfantasy.fandom.com/wiki/Gambits)
- [Final Fantasy 12: A Complete Guide To Gambits — TheGamer](https://www.thegamer.com/final-fantasy-12-complete-guide-gambits/)
- [Battle System — Gameplay Mechanics — Gamer Guides (FFXII: The Zodiac Age)](https://www.gamerguides.com/final-fantasy-xii/guide/basics/gameplay-mechanics/battle-system)
- [Final Fantasy XII — Wikipedia](https://en.wikipedia.org/wiki/Final_Fantasy_XII)
- [Tactics (Origins) — Dragon Age Wiki (Fandom)](https://dragonage.fandom.com/wiki/Tactics_(Origins))
- [Tactics (Origins) — Dragon Age Wiki (Miraheze)](https://dragonage.miraheze.org/wiki/Tactics_(Origins))
- [Combat Tactics — Dragon Age Wiki](https://dragonage.fandom.com/wiki/Combat_Tactics)
- [Pillars of Eternity 2: Your party's AI — gamepressure](https://www.gamepressure.com/pillars-of-eternity-2/partys-ai/z1ae65)
- [AI Behavior: Understanding how it works — Steam Guide (Deadfire)](https://steamcommunity.com/sharedfiles/filedetails/?id=1392162466)
- [More Custom AI Conditions — Deadfire Nexus](https://www.nexusmods.com/pillarsofeternity2/mods/88)

### Companion AI e postura
- [Pawn Inclination — Dragon's Dogma Wiki](https://dragonsdogma.fandom.com/wiki/Pawn_Inclination)
- [Pawn Inclination: Under the Hood — Dragon's Dogma Wiki](https://dragonsdogma.fandom.com/wiki/Pawn_Inclination_:_Under_the_Hood)
- [Inclinations — Dragon's Dogma Wiki (Fextralife)](https://dragonsdogma.wiki.fextralife.com/Inclinations)
- [Pawn Inclination Frustrations — Steam Discussions](https://steamcommunity.com/app/367500/discussions/0/1333474229061401765/)
- [Rethinking Persona 3's Most Divisive Mechanics — Persona Central](https://personacentral.com/rethinking-persona-3-divisive-mechanics/)

### Prioridade ordenada / IA como loadout
- [Precept — WARFRAME Wiki](https://wiki.warframe.com/w/Precept)
- [Companions — WARFRAME Wiki](https://wiki.warframe.com/w/Companion)
- [Sentinel — WARFRAME Wiki](https://wiki.warframe.com/w/Sentinel)
- [Work — RimWorld Wiki](https://www.rimworldwiki.com/wiki/Work)
- [How To Do Manual Priorities — RimWorld Steam Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2070888684)

### Auto-battle (sessão curta / mobile / gacha)
- [Full Auto — Granblue Fantasy Wiki](https://gbf.wiki/Full_Auto)
- [Battle System 2.0 / Guard — Granblue Fantasy Wiki](https://gbf.wiki/Guard)
- [Auto-Battle — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Auto-Battle)
- [How to get the most out of Honkai: Star Rail's polarizing auto-battle system — Digital Trends](https://www.digitaltrends.com/gaming/honkai-star-rail-auto-battle/)
- [Why You Should Never Use Auto Battle — EarlyGame](https://earlygame.com/gaming/honkai-star-rail-why-you-should-never-use-auto-battle)
- [What is Auto-Combat? — Black Desert Mobile Guide](https://www.appgamer.com/black-desert-mobile/strategy-guide/what-is-auto-combat)
- [Black Desert Mobile Auto Combat Explained — Gamezebo](https://www.gamezebo.com/walkthroughs/black-desert-mobile-auto-combat-explained-how-to-auto-attack-enemies/)
- [Full Auto-Combat Guide — WriterParty](https://writerparty.com/party/black-desert-mobile-full-auto-combat-guide-how-to-unlock-and-when-to-auto-attack-and-when-not-to/)

### Automação bot-like (Tibia e correlatos)
- [Targeting Tab Tutorial — Elfbot Scripts](https://elfbotscripts.freeforums.net/thread/67/targeting-tab-tutorial)
- [Como configurar a aba "Healing" do seu Elfbot — ElfBot NG Brasil](https://www.elfbot.com.br/2023/01/como-configurar-aba-healing-do-seu-elfbot.html)
- [Como pausar o Cavebot e continuar usando o Healing — ElfBot NG Brasil](https://www.elfbot.com.br/2024/10/como-pausar-o-cavebot-e-continuar.html)
- [Elfbot — Masiyah Wiki](https://masiyah.fandom.com/wiki/Elfbot)

### Scripting total (o limite a não cruzar)
- [Homunculus AI Script User Guide (oficial)](http://winter.sgv417.jp/alchemy/download/official/AI_manual_en.html)
- [ro-rail — Rampage AI Lite (GitHub)](https://github.com/rmgrimm/ro-rail)
- [YggAI — AI for Ragnarok Online (GitHub)](https://github.com/maxmx03/ragnarok-ai)

### Fatores humanos / confiança em automação
- [Lee & See (2004), *Trust in Automation: Designing for Appropriate Reliance* — PubMed](https://pubmed.ncbi.nlm.nih.gov/15151155/)
- [Lee & See (2004) — SAGE Journals](https://journals.sagepub.com/doi/10.1518/hfes.46.1.50_30392)
- [Automation Surprises (Sarter & Woods) — Semantic Scholar](https://www.semanticscholar.org/paper/Automation-Surprises-Surprises-Sarter/f4c7caebecd0f1b42d1eb8da1061e464fcccae11)
- ["Automation Surprise" in Aviation — ACM CHI 2015](https://dl.acm.org/doi/10.1145/2702123.2702521)
- [Mode Confusion Analysis of a Flight Guidance System — NASA](https://shemesh.larc.nasa.gov/fm/papers/ModeConfusionAnalysisUsingFormalMethods.pdf)

### Referências citadas sem consulta direta nesta pesquisa
IFTTT, filtros do Gmail, Home Assistant e Apple Shortcuts aparecem como exemplos de gramática condicional fora de jogos. São conhecimento geral e **não** foram verificados em fonte nesta rodada — tratar como ilustração, não como dado.
