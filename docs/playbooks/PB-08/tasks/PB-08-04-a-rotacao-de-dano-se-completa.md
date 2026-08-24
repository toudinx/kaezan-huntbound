# PB-08-04 — A rotação de dano se completa

**Status inicial:** pending

**Classe da tarefa:** conteúdo sobre máquina pronta; sem regra de combate nova

**Modelo sugerido:** **GPT-5.6 Luna**, effort `xhigh`. Implementação geral bem especificada: as duas
magias saem do `KNIGHT_BANDS.md` com forma, custo e cooldown já decididos, e `radius` e `rangeTiles`
já estão implementados. **Escale** por qualquer gatilho da seção "Escalonamento Luna-first" da
`docs/08_POLITICA_MODELOS_AGENTES.md`.

**Validador sugerido:** gates automatizados.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **PB-08-03 integrada**. Paralelizável com 05 e 07 — mas as três tocam a
mesma fixture, então **integre uma de cada vez** e recomponha a fixture na sua vez (ver "O golden").

## Objetivo

Levar a rotação de dano do Knight de três ações para cinco, acrescentando **Groundshaker** e
**Whirlwind Throw**.

É a task mais importante do playbook. O README diz por quê: *"o mais importante é a rotação de dano;
é ela que produz o espetáculo, e utilidade é situacional por definição."*

## O que entra, com os números já decididos

Do `docs/content/KNIGHT_BANDS.md`, Seção 1, células 3 e 5. **Não recalcule; confira contra o Lua.**

| Célula | Magia | Words | Nv | Mana | CD | Grupo CD | Forma no contrato |
|---|---|---|---|---|---|---|---|
| 3 | **Groundshaker** | `exori mas` | 33 | 160 | 8 000 ms (160 t) | 2 000 ms (40 t) | `shape: 'area'`, **`radius: 3`** |
| 5 | **Whirlwind Throw** | `exori hur` | 28 | 40 | 6 000 ms (120 t) | 2 000 ms (40 t) | `shape: 'target'`, **`rangeTiles: 5`** |

Fontes: `references/canary/data/scripts/spells/attack/groundshaker.lua` e
`.../attack/whirlwind_throw.lua`. Fórmula de ambas: `skillAttack`, como Berserk.

## A divergência que você herda — leia antes de escolher o raio

`radius: 3` **não é o raio do snapshot**; é a tradução dele. O `AREA_CIRCLE3X3` do Canary é um disco
de 37 células. O kernel mede alcance em **Chebyshev** (`packages/simulation/src/kernel/combat.ts:117`),
então `radius: 3` acende um **quadrado 7×7**, 48 tiles de inimigo. São **12 tiles de canto a mais**
que o snapshot.

**A divergência está decidida e aceita** pela Seção 5 do `KNIGHT_BANDS.md`: aceitar o quadrado é a
opção mais simples e mais reversível — nenhum campo novo, nenhum kernel. A imagem sobrevive intacta,
e a comparação com Berserk fica **mais** favorável (6× em vez de 4,5× os tiles). **Registre a
divergência na selection com campo de origem**, como manda a restrição global do README.

Berserk **não** sofre disso: `AREA_SQUARE1X1` já é a bola de Chebyshev de raio 1, então o `radius: 1`
atual reproduz o snapshot célula por célula. **Não mexa nele.**

## O golden — e por que o README estava errado sobre isso

A decisão congelada 8 do README afirma que só a PB-08-06 regenera golden. **Isso está errado, e esta
task é a prova.** `packages/test-fixtures/hunt/pb05/scenario.json` carrega a tabela de abilities com
exatamente as três atuais:

```
abilities: 3
  berserk         shape=area    radius=1  range=0
  brutal-strike   shape=target  radius=0  range=1
  wound-cleansing shape=self    radius=0  range=0
```

Acrescentar duas magias muda `abilities`, muda `abilityIndices` do blueprint do jogador e muda o
snapshot canônico. **Toda task que acrescenta ação ao kit recompõe a fixture.** É a mesma lição
estrutural do B8, generalizada: `combat:check` confere bytes contra hashes publicados e **nunca
recompõe**, então o desvio é invisível até alguém recompor.

O caminho é o do B8, e o gerador existe: **`tools/replay/generatePb05CombatFixture.ts`**. Depois de
recompor `scenario.json`, regenere snapshot e eventos com
`tools/replay/cli.ts run --scenario … --log … --out packages/test-fixtures/hunt/pb05` e atualize
`hashes.md` e os `.sha256`.

