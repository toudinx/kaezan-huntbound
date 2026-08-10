# W03 — Tibia: bosses, Bossiary e Bestiary

> Relatório de pesquisa para **Kaezan Huntbound**.
> Fase A (pesquisa). Não contém código nem decisões finais de balanceamento.
>
> **Convenção de confiança usada neste documento:**
> - `[FATO-WIKI]` — número/regra publicado em fonte pública (TibiaWiki / guias).
> - `[FATO-CÓDIGO]` — observado diretamente no código do Canary presente em `references/canary`.
> - `[CÁLCULO]` — derivado por mim a partir de números `[FATO-*]`; aritmética, não fonte.
> - `[HIPÓTESE]` — inferência de design minha, não verificada.
>
> Canary é um emulador open-source, não o servidor oficial. Onde os dois batem (e batem, nos pontos centrais), a confiança é alta.

---

## 1. Resumo executivo

Tibia tem hoje **três camadas de coleção** que resolvem problemas diferentes, e vale separá-las mentalmente:

| Camada | O que coleciona | O que devolve ao jogador | Ritmo |
|---|---|---|---|
| **Bestiary** | criaturas comuns | Charm Points → Charms (buffs por criatura) | ambiental, passivo, altíssimo volume |
| **Bosstiary** | bosses | Boss Points → % de loot extra em equipamentos | agendado por cooldown, baixo volume |
| **Soulpit / Animus Mastery** (2024) | criaturas comuns, de novo | +XP permanente por criatura | evento curto e instanciado, consumível |

O padrão de design que interessa ao Huntbound é o mesmo nas três: **matar coisas gera um recurso de coleção; a coleção compra um bônus permanente de conta; o bônus permanente torna a próxima etapa de farm melhor.** É um loop de "conta melhora, não só personagem melhora" — exatamente o que a Base de Contexto pede (§4, "progressão por gestão da conta").

O problema de Tibia é **escala**, não conceito:

- Bestiary completo ≈ **1,25 milhão de kills** `[CÁLCULO]`.
- Bosstiary completo ≈ **32,9 mil kills de boss** `[CÁLCULO]`, sob cooldowns de 20h a 14 dias — isto é, anos de calendário, independente de quantas horas você jogue.

Ou seja: Tibia usa a coleção como **sumidouro infinito de tempo de MMO**. Huntbound precisa da mesma sensação com **1–3 ordens de grandeza a menos**, e com o gargalo movido do relógio do servidor para uma **decisão do jogador**.

Três recomendações-âncora que o resto do documento desenvolve:

1. **Crédito de coleção por run concluída, não por kill individual.** Elimina o incentivo a deixar o helper rodando 24h e torna o progresso previsível ("esta run vale 3 de 40").
2. **Trocar cooldown de relógio por orçamento de entradas.** Em vez de "este boss volta em 20h", dar "você tem 3 entradas de boss semanais — escolha onde gastar". O gargalo vira escolha, não agenda.
3. **Piso garantido + teto diário.** Todo boss tem moeda de drop garantido (anti-"matei 300 vezes e nada"); toda coleção tem teto diário com resíduo (anti-"quem fica 24h ganha 20x").

---

## 2. Funcionamento dos sistemas originais

### 2.1 Cyclopedia — o contêiner

O Bestiary vive dentro da **Cyclopedia**, uma janela de "analytics" introduzida no Summer Update 2017 que hoje agrega Items, Bestiary, Charms, Bosstiary, Map, Character e Houses `[FATO-WIKI]`.

Vale notar a ordem histórica, porque revela intenção: Cyclopedia (2017) → Bestiary + Charms (Winter 2017) → Bosstiary (Summer 2022) → Soulpit/Animus Mastery (Summer 2024) → Task Board (Winter 2025). CipSoft foi **empilhando camadas de coleção sobre a mesma base de dados de criaturas** ao longo de 8 anos. É um sinal forte: a tabela de criaturas é o ativo reutilizável, e cada nova camada é barata de produzir porque só reinterpreta dados que já existem. Para nós, que temos custo de produção de conteúdo como restrição explícita, isso é o achado mais importante do relatório.

### 2.2 Bestiary

**Estrutura da entrada.** Cada criatura tem uma entrada com 4 estados: bloqueada (silhueta) e 3 estágios de detalhe `[FATO-WIKI]`. O código do Canary implementa exatamente isso em `getKillStatus()`, retornando 1–4 conforme o kill count cruza `bestiaryFirstUnlock`, `bestiarySecondUnlock` e `bestiaryToUnlock` (`references/canary/src/io/iobestiary.cpp:272`) `[FATO-CÓDIGO]`.

O que cada estágio revela `[FATO-WIKI]`:

1. **Estágio 1** — HP, velocidade, armor, loot comum.
2. **Estágio 2** — loot incomum, resistências, localizações.
3. **Estágio 3 (final)** — loot semi-raro e raro. Loot "very rare" só aparece quando você **efetivamente dropa** o item pela primeira vez, e apenas se a entrada estiver completa.

Esse escalonamento é bom design de informação: a recompensa por matar é **saber onde matar melhor**. O jogador desbloqueia o próprio guia de hunt.

**Regras de contagem de kill** `[FATO-WIKI]`:
- Você precisa ter causado dano (não precisa ser o maior dano).
- O dano precisa ter ocorrido nos **últimos 5 minutos** antes da morte da criatura.

**Tabela de dificuldades** `[FATO-WIKI]` — a espinha dorsal do sistema:

| Dificuldade | Raridade | Estágio 1 | Estágio 2 | Estágio 3 | Charm Points | Nº de criaturas |
|---|---|---|---|---|---|---|
| Harmless | Ordinary | 5 | 10 | 25 | 1 | 19 |
| Harmless | Very Rare | 2 | 3 | 5 | 5 | 1 |
| Trivial | Ordinary | 10 | 100 | 250 | 5 | 46 |
| Trivial | Very Rare | 2 | 3 | 5 | 10 | 4 |
| Easy | Ordinary | 25 | 250 | 500 | 15 | 165 |
| Easy | Very Rare | 2 | 3 | 5 | 30 | 8 |
| Medium | Ordinary | 50 | 500 | 1000 | 25 | 285 |
| Medium | Very Rare | 2 | 3 | 5 | 50 | 25 |
| Hard | Ordinary | 100 | 1000 | 2500 | 50 | 213 |
| Challenging | Ordinary | 200 | 2000 | 5000 | 100 | 67 |

Total: **833 criaturas**, **28.734 Charm Points** obteníveis `[FATO-WIKI]`.

Duas observações de design aqui:

- **Existe um eixo secundário "Occurrence" (Ordinary/Very Rare) que inverte a lógica.** Criatura rara pede 2/3/5 kills e paga *mais* pontos que a comum equivalente. Isso é elegante: a raridade da criatura vira o gate, não a repetição. É o mecanismo que impede que "criatura que aparece 3 vezes por mês" seja uma entrada morta. O Canary carrega esse campo como `bestiaryOccurrence` (`references/canary/src/creatures/monsters/monsters.hpp:90`) `[FATO-CÓDIGO]`.
- **A distribuição é uma pirâmide invertida no topo.** A dificuldade `bestiaryStars` na base de dados do Canary distribui-se assim `[FATO-CÓDIGO]`: 13 com 0★, 51 com 1★, 154 com 2★, 297 com 3★, 181 com 4★, 53 com 5★. A massa está no meio (3★), não na base. O grosso do tempo do jogador é gasto em criaturas de dificuldade média com threshold de 1000 kills.

