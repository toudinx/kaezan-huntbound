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

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas": morte, personagem persistente, curva que concede
ataque, buff de próxima hunt como gasto de gold, e autorização de contrato/schema/golden por card.
Foram fechadas pelo usuário em 2026-09-07 e não se reabrem dentro de uma task de implementação.

## Regra de atualização

Só status/commit na tabela; bloqueio e próxima elegível. Narrativa vai no commit, não aqui.
