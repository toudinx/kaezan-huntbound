# W11 — Boss design para combate tile-based com dash, postura e helper

> Pesquisa de referência para **Kaezan Huntbound**.
> Escopo: padrões de boss design que funcionam em **top-down / grid / ARPG**, considerando que o **helper automatiza targeting e skills**.
> Objetivo: descobrir **onde a dificuldade pode morar** quando o DPS já está automatizado.
> Não copiamos bosses específicos. Trabalhamos com **padrões** (primitivas reutilizáveis) e composição.
> Sem implementação de código, conforme o briefing.
> Pesquisa consolidada em agosto/2026.

---

## 0. Premissas e uma ambiguidade que precisa ser resolvida

**Premissas assumidas do BASE_CONTEXTO:**

- combate top-down, tile/grid, feeling de Tibia, single-player;
- kits enxutos (~4–6 ações relevantes por classe) + runas + dash + postura;
- helper é **pilar**, não muleta: "o helper executa repetição, o jogador toma decisões";
- **não** nerfar/desligar o helper no endgame;
- viewport provavelmente próximo do padrão Tibia (~15×11 tiles visíveis).

**A ambiguidade:** o termo *"postura"* aparece em todo o dossiê como **sistema próprio do jogador** (ao lado de dash), herdado do Arena Fable. Já o prompt do W11 pede pesquisa sobre *"posture/stagger"*, que na literatura de design significa **barra de ruptura do inimigo** (Sekiro, Honkai: Star Rail, Lies of P).

São dois sistemas diferentes e ambos são úteis. Este documento trata os dois, separadamente:

| Termo neste doc | Significado | Dono |
|---|---|---|
| **Postura** | estado/stance do personagem do jogador (agressiva, defensiva, etc.) | jogador |
| **Ruptura** (break/stagger) | barra que, ao zerar, coloca o inimigo em janela de vulnerabilidade | inimigo |

> **Decisão pendente (seção 11):** confirmar se "postura" no Arena Fable é stance do jogador, barra de stagger, ou os dois fundidos. A nomenclatura de UI precisa separá-los, senão o jogador nunca vai entender qual barra está olhando.

---

## 1. O problema central: o helper não é o inimigo do boss design

A formulação intuitiva é *"o helper joga sozinho, então preciso de mecânicas que ele não consiga resolver"*. **Essa formulação está errada** e leva direto a bosses ruins.

Motivo: um bot com informação perfeita **reage melhor que um humano**. Se a dificuldade for reação a telegraph, interrupt em cast bar, ou timing de poção, o helper não só resolve — resolve *melhor*. Qualquer tentativa de vencer o bot na reação produz uma de duas coisas:

1. mecânica trivial para quem usa helper (a maioria dos jogadores);
2. mecânica sintonizada contra o bot, e portanto **impossível para quem joga manualmente**.

A formulação correta é:

> **O helper é a linguagem em que o jogador escreve sua resposta ao boss.**
> O boss não testa os dedos do jogador. Testa **se o jogador entendeu o problema e configurou/preparou a resposta certa.**

