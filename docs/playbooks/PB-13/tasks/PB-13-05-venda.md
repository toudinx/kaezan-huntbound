# PB-13-05 — Vender loot a NPC

**Objetivo.** Permitir vender loot a NPC por gold com preços curados, carteira persistente e
quantidade clara. Proteger a coleção conforme a política definida na 01.

**Onde.** packages/contracts/src/save/, packages/save/src/, packages/content/src/,
apps/game/src/ui/InventoryPanel.ts, apps/game/src/save/.

**Fora de escopo.** NPC com quests, mercado entre jogadores, recompra ou inflação simulada.

**Decisões congeladas.** Design PB-13-01. Venda e crédito são uma operação consistente; não perder
item sem gold nem creditar duas vezes. A interface de NPC pode ser simples.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Vender uma quantidade, conferir saldo e restante, recarregar e repetir.
Conferir o aviso ou proteção de rares definido no design.
