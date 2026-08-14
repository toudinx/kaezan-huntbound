# PB-04 — Estado operacional

**Playbook:** `docs/playbooks/PB-04/README.md`

**Estado geral:** bloqueado em PB-04-04 pelo bloqueio B1 — o mapa que contém a hunt congelada não
está no snapshot local. O extrator foi entregue e está verde; a região não foi extraída. PB-04-01,
PB-04-02, PB-04-03 e PB-04-05 concluídas. PB-03 foi fechado em
`7097b67` como `APPROVED_WITH_WARNINGS` pela auditoria integrada PB-03-08, sobre o commit auditado
`f885535`, sem blockers e sem task corretiva.

**Última atualização:** 2026-08-14

**Próximas tasks elegíveis:** nenhuma sem resolver B1. PB-04-04, PB-04-06 e PB-04-07 dependem da
resolução de B1; PB-04-06 já tem o kernel v3 de que precisa.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-04-01 | done | `codex/pb04-01-hunt-selection` | `e6e3119` | `docs/content/PB-04-SELECTION.md` + CLI exit 0 no snapshot local |
| PB-04-02 | done | `codex/pb04-02-world-contracts` | `d5352eb` | `packages/contracts/src/hunt/**` + `MAP_REGION_CONTRACT.md` |
| PB-04-03 | done | `codex/pb04-03-tile-flags` | `53d6d09` | `packages/content/src/generated/tile-flags.json` + `verify-ids` exit 0 no snapshot |
| PB-04-04 | blocked | `codex/pb04-04-map-extractor` | (extrator) | `tools/map-extractor/**` verde; região congelada não extraída — mapa ausente do snapshot |
| PB-04-05 | done | `codex/pb04-05-kernel-floors-spawn` | (ver handoff) | kernel v3 com andares, transições e `S4 spawn`; `events.golden.jsonl` do PB-03 byte-idêntico |
| PB-04-06 | blocked (parcial) | `codex/pb04-06-hunt-replay` | `5e98e91` | `buildHuntScenario` + `loadHuntDefinition` verdes; golden real bloqueado por B1 |
| PB-04-07 | pending | `codex/pb04-07-hunt-assets` | — | — |
| PB-04-08 | pending | `codex/pb04-08-hunt-scene` | — | — |
| PB-04-09 | pending | `codex/pb04-09-hunt-browser-qa` | — | — |
| PB-04-10 | pending | `codex/pb04-10-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Spec aprovada: `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-01 `closed`; PB-02 `closed` em `1134fc8`; PB-03 `closed` em `7097b67`.
- Hunt: `hunt:tibia:venore-rotworm-cave`.
- `SIMULATION_SCHEMA_VERSION` sobe de `2` para `3`; `SIMULATION_RULES_VERSION` sobe de `1` para `2`.
- Streams RNG passam a ser `movement`, `ai`, `scenario` e `spawn`.
- Fixture da sessão: `pb-04-hunt-session`, seed `1a2b3c4d5e6f7a8b`, `600` ticks, retomada em `313`.
- Golden do PB-03 a preservar: `events.golden.jsonl`
  `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`.
- Dependências externas previstas: **nenhuma**.

## Fatos medidos no snapshot local em 2026-08-14

Registrados para que PB-04-01 comece de evidência e não de suposição:

- `references/canary/data-canary/world/canary.otbm`: OTBM v2, 40000×40000, item major `3` / minor
  `62`, salvo com Remere's Map Editor 3.8.0.
- ~~`references/canary/config.lua.dist` declara `mapName = "otservbr"`, isto é, o OTBM acima e
  `data-otservbr-global/world/otservbr-monster.xml` são o mesmo par.~~ **Corrigido por PB-04-04 em
  2026-08-14:** `mapName = "otservbr"` diz que o servidor carregaria `otservbr.otbm`, arquivo que
  **não existe** no snapshot. `canary.otbm` é o mapa de demonstração do Canary, com tiles em
  `x ∈ [256, 20479]` e `y ∈ [0, 20223]`, e seu companheiro `canary-monster.xml` é `<monsters />`
  vazio. Ver o bloqueio B1 abaixo.
- `otservbr-monster.xml` declara 1134 grupos de spawn de Rotworm, 1575 rotworms no total.
- Na janela `x ∈ (32800, 33150)`, `y ∈ (31950, 32300)`: 72 grupos e 95 rotworms, sendo 48 em `z = 8`
  e 47 em `z = 9`.
