# W01 — Tibia: hunts, progressão por level e transformação em dungeons

> **Status:** Pesquisa externa (Fase A). Documento de referência, não de decisão.
> **Escopo:** progressão tradicional de hunts em Tibia e sua tradução para dungeons instanciadas curtas em **Kaezan Huntbound**.
> **Aviso importante:** nenhum número de Tibia citado aqui deve ser tratado como regra do nosso jogo. Os números servem para revelar **padrões, proporções e intenções de design**.

---

## 1. Resumo executivo

**Achados principais:**

1. **Tibia não tem "faixas de level" formais — mas tem quatro faixas de fato, expostas pelo próprio conteúdo.** O sistema de tasks (Killing in the Name of / Grizzly Adams) segmenta o jogo em `6–49`, `50–79`, `80–129` e `130+`. Essa é a evidência mais forte e mais barata de como a CipSoft enxerga a curva. Cada faixa recebe um conjunto de raças e, quase sempre, **um mini-boss por raça**.

2. **A curva de poder do inimigo é quase log-linear e muito ampla.** De `Rat` (20 HP / 5 exp) a `Many Faces` (30.000 HP / 18.870 exp) há ~1.500× em HP e ~3.700× em exp. Mas a curva tem **degraus visíveis** — não é suave. Existem "paredes" reconhecíveis: ~1.000 HP (Dragon/Ancient Scarab), ~2.000 HP (Wyrm/Hydra/Dragon Lord), ~4.000 HP (Behemoth/Draken), ~8.000 HP (Demon/Vexclaw), ~10.000+ (Falcon/Gladiator), ~18–30.000 (Juggernaut/Many Faces).

3. **O que muda com o nível não é "mais HP" — são seis eixos independentes.** Letalidade por hit, tipo de dano/elemento, densidade e tamanho de pack, custo de suprimento, complexidade de rota e gating social. Um jogo curto pode escalar **apenas 3 desses seis** e ainda parecer Tibia.

4. **Densidade importa mais que dificuldade a partir do meio do jogo.** As hunts consideradas boas em level alto (Asura Palace, Carnivora, Falcon Bastion, Soul War) não são as com monstros mais fortes — são as com **respawn denso em layout circular**. Isso é excelente notícia para nós: densidade é exatamente o que uma dungeon instanciada controla com perfeição.

5. **O loot muda de natureza três vezes**, não de quantidade: (a) *vendor trash por peso* no early, (b) *creature products como insumo de sistemas* (imbuements) no mid, (c) *equipamento/tokens raros de tier* no late. Essa transição é copiável praticamente inteira.

6. **O risco em Tibia é externo ao combate.** Morrer custa ~10% de experiência (mitigado por blessings) mais chance de perder equipamento. Esse risco só existe porque o mundo é persistente e compartilhado. Em single-player instanciado, esse eixo **precisa ser substituído**, não portado.

7. **O Bestiary é a melhor peça de design de progressão de Tibia para o nosso caso.** Ele já é um sistema de "faixas" limpo: 5 tiers de dificuldade, custos de kill em degraus (`250 / 500 / 1000 / 2500 / 5000`) e recompensa em degraus (`5 / 15 / 25 / 50 / 100` charm points). É metaprogressão barata, legível e que reaproveita conteúdo antigo — exatamente o que o Huntbound quer.

8. **As hunts mais icônicas são icônicas por identidade temática, não por eficiência.** Rotworms, Minotauros, Cyclopolis, Dwarf Mines, Dragon Lair, Giant Spider Cave, Hero Cave, Demon Helmet, Banuta, Asura Palace. Um jogador de Tibia reconhece essas hunts pelo *sprite e pelo cheiro do lugar*. Isso é replicável com 4–6 salas.

9. **Boa parte do topo de Tibia é hostil à nossa proposta**: hunts de time de 4 vocações, gating por dezenas de tarefas diárias, economia de suprimento dependente de mercado entre jogadores, disputa de spawn e cooldowns de boss de 20h. Nada disso deve ser importado.

10. **A repetição em Tibia é gerenciada por camadas paralelas, não por variedade de conteúdo.** Prey, Bestiary/Charms, Imbuements, Tasks, Bossiary. O mesmo mapa é atravessado por 5 razões diferentes. Esse é o truque central a copiar.

**Três recomendações de maior impacto:**

- **A.** Adotar **8 faixas (tiers) comprimidas** em vez de replicar a escala de level do Tibia; cada tier com **2–3 dungeons temáticas** e um arquétipo de ameaça próprio → ~20 dungeons cobrem a campanha inteira.
- **B.** Usar o padrão **"raça + mini-boss"** do sistema de tasks como formato canônico de dungeon: 4–6 salas da raça-tema + 1 boss temático. Já é a estrutura natural do Tibia.
- **C.** Investir em **camadas paralelas de motivo** (bestiary, materiais de imbuement, tasks, mutators) antes de investir em quantidade de mapas. É o que impede a repetição de matar.

---

## 2. Metodologia e confiabilidade das fontes

Foram usados três tipos de fonte, com pesos diferentes:

| Tipo | Fontes | Confiabilidade | Uso aqui |
|---|---|---|---|
| **Dados brutos de servidor** | Repositório Canary local (`references/canary/data-otservbr-global`) | Alta para *estrutura* e *proporções*; pode divergir do Tibia oficial atual | Curva de HP/exp, tiers de bestiary, bandas de task |
| **Wiki comunitária** | TibiaWiki (Fandom) | Alta para mecânicas e definições | Bestiary/charms, prey, tasks, death penalty |
| **Guias de hunt** | TibiaVault, TibiaPal, TibiaRoute, TibiaBuddy, TibiaBosses | Média — números de exp/h e lucro variam brutalmente por servidor, imbuement, prey, boosted creature e patch | Faixas de level *percebidas* pela comunidade, quais hunts são populares |

> **Cuidado com exp/h e profit/h.** Esses números são a métrica mais citada pela comunidade e a mais volátil. Dois guias podem divergir 3× para a mesma hunt. Eles são úteis apenas como **ordenação relativa** (qual hunt é considerada melhor que qual), nunca como valores absolutos.

> **Nota sobre TibiaWiki:** o acesso automatizado às páginas do Fandom foi bloqueado (HTTP 402/403) durante esta pesquisa. As informações da wiki foram obtidas por busca indexada e por dados equivalentes no Canary. Onde houver divergência potencial, isso está sinalizado no texto.

---

## 3. Como o Tibia realmente estrutura a progressão

### 3.1 A curva de poder do inimigo (dados do Canary)

Amostra de criaturas representativas da "escada clássica", ordenada por experiência:

