# PB-15-02 — Renderizar as hunts grandes

**Objetivo.** Limitar o desenho do andar à vizinhança visível para que as caixas completas não
instanciem sprites do mapa inteiro. Preservar câmera, atores e transições.

**Onde.** apps/game/src/phaser/scenes/HuntScene.ts, apps/game/src/hunt/HuntPresentation.ts;
referência histórica PB-10-14.

**Fora de escopo.** Conteúdo, simulação, reextração, reescrita do minimapa.

**Decisões congeladas.** Culling é apresentação; nada altera a simulação por estar fora de tela.
Objetivo explícito de performance: reduzir trabalho de desenho com os mapas grandes existentes.

**Gate.** Linha performance: build uma vez e qa:budgets:prebuilt; não rodar suíte de correctness.

**O que olhar no jogo.** Percorrer Orc Fortress e trocar andares sem tiles aparecendo tarde ou
sumindo cedo; comparar trabalho de desenho visível com o tamanho do andar.
