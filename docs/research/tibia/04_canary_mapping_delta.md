# C01 — Mapeamento do Canary e Atualização do Baseline

> **Escopo:** Canary usado **apenas como referência** de regras, conteúdo e dados de Tibia.
> Alvo: **Kaezan Huntbound**, RPG single-player em Godot 4.7.1, top-down/tile-based. Não é MMORPG.
>
> **Nada foi implementado, modificado ou copiado.** Este documento é leitura + delta.
>
> - Repositório analisado: `references/canary` — `main` @ `157e6f9` (2026-08-06), pós-tag **v3.6.1**
> - Baseline lido: `C:\Kaezan\kaezan\mapping\baseline\canary\` (25 docs, ~600 KB, congelado em **2026-05-25** sobre **Canary 3.4.1**)
> - Data desta análise: 2026-08-09

---

## 1. Resumo do baseline existente

O baseline em `mapping/baseline/canary/` é um mapeamento **denso e de alta qualidade**, organizado em 4 eixos. Ele foi escrito para o projeto anterior (*Kaezan: World*, um MMORPG sobre Canary + OTClient), o que condiciona o enquadramento — mas o conteúdo técnico sobre Tibia continua aproveitável.

### 1.1 Inventário

| Eixo | Documentos | Conteúdo principal |
|---|---|---|
| `core/` | `engine.md` (29 KB), `lua_system.md` (14 KB), `network.md` (12 KB), `database.md`, `build.md` | Dispatcher, `Game`, DI, ciclo de boot, bindings Lua, hot-reload, handshake RSA/XTEA, schema SQL |
| `gameplay/` | `player.md` (83 KB), `creatures.md` (70 KB), `death.md` (37 KB), `combat.md` (36 KB), `quests.md` (32 KB), `skills.md` (31 KB), `spells.md` (22 KB) | Vocações, wheel, outfits, avatares, monstros, NPCs, summons, morte/bênçãos/stamina, fórmulas de dano, skills, quests |
| `systems/` | `instances.md` (53 KB), `progression.md` (45 KB), `social.md` (42 KB), `map.md` (23 KB), `pvp.md` (21 KB), `housing.md` (21 KB), `rewards.md` (20 KB), `economy.md` (19 KB), `events.md` (17 KB) | Zones, Tibiadrome/Soul Pit, bosstiary, prey, bestiary/charms, boss cooldowns, mapa/tiles/spawns, loot, market/forge/imbuements, raids |
| `meta/` | `lua_vs_cpp.md` (25 KB), `technical_debt.md`, `customization.md`, `kaezan_decisions.md` | Guia de decisão sobre onde implementar cada coisa |

### 1.2 O que o baseline já resolveu corretamente (não refazer)

Estes trechos foram **verificados contra o código atual e continuam válidos**:

- **Estrutura completa de um monstro `.lua`** — todos os campos, semântica de `flags`, `elements` (`percent=100` imune, negativo vulnerável), `immunities`, `strategiesTarget`, `attacks`/`defenses`. `baseline/gameplay/creatures.md` §15.2.
- **Pipeline de loot** — `Monster::dropLoot()` → `EventCallback_t::monsterOnDropLoot` → `MonsterType:generateLootRoll()` → `getLootRandom()`; chance em base 100000; ruído dinâmico ±5%. `baseline/systems/rewards.md` §17.1. **Confirmado literalmente** em `src/creatures/monsters/monster.cpp:3414` (só o número da linha mudou de 2507 → 3414).
- **Fórmulas de spell** — `levelFormula = level*2 + (magicLevel + specializedMagicLevel)*3`, e `normal_random(levelFormula*mina + minb, ...)`. `baseline/gameplay/spells.md` §32.4. **Confirmado** em `src/creatures/combat/combat.cpp:48` e `:92-96`.
- **Fórmula de skill** — `skillBase[skill] * pow(skillMultipliers[skill], level - 11)`. `baseline/gameplay/skills.md` §39.2. **Confirmado** em `src/creatures/players/vocations/vocation.cpp:275` (hoje escrito como `level - (minSkillLevel + 1)` com `minSkillLevel = 10` — matematicamente idêntico).
- **Estrutura de vocação (XML + C++)** — tabela atributo-a-atributo, incluindo `<formula>`, `<mitigation>`, `<pvp>`, `<skill>`, `<gem>`, e os 11 IDs de `Vocation_t` (incluindo Monk/Exalted Monk). `baseline/gameplay/player.md` §18.1.
- **Imbuements** — `data/XML/imbuements.xml`, 3 tiers (Basic/Intricate/Powerful), 20 categorias, tabela de tipos de efeito, decay de 1 s, regra "só o primeiro slot de dano elemental aplica". `baseline/systems/economy.md` §21.4. Inclui `vibrancy`/`paralysis deflection` e o atributo `scroll`.
- **Morte** — `getLostPercent()`, contagem de bênçãos, redução por charm Bless, perda de magic level por `manaSpent`. `baseline/gameplay/death.md` §40.1-40.2. **Confirmado** em `player.cpp:7220` e `:4039-4084`.
- **Formato `.otbm`, spawns e teleports** — `baseline/systems/map.md` §36.1-36.5.
- **Bestiary/Bosstiary/Charms/Prey** — `baseline/systems/progression.md` §19.2-19.4.
- **Sistema de NPC (npclib), diálogo keyword/response** — `baseline/gameplay/creatures.md` §35.
- **Guia Lua vs C++** — `baseline/meta/lua_vs_cpp.md`. Continua o melhor mapa de "o que é dado" vs "o que é engine".

---

## 2. Estado do Canary atual

| Item | Valor |
|---|---|
| Caminho | `references/canary` |
| Branch / commit | `main` @ `157e6f9e` — *"fix: Simon the Beggar's shovel has no price (#4066)"*, 2026-08-06 |
| Última tag | `v3.6.1` (baseline: `v3.4.1`, de 2026-02-17) |
| Commits desde `v3.4.1` | **158** |
| Fontes C++ | 486 arquivos `.cpp`/`.hpp` em `src/` |
| Datapacks | `data/` (662 arq.), `data-canary/` (107), `data-otservbr-global/` (4.756) |
| Conteúdo | 1.656 monstros, 94 bosses, 200 spells, 36 runas, 106 actions, 12 movements, 4 weapons, 17.108 itens |
| Mapa | `data-canary/world/canary.otbm` (19 MB, versionado); `otservbr.otbm` **não versionado** — baixado via `mapDownloadUrl` (`config.lua.dist:425`) |

**Health check estrutural:** dos 248 caminhos concretos citados pelo baseline, **200 ainda resolvem** no repositório atual. Dos 48 restantes, ~40 são exemplos didáticos fictícios do baseline (`meu_monstro.lua`, `minha_spell.lua`, `kaezan_boss.lua`) ou notação abreviada (`io_bosstiary.hpp/.cpp`). Apenas ~8 são movimentações reais, listadas em §3.4.

---

## 3. DELTA DESDE O BASELINE

### 3.1 Veredito geral

O delta `v3.4.1 → v3.6.1+` é **puramente aditivo em `src/`**: `git diff --diff-filter=D` e `--diff-filter=R` retornam **vazio**. Nenhum arquivo C++ foi removido ou renomeado. **O mapa arquitetural do baseline continua correto**; o que mudou foi *acréscimo* de módulos e uma reorganização de datapacks.

### 3.2 Módulos NOVOS em `src/` (43 arquivos)

#### A. Refatoração da IA de monstro — **o delta mais relevante para o Godot**

| Arquivo | O que faz |
|---|---|
| `src/creatures/monsters/monster_targeting.{hpp,cpp}` | `MonsterTargetRanker::rank()` — função **pura** que recebe `MonsterTargetRankingRequest{mode, origin, candidates[]}` e devolve o `creatureId` sugerido. Modos: `Nearest`, `Health`, `Damage` |
| `src/creatures/monsters/monster_pathfinding.{hpp,cpp}` | `MonsterPathfinder::find()` — A* puro sobre um snapshot imutável. `MonsterPathTraits` descreve o que a criatura pode atravessar (`fieldAllowed`, `canPushItems`, `canPushCreatures`, `canSeeInvisibility`, `canEnterProtectionZone`) |
| `src/creatures/monsters/monster_combat_intention.{hpp,cpp}` | `MonsterCombatIntentionEvaluator::evaluate()` — dado origem, alvo, `fleeing` e a geometria das spells (`range`, `melee`), devolve quais spells são **geometricamente elegíveis** |
| `src/creatures/monsters/monster_relevance.{hpp,cpp}` | `MonsterRelevancePolicy::update()` — classifica cada monstro em `Visible` ou `Background` a partir de `{playerSpectators, nearestPlayerDistance, engagedWithPlayer}`, com histerese (`visibleHold = 3 s`) |
| `src/map/navigation_snapshot.{hpp,cpp}` | `NavCell` / `NavSectorSnapshot` / `NavRegionSnapshot` — grid de navegação desacoplado do mapa vivo, versionado por `topologyRevision` + `occupancyRevision` |

**Por que importa:** no baseline (3.4.1), toda a decisão de IA vivia dentro de `Monster::` acoplada ao estado global do jogo. Agora a lógica está extraída em **funções puras sobre snapshots imutáveis**, com o estado mutável ficando só na borda. Isso é exatamente o desenho que se quer replicar em GDScript/C#.

`NavCellFlag` (bitmask de 12 flags) é uma abstração de tile pronta para copiar conceitualmente:

```
HasGround, ProtectionZone, FloorChange, Teleport, ImmovableBlockSolid,
ImmovableNoFieldBlockPath, BlockSolid, NoFieldBlockPath, HarmfulField,
WalkableSea, BlockProjectile, FloorChangeWest
```

E o custo de caminho (`monster_pathfinding.cpp:109`) é minimalista — vale a pena copiar a ideia, não o código:

```
custo = (tem criatura visível ? CREATURE_TILE_COST : 0)
      + (campo nocivo && a criatura o teme ? HARMFUL_FIELD_COST : 0)
