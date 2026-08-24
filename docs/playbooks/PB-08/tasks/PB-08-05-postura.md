# PB-08-05 — Postura

**Status inicial:** pending

**Classe da tarefa:** conteúdo sobre a máquina de condições do PB-07-05; sem regra de combate nova

**Modelo sugerido:** **GPT-5.6 Luna**, effort `xhigh`. Implementação geral bem especificada: `toggle`,
`appliedConditionIndex`, `exclusivityGroup` e os três modificadores já estão implementados e
aplicados; os números vêm decididos do `KNIGHT_BANDS.md`. **Escale** por qualquer gatilho da seção
"Escalonamento Luna-first" da `docs/08_POLITICA_MODELOS_AGENTES.md`.

**Validador sugerido:** gates automatizados.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **PB-08-03 integrada**. Paralelizável com 04 e 07, mas as três tocam a
mesma fixture — **integre uma de cada vez**.

## Objetivo

Dar ao Knight a célula 7 do kit: **Blood Rage ou Protector**, um estado que não passa até ser
trocado.

O PB-07-05 entregou a máquina inteira — condição com duração, exclusividade por grupo, toggle,
cooldown secundário — e ela está em `main` **sem um único conteúdo que a use**. Esta task é o
consumidor.

## O que entra, com os números já decididos

`docs/content/KNIGHT_BANDS.md`, Seção 1 célula 7 e "Os números de postura, por extenso".

| Postura | Words | Nv | Mana | Ganho | Perda |
|---|---|---|---|---|---|
| **Blood Rage** | `utito tempo` | 20 | 20 | **+25%** sword/axe/club | **+15%** dano recebido |
| **Protector** | `utamo tempo` | 20 | 20 | **+30%** shielding, **−15%** dano recebido | **−15%** dano causado |

**Exceção de proveniência, já aprovada e não reabrível.** Estes números vêm do Vocation Adjustments
2026 — `fonte: TibiaWiki, Tibia 15.25.3a4a52` —, não do snapshot `157e6f9e`, que é anterior ao
sistema. A ADR-05 lista stances entre as extensões permitidas exatamente com essa ressalva. Os
números do snapshot (Rage nv 60 / 290 mana / 10 s; Protector nv 55 / 200 mana / 13 s) **não** são
usados: são buff cronometrado, não toggle, e 290 de mana excede a pool de 185 do Knight. A
justificativa completa está no `PB-07-ROTATIONS.md` §"Stances 2026 versus snapshot".

Modificadores são **inteiros por milhar**: +25% é `250`, −15% é `-150`. Nada de ponto flutuante no
kernel.

## As três regras que definem "postura", e não "buff"

1. **Uma célula, um botão, duas formas.** Blood Rage e Protector compartilham `exclusivityGroup`:
   ligar uma **desliga** a outra. Nunca coexistem. O `KNIGHT_BANDS.md` conta isso como **uma célula**
   e nove no total.
2. **Toggle de verdade.** Relançar a ativa **desliga** e **não cobra mana** — é o comportamento que
   `AbilityDefinition.toggle` implementa. **"Sem postura" é estado válido e inicial.**
3. **Ganho e perda explícitos.** `02_vocations_spells_runes.md` §7.2: *"Postura sem downside é buff,
   não postura."* Se alguma das duas sair sem a perda, a task está errada.

**Duração.** Postura não expira: é estado até ser trocado. Se o contrato exigir `durationTicks`,
escolha a representação que o kernel já suporta para "não expira" e **declare a escolha em uma linha
no commit**. Não invente campo.

## O golden

**Esta task regenera golden**, pelo mesmo motivo da PB-08-04: `packages/test-fixtures/hunt/pb05/scenario.json`
carrega `abilities` e `conditions`, e a postura acrescenta às duas. A decisão congelada 8 do README
afirma que só a 06 regenera — **está errada**; se a PB-08-04 ainda não a corrigiu, corrija aqui.

Recomponha com `tools/replay/generatePb05CombatFixture.ts`, regenere snapshot e eventos com
`tools/replay/cli.ts run --out packages/test-fixtures/hunt/pb05`, atualize `hashes.md` e os
`.sha256`. **Prova escrita obrigatória:** o commit diz que o golden mudou porque o kit ganhou a
célula de postura, e o diff do `scenario.json` mostra duas abilities e as condições correspondentes —
**e nada mais**.

