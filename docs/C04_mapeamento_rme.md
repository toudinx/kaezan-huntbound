# C04 — Mapeamento do RME / formato de mapas de Tibia

> **STATUS: EVIDÊNCIA HISTÓRICA.** O estudo de RME/OTBM permanece válido. A recomendação de autoria
> em Godot foi substituída por Tiled JSON + Phaser no ADR atual e na síntese §17.

**Data:** 2026-08-09
**Escopo:** análise somente-leitura. Nada foi implementado. O RME não foi modificado.
**Repositório analisado:** `C:\Kaezan\remeres-map-editor` (fork *Canary Map Editor*, commit `57ee0e5`)
**Cópia espelhada:** `C:\Kaezan\kaezan-godot\references\remeres-map-editor` (idêntica, mesmo commit)

---

## 0. Resposta curta

**MVP → opção C.** Criar mapas novos em Godot com os *conceitos* de Tibia (grid 32px, multi-floor, stack de itens por tile, flags de tile), sem OTBM.

**Longo prazo → opção B**, e só se aparecer necessidade real de reaproveitar layouts prontos. O caminho barato para B já existe e **não exige tocar no código do RME**: o RME embarca um interpretador Lua com `app.map`, `map:getTile`, `tile.items`, `json.encode` e `app.storage(...):save(...)`. Dá para escrever um script de export dentro do próprio RME e receber JSON pronto.

**Opção A (importar/converter mapas existentes) está descartada** — não por dificuldade de parsing, mas porque o custo real não é ler o OTBM: é reimplementar o *renderer* do Tibia e depender de assets proprietários do cliente.

O detalhamento está nas seções 7–10.

---

## 1. Arquitetura relevante do RME

### 1.1 Hierarquia espacial

```
Map  (source/map.h)
 └── BaseMap : QTreeNode          quadtree esparsa, indexada por x/y
      └── QTreeNode ...           subdivisão até chegar em folha
           └── Floor              bloco de 4×4 tiles, por andar z
                └── TileLocation  slot fixo (persiste mesmo sem Tile)
                     └── Tile     conteúdo real
```

Pontos que importam:

- **A quadtree é puramente in-memory.** Não aparece no arquivo. O OTBM em disco usa outro chunking (256×256, seção 3.2). Um importador não precisa saber nada de quadtree.
- **`Floor` é um bloco de 4×4 tiles** (`iomap_otbm.cpp:5063-5072`: `pos.x & ~3`, índice `(x&3)*4 + (y&3)`). Detalhe de alocação, não de formato.
- **`TileLocation` sobrevive ao `Tile`.** Guarda contadores de spawn, waypoints e house-exits que apontam para aquela posição. É o truque que permite deletar um tile sem perder metadados de terceiros.
- **O mapa é esparso.** Tile inexistente ≠ tile vazio. `Tile::empty()` (`tile.h:126`) só é verdadeiro se não há ground, items, monsters, spawn, npc, house exit, waypoint. Tiles vazios não são gravados.

### 1.2 Conteúdo de um Tile

`source/tile.h:50-60`:

| Campo | Tipo | Observação |
|---|---|---|
| `ground` | `Item*` | slot dedicado, separado da pilha |
| `items` | `ItemVector` | pilha ordenada (borders → alwaysOnBottom → resto → alwaysOnTop) |
| `monsters` | `std::vector<Monster*>` | não vai para o OTBM; vem do XML de spawn |
| `spawnMonster` | `SpawnMonster*` | idem |
| `npc` / `spawnNpc` | ponteiros | idem |
| `house_id` | `uint32_t` | vai para o OTBM (tile type `OTBM_HOUSETILE`) |
| `zones` | `std::set<unsigned int>` | vai para o OTBM (nó `OTBM_TILE_ZONE`) |
| `mapflags` | `uint32_t` | PZ / NoPvP / NoLogout / PvPZone / Refresh |
| `statflags` | `uint32_t` | interno do editor (selected, blocking, modified…) — **não serializado** |