| Criatura | HP | Exp | Armor | Papel na escada |
|---|---:|---:|---:|---|
| Rat | 20 | 5 | 1 | Tutorial absoluto |
| Cave Rat | 30 | 10 | 1 | Tutorial |
| Troll | 50 | 20 | 6 | Primeiro inimigo "de verdade" |
| Goblin | 50 | 25 | 6 | Primeiro pack |
| Rotworm | 65 | 40 | 8 | **Primeira hunt real** |
| Minotaur | 100 | 50 | 11 | Primeiro humanoide armado |
| Amazon | 110 | 60 | 10 | Primeiro inimigo ranged |
| Dwarf Soldier | 135 | 70 | 9 | Densidade em mina |
| Carrion Worm | 145 | 70 | 8 | Upgrade do rotworm |
| Valkyrie | 190 | 85 | 12 | Ranged + melee misto |
| Tarantula | 225 | 120 | 20 | Pack + veneno |
| Minotaur Mage | 155 | 150 | 18 | **Primeiro caster** |
| Cyclops | 260 | 150 | 17 | Primeiro "bruiser" |
| Minotaur Guard | 185 | 160 | 15 | Elite dentro da raça |
| Stone Golem | 270 | 160 | 30 | Primeira parede de armor |
| Dwarf Guard | 245 | 165 | 15 | Elite dentro da raça |
| Orc Warlord | 950 | 670 | 28 | Mini-boss de campo |
| **Dragon** | 1.000 | 700 | 25 | **Marco cultural do jogo** |
| Ancient Scarab | 1.000 | 720 | 36 | Pack pesado |
| Giant Spider | 1.300 | 900 | 30 | Ameaça isolada perigosa |
| Hero | 1.400 | 1.200 | 35 | Alta exp, alta letalidade |
| Wyrm | 1.825 | 1.550 | 34 | Dano de energia à distância |
| Nightmare | 2.700 | 1.800 | 25 | Dano de morte + dreno |
| Werewolf | 1.955 | 1.900 | 36 | Pack rápido, exige nível |
| Hydra | 2.350 | 2.100 | 27 | Multi-alvo |
| Frost Dragon | 1.800 | 2.100 | 38 | Elemental puro (gelo) |
| Dragon Lord | 1.900 | 2.100 | 34 | Upgrade direto do Dragon |
| Draken Warmaster | 4.150 | 2.400 | 55 | Elite militar em formação |
| Behemoth | 4.000 | 2.500 | 50 | Parede física |
| Serpent Spawn | 3.000 | 3.050 | 35 | Caster pesado |
| Lost Soul | 5.800 | 4.000 | 28 | Swarm de alto nível |
| Ghastly Dragon | 7.800 | 4.600 | 30 | Dano de morte + invocação |
| Crazed Summer Rearguard | 5.300 | 4.700 | 76 | Armor extremo |
| Grim Reaper | 3.900 | 5.500 | 30 | Alta exp / baixo HP relativo |
| **Demon** | 8.200 | 6.000 | 44 | **Marco cultural do endgame clássico** |
| Guzzlemaw | 6.400 | 6.050 | 74 | Swarm de altíssimo nível |
| Vexclaw | 8.500 | 6.248 | 55 | Extradimensional |
| Falcon Knight | 9.000 | 6.300 | 86 | Elite humanoide moderna |
| Burning Gladiator | 10.000 | 7.350 | 89 | Elite humanoide moderna |
| Ancient Lion Knight | 9.100 | 8.100 | 0 | Elite moderna |
| Juggernaut | 18.000 | 11.200 | 70 | Semi-boss de campo |
| Many Faces | 30.000 | 18.870 | 105 | Topo absoluto de trash |

*(Fonte: `references/canary/data-otservbr-global/monster/**/*.lua`. O Canary é um servidor open-source alinhado ao Tibia global; valores podem divergir levemente do oficial.)*

**Leitura de design:**

- A razão **exp/HP** é surpreendentemente estável no early-mid (Rat 0,25; Rotworm 0,61; Minotaur 0,5; Cyclops 0,58; Dragon 0,70; Giant Spider 0,69) e **melhora** no endgame (Grim Reaper 1,41; Many Faces 0,63 mas com densidade absurda). Ou seja: o jogo **não** te faz bater mais tempo por menos recompensa. O tempo-por-kill sobe, mas a recompensa acompanha.
- **Armor sobe muito mais que HP proporcionalmente no conteúdo moderno** (Falcon 86, Gladiator 89, Many Faces 105 vs Dragon 25). Isso é um mecanismo de gate de dano: conteúdo novo exige *build*, não só level.
- Existem **grandes saltos deliberados**: de Minotaur Guard (185 HP) para Orc Warlord (950 HP) há um vazio. Esse vazio é onde o Tibia coloca a transição "sair da hunt de cidade e ir para uma hunt de verdade".

### 3.2 As bandas de nível expostas pelo sistema de tasks

O sistema de tasks (Killing in the Name of) é a única estrutura do Tibia que **declara explicitamente** faixas de level. Extraído de `references/canary/data-otservbr-global/lib/quests/killing_in_the_name_of.lua`:

| Banda | Raças oferecidas | Mini-boss associado |
|---|---|---|
| **6–19** (Daniel Steelsoul) | Trolls, Goblins | — |
| **20–39** | Rotworms / Carrion Worms | — |
| **30–59** | Cyclops (drone/smith) | — |
| **6–49** (Grizzly Adams) | Crocodiles, Badgers, Tarantulas, Carniphilas, Stone Golems, Mammoths, Gnarlhounds, Terramites, Apes, Thornback Tortoises, Gargoyles | Snapper, Hide, Deathbine, Bloodtusk |
| **50–79** | Ice Golems, Quara Scouts, Mutated Rats, Ancient Scarabs, Wyverns, Lancer Beetles, Wailing Widows, Killer Caimans, Bonebeasts, Crystal Spiders, Mutated Tigers | Shardhead, Esmeralda, Fleshcrawler, Ribstride, Bloodweb |
| **80–129** | Underwater Quara, Giant Spiders, Werewolves, Nightmares, Hellspawns, High Class Lizards, Stampors, Brimstone Bugs, Mutated Bats | Thul, Old Widow, Hemming, Tormentor, Flameborn, Fazzrah, Tromphonyte, Sulphur Scuttler, Bruise Payne |
| **130+** | Hydras, Serpent Spawns, Medusae, Behemoths, Sea Serpents, Hellhounds, Ghastly Dragons, Drakens, Destroyers, Undead Dragons, Demons | Many, Noxious Spawn, Gorgo, Stonecracker, Leviathan, Kerberos, Ethershreck, Paiz, Bretzecutioner, Zanakeph |

**Este é o achado mais diretamente reutilizável do relatório.** O padrão é sempre o mesmo:

> **Uma raça temática + uma quantidade de kills + um mini-boss exclusivo daquela raça + recompensa em pontos de rank.**

Os ranks são progressivos: `Huntsman → Ranger → Big Game Hunter → Trophy Hunter → Elite Hunter`.

Isso é, literalmente, **uma dungeon instanciada descrita em texto**: tema, população, objetivo de contagem, boss e recompensa de meta-progressão.

### 3.3 O tiering do Bestiary

O Bestiary classifica cada criatura em 5 estrelas de dificuldade, com custo de conclusão e recompensa em degraus fixos (dados observados no Canary):

