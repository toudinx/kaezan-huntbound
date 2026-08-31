# PB-10-14 — O andar desenha só o que cabe na tela

**Objetivo.** `renderFloor` instancia um sprite por comando de desenho do andar inteiro, sem janela de
viewport, e destrói tudo a cada rebuild. Com a região saindo de 24 × 24 para 65 × 68 o custo do paint
acompanha a área. O andar passa a desenhar a vizinhança da câmera, e o número medido passa a caber
num quadro.

**O número, medido em 2026-08-31 depois das PB-10-13-FIX-01 a 04** — a baseline da PB-10-13 (5.427
comandos / 5.115 sprites em z6) está velha: o pack cobre a caixa inteira agora e **todo** comando
resolve. Por andar: **z6 2.356, z7 7.530, z8 4.490**, e o jogador começa em **z7**, que é o andar a
dimensionar.

**Onde.** `apps/game/src/phaser/scenes/HuntScene.ts:880` — `renderFloor`, e o que ele chama:
`destroySprites`, `syncCameraBounds`, `renderWorldEdge`. `apps/game/src/hunt/HuntPresentation.ts` —
`drawCommands` e `buildFloorDrawCommands`, que hoje varrem a região inteira.

**Fora de escopo.** Conteúdo, extração e selection. O minimapa, que já pinta a região toda por
desenho e é barato. `qa:budgets`, que é do usuário — esta task não tem objetivo de performance
medida, tem objetivo de a hunt grande caber.

Também fora: **o composite de andar vazio**. Em z6 a caixa tem 3.071 células sem chão, e
`resolveGroundSample` (`apps/game/src/hunt/GroundCompositor.ts`) preenche cada uma com o chão de z7
**sem** os objetos de z7, então a ledge lê como campo aberto sem parede. É a única coisa que o
jogador ainda estranha no mapa e **não é culling** — é o que o compositor escolhe desenhar. Se você
mexer nisso aqui, mexeu em duas tasks de uma vez; vira linha no `STATE.md`.

**Decisões congeladas.**

- Culling é apresentação. A simulação não sabe o que está desenhado, e nada aqui pode olhar para a
  câmera de dentro de `packages/simulation`.
- A câmera segue o jogador e reenquadra por andar (`syncCameraBounds`). O enquadramento não muda.
- Ator não se corta por engano: um ator fora da janela pode não ter sprite, mas continua no
  `presentation.actors()` e no alvo do HUD.

**Gate.** Linha de `apps/game`: `biome check .`; o teste Vitest de `HuntPresentation` se a lógica de
comando mudou; `typecheck` se alguma assinatura mudou.

**O que olhar no jogo.** Orc Fortress na caixa cheia, com `corepack pnpm dev` de pé. O jogador nasce
em (37, 40, z7), no miolo do forte. Ande de ponta a ponta do andar, passando pela borda do mapa:
nenhum tile pode nascer visivelmente atrasado nem sumir antes de sair da tela. Depois **desça um
buraco e volte pela escada** — são 12 transições agora, seis pares, e a troca de andar é o caminho
que mais rebuild dispara.