**Flags de tile persistidas** (`tile.h:28-44`):

```
TILESTATE_PROTECTIONZONE = 0x0001
TILESTATE_DEPRECATED     = 0x0002   (reservado)
TILESTATE_NOPVP          = 0x0004
TILESTATE_NOLOGOUT       = 0x0008
TILESTATE_PVPZONE        = 0x0010
TILESTATE_REFRESH        = 0x0020
```

Atenção: os valores internos (`SELECTED`, `BLOCKING`, `HAS_TABLE`…) **reusam os mesmos bits** em um campo diferente. São dois `uint32_t` distintos; misturá-los é o erro clássico ao escrever um parser.

### 1.3 Item e ItemType

`Item` (`item.h:78`) carrega quase nada: `id` (uint16), `subtype` (uint16) e um mapa opcional de atributos. **Toda a semântica está em `ItemType`** (`items.h`), que vem do banco de itens do cliente, não do mapa.

`ItemType` expõe ~50 flags. As que interessam a um jogo top-down:

- **Colisão / movimento:** `unpassable`, `blockPathfinder`, `blockMissiles`, `blockPickupable`, `hasElevation`, `hasHeight`, `walkStack`
- **Ordenação visual:** `alwaysOnBottom`, `alwaysOnTopOrder`, `isBorder`, `isOptionalBorder`, `isWall`, `isTable`, `isCarpet`, `isHangable`, `hookEast`, `hookSouth`
- **Transição de andar:** `floorChange`, `floorChangeDown/North/South/East/West`
- **Tipo lógico:** `isDoor`, `isTeleport`, `isDepot`, `isContainer`, `isMagicField`, `isBed`, `isPodium`
- **Sprite:** `clientID`, `sprite_id`, `width`, `height`, `layers`, `pattern_*`, `sprite_phase_size`

**Consequência central:** um `.otbm` isolado é praticamente ilegível em termos de gameplay. Ele contém `id=1234` e nada mais. Sem o banco de itens você não sabe se 1234 é chão, parede, tocha ou uma poção no chão.

### 1.4 Subsistemas fora do grid

| Subsistema | Arquivo | Onde persiste |
|---|---|---|
| `Houses` / `House` | `house.h` | id/tile no OTBM + XML sidecar com nome, rent, townid, entry, beds |
| `Towns` / `Town` | `town.h` | nó `OTBM_TOWNS` no OTBM (id, nome, posição do templo) |
| `Waypoints` | `waypoints.h` | nó `OTBM_WAYPOINTS` (nome + posição) |
| `Zones` | `zones.h` | ids por tile no OTBM + XML `nome→id` |
| `SpawnMonster` / `SpawnNpc` | `spawn_monster.h`, `spawn_npc.h` | **100% XML sidecar** |
| Brushes / tilesets / borders | `data/materials/**` | XML, só o editor usa |

---

## 2. Formatos — visão geral

O RME não tem "um" formato. Tem uma constelação:

| Arquivo | Papel | Tipo |
|---|---|---|
| `*.otbm` | geometria + itens + towns + waypoints | binário (node tree) |
| `*.otgz` | o mesmo, empacotado com sidecars | tar/gzip via libarchive |
| `*-monster.xml` | spawns de monstro | XML |
| `*-npc.xml` | spawns de NPC | XML |
| `*-house.xml` | metadados de casas | XML |
| `*-zone.xml` | nome→id de zonas | XML |
| `items.otb` | banco de itens legado (id servidor ↔ id cliente + flags) | binário (mesmo node tree, magic `OTBI`) |
| `appearances.dat` | banco de itens moderno | protobuf (`source/protobuf/appearances.proto`) |
| `catalog-content.json` + `*.lzma` | sprites | JSON + sheets LZMA |
| `data/materials/**.xml` | brushes, borders, tilesets | XML, só editor |
| `*.otmm` | minimap | binário, `OTMM_SIGNATURE = 0x4D4D544F` |