**Custo total** `[CÁLCULO]`: somando `nº de criaturas × kills do estágio final` para as entradas Ordinary — 19×25 + 46×250 + 165×500 + 285×1000 + 213×2500 + 67×5000 ≈ **1.247.000 kills**. As 38 entradas Very Rare somam ~190 kills, irrelevante em comparação. Este é o número que define a escala real do sistema.

### 2.3 Charms — o que a coleção compra

Charms são o *sink* dos Charm Points `[FATO-WIKI]`:

- Um charm desbloqueado é **atribuído a uma entrada completa** e só funciona contra aquela criatura.
- Uma entrada aceita **um charm por vez**.
- Free: 2 charms atribuídos simultaneamente. Premium: 6. Store: "todos" por 450 Tibia Coins.
- **Atribuir é grátis; remover custa `level × 100` gold.** No Winter Update 2024 adicionaram um reset completo de charms por `100.000 + 11.000 × (level - 100)` gold.
- Charms são Major/Minor, com 3 tiers de potência (ex.: Wound 5%/10%/11% por 240/360/1800 pontos).
- Desbloquear todos os charms custa **17.400 pontos** dos 28.734 disponíveis `[FATO-WIKI]`.

Três leituras importantes:

1. **A progressão dos charms tem um teto que chega antes do fim da coleção.** 17.400 de 28.734 — o jogador "termina" os charms com ~60% do bestiary feito. Os 40% finais existem para o título `Executioner` e para as camadas novas (Animus Mastery). Isso é uma decisão consciente: separar "progressão de poder" de "progressão de colecionador".
2. **A curva de tier é brutalmente não-linear.** Wound: 240 → 360 → 1800. O tier 3 custa 3× os dois primeiros somados e entrega +1 ponto percentual (10% → 11%). É um sink de fim de vida, não uma escolha real.
3. **A taxa de remoção é fricção pura.** Pagar `level × 100` para trocar de alvo pune exatamente o comportamento que o sistema deveria incentivar (experimentar, adaptar ao conteúdo de hoje). O fato de terem *vendido* na Store a remoção dessa fricção (-25%) confirma que ela era sentida como problema.

### 2.4 Bosstiary

Introduzido no Summer Update 2022. Mesmo esqueleto do Bestiary, mas mais simples: **3 níveis, sem estágios de informação** `[FATO-WIKI]`.

**Os três níveis:**

| Nível | Efeito |
|---|---|
| **Prowess** | Permite atribuir o boss a um *boss slot*. O primeiro Prowess da vida desbloqueia o slot. Slot ativo = **+25% de equipment loot bonus**. |
| **Expertise** | Permite exibir o boss num *Podium of Vigour* na casa. O primeiro Expertise dá um pódio grátis. |
| **Mastery** | **+25% adicional** de equipment loot bonus quando o boss está no slot. |

O Canary implementa o pódio grátis literalmente em `addBosstiaryKill()`, disparando no `newBossLevel == 2` (`references/canary/src/io/io_bosstiary.cpp:200-214`) `[FATO-CÓDIGO]`.

**As três categorias — e este é o ponto crítico:** a categoria é definida por **disponibilidade, não por força** `[FATO-WIKI]`.

| Categoria | Definição | Kills p/ Prowess / Expertise / Mastery | Boss Points (5+15+30 etc.) | Nº de bosses |
|---|---|---|---|---|
| **Bane** | matável mais de uma vez em 20h | 25 / 100 / 300 | 50 | 83 |
| **Archfoe** | cooldown de 20 a 48h | 5 / 20 / 60 | 100 | 124 |
| **Nemesis** | aparece raramente ou cooldown > 48h | 1 / 3 / 5 | 100 | 109 |

Os thresholds e pontos batem **exatamente** com a tabela `levelInfos` hardcoded no Canary (`references/canary/src/io/io_bosstiary.hpp:44-48`) `[FATO-CÓDIGO]`:

```cpp
{ RARITY_BANE,    { {25,5}, {100,15}, {300,30} } },
{ RARITY_ARCHFOE, { {5,10}, {20,30},  {60,60}  } },
{ RARITY_NEMESIS, { {1,10}, {3,30},   {5,60}   } }
```

A distribuição real na base de dados do Canary é 60 Bane / 105 Archfoe / 84 Nemesis `[FATO-CÓDIGO]` (a wiki, mais atualizada, reporta 83/124/109).

**Esta é, para mim, a ideia mais transferível do relatório inteiro:** *a raridade da entrada de coleção é uma função da frequência com que o conteúdo está disponível, e o número de kills exigido é o inverso dessa frequência.* Um boss que você mata todo dia pede 300 kills; um que aparece uma vez por mês pede 5. O resultado é que **todas as entradas levam aproximadamente o mesmo tempo de calendário para completar**, independentemente do tipo de conteúdo. Isso é o que faz um sistema de coleção heterogêneo parecer justo.

**Boss Points → Equipment Loot Bonus.** A conversão é uma curva de três trechos `[FATO-WIKI]`, implementada em `calculateLootBonus()` (`references/canary/src/io/io_bosstiary.cpp:217-225`) `[FATO-CÓDIGO]`:

| Faixa de pontos | Bônus | Ritmo |
|---|---|---|
| 0 – 250 | 25% → 50% | 1% a cada 10 pontos |
| 250 – 1250 | 50% → 100% | 1% a cada 20 pontos |
| 1250+ | 100% → ~197% | cada nível custa 5 pontos a mais que o anterior |

Total obtenível hoje: **27.450 Boss Points ≈ 197% de bônus** `[FATO-WIKI]`.

**Como o bônus funciona mecanicamente** (e isto é frequentemente mal-entendido pelos próprios jogadores): não é aumento de drop chance. É **chance de rodar a tabela de loot mais vezes**. 208% de bônus = 2 rolls extras garantidos + 8% de chance de um terceiro `[FATO-WIKI]`. Só vale para itens equipáveis, com exceções explícitas (itens únicos por kill, Bag You Desire, Crypt Runes).

Essa distinção importa para nós: **"roll extra" preserva a forma da distribuição de loot** (o item raro continua raro, você só tem mais bilhetes), enquanto "aumentar drop chance" achata a raridade. Roll extra é a implementação correta para um jogo que quer manter momentos de jackpot.

**Boss Slot** `[FATO-WIKI]`:
- 1º slot: ao atingir Prowess pela primeira vez.
- 2º slot: aos **1500 Boss Points**.
- Troca: **grátis 1× por server save**; depois `(n-2) × 300.000 + 100.000` gold, resetando no server save.
- No Canary: `calculteRemoveBoss()` retorna `300000 * removeTimes - 500000` (`references/canary/src/io/io_bosstiary.cpp:303-308`) `[FATO-CÓDIGO]` — mesma curva.

**Daily Boosted Boss** `[FATO-WIKI]`:
- A cada server save, um boss **da categoria Archfoe** é sorteado.
- Durante o dia: cada kill conta como **3 kills** de bosstiary, e o loot de equipamento roda a **250%**.
- **O cooldown do boss é resetado para todos os personagens** no server save, garantindo que dá para matá-lo.
- Depois de boostado, o boss fica **30 dias** sem poder ser sorteado de novo.

