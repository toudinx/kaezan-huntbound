# PB-04 — Estado operacional

**Playbook:** `docs/playbooks/PB-04/README.md`

**Estado geral:** **closed** como `APPROVED_WITH_WARNINGS` em `9f1c14c`. A auditoria original sobre
`307a3f0` permanece `REJECTED` no histórico; FIX-02/03/04 fecharam D1–D4. **PB-05 está liberado.**

**Última atualização:** 2026-08-16

**Atualização vigente:** reavaliação PB-04-10 sobre `9f1c14c`. `verify` exit `0` duas vezes, `29/29`
E2E sem flaky, `biome check .` exit `0`, D1 `20/20` com `--retries=0 --repeat-each=10`, hunt jogada
de fato (descida tick `113`, subida tick `148`). Próxima task: **PB-05-01**.

**Aceite de produto:** `APPROVED` pelo usuário em 2026-08-15, registrado em
`artifacts/product-acceptance.md`. A auditoria mediu que o profile `personal` não é gerável neste
workspace, então o aceite cobre a experiência jogável, não identidade visual. **B2 deixa de ser
bloqueante** e migra para pré-requisito de PB-07.

**Próxima etapa:** `PB-05-01`. **PB-05 está liberado.** Não iniciar neste chat.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-04-01 | done | `codex/pb04-01-hunt-selection` | `e6e3119` | `docs/content/PB-04-SELECTION.md` + CLI exit 0 no snapshot local |
| PB-04-02 | done | `codex/pb04-02-world-contracts` | `d5352eb` | `packages/contracts/src/hunt/**` + `MAP_REGION_CONTRACT.md` |
| PB-04-03 | done | `codex/pb04-03-tile-flags` | `53d6d09` | `packages/content/src/generated/tile-flags.json` + `verify-ids` exit 0 no snapshot |
| PB-04-04 | done | `codex/pb04-04-extract-region` | (ver handoff) | região congelada em `packages/content/src/generated/hunts/venore-rotworm-cave/**`, `dropped=0`, `--check` exit 0 |
| PB-04-05 | done | `codex/pb04-05-kernel-floors-spawn` | (ver handoff) | kernel v3 com andares, transições e `S4 spawn`; `events.golden.jsonl` do PB-03 byte-idêntico |
| PB-04-06 | done | `codex/pb04-06-hunt-replay` | `5e98e91` + FIX-01 | `packages/test-fixtures/hunt/**` + `hunt:check` |
| PB-04-07 | done | `codex/pb04-07-hunt-assets` | `5ae830e` | pack PB-04 sintético, profiles e seleção de chaves verificados |
| PB-04-08 | done | `codex/pb04-08-hunt-scene` | `e97f72b` | HuntScene, InputMap, câmera, projeção de camadas e bootstrap integrados |
| PB-04-09 | done | `codex/pb04-09-hunt-browser-qa` | (ver handoff) | `docs/playbooks/PB-04/artifacts/browser-qa.md` + 4 screenshots + `verify` exit `0` |
| PB-04-FIX-01 | done | — | `307a3f0` | `hunt:check` + QA Chromium; D2 da 1ª auditoria fechado por FIX-03 |
| PB-04-10 | done — 1ª rodada `REJECTED`; 2ª `APPROVED_WITH_WARNINGS` | `codex/pb04-10-integrated-gate` | (esta entrega, sobre `9f1c14c`) | `docs/playbooks/PB-04/artifacts/acceptance-report.md` |
| PB-04-FIX-02 | done | `codex/pb-04-fix-02-input-edge` | `6cd63c6` | `InputMap` edge/hold + pointer real; `verify` exit `0`, 29/29 E2E, digests inalterados |
| PB-04-FIX-03 | done | `codex/pb-04-fix-03-replay-hashes` | `911ce2f` + merge `695b6a7` | `hunt:hashes:check` exit 0; seção PB-04 em `REPLAY_CONTRACT.md` |
| PB-04-FIX-04 | done | `codex/pb-04-fix-04-gates-contratos` | `96c7628` + merge `6aeefec` | `biome check .` exit 0; `retries: 0`; `content-catalog` no `test` |

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

## PB-04-04 — pipeline multi-hunt (complemento 2)

Terceira entrega da task. Decisão de supervisor delegada ao executor, otimizando escalabilidade e
custo de acrescentar mapas novos.

- **Cada hunt declara suas fontes.** `HuntSelection` ganhou `source: { map, spawns }`, caminhos
  relativos à raiz do snapshot, validados por `validateHuntSelection` com `HUNT_SOURCE_INVALID`.
  O `purpose` do lock deixou de ser um seletor global: várias hunts podem vir de vários mapas, e o
  lock congela quantos forem necessários.
