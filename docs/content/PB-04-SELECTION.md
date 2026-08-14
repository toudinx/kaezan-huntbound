# PB-04 — Seleção congelada da primeira hunt

**Hunt:** `hunt:tibia:venore-rotworm-cave`  
**Fonte de rota:** [Venore Rotworm Cave — TibiaRoute](https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave)  
**Snapshot usado na medição:** `references/canary` local, lido em 2026-08-14  
**Ferramenta de revalidação:** `tools/hunt-selection/cli.ts`

## Decisão

A seleção congelada usa o agrupamento superior de Rotworms que aparece nos dois andares
`z = 8` e `z = 9`. A caixa é absoluta, inclusiva e tem origem local futura no canto
`(minX, minY)`:

| Campo | Valor medido |
|---|---:|
| `minX..maxX` | `33002..33030` |
| `minY..maxY` | `31995..32027` |
| Largura | `29` tiles |
| Altura | `33` tiles |
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
| Região localizável e extraível | A seleção declara coordenadas Tibia absolutas `33002..33030 × 31995..32027`, nos andares 8 e 9; a caixa tem `29 × 33`, dentro de `96 × 96`. O mapa local é `data-canary/world/canary.otbm`; `config.lua.dist` declara `mapName = "otservbr"`, pareando o mapa com `data-otservbr-global/world/otservbr-monster.xml`. |
| Tiles, objetos, outfits e efeitos necessários | O snapshot contém `canary.otbm` (19.718.948 bytes), `data/items/appearances.dat` (4.862.287 bytes) e `data/items/items.xml` (3.722.590 bytes; 345 ocorrências de `floorchange`). O dump também contém `data/XML/outfits.xml` com `looktype="131" name="Knight"`. PB-04-01 não requer efeito de combate: a hunt não tem combate, spell ou projétil; `attachedeffects.xml` existe no dump (465 bytes) e nenhum ID de efeito é importado pela seleção. |
| Não depende de party, quest chain, world event ou serviço não implementado | O artefato congela apenas mapa, andares e a tabela de Rotworms; não há campos ou dependências de party, quest, evento ou serviço. A página informa apenas os requisitos de rota Rope/Shovel, que não são uma dependência de runtime desta task. |
| Cabe no budget da ADR-001 | `floors.length = 2 ≤ 3`, `width = 29 ≤ 96` e `height = 33 ≤ 96`. Os tetos de entradas/bytes do pack e atores vivos são gates posteriores de PB-04-07/PB-04-09; não são inventados nesta decisão de seleção. |

## Revalidação

Com o snapshot local presente, a execução foi:

```powershell
node --no-warnings --experimental-transform-types tools/hunt-selection/cli.ts check `
  --selection packages/content/src/selections/pb-04-venore-rotworm-cave.json `
  --source-root C:\Kaezan\kaezan-huntbound\references\canary
```

Resultado: exit `0`, `width=29`, `height=33`, `floors=[8,9]`, `spawnGroups=8`,
`spawnSlots=12`, `creatureNames=["Rotworm"]` e `diagnostics=[]`.

O script raiz equivalente é `hunt:selection:check`, usando
`--source-root-env HUNTBOUND_CANARY_SOURCE`. Ele fica fora de `check` e `verify` porque um
checkout limpo não contém `references/canary`; a verificação é opt-in e nunca usa um path literal
de máquina no repositório.

`references/` permanece somente como entrada local do snapshot. Nenhum byte desse diretório é
copiado para o repositório.

## Correção de PB-04-04 — a caixa não é extraível deste snapshot

A linha "Região localizável e extraível" do checklist acima afirma que `data-canary/world/canary.otbm`
e `data-otservbr-global/world/otservbr-monster.xml` são o mesmo par, porque `config.lua.dist` declara
`mapName = "otservbr"`. **Isso está incorreto.** `mapName` nomeia o mapa que o servidor carregaria —
`otservbr.otbm` — e esse arquivo não existe no snapshot. O que o dump traz é `canary.otbm`, o mapa de
demonstração do Canary, cujos tiles ficam em `x ∈ [256, 20479]` e `y ∈ [0, 20223]` e cujo companheiro
`canary-monster.xml` é `<monsters />` vazio.

Medido em 2026-08-14 pelo leitor de `tools/map-extractor`: nenhum dos 33 `.otbm` do snapshot cobre
`x = 33002..33030`, `y = 31995..32027` nos andares `8` e `9`. A seleção continua congelada e válida
contra o XML de spawn; o que falta é o mapa. `expectedDroppedTransitions` permanece `0` porque a
extração real ainda não aconteceu. O bloqueio e as saídas possíveis estão em
`docs/playbooks/PB-04/STATE.md`, bloqueio B1.