O Canary faz exatamente isso em `loadBoostedBoss()`, filtrando `RARITY_ARCHFOE` e limpando `bossIdSlotOne`/`bossIdSlotTwo` de quem tinha aquele boss no slot (`references/canary/src/io/io_bosstiary.cpp:55-119`) `[FATO-CÓDIGO]`.

**Custo total** `[CÁLCULO]`: 83×300 + 124×60 + 109×5 ≈ **32.885 kills de boss** para completar o Bosstiary — sob cooldowns de 20h a 14 dias. Guias comunitários estimam **1 a 3 anos de caça diária consistente** para completar `[FATO-WIKI]`, o que é consistente com a aritmética.

### 2.5 Tipos de boss e como o lockout é implementado

Tibia não tem uma taxonomia formal de boss além do Bosstiary, mas na prática existem quatro formatos, e o Canary os expõe com clareza:

**(a) Boss de alavanca / instanciado.** O padrão dominante do conteúdo moderno. `references/canary/data/libs/functions/boss_lever.lua` define a estrutura `[FATO-CÓDIGO]`:

```lua
timeToFightAgain  -- cooldown por jogador, default 20h
timeToDefeat      -- limite de tempo dentro da arena, default 20min
minPlayers        -- mínimo de jogadores na alavanca
playerPositions   -- posições exigidas (todos precisam estar no lugar)
timeAfterKill     -- tempo antes de expulsar, default 60s
requiredLevel
```

Os defaults vêm de `configmanager.cpp:233-234`: `bossDefaultTimeToDefeat = 20 * 60` e `bossDefaultTimeToFightAgain = 20 * 60 * 60` `[FATO-CÓDIGO]`.

O cooldown é **por jogador, persistido**, com escopo de chave `"boss.cooldown." .. raceId` (`boss_lever.lua:113-129`) `[FATO-CÓDIGO]` — não é respawn global. Isso é importante: o modelo já é conceitualmente single-player-friendly.

Varrendo as configurações reais de alavanca no conteúdo `[FATO-CÓDIGO]`, os valores de `timeToFightAgain` usados são: 20h (11 ocorrências), 10h (14), 2 dias (2), 68h, 72h, 14 dias e 0 (sem cooldown). Ou seja, **a esmagadora maioria do conteúdo de boss instanciado roda em ciclo de 10h ou 20h** — deliberadamente menor que 24h para "deslizar" e não travar o jogador num horário fixo.

> Nota de design: o cooldown de 20h (não 24h) é uma solução elegante para um problema real — se fosse 24h, quem matou às 21h ontem não consegue matar às 20h hoje, e o jogador é empurrado para horários cada vez mais tarde. 20h dá folga. **Vale copiar essa intuição mesmo trocando o mecanismo.**

**(b) Boss de raid / spawn global.** Anunciado no servidor, spawna no mundo, primeiro a chegar leva. Formato puramente MMO — competitivo, dependente de população e de estar online no momento certo.

**(c) Boss raro em área de hunt.** Spawna com baixa chance no lugar de uma criatura normal durante hunt regular. Baixo custo de produção, alto valor de surpresa.

**(d) Boss de quest / one-shot.** Matável uma vez por personagem no fluxo de uma quest. Não sustenta repetição, mas alimenta o Bosstiary com uma entrada Nemesis (1/3/5 kills — coerente com a lógica de "raridade define threshold").

### 2.6 Sistemas satélites que resolvem o mesmo problema

Três sistemas adjacentes importam muito para o Huntbound porque **são as tentativas explícitas da CipSoft de dar rumo, teto e catch-up ao grind**.

**Prey System (2016)** `[FATO-WIKI]`:
- 3 slots (1 free / 2 premium / 1 comprável).
- Cada slot oferece **9 criaturas sorteadas** de um pool grande, sempre com mix de níveis baixo/médio/alto.
- Bônus possíveis: dano +7–25%, redução de dano 12–30%, XP +13–40%, loot +13–40%. Cada bônus tem **10 degraus**.
- Duração: **2 horas de jogo ativo**.
- **Reroll gratuito da lista a cada 20 horas**; rerolls extras custam `150 × level` gold.
- O bônus de loot funciona igual ao do boss slot: chance de gerar **outro set de loot**, não drop chance aumentado.

O Prey é essencialmente um **sistema de "escolha do alvo do dia"**: ele não gera progresso sozinho, ele diz *onde* o seu tempo vale mais hoje. É exatamente o tipo de camada que o Huntbound precisa, porque o helper faz a repetição e a decisão humana precisa morar em algum lugar (Base de Contexto §6).

**Task Board (Winter Update 2025)** `[FATO-WIKI]` — o sistema mais recente e o mais alinhado com o que queremos:

*Bounty Tasks* (rotativas, moeda própria):

| Tier | Bounty Points | Reroll Tokens | Faixa de kills |
|---|---|---|---|
| Beginner | 3 | 1 | 50–100 |
| Adept | 7 | 1 | 100–200 |
| Expert | 16 | 1 | 200–400 |
| Master | 27 | 1 | 300–600 |

Há chance de sair **Silver Task (2× recompensa)** e **Gold Task (4× recompensa)**.

Os Bounty Points sobem o **Bounty Talisman**, cujos upgrades são:
- Dano contra a criatura — até **50%**
- Life leech — até **50%**
- Mais loot — até **50%**
- **Chance de progresso duplo de Bestiary — até 100%**

Esse último upgrade é uma admissão formal de que 1,25 milhão de kills é demais: eles construíram um multiplicador de coleção *comprável com progressão*. `[HIPÓTESE]` É um catch-up disfarçado de progressão.

*Weekly Tasks*:
- **Reset toda segunda-feira.**
- Dois tipos: Kill Tasks e Delivery Tasks, **6 de cada por semana** (9 com expansão paga).
- **Multiplicador de recompensa por volume**: 2× com 4 tasks, 3× com 8, 5× com 12, 8× com 16.
- Cada task completa dá **1 Soulseal**, moeda de entrada do Soulpit.

O multiplicador escalonado é um mecanismo forte: ele **recompensa completar o pacote semanal inteiro** sem exigir mais do que o teto. Quem faz 18/18 leva 8×; quem faz 3/18 leva 1×. Isso cria compromisso semanal sem criar grind ilimitado — o teto é duro.

**Soulpit + Animus Mastery (Summer 2024)** `[FATO-WIKI]`:
- **Soul Cores** dropam de monstros *fiendish* (~15–20% de chance) e existe um Soul Core para **cada criatura do Bestiary**.
- Sacrificar um Soul Core num obelisco abre uma instância para **até 5 jogadores**, **10 minutos**, **4 waves** com composição fixa, culminando num boss com 40 stacks de HP/dano e uma de três habilidades especiais (Enrage / Oppressor / Overpower).
- As criaturas do pit **não dropam loot, não contam para kill counters, não são skinnable**. O único produto é XP (o boss final dá **+2800% XP**) e a **Animus Mastery**.
- **Animus Mastery**: +2% de XP base permanente contra aquela criatura, **+0,1% adicional a cada 10 masteries** que você tem (teto +2%). Com 200 masteries: +4% total.
- **Exalted Core** transforma um Soul Core numa dificuldade *menor*; **Soul Prism** transforma numa dificuldade *maior*. O jogador pode converter cores que não quer nos que quer.
- Não é necessário nem lutar nem ter a criatura revelada no bestiary para ganhar a Mastery — basta estar vivo no fim.