- **Layout escalável.** A seleção foi movida para
  `packages/content/src/selections/hunts/venore-rotworm-cave.json`. O diretório é varrido inteiro por
  `build-all` e por `sources`, e o diretório de saída vem do `key` da hunt, então acrescentar uma
  hunt **não exige script novo nem linha de código**: seleção + entradas no lock + `hunt:extract`.
- **Comandos:** `hunt:extract` e `hunt:extract:check` passaram a usar
  `build-all --selections … --output-root …`; `hunt:sources:check` verifica a proveniência de todas
  as hunts.
- **A falha agora é precisa.** Contra o snapshot real, `hunt:sources:check` sai `1` com
  `sources.map HUNT_SOURCE_NOT_LOCKED: The content source lock does not freeze the selected map:
  data-otservbr-global/world/otservbr.otbm`, nomeando a hunt. O pipeline não lê mais um mapa que
  ninguém pediu — que foi a causa raiz de B1 ter passado despercebido por PB-04-01 e PB-04-03.
- **Varredura exaustiva registrada:** os 32 `.otbm` do snapshot foram lidos inteiros
  (`1 940 292` tiles) e cruzados com as `1703` áreas de spawn de criaturas do catálogo PB-01.
  Cobertura total: `world_changes/fury_gates/thais.otbm` (255 tiles, 1 grupo, 3 Snakes, andar 7) e
  `world_changes/fury_gates/venore.otbm` (236 tiles, 3 grupos, 3 Snakes, andar 7). **Não existe hunt
  viável neste snapshot**, o que fecha a hipótese de reselecionar a caixa dentro do que já está
  presente.
- **RED/GREEN:** `resolveHuntSources` por caminho, `build-all`, `sources --selections` e a validação
  de `source` entraram RED e saíram GREEN. Final `104/104` no extrator e `16/16` em
  `tools/hunt-selection`.
- **Não muda:** B1 continua aberto e a região continua não extraída.

## PB-04-04 — concluída: região real extraída

Quarta e última entrega da task. **B1 resolvido sem nenhuma linha de código**, exatamente pelo
caminho que o complemento 2 preparou.

- **Origem do mapa:** `otservbr.otbm` já existia na máquina, em quatro cópias byte-idênticas
  (`184 776 037` bytes, `a80de1dd…`), vindas da distribuição `canary-3.4.1`. Nenhum download. O
  arquivo foi instalado em `references/canary/data-otservbr-global/world/otservbr.otbm` — que é
  gitignored — e congelado no source lock com `purpose: "map"`. A seleção já o nomeava.
- **Pareamento verificado:** o `otservbr-monster.xml` de `3.4.1` difere globalmente do snapshot
  `157e6f9e`, mas é **idêntico dentro da caixa congelada**: os mesmos `8` grupos, `12` slots de
  Rotworm, `spawntime="90"`, `4` em `z = 8` e `8` em `z = 9`. Por isso o XML já congelado foi
  mantido e os números de PB-04-01 seguem intactos.
- **Região extraída:** `1914` células (`29 × 33 × 2`), palette de `138`, `105` células vazias,
  `4` transições, **`0` derrubadas**, `8` grupos e `12` slots. `expectedDroppedTransitions` era `0`
  e a medição confirmou `0` — nenhuma reconciliação foi necessária.
- **Hashes congelados:** `region.json` `74bbd94a62c646be4115b1fa9ddf7ceced8dfba8cd3e7f90e2188a11e2a860f5`;
  `transitions.json` `3520964782905a4d7b00cf52398ff43a831a22a770a55d4c58f2e0d92a9bd2e7`;
  `spawns.json` `aa8b2062e0c9eb638f748b296d9d2e1b4675f3bc2538b218d1ce883cc869e3b5`;
  `hunt.json` `24e3b97e4d5b1fa53aba7c2f107d9b42d32735f0b1e6c35eb2850fd57c29bdb9`.
- **Gate novo em `content:check`:** `hunt:extract:sidecar` entrou no gate agregado agora que os
  artefatos existem; ele não precisa do snapshot.
- **Comandos e exit codes:** `hunt:sources:check` `0`; `hunt:extract` `0`; `hunt:extract:check` `0`
  na segunda execução, sem escrita; `hunt:extract:sidecar` `0`; `content:check` `0`;
  `content:canary:check` `0`; `hunt:selection:check` `0`; `corepack pnpm verify` `0` antes e depois
  da integração.
- **Escopo:** nenhum byte de `references/` entrou no repositório; só o JSON derivado, que a spec
  autoriza explicitamente a versionar.

### W7 — a hunt só desce (não bloqueante, pertence a PB-04-06)

O único item com `floorchange` dentro da caixa é o `385`, valor `down`, e **as quatro transições vão
de `z = 8` para `z = 9`**. Não há tile de subida porque, neste trecho, a volta em Tibia é feita por
script de ação (escada/corda), não por `floorchange` — ação não é geometria e não pertence a esta
extração. Nada foi derrubado, então os critérios de aceite de PB-04-04 estão satisfeitos.

