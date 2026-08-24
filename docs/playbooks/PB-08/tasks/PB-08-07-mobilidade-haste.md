# PB-08-07 — Mobilidade: Haste

**Status inicial:** pending

**Classe da tarefa:** conteúdo sobre a máquina de condições; sem regra de combate nova

**Modelo sugerido:** **GPT-5.6 Luna**, effort `xhigh`. É a mais mecânica das dez: `speedPermille` já é
aplicado, e os números vêm decididos do `KNIGHT_BANDS.md`.

**Validador sugerido:** gates automatizados.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **PB-08-03 integrada**. Paralelizável com 04 e 05 — mas as três tocam a
mesma fixture, então **integre uma de cada vez**.

## Objetivo

Fechar o kit com a célula 9: **Haste** (`utani hur`). O passo encurta e o boneco atravessa o mesmo
corredor visivelmente mais rápido, por 30 segundos.

## O que entra, com os números já decididos

`docs/content/KNIGHT_BANDS.md`, Seção 1 célula 9. Fonte:
`references/canary/data/scripts/spells/support/haste.lua`.

| Words | Nv | Mana | CD | Grupo | Condição |
|---|---|---|---|---|---|
| `utani hur` | 14 | 60 | 2 000 ms (40 t) | `support` | `CONDITION_HASTE`, `TICKS 30000` → **`durationTicks: 600`**, `setFormula(1.3, 40, 1.3, 40)` |

A fórmula `(1.3, 40)` do Canary é a conversão de velocidade base em velocidade com haste. **Converta
para `speedPermille`** — o campo que `packages/simulation/src/kernel/conditions.ts:37,63` já aplica —
e **declare a conversão na selection com campo de origem**, mostrando a aritmética. O passo do Knight
hoje é 11 ticks (550 ms) a partir de `basespeed` 110, por `stepCooldownTicksFromSpeed`; o passo com
haste tem que sair menor, e o quanto menor é o que a conversão define.

`spell:parameter(COMBAT_PARAM_AGGRESSIVE, false)` — Haste não é ação agressiva.

## Charge é corte declarado — não o adicione

`utani tempo hur` (Charge, nv 25, 100 mana, 5 s, fórmula 1.9) **não entra**. Ele produz **a mesma
imagem** de Haste — o boneco andando mais rápido —, diferindo só em duração e intensidade. Pelo
critério 2 do README, isso é **escada**, e escada não coexiste.

Está registrado na Seção 2 do `KNIGHT_BANDS.md` como corte permanente. Se alguém no futuro quiser
mobilidade explosiva, ela **substitui** Haste numa faixa nova; não senta ao lado dela.

## O golden

**Esta task regenera golden.** `packages/test-fixtures/hunt/pb05/scenario.json` carrega `abilities` e
`conditions`; Haste acrescenta a ambas. A decisão congelada 8 do README afirma que só a 06 regenera —
**está errada**; se as tasks 04 ou 05 ainda não a corrigiram, corrija aqui.

Recomponha com `tools/replay/generatePb05CombatFixture.ts`, regenere com
`tools/replay/cli.ts run --out packages/test-fixtures/hunt/pb05`, atualize `hashes.md` e os `.sha256`.
**Prova escrita obrigatória:** o commit diz que o golden mudou porque o kit ganhou Haste, e o diff do
`scenario.json` mostra uma ability e uma condição — **e nada mais**.

**Atenção especial nesta task:** `speedPermille` muda `stepCooldownTicks` efetivo, o que muda **quando
o ator se move**, o que muda a ordem dos eventos. O diff do golden vai ser maior que o das outras —
isso é esperado se, e somente se, o jogador estiver com Haste ativa no command log da fixture. Se o
log da fixture nunca conjura Haste e o golden mudou mesmo assim, **a velocidade vazou para quem não
tem a condição**. Isso é defeito.

## Leitura mínima

1. esta task;
2. `docs/content/KNIGHT_BANDS.md` — Seção 1 célula 9, Seção 1b (por que Haste não colide com
   nenhuma outra célula) e Seção 2 (o corte do Charge);
3. `docs/playbooks/PB-08/README.md` — decisões congeladas 3, 7 e 8;
4. `.cursor/rules/20-content.mdc`;
5. `packages/simulation/src/kernel/conditions.ts:32-40,63` — `speedPermille` e a fórmula de passo
   efetivo;
6. `packages/content/src/hunts/buildHuntScenario.ts` — `stepCooldownTicksFromSpeed`;
7. `references/canary/data/scripts/spells/support/haste.lua`.

## Decisões congeladas desta task

- **Só Haste.** Charge é corte permanente.
- **`durationTicks: 600`** — 30 000 ms a 50 ms por tick.
- **Sem kernel novo.** `speedPermille` está aplicado. Se faltar campo, é gatilho de escalonamento.
- **Imagem própria** (decisão congelada 7): tem que dar para **ver** que o boneco anda mais rápido, e
  para saber que a condição está ativa enquanto dura. A conversão precisa produzir uma diferença de
  passo perceptível — se o número escolhido mudar o passo de 11 para 10 ticks, a ação falha o
  critério de leitura por ser invisível, e o número está errado, não o critério.

## Ambiguidade conhecida — e a saída

**Quanto exatamente é `speedPermille`?** A fórmula `(1.3, 40)` do Canary opera sobre `basespeed`, e o
kernel opera sobre `stepCooldownTicks`. A conversão exata tem mais de uma leitura plausível.