Isso é consistente com o pilar já definido no BASE_CONTEXTO e com o que gachas com auto-battle descobriram na prática: o auto resolve campanha e farm, mas o conteúdo de pico "quer" mão humana em momentos específicos ([Ultimate Gacha](https://ultimategacha.com/best-gacha-games-with-skill-based-combat/)).

### 1.1 Os quatro tipos de pressão

Toda mecânica de boss cobra alguma coisa do jogador. Classificar por **o que é cobrado** resolve 80% das decisões de design:

| Tier | Pressão | O que o jogador faz | Helper resolve? | Uso recomendado |
|---|---|---|---|---|
| **T1** | **Configuração** | ajusta preset/prioridades do helper antes da luta | Sim, **se bem configurado** | Base de tudo. Maioria das mecânicas. |
| **T2** | **Preparação** | build, gear, resistências, runas, consumíveis, cartas, rota | Não — decisão é fora do combate | Onde mora a dificuldade real do endgame |
| **T3** | **Intervenção** | assume o controle em 3–6 momentos pontuais da luta | Não — por design | Clímax. Momentos memoráveis. |
| **T4** | **Execução contínua** | 2–3 minutos de reação frame a frame | Trivializa **ou** exclui o manual | **Evitar.** Antipadrão para este jogo. |

**Alvo de composição por boss `[inferência, a validar em playtest]`:**
- ~60% da luta em T1 (o helper toca, o jogador observa);
- ~25% em T2 (a luta é decidida antes de começar);
- ~15% em T3 (3–6 momentos de "mão no volante");
- 0% em T4.

Isso também define a métrica de sucesso: **se o jogador vence 100% da luta sem tocar em nada, o boss falhou no T3. Se ele precisa tocar o tempo todo, o boss falhou no T4.**

### 1.2 A regra técnica que sustenta tudo isso

Para que o helper possa ser a linguagem de resposta, ele precisa **conseguir ler o boss**. Daí uma regra dura:

> **Toda mecânica do tipo "pare de fazer X" ou "faça Y agora" precisa existir como estado nomeado no modelo de dados — não apenas como VFX.**

Exemplos de estados nomeados obrigatórios: `refletindo`, `invulnerável`, `absorvendo_cura`, `conjurando_<nome>`, `rompido`, `enraivecido`, `imune_a_<tipo>`, `zona_perigosa(tile)`.

Sem isso:
- o helper continua atacando durante reflect e mata o jogador **sem que ele entenda o porquê** — exatamente a "caixa preta" que o W10 quer evitar;
- fica impossível escrever regras legíveis de helper ("não atacar enquanto `refletindo`");
- fica impossível dar feedback honesto ("o helper parou porque o alvo está `invulnerável`").

Esse é provavelmente o **requisito de arquitetura mais importante** que sai desta pesquisa.

---

## 2. O que o grid muda (e o que ele dá de graça)

### 2.1 Vantagens do tile

**Informação perfeita é natural.** Em grid, um telegraph não é "mais ou menos ali" — é um **conjunto exato de tiles**. O jogador consegue *contar*. Into the Breach construiu um jogo inteiro sobre isso: telegrafar tudo fez com que "cada morte parecesse culpa do próprio jogador", e o jogador passa menos tempo entendendo o jogo e mais tempo resolvendo o problema ([Subset Games](https://subsetgames.com/itb.html), [Game Developer](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)).

Consequências práticas:
- dá para exibir a área exata do dano **sem ambiguidade de pixel**;
- dá para o jogador planejar a rota de fuga contando tiles;
- dá para o helper ler a mesma coisa que o jogador vê — **justiça simétrica**.

**Vocabulário Tibia já é tile-nativo.** Wave (cone na direção do olhar), beam em linha, área 3×3/5×5 em cruz, campos persistentes (fogo/energia/veneno), summons, fase de cura/invulnerabilidade, empurrão. Esse conjunto já é familiar ao jogador-alvo e barato de produzir.

### 2.2 Restrições do tile (que mudam o balanceamento inteiro)

**1. Esquiva é quantizada.** Não existe "esquivar por pouco". Ou você está no tile seguro ou não está. Isso torna a margem de erro um número inteiro, e números inteiros pequenos são cruéis. Regra prática:

> Nenhum telegraph deve exigir precisão de **1 tile** em fase inicial. Comece com áreas seguras de **≥2 tiles de largura**.

**2. A janela de telegraph é uma função de distância, não de "tempo dramático".**

```
janela_mínima = (tiles_até_o_tile_seguro × tempo_por_tile)
              + 0,40s de reconhecimento
              + 0,15s de folga
```

Com velocidade base estilo Tibia (~0,3s/tile a pé) `[inferência]`:

| Padrão | Tiles a percorrer | Janela mínima |
|---|---|---|
| Passo lateral | 1 | ~0,85s |
| Sair de um 3×3 | 2 | ~1,15s |
| Reposicionar para safe spot | 4 | ~1,75s |
| Atravessar meia arena | 7 | ~2,65s |

**Se a janela for menor que isso, o padrão não é difícil — é injusto**, e o helper (que não tem 0,40s de reconhecimento) vai passar enquanto o jogador manual morre.

**3. Diagonais mudam todos os números.** Se o movimento for 8-direcional com diagonal mais lenta (padrão Tibia), a distância real não é euclidiana nem Manhattan — é Chebyshev com custo variável. **Isso precisa ser decidido antes de qualquer tuning de telegraph**, porque muda toda a tabela acima.

**4. O viewport é a arena.** Em top-down com câmera fixa em ~15×11 tiles, **qualquer mecânica que dependa de informação fora da tela é injusta**. Regras derivadas:
- arena de boss cabe no viewport, **ou**
- a arena é maior, mas nenhuma mecânica letal se origina fora da tela sem aviso sonoro/UI;
- indicadores de borda (setas) para adds e telegraphs que entram de fora.

**5. Sobreposição visual é o assassino silencioso.** Diablo IV é o caso de estudo: efeitos de chão empilhados destroem a visibilidade, jogadores morrem para telegraphs que **existiam mas não podiam ser vistos**, e a resposta da comunidade foi pedir toggles de efeito ([Icy Veins](https://www.icy-veins.com/d4/news/diablo-4-effect-toggles-players-renew-calls-for-this-feature/), [PCGamesN](https://www.pcgamesn.com/diablo-4/ground-effects)). Em 2D top-down com sprites pequenos, o risco é **maior**, não menor.

---

## 3. Biblioteca de padrões

Formato das colunas:

- **Exige** — o que o padrão cobra do jogador.
- **Grid** — quão bem o padrão se comporta em tile (★★★ = tile-nativo; ★ = sofre com quantização).
- **Helper** — o helper resolve sozinho? (`Trivial` / `Se configurado` / `Preparo` / `Intervenção`).
- **Custo** — esforço de produção (Baixo / Médio / Alto).

### 3.1 Grupo A — Position checks (padrões de posição)

| # | Padrão | Exige | Grid | Helper | Custo |
|---|---|---|---|---|---|
| A1 | **Área fixa** (círculo/quadrado/cruz telegrafado) | sair de N tiles | ★★★ | Trivial | Baixo |
| A2 | **Cone / wave direcional** (na direção do olhar) | sair da linha de frente ou flanquear | ★★★ | Se configurado | Baixo |
| A3 | **Linha / beam** (fileira ou coluna inteira) | mudar de linha | ★★★ | Trivial | Baixo |
| A4 | **Donut** (seguro no centro, perto do boss) | **aproximar-se** do perigo | ★★★ | Se configurado | Baixo |
| A5 | **Safe spot único** (arena inteira menos N tiles) | identificar e correr | ★★★ | Se configurado | Baixo |
| A6 | **Xadrez / checkerboard** (tiles alternados) | ler paridade | ★★★ | Se configurado | Baixo |
| A7 | **Varredura sequencial** (colunas caem em ordem) | ler a direção e andar contra | ★★★ | Se configurado | Baixo |
| A8 | **Rotação (relógio)** — feixe girando | movimento contínuo sincronizado | ★★ | Se configurado | Médio |
| A9 | **Proximidade** — dano proporcional à distância | escolher perto ou longe | ★★★ | Se configurado | Baixo |
| A10 | **Tower / placa de pressão** — alguém precisa pisar | **parar** de andar, ficar em cima | ★★★ | Intervenção | Baixo |
| A11 | **Marcação retardada** — o tile onde você está explode em Xs | sair de onde você estava | ★★★ | Trivial | Baixo |
| A12 | **Predição / aimed-ahead** — mira onde você *vai* estar | quebrar o próprio padrão de movimento | ★★ | Preparo | Médio |
| A13 | **Linha de visão / cobertura** — precisa de obstáculo | usar mobília da arena | ★★★ | Se configurado | Médio |
| A14 | **Perseguidor persistente** (sombra que segue) | kite consciente, gestão de espaço | ★★★ | Trivial | Baixo |
| A15 | **Spread/Stack (versão solo)** — junto dos adds ou longe deles | decidir agrupar ou dispersar | ★★ | Se configurado | Médio |

**Notas:**
- O vocabulário canônico de telegraphs top-down vem de MMORPGs de raid: stack, spread, cleave, donut, tower, linha ([Gamer Escape — Common Mechanics](https://ffxiv.gamerescape.com/wiki/Common_Mechanics)). É a biblioteca mais madura que existe para *"dano em área desenhado no chão, visto de cima"* — e quase toda ela é traduzível para solo.
- **A4 (donut) e A9 (proximidade) são os padrões mais valiosos da lista** porque invertem o instinto de fuga e obrigam o jogador a *entrar* no perigo. São também os que mais quebram helpers mal configurados com regra "manter distância".
- A biblioteca de danmaku ensina o princípio-mestre: **um padrão não é o desenho das balas, é o desenho das lacunas** ([npaka](https://note.com/npaka/n/n5d38b7d84173?hl=en), [Sparen's Danmaku Design Studio](https://sparen.github.io/ph3tutorials/danmakudesign.html)). Em grid, "a lacuna" é literalmente um conjunto de tiles — projete a lacuna primeiro, o ataque depois.

### 3.2 Grupo B — Hazards e terreno

| # | Padrão | Exige | Grid | Helper | Custo |
|---|---|---|---|---|---|
| B1 | **Campo persistente** (fogo/gelo/veneno em tiles) | gestão de espaço ao longo do tempo | ★★★ | Se configurado | Baixo |
| B2 | **Arena encolhendo** | economia de espaço, urgência | ★★★ | Preparo | Baixo |
| B3 | **Terreno consumível** (tiles somem ao serem pisados) | planejar rota, não desperdiçar | ★★★ | Intervenção | Médio |
| B4 | **Terreno com propriedade** (lama = lento, gelo = desliza) | recalcular custo de movimento | ★★★ | Se configurado | Médio |
| B5 | **Tiles seguros rotativos** (a segurança se move) | acompanhar o ciclo | ★★★ | Se configurado | Baixo |
| B6 | **Trilha do boss** (deixa rastro perigoso) | não deixar a arena virar labirinto | ★★★ | Se configurado | Baixo |
| B7 | **On-death hazard** (mob explode ao morrer) | controlar **onde** os mobs morrem | ★★★ | Preparo | Médio |
| B8 | **Empurrão / puxão** (knockback direcional) | posicionar-se contando o deslocamento | ★★★ | Preparo | Médio |

**Notas:**
- B1 e B8 são **Tibia-nativos** (field runes, empurrão) — custo quase zero.
- **B7 é a mecânica mais perigosa da tabela** para nós. On-death effects em ARPG são a fonte clássica de morte "sem explicação", porque o jogador não estava olhando para o mob que morreu — e com auto-attack, ele **nem escolheu** matá-lo. Se usarmos, o efeito precisa de telegraph *pós-morte* de pelo menos 1s e cor dedicada.
- B2 (arena encolhendo) é um **soft enrage disfarçado** — ver 3.3.

### 3.3 Grupo C — Tempo, ritmo e ruptura

| # | Padrão | Exige | Grid | Helper | Custo |
|---|---|---|---|---|---|
| C1 | **Cast interrompível** (barra + ação de interrupt) | ter e gastar o interrupt | ★★★ | Trivial | Baixo |
| C2 | **Canal com barra de ruptura** — quebra por dano acumulado | burst no momento certo | ★★★ | Se configurado | Médio |
| C3 | **Janela de vulnerabilidade** (pós-ruptura) | ter burst guardado para o momento | ★★★ | Preparo | Médio |
| C4 | **Ruptura com regeneração** (Sekiro-like) | pressão **sustentada**, proíbe kite infinito | ★★★ | Preparo | Médio |
| C5 | **Ruptura condicional** (só quebra com tipo de dano X) | build/elemento certo | ★★★ | **Preparo** | Médio |
| C6 | **Enrage duro** (invencível/one-shot após T) | DPS bruto | ★★★ | Preparo | Baixo |
| C7 | **Soft enrage** (dano crescente, debuff empilhando) | terminar a luta antes de virar insustentável | ★★★ | Preparo | Baixo |
| C8 | **Ciclo fixo (metrônomo)** | memorização, planejamento | ★★★ | Se configurado | Baixo |
| C9 | **Sobreposição escalonada** (dois padrões conhecidos ao mesmo tempo) | dividir atenção | ★★★ | Se configurado | Baixo |
| C10 | **Downtime / intermissão** (fase sem boss) | reposicionar, curar, reconfigurar | ★★★ | Se configurado | Baixo |

**Notas críticas:**

- **C1 (interrupt) é um dos piores padrões para este jogo.** Um bot nunca perde um kick. Se o interrupt existir, ele deve ser um **recurso escasso** (1–2 cargas por fase, cooldown longo) para que a decisão seja *"gastar agora ou guardar?"* (T2/T3), não *"apertar quando a barra aparecer"* (T4 automatizado).

- **C4 é a ferramenta antidegeneração mais importante que encontramos.** Em Sekiro a postura regenera, e a regeneração é inversamente proporcional à vida — o que impede que a luta se arraste e **força agressão** ([Fextralife](https://sekiroshadowsdietwice.wiki.fextralife.com/Posture) / análise em [What's in a Game](http://whats-in-a-game.com/sekiros-genius-posture-mechanic/)). Traduzido para nós:

  > **Ruptura que regenera é o antídoto do kite infinito do helper.**
  > Se o jogador configurar o helper para "sempre manter distância e nunca arriscar", a barra de ruptura regenera e **a luta nunca termina**. Isso pune a estratégia degenerada sem precisar de timer artificial.

- **C6 (enrage duro) vs C7 (soft):** a discussão clássica de MMO é que enrage duro existe para impedir que o grupo *"cheese"* a luta com defesa infinita, mas corta estratégias legítimas ([FFXIV Forum](https://forum.square-enix.com/ffxiv/threads/401326), [MMO-Champion](https://www.mmo-champion.com/threads/1105620-Enrage-timers)). Para Huntbound, a leitura é direta:
  - enrage duro + helper = "seu build não passa, tchau" — informação binária e pouco educativa;
  - **soft enrage (C7) ou C4 são estritamente melhores** porque comunicam a falha gradualmente e permitem que o jogador *sinta* que está perdendo antes de perder.

- **C5 é o padrão de maior alavancagem para T2.** Honkai: Star Rail usa Toughness + fraqueza elemental por inimigo, sem tabela fixa de "elemento X bate em Y": a fraqueza está **no inimigo**, o que empurra a decisão para composição/build ([GameRant](https://gamerant.com/honkai-star-rail-weakness-break-toughness-elements-explained/), [GINX](https://www.ginx.tv/en/honkai-star-rail/weakness-break-toughness)). Isso é exatamente o tipo de pressão que **o helper não pode resolver sozinho** — ele executa a rotação, mas não escolhe a build.

### 3.4 Grupo D — Alvo, agro e vínculo

| # | Padrão | Exige | Grid | Helper | Custo |
|---|---|---|---|---|---|
| D1 | **Prioridade de alvo forçada** (matar o add certo) | preset de targeting correto | ★★★ | **Se configurado** | Baixo |
| D2 | **Alvo proibido** (atacar X cura o boss) | preset com exclusão | ★★★ | Se configurado | Baixo |
| D3 | **Tether / corrente** (elo que exige distância ou proximidade) | gestão de distância explícita | ★★★ | Se configurado | Médio |
| D4 | **Fixate** (o boss ignora tudo e vem em você) | kite puro | ★★★ | Trivial | Baixo |
| D5 | **Debuff acumulativo** que obriga rodízio de comportamento | trocar de postura/posição | ★★★ | Intervenção | Médio |
| D6 | **Imunidade condicional** (só toma dano sob condição) | criar a condição | ★★★ | Preparo | Médio |
| D7 | **Reflect / thorns** (atacar machuca você) | **parar de atacar** | ★★★ | Se configurado ⚠ | Baixo |

⚠ **D7 e D2 são as duas mecânicas que mais matam jogadores de helper injustamente.** Só são aceitáveis com a regra da seção 1.2 (estado nomeado + telegraph + regra de helper disponível). Com ela, viram **excelentes** mecânicas T1: o boss testa se o preset do jogador sabe parar.

### 3.5 Grupo E — Adds e mobília de arena

| # | Padrão | Exige | Grid | Helper | Custo |
|---|---|---|---|---|---|
| E1 | **Adds que curam o boss** | trocar prioridade rápido | ★★★ | Se configurado | Baixo |
| E2 | **Adds em ordem / simultâneos** | controle de dano, não overkill | ★★★ | Intervenção | Médio |
| E3 | **Add portador** (carrega buff/escudo do boss) | identificar e focar | ★★★ | Se configurado | Baixo |
| E4 | **Objetos destrutíveis** (pilares, braseiros) | gastar recurso finito da arena | ★★★ | Intervenção | Médio |
| E5 | **Objetos interativos** (alavanca, altar, tocha) | **sair do combate** para agir | ★★★ | **Intervenção** | Médio |
| E6 | **Spawn contínuo com cap** | sustentar limpeza sem perder o boss | ★★★ | Se configurado | Baixo |

**Nota:** E4/E5 são os melhores geradores de **T3 (intervenção)** de custo baixo, porque a ação é *espacial e discreta* — "vá até aquele tile e aperte" — algo que o jogador entende instantaneamente e que é aceitável exigir manualmente 2–4 vezes por luta. Wakfu/Dofus usam essa gramática (glifos no chão, ovos que eclodem se não forem destruídos, objetos que mudam o estado da luta) dentro do mesmo espaço de grid ([Wakfu — Dungeon Boss Mechanics Compendium](https://www.wakfu.com/en/forum/143-guides/239903-guide-dungeon-boss-mechanics-compendium-wip)).

### 3.6 Grupo F — Fases

| # | Padrão | Gatilho | Função | Custo |
|---|---|---|---|---|
| F1 | **Fase por HP** (100→70→40%) | limiar de vida | ritmo previsível, ensina escalada | Baixo |
| F2 | **Fase por ruptura** | quebrar a barra N vezes | premia burst e build | Médio |
| F3 | **Fase por objetivo** (destrua os 4 pilares) | ação do jogador | dá agência, gera T3 | Médio |
| F4 | **Fase por tempo** | cronômetro | risco de virar enrage disfarçado | Baixo |
| F5 | **Intermissão** (boss invulnerável, foco muda) | script | respiro, reconfiguração, ensino | Baixo |
| F6 | **Reversão** (boss recupera algo se você falhar) | falha do jogador | tensão real sem morte instantânea | Médio |

**Regra de ouro de fase:** cada transição deve **adicionar no máximo um padrão novo** e, de preferência, **remover um antigo**. Fase que só empilha vira ruído.

### 3.7 Grupo G — Pressão sobre recursos do jogador

| # | Padrão | Exige | Helper | Custo |
|---|---|---|---|---|
| G1 | **Dreno de mana/recurso** | economia de skills | Preparo | Baixo |
| G2 | **Cooldown de dash aumentado / cargas roubadas** | economia de mobilidade | Preparo | Médio |
| G3 | **Bloqueio ou redução de cura** | preparo (consumíveis, mitigação) | Preparo | Baixo |
| G4 | **Punição a spam** (skill usada 2× seguidas custa mais) | rotação variada | Se configurado | Médio |
| G5 | **Limite de trocas de postura** | comprometimento com uma postura | Intervenção | Médio |

Este grupo é subestimado. **Pressionar recursos é a forma mais barata de tornar T2 (preparação) obrigatório sem inventar mecânica nova** — o boss não faz nada diferente, mas a economia do jogador muda.

---

## 4. Padrões adequados ao nosso jogo

### 4.1 Núcleo recomendado (construir primeiro)

Doze padrões que, combinados, cobrem praticamente qualquer boss que vamos querer fazer:

| Prioridade | Padrão | Por que este |
|---|---|---|
| 1 | **A1 Área fixa** | primitiva-mãe de todo telegraph; ensina a linguagem visual |
| 2 | **A3 Linha/beam** | tile-nativo, leitura instantânea, escala bem |
| 3 | **A2 Cone/wave** | herança Tibia direta; ensina "posicione-se em relação ao olhar" |
| 4 | **A4 Donut** | inverte o instinto; quebra helper mal configurado; custo zero |
| 5 | **B1 Campo persistente** | transforma arena em recurso; Tibia-nativo |
| 6 | **C8 Ciclo fixo** | a base da legibilidade: padrão memorizável antes de complicar |
| 7 | **C4 Ruptura com regeneração** | mata o kite infinito; dá ritmo de "acumular → romper → burst" |
| 8 | **C5 Ruptura condicional** | move a dificuldade para build (T2) — o eixo mais valioso |
| 9 | **D1/D2 Prioridade e proibição de alvo** | testa o preset do helper diretamente |
| 10 | **E5 Objeto interativo** | gerador barato e legível de T3 |
| 11 | **F1 Fase por HP** | ritmo, custo baixo, expectativa clara |
| 12 | **G2 Pressão sobre dash** | dá peso econômico à mobilidade |

Com esses doze e um sistema de composição, dá para montar **dezenas** de bosses sem arte nova.

### 4.2 Segunda onda (quando o núcleo estiver validado)

A6 xadrez · A7 varredura · A9 proximidade · A10 tower · A13 cobertura/LoS · B2 arena encolhendo · B4 terreno com propriedade · B8 empurrão · C9 sobreposição · D3 tether · E4 objetos destrutíveis · F3 fase por objetivo.

### 4.3 Como composição gera variedade sem custo

A combinação é o produto, não o padrão isolado. Exemplo de matriz de composição:

| Camada | Escolha (exemplos) |
|---|---|
| **Ritmo** | metrônomo fixo · reativo a HP · reativo a ruptura |
| **Ameaça ambiente** | nenhuma · campo persistente · arena encolhendo · terreno consumível |
| **Ameaça pontual** | área · linha · cone · donut · varredura |
| **Complicação social** | nenhuma · adds curadores · add portador · objeto interativo |
| **Gate de dano** | nenhum · ruptura condicional · imunidade condicional |
| **Pressão econômica** | nenhuma · dash · cura · recurso |

6 camadas × ~4 opções ≈ **centenas de combinações estruturalmente distintas**, das quais talvez 30 sejam boas. Isso é o suficiente para um jogo inteiro.

---

## 5. Padrões ruins para o helper

Três famílias diferentes de problema. Confundi-las gera decisões erradas.

### 5.1 Família 1 — O helper trivializa (dificuldade evapora)

Não construa dificuldade sobre nada aqui:

| Padrão | Por que evapora |
|---|---|
| Interrupt em barra de cast | bot nunca erra o timing |
| Esquiva pura de telegraph com margem folgada | bot tem 0ms de reconhecimento |
| Timing de poção / cura reativa | bot cura no threshold exato, sempre |
| Kite contra perseguidor lento (D4) | pathing resolve indefinidamente |
| Troca de alvo por prioridade estática | é literalmente uma regra de preset |
| Rotação ótima de skills | é o propósito declarado do helper |

**Não significa "não usar"** — significa **não cobrar dificuldade por isso**. Esses padrões continuam ótimos como *textura* e como forma de fazer o preset do jogador importar (T1).

### 5.2 Família 2 — O helper causa a derrota (injustiça percebida)

Estas são as perigosas. O jogador perde por uma ação **que ele não tomou** e não entende:

| Padrão | O que dá errado | Mitigação obrigatória |
|---|---|---|
| **Reflect / thorns (D7)** | auto-attack se mata sozinho | estado `refletindo` + regra "não atacar sob estado X" + cor dedicada |
| **Alvo proibido (D2)** | auto-target mata o add que não podia morrer | estado `nao_atacar` no add + ícone + o helper deve **respeitar por padrão** |
| **Boss cura ao tomar dano** | luta fica infinita e o jogador não percebe | número de cura visível + estado `absorvendo_cura` |
| **"Não se mova"** | follow/kite arrasta o jogador para fora | comando `hold` explícito no helper + telegraph de "fique parado" |
| **Auto-loot durante mecânica** | o loot puxa o jogador para o hazard | auto-loot suspenso durante estado de combate de boss |
| **On-death hazard (B7)** | o helper escolheu onde o mob morreu, não o jogador | telegraph pós-morte ≥1s |
| **Aproximação automática** | helper entra em zona de contato/donut invertido | raio de engajamento configurável e visível |

> **Regra:** se uma mecânica pune uma ação que o helper toma por padrão, ela **só pode existir** com (a) estado nomeado, (b) telegraph, e (c) uma regra de helper capaz de responder. Sem os três, é bug de design, não dificuldade.

### 5.3 Família 3 — A mecânica escolhe um público e exclui o outro

| Padrão | Problema |
|---|---|
| **Enrage duro sintonizado** | ajustado para helper → manual nunca passa; ajustado para manual → helper trivializa |
| **T4 execução contínua** | 3 min de reação: ou o bot faz melhor, ou pune quem usa o pilar do jogo |
| **Precisão de 1 tile em ritmo alto** | quantização + latência = morte aleatória para humanos |
| **Mecânica fora do viewport** | informação assimétrica; o bot "sabe", o jogador não |
| **Sobreposição visual densa** | o caso Diablo IV: o telegraph existe mas é invisível |
| **RNG puro sem tell** | destrói o contrato de "sua morte foi sua culpa" |

**Caso especial — mecânicas anti-bot explícitas.** É tentador criar mecânicas desenhadas para *detectar e punir* automação. **Recomendação: não.** O helper é um pilar declarado e não deve ser nerfado no endgame. Punir automação em um jogo cujo pilar é automação é uma contradição que o jogador percebe imediatamente.

---

## 6. Como o dash pode ser relevante

### 6.1 A decisão fundamental: dash resolve **posição** ou **tempo**?

| Modelo | Como funciona | Consequência com helper |
|---|---|---|
| **Dash-tempo** (i-frames, Souls-like) | invulnerável durante a janela; acertar o *momento* é tudo | Bot acerta sempre → dificuldade evapora; humano com latência sofre |
| **Dash-posição** (deslocamento de N tiles) | move N tiles rápido; o que importa é **onde você para** | Legível em grid, simétrico entre bot e humano |

Em jogos de ação, os i-frames começam quase imediatamente justamente para compensar latência de input ([Parry Everything](https://parryeverything.com/2021/07/30/the-dark-souls-dodge-roll-immediacy-in-player-action/), [G2A — I-frames](https://www.g2a.com/news/glossary/what-are-invincibility-frames-in-gaming-i-frames-explained/)). Mas há uma crítica recorrente e válida: i-frames viram um "sair da cadeia" universal que permite ao designer não projetar o encontro com cuidado ([ResetEra](https://www.resetera.com/threads/do-you-think-i-frame-roll-dodging-is-an-inelegant-implementation-of-defense-evasion-in-many-modern-games.737727/)).

> **Recomendação: dash-posição como base.**
> Deslocamento instantâneo de N tiles (2–3), com invulnerabilidade **apenas durante o trânsito** — o suficiente para atravessar um tile perigoso, mas não para "tanque" um telegraph parado em cima dele.
> A pergunta que o jogador responde é **"para onde?"**, não **"quando?"**.

Isso é o que mantém dash relevante *e* não trivializado pelo helper: o bot também consegue calcular o destino, mas **quantas cargas gastar e quando guardar** é economia, não reflexo — e economia é T2/T3.

### 6.2 Dash como unidade de medida de telegraph

O uso mais valioso do dash em boss design é **classificar telegraphs pela mobilidade que exigem**:

| Classe | Tiles até a segurança | Resposta esperada |
|---|---|---|
| **Caminhável** | ≤ 2 na janela dada | andar; dash é desperdício |
| **Dash-obrigatório** | 3–5 na janela dada | precisa gastar carga |
| **Anti-dash** | seguro está a 1 tile, mas o dash te leva longe demais | **não** dashar; passo curto |
| **Estático** | nenhum tile é seguro; a resposta não é posicional | ruptura, cobertura, objeto, postura |

Ter as quatro classes evita o antipadrão *"tudo se resolve apertando dash"*. Um boss bem feito usa pelo menos três delas.

### 6.3 Economia de dash como dial de dificuldade

O dash deve ser **contável e visível** (cargas + recarga). A partir disso:

- **Densidade de dash-obrigatórios por ciclo** é o principal knob de tensão. Duas exigências dentro de um ciclo de recarga = o jogador precisa escolher qual sofrer ou resolver a outra de outro jeito.
- **G2 (roubo/aumento de cooldown de dash)** vira uma fase inteira sem nenhum ataque novo.
- Terreno (B4) muda o valor do dash: em lama, andar é caro e o dash vira precioso; em gelo, o dash pode deslizar além do destino.

### 6.4 Dash ofensivo e o trade-off

Se o dash também for gap-closer (aproximar para atacar), o boss ganha um trade real:

- **aura de contato / retaliação**: dashar para dentro é DPS, mas custa vida;
- **donut (A4)**: dashar para dentro é a **resposta correta**, invertendo o mesmo botão;
- **punição de aproximação**: boss que contra-ataca quem chega em melee dentro de X ms.

O mesmo botão significando "fugir", "chegar" e "errar" é o que dá profundidade barata.

### 6.5 Antipadrões de dash

- dash com i-frames longos → o boss inteiro vira "aperte no momento certo" (T4 automatizável);
- dash sem custo visível → deixa de ser decisão;
- telegraph que exige 6+ tiles sem aviso suficiente → só é resolvível com dash, e quem gastou morre sem culpa;
- dash atravessando paredes/unidades sem regra clara → quebra a legibilidade do grid.

---

## 7. Como a postura (e a ruptura) podem ser relevantes

### 7.1 Postura do jogador (stance) — a alavanca que o helper pode segurar

Postura como stance é o **melhor ponto de acoplamento entre boss design e helper** que existe no nosso desenho, porque:

- é uma escolha **discreta e nomeada** (fácil de configurar em preset, fácil de exibir na UI);
- muda a resposta a famílias inteiras de mecânica, não a ataques individuais;
- tem custo de troca (cooldown / animação), então **não é grátis** — é decisão.

Usos em boss design:

| Uso | Como o boss cobra |
|---|---|
| **Fase que exige defesa** | dano sustentado alto que só é sustentável em postura defensiva |
| **Janela que exige agressão** | pós-ruptura curta: só a postura agressiva aproveita |
| **Rodízio forçado (D5)** | debuff empilhando na postura atual; obriga alternar |
| **Gate de mecânica** | ataque que só pode ser bloqueado/absorvido em postura X |
| **Limite de trocas (G5)** | N trocas por fase → planejamento, não reação |

> Isso cria a estrutura ideal para o helper: o jogador **configura presets por postura** e o boss **testa se os presets estão certos** (T1), enquanto a decisão de *quando* trocar em momentos-chave pode ser T3.

### 7.2 Ruptura do inimigo (posture/stagger) — o motor de ritmo

Três modelos de referência, com trade-offs diferentes:

| Modelo | Referência | Como funciona | Vantagem para nós |
|---|---|---|---|
| **Postura com regeneração** | Sekiro | enche com pressão, regenera se você recua; regenera mais devagar com pouca vida | **Proíbe kite infinito**; força agressão; encerra lutas |
| **Toughness + fraqueza** | Honkai: Star Rail | só quebra com o tipo certo de dano; ao quebrar, dano extra + atraso na ação | Move dificuldade para **build** (T2), não para dedos |
| **Ruptura por ação específica** | genérico | só quebra com parry/interrupt/objeto | Gera T3 legível, mas vira C1 automatizável se for só timing |

**Recomendação: híbrido dos dois primeiros.**

1. Boss tem **barra de ruptura** que enche com dano/ações e **regenera** quando não pressionado (Sekiro) — isso resolve o problema do helper defensivo eterno.
2. A barra tem **afinidade**: certos tipos de dano/ações enchem muito mais (HSR) — isso resolve o problema de "o helper faz tudo", porque a build é do jogador.
3. Ao romper: **janela curta de vulnerabilidade** (dano amplificado, boss não age, mecânicas suspensas).

Isso produz o ciclo de luta que queremos:

```
pressionar (helper faz) → romper (build do jogador decide se é possível)
   → janela (jogador decide como gastar: burst? cura? reposicionar? objeto?)
   → boss volta com fase/padrão novo
```

**Por que isso é bom para um jogo com helper:** o helper toca o loop, mas *o resultado do loop* depende de decisões que ele não toma. E a barra dá ao jogador uma **segunda medida de progresso** além do HP — a luta tem ritmo mesmo quando ele está só observando.

### 7.3 Postura do jogador como recurso de sobrevivência

O espelho: o **jogador** também tem ruptura. Chip damage ao bloquear/absorver enche a barra; barra cheia = atordoamento = a causa real da morte, não o HP zerado.

Vantagens:
- torna "tankar tudo" uma estratégia com **teto explícito** (o helper não consegue simplesmente segurar);
- dá leitura clara de perigo crescente antes da morte;
- cria sinergia com dash: dash sai de uma situação que estava enchendo a barra.

Risco: **duas barras do jogador + duas do boss = quatro barras.** Isso é muito para top-down 2D com sprites pequenos. Se adotarmos ruptura do jogador, ela provavelmente deve substituir ou absorver outra UI, não somar.

---

## 8. Como criar dificuldade legível

### 8.1 As duas metades da legibilidade

A literatura de ARPG separa legibilidade em **telegrafia** (o que acontece antes) e **expectativa** (o que acontece depois), e argumenta que é o fator de maior impacto sobre frustração ([Game Developer — Designing for Difficulty: Readability in ARPGs](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs)).

- **Telegrafia**: gestos amplos, cor codificada, som, tempo suficiente.
- **Expectativa**: *se o martelo brilha vermelho e não pode ser bloqueado, isso vale sempre, em todo o jogo*. Dano deve ser proporcional à aparência: meteoro machuca muito, cutucada machuca pouco.

Quebrar expectativa é pior que ter pouco telegraph, porque destrói o aprendizado acumulado.

### 8.2 Linguagem visual — proposta fechada

Um vocabulário pequeno e **jamais reutilizado para outra coisa**:

| Cor / forma | Significado | Resposta |
|---|---|---|
| **Vermelho** (preenchimento no chão) | dano evitável **por posição** | saia dos tiles |
| **Laranja/âmbar** (contorno pulsante) | exige ação **não-posicional** | romper, cobrir, interagir, trocar postura |
| **Ciano** (preenchimento) | zona **segura** ou benéfica | fique / entre |
| **Roxo** (ícone sobre a unidade) | **não ataque este alvo** | estado nomeado; helper deve parar |
| **Branco/pontilhado** | pré-aviso (o telegraph real vem em ~0,5s) | prepare-se |

Regras de renderização inegociáveis:
1. decals de perigo desenham **acima do chão e abaixo das unidades** — a unidade nunca some sob o telegraph;
2. **VFX de skill do jogador nunca usam a faixa cromática do perigo** (esse é o erro do Diablo IV);
3. opção de **redução de efeitos** disponível desde cedo — a comunidade de ARPG pede isso há anos, e é mais barato construir do que retrofitar;
4. **áudio dedicado por família de padrão** — em telas densas, o som é o canal que não satura. É o análogo direto do color-coding por tipo de bala em danmaku;
5. contraste garantido **em cima dos tiles do bioma**, não só em fundo neutro.

### 8.3 Orçamento de leitura (a regra prática mais útil)

Defina o que o jogador precisa processar simultaneamente:

| Nível | Ameaças simultâneas | Composição típica |
|---|---|---|
| **Ensino** | 1 | um telegraph por vez, ciclo fixo |
| **Normal** | 1 pontual + 1 ambiente | telegraph + campo persistente |
| **Difícil** | 2 pontuais + 1 ambiente | dois padrões **já conhecidos** sobrepostos |
| **Endgame** | 2 pontuais + 1 ambiente + 1 econômica | o mesmo + pressão de dash/cura |

> **Nunca introduza um padrão novo em cima de outro padrão novo.** Um padrão só entra na pilha depois de ter sido apresentado sozinho.

### 8.4 Escalar dificuldade sem matar a leitura

O caminho errado é obscurecer (mais VFX, menos telegraph, mais RNG). O caminho certo, alinhado à fonte de ARPG:

1. **combinar padrões conhecidos** de formas novas;
2. **encurtar as janelas** de oportunidade entre ataques;
3. **adicionar modificadores** (elemento, alcance maior, mais repetições);
4. **aumentar velocidade** — apenas depois de domínio do padrão base;
5. **múltiplos inimigos** — apenas depois de domínio individual.

Traduzido para os nossos dials de dungeon sincronizada / mutators:

| Dial | Efeito na dificuldade | Efeito na legibilidade |
|---|---|---|
| Janela de telegraph −15% | Alto | Neutro **até o piso da seção 2.2** |
| Área do telegraph +1 tile | Médio | Neutro |
| +1 padrão simultâneo (conhecido) | Alto | Custo moderado |
| Ruptura regenera mais rápido | Médio | Neutro |
| Cargas de dash −1 | Alto | Neutro |
| HP/dano do boss +X% | Baixo (chato) | Neutro |
| Mais VFX / telegraph menor | — | **Destrutivo. Proibido.** |

Note que **HP/dano é o dial mais fraco** — é exatamente o que o briefing quis evitar ("bosses precisam desafiar mais do que DPS e HP").

### 8.5 O contrato com o jogador

Formule explicitamente e teste contra ele:

> **1.** Toda morte deve ter uma frase de uma linha que a explique.
> **2.** Essa frase nunca deve ser "eu não vi".
> **3.** Se a frase for "o helper fez algo que eu não mandei", é bug de design.

### 8.6 Métricas de playtest

| Métrica | Alvo `[inferência]` |
|---|---|
| Tempo para o jogador nomear o padrão | ≤ 2 exposições |
| Mortes atribuídas a "não vi" | < 10% |
| Mortes atribuídas ao helper | ~0% |
| Intervenções manuais por luta | 3–6 |
| Luta 100% resolvida sem tocar | apenas em bosses de farm |
| Duração de boss (não-endgame) | 60–150s |
| Duração de boss de endgame | 150–300s |

---

## 9. Ideias de bosses low-cost

Critério de "low-cost": **zero ou um asset novo**, reutilizando as primitivas do núcleo (4.1). "Sistemas" lista o que precisa existir no motor.

### 9.1 O Metrônomo — *boss-professor*

| | |
|---|---|
| **Papel** | primeiro boss; ensina a linguagem visual inteira |
| **Padrões** | C8 ciclo fixo · A1 · A3 · A2, sempre na mesma ordem |
| **Custo** | Baixíssimo — 3 telegraphs, nenhum add |
| **Dash** | um dos três padrões é dash-obrigatório; os outros, caminháveis |
| **Ruptura** | barra simples, sem afinidade; ensina o ciclo pressão→janela |
| **Escala** | acelera o ciclo; depois sobrepõe dois padrões |
| **Função** | se o jogador não vence isto, todo o resto está mal ensinado |

### 9.2 A Vigília — *espelho*

| | |
|---|---|
| **Papel** | boss de custo de arte **zero**: usa os sprites e skills do próprio jogador |
| **Padrões** | usa o kit da classe do jogador, com telegraphs; D5 debuff que força troca de postura |
| **Custo** | Zero assets novos (maior alavancagem de todo o documento) |
| **Dash** | ela também dasha — ensina a ler dash inimigo |
| **Ruptura** | quebra quando você acerta a skill que ela acabou de usar (eco) |
| **Escala** | ela ganha o kit de *outra* classe na fase 2 |
| **Risco** | exige que skills do jogador sejam usáveis por NPCs — decisão de arquitetura antecipada |

### 9.3 O Carcereiro — *economia de espaço*

| | |
|---|---|
| **Padrões** | B2 arena encolhendo · A10 tower · B1 campo persistente |
| **Custo** | Baixo — só tiles |
| **Dash** | dial central: a arena encolhida transforma padrões caminháveis em dash-obrigatórios |
| **Ruptura** | romper **devolve** espaço da arena (recompensa espacial, não numérica) |
| **T3** | pisar na placa custa parar de atacar: decisão explícita |
| **Escala** | velocidade de encolhimento |

### 9.4 O Coral — *duas metades*

| | |
|---|---|
| **Padrões** | dois corpos com HP ligado · D1 prioridade · E1 cura mútua se separados demais |
| **Custo** | Baixo — um sprite duplicado, paleta trocada |
| **Helper** | **o teste de preset por excelência**: prioridade errada = luta infinita |
| **Ruptura** | precisa romper os dois dentro de uma janela |
| **Escala** | janela de ruptura conjunta encurta |

### 9.5 O Ourives — *gate de build*

| | |
|---|---|
| **Padrões** | C5 ruptura condicional (só tipo de dano X) · D6 imunidade condicional · A9 proximidade |
| **Custo** | Baixo — placas de armadura como overlay |
| **T2** | **puro**: se a build não tem o tipo certo, a luta não avança |
| **Perigo** | precisa ser telegrafado **antes de entrar na dungeon**, não descoberto na porta |
| **Escala** | exige dois tipos em ordem |

### 9.6 A Procissão — *sem auto-attack*

| | |
|---|---|
| **Conceito** | o boss **não tem ataque básico**; todo o dano vem de padrões telegrafados |
| **Padrões** | A7 varredura · A6 xadrez · A5 safe spot único |
| **Custo** | Baixo — nenhum add, nenhum objeto |
| **Por quê** | prova que dano por posição sozinho sustenta uma luta; o helper cuida do DPS integralmente e a luta ainda é sobre o jogador |
| **Dash** | mistura das quatro classes de telegraph (6.2) |
| **Escala** | ciclos sobrepostos |

### 9.7 O Devorador — *armadilha de auto-target*

| | |
|---|---|
| **Padrões** | D2 alvo proibido (adds que curam ao morrer) · E6 spawn contínuo · B7 on-death |
| **Custo** | Baixo — reusa mob existente |
| **Requisito** | **só existe se a seção 1.2 estiver implementada** (estado `nao_atacar` + ícone roxo + regra de helper) |
| **Valor** | ensina o jogador a *editar o preset*, que é a habilidade central do jogo |
| **Risco** | sem os pré-requisitos, é a mecânica mais frustrante possível |

### 9.8 O Colosso de Pilares — *recurso finito de arena*

| | |
|---|---|
| **Padrões** | E4 pilares destrutíveis · A13 linha de visão · A3 beam |
| **Custo** | Médio-baixo — pilares como objetos com HP |
| **Decisão** | cada pilar bloqueia um beam mas some depois; **quatro pilares, seis beams** |
| **T3** | escolher qual pilar gastar e quando |
| **Escala** | menos pilares, mais beams |

### 9.9 O Relojoeiro — *pressão econômica*

| | |
|---|---|
| **Padrões** | G2 dash drenado · G1 dreno de recurso · C7 soft enrage |
| **Custo** | Baixíssimo — nenhum ataque novo, só modificadores |
| **Valor** | demonstra que **pressionar a economia do jogador é conteúdo**, sem arte nova |
| **Escala** | taxa de dreno |

### 9.10 Resumo de custo

| Boss | Assets novos | Sistemas necessários além do núcleo |
|---|---|---|
| Metrônomo | 1 | — |
| Vigília (espelho) | **0** | NPC usando kit de jogador |
| Carcereiro | 0–1 | arena dinâmica, placa de pressão |
| Coral | 0 (paleta) | HP compartilhado, ruptura conjunta |
| Ourives | 1 overlay | ruptura com afinidade |
| Procissão | 1 | — |
| Devorador | 0 (reuso) | **estados nomeados + regras de helper** |
| Colosso | 1 objeto | objetos com HP, LoS |
| Relojoeiro | 0 | modificadores de recurso |

**Nove bosses, ~5 assets novos.** O custo real está nos **sistemas**, não na arte — o que é a conclusão certa para um projeto solo/pequeno em Godot.

---

## 10. Backlog de sistemas (ordenado por alavancagem)

Sem código, apenas ordem de construção sugerida:

| # | Sistema | Destrava | Alavancagem |
|---|---|---|---|
| 1 | **Estados nomeados + exposição ao helper** | D2, D7, E1, toda a família 5.2 | **Máxima** — pré-requisito de honestidade |
| 2 | **Telegraph declarativo** (forma + tiles + tempo + cor + som) | Grupo A inteiro | Máxima |
| 3 | **Tiles com efeito e duração** | Grupo B | Alta |
| 4 | **Barra de ruptura com regeneração e afinidade** | C2–C5, F2 | Alta |
| 5 | **Máquina de fases declarativa** | Grupo F | Alta |
| 6 | **Movimento forçado (empurrão/puxão/teleporte)** | B8, A12 | Média |
| 7 | **Objetos de arena com HP e interação** | E4, E5, A13 | Média |
| 8 | **Modificadores de recurso do jogador** | Grupo G | Média (custo mínimo) |
| 9 | **Tether / vínculo** | D3 | Baixa |

**Ficha de padrão (formato de autoria sugerido).** Bosses devem ser escritos como dados, não como scripts únicos. Campos mínimos por padrão:

`nome · gatilho · forma · tiles_afetados · janela_de_telegraph · cor · som · dano/efeito · classe_de_mobilidade (caminhável/dash/anti-dash/estático) · estados_aplicados · regra_de_helper_sugerida`

Se cada padrão carregar `classe_de_mobilidade` e `regra_de_helper_sugerida`, o tuning de dificuldade e a configuração do helper viram **consultas sobre dados**, não trabalho manual por boss.

---

## 11. Riscos e perguntas em aberto

1. **"Postura" é stance ou stagger no Arena Fable?** Toda a seção 7 muda de forma dependendo da resposta. Precisa ser confirmado direto no projeto anterior.
2. **Diagonais e velocidade por tile.** Todo o tuning de janelas de telegraph (2.2) depende disso. Deve ser fixado **antes** de qualquer boss ser balanceado.
3. **O helper vai ter acesso a estados de boss por padrão ou só via regra avançada?** Se for avançada, a família 5.2 inteira fica fora de alcance para o jogador casual — e vira frustração.
4. **Quantos momentos T3 por luta são aceitáveis** para um jogador que escolheu o jogo *justamente* pela automação? A hipótese 3–6 precisa de playtest; pode ser que o número correto seja 1–2.
5. **Ruptura do jogador entra ou não?** Quatro barras em tela pequena é risco real de poluição de UI.
6. **Bosses de farm devem ser 100% automatizáveis?** Provavelmente sim (consistência com energia/resina do W06/W09), mas isso precisa ser decisão explícita, não acidente.
7. **Modo sincronizado (WAKFU-like) muda os padrões ou só os números?** Se muda padrões, o custo de conteúdo dobra; se muda números, a seção 8.4 já cobre.
8. **Interação com o W10 (UX do helper).** As regras sugeridas por padrão (`regra_de_helper_sugerida`) só funcionam se o vocabulário de configuração do helper suportar condições sobre estados de alvo. Isso deve ser requisito de entrada do W10, não descoberta posterior.

---

## 12. Fontes

**Legibilidade, telegrafia e design de boss**
- [Designing for Difficulty: Readability in ARPGs — Game Developer](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs)
- [Enemy Attacks and Telegraphing — Game Developer](https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- [Opinion: Boss Design — Tips From A Combat Designer — Game Developer](https://www.gamedeveloper.com/design/opinion-boss-design---tips-from-a-combat-designer)
- [Boss Up: Boss Battle Design Fundamentals and Retrospective (GDC 2018, Itay Keren)](https://www.youtube.com/watch?v=48Ymh4Ge5j8)
- [GDC Vault — Designing Bosses For 'Sackboy: A Big Adventure'](https://gdcvault.com/play/1028082/Designing-Bosses-For-Sackboy-A)

**Informação perfeita e telegraph em grid**
- [Into the Breach — Subset Games](https://subsetgames.com/itb.html)
- [Road to the IGF: Subset Games' Into the Breach — Game Developer](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)
- [Into the Breach is a fantastic strategy game, but, more importantly — Subset Games Forum](https://subsetgames.com/forum/viewtopic.php?f=17&t=35024)

**Vocabulário de mecânicas top-down (stack, spread, cleave, donut, tower)**
- [Common Mechanics — Gamer Escape (FFXIV Wiki)](https://ffxiv.gamerescape.com/wiki/Common_Mechanics)
- [Acronyms, abbreviations, and common terms — FFXIV Console Games Wiki](https://ffxiv.consolegameswiki.com/wiki/Acronyms,_abbreviations,_and_common_terms)
- [Glossary — Aether PF Strats](https://www.thepfstrat.com/jargon)

**Padrões de projéteis e design de lacunas**
- [Sparen's Danmaku Design Studio — Índice](https://sparen.github.io/ph3tutorials/danmakudesign.html)
- [Sparen's Danmaku Design Studio — Guide A2 (ângulos e mira)](https://sparen.github.io/ph3tutorials/ddsga2.html)
- [Sparen's Danmaku Design Studio — Guide A4 (densidade de projéteis)](https://sparen.github.io/ph3tutorials/ddsga4.html)
- [A Summary of 15 Beautiful Bullet Hell Patterns in Danmaku Shooters — npaka](https://note.com/npaka/n/n5d38b7d84173?hl=en)
- [Boghog's bullet hell shmup 101 — Shmups Wiki](https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101)

**Postura / stagger / ruptura**
- [Posture — Sekiro Wiki (Fextralife)](https://sekiroshadowsdietwice.wiki.fextralife.com/Posture)
- [Sekiro's Genius Posture Mechanic — What's in a Game?](http://whats-in-a-game.com/sekiros-genius-posture-mechanic/)
- [Rethinking 'Health' as Game Mechanic: Sekiro's Verisimilitude — Parry Everything](https://parryeverything.com/2022/02/11/rethinking-health-as-game-mechanic-sekiros-verisimilitude/)
- [Weakness Break And Toughness in Honkai: Star Rail, Explained — GameRant](https://gamerant.com/honkai-star-rail-weakness-break-toughness-elements-explained/)
- [Honkai Star Rail: Weakness Break & Toughness Explained — GINX TV](https://www.ginx.tv/en/honkai-star-rail/weakness-break-toughness)

**Dash, i-frames e esquiva**
- [The Dark Souls Dodge Roll: Immediacy in Player Action — Parry Everything](https://parryeverything.com/2021/07/30/the-dark-souls-dodge-roll-immediacy-in-player-action/)
- [What Are Invincibility Frames in Gaming? — G2A News](https://www.g2a.com/news/glossary/what-are-invincibility-frames-in-gaming-i-frames-explained/)
- [Do you think i-frame roll dodging is an inelegant implementation of defense/evasion? — ResetEra](https://www.resetera.com/threads/do-you-think-i-frame-roll-dodging-is-an-inelegant-implementation-of-defense-evasion-in-many-modern-games.737727/)
- [Dodging Tips and Tricks — Elden Ring Wiki](https://eldenring.wiki.fextralife.com/Dodging)

**Legibilidade em ARPG — falhas conhecidas**
- [Diablo 4 Effect Toggles: Players Renew Calls for this Feature — Icy Veins](https://www.icy-veins.com/d4/news/diablo-4-effect-toggles-players-renew-calls-for-this-feature/)
- [Diablo 4's most deadly annoyance is "not intentional" — PCGamesN](https://www.pcgamesn.com/diablo-4/ground-effects)
- [Diablo 4 Players Are Arguing Over Whether Elite Affixes Are Hard — or Just Rude](https://www.diabloz.net/2026/05/diablo-4-elite-affixes-difficulty-debate.html)

**Enrage timers e DPS checks**
- [Enrage timer raid design is causing all the problems — FFXIV Forum](https://forum.square-enix.com/ffxiv/threads/401326)
- [Enrage timers — MMO-Champion](https://www.mmo-champion.com/threads/1105620-Enrage-timers)
- [DPS checks on bosses (Enrage timers) — Elder Scrolls Online Forums](https://forums.elderscrollsonline.com/en/discussion/112228/dps-checks-on-bosses-enrage-timers-in-trials-dungeons-etc)

**Grid tático e bosses em grid**
- [Dungeon Boss Mechanics Compendium — WAKFU Forum](https://www.wakfu.com/en/forum/143-guides/239903-guide-dungeon-boss-mechanics-compendium-wip)
- [Wakfu (MMO) — Krosmoz Wiki](https://krosmoz.fandom.com/wiki/Wakfu_(MMO))
- [Dofus — Wikipedia](https://en.wikipedia.org/wiki/Dofus)

**Tibia — vocabulário e bosses**
- [Grand Master Oberon — TibiaWiki](https://tibia.fandom.com/wiki/Grand_Master_Oberon)
- [Grand Master Oberon — TibiaVault Boss Guide](https://tibiavault.com/boss-guide/grand-master-oberon/)
- [Tibia Boss Guide — TibiaVault](https://tibiavault.com/boss-guide/)

**Auto-battle e limites da automação**
- [Best Gacha Games with Skill-Based Combat — Ultimate Gacha](https://ultimategacha.com/best-gacha-games-with-skill-based-combat/)
- [Best Idle and Auto-Battle Gacha Games in 2026 — HostedGG](https://hostedgg.com/blog/best-idle-auto-battle-gacha-games-2026)

---

*Documento W11. Sem implementação de código, conforme o briefing.*
*Dependências: W10 (vocabulário de configuração do helper) e decisões de combate do Arena Fable (postura, dash, velocidade por tile).*