O impacto é na cobertura obrigatória do fixture `pb-04-hunt-session`, que a spec descreve como "uma
transição em cada sentido". **PB-04-06 precisa decidir** entre usar `scenario/teleport-actor` para o
retorno ou reescrever essa linha de cobertura. Encolher ou deslocar a caixa não resolve: não existe
tile de subida por `floorchange` nas redondezas.

### B1 — o mapa da hunt não existia no snapshot (resolvido em 2026-08-14)

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

1. colocar `otservbr.otbm` em `data-otservbr-global/world/` sob a raiz do snapshot e acrescentar a
   entrada correspondente (`purpose: "map"`, com o SHA-256 medido) ao source lock; em seguida
   `corepack pnpm hunt:sources:check` e `corepack pnpm hunt:extract`. **Nenhuma linha de código
   muda** — a seleção já nomeia esse arquivo — e preserva PB-04-01 inteiro. É a saída recomendada;
2. ~~reselecionar a hunt dentro de um mapa presente~~ — **descartado com medição**: a varredura dos
   32 mapas contra as 1703 áreas de spawn do catálogo achou só dois remendos de um andar com três
   Snakes cada. Não há hunt viável a reselecionar.

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

## PB-04-08 — handoff concluido

- **Status:** done; implementacao serial em worktree isolada, com fast-forward pendente. Branch
  `codex/pb04-08-hunt-scene`; commit de implementacao `e97f72b` (`feat: render and drive the first
  hunt`).
- **Entrega:** `HuntScene` carrega `ResolvedAsset` por stable key, monta apenas o andar ativo na
  ordem `ground -> objectsBelow -> actors -> objectsAbove`, reage a `SimulationEvent`, interpola
  movimentos aceitos com o `SimulationHost.alpha`, troca andar do jogador e acompanha-o com camera
  deadzone clampada. `InputMap` cobre WASD/setas, diagonais, repeticao por `drain()` e D-pad DOM
  acessivel; `createHuntRuntime` usa `/assets/<profile>/pb04/catalog.json`.
- **Composicao:** `main.ts` valida o `hunt.json` gerado, constroi o cenario com seed
  `1a2b3c4d5e6f7a8b`, cria kernel/host, publica eventos no `SceneBridge` e preserva os probes
  test-only do PB-03. O catalogo PB-02 continua em `/assets/<profile>/catalog.json`; o staging
  adiciona PB-04 em subrota sem alterar a contagem legada de cinco assets.
- **RED/GREEN:** suite de `@huntbound/game` verde com `66/66` testes em `15` arquivos; os novos
  testes cobrem input, camera/interpolacao, camadas/eventos, D-pad, bootstrap e `alpha` do host.
  `corepack pnpm test` verde: suites raiz `7`, replay `31`, tile-flags `79`, map-extractor `104`,
  arquitetura `23`; pacotes contracts `112`, assets `44`, content `62` e simulation `155`.
- **Gates:** `assets:check`, `assets:pb04:hunt:check`, `simulation:check`, `typecheck`,
  `architecture:check`, `format:check`, `@huntbound/game build` e `git diff --check` terminaram
  com exit `0`. O scan de regras pedido (`rg` em runtime, excluindo testes) nao encontrou
  ocorrencias e terminou com exit `1` por conjunto vazio.
- **QA browser:** `qa:browser` terminou com `4` testes funcionais verdes e `5` falhas somente de
  screenshot no `shell.spec.ts`: os baselines legados esperam o grid do ShellScene, enquanto PB-04-08
  agora mostra a hunt e o D-pad. Nenhum console/page error ocorreu. A atualizacao desses baselines e
  os screenshots da hunt pertencem ao PB-04-09, portanto nao foram alterados nesta task.
- **Verify agregado:** `corepack pnpm verify` terminou com exit `1` exclusivamente pelo mesmo
  conjunto de cinco screenshots legados; format, assets, replay, arquitetura, typecheck, suites,
  build e content checks anteriores terminaram com exit `0`.
- **Skills e validador:** foram usados `using-superpowers`, `brainstorming`, `writing-plans`,
  `using-git-worktrees`, `executing-plans`, `test-driven-development`, `phaser-2d-game`,
  `game-ui-frontend` e `verification-before-completion`; validacao por Vitest, TypeScript, Biome,
  gates de arquitetura/assets/replay e Playwright existente.
- **Proxima task elegivel:** PB-04-09 — QA browser da hunt, incluindo screenshots, input touch e
  paridade/medicao que o card anterior deixa fora de escopo.

## PB-04-09 — handoff concluído

- **Status:** done; conclusão serial em worktree isolada, integrada por fast-forward.
- **Nota histórica:** o handoff abaixo registra o estado anterior ao PB-04-FIX-01; W11 foi fechado
  posteriormente pela fixture e pelo gate de replay versionados.
