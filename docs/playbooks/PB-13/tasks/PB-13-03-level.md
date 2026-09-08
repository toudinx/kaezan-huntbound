# PB-13-03 — Level e XP persistentes

**Objetivo.** Conceder XP pela caça e avanço de level, com um personagem que sobrevive à troca de
hunt. Substituir a ficha autorada por hunt como fonte de progresso.

**Onde.** `apps/game/src/hunt/readHuntCharacter.ts` resolve hoje a ficha por
`character:huntbound:<vocação>-<hunt>` e é o que deixa de existir; a escada autorada em
`packages/content/src/selections/validateSliceSelection.ts:106` vira ponto de partida do personagem,
não tabela consultada em runtime. Também `packages/contracts/src/`, `packages/save/src/`,
`packages/simulation/src/kernel/`, `packages/content/src/hunts/` e `apps/game/src/ui/`.

**Fora de escopo.** Skill grind por uso, talentos, modulação de faixa (é PB-15) e level cap
inventado na implementação.

**Decisões congeladas.** README do PB-13, decisões 2 e 3. Um personagem só; **toda hunt continua
aberta**, sem porta de level e sem preset de fallback. A curva move `sword` e o ataque efetivo, não
só `maxHealth` — uma curva que só engorda HP reproduz o defeito que a PB-13-01 corrigiu. Level não
tranca spell. **Autorizado nesta card:** subir `SAVE_SCHEMA_VERSION` e, se o personagem persistente
alcançar o cenário, `SIMULATION_SCHEMA_VERSION`
(`packages/contracts/src/simulation/identity.ts:8`, hoje 5), sempre com campo aditivo e default que
reproduz o comportamento anterior; regenerar os goldens que isso mover. **Também autorizado:** editar
o bullet *"personagem resolvido pela hunt escolhida, temporário até o PB-09"* da seção *Extensões
Huntbound permitidas* da ADR-05, que aponta para um playbook removido — esta task é o que o encerra.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check` se a escada autorada mudar de forma.

**O que olhar no jogo.** Caçar, ganhar level, sair e voltar; XP e ficha continuam os seus. Trocar de
hunt não pode trocar silenciosamente o personagem.