**A prova escrita de intencionalidade é obrigatória** (decisão congelada 8): o commit diz que o
golden mudou porque o kit ganhou duas magias, e o diff do `scenario.json` mostra exatamente isso —
duas entradas novas em `abilities` e dois índices novos no jogador. **Se mudar mais alguma coisa —
dano do rotworm, spawn, geometria —, pare: não é esta task.**

**Atualize também a decisão congelada 8 do README** para dizer a verdade: regeneram golden as tasks
04, 05, 06 e 07 — todas as que acrescentam ação ao kit —, e não apenas a 06.

## Leitura mínima

1. esta task;
2. `docs/content/KNIGHT_BANDS.md` — Seção 1 (células 3 e 5), Seção 1b (o par Berserk × Groundshaker,
   medido) e Seção 5 (a divergência do quadrado);
3. `docs/playbooks/PB-08/README.md` — decisões congeladas 1, 3, 7 e 8;
4. `.cursor/rules/20-content.mdc` e `.cursor/rules/50-tests.mdc`;
5. `packages/content/src/selections/pb-05-knight-combat.json` — bloco `spells` e a tabela de faixas
   que a PB-08-03 deixou;
6. `packages/content/src/hunts/combatConversion.ts` — `abilityShapeFromSpell` e `resolveSpellPower`;
7. `apps/game/src/hunt/CombatFxTable.ts` — chaveada por `abilityId`;
8. `tools/replay/generatePb05CombatFixture.ts`.

## Decisões congeladas desta task

- **As duas magias entram; nenhuma outra.** O conjunto ativo é o do `KNIGHT_BANDS.md`. Front Sweep,
  Fierce Berserk e Annihilation são substituição futura e **não** entram.
- **`radius: 3` para Groundshaker, `rangeTiles: 5` para Whirlwind Throw.** Decidido pelo mapa; não
  reabra.
- **Cada uma entra com efeito visual próprio** (decisão congelada 7). Ação que cai no recipe genérico
  de `CombatFxTable` falha o critério de leitura e a task não fecha. Groundshaker precisa parecer uma
  pancada no chão que acende um bloco; Whirlwind Throw precisa mostrar a **arma saindo da mão** —
  `whirlwind_throw.lua` declara `CONST_ANI_WEAPONTYPE` como efeito de distância.
- **Nada de kernel.** `radius` e `rangeTiles` estão implementados. Se você precisar tocar
  `packages/simulation`, parou de ser esta task — escale.

## Ambiguidade conhecida — e a saída

**Whirlwind Throw precisa de linha de visão?** `combat.ts` já exige `isSightClear` para alcance > 1
em ataque básico. Para ability de `shape: 'target'`, confira o que o kernel faz hoje e **mantenha o
comportamento existente** — não introduza uma regra nova de visão nesta task. Se o kernel não checar
visão para ability, isso é observação para o backlog, não conserto aqui.

**Asset de sprite/efeito faltando no pack.** Se o efeito de Groundshaker ou o projétil de arma não
estiverem no pack da hunt, registre em uma linha no commit e use o efeito mais próximo que **não**
seja o genérico — a exigência é imagem distinguível, não a arte definitiva. Abra task de asset no
backlog. Não pare o ciclo.

## Passos

1. **Teste primeiro.** Três vermelhos: o cenário composto expõe cinco abilities; Groundshaker acerta
   um alvo a 3 tiles que Berserk não alcança; Whirlwind Throw acerta um alvo a 5 tiles.
2. Acrescente as duas magias à selection, com `sourceFile`, `sha256` e a **divergência do raio
   declarada com campo de origem**.