- `references/canary/data/items/appearances.dat` existe (4 862 287 bytes) e `items.otb` **não**
  existe no snapshot; as flags de tile vêm do protobuf.
- `references/canary/data/items/items.xml` declara 345 ocorrências do atributo `floorchange`.

## Decisões operacionais

- Tasks 01, 02, 07, 08 e 09 usam GPT-5.6 Luna `xhigh` por padrão.
- Tasks 03, 04, 05 e 06 usam GPT-5.6 Sol `xhigh` por atravessarem formato binário, schema congelado
  ou golden.
- PB-04-10 usa Claude Opus 5, com fallback GPT-5.6 Sol `xhigh`, e prefere validador diferente do
  implementador.
- Fluxo padrão é serial com fast-forward automático e limpeza.
- PB-04-03 e PB-04-05 só entram em paralelo por ativação explícita do supervisor; PB-04-06 é o
  integrador único desse par. PB-04-07 pode paralelizar com 05/06 e é integrada por PB-04-08.
- Golden divergente nunca é reescrito para "fazer passar". Regeneração exige causa identificada e,
  quando a semântica mudar, bump explícito de `SIMULATION_RULES_VERSION`.
- Qualquer uso de relógio, aleatoriedade global ou float no kernel é falha bloqueante.
- Qualquer vazamento de identidade Tibia (`serverId`, `clientId`, `lookType`, `huntId`, `regionId`)
  para `packages/simulation` é falha bloqueante.

## Handoffs

PB-04-01 acrescenta a seleção congelada, o validador e o relatório abaixo. A próxima task elegível
é PB-04-02; PB-04-04 continua responsável por confirmar ou corrigir `expectedDroppedTransitions`.

## PB-04-01 — handoff concluído

- **Status:** done; conclusão serial em worktree isolada, pronta para integração fast-forward.
- **Commit da feature:** `e6e3119` (`docs: freeze the first hunt selection`).
- **Artefatos:** `packages/content/src/selections/pb-04-venore-rotworm-cave.json`,
  `tools/hunt-selection/**` e `docs/content/PB-04-SELECTION.md`.
- **Seleção medida:** `x=33002..33030`, `y=31995..32027`, largura `29`, altura `33`, andares
  `[8,9]`, `8` grupos e `12` slots de Rotworm; `4` slots em `z=8`, `8` em `z=9`, zero espécies
  estranhas e `expectedDroppedTransitions=0` por delegação ao PB-04-04.
- **Comandos e exit codes:** baseline `corepack pnpm verify` `0`; RED inicial do validador `1`
  por módulo ausente; GREEN `corepack pnpm exec vitest run --config tools/hunt-selection/vitest.config.ts tools/hunt-selection` `0` com `12/12` testes; `biome check tools/hunt-selection packages/content` `0`; `format:check` `0`; typecheck local `tools/hunt-selection/tsconfig.json` `0`; CLI real e `corepack pnpm hunt:selection:check` `0`; verify completo `0` com `9/9` testes browser.
- **Snapshot e política:** `references/` foi apenas lido; nenhum byte foi copiado. O script
  `hunt:selection:check` ficou fora de `check` e `verify` porque requer
  `HUNTBOUND_CANARY_SOURCE`.
- **Modelo/effort efetivos:** Codex/GPT-5 nesta sessão; effort efetivo não é exposto pela
  interface. Modelo sugerido pelo roteiro: GPT-5.6 Luna `xhigh`.
- **Skills e validador:** `using-superpowers`, `brainstorming`, `writing-plans`,
  `using-git-worktrees`, `executing-plans`, `test-driven-development` e
  `verification-before-completion`; validação por Vitest focado, Biome, TypeScript, CLI real e
  `corepack pnpm verify`.

## PB-04-02 — handoff concluído

- **Status:** done; implementação serial em worktree isolada, pronta para integração fast-forward.
- **Commit da feature:** `d5352eb` (`feat: define hunt world contracts`). O plano foi registrado em
  `793f6b5` (`docs: plan PB-04 world contracts`).
- **Artefatos:** `packages/contracts/src/hunt/types.ts`, `schemas.ts`, `diagnostics.ts`, `index.ts`,
  `worldContracts.test.ts`, `packages/contracts/src/index.ts` e
  `docs/content/MAP_REGION_CONTRACT.md`.
- **API publicada:** `MapRegion`, `TransitionTable`, `SpawnTable`, `HuntDefinition`,
  `MapRegionSchema`, `TransitionTableSchema`, `SpawnTableSchema`, `HuntDefinitionSchema`,
  `validateMapRegion` e `validateHuntDefinition`. `KernelBlueprint` reutiliza o
  `ActorBlueprint` existente; nenhum arquivo de `packages/contracts/src/simulation/` foi alterado.
