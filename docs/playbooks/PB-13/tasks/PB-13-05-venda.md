# PB-13-05 — Vender loot a NPC

**Modelo sugerido.** GPT-5.6 Luna, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Permitir vender loot a NPC por gold com preços curados, carteira persistente e
quantidade clara. Proteger a coleção de rares da venda acidental.

**Onde.** `packages/contracts/src/save/`, `packages/save/src/`, `packages/content/src/`,
`apps/game/src/ui/InventoryPanel.ts`, `apps/game/src/save/`.

**Fora de escopo.** NPC com quests ou diálogo, mercado entre jogadores, recompra, inflação simulada
e o gasto do gold — é a 06.

**Decisões congeladas.** README do PB-13. Preço sai do snapshot Canary onde o item o declara; onde
não declarar, curar um número e dizer no commit qual foi o critério. Venda e crédito são **uma
operação consistente**: nunca perder item sem creditar gold, nunca creditar duas vezes numa recarga
no meio da transação. A interface pode ser simples — a task é a transação, não a tela.
**Autorizado nesta card:** subir `SAVE_SCHEMA_VERSION` para a carteira, com campo aditivo e default
que reproduz o save anterior, e regenerar os goldens de `packages/test-fixtures/save/pb06`.

**Gate.** Linha `packages/save`/`contracts`: teste afetado + `save:check` + `architecture:check`.
Somar `content:check` se os preços entrarem por catálogo.

**O que olhar no jogo.** Vender uma quantidade, conferir saldo e o que restou, recarregar e repetir.
Tentar vender um rare e ver a proteção agir.
