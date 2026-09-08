# PB-13-01 — A escada de poder do Knight

**Objetivo.** Fazer o dano do Knight crescer junto com a hunt. Hoje quatro das cinco fichas têm
`sword: 60` e `weaponAttack: 14` idênticos, então o dano máximo anda 8% do Orc Fortress ao Dragon
Lair enquanto a vida anda 153% e a criatura vai de orc a dragão. Ao fim disto as cinco hunts são
jogáveis sem que a de cima vire desgaste.

**Onde.** `packages/content/src/selections/validateSliceSelection.ts:106` autora a escada;
`packages/content/src/selections/pb-01-contract-coverage.json` a espelha. Regenerar
`packages/content/src/generated/` pelo tool. As fórmulas que consomem estão em
`packages/content/src/hunts/combatConversion.ts:110` e não mudam.

**Fora de escopo.** Level persistente, XP, equipamento, `armor` no kernel, ataque vindo do item. A
ficha continua sendo escolhida pela hunt — isso morre na PB-13-03, não aqui. Não rebalancear
criatura: o lado do monstro sai do snapshot e fica como está.

**Decisões congeladas.** README do PB-13, decisão 3: a escada concede ataque, não só vida. O kit de
cinco spells e as fórmulas do snapshot não se redesenham; o que muda são `skills.sword`,
`weaponAttack` e, se a arma da faixa justificar, `weaponItemKey`/`weaponSourceId` — que já variam no
Hero Cave. **Mexer na ficha do Venore Rotworm Cave move os goldens de PB-04 e PB-05**, replayados
contra ela; a card autoriza regenerá-los, e o commit tem que dizer que a mudança é intencional e
qual número a causou. Golden de outra hunt que se mover sem você ter tocado na ficha dela é sinal de
erro, não de sucesso — pare e investigue.

**Gate.** Linha `packages/content`: teste afetado + `content:check`. Como os goldens de PB-04/PB-05
se movem, somar `hunt:check` e `combat:check` depois de regenerar.

**O que olhar no jogo.** Entrar no Orc Fortress e no Dragon Lair e comparar quantos golpes cada
criatura leva. A diferença entre as duas deve ser de dificuldade, não de duração.
