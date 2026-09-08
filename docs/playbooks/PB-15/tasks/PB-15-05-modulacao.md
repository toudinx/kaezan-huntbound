# PB-15-05 — Modo modulado

**Objetivo.** Aplicar o modo modulado à build real conforme a 01, com preview de ficha/gear,
recompensa útil e retorno seguro ao modo livre.

**Onde.** packages/contracts/src/, packages/simulation/src/, packages/content/src/hunts/,
packages/save/src/, apps/game/src/hunt/readHuntCharacter.ts, apps/game/src/ui/HuntingPlaces.ts.

**Fora de escopo.** Escalar todo mundo ao jogador, ranking, dial extra e reroll de item.

**Decisões congeladas.** Design PB-15-01 e emenda 09 reconciliada. Preservar progresso permanente,
reconhecer a própria build e informar mudanças; **não substituir gear por preset silencioso** — foi
exatamente o preset por hunt que o PB-13-03 matou, e ele não volta pela porta da modulação. É esta
task que fecha o B26 do PB-13. **Autorizado nesta card:** subir `SIMULATION_SCHEMA_VERSION`
(`packages/contracts/src/simulation/identity.ts:8`) e/ou `SAVE_SCHEMA_VERSION`
(`packages/contracts/src/save/types.ts:4`), com campo aditivo, default que reproduz o comportamento
anterior e **sem novo draw de RNG**, regenerando os goldens que isso mover.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`.

**O que olhar no jogo.** Comparar livre/modulado, entrar com equipamento próprio, sair e recarregar;
ficha real deve permanecer íntegra e revisitar deve ter recompensa compreensível.