- **Artefatos:** `tests/e2e/hunt-replay.spec.ts`, `hunt-play.spec.ts`, `hunt-mobile.spec.ts`,
  `hunt-budget.spec.ts`, `hunt-screenshots.spec.ts`, `tests/e2e/support/huntSession.ts` +
  `huntSession.test.ts`, `tests/e2e/support/huntDriver.ts`, `apps/game/src/hunt/HuntProbe.ts` +
  `HuntProbe.test.ts`, `docs/playbooks/PB-04/artifacts/browser-qa.md` e as quatro screenshots em
  `docs/playbooks/PB-04/artifacts/screenshots/`.
- **Desvio de escopo declarado (decisão de supervisor):** PB-04-06 nunca produziu a fixture
  `pb-04-hunt-session` nem o script `hunt:check`, logo **não havia SHA-256 registrado** para comparar.
  A paridade foi provada de forma **diferencial** — mesma cena e mesmo command log executados em Node
  e em Chromium a cada corrida, comparados campo a campo. Nenhum golden foi fabricado e nenhum
  arquivo de fixture foi criado. Ver W11.
- **Paridade medida:** `scenario:hunt:tibia:venore-rotworm-cave`, seed `1a2b3c4d5e6f7a8b`, `600`
  ticks; SHA-256 do snapshot canônico
  `9b4fcd61bc957d31b7433d74ab4a9992f83c8cdd148cb85e03132857eda33a41`, `3122` eventos, tick final
  `600` — idênticos nos dois runtimes. A sessão exercita `22` passos aceitos do jogador, `1` transição
  de andar, recusas por `terrain` e por `occupied`, e os `12` atores do teto de spawn.
- **Jogabilidade:** provada por **teclado real via CDP** e por **pointer real no d-pad**, nunca
  chamando o kernel. Passo, parede, criatura, câmera e transição têm asserção própria, lidas do
  `HuntProbe` test-only (estado desenhado pela `HuntScene`) e do journal de eventos.
- **Prova de mutação:** neutralizar `InputMap.onKeyDown` derrubou os `4` testes que dependem de
  movimento e deixou vivos só os `2` estáticos; a mutação foi revertida. É o que separa "provei a
  cadeia input → comando → evento → pixel" de "provei o kernel de novo".
- **Orçamento medido (Fast 4G, cache frio, 8 corridas):** primeiro estado acionável
  **`4 090 – 4 602 ms`** contra o teto de `5 000 ms`; durante `10,4 s` de caminhada contínua houve
  **exatamente uma** long task ≥ 50 ms por corrida, de `51 – 63 ms`, sempre nos primeiros `15 – 36 ms`
  da caminhada (fronteira ocioso → input), nenhuma durante a caminhada estável. Passa, mas o boot já
  consome ~`84 %` do orçamento; o gargalo é o bundle (`1 570 KB` / `412 KB` gzip, ~`2 260 ms` de
  transferência). **Nada foi otimizado, reduzido ou desligado** — pertence a PB-10.
- **Screenshots:** quatro, uma por viewport obrigatório, nomes estáveis, sem mídia pessoal — o profile
  `test` serve um PNG sintético de 1 × 1 e 68 bytes para todas as chaves, e a spec falha se qualquer
  requisição tocar `/assets/personal/` ou `/assets/product/`. São artefato, não baseline de pixel;
  regenerar exige `HUNTBOUND_HUNT_SCREENSHOTS=write`.
- **Zero erro** de console, página, requisição e resposta HTTP ≥ 400 nos quatro viewports.
- **Baselines legadas:** as cinco de `shell.spec.ts` que PB-04-08 deixou desatualizadas foram
  regeneradas e confirmadas estáveis em três corridas; `verify` voltou a sair `0`.
- **Comandos e exit codes:** RED por sessão inexistente `1` → GREEN `0`; RED por probe ausente com
  `6` falhas → GREEN `6/6`, estável em `10 × repeat-each` (`60/60`); `format:check` `0`; `typecheck`
  `0`; `architecture:check` `0`; `test` `0`; `verify` `0` antes e depois da integração;
  `git diff --check` `0`. `hunt:check` **não foi executado porque não existe** (W11).
- **Findings novos:** W9 (chrome de canto morde o terço centro-inferior em `390 × 844`), W10
  (`biome check` vermelho em `main`, pré-existente), W11 (fixture e gate devidos por PB-04-06), W12
  (`tests/**` fora de qualquer gate de tipos). Detalhe e números em `artifacts/browser-qa.md` §10.
- **Modelo/effort efetivos:** Claude Opus 5 nesta sessão. Modelo sugerido pelo roteiro: GPT-5.6 Luna
  `xhigh`.
- **Skills e validador:** `using-superpowers`, `test-driven-development` e
  `verification-before-completion`; validação por Playwright real em Chromium, Vitest, mutação
  dirigida, `tsc` avulso sobre `tests/**`, Biome e `corepack pnpm verify`.
