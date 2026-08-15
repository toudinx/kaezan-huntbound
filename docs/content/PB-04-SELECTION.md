# PB-04 — Seleção congelada da primeira hunt

**Hunt:** `hunt:tibia:venore-rotworm-cave`  
**Fonte de rota:** [Venore Rotworm Cave — TibiaRoute](https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave)  
**Snapshot usado na medição:** `references/canary` local, lido em 2026-08-14  
**Ferramenta de revalidação:** `tools/hunt-selection/cli.ts`

## Decisão

A seleção congelada usa o agrupamento superior de Rotworms que aparece nos dois andares
`z = 8` e `z = 9`. A caixa absoluta abaixo é apenas o envelope de material-fonte do OTBM;
a geometria jogável é produzida deterministicamente pela receita versionada em `layout` e tem
origem local no canto `(0, 0)`:

| Campo | Valor medido |
|---|---:|
| `minX..maxX` | `33002..33030` |
| `minY..maxY` | `31995..32027` |
| Largura do envelope OTBM | `29` tiles |
| Altura do envelope OTBM | `33` tiles |
| Largura autorada | `24` tiles |
| Altura autorada | `24` tiles |
| Andares | `8, 9` |
| Grupos de Rotworm | `8` |
| Slots de Rotworm | `12` |
| Slots em `z = 8` | `4` |
| Slots em `z = 9` | `8` |
| Outras espécies na caixa e nos andares selecionados | `0` |
| `expectedDroppedTransitions` | `0` — confirmação pertence ao PB-04-04 |

O XML completo contém 51.896 grupos de spawn, 83.286 slots, 1.134 grupos de Rotworm e 1.575
slots de Rotworm. Na janela de pesquisa `x ∈ (32800, 33150)`, `y ∈ (31950, 32300)` foram
medidos 72 grupos e 95 slots de Rotworm, com 48 no andar 8 e 47 no andar 9. O agrupamento
selecionado é o menor agrupamento contíguo útil observado nessa janela: seus pontos ocupam
`x=33002..33030` e `y=31995..32027`; o agrupamento seguinte começa em `y=32068`, fora da
caixa. Todos os 12 slots usam `spawntime="90"`, equivalente a `1.800` ticks de 50 ms.

Nenhuma espécie estranha precisa ser registrada em `excludedCreatures`: a caixa escolhida não
contém outro slot nos andares selecionados. Se o XML mudar e uma espécie não selecionada entrar
na caixa, a CLI falhará com `HUNT_UNKNOWN_CREATURE`; somente uma entrada explícita em
`excludedCreatures` com razão `absent from PB-01 catalog` a remove da tabela.

## Checklist do roteiro

| Item | Evidência executável ou medida |
|---|---|
| URL individual registrada | A seleção aponta para `https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave`, uma página individual, não para o índice de hunts. |
| Nome e nível recomendado | A página identifica **Venore Rotworm Cave** e informa nível recomendado `8`; os mesmos valores estão no JSON. |
| Compatibilidade solo | A página lista a rota para `EK` entre as vocações solo; o contrato congela a vocação-alvo como `vocation:tibia:knight`. |
| Todas as criaturas existem no snapshot/catalogo | A tabela contém apenas `creature:tibia:rotworm`; PB-01 registra `Rotworm`, fonte `data-otservbr-global/monster/vermins/rotworm.lua`, `lookType: 26`, e o catálogo gerado contém a chave estável. A CLI revalida a chave contra `packages/content/src/generated/pb-01-contract-coverage.json`. |
| Região localizável e extraível | A seleção declara o envelope Tibia absoluto `33002..33030 × 31995..32027`, nos andares 8 e 9; a caixa de material tem `29 × 33`, dentro de `96 × 96`. A receita `../../layouts/hunts/venore-rotworm-cave.json` remixa esse envelope para uma região autorada conectada de `24 × 24`. O mapa local é `data-canary/world/canary.otbm`; `config.lua.dist` declara `mapName = "otservbr"`, pareando o mapa com `data-otservbr-global/world/otservbr-monster.xml`. |
| Tiles, objetos, outfits e efeitos necessários | O snapshot contém `canary.otbm` (19.718.948 bytes), `data/items/appearances.dat` (4.862.287 bytes) e `data/items/items.xml` (3.722.590 bytes; 345 ocorrências de `floorchange`). O dump também contém `data/XML/outfits.xml` com `looktype="131" name="Knight"`. PB-04-01 não requer efeito de combate: a hunt não tem combate, spell ou projétil; `attachedeffects.xml` existe no dump (465 bytes) e nenhum ID de efeito é importado pela seleção. |
| Não depende de party, quest chain, world event ou serviço não implementado | O artefato congela apenas mapa, andares e a tabela de Rotworms; não há campos ou dependências de party, quest, evento ou serviço. A página informa apenas os requisitos de rota Rope/Shovel, que não são uma dependência de runtime desta task. |
| Cabe no budget da ADR-001 | `floors.length = 2 ≤ 3`, envelope OTBM `29 × 33 ≤ 96 × 96` e geometria autorada `24 × 24 ≤ 96 × 96`. Os tetos de entradas/bytes do pack e atores vivos são gates posteriores de PB-04-07/PB-04-09; não são inventados nesta decisão de seleção. |