- **RED/GREEN:** RED inicial do contrato por módulo ausente, exit `1`; GREEN final
  `corepack pnpm --filter @huntbound/contracts exec vitest run src/hunt/worldContracts.test.ts`, exit
  `0`, com `49/49` testes; typecheck do pacote, exit `0`.
- **Gates:** `corepack pnpm --filter @huntbound/contracts test` exit `0` com `90/90` testes;
  `architecture:check`, `biome check packages/contracts`, `format:check` e `git diff --check`, todos
  exit `0`; `corepack pnpm verify` exit `0`, incluindo `9/9` testes browser e os digests do fixture
  PB-03 preservados.
- **Diagnósticos:** códigos novos mantidos na fronteira `hunt` para preservar sem alteração a união
  de diagnósticos de PB-03; ordenação por `path`, depois `code`, depois `message`.
- **Provas de mutação:** desabilitar temporariamente cada comparação derrubou o teste correspondente:
  palette, floors, `objectsBelow`, `objectsAbove`, collision, ordem de `TransitionTable`, duplicata de
  `from`, ordem de `SpawnTable` e centro duplicado. Cada mutação foi restaurada; o focused suite voltou
  a `49/49`.
- **Modelo/effort efetivos:** Codex/GPT-5 nesta sessão; effort efetivo não é exposto pela interface.
  Modelo sugerido pelo roteiro: GPT-5.6 Luna `xhigh`.
- **Skills e validador:** `using-superpowers`, `brainstorming`, `writing-plans`,
  `using-git-worktrees`, `executing-plans`, `test-driven-development` e
  `verification-before-completion`; validador independente por Vitest, TypeScript, Biome,
  architecture gate e `corepack pnpm verify`.
- **Próximas tasks elegíveis:** PB-04-03 e PB-04-05; PB-04-04 continua dependente de PB-04-03 e
  responsável por reconciliar `expectedDroppedTransitions`.

## PB-04-03 — handoff concluído

- **Status:** done; conclusão serial em worktree isolada, integrada por fast-forward.
- **Commit da feature:** `53d6d09` (`feat: derive tile flags from the local snapshot`).
- **Artefatos:** `tools/tile-flags/**` (`proto.ts`, `appearances.ts`, `items.ts`, `floorChanges.ts`,
  `table.ts`, `identity.ts`, `cli.ts`, `types.ts`, `testing/protoFixture.ts`),
  `packages/content/src/generated/tile-flags.json` + `.sha256`,
  `packages/content/src/sources/canary-157e6f9e.json` e `docs/content/MAP_REGION_CONTRACT.md`.
- **Tabela gerada:** `42107` entradas, `6 363 102` bytes, JSON canônico de linha única.
  `sha256` do arquivo `a373f0d11a2fee973d672f25e3bcc472d04aaaf6c839209e21176e97b461dbe6`;
  `appearancesSha256` `aa44a154f30c7ed59acc25f246286396e4043851ef0b54ef3cf3951e46d1ce50`;
  `itemsXmlSha256` `b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8`, idêntico ao
  que o source lock já registrava — a leitura em `latin1` preserva os bytes originais.
- **RED/GREEN:** cada módulo entrou RED por ausência (`proto`, `appearances`, `floorChanges`,
  `table`, `identity`, `cli`) e saiu GREEN; final `79/79` testes em `6` arquivos.
- **Provas de mutação:** cinco mutações derrubaram testes e foram revertidas — colisão lendo
  `unmove` no lugar de `unpass` (`3` falhas), valor de `floorchange` desconhecido aceito (`2`),
  `floorchange` órfão tolerado (`1`), `entries` sem ordenação (`1`) e gate de identidade sempre `ok`
  (`3`). Suite restaurada em `79/79`.
- **Comandos e exit codes:** `vitest run --config tools/tile-flags/vitest.config.ts` `0`;
  `tsc --project tools/tile-flags/tsconfig.json` `0`; `biome check tools/tile-flags packages/content`
  `0`; `format:check` `0`; `git diff --check` `0`; CLI `build` `0`; `build --check` `0` na segunda
  execução, sem escrita; `verify-ids` `0`; `content:check` `0`; `corepack pnpm verify` `0` com `9/9`
  testes browser.