- **Próxima task elegível:** PB-04-10, com PB-04-06 reaberta antes do fechamento.

## PB-04-FIX-01 — handoff de correção

- **Status:** implementação automatizada concluída em `main`; aceite visual pessoal pendente.
- **Plano/design:** `docs/superpowers/plans/2026-08-15-pb-04-hunt-experience-corrections.md` e
  `docs/superpowers/specs/2026-08-15-pb-04-corrective-hunt-experience-design.md`.
- **Conteúdo:** recipe `packages/content/src/layouts/hunts/venore-rotworm-cave.json`; região `24 × 24`,
  pisos `z=8/9`, topologia `104/152` tiles caminháveis, um componente por piso, duas transições
  opostas e `12` slots de spawn.
- **Hashes de conteúdo:** recipe
  `180aab488ab80426ce5b9c7c5e5472db450a83f44e864abbb16cc1ef3f18702e`; região
  `a56697fd75a978ac2ccf270df44bf299de289076827be18ff5b2af0a8d6cf0c5`; pack de teste
  `1f5c9f849d2ba577d88bdc6b1b096018b5c74fd2d2d301df1925ca4eee6def6f`.
- **Replay:** `packages/test-fixtures/hunt/pb04/` congela `600` ticks e
  `packages/test-fixtures/hunt/pb04-respawn/` prova o respawn de `1800` ticks; ambos são verificados
  por `hunt:check` e têm sidecars/hash tables versionados.
- **Browser:** `27/27` testes Playwright passaram, incluindo quatro viewports, `visibleRows=11`,
  composição de ground, hold curto com um comando, BFS de descida/retorno e zero erros de runtime.
- **Aceite:** não criar `product-acceptance.md` até o usuário testar o profile pessoal. B2 permanece
  bloqueante: faltam `67` IDs reais no export externo e `HUNTBOUND_PERSONAL_ASSET_SOURCE` não está
  configurado neste workspace.
- **Próxima etapa:** após o reexport externo e a decisão do usuário, registrar aceite/rejeição e só
  então liberar PB-04-10.

## PB-04-10 — handoff da auditoria integrada

- **Status:** done. **Veredito `REJECTED`**, playbook mantido aberto.
- **Commit auditado:** `307a3f026c4bdc1238ef86df152d2708c3c394f8`, árvore limpa, worktree
  `codex/pb04-10-integrated-gate`.
- **Artefatos:** `artifacts/acceptance-report.md`, `artifacts/product-acceptance.md` e os três cards
  `PB-04-FIX-02`, `PB-04-FIX-03` e `PB-04-FIX-04`.
- **Passou:** `verify` exit `0` **duas vezes**, árvore byte-idêntica entre e depois;
  `simulation:check` `0`; `hunt:check` `0` **duas vezes com digests idênticos**; `architecture:check`
  `0`; golden do PB-03 `31f86d62…555888d4` byte-idêntico; as duas varreduras do kernel vazias
  (exit `1`); nenhuma mídia pessoal versionada; `product` recusa `cipsoft-personal` em dois pontos.
- **Reprovou:** D1 input não edge-triggered com teste `10/10 failed` mascarado por retry; D2 cinco
  hashes de replay do card FIX-01 inexistentes no repositório; D3 `REPLAY_CONTRACT.md` sem as
  fixtures do PB-04; D4 `biome check` exit `1` com `13` diagnósticos.
- **Jogou de fato:** sessão dirigida pelo auditor em Chromium real, teclado real, lendo o `HuntProbe`.
  Boot no andar `8` em `(21,7,8)`, `11` criaturas vivas, `visibleRows = 11`, `641` objetos desenhados.
  Colisão em `n`/`e`, passo em `s`/`w`, `cooldown` medido em `10` ticks, descida no tick `39`, subida
  no tick `75`, **zero** erro de console, página, rede ou HTTP `≥ 400`.
- **Escopo:** somente documentação. Nenhum código, contrato, fixture, golden ou teste foi alterado.
  Os scripts de jogo da auditoria ficaram no scratchpad da sessão e importam Playwright por caminho
  absoluto, para não tocar a árvore auditada.
- **Modelo/effort efetivos:** Claude Opus 5; effort não exposto pelo runtime.
- **Skills e validador:** `superpowers:using-superpowers` e
  `superpowers:verification-before-completion`; validação por reexecução completa dos gates, medição
  direta de SHA-256, varredura de fronteiras, inspeção de todos os binários rastreados e sessão de
  jogo dirigida e instrumentada.
- **Próximas tasks elegíveis:** `PB-04-FIX-02`, `PB-04-FIX-03` e `PB-04-FIX-04`, em paralelo. Depois,
  nova rodada de PB-04-10. **PB-05 não está liberado.**

## PB-04-FIX-02 — handoff concluído

