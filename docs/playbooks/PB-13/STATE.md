# PB-13 — Estado

**Estado:** planejado; nenhuma implementação iniciada.
**Próxima:** PB-13-01 elegível.

| ID | Status | Commit | Modelo / effort usado |
|---|---|---|---|
| PB-13-01 | pending | — | — |
| PB-13-02 | pending | — | — |
| PB-13-03 | pending | — | — |
| PB-13-04 | pending | — | — |
| PB-13-05 | pending | — | — |
| PB-13-06 | pending | — | — |
| PB-13-07 | pending | — | — |
| PB-13-08 | pending | — | — |
| PB-13-09 | pending | — | — |

## Bloqueios

**B21 — aberto, endereçado pela PB-13-02.** Herdado do PB-10. `finish('completed')` não tem call
site em código de produção: `apps/game/src/main.ts:460` só chama `'abandoned'` no `pagehide`,
enquanto `packages/save/src/session/consolidateRun.ts:34` já implementa o ramo `'completed'`.
`completedRuns` é permanentemente 0 e não existe momento de recompensa.

**B24 — aberto, endereçado pela PB-13-01.** A escada de poder do Knight não sobe do lado ofensivo:
`sword: 60` e `weaponAttack: 14` são idênticos no Orc Fortress (nv 25), Venore Rotworm Cave (35),
Cyclopolis (45) e Dragon Lair (70), autorados em
`packages/content/src/selections/validateSliceSelection.ts:106`. Como as fórmulas de
`packages/content/src/hunts/combatConversion.ts:110` são dominadas por `(skill + attack)`, o dano
máximo cresce 8% enquanto a vida cresce 153% e a criatura vai de orc a dragão. Reportado pelo usuário
jogando; medido em 2026-09-07.

**B25 — aberto, endereçado pela PB-13-01.** A ficha da faixa 1 contradiz a escada congelada em 27
níveis: `HUNT_BANDS.md:105` e o `recommendedLevel` do índice gerado dizem **nível 8**;
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

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas": morte, personagem persistente, nascer no nível 1
com o kit inteiro, o set como eixo de progressão, curva comprimida que concede ataque, buff de
próxima hunt como gasto de gold, e autorização de contrato/schema/golden por card. Foram fechadas
pelo usuário em 2026-09-07 e não se reabrem dentro de uma task de implementação.

## Regra de atualização

Só status/commit na tabela; bloqueio e próxima elegível. Narrativa vai no commit, não aqui.