| Estrelas | Kills p/ completar | Charm Points | Exemplos |
|---:|---:|---:|---|
| 1 | 250 | 5 | Rat |
| 2 | 500 | 15 | Minotaur, Cyclops, Rotworm |
| 3 | 1.000 | 25 | Dragon, Wyrm, Hydra, Werewolf, Giant Spider |
| 4 | 2.500 | 50 | Demon, Ghastly Dragon, Falcon Knight |
| 5 | 5.000 | 100 | Many Faces |

A wiki também documenta um tier inferior ("Harmless", com desbloqueios em 5/10/25 kills e 1 charm point) para criaturas triviais.

O desbloqueio é **incremental dentro de cada entrada** (primeiro kill revela nome/sprite; marcos parciais revelam HP, loot, resistências; completar concede os charm points). Charms são então **gastos** e **atribuídos por criatura**, criando um jogo de alocação.

**Por que isso é ouro para o Huntbound:**
- É metaprogressão que **reaproveita todo o conteúdo antigo** sem precisar de mapa novo.
- É legível: um número e uma barra.
- Tem **custo em degraus**, não linear — perfeito para casar com faixas de dungeon.
- Charms são *escolha*, não só poder acumulado — o jogador decide contra o que se especializa.

### 3.4 Os seis eixos que realmente mudam com a progressão

Ao comparar hunts de níveis diferentes, a dificuldade não escala em um eixo só. Escala em seis, e em ordens diferentes:

| # | Eixo | Early (1–40) | Mid (40–130) | Late (130+) |
|---|---|---|---|---|
| 1 | **Letalidade por hit** | Dano baixo e previsível; morrer exige desatenção longa | Picos de dano começam a matar em 3–4 hits | Burst pode matar em 1–2 hits sem mitigação correta |
| 2 | **Tipo de dano / elemento** | Quase tudo é físico | Fogo, gelo, energia, terra aparecem como identidade de hunt | Morte/santo, combinações, drenos, condições; resistência vira requisito de build |
| 3 | **Densidade e pack size** | 1–3 inimigos por encontro | 3–6, com respawn rápido em rotas circulares | 6–15+; a hunt *é* o pack; AoE deixa de ser opcional |
| 4 | **Custo de suprimento** | Quase zero | Potions viram parte real do custo; hunt pode dar prejuízo | Suprimento domina a decisão; "waste" é métrica central |
| 5 | **Complexidade de rota** | Cavernas lineares curtas | Rotas circulares para acompanhar respawn | Multi-andar, gargalos, salas de escape, posicionamento obrigatório |
| 6 | **Gating de acesso** | Nenhum | Quests médias, acesso a cidade, viagem | Quests longas, tarefas diárias acumuladas, times de 4 vocações |

**Recomendação antecipada:** o Huntbound deve escalar agressivamente os eixos **2, 3 e 5** (elemento, densidade, layout), moderadamente o **1** (letalidade), e **substituir** os eixos **4** (suprimento) e **6** (gating) — ver §11 e §12.

### 3.5 O que *não* muda — e é justamente o problema

Um ponto crítico e pouco discutido: **o verbo do jogador é idêntico no level 20 e no level 800**. Andar, targetar, atacar, lootear, repetir. O Tibia mitiga isso com camadas paralelas (§10), não com evolução de mecânica.

Para o Huntbound, cujo helper executa a repetição por design, isso significa: **a variação precisa vir de fora do combate**. Se o combate é automatizado, a progressão precisa oferecer decisões novas em outro lugar (build, rota, mutator, alocação de charms, risco/recompensa) — senão o conteúdo tardio é literalmente idêntico ao inicial com números maiores.

---

## 4. Tabela mestre de faixas de level

Consolidação de Tibia (referência) → Huntbound (proposta). **Os levels do Huntbound são propostos, não derivados** — a coluna existe para mostrar a compressão sugerida.

| Tier | Level Tibia (ref.) | Level Huntbound (proposta) | Nome de trabalho | HP típico do inimigo | Ameaça dominante | Loot dominante | Duração-alvo da dungeon |
|---|---|---|---|---:|---|---|---|
| **T0** | 1–8 | 1–5 | Iniciação | 20–50 | Nenhuma real | Nada / tutorial | 2–4 min |
| **T1** | 8–20 | 5–12 | Fundamentos | 50–120 | Pack pequeno | Vendor trash, primeira arma | 4–6 min |
| **T2** | 20–35 | 12–22 | Primeira hunt | 65–200 | Densidade + veneno | Trash por peso, primeiro set | 6–8 min |
| **T3** | 35–55 | 22–34 | Consolidação | 150–300 | Elites dentro do pack, casters | Materiais, set completo da faixa | 8–10 min |
| **T4** | 55–85 | 34–48 | Transição | 300–1.500 | Ameaça isolada letal; elemento | Creature products (insumo de sistema) | 8–12 min |
| **T5** | 85–130 | 48–64 | Especialização | 1.300–2.700 | Pack rápido + dano elemental | Equipamento de tier, tokens | 10–14 min |
| **T6** | 130–250 | 64–80 | Alto nível | 2.500–5.000 | Multi-alvo, condições, invocação | Equipamento raro, materiais de upgrade | 12–15 min |
| **T7** | 250–400 | 80–95 | Elite | 5.000–10.000 | Swarm massivo + armor alta | Tokens de endgame, chance de BiS | 12–18 min |
| **T8** | 400+ | 95–100+ | Endgame | 10.000+ | Tudo simultaneamente | Relics / BiS / cosméticos | 15–20 min |

**Observações sobre a compressão:**

- Tibia usa ~1.000 levels; o Huntbound não precisa de mais que ~100 no primeiro ciclo. A sensação de "escada infinita" pode vir de **progressão horizontal** (charms, runas, sets por faixa) em vez de level.
- A duração-alvo cresce **pouco** (2 → 20 min). Isso é intencional: sessão diária de 15–30 min significa que uma dungeon de endgame precisa caber em uma sessão sozinha.
- Cada tier deve ter **2–3 dungeons**, não mais. ~20 dungeons totais cobrem T0–T8 com folga.

---

## 5. Faixas detalhadas: hunts, gameplay, dungeon, drops e riscos

### T0 — Iniciação (Tibia ~1–8)

**Hunts/criaturas de referência:** Rats, Cave Rats, esgotos de cidade, Rookgaard/Dawnport. Bugs, Wasps.

**Características de gameplay:** inimigo isolado, sem burst, sem elemento. O objetivo real é aprender o verbo: mover em grid, clicar/targetar, lootear. Não existe decisão.

**Potencial para dungeon:** ⭐⭐ — **como tutorial apenas.** Uma dungeon T0 não é conteúdo, é onboarding. Não deve ser repetível como farm.

**Drops/objetivos:** nada de valor. Objetivo é ensinar loot e o helper.

**Riscos:** o maior risco do T0 é *durar demais*. Tibia mantém o jogador em Rookgaard por horas; nós não podemos. **T0 deve durar 5–10 minutos de jogo total.**

---

### T1 — Fundamentos (Tibia ~8–20)