- **Identidade `serverId == clientId`:** provada e sem diagnóstico. `42107` objetos em
  `appearances.dat`, `37526` ids em `items.xml`, `32937` resolvidos, `434` ids com `floorchange` —
  todos resolvidos — e as cinco identidades congeladas pelo PB-02 presentes na coleção correta
  (`3031` em `object`, `131` e `26` em `outfit`, `12` em `effect`, `36` em `missile`). O snapshot não
  traz `items.otb`, logo não existe tabela de tradução e identidade é o único mapeamento possível.
- **Decisão de supervisor registrada:** o conjunto congelado de `floorchange` da task card divergia
  do snapshot. `items.xml` usa `southalt` e `eastalt` em cinco itens de escada (`855`, `856`, `7888`,
  `20255`, `20256`), e Canary os trata como estados distintos (`TILESTATE_FLOORCHANGE_SOUTH_ALT` /
  `_EAST_ALT` em `item_parse.hpp`), não como apelidos. Canary também **não** define `up`, que não
  ocorre no XML. Por decisão do supervisor o vocabulário passou a ser exatamente o `TileStatesMap`:
  `down`, `north`, `south`, `southalt`, `east`, `eastalt`, `west`. `up` foi removido da união.
- **Herança para PB-04-04:** `4589` ids de `items.xml` não têm objeto em `appearances.dat` — `4203`
  `RESERVED SPRITE` e `386` depreciados/`empty sprite`/`unknown item`/conteúdo mais novo. **Nenhum
  deles carrega `floorchange`**, então não afetam a tabela. Isso é ausência, não divergência de
  identidade. Quais ids ocorrem de fato no mapa só é conhecido após o recorte; **PB-04-04 deve
  confirmar que todo `serverId` da região extraída resolve na palette** e reportar qualquer ausência
  como bloqueio.
- **Gates novos:** `content:tileflags:check` (exige `HUNTBOUND_CANARY_SOURCE`, fora de `check` e
  `verify`) e `content:tileflags:sidecar`, que entra em `content:check` e não precisa do snapshot. A
  suíte `tools/tile-flags` foi acrescentada ao script `test` da raiz, então entra no gate agregado.
- **Escopo:** `purpose` de `appearances.dat` no source lock ficou `items` porque ampliar a união de
  `purpose` exigiria tocar `tools/content-catalog/**`, fora do escopo desta task.
- **Modelo/effort efetivos:** Claude Opus 5 nesta sessão. Modelo sugerido pelo roteiro: GPT-5.6 Sol
  `xhigh`.
- **Skills e validador:** `using-superpowers`, `test-driven-development` e
  `verification-before-completion`; validação por Vitest focado, mutação dirigida, TypeScript, Biome,
  CLI real contra o snapshot e `corepack pnpm verify`.
- **Próximas tasks elegíveis:** PB-04-04 e PB-04-05.

## PB-04-04 — handoff parcial, bloqueado

- **Status:** blocked. O extrator está completo e verde; a **região congelada não foi extraída**
  porque o mapa que a contém não está no snapshot. Nenhum arquivo em
  `packages/content/src/generated/hunts/**` foi produzido.
- **Artefatos entregues:** `tools/map-extractor/**` (`otbm.ts`, `region.ts`, `transitions.ts`,
  `spawns.ts`, `extract.ts`, `encode.ts`, `output.ts`, `cli.ts`, `types.ts`,
  `testing/otbmFixture.ts`, `testing/tileFlagsFixture.ts`), scripts `hunt:extract`,
  `hunt:extract:check` e `hunt:extract:sidecar`, a suíte no script `test` da raiz e a seção
  "Extração da região — PB-04-04" de `docs/content/MAP_REGION_CONTRACT.md`.
- **Não entregue:** `region.json`, `transitions.json`, `spawns.json`, `hunt.json`, os quatro
  sidecars e seus hashes; a reconciliação de `expectedDroppedTransitions`, que continua `0` na
  seleção; e o encaixe de `hunt:extract:sidecar` em `content:check`, que não pode entrar em gate
  sem artefato.

## PB-04-04 — proveniência da região (complemento)

Segunda entrega da task, sobre o commit do extrator. O objetivo foi **dar origem congelada a todos
os IDs da palette** e reduzir B1 a uma troca de duas linhas.

- **Source lock:** `packages/content/src/sources/canary-157e6f9e.json` ganhou
  `data-canary/world/canary.otbm` (`purpose: "map"`,
  `a3a1389bc7e8ba63080858023fba0eaded5253b6f6bd3d66b0f3c5112c987361`) e
  `data-otservbr-global/world/otservbr-monster.xml` (`purpose: "spawn"`,
  `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7`). A união de `purpose` passou a
  aceitar `appearances`, `map` e `spawn`.