Formatos de **export** adicionais (só saída, one-way): `staticdata.proto`, `staticmapdata.proto`, `mapdata.proto`, export de minimap PNG. Nenhum deles serve como formato de mapa jogável — são para o Cyclopedia do cliente.

---

## 3. OTBM — serialização detalhada

### 3.1 Camada de transporte: node tree

`source/filehandle.h:43-46`:

```
NODE_START  = 0xFE
NODE_END    = 0xFF
ESCAPE_CHAR = 0xFD
```

Layout do arquivo:

```
[4 bytes identificador]   "OTBM" ou wildcard (zeros)   ← iomap_otbm.cpp:4112 hasValidOtbmPrefix
[0xFE]                    início do nó raiz
  ...
```

Qualquer byte de payload igual a `0xFD/0xFE/0xFF` é precedido de `0xFD` na escrita (`filehandle.h:363-380`) e removido na leitura. **Isso tem que ser desfeito antes de qualquer parsing de campos.** É a pegadinha nº 1 de quem escreve um leitor de OTBM.

Estrutura recursiva: `0xFE <type_byte> <payload...> [nós filhos...] 0xFF`.
Inteiros são little-endian. Strings são `u16 length` + bytes crus (sem terminador).

### 3.2 Estrutura lógica

```
ROOT (type byte 0x00)
├─ u32  version         (MapVersionID: 0..5, hoje MAP_OTBM_5 / MAP_OTBM_6)
├─ u16  width
├─ u16  height
├─ u32  majorVersionItems   (o RME grava 4 fixo — deprecado)
├─ u32  minorVersionItems   (idem)
└─ OTBM_MAP_DATA (2)
   ├─ atributos: DESCRIPTION, EXT_SPAWN_MONSTER_FILE, EXT_SPAWN_NPC_FILE,
   │              EXT_HOUSE_FILE, EXT_ZONE_FILE
   ├─ OTBM_TILE_AREA (4)   [0..n]
   │   ├─ u16 base_x, u16 base_y, u8 base_z      (base_x = x & 0xFF00 → área 256×256)
   │   └─ OTBM_TILE (5) | OTBM_HOUSETILE (14)   [0..n]
   │       ├─ u8 x_offset, u8 y_offset           (posição absoluta = base + offset)
   │       ├─ u32 house_id                       (só se HOUSETILE)
   │       ├─ atributos inline:
   │       │    OTBM_ATTR_TILE_FLAGS (3) → u32
   │       │    OTBM_ATTR_ITEM (9)       → u16 item_id   (forma compacta do ground)
   │       └─ filhos:
   │            OTBM_ITEM (6)      → u16 id + atributos
   │            OTBM_TILE_ZONE(19) → u16 count + count × u16 zone_id
   ├─ OTBM_TOWNS (12)
   │   └─ OTBM_TOWN (13) → u32 id, string name, u16 x, u16 y, u8 z
   └─ OTBM_WAYPOINTS (15)               [OTBM ≥ 3]
       └─ OTBM_WAYPOINT (16) → string name, u16 x, u16 y, u8 z
```

Referências: leitura em `iomap_otbm.cpp:4917-5274`, escrita em `iomap_otbm.cpp:5842-5936` e `4245-4275`.

### 3.3 Atributos de item

Enum completo em `iomap_otbm.h:27-54`. Os que aparecem em tiles de mapa:

| Attr | Valor | Payload | Uso |
|---|---|---|---|
| `COUNT` | 15 | u8 | stackable/splash/fluid (OTBM ≥ 2) |
| `CHARGES` | 22 | u16 | itens com carga |
| `ACTION_ID` | 4 | u16 | script hook — **relevante para dungeon** |
| `UNIQUE_ID` | 5 | u16 | idem |
| `TEXT` | 6 | string | placas, livros |
| `DESC` | 7 | string | |
| `TELE_DEST` | 8 | u16 x, u16 y, u8 z | destino de teleporte |
| `DEPOT_ID` | 10 | u16 | |
| `HOUSEDOORID` | 14 | u8 | |
| `ATTRIBUTE_MAP` | 128 | map tipado | OTBM 4 e ≥ 6 |
| `RUNE_CHARGES` | 12 | u8 | legado |

