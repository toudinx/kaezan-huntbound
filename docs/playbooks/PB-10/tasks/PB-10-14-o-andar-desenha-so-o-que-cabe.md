# PB-10-14 — O andar desenha só o que cabe na tela

**Objetivo.** `renderFloor` instancia um sprite por comando de desenho do andar inteiro, sem janela de
viewport, e destrói tudo a cada rebuild. Com a região saindo de 24 × 24 para 65 × 68 o custo do paint
acompanha a área. O andar passa a desenhar a vizinhança da câmera, e o número medido na PB-10-13
passa a caber num quadro.

**Onde.** `apps/game/src/phaser/scenes/HuntScene.ts:880` — `renderFloor`, e o que ele chama:
`destroySprites`, `syncCameraBounds`, `renderWorldEdge`. `apps/game/src/hunt/HuntPresentation.ts` —
`drawCommands` e `buildFloorDrawCommands`, que hoje varrem a região inteira.

**Fora de escopo.** Conteúdo, extração e selection. O minimapa, que já pinta a região toda por
desenho e é barato. `qa:budgets`, que é do usuário — esta task não tem objetivo de performance
medida, tem objetivo de a hunt grande caber.

**Decisões congeladas.**

- Culling é apresentação. A simulação não sabe o que está desenhado, e nada aqui pode olhar para a
  câmera de dentro de `packages/simulation`.
- A câmera segue o jogador e reenquadra por andar (`syncCameraBounds`). O enquadramento não muda.
- Ator não se corta por engano: um ator fora da janela pode não ter sprite, mas continua no
  `presentation.actors()` e no alvo do HUD.

**Gate.** Linha de `apps/game`: `biome check .`; o teste Vitest de `HuntPresentation` se a lógica de
comando mudou; `typecheck` se alguma assinatura mudou.

**O que olhar no jogo.** Orc Fortress na caixa cheia, com `corepack pnpm dev` de pé. Ande de ponta a
ponta do andar, passando pela borda do mapa: nenhum tile pode nascer visivelmente atrasado nem sumir
antes de sair da tela. Desça e suba pelas escadas — a troca de andar é o caminho que mais rebuild
dispara.