- **O extrator não conhece mais caminho de mapa.** `tools/map-extractor/sources.ts` localiza o OTBM e
  a declaração de spawn pelo `purpose` no lock e recusa a extração com `HUNT_SOURCE_NOT_LOCKED`,
  `HUNT_SOURCE_AMBIGUOUS`, `HUNT_SOURCE_MISSING`, `HUNT_SOURCE_PATH_INVALID` ou
  `HUNT_SOURCE_HASH_MISMATCH`. O resumo de `build` publica os digests de `map`, `spawn` e
  `tileFlags`.
- **Gate novo:** `corepack pnpm hunt:sources:check` (exige `HUNTBOUND_CANARY_SOURCE`, fora de `check`
  e `verify`). Contra o snapshot real: exit `0`, os dois digests acima confirmados.
- **Defeito pré-existente corrigido:** `content:canary:check` falhava **em `main` antes desta
  entrega** com `source-lock.selection-mismatch`. A causa era PB-04-03 ter trancado
  `appearances.dat` com `purpose: "items"` sem acrescentá-lo a `sourceFiles` da seleção congelada do
  PB-01 — o que PB-04-03 registrou como adiado por escopo. `appearances.dat` passou a ter
  `purpose: "appearances"` e `importCanarySlice` passa a comparar `sourceFiles` apenas com os
  `purpose` que a fatia curada realmente importa. `content:canary:check` agora sai `0`.
- **RED/GREEN:** `resolveHuntSources` e as novas rotas da CLI entraram RED por ausência; o invariante
  da fatia entrou RED pela entrada `map`/`spawn` rejeitada. Final `100/100` em `9` arquivos na suíte
  do extrator e `4/4` em `ImportCanarySlice.test.ts`.
- **Não muda:** B1 continua aberto e a região continua não extraída. Nenhum arquivo em
  `packages/content/src/generated/hunts/**` foi produzido.

### B1 — o mapa da hunt não existe no snapshot (bloqueante)

Medido em 2026-08-14 com o próprio leitor, sobre os 33 `.otbm` do snapshot:

- `data-canary/world/canary.otbm` (19 718 948 bytes) tem `115541` tile areas em `x ∈ [256, 20479]`,
  `y ∈ [0, 20223]`, andares `0..15`. É o mapa de demonstração do Canary:
  `canary-monster.xml` é `<monsters />` vazio, `canary-npc.xml` põe os NPCs em `x ≈ 1943..5854` e
  `canary-house.xml` tem uma única casa em `(19977, 19988)`.
- A hunt congelada vive em `x = 33002..33030`, `y = 31995..32027`, andares `8` e `9` — coordenadas
  de `otservbr.otbm`, o mapa global, que **não está no snapshot**.
- **Nenhum** dos 33 mapas cobre a caixa congelada nos andares `8` e `9`. Só
  `world_changes/fury_gates/venore.otbm` e `world_changes/fury_gates/edron.otbm` intersectam a caixa
  em `x`/`y`, ambos com uma única área e apenas no andar `7`.

A inferência de PB-04-01/PB-04-03 de que `canary.otbm` e `otservbr-monster.xml` eram o mesmo par
estava incorreta; `mapName = "otservbr"` em `config.lua.dist` nomeia o mapa que o servidor
carregaria, não o que o dump contém.

Isso é a condição de parada declarada da task, e a decisão é de supervisor. As saídas possíveis:

1. acrescentar `otservbr.otbm` sob a raiz do snapshot e trocar `relativePath` e `sha256` da entrada
   `purpose: "map"` do source lock; em seguida `corepack pnpm hunt:sources:check` e
   `corepack pnpm hunt:extract`. **Nenhuma linha de código muda** — preserva PB-04-01 inteiro;
2. reabrir PB-04-01 e reselecionar a hunt dentro de `canary.otbm`, o que reescreve
   `packages/content/src/selections/pb-04-venore-rotworm-cave.json`, `docs/content/PB-04-SELECTION.md`
   e a hunt escolhida na spec — e exige uma tabela de spawn, que `canary-monster.xml` não tem.

### Evidência de que o extrator está correto

Como `canary.otbm` é um OTBM v2 real de 19,7 MB, ele serviu de prova do leitor sobre bytes reais,
em uma janela povoada do próprio mapa (`x = 4980..5029`, `y = 4980..5029`, andares `6` e `7`):