- **Status:** done; implementação integrada em `main` por fast-forward local.
- **Branch:** `codex/pb-04-fix-02-input-edge`.
- **Commit de implementação:** `6cd63c6` (`fix: make hunt taps single-step`).
- **Conteúdo:** `InputMap` passou a capturar `keydown`/`pointerdown` como borda única, repetir hold
  após `HOLD_REPEAT_DELAY_TICKS = 2`, ignorar keyups irrelevantes e limpar estado em blur da janela,
  `pointercancel` e `detach`. O kernel, `HuntScene`, fixtures, goldens e `playwright.config.ts`
  não foram alterados.
- **Testes:** `InputMap` `10/10`; mutação que neutraliza a borda derruba `6/10` e a restauração volta
  a `10/10`; o caso E2E de toque curto passou `10` vezes no teclado e `10` no d-pad por pointer real.
- **Gates:** `corepack pnpm verify` exit `0`, `29/29` testes E2E; `hunt:check` e
  `simulation:check` exit `0` com os mesmos digests do baseline; typecheck do workspace e Biome dos
  arquivos alterados passaram.
- **Lint global:** `corepack pnpm format:check` exit `0`; `corepack pnpm exec biome check .` exit `1`
  com `10` erros de `organizeImports`, `2` warnings e `1` info já existentes em arquivos fora do
  escopo desta task (D4, destinado ao `PB-04-FIX-04`). Os arquivos alterados por esta task passaram.
- **Spec:** `docs/superpowers/specs/2026-08-15-pb-04-corrective-hunt-experience-design.md` registra
  o limiar temporal e a limpeza do blur na janela proprietária.
- **Revisão independente:** Boole classificou o estado final como `Ready`, sem achados críticos,
  importantes ou menores bloqueantes.
- **Modelo/effort efetivos:** Codex/GPT-5; effort não exposto pelo runtime. Skills: TDD, debugging
  sistemático, worktree isolada, verificação antes da conclusão e revisão independente.
- **Próximas tasks elegíveis:** `PB-04-FIX-03` e `PB-04-FIX-04`, em paralelo. Depois, nova rodada de
  PB-04-10. **PB-05 não está liberado.**

## Bloqueios

- ~~**B1 (bloqueante):** o mapa que contém a hunt congelada não está no snapshot.~~ **Resolvido em
  2026-08-14:** `otservbr.otbm` foi instalado no snapshot local a partir da distribuição
  `canary-3.4.1` já presente na máquina e congelado no source lock; a região foi extraída com
  `dropped=0`. Detalhe no handoff "PB-04-04 — concluída" acima.
- ~~**W7 (não bloqueante):** a hunt extraída só tem transições descendo.~~ **Fechado por PB-04-FIX-01
  e verificado pela auditoria PB-04-10 em 2026-08-15:** `transitions.json` tem exatamente duas
  entradas opostas, `(20,7,8) → (21,4,9)` e `(21,4,9) → (20,7,8)`, e ambas foram percorridas em jogo
  real com teclado, emitindo `actor/transitioned` nos ticks `39` e `75`.
- **W8 (não bloqueante, armadilha de contagem):** `region.palette` tem `138` entradas mas **`137`
  ids reais** — o índice `0` é o marcador de vazio `serverId 0`, que não é item e não tem `clientId`,
  sprite nem chave de pack. Todo consumidor da palette precisa filtrar o `0` antes de contar ou
  resolver. A regra virou normativa em `docs/content/MAP_REGION_CONTRACT.md`. Já causou um erro de
  contagem em PB-04-07 (`68` faltantes relatados contra `67` reais).
- **B2 (não bloqueante desde 2026-08-15, migrado para PB-07):** o usuário aceitou a experiência sem a
  mídia pessoal, registrado em `artifacts/product-acceptance.md`. A auditoria PB-04-10 mediu que o
  profile `personal` **não é gerável** neste workspace: `HUNTBOUND_PERSONAL_ASSET_SOURCE` está vazio e
  `personal-source-lock.json` exige um `manifest.json` de `32 397` bytes que não existe — o de
  `kaezan-arena-fable` tem `808 964`. O texto original do bloqueio segue abaixo para histórico.

  A origem pessoal de mídia cobre apenas `70` dos `137` ids reais da
  palette; **`67` faltam** — `15` deles são tiles de chão, e a camada `ground` usa `48` ids
  distintos dos quais só `33` têm sprite. Isso dispara a condição de parada declarada no card
  ("se algum `clientId` da palette não existir no manifesto de origem"), e parar sem gerar
  placeholder foi o comportamento correto.

  A origem **existe** e está congelada: `C:\Kaezan\kaezan-arena-fable\frontend\public\assets\tibia`,
  cujo `manifest.json` bate byte a byte com o lock do PB-02
  (`808 964` bytes, `edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94`). O que
  faltava era só apontar `HUNTBOUND_PERSONAL_ASSET_SOURCE` para ela — mas isso **não** destrava:
  o export é um recorte curado com `1534` objetos (contra `42107` em `appearances.dat`), e os tiles
  desta hunt nunca foram exportados.

  Destravar B2 é reexportar a mídia no projeto `kaezan-arena-fable` incluindo os `67` ids, o que é
  trabalho **fora** deste repositório. O profile `test` não depende disso: ele usa a fixture
  sintética 1×1 para todas as chaves, então a seleção derivada da palette, o pack `test`, os gates
  de teto e a recusa do profile `product` podem ser entregues antes.
