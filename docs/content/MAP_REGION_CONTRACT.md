# Contrato de região de mapa — PB-04

Este documento descreve os contratos publicados por `@huntbound/contracts` para uma região
extraída de uma hunt. O schema é a versão `HUNT_SCHEMA_VERSION = 1`, estrito e composto apenas por
números inteiros seguros, strings e arrays ordenados.

## Coordenadas e camadas

`MapRegion.origin` é a origem absoluta no mapa Tibia. Todas as posições em `TransitionTable`,
`SpawnTable` e `HuntDefinition.playerStart` são locais à região: `x` varia de `0` a `width - 1`,
`y` varia de `0` a `height - 1` e `z` precisa existir em `floors`. O extrator é responsável por
converter coordenadas absolutas para locais antes de produzir o JSON.

Cada andar usa índice row-major:

```text
i = y * width + x
```

`ground` é denso e tem exatamente `width * height` entradas. `objectsBelow`, `objectsAbove` e
`collision` são esparsos; uma célula que não aparece nessas listas não tem entrada daquele tipo.
Não existe sentinela negativa para representar ausência. Os `stack` preservam a ordem de
empilhamento e cada valor é um índice da `palette`.

Uma região precisa ter entre um e três andares, largura e altura positivas de no máximo `96`, e
`floors` em ordem estritamente crescente de `z`. O limite de atores vivos da hunt é declarado por
`SpawnTable.maxLiveActors` e precisa estar entre `1` e `64`.

## Palette e ordem canônica

`palette` é a lista sem duplicatas, em ordem estritamente crescente, dos `serverId` usados na
região. `ground` e os stacks referenciam essa lista por índice, não por `serverId` direto. Assim,
uma entrada de `ground` igual a `0` significa `palette[0]`.

As coleções ordenadas são sempre estritamente crescentes; empate é rejeitado:

| Coleção | Ordem | Unicidade |
|---|---|---|
| `palette` | valor do `serverId` | valores sem repetição |
| `floors` | `z` crescente | um andar por `z` |
| `objectsBelow` / `objectsAbove` | `i` crescente | um registro por camada e célula |
| `collision` | `i` crescente | um índice por célula |
| `transitions.entries` | `from.z`, `from.y`, `from.x` | um `from` por célula |
| `spawns.groups` | `center.z`, `center.y`, `center.x` | um grupo por centro |

Os índices esparsos precisam estar no intervalo `[0, width * height)`. A ausência de uma entrada é
ausência de objeto ou colisão; um índice fora do intervalo é schema inválido.

## Transições

Uma entrada é um par dirigido `from → to`. Os dois pontos são locais à região, precisam existir em
andares extraídos e não podem ser iguais. Um salto de mais de um andar é inválido. A propriedade
`dropped` registra quantas transições foram descartadas pelo extrator por destino fora da região,
terreno bloqueado ou andar ausente. Ela é um contador inteiro não negativo; PB-04-01 congelou o
valor esperado como `0`, e PB-04-04 reconcilia esse valor com a extração real.

O contrato descreve dados, não executa a transição. A regra de disparo automático ao entrar no tile,
o `transitionGuard` e a resolução de ocupação pertencem ao kernel da task PB-04-05.

## Spawns

Um grupo declara `center`, `radius` de `0..15` e pelo menos um slot. Cada slot preserva a identidade
de conteúdo `creatureKey`, o `blueprintId` consumido pelo kernel, offsets inteiros relativos ao
centro e `respawnTicks` positivo.

O XML de origem declara `spawntime` em segundos. A conversão congelada é:

```text
respawnTicks = spawntimeSeconds * 1000 / 50
```

O resultado precisa ser inteiro; por exemplo, `90` segundos produz `1800` ticks. O leitor de XML e
o extrator rejeitam valores que não dividem exatamente por `50 ms`; este contrato recebe apenas o
inteiro já convertido.