Três coisas notáveis aqui:
1. **A instância é curta e determinística** (10 min, 4 waves, composição tabelada). É desenhada para caber numa sessão.
2. **O produto é 100% permanente e account-facing**, sem loot. Isso desacopla completamente "conteúdo de coleção" de "conteúdo de economia" — não há inflação de itens.
3. **O sistema de conversão de cores (Exalted/Prism) é um mecanismo anti-frustração explícito**: você nunca fica travado por não ter dropado o core certo. `[HIPÓTESE]` Isso é uma forma de pity aplicada ao *colecionável*, não ao drop.

---

## 3. Pontos fortes

**F1. A entrada de coleção é auto-documentada e o desbloqueio *é* a recompensa informacional.**
Os 3 estágios do Bestiary entregam HP → resistências/locais → loot raro. O jogador está literalmente construindo o próprio guia de hunt. Isso transforma repetição em aprendizado percebido, mesmo quando o ganho mecânico é zero.

**F2. Raridade da entrada é função da disponibilidade do conteúdo.**
Bane 300 kills / Archfoe 60 / Nemesis 5. Todas as entradas custam aproximadamente o mesmo *tempo de calendário*. É a solução limpa para um catálogo heterogêneo, e é barata de implementar (uma tabela).

**F3. Bônus de "roll extra" em vez de "drop chance".**
Preserva a forma da distribuição de loot. O item raro continua sendo um evento; você só compra mais bilhetes. Mantém o jackpot vivo enquanto o poder da conta cresce.

**F4. Progresso parcial sempre paga.**
Charm Points vêm por entrada completa, Boss Points por *nível* de boss, Animus Mastery por criatura. Nunca existe "faltam 3 e não vale nada" no nível macro — há granularidade suficiente para sentir avanço semanalmente.

**F5. Bônus de coleção escala com o tamanho da coleção.**
Animus Mastery: +0,1% por 10 masteries, aplicado a *todas*. Boss Points: pontos de qualquer boss aumentam o bônus do boss no slot. Isso faz o colecionador retroativamente melhorar tudo que ele já fez — é a mecânica que dá sentido a "construir uma conta".

**F6. Rotação diária/semanal dá rumo sem obrigar.**
Boosted Creature e Boosted Boss diários, reroll de Prey a cada 20h, Weekly Tasks resetando na segunda. Sempre existe uma resposta óbvia para "o que eu faço hoje?", e ela muda. Isso combate a paralisia num catálogo de 833 criaturas.

**F7. O Boosted Boss reseta o cooldown de todo mundo.**
Detalhe pequeno, consequência grande: o jogo garante que o conteúdo destacado do dia é *acessível hoje*. Destaque sem acessibilidade seria frustração pura.

**F8. Cooldowns de 10h/20h em vez de 24h.**
Evita o "creep de horário" que empurraria o jogador para sessões cada vez mais tardias.

**F9. Recompensas cosméticas de exibição (Podium of Vigour, títulos, troféus).**
Custo de produção baixíssimo, valor emocional alto, zero impacto em balanceamento. O primeiro pódio vem de graça no primeiro Expertise — onboarding de um sistema de vaidade que depois vende pódios.

**F10. Existe uma trilha de "coleção pura" separada da trilha de poder.**
17.400 dos 28.734 Charm Points bastam para todos os charms. O resto é para colecionadores. Separar "quando o poder termina" de "quando a coleção termina" impede que o completionismo vire requisito de build.

---

## 4. Pontos fracos

**W1. Escala absurda.**
~1,25M kills para o Bestiary, ~32,9k kills de boss sob cooldown para o Bosstiary. O sistema não foi dimensionado para ser completado — foi dimensionado para nunca acabar. Para um single-player com sessões de 15–30 min, isso é inaplicável em qualquer escala.

**W2. O gargalo é o relógio do servidor, não a decisão do jogador.**
Cooldowns de 20h/48h/14d significam que a otimização ótima é *logar no horário certo*, não *jogar bem*. Isso produz o comportamento mais tóxico de MMO: agenda de vida real ditada pelo jogo. Para nós é inaceitável — contradiz frontalmente "sessões curtas" e "sem vantagem por jogar 24/7".

**W3. Bosses Nemesis dependem de raid/spawn global.**
109 bosses cuja disponibilidade depende de eventos do mundo e de competição por população. Num single-player isso simplesmente não existe, e é bom que não exista.

**W4. Fricção monetária para *mudar de ideia*.**
Remover charm: `level × 100`. Trocar boss slot: 100k, 400k, 700k, 1M... Reset de charms: até 21M de gold em level 2000. O jogo cobra por adaptação. Pior: parte dessa fricção foi *vendida* como remoção na Store, o que confirma que ela é fricção artificial, não decisão de design.

**W5. Curvas de tier não-lineares no fim da linha.**
Charm tier 3 custa 3× os anteriores somados para +1 ponto percentual. Boss loot bonus acima de 100% exige +5 pontos por nível, cumulativo. São sinks de fim de vida disfarçados de progressão. Legítimos num MMO de 30 anos; sem propósito num jogo de 3 meses de conteúdo.

**W6. Ausência total de pity/piso garantido no loot de boss.**
Todo o sistema de Boss Points aumenta *chance*, nunca garante. Um jogador pode matar um boss 300 vezes e nunca ver o item assinatura. Em Tibia isso é diluído pelo mercado entre jogadores; num single-player sem economia é um beco sem saída emocional.

**W7. O eixo "Occurrence Very Rare" é bom em teoria e ruim na prática.**
Entrada de 2/3/5 kills numa criatura que aparece raramente significa que o gate real é **encontrar a criatura**, não matá-la. O jogador não tem agência: ou aparece, ou não. É variance sem decisão.

**W8. Charm atribuído a *uma* criatura é fraco em sessão curta.**
O modelo pressupõe hunts de horas no mesmo spawn. Numa run de 8 minutos com 5 tipos de inimigo, um buff de +5% contra uma criatura específica é imperceptível. O design do charm é acoplado à duração da sessão de Tibia.

**W9. Camadas empilhadas geram sobreposição confusa.**
Bestiary e Animus Mastery colecionam **a mesma lista de criaturas** por caminhos diferentes, com moedas diferentes (Charm Points vs Soul Cores) e bônus diferentes. Prey, Bounty Talisman e Charms todos oferecem "mais loot" e "mais dano contra criatura". O jogador precisa de planilha para saber o que otimizar.

**W10. Regras de contabilização com pegadinhas.**
"Precisa ter dado dano nos últimos 5 minutos"; summons não contam para Bounty Task e compartilham nome com a criatura (a wiki precisa explicar que um ícone diferencia Acid Blob de summon). Regras invisíveis que só se aprendem errando.

**W11. As criaturas do Soulpit não contam para kill counters.**
Coerente para evitar exploit, mas na prática significa que o jogador faz uma atividade de combate de 10 minutos que **não avança o Bestiary**. Progressão paralela que não converge é confusa.

---

## 5. Elementos transferíveis

Ordenados por relação valor/custo para o Huntbound.

