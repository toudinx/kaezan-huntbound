# PB-08-01 — `exori` fecha o box

**Status inicial:** pending

**Classe da tarefa:** correção de fidelidade em conversão de conteúdo; sem sistema novo

**Modelo sugerido:** modelo econômico com effort alto — a especificação está fechada

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** paralela com PB-08-02. Nenhum arquivo em comum.

## Objetivo

Fazer `exori` bater em todas as criaturas adjacentes, como no Canary. Hoje bate em uma.

## O defeito, com evidência

`data/scripts/spells/attack/berserk.lua` no snapshot declara:

```lua
combat:setArea(createCombatArea(AREA_SQUARE1X1))
```

`AREA_SQUARE1X1` é o quadrado 3×3 centrado no conjurador — até oito criaturas.

Do lado do Huntbound, `packages/content/src/selections/pb-05-knight-combat.json` **não declara
`area` em nenhuma das três magias**. `abilityShapeFromSpell`, em
`packages/content/src/hunts/combatConversion.ts`, faz:

```ts
if (spell.area !== undefined) { return { shape: 'area', radius: spell.area.radiusTiles, rangeTiles: 0 }; }
if (spell.damageType === 'healing') { return { shape: 'self', radius: 0, rangeTiles: 0 }; }
return { shape: 'target', radius: 0, rangeTiles: MELEE_RANGE_TILES };
```

Sem `area`, `exori` cai no último `return` e vira alvo único. **O box-closer do Knight é
single-target por omissão de dado, não por decisão.**

`SpellDefinitionSchema` já tem o campo (`area?: { shape: 'square', radiusTiles }`), e o kernel já
resolve `shape: 'area'` por raio em `packages/simulation/src/kernel/combat.ts`. Nada precisa ser
inventado: falta preencher e falta o gate cobrir a omissão.

## Resultado esperado

Um `exori` com quatro rotworms adjacentes emite quatro `combat/damaged` no mesmo tick. Com um
rotworm adjacente, emite um. E o `pb05:selection:check` passa a **reprovar** uma selection que
esqueça a área de uma magia que tem `setArea` na fonte — para que este defeito não possa voltar em
silêncio.

## Dependências

Nenhuma. Roda sobre a `main` atual.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-08/README.md`, o problema medido e as decisões congeladas;
3. `docs/content/PB-07-ROTATIONS.md`, a seção Knight — kit e rotação em hunt;
4. `.cursor/rules/20-content.mdc` e `.cursor/rules/50-tests.mdc`;
5. `packages/content/src/hunts/combatConversion.ts` — `abilityShapeFromSpell`;
6. `packages/content/src/selections/pb-05-knight-combat.json`;
7. `packages/contracts/src/content/schemas.ts` — `SpellDefinitionSchema`, o campo `area`;
8. `packages/simulation/src/kernel/combat.ts` — o ramo de `shape === 'area'` e o uso de `radius`;
9. `tools/hunt-selection/**` — como `check-combat` já valida mana, nível e cooldown contra a fonte;
10. `references/canary/data/scripts/spells/attack/berserk.lua`.

## Decisões congeladas

- **A área sai do snapshot, não da nossa cabeça.** `AREA_SQUARE1X1` → `radiusTiles: 1`. Se outra
  magia do kit tiver `setArea` com outra constante, converta pela geometria real da constante, e
  registre o mapeamento em um único lugar no tool de selection.
- **O mapeamento de constante para raio é dado, não `if` espalhado.** Uma tabela
  `AREA_* → radiusTiles`, testada, no tool de hunt-selection.
- **Área é centrada no conjurador.** `rangeTiles: 0` para área, como `abilityShapeFromSpell` já faz.
  Não invente alcance para magia de área neste playbook.
- **`exori ico` e `exura ico` continuam como estão.** `brutal_strike.lua` e `wound_cleansing.lua` não
  têm `setArea`; mexer nelas aqui é fora de escopo.

## Ambiguidade conhecida — e a saída

O kernel emite `SIM_ABILITY_OUT_OF_RANGE` para habilidade sem alvo válido. Verifique se um `exori`
com **zero** criaturas adjacentes é rejeitado, cobrado de mana, ou aceito sem efeito. Qualquer das
três é defensável.

Escolha a mais simples e reversível — **cobrar a mana e não emitir dano**, que é o comportamento do
Canary para AoE no vazio — e registre a escolha em uma linha do commit. Não abra ciclo de pergunta
por isso.

## Passos

1. **Teste primeiro.** No kernel, um cenário com o jogador cercado por quatro criaturas e uma
   ability de `shape: 'area'`, `radius: 1`: um cast, quatro `combat/damaged` no mesmo tick, ordem
   determinística. Repita com uma criatura, e com zero.
2. **Teste de conversão.** `abilityShapeFromSpell` com uma `SpellDefinition` que tem
   `area: { shape: 'square', radiusTiles: 1 }` devolve `shape: 'area'`, `radius: 1`.
3. **Teste do gate.** `check-combat` reprova uma selection cuja magia tem `setArea` na fonte e não
   tem `area` na selection. Este é o teste que impede a regressão.
4. Preencha `area` em `exori` na selection, com o campo de proveniência no padrão que a selection já
   usa para mana, nível e cooldown.
5. Implemente a tabela `AREA_* → radiusTiles` e a validação no tool.
6. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm test`
- `corepack pnpm pb05:selection:check`
- `corepack pnpm content:check`
- `corepack pnpm combat:check` — **deve continuar verde sem regenerar golden.** Se o golden do PB-05
  quebrar, pare: significa que a mudança alterou uma sequência já congelada, e isso não estava
  previsto. Registre como bloqueio.
- `corepack pnpm verify` no fechamento.

## Definition of Done

- [ ] Um cast de `exori` atinge todas as criaturas adjacentes, provado por teste de kernel.
- [ ] `check-combat` reprova selection que omita área existente na fonte.
- [ ] Golden do PB-05 **inalterado**.
- [ ] `verify` verde.
- [ ] `STATE.md` atualizado só na linha da task.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.