`SpawnTable.maxLiveActors` é o teto global da hunt. O sorteio determinístico entre células livres,
o adiamento de um nascimento e os eventos `spawn/deferred` e `spawn/capped` pertencem ao kernel,
não ao schema.

## HuntDefinition e fronteira do kernel

`HuntDefinition` compõe a região, as transições, os spawns e os blueprints. A validação verifica:

- cada `blueprintId` de slot e `playerBlueprintId` existe em `blueprints`;
- centros de grupo e `playerStart` estão dentro de um andar extraído;
- `playerStart` não ocupa uma célula listada em `collision`;
- origem e destino das transições estão dentro da região.

Esta é a fronteira que conhece Tibia: `regionId`, `huntId`, `serverId` na palette e
`creatureKey` permanecem no contrato de conteúdo. O blueprint é reutilizado como o
`ActorBlueprint` do contrato do kernel, mas `packages/simulation` não importa `HuntDefinition`, não
conhece palette, `serverId`, `creatureKey`, asset ou path.

## Diagnósticos

Os validadores públicos devolvem `{ ok: true, value }` ou `{ ok: false, diagnostics }`. Cada
diagnóstico tem `code`, `message` e `path`. A lista é determinística: primeiro por caminho (com
segmentos numéricos comparados numericamente), depois por código e, por fim, por mensagem.

| Código | Uso |
|---|---|
| `SIM_SCHEMA_INVALID` | tipo, campo desconhecido, inteiro inválido, ordem/duplicidade genérica, índice esparso fora da região ou contador inválido |
| `HUNT_REGION_OUT_OF_BUDGET` | largura ou altura acima de `96`, ou mais de `3` andares |
| `HUNT_UNKNOWN_BLUEPRINT` | slot de spawn ou jogador referencia blueprint ausente |
| `HUNT_TRANSITION_INVALID` | transição auto-referente, fora de ordem, `from` duplicado, salto acima de um andar ou ponto fora da região |
| `HUNT_SPAWN_OUT_OF_REGION` | centro de grupo fora da região, `playerStart` fora da região ou sobre colisão |
| `HUNT_PALETTE_INDEX_INVALID` | `ground` ou stack referencia índice ausente na palette |

Schemas são estritos em todos os níveis. Um campo não declarado em região, andar, transição,
grupo, slot ou hunt produz `SIM_SCHEMA_INVALID`.

## Tabela de flags de tile — PB-04-03

`packages/content/src/generated/tile-flags.json` é a tabela versionada de flags por `serverId`,
derivada do snapshot local por `tools/tile-flags`. Ela cobre **todos** os `serverId` declarados em
`appearances.dat`, não apenas os da região, para que mudar a bounding box não obrigue a regerá-la.

### Origem de cada campo

`appearances.dat` é protobuf puro; os números de campo vêm de
`references/canary/src/protobuf/appearances.proto` e são lidos por um decodificador próprio e
mínimo (`tools/tile-flags/proto.ts`), sem nenhuma biblioteca de protobuf no workspace.

| Campo | Origem | Número | Semântica |
|---|---|---|---|
| `serverId` | `Appearance.id` | `1` | identidade do objeto |
| `ground` | `AppearanceFlags.bank` | `1` | presença da mensagem `AppearanceFlagBank` |
| `blocking` | `AppearanceFlags.unpass` | `13` | bloqueia passagem |
| `clip` | `AppearanceFlags.clip` | `2` | desenhado sobre o chão |
| `bottom` | `AppearanceFlags.bottom` | `3` | camada inferior |
| `top` | `AppearanceFlags.top` | `4` | desenhado acima do ator |
| `unmove` | `AppearanceFlags.unmove` | `14` | não movível |
| `avoid` | `AppearanceFlags.avoid` | `16` | evitado por pathfinding |
| `elevation` | `AppearanceFlags.height.elevation` | `27` → `1` | elevação; ausente vale `0` |
| `floorChange` | `items.xml`, atributo `floorchange` | — | mudança de andar; ausente vale `null` |