Diferenças por versão que um parser precisa tratar (`iomap_otbm.cpp:4297-4301`, `4397-4440`):

- **OTBM 1:** `count` vem *inline* logo após o id, sem tag de atributo.
- **OTBM ≥ 2:** `count` vira `OTBM_ATTR_COUNT`.
- **OTBM 3:** habilita waypoints.
- **OTBM 4 e ≥ 6:** atributos custom vão em `OTBM_ATTR_ATTRIBUTE_MAP` (mapa tipado string→valor).
- **OTBM 5:** piso mínimo de gravação — `saveMap` força `max(mapVersion, MAP_OTBM_5)`.

Armadilha: o writer grava `OTBM_ATTR_DESCRIPTION` **duas vezes** (`iomap_otbm.cpp:5871-5877`) — uma com a assinatura do editor, outra com a descrição do usuário. Um parser ingênuo sobrescreve a segunda com a primeira ou vice-versa.

### 3.4 Sidecars XML

**Spawns de monstro** (`iomap_otbm.cpp:5293-5424`) — o formato de longe mais relevante para dungeons:

```xml
<monsters>
  <monster centerx="1000" centery="1000" centerz="7" radius="5">
    <monster name="rat" x="-1" y="2" z="7" spawntime="60" direction="0" weight="1"/>
  </monster>
</monsters>
```

Semântica: cada `<monster>` externo é uma **área circular** de raio `radius` centrada em `center*`. Os filhos são posições *relativas* ao centro. O RME expande `radius` para caber todos os filhos e clampa em `MAX_SPAWN_MONSTER_RADIUS`. `spawntime` em segundos; se 0, usa default de config. `weight` alimenta a escolha ponderada.

**Houses:** `<house name= houseid= entryx/y/z= rent= guildhall= townid= size= clientid= beds=/>`
**Zones:** `<zone name= zoneid=/>` — só o dicionário; a associação tile→zona está no OTBM.
**NPCs:** análogo aos monstros, com `npcs`/`npc`.

---

## 4. Assets — a dependência que decide tudo

O RME **não abre um mapa sem os dados do cliente**. Fluxo em `client_assets.cpp` / `items.cpp`:

1. `data/clients.xml` mapeia versão de cliente → versão de OTB → assinaturas `.dat`/`.spr`.
2. `ItemDatabase::loadFromOtb` (`items.cpp:365`) lê `items.otb` (node tree, magic `OTBI`) — caminho legado.
3. `ItemDatabase::loadFromProtobuf` (`items.cpp:456`) lê `appearances.dat` (protobuf) — caminho moderno (cliente 11+, que é o default em `clients.xml`).
4. `SpriteAppearances::loadCatalogContent` (`sprite_appearances.cpp:45`) lê `catalog-content.json` e carrega sheets `.lzma` (`SPRITE_SHEET_WIDTH`, layouts 1×1 / 1×2 / 2×1 / 2×2, sprite base 32×32).
5. `data/materials/**` (borders, brushs, tilesets — ~100 XMLs) define brushes e paleta. **Só o editor usa**; nada disso vai para o mapa.

Consequências diretas:

- Sem `appearances.dat` + sheets, um `.otbm` é uma lista de inteiros sem significado nem visual.
- Esses arquivos vêm do cliente oficial do Tibia. São **proprietários da CipSoft**. O dossiê já assume isso como placeholder de protótipo (`01_GUIA_DE_EXECUCAO.md` §13) — mas qualquer investimento em pipeline OTBM amarra o projeto a esses assets muito além do protótipo.
- Os brushes do RME (borderização automática, wall/table/carpet auto-tiling) são *lógica do editor*. Godot tem `TileSet` + terrains, que cobre a mesma necessidade de forma nativa. Não há nada de reaproveitável ali além de ideias.

