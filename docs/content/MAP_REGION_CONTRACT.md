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