**Hunts/criaturas de referência:** Trolls (Swamp Troll Cave – Venore, Port Hope Swamp Trolls), Goblins, Yalahar Elves, Cobra Cave – Ankrahmun, Larvas, Cemetery Quarter – Yalahar, Mistrock Cyclops.

**Características de gameplay:** primeira aparição de **pack pequeno** (2–4). Primeiro inimigo ranged (elfos, goblin scavenger). O jogador aprende que posição importa — não ficar cercado, usar corredor. Ainda não há custo de suprimento relevante.

**Potencial para dungeon:** ⭐⭐⭐⭐ — excelente. Caverna de trolls é literalmente uma dungeon: entrada estreita, 3–4 câmaras, população homogênea. É o formato mais fácil de instanciar bem.

**Drops/objetivos:** primeiras armas/armaduras utilizáveis, materiais baratos. **Objetivo real: dar ao jogador o primeiro upgrade perceptível.**

**Riscos:** conteúdo T1 é o mais fácil de fazer e o mais fácil de fazer *sem graça*. Se T1 for só "matar 20 trolls", o jogador desiste antes do T3.

---

### T2 — Primeira hunt de verdade (Tibia ~20–35)

**Hunts/criaturas de referência:** **Rotworm Cave** (o marco cultural do "primeiro grind"), Carrion Worms, **Mintwallin Minotaurs**, Minotaur camps, Amazon Camp – Venore, Nomad Cave, Tarantula Cave – Tiquanda, Darashia Pyramid, Stonerefiner Cave, Krimhorn Barbarian Camp.

**Características de gameplay:** primeira hunt com **respawn suficiente para "rodar"** — o jogador aprende a fazer rota circular em vez de limpar e sair. Aparecem **elites dentro da raça** (Minotaur Guard, Minotaur Mage) que quebram a monotonia do pack. Aparece **veneno** (tarântulas) como primeira condição.

**Potencial para dungeon:** ⭐⭐⭐⭐⭐ — **o melhor da lista.** Minotauros e rotworms são o exemplo canônico de "raça + variantes + elite + tema visual coeso". Uma dungeon de minotauros com Minotaur → Archer → Guard → Mage → boss Minotaur é um tutorial completo de arquétipos de inimigo.

**Drops/objetivos:** vendor trash com peso (o jogador aprende gestão de capacidade), primeiro set coerente, primeiros materiais de crafting.

**Riscos:** em Tibia esta é a faixa onde mais gente morre por excesso de confiança. Traduzido para nós: **é aqui que o helper precisa provar que funciona**. Se o helper falha no T2, o jogador nunca confia nele depois.

---

### T3 — Consolidação (Tibia ~35–55)

**Hunts/criaturas de referência:** **Cyclops Camp / Cyclopolis** (Thais), **Dwarf Mines / Kazordoon** (Dwarf Soldier, Dwarf Guard), Orc Fortress – Ulderek's Rock, Scarabs & Ancient Scarabs – Ankrahmun, Forest Fury Camp, Northport Pirates, Stone Golems, Ghostlands/Drefia (necromancers).

**Características de gameplay:** primeiro conteúdo com **armor alta** (Stone Golem 30) — o jogador descobre que dano bruto não basta. Primeiros **casters relevantes** que precisam ser priorizados. Layout de mina/fortaleza introduz **múltiplos andares e gargalos**.

**Potencial para dungeon:** ⭐⭐⭐⭐⭐ — Cyclopolis e as minas de anões são desenhos de dungeon *já prontos*. Fortaleza órquica dá o arquétipo "assalto a base": pátio → muralha → salão → chefe.

**Drops/objetivos:** primeiro equipamento que o jogador *quer* em vez de aceitar. Materiais específicos de faixa. Início da ideia de "set da faixa T3".

**Riscos:** é a faixa onde Tibia começa a exigir suprimento. Se o Huntbound importar economia de poção aqui, cria fricção exatamente onde o jogador está decidindo se continua.

---

### T4 — Transição (Tibia ~55–85)

**Hunts/criaturas de referência:** **Darashia Dragon Lair** e **Mount Sternum Dragon Cave** (o marco emocional de Tibia), Giant Spider Cave – Port Hope, **Edron Hero Cave**, Upper Spike – Kazordoon, Werehyaenas – Darashia, Alchemist Quarter (Mutated Humans) – Yalahar, Krailos Steppe, Bonebeasts, Wyverns, Ice Golems, Quara Scouts.

**Características de gameplay:** primeira **ameaça isolada genuinamente letal** — um Dragon ou um Giant Spider mata um jogador despreparado sozinho. Elemento vira identidade (fogo do dragão, gelo do ice golem, veneno da aranha). Aparece a noção de "hunt que exige preparo específico".

**Potencial para dungeon:** ⭐⭐⭐⭐⭐ — Dragon Lair é a dungeon arquetípica do gênero inteiro. Caverna → ponte → ninho → dragão. Hero Cave é o arquétipo "poucos inimigos, muito perigosos".

**Drops/objetivos:** aqui o loot muda de natureza — deixa de ser trash e vira **insumo de sistema** (produtos de criatura para imbuements no Tibia). No Huntbound: materiais de runa, materiais de upgrade de equipamento.

**Riscos:** Tibia usa esta faixa como filtro de vocação (dragões favorecem alguns kits). Precisamos garantir que **as 5 classes tenham caminho viável em cada tier** — em Tibia o Knight passa anos com opções piores, e isso é frustração pura.

---

### T5 — Especialização (Tibia ~85–130)

**Hunts/criaturas de referência:** **Edron Werecreatures** (a hunt "de ouro" da faixa segundo os guias), **Frost Dragons** – Svargrond, **Wyrms** – Drefia/Darashia, **Banuta** – Port Hope, **Lizard City** – Zao, Upper Spike, Nightmares, Hellspawns, Stampors, Mutated Bats.

**Características de gameplay:** **pack rápido** — lobisomens e wyrms se movem e alcançam. Dano à distância elemental torna o kite relevante. Aqui a comunidade considera que a hunt "boa" é a que tem **respawn denso em circuito**, não a que tem monstro mais forte.

**Potencial para dungeon:** ⭐⭐⭐⭐⭐ — Banuta (templo em andares com apes e medusas) e Vengoth/werecreatures são desenhos verticais excelentes: andar por andar com aumento de perigo.

**Drops/objetivos:** equipamento de tier real, tokens, materiais que alimentam sistemas de upgrade. Primeiro momento em que o jogador farma **um item específico**, não "loot".

**Riscos:** é onde Tibia começa a exigir imbuements (custo alto, duração de 20h de uso ativo) — ou seja, **um sistema de manutenção**. Manutenção é veneno para sessões de 20 minutos. Ver §11.

---

### T6 — Alto nível (Tibia ~130–250)

**Hunts/criaturas de referência:** **Asura Palace** – Port Hope, **Carnivora** – Port Hope, **Ghastly Dragons** / **Draken Walls** – Zao, Nightmare Isles, Glooth Bandits – Rathleton, Summer/Winter Court – Feyrist, Hydras, Serpent Spawns, Behemoths, Medusae, Undead Dragons, Demons.

