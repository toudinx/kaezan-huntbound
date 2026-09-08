# PB-13 — Estado

**Estado:** PB-13-01 a PB-13-04 implementadas nas fontes; artefatos gerados e gates pendentes.
**Próxima:** PB-13-05 elegível depois de regenerar catálogo e fixtures de save e rodar os gates (B27).

| ID | Status | Modelo previsto | Modelo / effort usado | Commit |
|---|---|---|---|---|
| PB-13-01 | done (gerados pendentes) | GPT-5.6 Sol `xhigh` | Claude Opus 5 `xhigh` | `920227d` |
| PB-13-02 | done (gates pendentes) | GPT-5.6 Sol `xhigh` | Claude Opus 5 `xhigh` | `fedebd5` |
| PB-13-03 | done (gerados e gates pendentes) | Claude Opus 5 `xhigh` | Claude Opus 5 `xhigh` | `6ea35e9` |
| PB-13-04 | done (gerados e gates pendentes) | Claude Opus 5 `xhigh` | Claude Opus 5 `xhigh` | `2f7a107` |
| PB-13-05 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-13-06 | pending | GPT-5.6 Sol `xhigh` | — | — |
| PB-13-07 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-13-08 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-13-09 | pending | Claude Opus 5 `xhigh` | — | — |

## Bloqueios

**B21 — fechado pela PB-13-02.** Herdado do PB-10. `finish('completed')` agora tem call site: o
botão `combat-leave` sai da hunt, consolida a run uma vez e devolve o jogador ao atlas sem F5, com o
resumo do que foi depositado. A morte passou a consolidar como `'died'` no instante em que acontece,
que é a decisão 1 do README aplicada ao save.

**B24 — endereçado pela PB-13-01 nas fontes; fecha com a regeneração do B27.** A escada de poder
do Knight não sobe do lado ofensivo: `sword: 60` e `weaponAttack: 14` são idênticos no Orc Fortress
(nv 25), Venore Rotworm Cave (35), Cyclopolis (45) e Dragon Lair (70), autorados em
`packages/content/src/selections/validateSliceSelection.ts:106`. Como as fórmulas de
`packages/content/src/hunts/combatConversion.ts:110` são dominadas por `(skill + attack)`, o dano
máximo cresce 8% enquanto a vida cresce 153% e a criatura vai de orc a dragão. Reportado pelo usuário
jogando; medido em 2026-09-07.

**B25 — endereçado pela PB-13-01 nas fontes; fecha com a regeneração do B27.** A ficha da faixa 1
contradiz a escada congelada em 27 níveis: `HUNT_BANDS.md:105` e o `recommendedLevel` do índice
gerado dizem **nível 8**;
`validateSliceSelection.ts:106` autora **35**. É o Knight do PB-04/PB-05, anterior à escada, nunca
baixado porque baixá-lo move aqueles goldens. Quatro hits de rotworm foram projetados para 87% de
`HP(8) = 185` e valem 27% de HP 590 — a hunt tutorial é a única em que o jogador está acima da faixa,
e é o degrau que ensina o jogo que se perde.

**B26 — aberto, sem task escrita. Não é do PB-13.** O eixo de progressão é o set da faixa e o level
é barato (README, decisões 4 e 5). Isso resolve o farm para frente — o set de uma faixa segura a
seguinte —, mas deixa em aberto **voltar a uma faixa já superada para completar coleção**: com level
alto e sem modulação, a hunt antiga é trivial e o farm de coleção fica sem tensão. É exatamente o
problema que o PB-15-01/05 existe para resolver, e esta decisão torna aquela modulação
**estruturante, não opcional**. Registrado aqui porque nasceu do desenho do PB-13.

**B27 — aberto, sem task escrita. Fecha rodando o pipeline.** A PB-13-01 foi executada num
checkout macOS sem runtime Node, sem `node_modules` e sem snapshot Canary: as fontes autoradas
(`validateSliceSelection.ts`, `pb-01-contract-coverage.json` e os dois testes que espelham a ficha)
estão na `main`, mas `packages/content/catalog/operations/0001-pb01-contract-coverage.json`,
`packages/content/src/generated/pb-01-contract-coverage.json{,.sha256}` e
`docs/content/generated/PB-01-CATALOG.md` ainda carregam a escada antiga, e nenhum gate rodou.
Numa máquina com toolchain e `HUNTBOUND_CANARY_SOURCE`: `node tools/content-catalog/cli.ts
import-canary`, `corepack pnpm content:catalog:rebuild`, `corepack pnpm content:generate`, depois
`biome check .`, `corepack pnpm test:content` e `corepack pnpm content:check`. Vermelho ali é
`PB-13-01-FIX-01`.

