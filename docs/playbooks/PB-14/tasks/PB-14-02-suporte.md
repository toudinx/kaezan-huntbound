# PB-14-02 — Suporte aos kits curados

**Modelo sugerido.** Grok 4.6, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Implementar somente as lacunas de combate compartilhadas identificadas na 01 que
impedem os kits selecionados. Preservar o comportamento existente onde a mudança não é intencional.

**Onde.** packages/contracts/src/, packages/simulation/src/kernel/, packages/content/src/hunts/,
packages/save/src/ quando houver compatibilidade de sessão afetada.

**Fora de escopo.** Framework genérico para habilidades futuras, classes completas e comportamento
não selecionado.

**Decisões congeladas.** Design PB-14-01 e decisões congeladas do PB-13. Se a capacidade já
existir, reutilizar e registrar que não houve diff; não reimplementar. **Autorizado nesta card:** subir
`SIMULATION_SCHEMA_VERSION` (`packages/contracts/src/simulation/identity.ts:8`) e/ou
`SAVE_SCHEMA_VERSION` (`packages/contracts/src/save/types.ts:4`) quando a entrega exigir, sempre com
campo aditivo, default que reproduz o comportamento anterior e **sem novo draw de RNG** — deslocar os
streams quebraria todo replay —, regenerando os goldens que isso mover.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check`/`assets:check` pelo que o diff tocar em conteúdo.

**O que olhar no jogo.** No cenário afetado, comparar alcance, linha de visão e resposta elemental
relevantes; o Knight continua funcionando.
