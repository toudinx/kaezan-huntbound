# PB-13 — Estado

**Estado:** PB-13-01 implementada nas fontes; artefatos gerados pendentes de regeneração.
**Próxima:** PB-13-02 elegível depois de regenerar o catálogo (B27).

| ID | Status | Modelo previsto | Modelo / effort usado | Commit |
|---|---|---|---|---|
| PB-13-01 | done (gerados pendentes) | GPT-5.6 Sol `xhigh` | Claude Opus 5 `xhigh` | COMMIT_SHA |
| PB-13-02 | pending | GPT-5.6 Sol `xhigh` | — | — |
| PB-13-03 | pending | Claude Opus 5 `xhigh` | — | — |
| PB-13-04 | pending | Claude Opus 5 `xhigh` | — | — |
| PB-13-05 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-13-06 | pending | GPT-5.6 Sol `xhigh` | — | — |
| PB-13-07 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-13-08 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-13-09 | pending | Claude Opus 5 `xhigh` | — | — |

## Bloqueios

**B21 — aberto, endereçado pela PB-13-02.** Herdado do PB-10. `finish('completed')` não tem call
site em código de produção: `apps/game/src/main.ts:460` só chama `'abandoned'` no `pagehide`,
enquanto `packages/save/src/session/consolidateRun.ts:34` já implementa o ramo `'completed'`.
`completedRuns` é permanentemente 0 e não existe momento de recompensa.

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

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas": morte, personagem persistente, nascer no nível 1
com o kit inteiro, o set como eixo de progressão, curva comprimida que concede ataque, buff de
próxima hunt como gasto de gold, e autorização de contrato/schema/golden por card. Foram fechadas
pelo usuário em 2026-09-07 e não se reabrem dentro de uma task de implementação.

## Regra de atualização

Só status/commit na tabela; bloqueio e próxima elegível. Narrativa vai no commit, não aqui.
