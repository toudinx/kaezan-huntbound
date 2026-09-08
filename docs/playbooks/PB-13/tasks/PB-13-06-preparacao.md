# PB-13-06 — Comprar preparação com gold

**Objetivo.** Entregar um único uso inicial de gold escolhido na 01, com preço, benefício, duração e
consumo claros. Integrar o efeito ao combate e à persistência.

**Onde.** packages/content/src/, packages/contracts/src/, packages/save/src/,
packages/simulation/src/kernel/, apps/game/src/ui/, apps/game/src/save/.

**Fora de escopo.** Implementar buffs, imbuements, poções e runas juntos; reroll; dinheiro real.

**Decisões congeladas.** Design PB-13-01. Reconciliar compra com cargas, regen e leech existentes.
Se houver consumível, seu uso não exige spam manual; helper deve poder operá-lo.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Comprar, entrar, observar o benefício e seu término. Recarregar em momentos
distintos sem duplicar compra ou renovar duração indevidamente.