| # | Elemento | Por que transfere | Custo de produção |
|---|---|---|---|
| T1 | **Entrada de coleção com 3 estágios que revelam informação** | Repetição vira aprendizado; a UI já é o guia do jogo | Baixo (dados + UI) |
| T2 | **Raridade da entrada = f(disponibilidade), não f(força)** | Normaliza tempo de calendário entre conteúdos heterogêneos | Trivial (tabela) |
| T3 | **Bônus de coleção = roll extra, não drop chance** | Preserva jackpot; escala bem | Baixo |
| T4 | **Meta account-wide que cresce com o tamanho da coleção** (Animus Mastery) | Faz coleção parcial pagar retroativamente | Baixo |
| T5 | **Alvo destacado do dia com multiplicador de coleção** (Boosted Boss/Creature) | Melhor mecanismo "por que logar hoje" que existe | Baixo |
| T6 | **Destaque do dia *reseta* o lockout do alvo** | Destaque sem acesso é frustração | Trivial |
| T7 | **Boss slot: escolher um alvo focado que ganha bônus** | Move a decisão para o jogador; casa com o pilar do helper | Baixo |
| T8 | **Pacote semanal com teto duro + multiplicador por completude** (Weekly Tasks: 8× em 16 tasks) | Compromisso semanal sem grind ilimitado | Médio |
| T9 | **Moeda de reroll para trocar de tarefa** | Dá agência sobre "não quero caçar isso hoje" | Baixo |
| T10 | **Conversão de colecionável entre tiers** (Exalted Core / Soul Prism) | Anti-travamento; nunca ficar preso por RNG de material | Médio |
| T11 | **Instância curta, determinística e tabelada** (Soulpit: 10min, 4 waves) | É literalmente o formato de sessão que queremos | Médio |
| T12 | **Trilha de vaidade separada** (pódio, troféu, título) | Valor emocional alto, zero impacto em balance | Baixo |
| T13 | **Multiplicador de progresso de coleção comprável com progressão** (Bounty Talisman: até +100% bestiary) | Catch-up elegante para quem entrou tarde ou parou | Baixo |
| T14 | **Lockout deslizante < 24h** | Evita creep de horário | Trivial |
| T15 | **Separar "onde termina o poder" de "onde termina a coleção"** | Impede completionismo virar requisito de build | Conceitual |

---

## 6. Elementos a evitar

| # | Elemento | Motivo |
|---|---|---|
| A1 | **Thresholds na casa dos milhares** | Incompatível com sessões de 15–30 min. Nosso teto absoluto deveria ser dezenas. |
| A2 | **Cooldown por relógio de mundo real como gargalo primário** | Faz o jogo ditar a agenda do jogador. Substituir por orçamento de entradas. |
| A3 | **Bosses que dependem de spawn global / competição** | Não existe em single-player e não deve ser simulado. |
| A4 | **Taxa em moeda para trocar de configuração** (charm swap, boss slot) | Pune adaptação. Trocar loadout deve ser sempre livre. |
| A5 | **Tiers finais com custo desproporcional a ganho marginal** | Sink de MMO de 30 anos. Não temos 30 anos de conteúdo. |
| A6 | **Loot de boss puramente aleatório sem piso garantido** | Sem economia entre jogadores, azar vira beco sem saída. |
| A7 | **Entradas gateadas por encontro raro sem agência** (Occurrence Very Rare) | Variance sem decisão. Se algo é raro, dê ao jogador uma forma de forçar o encontro. |
| A8 | **Buff atribuído a uma única espécie** | Imperceptível numa run curta e multi-inimigo. Usar família/classe. |
| A9 | **Múltiplos sistemas paralelos oferecendo o mesmo bônus** | Prey + Charms + Talisman + Boss Slot todos dando "mais loot" = ilegibilidade. Um eixo, uma fonte. |
| A10 | **Regras de contabilização invisíveis** (janela de 5 min, summons não contam) | Se o jogador precisa da wiki para entender por que o contador não subiu, o sistema falhou. |
| A11 | **Atividade de combate que não conta para a coleção principal** (Soulpit) | Toda run deve avançar algo legível. |
| A12 | **Coleção dimensionada para nunca terminar** | Nosso jogo deve ter um "você completou o Codex" real e comemorável. |
| A13 | **Contagem por kill individual** | Com helper 24/7, contagem por kill é exatamente o vetor de abuso que queremos fechar. |

---

## 7. Modelo conceitual de Bestiary para Huntbound

> Nome de trabalho: **Códex** (evita colisão com o termo de Tibia e evita prometer 833 entradas).
> Todos os números abaixo são `[HIPÓTESE]` — pontos de partida para playtest, não balanceamento.

### 7.1 Princípio estruturante

**O crédito de Códex é concedido na conclusão da run, em lote, e não por kill individual.**

Consequências, todas desejáveis:
- O helper rodando 24h numa dungeon **não gera progresso**: só runs concluídas contam.
- O progresso é **previsível**: a tela de entrada da dungeon pode dizer "esta run vale 3 Cinis Rato-de-Cripta, 2 Gárgula".
- Elimina toda a classe de regras invisíveis (janela de tag, summons, quem deu mais dano).
- Faz o design conversar com o modo Sincronizado: uma run sincronizada pode valer **2×** crédito, criando incentivo sem obrigação (Guia §8).

### 7.2 Estrutura da entrada

Quatro estados, espelhando o valor informacional de Tibia:

| Estado | Como se atinge | O que revela |
|---|---|---|
| **Desconhecido** | — | silhueta |
| **Avistado** | 1ª morte | nome, sprite, tier, arte |
| **Estudado** | limiar 2 | HP, resistências, padrão de ataque, drops comuns |
| **Dominado** | limiar 3 | tabela de loot completa, dungeons onde aparece, **libera slot de Sigilo para a família** |

### 7.3 Limiares por tier

Cinco tiers de criatura, alinhados às faixas de progressão do W01. Escala deliberadamente **~50× menor** que Tibia.

| Tier | Avistado | Estudado | Dominado | Pontos de Estudo | Runs típicas p/ Dominar |
|---|---|---|---|---|---|
| T1 — Comum | 1 | 8 | 20 | 2 | 2–3 |
| T2 — Incomum | 1 | 12 | 35 | 4 | 3–4 |
| T3 — Elite | 1 | 15 | 45 | 8 | 4–6 |
| T4 — Rara | 1 | 6 | 18 | 12 | 4–6 |
| T5 — Aberrante | 1 | 3 | 8 | 20 | 4–6 |

Note que T4 e T5 seguem a lógica **Occurrence** de Tibia (elemento T2): são criaturas que aparecem pouco por run, então o limiar cai. **A coluna que precisa ficar constante é a última** — "runs típicas para dominar" deve ficar em 2–6 para *tudo*. Esse é o invariante de balanceamento.

**Tamanho alvo do catálogo inicial:** 50–80 entradas `[HIPÓTESE]`. Com ~4 runs por entrada e ~4 entradas creditadas por run, o Códex completo cai em algo como **8–12 semanas de rotina diária normal** — longo o suficiente para ser uma meta, curto o suficiente para ser alcançável e comemorável (evita A12).

### 7.4 Anti-abuso: teto diário com resíduo

O ponto delicado. Crédito por run fecha o abuso de idle, mas não fecha o abuso de "50 runs por dia com helper".

**Proposta: medidor de Foco de Estudo, separado da energia.**

- Foco diário: ~6 runs creditam Códex a **100%**.
- Depois disso, runs creditam a **20%**.
- Foco não acumula entre dias (diferente da energia, que acumula — ver §9).

Racional: 6 runs cobre com folga a rotina de 15–30 min. Quem joga 3h ainda progride, mas a 1/5 do ritmo — a curva achata em vez de zerar. **Nunca zerar é importante**: crédito zero ensina o jogador a parar de jogar, e nós queremos que jogar mais seja agradável, só não dominante.