**Características de gameplay:** multi-alvo obrigatório. Condições (dreno de mana, paralisia, veneno pesado). Invocações. O combate deixa de ser "matar em ordem" e vira "controlar a sala". Rotas complexas com salas de escape.

**Potencial para dungeon:** ⭐⭐⭐⭐ — ótimo tema (palácio, floresta carnívora, muralha de drakens), mas exige mais trabalho de encontro. Draken Walls é explicitamente conteúdo de time em Tibia; como dungeon single-player precisa ser redesenhado.

**Drops/objetivos:** equipamento raro, materiais de upgrade de alto tier, entrada em coleções.

**Riscos:** **o pico da dependência de MMO.** Muitas dessas hunts pressupõem time de 4 vocações, exp share e economia de suprimento. Ver §11.

---

### T7 — Elite (Tibia ~250–400)

**Hunts/criaturas de referência:** **Falcon Bastion** – Edron, **Cobra Bastion** – Ankrahmun, **Secret Library** – Edron, **Roshamuul Prison**, **Oramond Minos**, Demon Forge, Buried Cathedral, Flimsy Lost Souls, Claustrophobic Inferno, Ferumbras Tower, Crazed Winter Elves, Pirats/The Wreckoning.

**Características de gameplay:** **swarm massivo** (Lost Souls, Guzzlemaws) combinado com armor muito alta (Falcon Knight 86, Burning Gladiator 89). A hunt vira um exercício de sustentar AoE contínuo sem morrer. Rotas fechadas, sem saída fácil.

**Potencial para dungeon:** ⭐⭐⭐⭐⭐ **para o formato "onda/arena"**, ⭐⭐ para o formato "exploração". Falcon Bastion e Secret Library são fortalezas com salas fechadas — encaixe perfeito para **dungeon de salas seladas** ou para o modo Rift/Fenda com waves.

**Drops/objetivos:** tokens de endgame, chance real de BiS, materiais de relic.

**Riscos:** em Tibia é conteúdo de time por definição. Também é onde o gating por quest/tarefa fica mais pesado.

---

### T8 — Endgame (Tibia ~400+)

**Hunts/criaturas de referência:** **Soul War / Zarganash**, Warzones (Gnomebase), Ferumbras' Ascendant, Issavi Sewers solo EK, Podzilla, Iskupan/Mitmah, Norcferatu, Infernatil.

**Características de gameplay:** tudo simultaneamente — HP altíssimo, armor extrema, swarm, condições, invocação, mecânicas específicas de área. Frequentemente exige build otimizada e não apenas level.

**Potencial para dungeon:** ⭐⭐⭐ como dungeon; ⭐⭐⭐⭐⭐ como **conteúdo de desafio com modificadores** (torre, boss rush, rift). É aqui que o Huntbound deve usar formatos próprios em vez de imitar.

**Drops/objetivos:** relics, BiS, cosméticos, prestígio.

**Riscos:** conteúdo de topo do Tibia é o mais caro de produzir e o menos transferível. **Não deve ser alvo do MVP.**

---

## 6. Hunts icônicas — o que um jogador de Tibia reconhece na hora

Ranking por **valor de reconhecimento**, não por eficiência. Estas são as hunts cuja simples menção evoca uma imagem específica:

| # | Hunt | Faixa | Por que é icônica | Vale reinterpretar? |
|---|---|---|---|---|
| 1 | **Rotworm Cave** | T2 | O primeiro grind real de quase todo jogador. Sinônimo de "comecei a jogar de verdade". | **Sim, obrigatório** |
| 2 | **Minotauros (Mintwallin / Mino Hell)** | T2 | Primeira raça com hierarquia visível (soldado/arqueiro/guarda/mago). | **Sim, obrigatório** |
| 3 | **Dragon Lair (Darashia / Mount Sternum)** | T4 | O momento "eu matei um dragão". Marco emocional. | **Sim, obrigatório** |
| 4 | **Cyclopolis** | T3 | Cidade-caverna de ciclopes; identidade visual forte. | Sim |
| 5 | **Dwarf Mines (Kazordoon)** | T3 | Mina em múltiplos andares; sensação de descida. | Sim |
| 6 | **Giant Spider Cave** | T4 | Medo. Aranha isolada que mata. | Sim |
| 7 | **Hero Cave (Edron)** | T4 | "Poucos inimigos, muita exp, muito risco." | Sim |
| 8 | **Demon Helmet / Pits of Inferno** | T6+ | Demônios como topo clássico do jogo. | Sim, como boss/desafio |
| 9 | **Banuta** | T5 | Templo vertical na selva; apes e medusas. | Sim |
| 10 | **Asura Palace** | T6 | Estética distinta (palácio); hunt "premium" da comunidade. | Sim |
| 11 | **Ghostlands / Drefia** | T3–T5 | Undead, necromancia, atmosfera. | Sim |
| 12 | **Roshamuul** | T7 | Densidade opressiva; "inferno" moderno. | Como rift/wave |
| 13 | **Falcon Bastion** | T7 | Fortaleza militar; inimigos humanoides de elite. | Como dungeon de salas |
| 14 | **Secret Library** | T7 | Puzzle temático + seções elementais. | Como dungeon modular |
| 15 | **Soul War / Zarganash** | T8 | Endgame contemporâneo. | Só como referência |

**Padrão observável:** as hunts icônicas quase sempre têm (a) **uma raça dominante**, (b) **um bioma/arquitetura reconhecível**, (c) **uma variante elite dentro da raça** e (d) **um boss ou item associado**. Esses quatro elementos são o *checklist* de uma dungeon do Huntbound.

---

## 7. Como difficulty, densidade, loot e risco mudam (síntese)

### 7.1 Dificuldade
Sobe por **acúmulo de mecânicas**, não por HP. Ordem de introdução observada: pack → ranged → caster → veneno/condição → armor alta → elemento → multi-alvo → invocação → dreno → swarm.
→ **Essa ordem é diretamente reutilizável como currículo de design de inimigos.**

### 7.2 Densidade
Sobe do início ao fim e é o principal determinante de "hunt boa" no mid/late. Em Tibia é limitada por respawn compartilhado; guias recomendam explicitamente **rota circular** para não esperar respawn, e **corredor estreito** para limitar quantos inimigos batem simultaneamente.
→ Numa dungeon instanciada, densidade vira uma **variável de design pura**. Isso é uma vantagem enorme nossa.

### 7.3 Loot
Três regimes:
1. **Vendor trash por peso** (T0–T3): valor = ouro/capacidade. Ensina gestão.
2. **Creature products como insumo** (T4–T6): o loot alimenta sistemas (imbuement, crafting). Valor = acesso a poder, não a ouro.
3. **Equipamento e tokens de tier** (T6–T8): loot direcionado, farm de item específico, chance de BiS.

Sobreposto a tudo: **loot invisível** (progresso de bestiary, contagem de task, charm points). Esse é o loot que mantém o jogador atravessando conteúdo velho.

### 7.4 Risco
Em Tibia o risco é **externo ao encontro**: perda de ~10% de experiência ao morrer (mitigada por blessings, que reduzem a perda substancialmente), risco de perder equipamento, custo de suprimento consumido, tempo de viagem perdido. Nada disso vem do combate em si.

