# PB-15-05 — Modo modulado

**Objetivo.** Aplicar o modo modulado à build real conforme a 01, com preview de ficha/gear,
recompensa útil e retorno seguro ao modo livre.

**Onde.** packages/contracts/src/, packages/simulation/src/, packages/content/src/hunts/,
packages/save/src/, apps/game/src/hunt/readHuntCharacter.ts, apps/game/src/ui/HuntingPlaces.ts.

**Fora de escopo.** Escalar todo mundo ao jogador, ranking, dial extra e reroll de item.

**Decisões congeladas.** Design PB-15-01 e emenda reconciliada. Preservar progresso permanente,
reconhecer a própria build e informar mudanças; não substituir gear por preset silencioso.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Comparar livre/modulado, entrar com equipamento próprio, sair e recarregar;
ficha real deve permanecer íntegra e revisitar deve ter recompensa compreensível.