- ~~Warning W3 herdado da auditoria PB-03-08: o script `test` da raiz enumera apenas
  `asset-boundaries.test.ts` e `check-boundaries.test.ts` em `node --test`.~~ **Fechado por PB-04-05
  em 2026-08-14:** o enumerador passou a incluir `content-boundaries.test.ts` e
  `simulation-boundaries.test.ts`, e a regra nova de identidade Tibia roda em gate agregado.
- **W9 (não bloqueante, PB-04-09):** em `390 × 844` a chrome de canto morde o terço centro-inferior do
  playfield — d-pad `7,0 px` e painel de viewport `12,3 px`. O quinto central, onde a câmera centrada
  mantém o jogador, está livre nos quatro viewports. Fechar exige encolher as duas caixas de canto,
  decisão de layout fora do escopo desta task. Medição em `artifacts/browser-qa.md` §4.
- ~~**W10 → promovido a defeito D4 pela auditoria PB-04-10:** `corepack pnpm check` falha em `main`.~~
  **Fechado por PB-04-FIX-04 em 2026-08-16:** `biome check .` sai `0` em `381` arquivos no resultado
  integrado. `verify` continua sem lint; o lint agora passa separado.

- ~~**W15 (bloqueante, PB-04-10):** `playwright.config.ts:12` usa `retries: 1`~~ **Fechado por
  PB-04-FIX-04:** `retries: 0`. O toque curto no d-pad que o retry escondia reapareceu na integração
  (`2` comandos nos ticks `23` e `25`) e foi fechado no follow-up de `tapDpadFor`.

- ~~**W16 (não bloqueante, PB-04-10):** `tools/content-catalog` tem testes que nenhum script executa.~~
  **Fechado por PB-04-FIX-04:** `test` da raiz inclui `tools/content-catalog/vitest.config.ts`;
  `14` arquivos / `53` testes, com `skipIf` quando o snapshot Canary não existe.

- ~~**W13 (não bloqueante, PB-04-10):** `PB-04-SELECTION.md` ainda afirma que `canary.otbm` contém a
  hunt.~~ **Fechado por PB-04-FIX-04:** o checklist cita `otservbr.otbm` e risca a inferência antiga.

- ~~**W14 (não bloqueante, PB-04-10):** roteiro e README exigem reextração byte-idêntica.~~ **Fechado
  por PB-04-FIX-04:** o critério passou a ser materializar o recipe duas vezes; o envelope OTBM é
  fonte de spawn e material. A linha da tabela "Prova / Extração" no README ainda dizia "reextrair"
  e foi alinhada nesta integração.
- ~~**W11 (bloqueante para o fechamento, PB-04-06):** fixture e gate de replay ausentes.~~ **Fechado
  por PB-04-FIX-01 em 2026-08-15:** `packages/test-fixtures/hunt/pb04/` e
  `pb04-respawn/` são versionados com sidecars, retomadas e `hunt:check` entrou em `check`/`verify`.
- **W12 (não bloqueante, PB-04-09):** nenhum `tsconfig` do workspace inclui `tests/`, então specs
  Playwright não são checadas por tipo em gate nenhum. Nove erros reais foram encontrados à mão e
  corrigidos nesta entrega.
- Warnings W1, W2, W4, W5 e W6 da auditoria PB-03-08 seguem abertos e não bloqueantes; estão em
  `docs/playbooks/PB-03/artifacts/acceptance-report.md` §10 e não devem ser absorvidos por uma task
  do PB-04 sem card próprio.
- Os warnings `FIXABLE` herdados de PB-02 estão em
  `docs/playbooks/PB-02/artifacts/acceptance-report.md` §11; não bloqueiam PB-04 e não devem ser
  absorvidos sem card próprio.
- **W17 (não bloqueante, integração 2026-08-16):** `biome.json` ainda não exclui `.worktrees`.
  Worktree aninhada continua derrubando `format:check` na raiz. PB-05-01 já manda usar worktree irmã.
  FIX-04 não tocou `biome.json` (fora do escopo).

## PB-04-FIX-03 — handoff integrado

- **Status:** done; integrada em `main` por merge commit `695b6a7` (não fast-forward).
- **Branch:** `codex/pb-04-fix-03-replay-hashes` (apagada após o merge).
- **Commit de implementação:** `911ce2f` (`fix: gate published hunt replay hashes against fixture files`).
- **Conteúdo:** o card do FIX-01 passou a apontar para `hashes.md`; `REPLAY_CONTRACT.md` ganhou a
  seção das fixtures `pb04` e `pb04-respawn`; `hunt:hashes:check` compara tabela, arquivo e sidecar
  e entrou em `hunt:check`.