→ **Consequência para o Huntbound:** sem mundo persistente, esses custos não existem. Se não criarmos um substituto, **não existe risco nenhum** e a dungeon vira formalidade. Ver §12, recomendação R7.

---

## 8. Potencial de dungeon: matriz de conversão

### 8.1 Critérios de avaliação

Uma hunt de Tibia converte bem em dungeon instanciada curta quando pontua alto em:

| Critério | Pergunta |
|---|---|
| **Coesão temática** | A hunt tem uma raça e um bioma dominantes? |
| **Hierarquia interna** | Existem variantes (base/elite/caster) da mesma raça? |
| **Compressibilidade de layout** | Dá para representar o lugar em 4–6 salas? |
| **Boss natural** | Já existe um boss/rare associado ao tema? |
| **Loot temático** | Existe um item que "é daquele lugar"? |
| **Autonomia** | Funciona solo, sem time de vocações? |

### 8.2 Melhores candidatos

| Hunt | Tier | Coesão | Hierarquia | Layout | Boss | Loot | Solo | **Veredito** |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Troll Cave | T1 | ✔ | ~ | ✔ | ✔ | ~ | ✔ | **Dungeon de estreia ideal** |
| Rotworm Cave | T2 | ✔ | ✔ | ✔ | ~ | ~ | ✔ | **Obrigatória** |
| Minotaur Camp / Mino Hell | T2 | ✔ | ✔✔ | ✔ | ✔ | ✔ | ✔ | **A melhor conversão de todas** |
| Amazon Camp | T2 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Excelente (tema ranged) |
| Cyclopolis | T3 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **Excelente** |
| Dwarf Mines | T3 | ✔ | ✔ | ✔✔ | ✔ | ✔ | ✔ | **Excelente (multi-andar)** |
| Orc Fortress | T3 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Excelente (assalto a base) |
| Ghostlands / Drefia | T3–5 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Excelente (undead) |
| Dragon Lair | T4 | ✔ | ~ | ✔ | ✔✔ | ✔✔ | ✔ | **Obrigatória** |
| Giant Spider Cave | T4 | ✔ | ~ | ✔ | ✔ | ✔ | ✔ | Muito boa |
| Hero Cave | T4 | ✔ | ~ | ✔ | ~ | ✔ | ✔ | Boa (formato "poucos e letais") |
| Banuta | T5 | ✔ | ✔ | ✔✔ | ✔ | ✔ | ✔ | **Muito boa (vertical)** |
| Werecreatures / Vengoth | T5 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Muito boa |
| Frost Dragon Lair | T5 | ✔ | ~ | ✔ | ✔ | ✔ | ✔ | Boa (variação elemental do T4) |
| Asura Palace | T6 | ✔ | ✔ | ✔ | ✔ | ✔ | ~ | Boa, exige redesenho |
| Falcon Bastion | T7 | ✔ | ✔ | ✔ | ✔ | ✔ | ✗ | Boa **como salas seladas** |
| Secret Library | T7 | ✔ | ✔ | ✔✔ | ✔ | ✔ | ✗ | Boa **como dungeon modular** |
| Roshamuul | T7 | ✔ | ~ | ~ | ✔ | ✔ | ✗ | Melhor como **rift/waves** |

### 8.3 Estrutura de dungeon proposta (formato canônico)

Derivada diretamente do padrão de task do Tibia (raça + contagem + mini-boss):

```
[Entrada]
   ↓
Sala 1 — Introdução da raça (unidades base, densidade baixa)
   ↓
Sala 2 — Densidade (o "corredor de rotworm": muitos, fracos)
   ↓
Sala 3 — Variante (arqueiro/caster; força priorização)
   ↓
Sala 4 — Elite + escolha (rota A: mais risco/mais loot | rota B: seguro)
   ↓
Sala 5 — Pressão (pack misto; teste real da build)
   ↓
[Boss] — Elite temático da raça
   ↓
[Recompensa] — loot + progresso de bestiary + progresso de task
```

**Três durações:**

| Formato | Salas | Duração | Uso |
|---|---|---|---|
| **Curto** | 3 + boss | 4–6 min | Diária rápida, farm de material específico |
| **Padrão** | 5 + boss | 8–12 min | Conteúdo principal |
| **Longo** | 8–10 + boss + mini-boss | 15–20 min | Semanal, sincronizado, endgame |

---

## 9. Drops e objetivos: taxonomia transferível

| Categoria | Exemplo Tibia | Função de design | Recomendação Huntbound |
|---|---|---|---|
| **Vendor trash** | Peles, ossos, dentes | Ensina capacidade/economia; renda base | **Manter, simplificado.** Sem gestão de peso complexa |
| **Creature products** | Materiais de imbuement | Liga hunt a sistema de poder | **Manter — é o melhor gancho.** Cada dungeon fornece 1–2 materiais exclusivos |
| **Equipamento de faixa** | Sets por tier | Objetivo direto de farm | **Manter**, casado com o modo sincronizado |
| **Item raro/assinatura** | Item icônico de uma criatura | Cria história pessoal ("finalmente dropou") | **Manter, com proteção contra azar** (pity/token) |
| **Progresso invisível** | Bestiary, charm points, task counter | Faz conteúdo velho continuar valendo | **Manter — prioridade máxima** |
| **Moeda de tarefa** | Pontos de rank de task, HTP do prey | Meta de médio prazo, resgatável por escolha | **Manter, consolidado em 1–2 moedas** |
| **Cosmético** | Outfits/mounts do prey task | Meta longa sem inflação de poder | Manter como sink de longo prazo |

**Princípio a extrair:** em Tibia, **uma mesma kill alimenta 4–6 contadores diferentes** (exp, loot, bestiary, task, prey, imbuement material). Isso é o que faz repetir parecer produtivo. É barato de implementar e é a alavanca de retenção mais eficiente do jogo.

---

## 10. Como evitar que a progressão fique repetitiva

Tibia resolve isso com **camadas paralelas sobre o mesmo mapa**. Adaptação recomendada, em ordem de custo/benefício:

| # | Alavanca | Como Tibia faz | Adaptação Huntbound | Custo |
|---|---|---|---|---|
| 1 | **Múltiplos contadores por kill** | Exp + loot + bestiary + task + prey + material | Toda kill alimenta ≥3 contadores | **Muito baixo** |
| 2 | **Rotação de foco** | Boosted creature/boss do dia; prey de 2h | Dungeon/criatura em destaque diária com bônus | **Baixo** |
| 3 | **Objetivos de contagem com boss** | Task: N kills → libera mini-boss | Task de dungeon libera variante de boss | **Baixo** |
| 4 | **Especialização por alocação** | Charms atribuídos por criatura | Charms/runas alocáveis por família de inimigo | **Médio** |
| 5 | **Modificadores de encontro** | (Tibia quase não usa) | **Mutators por dungeon** — nossa maior oportunidade | **Médio** |
| 6 | **Relevância retroativa** | Bestiary exige voltar a criaturas antigas | Modo sincronizado + coleções por tier | **Médio** |
| 7 | **Variação de layout** | Mapa fixo (fraqueza do Tibia) | 2–3 layouts por dungeon, sorteados | **Alto** |
| 8 | **Escolha dentro da run** | (Não existe em Tibia) | Rotas, cartas, sigils — vindo do Rift | **Alto** |