- `4159` tiles lidos em `1,3 s`, `1659` no andar `6` e `2500` no `7`;
- `329` `serverId` distintos, **nenhum ausente** de `tile-flags.json` — a confirmação que PB-04-03
  delegou a esta task vale para esta amostra real;
- palette de `312`, `50` transições, `30` derrubadas, `1065` células vazias, `2260` células de
  colisão e `1567` pilhas em `objectsBelow`;
- `HuntDefinition` aprovada por `validateHuntDefinition`, sem `HUNT_SCHEMA_INVALID`;
- itens `855` (`southalt`) e `856` (`eastalt`) ocorrem na janela, confirmando que os estados `_ALT`
  precisavam de geometria própria.

- **RED/GREEN:** cada módulo entrou RED por ausência (`otbm`, `readOtbmTiles`, `region`,
  `transitions`, `spawns`, `encode`, `extract`, `cli`) e saiu GREEN; final `87/87` testes em `8`
  arquivos.
- **Decisões derivadas e registradas em `MAP_REGION_CONTRACT.md`:**
  - célula vazia é codificada pelo `serverId` `0` na palette, porque `ground` é denso, exige índice
    válido e o contrato proíbe sentinela negativa; `0` não é item real em Tibia e só entra na
    palette quando a região tem célula vazia;
  - `southalt` e `eastalt` recebem `(x, y + 2, z - 1)` e `(x + 2, y, z - 1)` de
    `Tile::queryDestination`, a mesma função de Canary que PB-04-03 usou para congelar o
    vocabulário; o `up` da tabela da spec não existe em Canary e era idêntico a `north`;
  - `down` vence os valores de subida na mesma célula, como no `if / else if` de Canary;
  - blueprints mínimos e sem combate: `player` `inert`/`2`, criatura `wander`/`3`, os valores que o
    fixture PB-03 já exercitava;
  - `playerStart` é a célula caminhável mais próxima do centro do primeiro grupo de spawn;
  - a saída são **quatro** arquivos, com `transitions.json` separado, porque `MapRegion` não tem
    campo de transições e a acceptance pede quatro sidecars.
- **Comandos e exit codes:** `vitest run --config tools/map-extractor/vitest.config.ts` `0` com
  `87/87`; `tsc --project tools/map-extractor/tsconfig.json` `0`;
  `biome check tools/map-extractor packages/content` `0`; `format:check` `0`; `git diff --check` `0`;
  `corepack pnpm verify` `0`. A CLI real contra o snapshot devolve `1` com
  `HUNT_SCHEMA_INVALID: Region has no walkable cell to start the player on`, que é o sintoma do
  bloqueio B1: a caixa congelada não tem um único tile no snapshot.
- **Escopo:** nenhum byte de `references/` entrou no repositório. `packages/simulation`,
  `packages/contracts`, `packages/assets` e `apps/game` não foram tocados.
- **Modelo/effort efetivos:** Claude Opus 5 nesta sessão. Modelo sugerido pelo roteiro: GPT-5.6 Sol
  `xhigh`.
- **Skills e validador:** `using-superpowers`, `test-driven-development` e
  `verification-before-completion`; validação por Vitest focado, TypeScript, Biome, CLI real contra
  o snapshot e `corepack pnpm verify`.
- **Próximas tasks elegíveis:** PB-04-05, que não depende desta. PB-04-06 e PB-04-07 continuam
  bloqueadas por B1, porque consomem a região extraída.

## PB-04-05 — handoff concluído

- **Status:** done; conclusão serial em worktree isolada, integrada por fast-forward.
- **Artefatos novos:** `packages/simulation/src/kernel/spawnTable.ts`, `errors.ts`, `spawn.test.ts`,
  `transition.test.ts` e `packages/contracts/src/simulation/worldV3.test.ts`.
- **Versões:** `SIMULATION_SCHEMA_VERSION` `2 → 3`, `SIMULATION_RULES_VERSION` `1 → 2`.
- **`events.golden.jsonl` NÃO mudou.** Hash preservado
  `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`, provado por
  `git diff --stat packages/test-fixtures/simulation/pb03/events.golden.jsonl`, saída **vazia**, e
  pelo digest devolvido por `tools/replay/cli.ts run`.