## Leitura mínima

1. esta task;
2. `docs/content/KNIGHT_BANDS.md` — Seção 1 célula 7, "Os números de postura", e Seção 1b (por que a
   postura não colide com nenhuma outra célula);
3. `docs/playbooks/PB-08/README.md` — decisões congeladas 3, 7 e 8;
4. `docs/content/PB-07-ROTATIONS.md` §"Stances 2026 versus snapshot";
5. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` — stances na lista de extensões permitidas;
6. `packages/contracts/src/simulation/types.ts` — `ScenarioConditionDefinition`, `AbilityDefinition.toggle`,
   `ActiveConditionState`, `GroupCooldownState`;
7. `packages/simulation/src/kernel/conditions.ts:37,62,71` e `combat.ts:303` — onde os três
   modificadores são efetivamente aplicados;
8. `apps/game/src/hunt/CombatFxTable.ts` e `CombatViewModel.ts`.

## Decisões congeladas desta task

- **As duas posturas, e nenhuma outra.** Não há terceira.
- **Números da TibiaWiki 2026, com a divergência declarada na selection com campo de origem.**
- **Sem kernel novo.** A máquina do PB-07-05 basta. Se faltar campo, isso é achado para o backlog e
  gatilho de escalonamento — não conserto aqui.
- **A postura tem imagem própria e permanente** (decisão congelada 7): o boneco anda com a aura
  ligada, e dá para saber qual das duas está ativa **sem ler o botão**. Fúria vermelha e aberta;
  guarda azul e fechada.

## Ambiguidade conhecida — e a saída

**`+30% shielding` não tem onde pousar.** `CharacterDefinitionSchema.skills` é `{ sword, magic }`
`.strict()` e não existe skill de shielding; `armor` e escudo só chegam no PB-11. O ganho do
Protector que **funciona hoje** é o `−15%` de dano recebido, que `combat.ts:303` já aplica.

**Saída:** implemente `−15%` recebido e `−15%` causado agora, e registre o `+30% shielding` como
**pendência declarada no `KNIGHT_BANDS.md` Seção 5**, com destino PB-11. Não invente um efeito
substituto para o shielding, e não segure a task por causa dele — Protector já é uma escolha real
com o que sobra.

**Persistência da postura no `F5`.** Ela vive em `ActorState`, que o `ActiveRunState` do PB-06 já
serializa inteiro. **Não escreva persistência nova**; prove com teste que sobrevive à serialização.

Registre a escolha em uma linha no commit e siga.

## Passos

1. **Teste primeiro.** Quatro vermelhos: ligar Blood Rage aplica os dois modificadores; ligar
   Protector com Blood Rage ativa **desliga** Blood Rage; relançar a ativa desliga e **não cobra
   mana**; a postura sobrevive a serializar e recarregar.
2. Acrescente as duas condições e as duas abilities à selection, com proveniência e divergência.
3. Some a célula à faixa única da tabela de kit.
4. Preencha `CombatFxTable` e o view model para o estado ligado.
5. Recomponha a fixture, regenere os goldens, confira o diff.
6. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm content:check`
- `corepack pnpm combat:check` — **vai mudar**, com prova escrita.
- `corepack pnpm hunt:check` e `corepack pnpm simulation:check` — **inalterados**.
- `corepack pnpm qa:browser` — trocar de postura muda o número na tela, e a postura **sobrevive ao
  `F5`**.
- `corepack pnpm verify` no fechamento.

## Definition of Done