Somente a coleção `Appearances.object` (campo `1`) é lida. `outfit`, `effect` e `missile` são
ignoradas na tabela de tiles. Flag ausente vale `false`; flag presente com valor `0` também vale
`false`. Campo desconhecido dentro de `AppearanceFlags` é pulado por wire type e não corrompe as
flags conhecidas.

### Colisão

**Colisão é exatamente `unpass`.** `avoid`, `unmove`, `clip` e `elevation` são registrados na
tabela para consumo futuro, mas **não** participam da decisão de colisão nesta versão. Qualquer
task que queira ampliar a regra precisa de decisão de supervisor e bump explícito.

### Vocabulário de `floorchange`

O conjunto aceito é exatamente o `TileStatesMap` de
`references/canary/src/items/functions/item/item_parse.hpp`:

| Valor | Estado em Canary |
|---|---|
| `down` | `TILESTATE_FLOORCHANGE_DOWN` |
| `north` | `TILESTATE_FLOORCHANGE_NORTH` |
| `south` | `TILESTATE_FLOORCHANGE_SOUTH` |
| `southalt` | `TILESTATE_FLOORCHANGE_SOUTH_ALT` |
| `east` | `TILESTATE_FLOORCHANGE_EAST` |
| `eastalt` | `TILESTATE_FLOORCHANGE_EAST_ALT` |
| `west` | `TILESTATE_FLOORCHANGE_WEST` |

`southalt` e `eastalt` são estados distintos em Canary, **não** apelidos de `south`/`east`: em
`src/items/tile.cpp` eles são consultados no tile de baixo durante a subida. O snapshot usa os dois
em cinco itens de escada (`855`, `856`, `7888`, `20255`, `20256`).

Canary **não** define `up`; o valor não ocorre em `items.xml` e não pertence ao conjunto. Um valor
fora da tabela acima é erro nomeando o id e o valor, nunca uma transição silenciosamente descartada.

Faixas `fromid`/`toid` expandem para todos os ids da faixa. O mesmo id declarado duas vezes com
valores diferentes é erro; com o mesmo valor é tolerado. Um `floorchange` cujo id não existe em
`appearances.dat` é erro, não vira entrada órfã.

### Formato canônico

O JSON é canônico e reprodutível byte a byte a partir do mesmo snapshot:

- chaves em ordem alfabética, no topo e em cada entrada;
- sem espaço supérfluo — uma única linha, sem indentação;
- somente inteiros, booleanos, strings e `null`; nenhum float;
- `entries` estritamente ordenado por `serverId`;
- newline final.

O sidecar `tile-flags.sha256` guarda o SHA-256 do arquivo em hexadecimal minúsculo com newline
final. O Biome não formata `packages/content/src/generated/**`; o arquivo **nunca** é reformatado à
mão.

### Identidade `serverId == clientId`

A resolução de asset do PB-02 por `clientId` depende de `serverId == clientId`. O snapshot não traz
`items.otb`, isto é, não existe tabela de tradução: identidade é o único mapeamento possível.
`tools/tile-flags/cli.ts verify-ids` prova o que a pipeline realmente consome e falha com
`HUNT_ID_MISMATCH`, nomeando o `serverId` e o que foi encontrado, quando:

- um id com `floorchange` não existe em `appearances.object`;
- uma identidade congelada pelo PB-02 não existe na coleção correspondente
  (`clientId` → `object`, `lookType` → `outfit`, `effectId` → `effect`, `missileId` → `missile`).

Medido no snapshot `157e6f9e` em 2026-08-14: `42107` objetos em `appearances.dat`, `37526` ids em
`items.xml`, `32937` resolvidos, `434` ids com `floorchange` — **todos resolvidos** — e as cinco
identidades do PB-02 presentes, `3031` entre elas. Nenhum diagnóstico.

