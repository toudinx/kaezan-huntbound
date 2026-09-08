# PB-13-02 — Escolher, concluir e voltar à hunt

**Modelo sugerido.** GPT-5.6 Sol, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Entregar seleção com preview, saída explícita e retorno ao atlas sem F5. Consolidar os
ganhos da run uma única vez, preservando retomada, abandono e backup.

**Onde.** `apps/game/src/main.ts:460` é hoje o único call site de `finish` e passa sempre
`'abandoned'`, no `pagehide`; `packages/save/src/session/consolidateRun.ts:34` já implementa o ramo
`'completed'` e ninguém o alcança, então `completedRuns` é permanentemente 0. Também
`apps/game/src/ui/HuntingPlaces.ts`, `apps/game/src/save/`, `packages/save/src/session/` e
`packages/contracts/src/save/`.

**Fora de escopo.** Gear, XP, NPC, buff comprado, dungeon e controle de dificuldade.

**Decisões congeladas.** README do PB-13, decisão 1: morrer perde a bag e o crédito da run, nunca XP
nem level. A recompensa nasce da caça, não de um baú final. O preview sai dos dados do índice de
hunts já gerado; não carregar cinco packs inteiros para desenhar uma tela.
**Autorizado nesta card:** subir `SAVE_SCHEMA_VERSION` (`packages/contracts/src/save/types.ts:4`,
hoje 2) se a consolidação exigir, com campo aditivo e default que reproduz o save anterior, e
regenerar os goldens de `packages/test-fixtures/save/pb06`. Migração precisa ler o save v2 existente
sem apagá-lo; se só houver caminho destrutivo, aí sim pare conforme `AGENTS.md`.

**Gate.** Linha `packages/save`/`contracts`: teste afetado + `save:check` + `architecture:check`.
Somar a linha de `apps/game` pelo que o diff tocar na cena e na UI.

**O que olhar no jogo.** Entrar, obter loot, sair pela saída explícita e escolher outra hunt sem F5.
Recarregar antes e depois da saída e conferir que a bolsa não duplica nem some.