- [ ] Blood Rage e Protector existem, exclusivas entre si, com ganho **e** perda.
- [ ] Relançar a ativa desliga e não cobra mana; "sem postura" é o estado inicial.
- [ ] A postura sobrevive à serialização, provado por teste, **sem persistência nova**.
- [ ] Estado visível no jogo sem ler o botão.
- [ ] `+30% shielding` registrado como pendência com destino PB-11.
- [ ] Divergência de proveniência declarada na selection.
- [ ] Fixture recomposta, goldens regenerados, commit explica **por quê**.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-05-postura.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, .cursor/rules/20-content.mdc,
docs/playbooks/PB-08/README.md (decisoes congeladas 3, 7 e 8), o STATE.md,
docs/content/KNIGHT_BANDS.md secao 1 celula 7 e "Os numeros de postura", e
docs/content/PB-07-ROTATIONS.md secao "Stances 2026 versus snapshot".

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-05-stances com a branch
<agente>/pb08-05-stances e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Entregue a celula de POSTURA do Knight: Blood Rage OU Protector, um estado que nao
passa ate ser trocado. O PB-07-05 ja entregou a maquina inteira (toggle, exclusivityGroup, cooldown
secundario, modificadores) e ela esta em main SEM NENHUM CONTEUDO QUE A USE. Esta task e o consumidor.

Numeros, do Vocation Adjustments 2026 (fonte TibiaWiki, Tibia 15.25.3a4a52) — excecao de proveniencia
JA APROVADA na ADR-05 e nao reabrivel:
- Blood Rage (utito tempo), nv 20, 20 mana: +25% sword/axe/club, +15% DANO RECEBIDO.
- Protector (utamo tempo), nv 20, 20 mana: +30% shielding, -15% recebido, -15% DANO CAUSADO.
NAO use os numeros do snapshot (Rage nv 60/290 mana/10s; Protector nv 55/200 mana/13s): sao buff
cronometrado, nao toggle, e 290 de mana excede a pool de 185 do Knight.
Modificadores sao INTEIROS POR MILHAR: +25% e 250, -15% e -150. Nada de ponto flutuante no kernel.

Tres regras que precisam de teste, e que definem "postura" em vez de "buff":
- UMA CELULA, UM BOTAO, DUAS FORMAS. As duas compartilham exclusivityGroup: ligar uma DESLIGA a
  outra. Nunca coexistem.
- TOGGLE DE VERDADE: relancar a ativa DESLIGA e NAO COBRA MANA. "Sem postura" e estado valido e
  INICIAL.
- GANHO E PERDA EXPLICITOS. Postura sem downside e buff, nao postura. Se alguma sair sem a perda, a
  task esta errada.
- A postura SOBREVIVE AO F5. Ela vive em ActorState, que o ActiveRunState do PB-06 ja serializa
  inteiro. NAO ESCREVA PERSISTENCIA NOVA; prove com teste.

AMBIGUIDADE CONHECIDA: o +30% shielding do Protector NAO TEM ONDE POUSAR. skills e { sword, magic }
strict, nao existe skill de shielding, e armor/escudo so chegam no PB-11. Implemente o -15% recebido
e o -15% causado agora, e registre o +30% shielding como PENDENCIA DECLARADA no KNIGHT_BANDS.md
secao 5 com destino PB-11. Nao invente efeito substituto e nao segure a task por causa disso.

SEM KERNEL NOVO. A maquina do PB-07-05 basta. Se faltar campo, e achado para o backlog e gatilho de
escalonamento: registre no STATE.md e escale.

A POSTURA TEM IMAGEM PROPRIA E PERMANENTE (decisao congelada 7): o boneco anda com a aura ligada e da
para saber QUAL das duas esta ativa sem ler o botao.

O GOLDEN VAI MUDAR. scenario.json da fixture pb05 carrega abilities E conditions, e a postura
acrescenta as duas. Recomponha com tools/replay/generatePb05CombatFixture.ts, regenere com
"tools/replay/cli.ts run --out packages/test-fixtures/hunt/pb05", atualize hashes.md e os .sha256.
PROVA ESCRITA OBRIGATORIA no commit: o golden mudou porque o kit ganhou a celula de postura, e o diff
do scenario.json mostra duas abilities e as condicoes correspondentes E NADA MAIS. Se a PB-08-04
ainda nao corrigiu a decisao congelada 8 do README (que afirma que so a 06 regenera), corrija aqui.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm content:check
- corepack pnpm combat:check   -> VAI MUDAR, com prova escrita
- corepack pnpm hunt:check e corepack pnpm simulation:check -> INALTERADOS
- corepack pnpm qa:browser  (trocar de postura muda o numero na tela E sobrevive ao F5)
- corepack pnpm verify no fechamento

Ao terminar: atualize somente a linha PB-08-05 do STATE.md, registrando o modelo e o effort
EFETIVAMENTE usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com
git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
