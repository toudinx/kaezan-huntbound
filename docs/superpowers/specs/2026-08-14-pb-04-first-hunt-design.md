# PB-04 — Primeira hunt ponta a ponta (design)

**Status:** aprovado para decomposição em playbook
**Data:** 2026-08-14
**Playbook alvo:** `docs/playbooks/PB-04/`
**Fontes normativas:** `docs/03_ADR_PHASER4_BROWSER_FIRST.md`,
`docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`,
`docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`,
`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`,
`docs/08_POLITICA_MODELOS_AGENTES.md`,
`docs/architecture/PACKAGE_BOUNDARIES.md`,
`docs/simulation/KERNEL_CONTRACT.md`,
`docs/simulation/REPLAY_CONTRACT.md`,
`docs/assets/BROWSER_ASSET_CONTRACT.md`

## Contexto

PB-00/PB-00R entregaram workspace, shell browser e gates. PB-01 congelou o catálogo curado de
conteúdo. PB-02 congelou o contrato de assets e o carregamento por stable keys. PB-03 entregou o
kernel determinístico: tick fixo de 50 ms, RNG xoshiro128\*\* seedado, grid inteiro, comandos
validados, eventos ordenados, snapshot restaurável em qualquer fronteira e replay golden com
paridade Node↔browser.

Nada disso é jogável. O kernel roda sobre um grid sintético 16×16 de um único andar, com
`blockedTiles` escrito à mão, e a única superfície browser é um probe test-only. Não existe mapa
real, não existe spawn, não existe câmera e não existe input.

PB-04 fecha esse vão. Ele entrega a primeira hunt navegável ponta a ponta: uma região real do mapa
Canary extraída offline, colisão derivada dos dados do próprio snapshot, criaturas nascendo por
tabela de spawn determinística, transição entre andares, câmera seguindo o jogador e input real —
tudo mantendo a propriedade que PB-03 provou: mesma seed e mesmo command log produzem snapshot
byte-idêntico em Node e no browser.

O contrato de escolha da primeira hunt vive em `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`
("Contrato para escolher a primeira hunt") e é executado por PB-04-01.

## Objetivo

Entregar uma hunt jogável no browser que:

1. carrega uma região real do mapa, convertida offline para JSON validado;
2. deriva colisão, camadas de render e transições dos dados do snapshot, não de constantes escritas
   à mão;
3. nasce criaturas por tabela de spawn determinística, reproduzível pela seed;
4. move o jogador por input real, com câmera que o segue;
5. transiciona entre andares ao pisar no tile de transição;
6. reproduz a sessão gravada byte a byte em Node e no browser;
7. mantém `packages/simulation` agnóstico de conteúdo, asset e Tibia.

PB-04 não tem combate. Rotworms andam, ocupam célula e bloqueiam passagem; não causam nem sofrem
dano.

## Hunt escolhida

`hunt:tibia:venore-rotworm-cave`.

Justificativa objetiva, medida no snapshot local em 2026-08-14:

- `creature:tibia:rotworm` já existe no catálogo PB-01 (`data-otservbr-global/monster/vermins/rotworm.lua`,
  sha256 `f75ed297cd851013cde4e991113bf2d67ab9930852f20fb0c4e8d0937ddb176b`);
- `creature:tibia:rotworm` já existe no pack PB-02 como `lookType: 26`;
- `outfit:tibia:knight` (`lookType: 131`) já existe no pack PB-02 para o jogador;
- `references/canary/data-otservbr-global/world/otservbr-monster.xml` declara 1134 grupos de spawn de
  Rotworm; na janela `x ∈ (32800, 33150)`, `y ∈ (31950, 32300)` existem **72 grupos e 95 rotworms**,
  distribuídos em **48 em `z = 8` e 47 em `z = 9`**;