**Saída:** escolha a conversão que preserva a razão do Canary sobre o passo do Knight, mostre a
aritmética na selection com campo de origem, e **confira que o passo resultante é um número inteiro
de ticks** — `stepCooldownTicksFromSpeed` já rejeita o que não converte, e `HUNT_INTERVAL_NOT_DIVISIBLE`
existe para isso. Se cair em número quebrado, arredonde **para o passo mais rápido** e declare.

Registre em uma linha no commit e siga.

## Passos

1. **Teste primeiro.** Três vermelhos: conjurar Haste reduz o `stepCooldownTicks` efetivo; o efeito
   expira no tick absoluto correto, testado nos dois ticks da borda; e um ator **sem** a condição
   mantém o passo original.
2. Acrescente a magia e a condição à selection, com proveniência e a conversão declarada.
3. Some a célula à faixa única da tabela de kit.
4. Preencha `CombatFxTable` e o indicador de condição ativa.
5. Recomponha a fixture, regenere os goldens, confira o diff.
6. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm content:check`
- `corepack pnpm combat:check` — **vai mudar**, com prova escrita.
- `corepack pnpm hunt:check` e `corepack pnpm simulation:check` — **inalterados**. Se moverem, a
  velocidade vazou para quem não tem a condição.
- `corepack pnpm qa:browser` — a diferença de passo é **visível**.
- `corepack pnpm verify` no fechamento.

## Definition of Done

- [ ] Haste reduz o passo efetivo por 600 ticks e expira no tick correto.
- [ ] Ator sem a condição mantém o passo original.
- [ ] Conversão de `speedPermille` declarada na selection, com a aritmética à mostra.
- [ ] A diferença de passo é perceptível no browser, e há indicador de condição ativa.
- [ ] Charge **não** foi adicionado.
- [ ] Fixture recomposta, golden regenerado com prova escrita.
- [ ] `hunt:check` e `simulation:check` inalterados.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-07-mobilidade-haste.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, docs/playbooks/PB-08/README.md (decisoes congeladas 3,
7 e 8), o STATE.md, e docs/content/KNIGHT_BANDS.md secao 1 celula 9, secao 1b e secao 2.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-07-haste com a branch
<agente>/pb08-07-haste e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Feche o kit com HASTE (utani hur): nv 14, 60 mana, CD 2000ms = 40 ticks, grupo
support, CONDITION_HASTE com TICKS 30000 -> durationTicks 600, setFormula(1.3, 40, 1.3, 40).
Confira em references/canary/data/scripts/spells/support/haste.lua.

CHARGE E CORTE DECLARADO. utani tempo hur (nv 25, 100 mana, 5s, formula 1.9) NAO ENTRA: produz A
MESMA IMAGEM de Haste — o boneco andando mais rapido —, diferindo so em duracao e intensidade. Pelo
criterio 2 do README isso e ESCADA, e escada nao coexiste. Esta na secao 2 do KNIGHT_BANDS.md como
corte permanente.

A CONVERSAO E O TRABALHO REAL. A formula (1.3, 40) do Canary opera sobre basespeed; o kernel opera
sobre stepCooldownTicks, e speedPermille e o campo que
packages/simulation/src/kernel/conditions.ts:37,63 ja aplica. O passo do Knight hoje e 11 ticks
(550ms) a partir de basespeed 110, por stepCooldownTicksFromSpeed.

Escolha a conversao que preserva a razao do Canary sobre o passo do Knight, MOSTRE A ARITMETICA na
selection com campo de origem, e confira que o passo resultante e INTEIRO em ticks —
stepCooldownTicksFromSpeed ja rejeita o que nao converte e HUNT_INTERVAL_NOT_DIVISIBLE existe para
isso. Se cair em numero quebrado, arredonde PARA O PASSO MAIS RAPIDO e declare. Registre em uma linha
no commit e siga.

IMAGEM PROPRIA (decisao congelada 7): tem que dar para VER que o boneco anda mais rapido, e para
saber que a condicao esta ativa enquanto dura. Se o numero escolhido mudar o passo de 11 para 10
ticks, a acao falha o criterio de leitura por ser invisivel — e o NUMERO esta errado, nao o criterio.

SEM KERNEL NOVO. speedPermille esta aplicado. Se faltar campo, e gatilho de escalonamento: registre
no STATE.md e escale.

O GOLDEN VAI MUDAR. scenario.json da fixture pb05 carrega abilities E conditions; Haste acrescenta as
duas. Recomponha com tools/replay/generatePb05CombatFixture.ts, regenere com
"tools/replay/cli.ts run --out packages/test-fixtures/hunt/pb05", atualize hashes.md e os .sha256.
Se as tasks 04 ou 05 ainda nao corrigiram a decisao congelada 8 do README (que afirma que so a 06
regenera), corrija aqui.

ATENCAO ESPECIAL NESTA TASK: speedPermille muda stepCooldownTicks efetivo, o que muda QUANDO o ator
se move, o que muda a ORDEM DOS EVENTOS. O diff do golden vai ser maior que o das outras — isso e
esperado SE E SOMENTE SE o jogador conjurar Haste no command log da fixture. Se o log NUNCA conjura
Haste e o golden mudou mesmo assim, A VELOCIDADE VAZOU para quem nao tem a condicao. Isso e DEFEITO.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm content:check
- corepack pnpm combat:check   -> VAI MUDAR, com prova escrita
- corepack pnpm hunt:check e corepack pnpm simulation:check -> INALTERADOS
- corepack pnpm qa:browser   (a diferenca de passo e VISIVEL)
- corepack pnpm verify no fechamento

Ao terminar: atualize somente a linha PB-08-07 do STATE.md, registrando o modelo e o effort
EFETIVAMENTE usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com
git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