---

## 5. Limites e limitações do formato

| Item | Limite | Fonte |
|---|---|---|
| Andares | 16 (z = 0..15), z=7 = nível do mar | `const.h:25,32-33,35` |
| Largura / altura | 256 … 65000 (uint16 no header) | `const.h:27-30` |
| Tile em pixels | 32×32 | `const.h:41-44` |
| Chunk de gravação | área 256×256 por andar | `iomap_otbm.cpp:4173,4183` |
| Item id | uint16 | `item.h:391` |
| Action ID / Unique ID | uint16 cada | `iomap_otbm.h:31-32` |
| Zonas por tile | uint16 count, ids uint16 | `iomap_otbm.cpp:4237-4241` |
| House id | uint32 | `iomap_otbm.h:112` |
| Viewport do cliente | 18×14 tiles | `const.h:37-38` |

Limitações estruturais (não numéricas):

1. **Sem camada de entidades genérica.** Só existem itens, monstros, NPCs. Gatilhos, checkpoints e objetivos precisam ser codificados como `actionId`/`uniqueId` em itens — convenção frágil, sem tipagem, sem validação.
2. **Sem noção de dungeon/instância/sala.** O mapa é um plano global único. Instanciar exige copiar retângulos e realocar posições na mão.
3. **Sem versionamento amigável a diff.** Binário. Merge de duas edições paralelas é impossível sem ferramenta dedicada.
4. **Colisão não está no mapa.** Deriva de `ItemType.unpassable` / `blockPathfinder`, ou seja, do banco de itens do cliente.
5. **Ordem de empilhamento é implícita.** A ordem correta de desenho vem de `alwaysOnBottom`, `alwaysOnTopOrder`, `isBorder`, `hasElevation` — regras do renderer do Tibia, não gravadas no arquivo.
6. **Sprites multi-tile e deslocamento.** `width`/`height` > 1, `layers`, `pattern_*`, `sprite_phase_size` (animação), offsets de desenho. Reproduzir isso fielmente é reescrever o renderer do OTClient.
7. **Comentário explícito dos mantenedores** contra estender o binário (`iomap_otbm.cpp:5843-5851`): *"antes de tentar modificar isto, POR FAVOR considere um arquivo externo"*. O formato é tratado como congelado.

---

## 6. Achado prático: o RME tem API Lua

`source/lua/` — 44 arquivos, motor sol2 (`lua_engine.cpp:41`), `apiVersion = 1` (`lua_api_app.cpp:723`). Scripts de exemplo em `scripts/` (incluindo `dungeon_generator.lua`, `maze_generator.lua`, `map_stats_exporter.lua`).

Superfície exposta relevante:

- `app.map` → `name`, `width`, `height`, `tileCount`, `tiles` (iterador), `getTile`, `getOrCreateTile`, `spawns`, `houseFilename`, `spawnFilename`
- `tile` → `ground`, `items`, `position`, `mapFlags`, `houseId`, `hasSpawn`, `spawn`, `creature`, `isBlocking`, `isPZ`, `isHouseTile`, `getTopItem`, `getItemAt`
- `item` → `id`, `clientId`, `name`, `count`, `subtype`, `actionId`, `uniqueId`, `text`, `isGroundTile`, `isBlocking`, `isWall`, `isDoor`, `zOrder`, `getInfo`
- `json.encode` / `json.decode`
- `app.storage(nome):save(tabela)` → grava JSON no diretório de scripts (`lua_api_app.cpp:430-481`; bloqueia `..` e caminhos absolutos, e força `.json`)
- `app.selection` → permite exportar **só a região selecionada**

Isso significa: **um exportador OTBM → JSON é um script Lua de ~80 linhas, executado dentro do RME, sem compilar nada e sem modificar o repositório.** Ele também já resolve o problema do banco de itens — as flags (`isBlocking`, `isGroundTile`, `isWall`) vêm resolvidas pelo próprio RME, que já carregou os assets.

