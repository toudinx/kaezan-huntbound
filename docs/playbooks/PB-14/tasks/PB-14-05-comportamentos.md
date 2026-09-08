# PB-14-05 — Comportamentos dos monstros

**Objetivo.** Dar às espécies curadas os papéis melee perseguidor, atacante ranged e conjurador de
área/suporte previstos na 01. Reutilizar conjuração existente e integrar sinais visuais necessários.

**Onde.** packages/simulation/src/kernel/kernel.ts, packages/simulation/src/kernel/hunterCast.ts,
packages/content/src/, packages/contracts/src/, apps/game/src/hunt/, packages/assets/.

**Fora de escopo.** IA generativa, behavior tree genérica, espécies sem papel novo, boss desta
próxima etapa.

**Decisões congeladas.** Design PB-14-01. Determinismo, RNG seedado e regras de alvo/alcance
permanecem; comportamentos vêm do acervo ou de extensão explícita.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Enfrentar os três papéis; perceber suas diferenças e uma resposta possível.
Monstro fora de tela continua simulado.