`[HIPÓTESE]` Este é o parâmetro que mais precisa de playtest. A pergunta a validar: *"um jogador de 3h/dia termina o Códex em quanto tempo comparado a um de 25 min/dia?"* Alvo: não mais que ~2× mais rápido.

### 7.5 O que a coleção compra

Dois produtos, deliberadamente separados (evita W9):

**(a) Sigilos — o análogo dos Charms, corrigido.**

- Comprados com **Pontos de Estudo**.
- **Atribuídos a uma família de criaturas** (Mortos-vivos, Bestas, Demônios, Construtos, Aberrações...), **não a uma espécie**. Corrige A8: numa run de 8 min com 5 inimigos de uma mesma família, o buff é sentido.
- Requisito: ter ao menos N entradas **Dominadas** daquela família.
- **Slots limitados**: 2 → 3 → 4 → 5 conforme marcos do Códex. A escassez de slots é onde mora a decisão.
- **Troca sempre gratuita e instantânea, no hub.** (evita A4). A escolha "qual sigilo levar para esta dungeon" é conteúdo; cobrar por ela mata o conteúdo.
- Efeitos: um eixo cada — dano contra família, redução de dano da família, chance de roll extra de loot da família, chance de material extra. **Sem tier 3 desproporcional** (evita A5): 2 tiers, custo ~1:2.5.

**(b) Marcos do Códex — o análogo do Animus Mastery.**

Bônus permanentes de conta, disparados por contagem de entradas Dominadas, aplicados a *tudo*:

| Entradas Dominadas | Recompensa |
|---|---|
| 5 | +1 slot de Sigilo |
| 10 | +2% de dano geral |
| 20 | +1 slot de Sigilo |
| 30 | +3% de chance de roll extra de loot |
| 45 | +1 slot de Sigilo |
| 60 | +5% de material extra |
| Todas | Título + cosmético de hub + recompensa única memorável |

Isso garante que **coleção parcial paga sempre** (F4/F5) e que o jogador que ignora completionismo ainda ganha os primeiros marcos naturalmente.

### 7.6 Onde não usar energia

**O Códex não consome energia.** Energia limita **economia** (materiais, gold, gear); o Códex é limitado pelo Foco diário. Manter os dois gargalos separados é o que permite ao jogador sem energia ainda ter uma razão para jogar — e é o que impede que um dia ruim de drops se sinta como um dia perdido.

---

## 8. Modelo conceitual de Bossiary para Huntbound

> Nome de trabalho: **Registro de Caça**.

### 8.1 As três categorias — por cadência, não por força

Copiando o achado central de Tibia (§2.4), mas com a cadência definida por **orçamento de entradas** em vez de relógio:

| Categoria | Disponibilidade | Prova / Perícia / Maestria | Pontos de Caça | Nº alvo no MVP |
|---|---|---|---|---|
| **Recorrente** | ilimitado; crédito capado em 3/dia | 10 / 25 / 50 | 40 (5+10+25) | 6–8 |
| **Arconte** | consome 1 Entrada de Arconte (3/semana) | 3 / 8 / 18 | 80 (10+20+50) | 4–6 |
| **Ápice** | consome 1 Entrada de Ápice (1/semana) | 1 / 3 / 6 | 80 (10+20+50) | 2–3 |

`[CÁLCULO]` Custo total para completar tudo, no cenário máximo (8/6/3 bosses):
- Recorrente: 8 × 50 = 400 kills, a 3/dia por boss → ~17 dias por boss se focado, mas paralelizável entre bosses.
- Arconte: 6 × 18 = 108 entradas, a 3/semana → **36 semanas** se gastas só nisso.
- Ápice: 3 × 6 = 18 entradas, a 1/semana → **18 semanas**.

Isso já é longo demais. **Correção necessária:** as entradas semanais precisam ser mais generosas, OU os limiares de Arconte/Ápice mais baixos, OU (melhor) o Boosted Boss diário precisa creditar múltiplo e resetar a categoria. Ver §8.4. `[HIPÓTESE]` Ajustando para 5 Entradas de Arconte + 2 de Ápice por semana e mantendo o boost diário em 3×, a completude cai para a faixa de **12–16 semanas**, que é o alvo.

> **Esta é a decisão de balanceamento mais crítica do sistema** e não deve ser resolvida em papel. Precisa de simulação simples de calendário antes de qualquer implementação.

### 8.2 Entradas em vez de cooldowns

O ponto central da adaptação (evita A2):

- **Não existe timer por boss.** Existe um **orçamento semanal de Entradas**, reposto no reset semanal.
- Entradas **acumulam até 2 semanas** de teto. Quem viajou uma semana não perde nada.
- O jogador escolhe **onde gastar**. Essa escolha é a decisão estratégica que o pilar do helper exige (Base de Contexto §6: "o helper executa repetição, o jogador toma decisões").

Ganhos sobre o modelo de Tibia:
- A pergunta muda de *"que horas posso logar?"* para *"qual boss eu preciso mais esta semana?"* — de agenda para estratégia.
- Falhar numa tentativa não queima o dia inteiro, queima uma entrada (e ver §8.5 sobre falha).
- Sessão pode ser feita em qualquer horário.

### 8.3 Três níveis por boss

Espelhando Prowess/Expertise/Mastery, com produtos distintos:

| Nível | Produto |
|---|---|
| **Prova** | libera o boss para a **Marca de Caça** (boss slot). Primeira Prova da vida concede a primeira Marca. |
| **Perícia** | libera **exibição no hub** (troféu/pódio). Puro cosmético (T12). |
| **Maestria** | dobra o bônus da Marca para esse boss + libera **modo desafio** do encontro (afixos, ver §8.7). |

### 8.4 Alvo do dia

Manter integralmente o Boosted Boss, é o mecanismo mais barato e mais eficaz (T5/T6):

- 1 boss **Recorrente ou Arconte** destacado por dia, rotação garantida sem repetir por N dias.
- Durante o dia: **crédito ×3** no Registro + bônus de loot substancial.
- **Se for Arconte, a tentativa do dia não consome Entrada** — este é o análogo direto do "reseta o cooldown de todo mundo" (F7), e é o que faz o destaque ser real em vez de decorativo.
- Visível no hub antes de o jogador escolher qualquer coisa.

`[HIPÓTESE]` Combinado com o orçamento semanal, isso cria a rotina alvo: *o jogador entra, vê o alvo do dia, faz a run destacada (grátis se Arconte), gasta energia numa ou duas dungeons de material, sai.* 15–25 minutos.

### 8.5 O que acontece quando o jogador perde

Tibia não tem uma resposta boa para isso (`timeToDefeat` de 20 min, falhou, volta em 20h). Nós precisamos de uma:

`[HIPÓTESE]` **Entrada só é consumida quando o boss morre.** Derrota devolve a entrada, com um custo pequeno e não-punitivo (perda dos consumíveis usados, tempo). Racional: o jogo é single-player, não há exploit econômico em tentar de novo, e "perder a semana por ter tentado um boss difícil" é o desincentivo exato ao comportamento que queremos encorajar (tentar conteúdo acima do seu nível).

### 8.6 Pontos de Caça → bônus, com teto

Manter o conceito de meter account-wide (T3/T4), corrigindo a forma:

- Pontos de Caça de **qualquer** boss aumentam o bônus da **Marca de Caça**.
- Bônus = **rolls extras** na tabela de loot do boss marcado (T3), nunca drop chance.
- **Curva com teto explícito e legível**: 0% → 100% ao longo da progressão pretendida, com breakpoints a cada 10%. Sem o trecho assintótico de Tibia (evita A5). O jogador deve conseguir ler "faltam 120 pontos para +10%".
- **1 Marca inicialmente, 2ª Marca num marco claro.**
- **Troca de Marca: livre, 1× por reset diário.** Sem taxa em gold, nunca (evita A4). Se precisar de fricção, use o próprio reset como fricção.

### 8.7 Piso garantido — o que Tibia não tem

O buraco mais grave do modelo original (W6), e o mais fácil de consertar:

- Todo boss dropa **Troféus** (moeda específica daquele boss) de forma **garantida**, quantidade escalando com dificuldade e com a Marca.
- Troféus compram, na loja do hub, os **itens assinatura daquele boss** — a preços altos.
- O drop aleatório continua existindo e continua sendo o momento bom.

Efeito: o jogador que teve azar 20 vezes seguidas ainda vê a barra andar, e sabe exatamente quantas runs faltam no pior caso. **Variance vira tempero; determinismo vira o piso.** Esta é a diferença entre "jogo respeitou meu tempo" e "joguei 3 semanas para nada".

### 8.8 Tipos de boss no Huntbound

Traduzindo a taxonomia de §2.5 para o que faz sentido em single-player:

| Tipo | Origem em Tibia | Mantemos? | Formato |
|---|---|---|---|
| **Instanciado com entrada** | boss de alavanca | **Sim, é o padrão** | O modelo de `boss_lever.lua` já é per-player e instanciado |
| **Chefe de dungeon** | boss de fim de área | **Sim** | Fim de run normal, categoria Recorrente, sem entrada |
| **Boss raro em run** | boss raro de hunt | **Sim** | Chance baixa de substituir um encontro; alta surpresa, custo zero de UI |
| **Boss de raid global** | boss de raid | **Não** (A3) | Sem população, não faz sentido |
| **Boss de quest one-shot** | boss de quest | **Parcial** | Primeira vez é narrativa; repetição vira Ápice com entrada |
| **Boss modulado** | — (vem do WAKFU, W04) | **Sim** | Mesmo boss em modo Sincronizado = entrada separada no Registro, ou multiplicador |

O último merece destaque: `[HIPÓTESE]` se uma vitória em modo Sincronizado creditar **2×** no Registro, temos um incentivo forte para o modo difícil **sem torná-lo obrigatório** — exatamente o que o Guia §8 pede ("a diária não deve obrigar sempre o modo sincronizado; a semanal pode incentivar").

---

## 9. Como limitar grind sem destruir sensação de progresso

Dez princípios. Os quatro primeiros são os que realmente carregam o sistema.

### P1. O crédito é da run, não do kill

Já argumentado em §7.1. É a mudança estrutural que torna o helper seguro. Se o crédito fosse por kill, todo o resto deste documento seria uma corrida armamentista contra idle farming.

### P2. Nenhuma run devolve zero

Toda run concluída paga **pelo menos uma** moeda de progresso: crédito de Códex, Pontos de Caça, troféus, materiais, ou progresso de tarefa. O jogador nunca deve terminar uma run e pensar "isso não contou". Uma run pode ser *pior* que outra; nunca *nula*.

Corolário: quando um teto é atingido (Foco esgotado, entradas gastas), a run continua pagando algo — reduzido, nunca zerado. Zerar ensina a fechar o jogo.

### P3. A coleção é finita, datada e comemorável

Dimensionar o Códex e o Registro para **8–16 semanas de rotina normal**, e desenhar um momento de conclusão real. Um jogo cuja coleção termina pode lançar a próxima coleção; um jogo cuja coleção nunca termina só tem jogadores cansados. (evita A12/W1)

### P4. Piso garantido embaixo, teto de ritmo em cima

- **Embaixo:** troféus garantidos, conversão de materiais, pity. O pior caso é conhecido e finito.
- **Em cima:** Foco diário, entradas semanais. O melhor caso é limitado.
- **No meio:** RNG, que agora é *tempero* — a diferença entre uma boa semana e uma semana normal, não entre progredir e não progredir.

### P5. Dois gargalos, dois propósitos, nunca sobrepostos

| Gargalo | Limita | Acumula? |
|---|---|---|
| **Energia/Resina** | economia: materiais, gold, gear | **Sim**, até ~7 dias |
| **Foco de Estudo** | coleção: Códex | Não (diário, resíduo de 20%) |
| **Entradas de Boss** | conteúdo de pico: Arconte/Ápice | **Sim**, até 2 semanas |

O acúmulo é a diferença central entre nosso modelo e resina de gacha. `[HIPÓTESE]` **Energia que acumula recompensa consistência; energia que evapora pune ausência.** Queremos o primeiro. Um jogador que sumiu 5 dias volta com 5 dias de energia e faz uma sessão longa — em vez de voltar tendo perdido 5 dias e desistir.

### P6. O gargalo deve produzir uma decisão, não uma espera

Cooldown de 20h produz espera. Orçamento de 3 entradas produz escolha. Sempre que formos limitar algo, a pergunta é: *"isso força o jogador a escolher, ou só a esperar?"* Se for esperar, está errado.

### P7. Trocar de configuração é sempre grátis

Sigilos, Marca de Caça, loadout do helper, presets. Zero custo em moeda (evita A4/W4). A escolha *qual levar* é o conteúdo; cobrar pedágio para experimentar destrói o conteúdo e beneficia quem já sabe a resposta ótima — ou seja, pune o jogador novo.

Se precisarmos de fricção para evitar troca-por-encontro (swap ótimo antes de cada inimigo), a fricção certa é **estrutural**: só troca no hub, ou só 1× por reset. Nunca monetária.

### P8. O jogador sempre sabe o número

Toda entrada mostra "17 / 35". Todo boss mostra "faltam 2 para Maestria". Toda run mostra, **antes de entrar**, o que ela vale. O Boss Points mostra "+120 pontos → +10%".

Isso é anti-frustração barato: a maior parte da sensação de grind vem de **não saber o quanto falta**. 35 kills com contador visível são psicologicamente mais curtas que 15 sem.

### P9. Largura acima de profundidade

Preferir **60 entradas de 4 runs** a **15 entradas de 16 runs**. Mesmo tempo total, muito mais eventos de conclusão. Cada entrada completada é um pico de dopamina; a mesma quantidade de tempo entrega 4× mais picos. `[HIPÓTESE]` Isso também barateia produção: variação de inimigo é mais barata que variação de encontro.

### P10. Rotação diária resolve paralisia

Alvo do dia + tarefas rotativas + reset semanal. Num catálogo com 60 entradas e 15 bosses, "o que eu faço hoje?" é uma pergunta real. O jogo deve responder por default, e permitir ignorar. (T5)

### Como isso se junta numa sessão

`[HIPÓTESE]` Rotina diária alvo, ~20 minutos:

1. Hub: ver alvo do dia, tarefas ativas, entradas disponíveis. (~1 min de decisão)
2. Boss destacado do dia — grátis se Arconte. (~5 min)
3. 2–3 runs de dungeon gastando energia, escolhidas pelo material que falta ou pela entrada de Códex mais próxima de fechar. (~12 min)
4. Hub: gastar Pontos de Estudo, ajustar Sigilo, ver marco que se aproxima. (~2 min)

Rotina semanal, +30–45 min: gastar Entradas de Arconte/Ápice, fechar o pacote de tarefas semanais para o multiplicador, uma run sincronizada.