Esse é o único caminho de importação com custo baixo o suficiente para valer a pena considerar. Todos os outros exigem reimplementar o parser binário *e* o banco de itens.

---

## 7. Dificuldade estimada de conversão

Escala: **B**aixa (< 1 dia) · **M**édia (2–5 dias) · **A**lta (1–3 semanas) · **MA** (> 1 mês / risco estrutural).

| Subsistema | Via parser próprio | Via export Lua do RME | Nota |
|---|---|---|---|
| Node tree + unescape | **B** | — (não se aplica) | ~150 linhas |
| Header, tile areas, posições | **B** | **B** | trivial |
| Tiles / ground / pilha de itens | **B** | **B** | |
| Flags de tile (PZ, NoLogout…) | **B** | **B** | |
| Atributos de item (AID/UID/text/tele) | **M** | **B** | multi-versão no parser próprio |
| Zonas | **B** | **M** | não vi getter de zona na API Lua |
| Towns / waypoints / houses | **B** | **M** | irrelevante para Huntbound |
| Spawns (XML) | **B** | **B** | formato simples |
| **Semântica de item (id → colisão/tipo)** | **A** | **B** | parser próprio precisa ler `items.otb`/`appearances.dat` |
| **Sprites (id → textura)** | **A** | **A** | LZMA sheets + catalog + offsets + multi-tile |
| **Renderer fiel (stack order, elevação, borders, hangables)** | **MA** | **MA** | é o renderer do OTClient inteiro |
| Multi-floor com oclusão à la Tibia | **A** | **A** | independe do formato |
| Autotiling / borderização | **M** | **M** | Godot terrains resolve nativamente |

**Leitura do quadro:** ler o OTBM é fácil. **Fazer o resultado parecer Tibia é o trabalho todo** — e esse trabalho é idêntico quer o mapa venha de OTBM, quer venha de um editor próprio. O formato não é o gargalo. O renderer e os assets são.

---

## 8. Alternativas avaliadas

### A) Importar/converter mapas existentes — **descartada**

Reaproveitar hunts prontas de Tibia (OTBM completos de servidores OT).

- ➕ Volume enorme de layout pronto e testado.
- ➖ Exige o renderer completo (MA na tabela acima).
- ➖ Amarra o projeto a `appearances.dat` + sprites da CipSoft de forma estrutural, não como placeholder.
- ➖ Mapas de OT são mundos contínuos de dezenas de milhares de tiles. Huntbound quer dungeons instanciadas pequenas. Recortar hunt de dentro de um mundo é trabalho manual por hunt.
- ➖ Nenhuma noção de sala, wave, gatilho, objetivo — tudo que uma dungeon precisa teria que ser anotado depois via `actionId`.

O ganho é conteúdo que não serve na forma em que vem, ao preço da parte mais cara do projeto.

### B) Importador parcial — **viável, adiar**

Um caminho one-way: RME → JSON → recurso Godot. Subset mínimo: posição, ground id, pilha de ids, flag de bloqueio, `actionId`, spawns.

- ➕ Com o script Lua (§6) o custo cai para ~1–2 dias, sem parser binário e sem banco de itens.
- ➕ Permite greybox rápido de layout usando o RME como ferramenta de desenho.
- ➖ Ainda exige mapear item id → tile do Godot, ou seja, um atlas próprio.
- ➖ Só vale se alguém realmente for desenhar no RME. Se ninguém for, é infra órfã.

### C) Criar mapas em Godot com conceitos semelhantes — **recomendada para o MVP**

`TileMapLayer` (uma por andar), `TileSet` com terrains, colisão por tile, cenas para entidades (spawner, porta, gatilho, boss).

