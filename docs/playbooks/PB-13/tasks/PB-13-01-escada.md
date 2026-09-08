# PB-13-01 — A escada de poder do Knight

**Modelo sugerido.** GPT-5.6 Sol, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Pôr as cinco fichas na faixa a que pertencem. Hoje a faixa 1 é autorada no nível 35
quando a escada congelada diz 8, e quatro das cinco fichas têm `sword: 60` e `weaponAttack: 14`
idênticos — o dano máximo anda 8% do Orc Fortress ao Dragon Lair enquanto a vida anda 153% e a
criatura vai de orc a dragão. Ao fim disto a hunt tutorial volta a ser tutorial e a de cima deixa de
ser desgaste.

**Onde.** `packages/content/src/selections/validateSliceSelection.ts:106` autora a escada;
`packages/content/src/selections/pb-01-contract-coverage.json` a espelha. Regenerar
`packages/content/src/generated/` pelo tool. As fórmulas que consomem estão em
`packages/content/src/hunts/combatConversion.ts:110` e não mudam.

**Fora de escopo.** Level persistente, XP, equipamento, `armor` no kernel, ataque vindo do item. A
ficha continua sendo escolhida pela hunt — isso morre na PB-13-03, não aqui. Não rebalancear
criatura: o lado do monstro sai do snapshot e fica como está.

**Decisões congeladas.** `docs/content/HUNT_BANDS.md` é a fonte da escada e **não se redesenha**: os
níveis são 8 / 25 / 45 / 70 / 130, a fórmula de HP é `HP(L) = 185 + 15 × (L − 8)` (`:335`), e o
próprio doc já diz que o skill interpola 10→60 entre os níveis 8 e 35 (`:360`). A faixa 1 desce para
o nível 8; as outras quatro já estão certas no nível e erradas no ataque. O kit de cinco spells e as
fórmulas do snapshot ficam como estão. **Mexer na ficha do Venore Rotworm Cave move os goldens de
PB-04 e PB-05**, replayados contra ela; a card autoriza regenerá-los, e o commit tem que dizer que a
mudança é intencional e qual número a causou. Golden de outra hunt que se mover sem você ter tocado
na ficha dela é sinal de erro, não de sucesso — pare e investigue.

**Gate.** Linha `packages/content`: teste afetado + `content:check`. Como os goldens de PB-04/PB-05
se movem, somar `hunt:check` e `combat:check` depois de regenerar.

**O que olhar no jogo.** A rotworm cave deve voltar a ser apertada — quatro mordidas comem quase a
barra inteira. Depois entrar no Orc Fortress e no Dragon Lair e comparar quantos golpes cada criatura
leva: a diferença entre as duas deve ser de dificuldade, não de duração.