```

#### B. Weapon Proficiency — **sistema novo, ausente do baseline**

Introduzido em `feat: protocol 15.11 (weapon proficiency and new imbuement scroll) (#3845)`.

- `src/creatures/players/components/weapon_proficiency.{hpp,cpp}` (1.498 linhas)
- `src/enums/weapon_proficiency.hpp`
- `data/items/proficiencies.json` (**490 KB, 100 % data-driven**)

Árvore de perks **por arma**, com XP própria, ganha por matar criaturas (`getBestiaryExperience(monsterStar)` e `getBosstiaryExperience(rarity)` — a XP escala com a raridade do alvo do bestiário). 32 tipos de bônus em `WeaponProficiencyBonus_t`:

```
ATTACK_DAMAGE, DEFENSE_BONUS, WEAPON_SHIELD_MODIFIER, SKILL_BONUS,
SPECIALIZED_MAGIC_LEVEL, SPELL_AUGMENT, POWERFUL_FOE_BONUS,
CRITICAL_HIT_CHANCE, ELEMENTAL_HIT_CHANCE, RUNE_CRITICAL_HIT_CHANCE,
AUTO_ATTACK_CRITICAL_HIT_CHANCE, CRITICAL_EXTRA_DAMAGE, MANA_LEECH, LIFE_LEECH,
MANA/LIFE_GAIN_ON_HIT, MANA/LIFE_GAIN_ON_KILL, PERFECT_SHOT_DAMAGE,
RANGED_HIT_CHANCE, ATTACK_RANGE, SKILL_PERCENTAGE_{AUTO_ATTACK,SPELL_DAMAGE,SPELL_HEALING},
ALPHA_STRIKE_EXTRA_DAMAGE, OMEGA_STRIKE_EXTRA_DAMAGE, ARMOR_PENETRATION, ELEMENTAL_PIERCE
```

Formato de um nível no JSON (`data/items/proficiencies.json`):

```json
{ "Name": "Sanguine 1H Sword", "ProficiencyId": 6, "Version": 7,
  "Levels": [ { "Perks": [ { "SkillId": 8, "Type": 3, "Value": 1 } ] },
              { "Perks": [ { "Type": 15, "Value": 0.1 },
                           { "SkillId": 8, "Type": 25, "Value": 0.05 } ] } ] }
```

`ALPHA_STRIKE` (dano extra contra alvo com vida alta) e `OMEGA_STRIKE` (contra alvo com vida baixa) são ganchos de design interessantes para lutas de boss.

#### C. Escalonamento do servidor — **NÃO portar**

`src/game/scheduling/`: `dispatcher_budget`, `dispatcher_policy`, `dispatcher_telemetry`, `dispatcher_types`, `dispatcher_wdrr`, `monster_compute_service`.

Isso troca o dispatcher simples que o baseline documentou (`baseline/core/engine.md` §12.1) por um escalonador **WDRR (Weighted Deficit Round Robin)** com admission control atômico, coalescing de tasks, lanes separadas (`DispatcherLane::VisibleMonster` / `BackgroundMonster`) e um **pool de threads dedicado** que roda pathfinding/targeting fora da thread de jogo (`monster.cpp:1211`, `:1851`, `:3655`).

→ **Isso invalida o §12.1 do baseline como descrição do estado atual.** Para o Kaezan é irrelevante como implementação (um jogo single-player não precisa disso), mas a *ideia* de LOD Visible/Background é diretamente aproveitável.

#### D. Rede / infra — **NÃO portar**

`protocol_profile`, `protocol_session_hint`, `transport_codec`, `protocol_port_utils`, `rsa_backend_mbedtls`, `livestream` (818 linhas: espectar jogadores ao vivo), `map_download`, `batch_update`.

#### E. Ferramenta útil

`src/lua/docgen/lua_api_doc_generator.cpp` (2.296 linhas) — gera documentação da API Lua a partir das registrations. É a forma mais barata de obter a **lista canônica de toda a API Lua** sem ler binding por binding.

### 3.3 Reorganização de datapacks — **mudança estrutural real**

O baseline (`creatures.md` §15.1) descreve dois datapacks paralelos **de estrutura idêntica**: `data-canary/` e `data-otservbr-global/`, cada um com `lib/ migrations/ monster/ npc/ raids/ scripts/ world/`.

**Hoje o modelo é diferente:** existe um `data/` **compartilhado** com o núcleo comum, e os dois datapacks viraram **overlays de conteúdo**.

```
data/                          <- NÚCLEO COMPARTILHADO (novo eixo)
  XML/          vocations.xml, imbuements.xml, outfits.xml, mounts.xml,
                familiars.xml, groups.xml, storages.xml, attachedeffects.xml
  items/        items.xml (3,7 MB · 17.108 itens), appearances.dat,
                proficiencies.json (490 KB)
  lib/core/quests/   catalog.lua, loader.lua
  libs/         functions/ systems/ tables/ compat/ gamestore/ debugging/
  scripts/      actions/ creaturescripts/ eventcallbacks/ globalevents/
                lib/ movements/ runes/ spells/ systems/ talkactions/ weapons/
  npclib/  modules/  events/  chatchannels/  json/
  global.lua  core.lua  stages.lua

data-canary/            <- overlay "engine limpa" (107 arq.)
  lib/ migrations/ monster/ npc/ raids/ scripts/ world/canary.otbm

data-otservbr-global/   <- overlay "jogo completo" (4.756 arq.)
  ... + startup/  + scripts/{quests,systems,world_changes,blue_valley,custom,...}
```

**Consequência prática:** spells, runas, weapons, movements e actions **não estão mais duplicados por datapack** — vivem uma única vez em `data/scripts/`. Só monstros, NPCs, raids, mundo e quests são específicos por datapack. Qualquer navegação do baseline que apontava para `data-{pack}/scripts/spells/...` deve ser relida como `data/scripts/spells/...`.

### 3.4 Caminhos alterados (correções pontuais ao baseline)

| Baseline dizia | Caminho real hoje |
|---|---|
| `src/core/webhook.cpp` | `src/server/network/webhook/webhook.cpp` |
| `src/enums/enums.hpp` | não existe como arquivo único — enums estão em `src/enums/*.hpp` e `src/creatures/creatures_definitions.hpp` |
| `data/scripts/lib/storages.lua` | `data-canary/lib/core/storages.lua` e `data-otservbr-global/lib/core/storages.lua` |
| `data/raids/raids.xml` | `data-{pack}/raids/raids.xml` |
| `data/monster/animals/azure_frog.lua` | `data-{pack}/monster/amphibics/azure_frog.lua` (categoria `animals` não existe) |
| `data/lib/core/quests/catalog/init.lua` | `data/lib/core/quests/{catalog,loader}.lua` + `data-{pack}/lib/core/quests/catalog/` |
| `src/lua/scripts/lua_libs/register_monster_type.lua` | `data/scripts/lib/register_monster_type.lua` |
| `Vocation` em `src/creatures/players/vocation.*` | `src/creatures/players/vocations/vocation.{hpp,cpp}` |

### 3.5 Conteúdo de dados novo

- `data/modules/scripts/soulseals/soulseals.lua` — sistema de Soul Seals (novo).
- `data/modules/scripts/taskboard/taskboard.lua` — quadro de tarefas (novo).
- `data/scripts/talkactions/god/` — 6 comandos novos, incluindo `add_bosstiary_kills.lua` e `charms.lua` (úteis para inspecionar as tabelas de bestiary/bosstiary).
- Item de **treino offline de skill** (`feat: add skill trainer item for offline skill training (#3865)`) — relevante para a filosofia "less grinding".
- Imbuement **vibrancy** (#3868) e scroll de imbuement (#3845).
- Compatibilidade com **cliente 15.25** (#4020).
- `Loot(monsterName)` — o construtor Lua de `Loot` agora aceita o nome do monstro, permitindo loot tables nomeadas.

### 3.6 Módulos removidos

**Nenhum.** Nem em `src/`, nem funcionalmente nos datapacks (as únicas deleções foram 1 script de house spell, 1 XML e 1 NPC de blue_valley).

### 3.7 Conclusões antigas que precisam de revisão

| Conclusão do baseline | Status |
|---|---|
| `baseline/core/engine.md` §12.1 — modelo de concorrência do Dispatcher | **Desatualizada.** Substituída por WDRR + admission control + `monster_compute_service` com pool de threads |
| `baseline/creatures.md` §15.1 — "dois datapacks de estrutura idêntica" | **Parcialmente inválida.** Hoje há um `data/` compartilhado; ver §3.3 |
| "IA de monstro é monolítica em `Monster::`" | **Inválida.** Extraída em 4 módulos puros; ver §3.2A |
| Inventário de progressão de personagem (skills, magic level, wheel) | **Incompleto.** Falta Weapon Proficiency inteiro; ver §3.2B |
| `baseline/systems/map.md` — mapa só via `.otbm` em disco | **Incompleta.** O mapa global é baixado em runtime; só `canary.otbm` está versionado |
| Números de linha em geral | **Não confiáveis.** `player.cpp` +1.388 linhas, `game.cpp` +2.370, `monster.cpp` +1.570, `protocolgame.cpp` +3.066 |

---

## 4. Mapa consolidado do repositório

```
references/canary/
├── src/                                   486 arquivos C++
│   ├── canary_server.cpp                  orquestrador de boot
│   ├── creatures/
│   │   ├── combat/                        combat.cpp · condition.cpp · spells.cpp
│   │   ├── monsters/                      monsters.cpp (loader de MonsterType)
│   │   │                                  monster.cpp (runtime, 3.6k linhas)
│   │   │                                  monster_{targeting,pathfinding,
│   │   │                                           combat_intention,relevance}  ← NOVO
│   │   │   ├── spawns/                    spawn_monster.cpp
│   │   ├── npcs/                          npc.cpp · npcs.cpp
│   │   └── players/
│   │       ├── vocations/vocation.{hpp,cpp}
│   │       ├── components/                wheel/ · player_achievement · player_badge
│   │       │                              weapon_proficiency.{hpp,cpp}          ← NOVO
│   │       ├── imbuements/imbuements.cpp
│   │       ├── grouping/                  party · guild · team_finder
│   │       └── livestream/                                                      ← NOVO (MMO)
│   ├── game/
│   │   ├── game.cpp                       núcleo (~+2.4k linhas vs 3.4.1)
│   │   ├── movement/position.hpp          tipo Position (x, y, z)
│   │   ├── scheduling/                    dispatcher* · monster_compute_service ← NOVO
│   │   └── zones/zones.cpp
│   ├── items/                             items.cpp · item.cpp · containers/ · weapons/
│   ├── io/                                io_bosstiary · iobestiary · iomap · iomapserialize
│   ├── map/                               map.cpp · mapcache.cpp
│   │                                      navigation_snapshot.{hpp,cpp}         ← NOVO
│   │   ├── house/                         house.cpp · housetile.cpp
│   │   └── utils/                         astarnodes.cpp · mapsector.cpp
│   ├── lua/                               functions/ (bindings) · scripts/ · docgen/ ← NOVO
│   ├── enums/                             weapon_proficiency.hpp · imbuement.hpp   ← NOVO
│   ├── kv/ · database/ · security/ · server/ · account/ · protobuf/   (infra MMO)
│
├── data/                    NÚCLEO COMPARTILHADO — ver §3.3
├── data-canary/             overlay mínimo + canary.otbm (19 MB)
├── data-otservbr-global/    overlay completo (1.656 monstros, 94 bosses, 114 quests)
├── schema.sql               38 KB — schema MySQL
├── config.lua.dist          29 KB — todos os toggles do servidor
└── tests/                   testes unitários (bom exemplo de como isolar lógica pura)
```

---

## 5. Caminhos importantes (referência rápida)

### 5.1 Regras e fórmulas (C++)

| Assunto | Caminho |
|---|---|
| Fórmula de dano de spell | `src/creatures/combat/combat.cpp:33` (`getLevelFormula`), `:52` (`getCombatDamage`) |
| Aplicação de dano, absorção, mitigação | `src/creatures/combat/combat.cpp` · `src/creatures/players/player.cpp` (`onApplyDamage`) |
| Condições (poison, paralyze, ...) | `src/creatures/combat/condition.cpp`; enum em `src/creatures/creatures_definitions.hpp:112` |
| Fórmula de skill / mana por magic level | `src/creatures/players/vocations/vocation.cpp:237-280` |
| Perda de XP/skill na morte | `src/creatures/players/player.cpp:7220` (`getLostPercent`), `:4039-4110` |
| Level up (HP/mana/cap) | `src/creatures/players/player.cpp` (loop `while (experience >= nextLevelExp)`) |
| Carregamento de MonsterType | `src/creatures/monsters/monsters.cpp` |
| Drop de loot | `src/creatures/monsters/monster.cpp:3414` |
| Spawns | `src/creatures/monsters/spawns/spawn_monster.cpp` |
| A* / pathfinding | `src/map/utils/astarnodes.cpp` + `src/creatures/monsters/monster_pathfinding.cpp` |
| Seleção de alvo | `src/creatures/monsters/monster_targeting.cpp` |
| Imbuements | `src/creatures/players/imbuements/imbuements.cpp` |
| Weapon proficiency | `src/creatures/players/components/weapon_proficiency.cpp` |
| Bestiary / Bosstiary | `src/io/iobestiary.cpp` · `src/io/io_bosstiary.cpp` |

### 5.2 Dados (o que realmente interessa como referência de conteúdo)

| Assunto | Caminho |
|---|---|
| Itens (17.108) | `data/items/items.xml` |
| Perks de proficiência | `data/items/proficiencies.json` |
| Vocações | `data/XML/vocations.xml` |
| Imbuements | `data/XML/imbuements.xml` |
| Outfits / mounts / familiares | `data/XML/{outfits,mounts,familiars}.xml` |
| Spells (200) | `data/scripts/spells/{attack,healing,support,conjuring,party,familiar}/` |
| Runas (36) | `data/scripts/runes/` |
| Monstros (1.656) | `data-otservbr-global/monster/<categoria>/` |
| Bosses (94) | `data-otservbr-global/monster/bosses/` |
| Spawns | `data-otservbr-global/world/otservbr-monster.xml` (9,8 MB) |
| Mapa navegável de exemplo | `data-canary/world/canary.otbm` (19 MB) |
| Helpers de gameplay em Lua | `data/libs/functions/` (`monstertype.lua`, `combat.lua`, `player.lua`, `position.lua`, `spawn.lua`, `tile.lua`) |
| Sistemas em Lua | `data/libs/systems/` (`blessing`, `daily_reward`, `encounters`, `hazard`, `reward_boss`, `zones`, `raids`, `exaltation_forge`) |
| Loot callbacks | `data/scripts/eventcallbacks/monster/ondroploot*.lua` |

---

## 6. Fluxo dos sistemas relevantes

### 6.1 Turno de um monstro (modelo atual, pós-refatoração)

```
tick do monstro
  └─ MonsterRelevancePolicy::update({spectators, distância, engajado})
        → tier = Visible | Background        (histerese de 3 s)
  └─ captura snapshot imutável do entorno (NavRegionSnapshot: células + revisões)
  └─ decisão (funções PURAS, sem tocar no mundo):
        MonsterTargetRanker::rank()                 → quem atacar
        MonsterCombatIntentionEvaluator::evaluate()  → quais spells alcançam
        MonsterPathfinder::find()                    → A* sobre o snapshot
  └─ aplicação do resultado no estado mutável (mover, atacar, conjurar)
        validando que o snapshot ainda é válido (epoch/generation)
```

**A lição de arquitetura:** *capturar → decidir puro → aplicar*. É o que torna a IA testável e o que se deve replicar no Godot.

### 6.2 Morte de um monstro → loot

```
Creature::onDeath()
  └─ cria corpse (Container)
  └─ Monster::dropLoot(corpse)                     monster.cpp:3414
        ├─ se FIENDISH: adiciona forge slivers
        └─ se !rewardBoss && rateLoot > 0:
              EventCallback monsterOnDropLoot   → data/scripts/eventcallbacks/monster/ondroploot__base.lua
                 ├─ player:calculateLootFactor(monster)      (stamina zera o fator)
                 ├─ mType:generateLootRoll({factor, gut})     data/libs/functions/monstertype.lua
                 │     adjustedChance = item.chance * factor * random(0.95, 1.05)
                 │     randValue = getLootRandom()   -- proporcional a rateLoot
                 │     drop se randValue < adjustedChance      (chance em base 100000)
                 └─ corpse:addLoot(lootTable)
              EventCallback monsterPostDropLoot  → analytics
  └─ (opcional) autoloot → playerQuickLootCorpse()
```

### 6.3 Conjurar uma spell

```
Lua: spell:name/words/level/mana/group/cooldown/vocation  (registro declarativo)
  └─ Spell::playerSpellCheck()   valida level, mana, soul, vocação, cooldown, PZ, alvo
  └─ Combat::getCombatDamage()
        formulaType == LEVELMAGIC:
           levelFormula = level*2 + (magicLevel + specializedMagicLevel)*3
           dano = normal_random(levelFormula*mina + minb, levelFormula*maxa + maxb)
        formulaType == SKILL:
           dano = normal_random(minb, weapon->getWeaponDamage(...)*maxa + maxb)
  └─ modificadores: imbuements → charms → prey → wheel → proficiency
  └─ g_game().combatChangeHealth()
        alvo aplica armor, mitigação e resistência elemental
        (o script Lua nunca enxerga o dano pós-mitigação)
  └─ condições de cooldown: CONDITION_SPELLCOOLDOWN + CONDITION_SPELLGROUPCOOLDOWN
```

### 6.4 Progressão de personagem (todos os eixos hoje)

```
XP ─────────────► level ──► HP / mana / cap (por vocação: gainhp, gainmana, gaincap)
uso de arma ────► skill  ──► tries = skillBase * multiplier^(level-11)
gasto de mana ──► magic level ──► manaSpent vs vocation->getReqMana()
kills ──────────► bestiary ──► charm points ──► charms
kills de boss ──► bosstiary ──► pontos ──► bônus de boss
kills (por arma)► weapon proficiency ──► perks escolhidos por nível     ← NOVO
wheel points ───► Wheel of Destiny (só em level alto)
imbuements ─────► bônus temporários no equipamento (decay por tempo)
```

---

## 7. Conceitos que podemos reutilizar

Ordenados por valor para o Kaezan Huntbound.

1. **Separação captura → decisão pura → aplicação na IA.** `monster_targeting.hpp` e `monster_combat_intention.hpp` são especificações de ~40 linhas cada. Reimplementar em GDScript/C# como funções estáticas puras dá IA testável sem rodar o jogo.
2. **`NavCell` como abstração de tile.** Uma bitmask de flags por célula (`BlockSolid`, `BlockProjectile`, `HasGround`, `FloorChange`, `HarmfulField`, `Teleport`) é mais barata e mais rápida que consultar os objetos de cada tile. Em Godot, mapeia para um array paralelo ao `TileMap`.
3. **LOD de simulação (`MonsterRelevanceTier`).** Visible vs Background com histerese. Num single-player o "spectator" é sempre o jogador, o que simplifica: full tick perto do jogador, tick reduzido longe.
4. **Modelo declarativo de monstro.** O formato `.lua` de MonsterType é um schema de criatura maduro e testado por milhares de monstros. Portar o *schema* (para `.tres`/JSON) e usar os 1.656 monstros como referência de balanceamento é o maior ganho de conteúdo disponível.
5. **Loot com chance em base 100000 + fator multiplicativo.** Resolução fina sem floats, e um único `factor` que concentra todos os modificadores.
6. **Weapon Proficiency data-driven.** Uma árvore de perks por arma, alimentada por XP proporcional à raridade do alvo, é um loop de progressão que casa com "less grinding" muito melhor que a curva exponencial de skill do Tibia. `proficiencies.json` é o formato a imitar.
7. **Elements/immunities como percentuais.** `percent=100` imune, `percent=-12` toma 12 % a mais. Uma tabela por criatura resolve todo o sistema de resistências.
8. **Condições como objetos com ticks.** `ConditionType_t` (38 tipos) + duração + intervalo é um modelo de status effect direto de portar.
9. **Fórmulas de spell parametrizadas por `(level, magicLevel)`.** Duas constantes por spell (`mina/minb`, `maxa/maxb`) e um `normal_random` — permite balancear 200 spells sem escrever código por spell.
10. **Cooldown individual + cooldown de grupo.** Duas condições distintas; evita a explosão de contadores por spell.
11. **`strategiesTarget` com pesos.** `{nearest=70, health=10, damage=10, random=10}` — variedade de comportamento com quatro números.
12. **Imbuements com decay contextual.** Categorias `agressive` só decaem em combate fora de PZ. Boa ideia para buffs temporários que não devem expirar no menu.
13. **`ALPHA_STRIKE` / `OMEGA_STRIKE`.** Bônus condicionados ao percentual de vida do alvo — gancho barato para fases de boss.
14. **Layout do `.otbm` e formato de spawn** como referência de estrutura de dados de mundo tile-based (`centerx/centery/centerz + radius`, e por monstro `x/y/z` relativo + `spawntime`).
15. **A suíte `tests/`** — mostra como o Canary isola lógica pura para testar. Bom modelo para GUT/GdUnit.

---

## 8. Dados úteis como referência

Estes são os ativos de **dados** mais valiosos, independentemente da arquitetura:

| Ativo | Volume | Uso para o Kaezan |
|---|---|---|
| `data-otservbr-global/monster/` | 1.656 monstros | Curvas de HP/XP/dano/velocidade por faixa de nível; tabelas de resistência; padrões de ataque |
| `data-otservbr-global/monster/bosses/` | 94 bosses | Padrões de mecânica de boss (summons, fases, áreas) |
| `data/items/items.xml` | 17.108 itens | Curvas de attack/defense/armor por tier de equipamento; slots de imbuement |
| `data/items/proficiencies.json` | 490 KB | Estrutura e magnitude de perks por nível |
| `data/XML/vocations.xml` | 11 vocações | Multiplicadores de skill, regen, mitigação, ganhos por level |
| `data/scripts/spells/` + `runes/` | 236 arquivos | Constantes de fórmula, custo de mana, cooldown, nível mínimo, área |
| `data/XML/imbuements.xml` | 3 tiers × 20 categorias | Magnitudes de bônus e custos |
| `data-otservbr-global/world/otservbr-monster.xml` | 9,8 MB | Densidade de spawn e composição de hunts reais |
| `schema.sql` | 38 KB | **Só como referência do que Tibia persiste** — não é modelo para save single-player |
| `config.lua.dist` | 29 KB | Catálogo dos knobs de balanceamento que Tibia expõe |

**Fonte canônica da API Lua:** em vez de ler bindings um a um, use `src/lua/docgen/lua_api_doc_generator.cpp` como índice das funções expostas.

---

## 9. Partes que NÃO devemos portar

| Área | Caminhos | Motivo |
|---|---|---|
| **Rede / protocolo** | `src/server/`, `protocolgame.cpp`, `protocollogin.cpp`, `transport_codec`, `protocol_profile`, `protocol_session_hint`, `protocol_port_utils` | Single-player não tem cliente remoto. `protocolgame.cpp` sozinho recebeu +3.066 linhas — é o maior sumidouro de complexidade do repo |
| **Criptografia / sessão** | `src/security/` (RSA, XTEA, mbedtls), `src/account/` | Sem autenticação remota |
| **Banco de dados** | `src/database/`, `src/io/functions/iologindata_*`, `schema.sql`, migrations | Save de single-player é um arquivo local, não MySQL |
| **Escalonador concorrente** | `src/game/scheduling/dispatcher_*`, `monster_compute_service` | Godot já tem seu loop; WDRR e admission control existem para milhares de jogadores simultâneos |
| **KV store distribuído** | `src/kv/` | Substituível por um dicionário serializado |
| **Métricas / telemetria** | `metrics/`, OpenTelemetry, `dispatcher_telemetry`, `discord_webhook.lua` | Operação de servidor |
| **PvP inteiro** | `baseline/systems/pvp.md`, skulls, frags, guild wars | Não há outro jogador |
| **Social** | party, guild, hireling, team finder, chat channels, `livestream` | Idem |
| **Houses** | `src/map/house/`, `baseline/systems/housing.md` | Sistema de aluguel/leilão persistente entre jogadores |
| **Market / Store** | market, `data/modules/scripts/gamestore/`, `data/libs/gamestore/` | Economia entre jogadores e monetização |
| **Moderação** | bans, rate limiting, anti-flood, waitlist (`baseline/systems/social.md` §23) | Sem jogadores hostis |
| **Hot-reload de Lua** | `baseline/core/lua_system.md` §13.5 | Godot resolve isso nativamente |
| **DI container em C++** | `src/lib/di/` | Overkill para um projeto Godot |
| **Download de mapa** | `src/map/map_download.cpp` | Assets vão no pacote do jogo |

**Sobre licença:** o Canary é **GPL** (`LICENSE`, 18 KB). Isso é uma razão adicional — além da arquitetural — para tratar o repositório como **referência conceitual e fonte de dados de balanceamento**, e não como fonte de código a copiar. Reimplementar mecânicas a partir da compreensão é seguro; transcrever código não é.

---

## 10. Riscos

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | **Contaminação por arquitetura MMO.** O baseline foi escrito para um projeto MMORPG; ler seções como `instances.md`, `social.md`, `pvp.md` sem filtro leva a importar acoplamentos desnecessários | Alto | Tratar §9 como lista de bloqueio. Ao consultar o baseline, ler primeiro `meta/lua_vs_cpp.md`, que já separa "dado" de "engine" |
| R2 | **Licença GPL.** Copiar código do Canary contamina o projeto Godot | Alto | Portar conceitos e dados de balanceamento; nunca transcrever fontes. Documentar a origem de qualquer tabela numérica reutilizada |
| R3 | **Números de linha do baseline não valem mais.** `player.cpp` +1.388, `game.cpp` +2.370, `monster.cpp` +1.570 linhas desde 3.4.1 | Médio | Sempre navegar por nome de símbolo (`grep` por função), nunca por linha |
| R4 | **O baseline descreve o dispatcher antigo.** `engine.md` §12.1 já não corresponde ao código | Médio | Marcado em §3.7. Para o Kaezan a seção é irrelevante de qualquer forma |
| R5 | **Deriva contínua do upstream.** 158 commits em ~6 meses; o repo é ativo | Médio | Congelar um commit de referência (`157e6f9`) e registrá-lo. Não perseguir `main` |
| R6 | **Complexidade acumulada do Tibia.** Wheel of Destiny, forge, charms, prey, proficiency, imbuements, hazard, concoctions — sete sistemas de progressão sobrepostos | Alto | Escolher explicitamente 2–3 eixos de progressão. Sobrepor todos reproduz exatamente o grind que o pitch rejeita |
| R7 | **Escala de conteúdo.** 1.656 monstros e 17.108 itens são para um mundo persistente de anos | Médio | Usar como *tabela de referência de balanceamento*, não como meta de conteúdo. Amostrar por faixa de nível |
| R8 | **Fórmulas exponenciais de skill.** `skillBase * mult^(level-11)` foi desenhada para retenção de MMO | Alto | Substituir por curva linear/logarítmica. As constantes do Canary servem só para calibrar a *proporção* entre skills |
| R9 | **Dependência do formato `.otbm` e de `appearances.dat`** | Médio | Não adotar `.otbm` como formato de runtime. Se for extrair geometria de `canary.otbm`, fazer conversão offline única para o formato nativo do Godot |
| R10 | **Suposição de que o baseline está completo.** Weapon Proficiency e a IA refatorada não existiam nele | Médio | Antes de usar qualquer seção do baseline, checar §3.7 deste documento |

---

## 11. Recomendações para uma arquitetura Godot single-player

### 11.1 Princípio orientador

> Reutilizar o **modelo de dados** e as **fórmulas** do Tibia. Descartar a **infraestrutura**.

Praticamente tudo o que torna Tibia divertido está em `data/` e nas fórmulas de `combat.cpp`/`vocation.cpp` — algumas centenas de linhas de matemática. Tudo o que torna o Canary complexo (~486 arquivos C++) é infraestrutura de servidor, que num single-player some.

### 11.2 Camadas propostas

```
┌──────────────────────────────────────────────────────────────┐
│ Apresentação  (Godot: TileMap, AnimatedSprite2D, Camera2D)   │
│   Puramente reativa. Zero regra de jogo.                     │
├──────────────────────────────────────────────────────────────┤
│ Simulação     (nós Godot: GridWorld, CreatureNode, TurnLoop) │
│   Estado mutável. Aplica decisões. Emite sinais.             │
├──────────────────────────────────────────────────────────────┤
│ Regras (PURO) (classes sem dependência de nós Godot)         │
│   CombatResolver · TargetRanker · Pathfinder · LootRoller    │
│   ConditionResolver · ProgressionCurves                      │
│   ← testável sem abrir o jogo                                │
├──────────────────────────────────────────────────────────────┤
│ Dados (Resources .tres / JSON)                               │
│   CreatureDef · ItemDef · SpellDef · LootTable · VocationDef │
└──────────────────────────────────────────────────────────────┘
```

O Canary chegou a esse desenho *tarde* — a refatoração de IA de §3.2A é exatamente isso. Vale começar já com ele.

### 11.3 Decisões concretas

**Grid e movimento.** Um `TileFlags` inspirado em `NavCellFlag`, mantido num `PackedInt32Array` paralelo ao `TileMap`. Movimento em passos discretos de tile com interpolação visual — o custo diagonal e a lógica de "empurrar criatura" do Canary (`CREATURE_TILE_COST`) são o modelo. O A* nativo do Godot (`AStarGrid2D`) cobre o caso comum; a lógica de traits (o que cada criatura atravessa) fica na camada de regras.

**Criaturas.** Um `CreatureDef` como `Resource`, com os campos do MonsterType do Canary (§1.2). Carregar de `.tres`, não de Lua. `strategiesTarget` com pesos e a tabela de `elements` por percentual entram direto.

**Combate.** Funções puras: `resolve_attack(attacker_stats, defender_stats, spell_def) → DamagePacket`. Fórmulas base do Canary, constantes recalibradas para a curva de progressão mais curta do Kaezan. Manter a distinção dano primário/secundário (é o que faz imbuements e conversão elemental funcionarem).

**Progressão — escolher, não empilhar.** Recomendação: **dois** eixos.
- *Level* (HP/mana/cap) — curva linear ou levemente polinomial, não exponencial.
- *Weapon Proficiency* — o modelo de `proficiencies.json`, com perks escolhidos pelo jogador.

Cortar: wheel, forge, charms, prey, concoctions, hazard. Bestiary vira **compêndio/enciclopédia** (recompensa de descoberta), não mais um grinder de pontos.

**Loot.** Portar o roll base-100000 com `factor` único. Sem stamina, sem rate de servidor, sem VIP: `factor` fica reservado para dificuldade e bônus de run.

**Conditions.** Um `ConditionResolver` puro com tick por duração/intervalo. Os 38 tipos de `ConditionType_t` são um bom cardápio — implementar o subconjunto que o design pedir.

**Persistência.** Um único save serializado (`ConfigFile`/JSON/binário Godot). Ignorar `schema.sql` e o KV store por completo.

**Loop de simulação.** Turnos ou tempo real por tick, mas com **um único ponto de avanço** que percorre entidades ativas. LOD ao estilo `MonsterRelevanceTier`: full tick perto do jogador, tick esparso longe. Não replicar o dispatcher multithread.

### 11.4 Ordem de trabalho sugerida

1. Extrair os **schemas de dados** (`CreatureDef`, `ItemDef`, `SpellDef`, `LootTable`, `VocationDef`) a partir dos formatos do Canary — decisão barata de mudar agora, cara depois.
2. Implementar a **camada de regras pura** com testes, sem nenhum nó Godot.
3. Construir grid + movimento + IA de monstro sobre essa camada.
4. Só então importar dados de balanceamento em volume, amostrando por faixa de nível.

### 11.5 Como consultar o baseline daqui para frente

| Precisa de... | Leia | Ressalva |
|---|---|---|
| Schema de monstro | `baseline/gameplay/creatures.md` §15.2 | Nenhuma — validado |
| Loot | `baseline/systems/rewards.md` §17.1 | Só as linhas mudaram |
| Spells e fórmulas | `baseline/gameplay/spells.md` §32 | Nenhuma — validado |
| Vocações | `baseline/gameplay/player.md` §18.1 | Nenhuma — validado |
| Skills | `baseline/gameplay/skills.md` §39 | Nenhuma — validado |
| Morte | `baseline/gameplay/death.md` §40 | Nenhuma — validado |
| Imbuements | `baseline/systems/economy.md` §21.4 | Nenhuma — validado |
| Mapa/tiles/spawns | `baseline/systems/map.md` §36 | + o mapa global hoje é baixado |
| Bestiary/Bosstiary/Prey | `baseline/systems/progression.md` §19 | Nenhuma |
| NPCs e diálogo | `baseline/gameplay/creatures.md` §35 | Nenhuma |
| Onde fica cada coisa | `baseline/meta/lua_vs_cpp.md` | Corrigir caminhos com §3.3/§3.4 |
| Dispatcher / concorrência | ~~`baseline/core/engine.md` §12.1~~ | **Desatualizado e fora de escopo** |
| IA de monstro | *não está no baseline* | Ler `src/creatures/monsters/monster_*.hpp` |
| Weapon Proficiency | *não está no baseline* | Ler §3.2B deste documento |

---

## Apêndice — Como este delta foi apurado

- Leitura do índice e das 25 páginas do baseline (títulos, seções e trechos integrais das áreas de interesse).
- Extração automática dos **248 caminhos concretos** citados pelo baseline e verificação de existência no clone atual → 200 válidos, 48 investigados individualmente (§3.4).
- `git diff --diff-filter={A,D,R} v3.4.1..HEAD -- src` → 43 adições, 0 remoções, 0 renomeações.
- `git diff --stat v3.4.1..HEAD -- src` → ranking de churn para priorizar releitura.
- Verificação direta das fórmulas documentadas contra o código atual (`combat.cpp:33/52`, `vocation.cpp:265`, `player.cpp:7220`, `monster.cpp:3414`).
- Leitura dos headers dos módulos novos e inventário quantitativo dos datapacks.

**Commit de referência a congelar:** `157e6f9e21318bd3033eea553fe9275b429faf72`