- ➕ Zero dependência de formato externo, de assets do cliente e de toolchain C++.
- ➕ Editor visual é o próprio Godot — sem ida e volta entre ferramentas.
- ➕ Entidades são cenas de verdade, tipadas, não `actionId` mágicos.
- ➕ Instanciar dungeon vira `PackedScene.instantiate()`, que é exatamente o modelo do jogo.
- ➕ Cenas Godot são texto → diff e merge funcionam.
- ➖ Layout é feito à mão desde o zero.
- ➖ Multi-floor à la Tibia (oclusão, transição por escada) precisa ser desenhado do zero de qualquer jeito.

Vale registrar: **vocês já fizeram isso uma vez.** `C:\Kaezan\kaezan-map-editor` tem `MapData` (`backend/domain/Models/MapData.cs`) com `Width`/`Height`/`Tiles[][]`/`Objects[][]` e tilesets em PNG. É o modelo de duas camadas, tile-based, single-floor. A opção C é a continuação natural disso.

### D) Ferramenta própria mais tarde — **é o desfecho, não uma escolha agora**

Construir um editor Kaezan só se ganha sentido quando (a) o volume de dungeons tornar a autoria no Godot lenta, ou (b) surgir necessidade de geração procedural/parametrizada. Ambos são problemas de conteúdo, não de MVP. E o Arena Map Editor já prova que vocês conseguem fazer isso quando precisar.

---

## 9. Recomendação para o MVP

**Opção C, sem importador.**

Concretamente:

1. **Uma `TileMapLayer` por andar.** Comece com um andar só. A estrutura multi-floor entra quando a primeira dungeon pedir.
2. **Grid 32×32** (`const.h:41`) para manter proporção e feeling de Tibia, e para que assets placeholder de Tibia encaixem sem escala.
3. **Duas camadas por andar:** ground e objects — o mesmo modelo do `MapData` do Arena, e o mesmo do RME na prática (`ground` + `items`).
4. **Colisão no TileSet**, não derivada de tabela de itens.
5. **Flags de tile como custom data layers** no TileSet. Copie o vocabulário do RME onde fizer sentido (`no_logout`, `safe_zone`); ignore o resto (PvP, houses, towns, depots, guildhalls — nada disso existe em Huntbound).
6. **Entidades como cenas**, não como itens com `actionId`: `MonsterSpawner`, `Door`, `Stairs`, `Trigger`, `ChestReward`, `BossArena`.
7. **Spawner com a semântica do RME** — é o único conceito do formato que vale copiar quase literal: centro + raio + lista ponderada + `spawntime`. Está validado por 20 anos de Tibia e mapeia direto para wave/hunt.
8. **Dungeon = `PackedScene`.** Instanciar, rodar, descartar.
9. **Assets de Tibia como placeholder** recortados manualmente para um atlas do Godot — não via pipeline de `appearances.dat`/LZMA. Recorte manual é descartável; pipeline é dívida.

**Não construir agora:** parser de OTBM, leitor de `items.otb`, leitor de `appearances.dat`, decodificador de sheet LZMA, sistema de brushes/borderização próprio, houses, towns, waypoints, zonas.

## 10. Recomendação para o longo prazo

Em ordem de gatilho, não de cronograma:

1. **Se a autoria manual virar gargalo** → escrever o script Lua de export no RME (§6) e um importador one-way JSON → cena Godot. Opção B, custo baixo, reversível. Trate como *ferramenta de greybox*, não como formato de runtime: importa uma vez, vira cena Godot, e o vínculo com o RME acaba ali.
2. **Se surgir necessidade de dungeons parametrizadas/procedurais** → ferramenta própria (D). O `dungeon_generator.lua`/`maze_generator.lua` do RME servem como referência de abordagem, mas em Godot isso é um `@tool` script, não um app separado.
3. **Formato de runtime deve permanecer nativo do Godot.** Nunca carregar `.otbm` em runtime. Se um importador existir, ele roda offline, em tempo de edição, e o produto é `.tscn`/`.tres`.
4. **Antes de qualquer distribuição comercial**, todo asset derivado do cliente do Tibia tem que sair. Quanto menos o pipeline depender de `appearances.dat`, mais barata essa troca fica. Esse é o argumento mais forte contra A e a favor de C.