Os `4589` ids de `items.xml` sem objeto correspondente **não** são divergência de identidade, e sim
ausência: `4203` são `RESERVED SPRITE` e `386` são itens depreciados, `empty sprite`, `unknown item`
ou conteúdo mais novo que este build de `appearances.dat`. Nenhum deles carrega `floorchange`.
Quais ids ocorrem de fato no mapa só é conhecido após o recorte da região, então **PB-04-04** é
responsável por confirmar que todo id da região extraída resolve na palette.

### Política de regeneração da tabela de flags

```bash
node tools/tile-flags/cli.ts build --source-root <canary> --output packages/content/src/generated/tile-flags.json
```

Regenerar exige o snapshot e reescreve JSON e sidecar juntos. `--check` não escreve nada, devolve
exit `1` na divergência e imprime o primeiro offset divergente. `corepack pnpm content:tileflags:check`
roda essa verificação a partir de `HUNTBOUND_CANARY_SOURCE` e **não** entra em `check` nem em
`verify`, porque depende de um snapshot ausente em checkout limpo. O que entra no gate agregado é
`corepack pnpm content:tileflags:sidecar`, comparação do sidecar contra o arquivo, que não precisa
do snapshot e roda dentro de `content:check`.

## Extração da região — PB-04-04

`tools/map-extractor` converte offline o recorte congelado do OTBM em `MapRegion`,
`TransitionTable`, `SpawnTable` e `HuntDefinition`. Nenhuma biblioteca de OTBM entra no workspace: o
leitor é próprio, mínimo e decodifica somente o que a extração consome.

### Formato OTBM lido

O formato é o que `references/remeres-map-editor/source/filehandle.cpp` escreve:

| Elemento | Bytes |
|---|---|
| Identificador de versão | 4 bytes no início do arquivo, ignorados |
| Início de nó | `0xFE` |
| Fim de nó | `0xFF` |
| Escape | `0xFD` seguido do byte literal |
| Tipo do nó | primeiro byte da faixa de propriedades, já desescapado |

A árvore usada é `root → OTBM_MAP_DATA(2) → OTBM_TILE_AREA(4) → OTBM_TILE(5) | OTBM_HOUSETILE(14) →
OTBM_ITEM(6)`. Uma `tile area` declara `u16 baseX`, `u16 baseY`, `u8 baseZ` e endereça seus tiles por
offsets de um byte, isto é, cobre `256 × 256` tiles. `OTBM_HOUSETILE` traz `u32 houseid` entre os
offsets e os atributos. Dentro do tile são lidos `OTBM_ATTR_TILE_FLAGS(3)`, pulado, e
`OTBM_ATTR_ITEM(9)`, que em OTBM v2 é só o `u16` do id. Atributo de tile não previsto é erro
nomeando o atributo, nunca um comprimento adivinhado.

Regras congeladas do leitor:

- **O escape vale dentro das propriedades.** `0xFD 0xFE` é `0xFE` literal e não abre nó; `0xFD 0xFF`
  é `0xFF` literal e não fecha nó; `0xFD 0xFD` é `0xFD` literal. Escape no último byte do buffer é
  arquivo truncado e lança erro, em vez de ler além do fim. Essa é a fonte clássica de corrupção
  silenciosa e tem teste próprio.
- **O mapa nunca vira árvore em memória.** `readOtbmTiles` percorre os nós por offset e descarta o
  que cai fora da caixa. `readOtbmTree` existe só para fixtures pequenas.
- **O descarte é por tile, não por área.** Uma `tile area` cujo canto está fora da caixa mas que
  contém tiles dentro dela é processada; só a filtragem grosseira por interseção de área evita
  descer nela.
- **Só filhos diretos empilham no tile.** Um contêiner escreve seu conteúdo como neto do tile, e
  esse conteúdo nunca entra na pilha da célula. `OTBM_TILE_ZONE(19)` também não é item.
