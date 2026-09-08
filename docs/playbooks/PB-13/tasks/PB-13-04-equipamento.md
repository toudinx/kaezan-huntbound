# PB-13-04 — Equipamento e coleção de rares

**Objetivo.** Fazer um subconjunto de drops Canary melhorar ou alterar o set, com comparação e
equipamento persistente no personagem. Dar aos rares um registro de coleção.

**Onde.** `ItemDefinition` carrega hoje só `{ stackable, maxStackSize, weight }` e
`parseItemsXml` descarta `attack`, `defense`, `armor`, `slot` e `weaponType` de propósito — é o que
esta task passa a ler, em `packages/content/src/importers/canary/xml/`. Também
`packages/content/src/selections/`, `packages/contracts/src/`, `packages/simulation/src/kernel/`,
`packages/save/src/` e `apps/game/src/ui/InventoryPanel.ts`.

**Fora de escopo.** Importação massiva de itens, affixes, reroll, craft, venda (é a 05) e slots além
do recorte. Modulação de gear é PB-15.

**Decisões congeladas.** README do PB-13. Equipamento persiste no personagem da PB-13-03, não numa
segunda casa. Stat defensivo precisa ter efeito real no combate, não só aparecer na ficha. Vale o
princípio de design do PB-08: uma forma por faixa, nada convive com a própria versão obsoleta — não
se colecionam cinco espadas quase idênticas em que a melhor domina. Artefato gerado sai do pipeline.
**Autorizado nesta card:** subir `SIMULATION_SCHEMA_VERSION`
(`packages/contracts/src/simulation/identity.ts:8`, hoje 5) para levar `armor` ao kernel, com campo
aditivo, default `0`, mitigação **determinística e sem novo draw de RNG** — deslocar os streams
quebraria todo replay —, e regenerar os goldens que isso mover. Idem `SAVE_SCHEMA_VERSION` para os
slots e a coleção.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check` pelo importador.

**O que olhar no jogo.** Obter um item, comparar, equipar e sentir o efeito. Recarregar e conferir
set e coleção; um item pior continua na bolsa para vender depois.
