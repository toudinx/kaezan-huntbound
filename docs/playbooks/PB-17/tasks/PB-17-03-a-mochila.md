# PB-17-03 — A mochila

> **Histórico; não executar.** A fila vigente recomeça no [PB-13](../../PB-13/README.md).
> Entregas integradas permanecem; pendências foram absorvidas pelas cards novas.


**Status inicial:** pending

**Classe da tarefa:** apresentação.

**Modelo sugerido:** camada econômica, effort `xhigh`.

**Paralelismo:** roda sozinha (compartilha `styles.css` com as demais).

## Objetivo

O loot deixa de ser um número que muda num canto e passa a ser uma mochila que se olha.

`HuntBag.ts` já resolve o sprite do item pelo manifesto e já tem 12 slots visíveis com contagem. O
que falta é tudo que faz uma mochila parecer uma mochila:

- **nome do item ao passar o mouse / no toque longo** — hoje o slot com sprite não diz o nome em
  lugar nenhum visível; ele existe só como rótulo acessível;
- **o item entrando.** `loot/granted` é emitido pelo kernel. Um slot que pisca quando recebe é a
  diferença entre "caiu algo" e "não sei se matei direito";
- **empilhamento legível** — a contagem hoje é um `span` solto no slot;
- **rolagem que não empurra a rail.** Acima de 12 entradas o grid cresce; a banda não pode crescer
  junto.

## Paths

- `apps/game/src/ui/cockpit/HuntBag.ts`
- `apps/game/src/hunt/CombatViewModel.ts` — só se a chegada do loot precisar ser projetada
- `apps/game/src/ui/CombatHud.ts`
- `apps/game/src/styles.css`

## Escopo negativo — leia antes de começar

**Item com stat, slot equipável e `armor` no kernel são PB-11.** Esta task não dá poder a nada: ela
mostra `RunBagEntry` — chave e contagem — bonito e legível. Se você sentir falta de um dado que o
`RunBagEntry` não tem, **pare e registre**, não invente campo.

Ordenação e filtro são helper, e helper é PB-15.

## Aceite

`corepack pnpm dev`, matar duas rotworms: os sprites aparecem, o slot reage à chegada, o nome se lê,
e encher a mochila não desloca o minimapa nem o alvo.

## Gates

`biome check .`, mais `typecheck` se assinatura mudou, mais `corepack pnpm test`.