- Os itens saem na ordem do arquivo: primeiro os inlinados em `OTBM_ATTR_ITEM`, depois os nós
  `OTBM_ITEM` filhos.

### Classificação em camadas

Para cada célula da caixa, em cada andar extraído:

| Situação | Resultado |
|---|---|
| Primeiro item com `ground` | vira `ground` |
| Item com `top` | vai para `objectsAbove` |
| Demais itens | vão para `objectsBelow`, preservando o empilhamento |
| Qualquer item com `blocking`, chão incluído | põe o índice em `collision` |
| Nenhum item com `ground` | célula é **vazia**: entra em `collision`, não recebe objeto e seus itens não entram na palette |

Colisão é exatamente `tile-flags.blocking`, isto é, `unpass`. `avoid`, `unmove`, `clip` e elevação
continuam sem influenciar colisão.

`ground` é denso e cada entrada precisa ser um índice válido de palette; o contrato proíbe sentinela
negativa. A célula vazia é codificada pelo `serverId` **`0`**, que não é item real em Tibia e por
isso é o único valor capaz de representar "vazio" sem afirmar um chão que não existe. Ele entra na
palette **apenas** quando a região tem pelo menos uma célula vazia e, por ordenação, ocupa o índice
`0`. Cada célula vazia emite `HUNT_EMPTY_TILE`, que é diagnóstico informativo e não bloqueia.

Um `serverId` presente na região e ausente de `tile-flags.json` emite `HUNT_ID_MISMATCH` e **bloqueia
a extração**, conforme a herança registrada por PB-04-03.

### Destinos de transição

Os destinos vêm de `Tile::queryDestination` em `references/canary/src/items/tile.cpp` e coincidem com
a tabela congelada na spec:

| `floorChange` | Destino |
|---|---|
| `down` | `(x, y, z + 1)` |
| `north` | `(x, y - 1, z - 1)` |
| `south` | `(x, y + 1, z - 1)` |
| `east` | `(x + 1, y, z - 1)` |
| `west` | `(x - 1, y, z - 1)` |
| `southalt` | `(x, y + 2, z - 1)` |
| `eastalt` | `(x + 2, y, z - 1)` |

A spec listava `up (escada) → (x, y - 1, z - 1)`, valor que PB-04-03 provou não existir em Canary e
removeu do vocabulário; geometricamente ele era idêntico a `north`. Em troca entraram `southalt` e
`eastalt`, cujos deslocamentos de duas células saem da mesma função de Canary — a mesma autoridade
que PB-04-03 usou para congelar o vocabulário. Ambos ocorrem de fato no snapshot (itens `855` e
`856`).

Regras congeladas:

- `down` vence os valores de subida na mesma célula, como no `if / else if` de Canary; os valores de
  subida acumulam seus deslocamentos.
- Cada célula produz **no máximo uma** transição, então duas entradas nunca compartilham `from`.
- Destino fora da região, em andar não extraído ou em célula de colisão **derruba** a transição,
  incrementa `TransitionTable.dropped` e emite `HUNT_TRANSITION_DROPPED` com o `from` no `path`.
- As entradas saem ordenadas por `from.z`, `from.y`, `from.x`.

### Spawns e blueprints

Um grupo entra na tabela quando seu **centro** está dentro da região e de um andar extraído; cada
slot sobrevive quando sua posição absoluta também está. Slot fora da região vira
`HUNT_SPAWN_OUT_OF_REGION`; criatura listada em `excludedCreatures` é omitida em silêncio; qualquer
outra criatura fora da seleção vira `HUNT_UNKNOWN_CREATURE`. `spawntime` converte por
`segundos * 1000 / 50` e um valor que não divide exatamente vira `HUNT_SPAWNTIME_NOT_DIVISIBLE`.
Grupo que perde todos os slots é descartado, porque o schema exige pelo menos um.

