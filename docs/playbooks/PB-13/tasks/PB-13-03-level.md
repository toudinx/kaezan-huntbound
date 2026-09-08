# PB-13-03 — Level e XP persistentes

**Objetivo.** Um personagem que nasce no nível 1, sobrevive à troca de hunt e sobe de nível caçando.
Substituir a ficha autorada por hunt como fonte de progresso.

**Onde.** `apps/game/src/hunt/readHuntCharacter.ts` resolve hoje a ficha por
`character:huntbound:<vocação>-<hunt>` e é o que deixa de existir; a escada autorada em
`packages/content/src/selections/validateSliceSelection.ts:106` vira ponto de calibração da curva,
não tabela consultada em runtime. Também `packages/contracts/src/`, `packages/save/src/`,
`packages/simulation/src/kernel/`, `packages/content/src/hunts/` e `apps/game/src/ui/`.

**Fora de escopo.** Skill grind por uso, talentos, modulação de faixa (é PB-15), level cap inventado
na implementação e conteúdo novo para os níveis 1–8.

**Decisões congeladas.** README do PB-13, decisões 2 a 6. Um personagem só, **nascendo no nível 1
com as cinco spells na mão** — a regra 4 da *Curadoria de conteúdo* da ADR-05 já congelou que
nenhuma ação é trancada por level, então não existe kit parcial. HP sai do Canary e não se inventa:
`healthmax = 150` no nível 1, +5 nos níveis 2–8, `gainhp = 15` a partir do 9
(`docs/content/HUNT_BANDS.md:335`). **Toda hunt continua aberta**, sem porta de level e sem preset de
fallback. A curva move `sword` e o ataque efetivo, não só `maxHealth`. **A curva do Tibia não é
adotada:** ela cobraria 82 h para atravessar as cinco hunts, 34 delas paradas em Cyclopolis; autore
uma curva Huntbound comprimida contra o `experiencePerHour` que o índice de hunts já calcula, porque
o eixo de progressão é o set e não o contador. **Autorizado nesta card:** subir
`SAVE_SCHEMA_VERSION` e, se o personagem persistente alcançar o cenário,
`SIMULATION_SCHEMA_VERSION` (`packages/contracts/src/simulation/identity.ts:8`, hoje 5), aditivos
com default que reproduz o comportamento anterior, regenerando os goldens que isso mover. **Também
autorizado:** editar o bullet *"personagem resolvido pela hunt escolhida, temporário até o PB-09"*
da seção *Extensões Huntbound permitidas* da ADR-05 — esta task é o que o encerra.

**Gate.** Linha `packages/simulation`/`contracts`/`save`: teste afetado + os goldens que este diff
mover (`simulation:check`, `hunt:check`, `combat:check`, `save:check`) + `architecture:check`. Somar
`content:check` se a escada autorada mudar de forma.

**O que olhar no jogo.** Começar do zero e sentir se a rampa 1→8 é curta. Caçar, subir de nível, sair
e voltar: XP e ficha continuam os seus, e trocar de hunt não troca o personagem.
