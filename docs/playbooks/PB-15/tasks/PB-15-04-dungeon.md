# PB-15-04 — Dungeon com começo e fim

**Objetivo.** Implementar a dungeon definida na 01, com encontros curados, boss, derrota, saída e
recompensa no loop existente.

**Onde.** packages/content/src/selections/, packages/content/src/layouts/,
packages/content/src/hunts/, packages/contracts/src/, packages/simulation/src/kernel/,
packages/save/src/, apps/game/src/hunt/, apps/game/src/ui/, packages/assets/.

**Fora de escopo.** Procedural, segunda dungeon, campanha narrativa e sync ainda não implementado.

**Decisões congeladas.** Design PB-15-01. Conteúdo existente e extensões registradas; não exigir
boss para concluir hunts livres. Recompensa mantém idempotência.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Entrar, atravessar encontros, vencer ou morrer e voltar à seleção;
recarregar sem duplicar recompensa nem pular progresso indevidamente.
