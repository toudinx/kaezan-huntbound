# PB-15-07 — Gacha cosmético e V0 integrado

**Modelo sugerido.** Claude Opus 5, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Conectar moeda obtida jogando ao pool pequeno de outfits, garantia de novidade,
duplicatas e tokens da ADR-05. Fechar o ciclo de coleção integrado às hunts e dungeon.

**Onde.** packages/contracts/src/save/, packages/save/src/, packages/content/src/,
apps/game/src/save/, apps/game/src/ui/; docs/playbooks/PB-15/STATE.md.

**Fora de escopo.** Dinheiro real, poder, novo banner complexo, auditoria obrigatória e correções
independentes não reportadas.

**Decisões congeladas.** Contrato de gacha da ADR-05; débito, prêmio, garantia e duplicata
persistem atomicamente. O gacha concede **somente outfit** — nunca set, stat ou poder, que são o eixo
de progressão do PB-13 e se ganham caçando. O fim do V0 é aceite dos marcos, não completar toda a
coleção. **Autorizado nesta card:** subir
`SIMULATION_SCHEMA_VERSION` (`packages/contracts/src/simulation/identity.ts:8`) e/ou
`SAVE_SCHEMA_VERSION` (`packages/contracts/src/save/types.ts:4`) quando a entrega exigir, sempre com
campo aditivo, default que reproduz o comportamento anterior e **sem novo draw de RNG** — deslocar os
streams quebraria todo replay —, regenerando os goldens que isso mover.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check`/`assets:check` pelo que o diff tocar em conteúdo. **Última task do playbook: rodar `corepack pnpm build` uma vez.** Última task: build.

**O que olhar no jogo.** Obter moeda jogando, fazer pulls, conferir garantia/duplicata/tokens e
recarregar. Repetir hunt e dungeon mantendo set, level e coleção.