- **Hashes da fixture PB-03, antes → depois:**
  - `scenario.json` `056d8696…70b3f1` → `72d006552742691fbb71cd41bc84a80aebf0afd27faef027e358b4d92fcc23e9`;
  - `commands.jsonl` `c1e815c6…0ce0d9c` → `88ec73de434a7bf092c68bb3a3601caaef1bfca2b59d9b84f20f334462749d66`;
  - `snapshot.golden.json` `9d0c3a24…e5f7260` → `84528f5246c156b65e46343d713851d064943c3550281bba0ab0e5d18d10d341`;
  - `events.golden.jsonl` **inalterado**.
- **Vetores golden de RNG:** `ai`, `movement` e `scenario` idênticos aos de PB-03-02, provado em
  `random.test.ts`. Vetor novo de `spawn` para a seed `0f1e2d3c4b5a6978`:
  `c4e46756 97d5fe29 e8f89ef4 2187ecdc 9b4bb0ce e6e26967 236ed8ca ed821c3f`.
- **RED/GREEN:** contratos v3 (`8` falhas → `112/112`); stream `spawn` (`3` → `14/14` em
  `random.test.ts`); grid multi-floor (suíte não carregava → `26/26`); transições (`6` → `11/11`);
  spawn (`9` → `12/12`); fronteira de identidade (`1` → `8/8`). Final por pacote:
  `@huntbound/contracts` `112/112` em `6` arquivos, `@huntbound/simulation` `155/155` em `14`
  arquivos, `tools/replay` `31/31` em `2` arquivos, `node --test` de arquitetura `23/23`,
  `apps/game` `48/48`, browser `9/9`.
- **Provas de mutação:** anular `transitionGuard` no snapshot e zerar `spawnSlots` derrubaram, cada
  uma, a varredura de fronteiras `0..30`; ambas foram revertidas e a suíte voltou a `16/16`. A
  primeira tentativa da varredura **não** pegou o guard, o que expôs uma semântica errada e forçou a
  decisão de supervisor abaixo.
- **Decisão de supervisor registrada — semântica do `transitionGuard`:** o guard só é estado vivo se
  o passo que sai da célula guardada também for coberto por ele. Na leitura em que o guard é limpo
  antes de avaliar a transição, ele não altera comportamento nenhum, o snapshot não o observa e a
  varredura passa com ele descartado — o oposto do que a spec exige. A regra congelada é: o guard é
  limpo pelo passo que sai da célula guardada, **e esse passo não dispara transição**. Está
  documentada em `docs/simulation/KERNEL_CONTRACT.md`, seção "Transições".
- **Decisões derivadas:**
  - `KernelScenario` v3 ganhou também `maxLiveActors`, além de `floors`, `transitions` e
    `spawnGroups`: `spawn/capped` precisa de um teto, e cravar `64` no kernel colocaria orçamento de
    conteúdo dentro da simulação;
  - `groupIndex`/`slotIndex` são derivados da ordem canônica `(z, y, x)` de centro e de slot, não da
    ordem de declaração — é o que a acceptance pede ao exigir duas ordens de entrada equivalentes.
    Para a ordem ser total, o schema passou a exigir centro de grupo único e células de slot únicas
    dentro do grupo;
  - a checagem de `transitionGuard` contra o grid mora em `restoreSimulationKernel`, não no schema:
    o snapshot não declara terreno;
  - `maxLiveActors` vale só para `S4`; `scenario/spawn-actor` externo continua governado pelas
    rejeições de `apply`, o que é o que mantém o journal do PB-03 intacto.
- **Warning W3 fechado:** o script `test` da raiz passou a enumerar `simulation-boundaries.test.ts` e
  `content-boundaries.test.ts` em `node --test`, então a regra nova de identidade Tibia entra no gate
  agregado.
- **Comandos e exit codes:** `--filter @huntbound/contracts test` `0`;
  `--filter @huntbound/simulation test` `0`; `vitest run --config tools/replay/vitest.config.ts` `0`;
  `typecheck` `0`; `tsc --project tools/replay/tsconfig.json` `0`; `architecture:check` `0`;
  `biome check` `0`; `format:check` `0`; `git diff --check` `0`; `simulation:check` `0` **duas vezes
  seguidas**; `verify` `0` **duas vezes seguidas**, com a árvore byte-idêntica entre elas.
- **Escopo:** nada fora de `packages/contracts/src/simulation/**`, `packages/simulation/src/**`,
  `packages/test-fixtures/simulation/pb03/**`, `tools/architecture/simulation-boundaries.*`,
  `tools/replay/**`, `package.json` e docs. `packages/content`, `packages/assets`,
  `tools/map-extractor`, `tools/tile-flags` e `apps/game` não foram tocados. Nenhum comando novo
  entrou e `commandPriority` está inalterado.