- `references/canary/data-canary/world/canary.otbm` é o mapa global real (OTBM v2, 40000×40000, item
  major 3 / minor 62, salvo com Remere's Map Editor 3.8.0) e `config.lua.dist` declara
  `mapName = "otservbr"`, isto é, o mapa e o `otservbr-monster.xml` são o mesmo par.

A hunt já vem com dois andares povoados, o que satisfaz "transições" sem inventar geometria. A
seleção final — URL do TibiaRoute, nível recomendado, bounding box exato, andares e lista de
criaturas — é congelada por PB-04-01 conforme o checklist do roteiro.

Nenhuma criatura fora do catálogo PB-01 entra na região. Se a bounding box escolhida contiver spawn
de criatura ausente do catálogo, PB-04-01 encolhe a box ou declara a criatura como excluída da
tabela de spawn, com diagnóstico explícito; importar criatura nova é trabalho de PB-01, não de
PB-04.

## Decisões congeladas

### Licença e versionamento do mapa

A região extraída contém geometria e IDs de item — dado, não mídia. Ela segue o precedente do PB-01,
onde `packages/content/src/generated/pb-01-contract-coverage.json` é versionado com sidecar
`.sha256`:

- a região extraída **é commitada**, com source lock e golden hash;
- `references/` permanece fora do repositório e é a única fonte da extração;
- mídia `cipsoft-personal` continua fora do repositório, resolvida por
  `HUNTBOUND_PERSONAL_ASSET_SOURCE`;
- o profile `product` continua recusando `licenseClass: "cipsoft-personal"`;
- OTBM nunca é formato de runtime.

### Orçamento da região

| Parâmetro | Valor |
|---|---|
| Andares por região | ≤ 3 |
| Tiles por andar | ≤ 96 × 96 |
| Entradas de mídia no pack da hunt | ≤ 512 |
| Bytes do pack da hunt | ≤ 6 MB |
| Atores vivos simultâneos | ≤ 64 |

Estourar qualquer teto é falha de gate, não aviso.

### Identidade de item

O snapshot congelado usa `appearances.dat` e não distribui `items.otb`; a hipótese é que
`serverId == clientId`. PB-04-03 **prova** essa igualdade sobre o conjunto de IDs da região; se ela
falhar, a task para e reporta, porque toda a resolução de asset por `clientId` do PB-02 depende
dela.

### Origem das flags de tile

`appearances.dat` (protobuf, 4,8 MB) é a autoridade sobre flags de aparência. `items.xml` é a
autoridade sobre `floorchange`. A tabela derivada, versionada e commitada, resolve por `serverId`:

| Campo | Origem | Uso |
|---|---|---|
| `ground` | `flags.bank` | camada `ground` |
| `blocking` | `flags.unpass` | camada `collision` |
| `top` | `flags.top` | separa `objectsAbove` de `objectsBelow` |
| `floorChange` | `items.xml` `floorchange` | camada `transitions` |

`avoid`, `unmove`, `clip` e elevação são lidos e registrados na tabela, mas **não** influenciam
colisão nesta versão: colisão é exatamente `flags.unpass`. Ampliar essa regra exige task nova.

O leitor de protobuf é mínimo, próprio e sem dependência externa: ele decodifica somente os campos
necessários e ignora o resto por wire type. Nenhuma biblioteca de protobuf entra no workspace.

### Camadas do mapa

A ADR-001 congela as camadas mínimas `ground`, `objectsBelow`, `objectsAbove`, `collision`, `spawns`
e `transitions`. A codificação é canônica e inteira:

- `palette`: lista ordenada e sem duplicatas dos `serverId` usados na região;
- `ground`: array denso de índices de palette, row-major, comprimento `width * height`, por andar;
- `objectsBelow` e `objectsAbove`: listas esparsas `{ i, stack }` ordenadas por `i`, onde `i` é o
  índice row-major e `stack` preserva a ordem de empilhamento do OTBM;
- `collision`: lista esparsa e ordenada de índices bloqueados;
- `transitions` e `spawns`: descritos abaixo.

Índice vazio é ausência; não existe sentinela negativa. Nenhum float entra no arquivo.

### Transições

Uma transição é um par dirigido `from → to`, derivado geometricamente do `floorchange` do item:

| `floorchange` | Destino |
|---|---|
| `down` | `(x, y, z + 1)` |
| `north` | `(x, y - 1, z - 1)` |
| `south` | `(x, y + 1, z - 1)` |
| `east` | `(x + 1, y, z - 1)` |
| `west` | `(x - 1, y, z - 1)` |
| `up` (escada) | `(x, y - 1, z - 1)` |

Regras congeladas:

- a transição dispara **automaticamente ao entrar no tile por passo**, no fim do sistema de
  movimento, nunca por comando dedicado;
- uma transição **não encadeia**: o ator chega com `transitionGuard` igual à posição de chegada e só
  volta a poder disparar qualquer transição depois de sair dessa célula; o guard é estado vivo e é
  serializado no snapshot;
- destino fora da região extraída, em terreno bloqueado ou em andar não extraído **derruba a
  transição** na extração, com diagnóstico; a bounding box de PB-04-01 deve ser escolhida para que
  nenhuma transição necessária seja derrubada, e o gate verifica a contagem de derrubadas contra o
  valor congelado na seleção;
- a chegada respeita ocupação: se o destino estiver ocupado por outro ator, o passo é bloqueado com
  causa `transition-blocked` e o ator permanece na origem.

### Spawn

`otservbr-monster.xml` declara grupos `centerx/centery/centerz/radius` com filhos
`name/x/y/z/spawntime`. A tabela extraída preserva essa estrutura em coordenadas locais da região.

Regras congeladas:

- `spawntime` em segundos converte para ticks por `segundos * 1000 / TICK_DURATION_MS`; o padrão de
  90 s vira 1800 ticks; um valor que não divida exatamente é rejeitado na extração;
- cada slot de criatura nasce na posição relativa declarada quando ela estiver livre; se estiver
  ocupada ou bloqueada, o kernel sorteia deterministicamente entre as células livres do raio usando
  o stream `spawn`; se não houver célula livre, o nascimento é adiado para o tick seguinte e emite
  `spawn/deferred`;
- grupos são percorridos em ordem canônica por `(z, y, x, índice do slot)`;
- morte não existe em PB-04; o respawn é exercitado por `scenario/despawn-actor` no log da sessão;
- o teto de 64 atores vivos é verificado antes de cada nascimento e o excedente emite
  `spawn/capped`.

### Versões e RNG

- `SIMULATION_SCHEMA_VERSION`: `2` → `3`.
- `SIMULATION_RULES_VERSION`: `1` → `2`.
- Novo stream RNG `spawn`, somando-se a `movement`, `ai` e `scenario`.
- `TICK_DURATION_MS = 50` e `MAX_FRAME_DELTA_MS = 250` permanecem.

Os streams são derivados por FNV-1a 32 sobre o label e são independentes entre si, então acrescentar
`spawn` não desloca as sequências de `movement`, `ai` e `scenario`. Essa independência é afirmação
testável e vira teste, não suposição.

### Regressão obrigatória do fixture PB-03

O bump de schema invalida o fixture `pb-03-kernel-coverage` na forma atual: `z` e `blockedTiles`
viram `floors`. PB-04-05 migra o cenário para a forma multi-floor de um único andar e regenera os
golden.

O critério que separa mudança de formato de mudança de semântica é o mesmo que PB-03-06-FIX-01 usou
e é **bloqueante**: `packages/test-fixtures/simulation/pb03/events.golden.jsonl` deve permanecer
**byte-idêntico**. Se o journal mudar, a regra mudou, e o playbook para até a causa ser identificada.

### Fronteira kernel × conteúdo

O kernel continua sem conhecer Tibia. Ele recebe geometria e comportamento; nunca `serverId`,
`clientId`, `lookType`, nome de criatura ou path de asset.

`KernelScenario` na versão 3 carrega `floors` (com `blockedTiles` por andar), `transitions`,
`spawnGroups`, `blueprints` e `initialActors`. Palette, camadas visuais, nomes e IDs Tibia ficam no
`MapRegion` e nunca entram no cenário.

`buildHuntScenario(huntDefinition, seed)` mora em `@huntbound/content`, que já depende apenas de
`@huntbound/contracts`. `packages/simulation` não ganha nenhuma dependência.

A regra executável `tools/architecture/simulation-boundaries.ts` é estendida: além de relógio,
aleatoriedade global e import externo, ela reprova em `packages/simulation/src/**` qualquer
ocorrência de `serverId`, `clientId`, `lookType`, `huntId` e `regionId`.

### Input e câmera

- Teclado: `WASD` e setas, oito direções, um passo por comando aceito.
- Touch: dpad em DOM sobre o canvas, mesmo mapa de ações, sem binding físico compartilhado.
- **Não existe click-to-move.** Ele exigiria pathfinding, que está fora de escopo.
- Câmera segue o jogador com deadzone retangular; a deadzone é presentacional e não entra no kernel.
- A interpolação de posição entre ticks usa o alpha do acumulador de `SimulationHost` e é
  exclusivamente de apresentação: ela nunca realimenta o kernel.
- O centro e o lower-middle do playfield permanecem livres, conforme ADR-001.

### Assets da hunt

- Namespace novo de stable key: `tile:tibia:<clientId>`, resolvido pelo adapter `clientId` que PB-02
  já implementa. Nenhum adapter novo, nenhuma entrada de catálogo PB-01 exigida — tile de mapa é
  geometria e decoração, não conteúdo de regra.
- O pack da hunt é `pb-04-venore-rotworm-cave`, carregado sob demanda, como PB-02 já previa.
- O profile `test` usa a mesma fixture sintética 1×1 do PB-02 para todas as chaves; o profile
  `personal` resolve a mídia real a partir do source root externo.
- Chave faltante é erro em validação única, com a lista completa das ausentes.

## Arquitetura

```text
references/canary/**                       (fora do repo, gitignored)
  ├─ data/items/appearances.dat ─┐
  ├─ data/items/items.xml ───────┤
  │                              ▼
  │                    tools/tile-flags/     leitor protobuf mínimo
  │                              │           └─► packages/content/src/generated/tile-flags.json
  ├─ data-canary/world/canary.otbm ─┐
  └─ data-otservbr-global/world/otservbr-monster.xml ─┐
                                    ▼                 ▼
                            tools/map-extractor/  recorte + camadas + spawns + transições
                                    │
                                    └─► packages/content/src/generated/hunts/venore-rotworm-cave/
                                          ├─ region.json      (visual + colisão + transições)
                                          ├─ spawns.json
                                          ├─ hunt.json        (HuntDefinition)
                                          └─ *.sha256
                                              │
        ┌─────────────────────────────────────┴──────────────────────────┐
        ▼                                                                ▼
@huntbound/content                                              @huntbound/assets
  buildHuntScenario(hunt, seed) ─► KernelScenario v3              pack pb-04-venore-rotworm-cave
        │                                                                │
        ▼                                                                ▼
@huntbound/simulation                                            apps/game
  floors, transitions, spawn scheduler                             HuntScene (tilemap por camada)
  streams movement | ai | scenario | spawn                         CameraController (deadzone)
        │                                                          InputMap → SimulationCommand
        └─► tools/replay (Node) ──── mesmo SHA-256 ────► KernelProbe (browser)
```

### Fronteiras futuras

```text
packages/contracts/src/hunt/                   HuntDefinition, MapRegion, SpawnTable, TransitionTable
packages/contracts/src/simulation/             KernelScenario v3, comandos e eventos novos
packages/content/src/hunts/                    buildHuntScenario e loaders de runtime
packages/content/src/generated/hunts/          região, spawns e hunt definition versionados
packages/content/src/generated/tile-flags.json tabela de flags por serverId
packages/simulation/src/grid/                  espaço multi-floor e transições
packages/simulation/src/kernel/                sistema de spawn e sistema de transição
packages/assets/catalog/selections/            selection do pack da hunt
tools/tile-flags/                              leitor de appearances.dat + items.xml
tools/map-extractor/                           recorte OTBM e spawns
packages/test-fixtures/hunt/pb04/              sessão golden da hunt
apps/game/src/phaser/scenes/HuntScene.ts       tilemap, sprites e câmera
apps/game/src/input/                           InputMap, teclado e dpad
docs/content/PB-04-SELECTION.md                seleção congelada da hunt
docs/content/MAP_REGION_CONTRACT.md            contrato da região extraída
docs/simulation/KERNEL_CONTRACT.md             atualizado com floors, transições e spawn
```

## Comandos e eventos novos

**Nenhum comando novo entra no conjunto fechado de PB-03.** O sistema de spawn é um sistema do tick,
alimentado pela tabela do cenário e pelo stream `spawn`, exatamente como `S3 ai` é alimentado pelo
stream `ai`. A transição é resolvida no fim do sistema de movimento. Isso preserva a regra de PB-03
de que o command log grava somente comandos externos, e mantém `commandPriority` intacto.

Eventos acrescentados:

| Tipo | Payload |
|---|---|
| `actor/transitioned` | `entityId`, `from`, `to` |
| `spawn/deferred` | `groupIndex`, `slotIndex`, `reason` |
| `spawn/capped` | `groupIndex`, `slotIndex` |

As razões de `spawn/deferred` são `no-free-cell` e `cap-reached`, nessa ordem de precedência.

A causa de bloqueio `transition-blocked` soma-se a `bounds`, `terrain`, `occupied`,
`diagonal-corner` e `cooldown`.

### Estado novo no snapshot

Duas informações novas são estado vivo e **precisam** estar no snapshot, sob pena de repetir a classe
de defeito que PB-03-06-FIX-01 corrigiu com `pendingIntents`:

- `ActorState.transitionGuard`: `null` ou a posição de chegada que ainda inibe nova transição. Sem
  ele, restaurar logo após uma transição dispara a transição de volta e diverge.
- `spawnSlots`: lista ordenada por `(groupIndex, slotIndex)` com `readyAtTick` e o `entityId` vivo
  ou `null`. Sem ela, restaurar perde o cronograma de respawn.

A prova de fidelidade é a mesma varredura que PB-03 usa: retomar em **cada** fronteira `0..600` deve
convergir para o mesmo snapshot final e para a mesma cauda de eventos. Amostragem não satisfaz o
critério.

## Fixture e prova de determinismo

Fixture `pb-04-hunt-session`:

| Parâmetro | Valor |
|---|---|
| Hunt | `hunt:tibia:venore-rotworm-cave` |
| Seed | `1a2b3c4d5e6f7a8b` |
| Ticks | `600` (30 s) |
| Retomada | tick `313` |
| Cobertura obrigatória | passo em dois andares, uma transição em cada sentido, um respawn completo, um `spawn/deferred`, uma colisão com criatura e um comando rejeitado |

Provas exigidas, no formato que PB-03 já usa:

| Prova | Verificação |
|---|---|
| Repetição | duas execuções limpas em Node são byte-idênticas |
| Retomada | `0→600` e `0→313` + restore + `313→600` convergem no mesmo snapshot; a fidelidade é varrida em **todas** as fronteiras `0..600`, não amostrada |
| Paridade | browser e Node produzem o mesmo SHA-256 do snapshot canônico |
| Sensibilidade | mudar seed, comando ou `rulesVersion` é detectado como divergência |
| Extração | reextrair a região do mesmo snapshot produz JSON byte-idêntico |
| Isolamento | `packages/simulation` não referencia Tibia, asset, relógio, DOM ou Node |
| Regressão | `events.golden.jsonl` do fixture PB-03 permanece byte-idêntico |

## Gates e scripts

- `hunt:check` — novo script raiz: `map-extractor --check` sobre a região congelada e
  `replay verify` sobre a sessão da hunt. Entra em `check` e em `verify`, depois de
  `simulation:check`.
- `content:check` passa a validar `tile-flags.json` e a `HuntDefinition` gerada.
- `assets:check` passa a cobrir o pack da hunt no profile `test`.
- `qa:browser` ganha screenshots da hunt nos quatro viewports obrigatórios da ADR-001
  (390×844, 768×1024, 1366×768, 1920×1080).
- Orçamento de boot da ADR-001 (primeiro estado acionável ≤ 5 s, nenhum long task recorrente ≥ 50 ms
  durante a caminhada) é medido em PB-04-09; o spike de densidade de 50/150/300 atores continua em
  PB-10.

Os artefatos gerados entram no `format:check` como texto versionado ou são excluídos do Biome no
mesmo padrão já usado por `packages/test-fixtures/simulation/pb03` e pela árvore de assets, nunca
reformatados à mão.

## Erros e diagnósticos

Diagnósticos seguem o formato estruturado de PB-01/PB-03: ordenados por `path` e depois por `code`,
com códigos próprios e estáveis.

| Código | Situação |
|---|---|
| `HUNT_REGION_OUT_OF_BUDGET` | região excede andares, tiles, entradas ou bytes |
| `HUNT_ID_MISMATCH` | `serverId` sem `clientId` correspondente |
| `HUNT_UNKNOWN_CREATURE` | spawn referencia criatura ausente do catálogo PB-01 |
| `HUNT_TRANSITION_DROPPED` | destino fora da região, bloqueado ou em andar não extraído |
| `HUNT_SPAWNTIME_NOT_DIVISIBLE` | `spawntime` não converte em ticks inteiros |
| `HUNT_ASSET_KEY_MISSING` | tile da região sem chave no pack |
| `SIM_TRANSITION_CHAINED` | transição disparada com `transitionGuard` ativo; é invariante interna do kernel e falha o tick em vez de continuar |

## Decomposição em tasks

| ID | Problema coeso | Dependência | Modelo/effort |
|---|---|---|---|
| PB-04-01 | seleção e congelamento da hunt: checklist do roteiro, bounding box, andares, criaturas e budget medido | PB-03 fechado | Luna `xhigh` |
| PB-04-02 | contratos de mundo: `HuntDefinition`, `MapRegion`, `SpawnTable`, `TransitionTable` e `KernelScenario` v3 | PB-04-01 | Luna `xhigh` |
| PB-04-03 | tabela de flags de tile: leitor protobuf mínimo de `appearances.dat`, `floorchange` do `items.xml`, prova de `serverId == clientId` | PB-04-02 | Sol `xhigh` |
| PB-04-04 | extrator OTBM: recorte, camadas, colisão, transições e spawns, determinístico e idempotente | PB-04-03 | Sol `xhigh` |
| PB-04-05 | kernel multi-floor: andares, transições, sistema de spawn, stream `spawn`, bump de versões e migração do fixture PB-03 | PB-04-02 | Sol `xhigh` |
| PB-04-06 | `buildHuntScenario`, fixture `pb-04-hunt-session`, golden, CLI e gate `hunt:check` | PB-04-04, PB-04-05 | Sol `xhigh` |
| PB-04-07 | pack visual da hunt: selection `tile:tibia:*`, budget, profiles e gate de chave faltante | PB-04-04 | Luna `xhigh` |
| PB-04-08 | apresentação: `HuntScene` com tilemap por camada, sprites, câmera com deadzone, interpolação e `InputMap` teclado/dpad | PB-04-06, PB-04-07 | Luna `xhigh` |
| PB-04-09 | QA browser da hunt: quatro viewports, screenshots, paridade de replay e orçamento de boot | PB-04-08 | Luna `xhigh` |
| PB-04-10 | auditoria integrada e fechamento do playbook | PB-04-09 | Opus 5 |

PB-04-03 e PB-04-05 podem executar em paralelo depois de PB-04-02: uma toca `tools/` e
`packages/content`, a outra toca `packages/simulation`. PB-04-07 pode executar em paralelo com
PB-04-05 e PB-04-06 depois de PB-04-04. O padrão continua serial com fast-forward automático e
limpeza, e o integrador único é a task que depende de ambas.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `serverId != clientId` no snapshot, quebrando a resolução de asset | PB-04-03 prova a igualdade sobre os IDs da região e **para** se falhar; é condição de parada declarada, não descoberta tardia |
| Parsing de `appearances.dat` maior que o previsto | o leitor decodifica somente os campos usados e ignora o resto por wire type; RED começa por fixture protobuf construída à mão, não pelo arquivo de 4,8 MB |
| Região grande demais para o orçamento de carregamento | tetos numéricos congelados aqui, medidos em PB-04-01 e verificados por gate em PB-04-04 e PB-04-07 |
| Bump de schema quebrar o golden do PB-03 silenciosamente | `events.golden.jsonl` byte-idêntico é critério bloqueante de PB-04-05 |
| Transição encadeada gerar loop infinito entre andares | guarda de chegada congelada no contrato e coberta por `SIM_TRANSITION_CHAINED` |
| Mídia pessoal ausente no ambiente do executor | profile `test` usa fixture sintética 1×1 para todas as chaves, como PB-02; `personal` é opt-in por variável de ambiente |
| Escopo de combate vazar para PB-04 | fora de escopo explícito abaixo e scan de regras no gate de PB-04-09, no mesmo padrão do scan de PB-03-07 |

## Fora de escopo

- dano, morte, loot, spell, vocação e qualquer regra de combate — PB-05;
- pathfinding, line of sight, área de efeito e projétil;
- click-to-move e qualquer navegação que dependa de pathfinding;
- save, IndexedDB e persistência de run — PB-06;
- segunda hunt, streaming de região, mapa completo e troca de hunt em runtime;
- outfit composto, addons e cores — PB-07;
- gacha, economia e helper — PB-08 e PB-09;
- spike de densidade e orçamento completo de performance — PB-10;
- importar criatura, item ou spell novo para o catálogo — PB-01;
- alterar PB-01, PB-02 ou PB-03 sem defeito bloqueante reproduzido.

## Critérios de aceite do playbook

- [ ] A seleção da hunt cumpre integralmente o checklist do roteiro e está congelada com URL, nível,
      bounding box, andares, criaturas e budget medido.
- [ ] Toda criatura da tabela de spawn existe no catálogo PB-01.
- [ ] `serverId == clientId` está provado para todos os IDs da região.
- [ ] A tabela de flags é gerada do snapshot, versionada e reprodutível byte a byte.
- [ ] Reextrair a região do mesmo snapshot produz JSON byte-idêntico.
- [ ] Nenhuma transição necessária foi derrubada, e a contagem de derrubadas bate com a seleção.
- [ ] O kernel resolve andares, transições e spawn sem conhecer Tibia, asset ou path.
- [ ] `events.golden.jsonl` do fixture PB-03 permaneceu byte-idêntico após o bump de schema.
- [ ] Duas execuções limpas da sessão da hunt produzem snapshot e journal byte-idênticos.
- [ ] Retomada converge para o mesmo snapshot final em todas as fronteiras `0..600`, com
      `transitionGuard` e `spawnSlots` serializados.
- [ ] Browser e Node produzem o mesmo SHA-256 do snapshot canônico da sessão.
- [ ] Todo tile da região resolve por stable key; chave faltante falha em validação única.
- [ ] A hunt é jogável nos quatro viewports obrigatórios, com screenshots versionadas.
- [ ] O jogador anda, colide, encontra rotworms nascidos por spawn e troca de andar por transição.
- [ ] `corepack pnpm verify` passa no resultado integrado.
- [ ] O relatório de aceite decide a elegibilidade de PB-05.
