# PB-13-04 — Level e XP persistentes

**Objetivo.** Conceder XP pela caça e avanço de level conforme a curva definida, preservando o
personagem entre hunts. Substituir a ficha autorada por hunt como fonte de progresso.

**Onde.** packages/contracts/src/, packages/simulation/src/kernel/, packages/save/src/,
packages/content/src/hunts/, apps/game/src/hunt/readHuntCharacter.ts, apps/game/src/ui/.

**Fora de escopo.** Skill grind, talentos, sync definitivo e level cap inventado na implementação.

**Decisões congeladas.** Design PB-13-01. Level não tranca spell. Declarar o acesso às faixas
durante a transição para personagem persistente, sem fingir que preset já é modulação.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Caçar, ganhar level, sair e voltar; confirmar XP e ficha. Trocar hunt não
pode trocar silenciosamente seu personagem.