- **Modelo/effort efetivos:** Claude Opus 5 nesta sessão. Modelo sugerido pelo roteiro: GPT-5.6 Sol
  `xhigh` ou Claude Opus 5.
- **Skills e validador:** `using-superpowers`, `test-driven-development` e
  `verification-before-completion`; validação por Vitest focado, mutação dirigida, `node --test`,
  TypeScript, Biome, CLI real de replay e `corepack pnpm verify` em duas execuções.
- **Próximas tasks elegíveis:** nenhuma sem resolver B1. PB-04-06 tem o kernel de que precisa e fica
  bloqueada apenas pela região extraída.

## PB-04-06 — handoff parcial, bloqueado por B1

- **Status:** implementação da fronteira conteúdo/kernel concluída; a task permanece bloqueada para
  o cenário real, replay golden e gate agregado porque PB-04-04 não entregou o mapa da seleção.
- **Commit:** `5e98e91` (`feat: project hunts into kernel scenarios`).
- **Artefatos entregues:** `packages/content/src/hunts/buildHuntScenario.ts`,
  `loadHuntDefinition.ts`, `index.ts`, exports em `packages/content/src/index.ts` e
  `buildHuntScenario.test.ts`.
- **Comportamento:** colisão row-major vira `blockedTiles` em ordem `(y, x)`; transições são
  preservadas; slots usam `center + offset` sem copiar `creatureKey`; `scenarioId` é
  `scenario:${huntId}`; `scenarioRevision` é `huntRevision`; o jogador inicial usa facing `s`;
  a saída passa por `validateKernelScenario`; `seed` permanece no replay e não entra no cenário.
- **Provas:** RED por módulo ausente no runner de `@huntbound/content`, exit `1`; GREEN com `7/7`
  testes novos, `60/60` testes do pacote content, typecheck do pacote e `biome check`, todos exit
  `0`; `git diff --check`, exit `0`.
- **Prova do bloqueio:** o extractor com `C:\Kaezan\kaezan-huntbound\references\canary` devolve
  exit `1` com `HUNT_SCHEMA_INVALID` em `hunt.playerStart`/`playerStart` (não há célula caminhável
  na caixa congelada). `packages/content/src/generated/hunts/venore-rotworm-cave/` continua
  ausente; nenhum `scenario.json`, command log, golden ou hash foi fabricado.
- **Não entregue deliberadamente:** fixture `pb-04-hunt-session`, cobertura de 600 ticks,
  retomada `0..600`, quatro SHA-256, `hunt:check` e atualização do contrato de replay dependente
  do cenário real.
- **Skills/validador:** `using-superpowers`, `brainstorming`, `writing-plans`,
  `using-git-worktrees`, `executing-plans`, `test-driven-development`; validação por Vitest,
  TypeScript, Biome e extractor real contra o snapshot local. O modelo/effort efetivos não são
  expostos pelo runtime desta sessão.
- **Próxima ação elegível:** retomar PB-04-06 após PB-04-04 disponibilizar e versionar o mapa que
  cobre `x=33002..33030`, `y=31995..32027`, andares `8` e `9`; então gerar e verificar os goldens
  sem alterar esta projeção.

## Bloqueios

- **B1 (bloqueante):** o mapa que contém a hunt congelada não está no snapshot. Detalhe, medição e
  saídas possíveis no handoff de PB-04-04 acima. Bloqueia PB-04-04, PB-04-06 e PB-04-07.
- ~~Warning W3 herdado da auditoria PB-03-08: o script `test` da raiz enumera apenas
  `asset-boundaries.test.ts` e `check-boundaries.test.ts` em `node --test`.~~ **Fechado por PB-04-05
  em 2026-08-14:** o enumerador passou a incluir `content-boundaries.test.ts` e
  `simulation-boundaries.test.ts`, e a regra nova de identidade Tibia roda em gate agregado.
- Warnings W1, W2, W4, W5 e W6 da auditoria PB-03-08 seguem abertos e não bloqueantes; estão em
  `docs/playbooks/PB-03/artifacts/acceptance-report.md` §10 e não devem ser absorvidos por uma task
  do PB-04 sem card próprio.
- Os warnings `FIXABLE` herdados de PB-02 estão em
  `docs/playbooks/PB-02/artifacts/acceptance-report.md` §11; não bloqueiam PB-04 e não devem ser
  absorvidos sem card próprio.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
