# PB-17-05 — O log de combate

> **Histórico; não executar.** A fila vigente recomeça no [PB-13](../../PB-13/README.md).
> Entregas integradas permanecem; pendências foram absorvidas pelas cards novas.


**Status inicial:** pending. **Task de fechamento do playbook.**

**Classe da tarefa:** superfície nova. A parte difícil é escolher o que **não** entra.

**Modelo sugerido:** camada frontier, effort `xhigh`.

**Paralelismo:** roda sozinha, por último.

## Objetivo

Uma linha de texto que diz o que acabou de acontecer com o jogador.

O kernel emite hoje, e a tela descarta: `combat/damaged`, `combat/healed`, **`combat/leeched`**,
**`combat/regenerated`**, `combat/attacked`, `loot/granted`, `actor/died` e **`command/rejected`**.

Os três em negrito são os que mais custam. Leech e regen foram o PB-07 inteiro — a sustentação é o
que define o Knight — e **nada na tela diz que existem**: a vida sobe sozinha e o jogador não sabe se
é a arma, a magia ou um bug. `command/rejected` é o oposto: o jogador aperta, nada acontece, e o
motivo já foi calculado e jogado fora.

## O que entra

- um painel de texto rolante, com as últimas linhas, no chassi que já existe;
- uma linha por evento relevante, na voz do Tibia — sujeito, verbo, número, causa;
- **fusão do que vem em rajada.** Regen dispara em cadência fixa; uma linha por tick transforma o log
  em cachoeira e apaga o dano que importava. Junte.

## O que **não** entra

Esta é a metade difícil da task, e ela é explícita:

- não é um chat, não é um servidor, não tem canal nem aba;
- não repete o que o número flutuante já diz **no mesmo instante e no mesmo lugar** —
  `CombatDecorations` já desenha `damage-number` sobre o alvo;
- não escreve evento de simulação cru na tela: o log fala em nomes do jogo, e a tradução é da view;
- não persiste em save.

## Paths

- `apps/game/src/ui/cockpit/` — o componente novo
- `apps/game/src/hunt/CombatViewModel.ts` — a projeção dos eventos em linhas
- `apps/game/src/ui/CombatHud.ts`, `apps/game/src/ui/cockpit/CockpitLayout.ts` — a banda
- `apps/game/src/styles.css`

## A fronteira que não se cruza

A simulação não aprende que existe texto. `CombatViewModel` é onde evento vira linha, e é ali que o
teste pequeno mora — projetar rajada de regen em uma linha fundida é exatamente o tipo de coisa que
converge mais rápido com um teste do que no browser.

## Aceite

`corepack pnpm dev`, entrar numa hunt e bater até quase morrer: o log diz quem bateu, quanto, quanto
a arma devolveu, o que caiu, e por que o `6` não saiu.

## Gates

`biome check .`, `typecheck`, `corepack pnpm test` — e, por ser a última task do playbook,
`corepack pnpm build`. `verify` e `qa:browser` continuam sendo do usuário.
