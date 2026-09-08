# PB-13-06 — Buff de próxima hunt

**Modelo sugerido.** GPT-5.6 Sol, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Dar ao gold um destino: uma compra entre runs, com preço, benefício e duração claros,
que vale pela run seguinte e termina de forma legível.

**Onde.** `packages/content/src/`, `packages/contracts/src/`, `packages/save/src/`,
`packages/simulation/src/kernel/`, `apps/game/src/ui/`, `apps/game/src/save/`. A seção *Extensões
Huntbound permitidas* de `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`.

**Fora de escopo.** Poção, runa e imbuement como sistemas; inventário de consumíveis; uso manual
durante a luta; reroll; dinheiro real. Implementar mais de um tipo de compra.

**Decisões congeladas.** README do PB-13, decisão 4: **o gasto é buff de próxima hunt** — comprado
entre runs, dura a run seguinte, sem inventário e sem spam manual. A ADR-05 já congelou a máquina de
cargas por hunt como *"N cargas, recarregadas fora de combate ou entre runs, sem inventário, sem
loja, sem `actor/use-item`"*; o buff **soma** a ela e não a substitui, e cargas continuam de graça —
não transformar em pago o que já existe grátis. **Autorizado nesta card, e obrigatório antes da
implementação:** escrever o bullet do buff comprado na seção *Extensões Huntbound permitidas* da
ADR-05, porque é extensão Huntbound nova e a decisão vinculante 1 exige que esteja listada.
**Também autorizado:** subir `SAVE_SCHEMA_VERSION` e, se o buff alcançar o cenário,
`SIMULATION_SCHEMA_VERSION`, aditivos com default que reproduz o comportamento anterior, e regenerar
os goldens que isso mover.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover + `architecture:check`. Somar `content:check` se o catálogo passar a declarar a compra.

**O que olhar no jogo.** Vender loot, comprar o buff, entrar e ver o benefício e o seu término.
Recarregar em momentos diferentes sem duplicar a compra nem renovar a duração.