---

## 11. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **Jurídico** — assets/dados do cliente Tibia no pipeline definitivo | Alta se A/B | Alto | Opção C; assets só como placeholder recortado; sem dependência de `appearances.dat` |
| R2 | **Sumidouro do renderer** — tentar reproduzir stack order, elevação, borders e sprites multi-tile do Tibia | Alta se A | Muito alto | Definir cedo um nível de fidelidade "inspirado, não idêntico" |
| R3 | **Infra órfã** — importador construído e nunca usado | Média | Médio | Só construir B depois que alguém desenhar ≥ 3 dungeons no RME por vontade própria |
| R4 | **Acoplamento ao RME** — versões, build C++/wxWidgets/vcpkg, assets de cliente | Média se B | Médio | Fronteira em JSON; RME nunca em runtime; nunca modificar o fork |
| R5 | **Bugs sutis de parser** — escaping `0xFD`, `DESCRIPTION` duplicado, `count` inline em OTBM 1, colisão de bits map/stat flags | Alta se parser próprio | Médio | Preferir a rota Lua, que evita todo o parsing binário |
| R6 | **Escopo do multi-floor** — 16 andares com oclusão é caro em qualquer caminho | Média | Médio | MVP com 1 andar; multi-floor só quando uma dungeon exigir |
| R7 | **Divergência de convenção** — copiar `actionId`/`uniqueId` para gatilhos e herdar a fragilidade | Média | Médio | Entidades tipadas como cenas desde o começo |
| R8 | **Reinvenção do Arena Map Editor** — refazer o que `kaezan-map-editor` já faz | Média | Médio | Reler `MapData.cs` antes de projetar o formato de mapa; reaproveitar o modelo, não o código |

---

## 12. Índice de caminhos

**Repositório RME**

| Assunto | Caminho |
|---|---|
| Serialização OTBM (load/save) | `source/iomap_otbm.cpp` — load `4917`, save `5842`, tile `4245` |
| Enums e structs OTBM | `source/iomap_otbm.h:27-113` |
| Node tree, escaping | `source/filehandle.h:43-46,363-380`, `source/filehandle.cpp:219-290` |
| Tile e flags | `source/tile.h:28-60` |
| Floor / TileLocation | `source/map_region.h` |
| Map, quadtree, metadados | `source/map.h:164-201`, `source/basemap.h` |
| Item | `source/item.h:78-130,391-393` |
| ItemType (flags) | `source/items.h` |
| Banco de itens (OTB + protobuf) | `source/items.cpp:365,456` |
| Sprites (catalog + LZMA) | `source/sprite_appearances.cpp:45,89` |
| Versões de cliente/OTB/OTBM | `source/client_assets.h:24-41`, `data/clients.xml` |
| Limites do mapa | `source/const.h:20-45` |
| Houses / Towns / Waypoints / Zones | `source/house.h`, `town.h`, `waypoints.h`, `zones.h` |
| Spawns | `source/spawn_monster.h`, `spawn_npc.h`; XML em `iomap_otbm.cpp:5293` |
| Minimap OTMM | `source/iominimap.h` |
| Exports protobuf | `source/protobuf/{mapdata,staticdata,staticmapdata}.proto` |
| API Lua | `source/lua/` (44 arquivos), scripts em `scripts/*.lua` |
| Materiais do editor | `data/materials/` (borders, brushs, ~100 tilesets) |

**Contexto interno**

| Assunto | Caminho |
|---|---|
| Modelo de mapa do Arena | `C:\Kaezan\kaezan-map-editor\backend\domain\Models\MapData.cs` |
| Mapa de exemplo | `C:\Kaezan\kaezan-map-editor\backend\maps\water_arena_v0.json` |
| Tilesets do Arena (PNG) | `C:\Kaezan\kaezan-map-editor\backend\tilesets\` |
| Projeto Godot | `C:\Kaezan\kaezan-godot\kaezan-huntbound\` |