**Recomendação de prioridade:** implementar 1, 2 e 3 no MVP. São baratos e resolvem a maior parte do problema. As alavancas 5 e 8 são a diferenciação real do Huntbound, mas vêm depois.

**Antipadrão do Tibia a evitar:** o jogo depende fortemente de **quantidade de mapa** para variedade. Nós não temos esse orçamento. Nossa variedade tem que vir de **modificadores e camadas**, não de metros quadrados.

---

## 11. Hunts e mecânicas que dependem demais do MMORPG

Estas são as partes que **não devem ser importadas**, com o motivo:

| Mecânica / hunt | Por que existe em Tibia | Por que é ruim para nós |
|---|---|---|
| **Disputa de spawn / respawn compartilhado** | Mundo persistente com centenas de jogadores; respawn ajustado à população | Em instância, densidade é 100% controlada. Não há nada a copiar — só a *sensação* de rota circular |
| **Hunts de time de 4 vocações** (Draken Walls, Falcon Bastion, Soul War, Claustrophobic Inferno) | Design social; exp share | Single-player. Precisam de redesenho completo, não adaptação |
| **Gating por dezenas de tarefas diárias** (acesso pleno a Oramond) | Retenção de longo prazo em MMO | Bloqueia conteúdo por calendário. Anti-tese de "sessão curta" |
| **Economia de suprimento dependente de mercado entre jogadores** | Potions/runas compradas de outros jogadores; "waste" como métrica | Sem economia entre jogadores, vira um imposto arbitrário. Manter apenas como *custo de run*, não como economia |
| **Imbuements com duração em horas de uso** | Sink de ouro contínuo em MMO | **Manutenção** = fricção diária. Se importarmos, deve ser permanente ou por-run, nunca por horas de relógio |
| **Death penalty com perda de exp e equipamento** | Peso e tensão em mundo persistente | Em run instanciada, perder progresso de conta por uma falha de helper é frustração pura |
| **Blessings** | Mitigação comprável do death penalty | Só faz sentido se o death penalty existir. Cai junto |
| **Cooldown de boss de ~20h por personagem** | Controle de inflação de itens em MMO | Substituível por limites semanais de recompensa, que são mais legíveis |
| **Logística de viagem, depot, casa, capacidade** | Mundo aberto | Puro atrito. Hub + inventário simples resolve |
| **Rashid / arbitragem de NPC por dia da semana** | Sabor de MMO | Complexidade sem retorno |
| **PvP, guildas, exp share, party** | Social | Fora de escopo declarado |
| **Quests longas de desbloqueio de área** | Conteúdo de MMO | Podem virar dungeons de introdução curtas, não pré-requisitos de horas |

**Hunts especificamente ruins para conversão direta:**
- **Soul War / Zarganash** — desenhada para squads, com mecânica de área complexa.
- **Draken Walls** — team-only por design.
- **Roshamuul Prison** — densidade opressiva que só funciona com múltiplos jogadores; melhor reinterpretada como *rift*.
- **Warzones (Gnomebase)** — depende de sistema de tarefas gnômicas e de acesso escalonado.
- **Oramond** — o melhor lucro do jogo, mas atrás do gate diário mais pesado.
- **Ferumbras' Ascendant** — conteúdo de acesso complexo e altamente específico.

---

## 12. Recomendações para o Huntbound

### R1 — Adotar 8 tiers comprimidos, não a escala do Tibia
Usar a tabela da §4. Level cap inicial baixo (sugestão: 60 no MVP, 100 no primeiro ciclo completo). A sensação de escada infinita deve vir de **progressão horizontal** (charms, runas, sets por faixa), não de números de level.

### R2 — Formato canônico de dungeon = "raça + variantes + elite + boss"
É o padrão que o Tibia já usa no sistema de tasks e é o que a memória do jogador reconhece. **Toda dungeon deve declarar uma raça dominante e um bioma.** Nada de dungeons genéricas com mistura de temas.

### R3 — Orçamento de conteúdo: ~20 dungeons, 3 layouts cada
2–3 dungeons por tier. Cada dungeon com 2–3 layouts sorteáveis e um conjunto de mutators. Isso multiplica variedade percebida sem multiplicar produção de arte.

### R4 — Currículo de inimigos na ordem do Tibia
Introduzir mecânicas nesta sequência ao longo dos tiers: **pack → ranged → caster → condição (veneno) → armor alta → elemento → multi-alvo → invocação → dreno → swarm.** Não pular etapas; cada tier introduz no máximo 2 novidades.

### R5 — Toda kill alimenta pelo menos três contadores
Experiência, loot e **progresso invisível** (bestiary/task/material). Essa é a implementação mais barata e de maior retorno do documento inteiro.

### R6 — Copiar o Bestiary quase inteiro
Tiers de dificuldade em estrelas, custos em degraus, desbloqueio incremental de informação, charm points **alocáveis por família**. Ajustar as contagens para baixo drasticamente (Tibia pede 250–5.000 kills; nós devemos pedir ordens de grandeza menos, compatível com 15–30 min/dia).

### R7 — Substituir o risco de morte, não portá-lo
Sem perda de exp de conta e sem perda de equipamento. Em vez disso, o risco vive **dentro da run**:
- falhar consome a energia/resina gasta (ou parte dela);
- recompensas escalonadas por profundidade/tempo alcançado;
- modos de alto risco opcionais (mutators que aumentam recompensa e removem retentativas).

### R8 — Densidade é a nossa alavanca principal de dificuldade
Como controlamos a instância, escalar densidade é grátis e é exatamente o que a comunidade de Tibia considera "hunt boa". Usar densidade + composição de pack como o eixo primário de dificuldade entre tiers, com HP/dano em segundo plano.

### R9 — Materiais de sistema em vez de vendor trash a partir do T4
Cada dungeon deve fornecer 1–2 materiais que só ela fornece bem, alimentando runas/upgrades. É o que dá **razão para escolher uma dungeon**, não só para fazer "a mais eficiente".

### R10 — Rotação diária de destaque desde o MVP
Um "boosted" diário (dungeon ou família de criatura) com bônus de recompensa. Custo de implementação trivial; efeito enorme sobre percepção de rotina e sobre uso de conteúdo antigo. Casa perfeitamente com o modo sincronizado.

### R11 — Garantir viabilidade das 5 classes em todos os tiers
Tibia falha nisso historicamente (faixas inteiras em que uma vocação tem opções ruins). Cada tier deve ter pelo menos uma dungeon confortável para cada arquétipo: tanque/melee (Knight), ranged sustentado (Paladin), burst AoE (Sorcerer), sustain/controle (Druid), mobilidade/single-target (Monk).

