# PB-17-FIX-02 — Um frame, não a folha inteira

> **Histórico; não executar.** A fila vigente recomeça no [PB-13](../../PB-13/README.md).
> Entregas integradas permanecem; pendências foram absorvidas pelas cards novas.


## Objetivo

Achado no playtest de 2026-08-31: o retrato do alvo, os slots da mochila e os nove ícones do deck
desenham a **folha inteira** encolhida na célula — as quatro direções e todos os frames da rotworm, e
todos os tiers de pilha do `gold-coin` e do `meat`. Cada painel passa a desenhar **um** frame.

## Onde

Causa localizada, não reinvestigue: os três painéis mandam a atlas inteira para `<img src>`.

- `apps/game/src/ui/cockpit/TargetWindow.ts:177`
- `apps/game/src/ui/cockpit/HuntBag.ts:104`
- `apps/game/src/ui/cockpit/AbilityGlyph.ts:155`
- as três assinaturas locais de `resolveAsset` — `TargetWindow.ts:16`, `HuntBag.ts:4`,
  `ActionDeck.ts:37` — que estreitam o asset a `{ mediaUrl }` e descartam o resto
- `apps/game/src/styles.css`

Apoio: `providers/types.ts:11` é o que a assinatura descarta; `ActorFrame.ts:103` já escolhe frame.

## Fora de escopo

- Packer, pack, source-lock e `packages/assets`: nenhum artefato gerado se regenera aqui.
- Retrato animado ou virando com o combate. Um frame parado resolve o defeito.
- B19 e o `vitest.config.ts` do packer é a `PB-17-FIX-01`; stat e slot equipável são PB-11.

## Decisões congeladas

`cellWidth`, `cellHeight`, `columns` e `atlasFrameCount` já chegam do pack instalado — nada de dado
novo. Se faltar dado para escolher o frame, **pare e registre** no `STATE.md`.

## Gate

Linha `apps/game`: `biome check .`, `typecheck` (a assinatura muda) e o teste focado dos painéis.

## O que olhar no jogo

`corepack pnpm dev`, entrar numa hunt de rotworm e matar duas: o retrato mostra **uma** rotworm, os
slots mostram uma moeda e um pedaço de carne, e as nove teclas mostram nove ícones distintos.