3. Some as duas à faixa única da tabela de kit.
4. Preencha `CombatFxTable` para os dois `abilityId`.
5. Recomponha a fixture e regenere os goldens. Confira o diff do `scenario.json` linha por linha.
6. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm content:check`
- `corepack pnpm combat:check` — **vai mudar**, e a mudança precisa da prova escrita acima.
- `corepack pnpm hunt:check` e `corepack pnpm simulation:check` — **inalterados**. Eles não dependem
  do kit do jogador; se moverem, você mexeu em algo que não era desta task.
- `corepack pnpm qa:browser` — cinco botões de ação de dano no HUD, e as duas magias funcionando.
- `corepack pnpm verify` no fechamento.

## Definition of Done

- [ ] Cinco ações de dano no cenário composto, provadas por teste.
- [ ] Groundshaker acerta a 3 tiles; Whirlwind Throw acerta a 5.
- [ ] Divergência do raio declarada na selection com campo de origem.
- [ ] Cada magia com efeito visual próprio; nenhuma no recipe genérico.
- [ ] Fixture recomposta pelo gerador, goldens regenerados, `hashes.md` atualizado, e o commit
      explica **por que** o golden mudou.
- [ ] `hunt:check` e `simulation:check` inalterados.
- [ ] Decisão congelada 8 do README corrigida.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-04-a-rotacao-de-dano-se-completa.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/50-tests.mdc,
docs/playbooks/PB-08/README.md (decisoes congeladas 1, 3, 7 e 8), o STATE.md, e
docs/content/KNIGHT_BANDS.md secoes 1 (celulas 3 e 5), 1b e 5. O mapa e a FONTE DO KIT: nao redecida
qual magia entra nem com que forma.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-04-damage-rotation com a branch
<agente>/pb08-04-damage-rotation e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Leve a rotacao de dano do Knight de tres acoes para CINCO, acrescentando:
- Groundshaker (exori mas): nv 33, 160 mana, CD 8000ms = 160 ticks, grupo 2000ms = 40 ticks,
  shape 'area', RADIUS 3, formula skillAttack.
- Whirlwind Throw (exori hur): nv 28, 40 mana, CD 6000ms = 120 ticks, grupo 2000ms = 40 ticks,
  shape 'target', RANGETILES 5, formula skillAttack.
Confira cada numero em references/canary/data/scripts/spells/attack/groundshaker.lua e
whirlwind_throw.lua. Nao confie nos numeros deste prompt.

DIVERGENCIA QUE VOCE HERDA, ja decidida e aceita pelo mapa: radius 3 NAO e o raio do snapshot. O
AREA_CIRCLE3X3 do Canary e um disco de 37 celulas; o kernel mede Chebyshev
(packages/simulation/src/kernel/combat.ts:117), entao radius 3 e um QUADRADO 7x7 de 48 tiles de
inimigo — 12 tiles de canto a mais. Aceitar o quadrado e a escolha registrada. DECLARE a divergencia
na selection com campo de origem. NAO mexa no Berserk: AREA_SQUARE1X1 ja e a bola de Chebyshev de
raio 1 e o radius 1 atual reproduz o snapshot celula por celula.

O GOLDEN VAI MUDAR, e o README esta errado ao dizer que so a 06 regenera.
packages/test-fixtures/hunt/pb05/scenario.json carrega a tabela de abilities com as TRES atuais
(berserk, brutal-strike, wound-cleansing). Acrescentar duas muda abilities, muda abilityIndices do
jogador e muda o snapshot canonico. Recomponha a fixture com
tools/replay/generatePb05CombatFixture.ts, regenere snapshot e eventos com
"tools/replay/cli.ts run --scenario ... --log ... --out packages/test-fixtures/hunt/pb05", e
atualize hashes.md e os .sha256.

A PROVA ESCRITA DE INTENCIONALIDADE E OBRIGATORIA: o commit diz que o golden mudou porque o kit
ganhou duas magias, e o diff do scenario.json mostra exatamente isso — duas entradas novas em
abilities e dois indices novos no jogador. SE MUDAR MAIS ALGUMA COISA (dano do rotworm, spawn,
geometria), PARE: nao e esta task.

Atualize a decisao congelada 8 do README para dizer a verdade: regeneram golden as tasks 04, 05, 06
e 07 — todas as que acrescentam acao ao kit —, nao apenas a 06.

CADA MAGIA ENTRA COM EFEITO VISUAL PROPRIO (decisao congelada 7). apps/game/src/hunt/CombatFxTable.ts
e chaveada por abilityId; acao que cai no recipe generico falha o criterio de leitura e a task NAO
FECHA. Groundshaker precisa parecer pancada no chao que acende um bloco; Whirlwind Throw precisa
mostrar a ARMA SAINDO DA MAO — whirlwind_throw.lua declara CONST_ANI_WEAPONTYPE.

NADA DE KERNEL. radius e rangeTiles ja estao implementados. Se voce precisar tocar
packages/simulation, parou de ser esta task: registre no STATE.md e escale para a camada frontier.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm content:check
- corepack pnpm combat:check   -> VAI MUDAR, com a prova escrita
- corepack pnpm hunt:check e corepack pnpm simulation:check -> INALTERADOS
- corepack pnpm qa:browser
- corepack pnpm verify no fechamento

Ao terminar: atualize somente a linha PB-08-04 do STATE.md, registrando o modelo e o effort
EFETIVAMENTE usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com
git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