---

## 10. Riscos e decisões em aberto

**R1. O balanceamento de calendário do Registro de Caça não fecha no papel** (§8.1). Com 3 Entradas de Arconte/semana e 18 kills para Maestria, um único boss leva 6 semanas. Precisa de simulação de calendário antes de fixar qualquer número. **Maior risco do documento.**

**R2. Foco de Estudo é um terceiro medidor.** Energia + Foco + Entradas = três recursos com três regras de reposição. Existe risco real de ilegibilidade (o mesmo erro W9 que criticamos em Tibia). **Decisão em aberto:** vale fundir Foco com Energia (Códex creditando proporcional à energia gasta) e aceitar que dry runs não dão coleção? Isso simplifica a UI mas reintroduz "run que não conta" (viola P2).

**R3. Sigilos por família dependem de uma taxonomia de famílias que ainda não existe.** Precisa ser definida junto com o bestiário de conteúdo (W01), não depois.

**R4. Troféus garantidos podem trivializar o loot aleatório.** Se o preço em troféus for baixo, ninguém se importa com drop; se for alto demais, o piso não é sentido. `[HIPÓTESE]` Alvo: piso ≈ 2–3× o tempo esperado do drop aleatório.

**R5. "Crédito por run" pode ser explorado por runs muito curtas.** Se existir uma dungeon de 90 segundos, ela domina o Foco diário. Mitigação: crédito proporcional ao conteúdo efetivamente limpo, não à conclusão binária.

**R6. Não validamos sentimento de jogador com fontes primárias.** As seções de "pontos fracos" derivam de análise das mecânicas e do **histórico de mudanças da própria CipSoft** (facilitação das Hunting Tasks em 2020, adição de reset de charms em 2024, upgrade de "progresso duplo de bestiary" em 2025, rework do Task Board), que é evidência forte mas indireta. Busca por threads de fórum/Reddit não retornou fontes primárias utilizáveis nesta rodada. **Se sentimento de jogador for decisivo para alguma escolha, isso precisa de uma rodada dedicada.**

---

## 11. Fontes

### Públicas

- [TibiaWiki — Cyclopedia](https://tibia.fandom.com/wiki/Cyclopedia) — fonte principal: Bestiary, tabela de dificuldades, lista completa de Charms, Bosstiary, categorias, Boss Points, Boss Slot, Daily Boosted Boss.
- [TibiaWiki — Bestiary/Difficulties](https://tibia.fandom.com/wiki/Bestiary/Difficulties) — tabela de limiares e Charm Points por dificuldade/ocorrência.
- [TibiaWiki — Prey System](https://tibia.fandom.com/wiki/Prey) — slots, pool de 9 criaturas, bônus e degraus, reroll de 20h, mecânica de "loot extra = set adicional".
- [TibiaWiki — Task Board](https://tibia.fandom.com/wiki/Task_Board) — Bounty Tasks, tiers e faixas de kill, Bounty Ring (incl. progresso duplo de bestiary até 100%), Weekly Tasks, multiplicadores 2×/3×/5×/8×, Soulseals.
- [TibiaWiki — Soulpit](https://tibia.fandom.com/wiki/Soulpit) — composição das waves, 10 min, Soul Cores, Exalted Core / Soul Prism.
- [TibiaWiki — Animus Mastery](https://tibia.fandom.com/wiki/Animus_Mastery) — +2% base, +0,1% por 10 masteries, teto +2%.
- [TibiaWiki — Boosted Creature](https://tibia.fandom.com/wiki/Boosted_Creature) — rotação por server save, bônus, cooldown de 30 dias.
- [TibiaWiki — Boss Cooldowns](https://tibia.fandom.com/wiki/Boss_Cooldowns) — rastreamento de cooldowns por personagem.
- [TibiaBuddy — Bosstiary Guide 2026](https://www.tibiabuddy.com/blog/bosstiary-guide-2026) — perspectiva de jogador: rotação diária, priorização Nemesis, estimativa de 1–3 anos para completude, dores de rastreamento manual.
- [TibiaBuddy — Charm Guide 2026](https://www.tibiabuddy.com/blog/charm-guide-2026) — uso prático de charms e rotas de farm.
- [Tibia.com — Library / Creatures](https://www.tibia.com/library/?subtopic=creatures) — fonte oficial da lista de criaturas.

### Código local (`references/canary`)

- [io_bosstiary.hpp](references/canary/src/io/io_bosstiary.hpp) — `BosstiaryRarity_t`, tabela `levelInfos` com kills/pontos por categoria (linhas 12–48).
- [io_bosstiary.cpp](references/canary/src/io/io_bosstiary.cpp) — `loadBoostedBoss()` (filtro Archfoe, limpeza de slots), `calculateLootBonus()` (curva de três trechos), `calculteRemoveBoss()` (custo de troca de slot), pódio grátis no nível 2.
- [iobestiary.cpp](references/canary/src/io/iobestiary.cpp) — `getKillStatus()`, os três limiares de estágio, gestão de charms.
- [monsters.hpp](references/canary/src/creatures/monsters/monsters.hpp) — campos `bestiaryOccurrence`, `bestiaryStars`, `bestiaryToUnlock` (linhas 90–92).
- [boss_lever.lua](references/canary/data/libs/functions/boss_lever.lua) — estrutura completa do encontro instanciado: `timeToFightAgain`, `timeToDefeat`, `minPlayers`, `playerPositions`, escopo de cooldown por jogador.
- [configmanager.cpp](references/canary/src/config/configmanager.cpp) — defaults `bossDefaultTimeToDefeat = 20min`, `bossDefaultTimeToFightAgain = 20h` (linhas 233–234).
- [ioprey.cpp](references/canary/src/io/ioprey.cpp) — uso de `bestiaryStars` para estratificar o pool de prey.
- `data-otservbr-global/monster/**` — distribuição observada: 60 Bane / 105 Archfoe / 84 Nemesis; estrelas de bestiary 13/51/154/297/181/53 (0★–5★).

---

## Anexo — Tibia vs. Huntbound, lado a lado

| Dimensão | Tibia | Huntbound proposto |
|---|---|---|
| Entradas de bestiary | 833 | 50–80 |
| Kills p/ completar bestiary | ~1.250.000 `[CÁLCULO]` | ~2.000–3.000 |
| Kills p/ completar bosstiary | ~32.900 `[CÁLCULO]` | ~600–900 |
| Tempo p/ completude | anos | 8–16 semanas |
| Unidade de crédito | kill individual | run concluída |
| Gargalo de boss | cooldown de relógio (20h–14d) | orçamento de entradas semanais |
| Gargalo de coleção | nenhum (tempo bruto) | Foco diário + resíduo de 20% |
| Gargalo de economia | nenhum (tempo bruto) | energia acumulável (7 dias) |
| Recurso perdido por ausência | nada (mas atrasa) | nada (acúmulo) |
| Alvo do buff de coleção | espécie única | família |
| Custo de trocar buff | `level × 100` gold | grátis |
| Custo de trocar boss slot | até 1M+ gold | grátis, 1×/dia |
| Piso de loot de boss | nenhum | troféus garantidos |
| Bônus de loot | roll extra (bom) | roll extra (manter) |
| Teto do bônus | ~197%, assintótico | 100%, breakpoints legíveis |
| Alvo destacado do dia | sim, reseta cooldown | sim, não consome entrada |
| Progresso parcial paga | sim | sim, com marcos mais densos |