### R12 — Não importar manutenção com relógio
Imbuements de 20h de uso ativo são um sistema de manutenção. Se adotarmos algo equivalente, deve ser **permanente** (upgrade), **por run** (consumível de preparação) ou **por faixa**, nunca com timer que penaliza quem joga pouco.

---

## 13. Lista do que **NÃO** vale copiar

1. **A escala de level do Tibia** (~1.000 níveis) — cria progressão sem forma.
2. **Death penalty com perda de experiência e equipamento** — sem mundo persistente, é só punição.
3. **Blessings** — só existem para mitigar o item 2.
4. **Economia de suprimento entre jogadores** e a métrica de "waste".
5. **Imbuements com duração em horas de uso ativo** — manutenção incompatível com sessão curta.
6. **Gating por dezenas de tarefas diárias acumuladas** (modelo Oramond).
7. **Hunts que exigem time de 4 vocações** como conteúdo obrigatório.
8. **Cooldowns de boss por personagem em horas** — usar limites semanais de recompensa.
9. **Disputa de spawn, respawn dependente de população, "reserva" de hunt.**
10. **Logística de mundo aberto**: viagem, depot, casa, gestão pesada de capacidade.
11. **Rookgaard/Dawnport longo** — o tutorial não pode custar horas.
12. **Dezenas de spells situacionais** e centenas de itens quase idênticos.
13. **Variedade obtida por metros quadrados de mapa** — não temos esse orçamento.
14. **Contagens de bestiary na escala do Tibia** (1.000–5.000 kills por entrada).
15. **Quests longas como pré-requisito de acesso a conteúdo de farm.**
16. **PvP, guildas, mercado, chat, party/exp share** — fora de escopo declarado.

---

## 14. Perguntas em aberto para a fase de síntese

1. **Qual o level cap do primeiro ciclo?** A compressão proposta (100) precisa ser validada contra a curva de energia/resina do W06/W09.
2. **Bestiary dá poder ou só coleção?** Charms alocáveis dão poder — isso interage com balanceamento do modo sincronizado (W04).
3. **Quantos mutators por dungeon são necessários** para que 20 dungeons não cansem em 3 meses? Precisa de estimativa junto ao W07.
4. **O modo sincronizado usa o tier da dungeon ou o level da dungeon?** Tiers discretos (T1–T8) são muito mais simples de balancear que sync contínuo. Recomendação preliminar: **tiers discretos**.
5. **Materiais são por dungeon ou por família de criatura?** Por família reaproveita melhor e reduz o número de materiais totais.
6. **Qual o substituto exato do risco de morte?** Precisa de decisão explícita antes do vertical slice — sem isso a dungeon não tem tensão.

---

## 15. Fontes

**Dados brutos (locais, leitura apenas):**
- `references/canary/data-otservbr-global/monster/**/*.lua` — HP, experiência, armor, metadados de bestiary (`toKill`, `Stars`, `charmsPoints`, `Locations`).
- `references/canary/data-otservbr-global/lib/quests/killing_in_the_name_of.lua` — bandas de level das tasks, raças por banda, mini-bosses, ranks e recompensas.
- `references/canary/data-otservbr-global/npc/grizzly_adams.lua`, `npc/raymond_striker.lua` — NPCs de task.

**Wiki e comunidade:**
- [TibiaWiki — Hunting Places](https://tibia.fandom.com/wiki/Hunting_Places)
- [TibiaWiki — Bestiary/Difficulties](https://tibia.fandom.com/wiki/Bestiary/Difficulties)
- [TibiaWiki — Bestiary/All](https://tibia.fandom.com/wiki/Bestiary/All)
- [TibiaWiki — Cyclopedia](https://tibia.fandom.com/wiki/Cyclopedia)
- [TibiaWiki — Prey System](https://tibia.fandom.com/wiki/Prey_System)
- [TibiaWiki — Killing in the Name of... Quest/Spoiler](https://tibia.fandom.com/wiki/Killing_in_the_Name_of..._Quest/Spoiler)
- [TibiaWiki — Death](https://tibia.fandom.com/wiki/Death)
- [TibiaWiki — Rotworm](https://tibia.fandom.com/wiki/Rotworm)
- [TibiaWiki — List of Creatures by Experience to Hit Points Ratio](https://tibia.fandom.com/wiki/List_of_Creatures_by_Experience_to_Hit_Points_Ratio)
- [TibiaWiki — 2024 Balancing Project](https://tibia.fandom.com/wiki/2024_Balancing_Project)
- [TibiaWiki — Talk:Hunting Places](https://tibia.fandom.com/wiki/Talk:Hunting_Places)

**Guias de hunt por level:**
- [TibiaVault — Best Tibia Hunting Spots Guide](https://tibiavault.com/hunting-spots/) *(tabela de 63 spots com faixa de level, vocação, solo/time, exp/h e lucro/h — principal fonte da §5)*
- [TibiaVault — Imbuing Guide](https://tibiavault.com/imbuing-guide/)
- [TibiaPal — Hunting Places](https://tibiapal.com/hunting) e [Bestiary Reference](https://tibiapal.com/bestiary)
- [TibiaRoute — Hunt Finder](https://tibiaroute.com/hunting-places)
- [TibiaBuddy — Hunt Finder](https://www.tibiabuddy.com/tools/hunt-finder) e [Imbuement Guide 2026](https://www.tibiabuddy.com/blog/imbuement-guide-2026)
- [Intibia — Hunt Finder](https://intibia.com/hunts)
- [TibiaBosses.pl — Low Level Hunting 1–50](https://tibiabosses.pl/article_4)

**Mecânicas de risco e economia:**
- [TibiaPlan — Death Penalty Guide](https://tibiaplan.com/guides/tibia-death-penalty/)
- [TibiaMobile — Death Penalties & Blessings Guide](https://tibiamobile.com/blog/tibia-death-blessings-guide/)
- [Tibia-MU Wiki — Blessings and Death Penalty](https://tibia-mu.com/wiki/blessings)
- [MMOKB — Tibia Imbuing Guide](https://mmokb.com/tibia-imbuing-guide/)
- [TibiaQA — Prey Hunting Tasks](https://www.tibiaqa.com/5760/what-do-you-think-about-prey-hunting-tasks), [Hunting spot lists](https://www.tibiaqa.com/904/where-find-list-with-hunt-places-with-level-vocation-and-experience-hour), [Solution for hunting spots](https://www.tibiaqa.com/4838/solution-for-hunting-spots-on-tibia)
- [OTLand — Grizzly Adams task list thread](https://otland.net/threads/grizzly-adams-killing-in-the-name-of-quest-all-tasks-more-real-tibia.159150/)
- [TibiaMaps.io — Charm Optimizer](https://tibiamaps.io/tools/charms)

**Nota de acesso:** durante esta pesquisa, requisições automatizadas ao TibiaWiki (Fandom) e ao TibiaWiki BR retornaram HTTP 402/403. O conteúdo dessas páginas foi obtido via busca indexada e triangulado com os dados do Canary. Onde houver necessidade de precisão numérica oficial, as páginas devem ser consultadas manualmente.
