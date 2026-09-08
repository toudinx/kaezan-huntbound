# PB-15-04 — Dungeon com começo e fim

**Modelo sugerido.** Claude Opus 5, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Implementar a dungeon definida na 01, com encontros curados, boss, derrota, saída e
recompensa no loop existente.

**Onde.** packages/content/src/selections/, packages/content/src/layouts/,
packages/content/src/hunts/, packages/contracts/src/, packages/simulation/src/kernel/,
packages/save/src/, apps/game/src/hunt/, apps/game/src/ui/, packages/assets/.

**Fora de escopo.** Procedural, segunda dungeon, campanha narrativa e sync ainda não implementado.

**Decisões congeladas.** Design PB-15-01 e decisões congeladas do PB-13. Conteúdo existente e
extensões registradas; não exigir boss para concluir hunts livres. Recompensa mantém idempotência —
morrer na dungeon segue a regra do PB-13: perde a bag e o crédito, nunca XP nem level. **Autorizado nesta card:** subir
`SIMULATION_SCHEMA_VERSION` (`packages/contracts/src/simulation/identity.ts:8`) e/ou
`SAVE_SCHEMA_VERSION` (`packages/contracts/src/save/types.ts:4`) quando a entrega exigir, sempre com
campo aditivo, default que reproduz o comportamento anterior e **sem novo draw de RNG** — deslocar os
streams quebraria todo replay —, regenerando os goldens que isso mover.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check`/`assets:check` pelo que o diff tocar em conteúdo.

**O que olhar no jogo.** Entrar, atravessar encontros, vencer ou morrer e voltar à seleção;
recarregar sem duplicar recompensa nem pular progresso indevidamente.