A PB-13-03 correu no mesmo checkout e herdou o mesmo bloqueio, com uma consequência a mais: ela
sobe `SAVE_SCHEMA_VERSION` de 2 para 3 (campo `character`, autorizado pela card), e isso **move os
goldens de save** — `packages/test-fixtures/save/pb06/{checkpoint.golden.json,export.golden.txt,
migrated.golden.json}`, seus `.sha256` e `hashes.md`. Eles não foram regenerados porque o CLI precisa
de Node, e o guard de agente recusa edição manual de `.golden.` — corretamente. Numa máquina com
toolchain, regenere com `node --no-warnings --experimental-transform-types tools/save/cli.ts run
--dir packages/test-fixtures/save/pb06` e depois rode `corepack pnpm save:check`. A linha da task é
`biome check .`, os testes diretamente afetados
(`packages/content/src/runtime/knightProgression.test.ts`,
`packages/save/src/{migrations/migrateSaveDocument,session/checkpointScheduler}.test.ts`,
`apps/game/src/{save/SaveSession,hunt/CombatViewModel,ui/CombatHud,ui/HuntingPlaces,main}.test.ts`),
`save:check` depois da regeneração acima e `architecture:check`. `simulation:check`, `hunt:check`,
`combat:check` e `content:check` **não** deveriam se mover: a escada autorada continua intacta e os
tools de fixture ainda leem `runtime.characters[0]`. Vermelho ali é `PB-13-03-FIX-01`.

A PB-13-04 correu no mesmo checkout macOS, ainda sem runtime Node e sem snapshot Canary, e é a
task que mais depende da regeneração: `parseItemsXml` passou a ler `attack`, `defense`, `armor`,
`slotType` e `weaponType`, mas esses números só entram no catálogo pelo `import-canary`. Até o
pipeline rodar, nenhum item gerado tem stat de equipamento, o painel de equipamento do atlas mostra
todos os slots vazios e o set de cada faixa conta `0 / 0`. A sequência do B27 acima resolve isso e
**precisa incluir** `content:catalog:rebuild` depois da migração nova
`tools/content-catalog/migrations/006_item_equipment.sql`.

Ela também sobe `SAVE_SCHEMA_VERSION` de 3 para 4 (`character.equipment` e `character.collection`,
autorizados pela card), o que move os mesmos goldens de save que a PB-13-03 já tinha movido —
regenere uma vez, com o comando do parágrafo anterior, e cubra as duas. **Não** subiu
`SIMULATION_SCHEMA_VERSION`: a card autoriza, mas `armor` entrou como campo aditivo com default `0`
em `ActorBlueprint`, o snapshot não carrega blueprints e cenário sem `armor` replica exatamente como
antes — subir a versão custaria regenerar quatro fixtures de simulação e hunt sem provar nada. A
linha da task é `biome check .`, os testes diretamente afetados
(`packages/content/src/runtime/equipment.test.ts`,
`packages/content/src/runtime/knightProgression.test.ts`,
`packages/content/src/importers/canary/xml/parseItemsXml.test.ts`,
`packages/save/src/session/{equipment,consolidateRun}.test.ts`,
`packages/simulation/src/kernel/combat.test.ts`, e os testes de save/contrato tocados),
`save:check` depois da regeneração, `architecture:check` e `content:check` pelo importador.
`simulation:check`, `hunt:check` e `combat:check` não deveriam se mover. Vermelho ali é
`PB-13-04-FIX-01`.

A PB-13-02 correu no mesmo checkout e herdou o mesmo bloqueio: nenhum gate rodou. A linha dela é
`biome check .`, os testes diretamente afetados
(`packages/save/src/session/consolidateRun.test.ts`, `apps/game/src/save/SaveSession.test.ts`,
`apps/game/src/ui/{CombatHud,AppShell,HuntingPlaces}.test.ts`), `save:check` e
`architecture:check`. Sem toolchain, o que foi verificado no lugar: os arquivos tocados passam o
syntax-check do Node, e `consolidateRun` foi executado à parte nos quatro casos (`completed`,
`abandoned`, `died`, chamada dupla). Isso não substitui os gates. Vermelho ali é `PB-13-02-FIX-01`.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas": morte, personagem persistente, nascer no nível 1
com o kit inteiro, o set como eixo de progressão, curva comprimida que concede ataque, buff de
próxima hunt como gasto de gold, e autorização de contrato/schema/golden por card. Foram fechadas
pelo usuário em 2026-09-07 e não se reabrem dentro de uma task de implementação.

## Regra de atualização

Só status/commit na tabela; bloqueio e próxima elegível. Narrativa vai no commit, não aqui.