## Revalidação

Com o snapshot local presente, a execução foi:

```powershell
node --no-warnings --experimental-transform-types tools/hunt-selection/cli.ts check `
  --selection packages/content/src/selections/hunts/venore-rotworm-cave.json `
  --source-root C:\Kaezan\kaezan-huntbound\references\canary
```

Resultado: exit `0`, envelope `width=29`, `height=33`, `floors=[8,9]`, `spawnGroups=8`,
`spawnSlots=12`, `creatureNames=["Rotworm"]` e `diagnostics=[]`. A receita autorada deriva a
região jogável final com `width=24`, `height=24`, `floors=[8,9]` e um componente walkable por
andar.

O script raiz equivalente é `hunt:selection:check`, usando
`--source-root-env HUNTBOUND_CANARY_SOURCE`. Ele fica fora de `check` e `verify` porque um
checkout limpo não contém `references/canary`; a verificação é opt-in e nunca usa um path literal
de máquina no repositório.

`references/` permanece somente como entrada local do snapshot. Nenhum byte desse diretório é
copiado para o repositório.

## Resultado de PB-04-FIX-01 — a geometria autorada foi extraída

Medição final em 2026-08-15, usando o envelope OTBM de `data-otservbr-global/world/otservbr.otbm`
(`a80de1dd…`) e a receita `packages/content/src/layouts/hunts/venore-rotworm-cave.json`,
produziu `1152` células autoradas (`24 × 24 × 2`), palette de `133`, `417` células vazias,
`104` walkable em `z=8`, `152` walkable em `z=9`, `2` transições em sentidos opostos,
`8` grupos e `12` slots de Rotworm. Cada andar tem exatamente um componente walkable e
`expectedDroppedTransitions` permanece `0`.

O SHA-256 da receita é `180aab488ab80426ce5b9c7c5e5472db450a83f44e864abbb16cc1ef3f18702e`.
A fidelidade à coordenada original não é requisito: o envelope é material de origem, enquanto
a receita é a fonte de verdade da composição final.

A seção abaixo fica como histórico do diagnóstico que levou à instalação do mapa.

## Diagnóstico de PB-04-04 — a caixa não era extraível do snapshot original

A linha "Região localizável e extraível" do checklist acima afirma que `data-canary/world/canary.otbm`
e `data-otservbr-global/world/otservbr-monster.xml` são o mesmo par, porque `config.lua.dist` declara
`mapName = "otservbr"`. **Isso está incorreto.** `mapName` nomeia o mapa que o servidor carregaria —
`otservbr.otbm` — e esse arquivo não existe no snapshot. O que o dump traz é `canary.otbm`, o mapa de
demonstração do Canary, cujos tiles ficam em `x ∈ [256, 20479]` e `y ∈ [0, 20223]` e cujo companheiro
`canary-monster.xml` é `<monsters />` vazio.

Medido em 2026-08-14 pelo leitor de `tools/map-extractor`: nenhum dos 32 `.otbm` do snapshot cobre
`x = 33002..33030`, `y = 31995..32027` nos andares `8` e `9`. A varredura completa dos 32 mapas
(1 940 292 tiles) contra as 1703 áreas de spawn de criaturas do catálogo PB-01 encontrou apenas dois
remendos de 236 e 255 tiles num único andar, com três Snakes cada — nenhuma hunt viável. A seleção
continua congelada e válida contra o XML de spawn; o que falta é o mapa.
`expectedDroppedTransitions` permanece `0` porque a extração real ainda não aconteceu. O bloqueio e
as saídas possíveis estão em `docs/playbooks/PB-04/STATE.md`, bloqueio B1.

A seleção passou a declarar explicitamente as fontes de que depende, e por isso o pipeline falha
nomeando o arquivo ausente em vez de ler o mapa errado:

```json
"source": {
  "map": "data-otservbr-global/world/otservbr.otbm",
  "spawns": "data-otservbr-global/world/otservbr-monster.xml"
}
```

O arquivo mudou de `packages/content/src/selections/pb-04-venore-rotworm-cave.json` para
`packages/content/src/selections/hunts/venore-rotworm-cave.json`: o diretório `hunts/` é varrido
inteiro por `hunt:extract` e `hunt:sources:check`, então acrescentar uma hunt não exige script novo.
