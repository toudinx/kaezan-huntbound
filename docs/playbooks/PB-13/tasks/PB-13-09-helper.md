# PB-13-09 — Helper mínimo e feedback

**Objetivo.** Entregar cura, alvo, ações e loot desligáveis, respeitando intervenção manual e o
benefício comprado. Explicar ações, rejeições e ganhos relevantes no cockpit sem cobrir o combate.

**Onde.** apps/game/src/hunt/, apps/game/src/ui/cockpit/, apps/game/src/simulation/,
packages/simulation/src/commands/, packages/contracts/src/; packages/simulation/src/kernel/ somente
para regra aprovada ausente.

**Fora de escopo.** Cavebot, navegação entre hunts, farm offline, editor de scripts e novas
vocações.

**Decisões congeladas.** ADR-05 e design PB-13-01. Helper emite comandos pelos caminhos normais, sem
burlar custo, alcance ou cooldown. IA de monstro não prova helper de jogador pronto.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff. Última task: build.

**O que olhar no jogo.** Alternar cada módulo, jogar manualmente e acompanhar outra luta.
Identificar cura, alvo, rejeição e loot; retomar controle imediatamente.