- **Gates na integração:** `hunt:check` exit `0` com os mesmos digests do §4 do relatório de aceite;
  `biome check .` exit `0`.
- **Próxima task elegível:** PB-04-10, depois de FIX-04.

## PB-04-FIX-04 — handoff integrado

- **Status:** done; integrada em `main` por merge commit `6aeefec` (não fast-forward).
- **Branch:** `codex/pb-04-fix-04-gates-contratos` (apagada após o merge).
- **Commit de implementação:** `96c7628` (`fix: close PB-04 gates without masking short-tap repeats`).
- **Conteúdo:** `organizeImports` e `useTemplate`; `retries: 0`; `content-catalog` no `test` com
  `skipIf` sem snapshot; W13/W14 documentais; `topology.ts` perdeu `positionKey` e `floor` não usados
  (sujeira, não lógica incompleta). O commit também alterou `InputMap` além do escopo do card
  (contagem de hold em ticks de gate).
- **Desvio de integração:** `--ff-only` falhou porque `main` já tinha commits do PB-05. Merge commit
  em vez de rebase, para não reescrever histórico.
- **Follow-up nesta sessão:** `tapDpadFor` ainda usava `page.mouse.down()` CDP; o `pointerdown`
  atrasado rearmava o hold depois do `releaseHeld`, e com `retries: 0` o teste saiu `1` (`2` comandos,
  ticks `23` e `25`). O driver passou a disparar pointerdown/up no mesmo `page.evaluate`, no molde de
  `holdKeyboardFor`. `InputMap` `18/18`; hunt-play + hunt-mobile `14/14`.
- **Próxima task elegível:** nova rodada de **PB-04-10**. PB-05 não está liberado.

## PB-04-10 — reavaliação e fechamento

- **Status:** done. **Veredito `APPROVED_WITH_WARNINGS`**. Playbook **closed**.
- **Commit auditado:** `9f1c14cbf36597471cc08ba28eec3d020df9d723`, árvore limpa, worktree irmã
  `codex/pb04-10-integrated-gate`.
- **Artefato:** `artifacts/acceptance-report.md` (substitui o veredito vigente; a reprovação de
  `307a3f0` permanece no histórico git).
- **Passou:** `verify` exit `0` **duas vezes**, `29 passed` / 0 flaky, árvore vazia entre e depois;
  `biome check .` exit `0` (`381` arquivos); `simulation:check` `0`; `hunt:check` `0` **duas vezes
  com digests idênticos**; `architecture:check` `0`; golden do PB-03 `31f86d62…555888d4`; varreduras
  do kernel vazias (exit `1`); nenhuma mídia pessoal versionada; D1 `20/20` com `--retries=0
  --repeat-each=10`.
- **Jogou de fato:** Chromium real, teclado real, `HuntProbe`. Boot `(21,7,8)` andar `8`, `10`
  rotworms, `visibleRows = 11`. Colisão `n`/`e` `terrain`. Descida tick `113`
  `(20,7,8) → (21,4,9)`. Subida tick `148` `(21,4,9) → (20,7,8)`. Zero erro de console, página,
  rede ou HTTP `≥ 400`.
- **Warnings remanescentes:** W9, W12, W17 `FIXABLE`; W8 e B2 `ACCEPTED`; W1–W6 herdados de PB-03.
- **Escopo:** somente documentação. Nenhum código, contrato, fixture, golden ou teste foi alterado.
  O script de jogo ficou em `%TEMP%\pb04-10-audit-play.mjs`.
- **Ambiente:** a primeira `verify` saiu `1` porque `PLAYWRIGHT_BROWSERS_PATH` apontava ao cache
  vazio do sandbox do Cursor. As duas execuções que contam usaram
  `%USERPROFILE%\AppData\Local\ms-playwright`. `HUNTBOUND_CANARY_SOURCE` vazio nesta worktree;
  `hunt:extract:check` não foi reexecutado; sidecar e suíte do extrator passaram dentro de `verify`.
- **Modelo/effort efetivos:** Cursor Grok 4.6; effort não exposto. Desvio do modelo sugerido
  (Claude Opus 5): a plataforma desta sessão é Grok, distinto dos implementadores das correções.
- **Skills e validador:** `playbook-task`, `independent-audit`, `worktree-cycle`, `run-gates`,
  `superpowers:verification-before-completion`. Validação por reexecução dos gates, SHA-256
  direto, varredura de fronteiras, inspeção de PNGs rastreados e sessão de jogo dirigida.
- **Próxima task elegível:** **PB-05-01**. PB-05 está liberado. Este chat não a inicia.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
