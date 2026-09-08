# PB-13-04 — O set da faixa e a coleção de rares

**Objetivo.** Dar à hunt de referência um **set próprio da faixa**, farmável e completável, que muda
o combate e persiste no personagem. É este set — não o level — que é o motivo de ficar na hunt, e é
ele que sustenta a faixa seguinte.

**Onde.** `ItemDefinition` carrega hoje só `{ stackable, maxStackSize, weight }` e `parseItemsXml`
descarta `attack`, `defense`, `armor`, `slot` e `weaponType` de propósito — é o que esta task passa a
ler, em `packages/content/src/importers/canary/xml/`. Também `packages/content/src/selections/`,
`packages/contracts/src/`, `packages/simulation/src/kernel/`, `packages/save/src/` e
`apps/game/src/ui/InventoryPanel.ts`. O loot já congelado por faixa está em
`docs/content/HUNT_BANDS.md`, seção 2.

**Fora de escopo.** Set das cinco faixas — aqui é **uma** hunt de referência. Importação massiva de
itens, affixes, reroll, craft, venda (é a 05) e modulação de gear (é PB-15).

**Decisões congeladas.** README do PB-13, decisões 4 e 5: o set é o eixo de progressão, e o set de
uma faixa é o que segura a faixa seguinte. Equipamento persiste no personagem da PB-13-03, não numa
segunda casa. Stat defensivo precisa ter efeito real no combate, não só aparecer na ficha. Vale o
princípio de design do PB-08 — uma forma por faixa, nada convive com a própria versão obsoleta: o set
da faixa é **um** conjunto, não cinco espadas quase idênticas em que a melhor domina. Sair do loot
que a Lua da espécie já declara; não inventar drop. **Autorizado nesta card:** subir
`SIMULATION_SCHEMA_VERSION` (`packages/contracts/src/simulation/identity.ts:8`, hoje 5) para levar
`armor` ao kernel, com campo aditivo, default `0`, mitigação **determinística e sem novo draw de
RNG** — deslocar os streams quebraria todo replay —, regenerando os goldens que isso mover. Idem
`SAVE_SCHEMA_VERSION` para os slots e a coleção.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check` pelo importador.

**O que olhar no jogo.** Caçar até cair uma peça, comparar, equipar e sentir a diferença. Ver quanto
falta para o set fechar. Recarregar e conferir set e coleção; peça pior continua na bolsa para vender.
