# PB-14-05 — Comportamentos dos monstros

**Modelo sugerido.** Grok 4.6, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Dar às espécies curadas os papéis melee perseguidor, atacante ranged e conjurador de
área/suporte previstos na 01. Reutilizar conjuração existente e integrar sinais visuais necessários.

**Onde.** packages/simulation/src/kernel/kernel.ts, packages/simulation/src/kernel/hunterCast.ts,
packages/content/src/, packages/contracts/src/, apps/game/src/hunt/, packages/assets/.

**Fora de escopo.** IA generativa, behavior tree genérica, espécies sem papel novo, boss desta
próxima etapa.

**Decisões congeladas.** Design PB-14-01. Determinismo, RNG seedado e regras de alvo/alcance
permanecem; comportamentos vêm do acervo ou de extensão explícita. **Autorizado nesta card:** subir
`SIMULATION_SCHEMA_VERSION` (`packages/contracts/src/simulation/identity.ts:8`) e/ou
`SAVE_SCHEMA_VERSION` (`packages/contracts/src/save/types.ts:4`) quando a entrega exigir, sempre com
campo aditivo, default que reproduz o comportamento anterior e **sem novo draw de RNG** — deslocar os
streams quebraria todo replay —, regenerando os goldens que isso mover.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check`/`assets:check` pelo que o diff tocar em conteúdo.

**O que olhar no jogo.** Enfrentar os três papéis; perceber suas diferenças e uma resposta possível.
Monstro fora de tela continua simulado.