`maxLiveActors` é `min(64, total de slots)`. Os blueprints são mínimos porque PB-04 não tem combate:
`player` é `inert` com `stepCooldownTicks` `2` e cada criatura é `wander` com `3`, os mesmos valores
que o fixture PB-03 já exercitava. Derivar cooldown de estatística de criatura é trabalho de PB-05.
`playerStart` é a célula caminhável mais próxima do centro do primeiro grupo de spawn, no andar
desse grupo, com empate resolvido por `(y, x)`.

O resultado passa obrigatoriamente por `validateHuntDefinition` antes de ser escrito. Falha de schema
é falha da extração, nunca motivo para afrouxar o schema.

### Formato e regeneração

São quatro arquivos em `packages/content/src/generated/hunts/<hunt>/`, cada um com sidecar
`.sha256`: `region.json` (`MapRegion`), `transitions.json` (`TransitionTable`), `spawns.json`
(`SpawnTable`) e `hunt.json` (`HuntDefinition`). O JSON é canônico no mesmo padrão de
`tile-flags.json`: chaves em ordem alfabética em todos os níveis, linha única sem indentação,
somente inteiros seguros, booleanos, strings e `null`, e newline final. O Biome já não formata
`packages/content/src/generated/**`.

```bash
node tools/map-extractor/cli.ts build --selection <selection.json> --source-root <canary> --tile-flags packages/content/src/generated/tile-flags.json --output packages/content/src/generated/hunts/<hunt>
```

`--check` não escreve, devolve exit `1` na primeira divergência e imprime o arquivo e o offset. A
CLI recusa a escrita quando existe diagnóstico bloqueante e quando `TransitionTable.dropped` diverge
de `expectedDroppedTransitions` da seleção. `corepack pnpm hunt:extract:check` roda a verificação a
partir de `HUNTBOUND_CANARY_SOURCE` e fica **fora** de `check` e `verify`;
`corepack pnpm hunt:extract:sidecar` compara os quatro sidecars sem precisar do snapshot e entra em
`content:check` quando os artefatos existirem.

### Bloqueio aberto: o mapa da hunt não está no snapshot

A região congelada **ainda não foi extraída**. Medido em 2026-08-14 com o próprio leitor:

- `data-canary/world/canary.otbm` tem `115541` tile areas em `x ∈ [256, 20479]`, `y ∈ [0, 20223]`.
  Ele é o mapa de demonstração do Canary, não o mapa global; `data-canary/world/canary-monster.xml`
  é `<monsters />` vazio e `canary-npc.xml` situa os spawns em `x ≈ 1943..5854`.
- `otservbr-monster.xml` situa a hunt em `x = 33002..33030`, `y = 31995..32027`, andares `8` e `9`,
  coordenadas do mapa global `otservbr.otbm`, que **não existe** no snapshot.
- Nenhum dos 33 `.otbm` do snapshot cobre a caixa congelada nos andares `8` e `9`. Os únicos dois
  com interseção em `x`/`y` — `world_changes/fury_gates/venore.otbm` e `.../edron.otbm` — têm só o
  andar `7` e são remendos decorativos de uma área.

Isto é, `config.lua.dist` declarar `mapName = "otservbr"` significa que o servidor carregaria
`otservbr.otbm`; não significa que `canary.otbm` seja esse mapa. O par
`canary.otbm` ↔ `otservbr-monster.xml` registrado em `docs/playbooks/PB-04/STATE.md` está incorreto.

O leitor foi validado contra o arquivo real de 19,7 MB em uma janela povoada do próprio
`canary.otbm` (`x = 4980..5029`, `y = 4980..5029`, andares `6` e `7`): `4159` tiles em `1,3 s`,
`329` ids distintos, **nenhum ausente** de `tile-flags.json`, palette de `312`, `50` transições,
`30` derrubadas, `1065` células vazias e `HuntDefinition` aprovada por `validateHuntDefinition`.
Itens `855` (`southalt`) e `856` (`eastalt`) aparecem nessa janela, o que confirma que a geometria
dos estados `_ALT` era necessária.
