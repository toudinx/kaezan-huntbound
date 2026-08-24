# PB-08-06 — Taunt: Challenge

**Status inicial:** pending

**Classe da tarefa:** **implementação complexa** — kernel novo, política de aquisição de alvo da IA,
regenera golden

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6** —, effort `xhigh`.
Classe "implementação complexa" pela `docs/08_POLITICA_MODELOS_AGENTES.md`: alvo forçado **não
existe**, a mudança atravessa kernel e conteúdo, e o resultado correto exige julgamento.

**Validador sugerido:** modelo frontier **diferente** do implementador. Sol prefere Opus 5 ou
Grok 4.6; Opus 5 prefere Sol ou Grok 4.6; Grok 4.6 prefere Opus 5 ou Sol.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **PB-08-03 integrada**. **Não** rode em paralelo com 04, 05 ou 07: é a
única com kernel, e empilhar regeneração de golden com elas torna impossível provar qual mudança
moveu o quê. Integre-a sozinha.

## Objetivo

Dar ao Knight a célula 8: **Challenge** (`exeta res`) — a única ação do kit em que **ninguém perde
vida e o inimigo muda de comportamento**.

E, para isso, dar ao kernel a única capacidade que falta no PB-08: **alvo forçado**.

## Por que esta ação e não outra

`docs/research/tibia/02_vocations_spells_runes.md` §3.1 define a identidade do Knight em uma frase:
*"eu escolho onde a luta acontece."* §11 lista "AoE centrado em si **+ taunt**" como **o** diferencial
a preservar. Sem taunt, o Knight é um personagem de área que não decide nada — ele espera que as
criaturas venham.

E, pelo critério de leitura do README, é a ação mais legível do kit inteiro: é a única em que o que
muda está **no inimigo**, não numa barra.

`spell:group("support")` e `isAggressive(false)`: Challenge **não compete com o cooldown de ataque** e
não é ação agressiva. Ela não rouba tempo da rotação de dano — é ação livre.

## O que entra, com os números já decididos

`docs/content/KNIGHT_BANDS.md`, Seção 1 célula 8. Fonte:
`references/canary/data/scripts/spells/support/challenge.lua`.

| Words | Nv | Mana | CD | Grupo | Forma no contrato |
|---|---|---|---|---|---|
| `exeta res` | 20 | 30 | 2 000 ms (40 t) | `support` — grupo **secundário** | `shape: 'area'`, **`radius: 1`**, **sem dano** |

## Duas correções que você herda do mapa — leia antes de desenhar

**1. É taunt de contato, não de tela.** O README do PB-08 descreve a imagem como "a tela inteira vira
para você". **O snapshot não faz isso.** `createCombatArea(AREA_SQUARE1X1)` são os **8 tiles
adjacentes**, raio 1. A imagem que vale é a da Seção 1 do mapa: *"as criaturas adjacentes largam o
alvo que tinham e apontam para mim."*

Você está implementando um taunt **de contato**. Se o playtest pedir raio maior, isso é **divergência
a declarar com campo de origem** — não é leitura do snapshot, e **não é decisão desta task**.

**2. Divergência de proveniência, já declarada.** `challenge.lua` traz
`spell:vocation("elite knight;true")`: no snapshot, Challenge é **exclusiva da promoção**. Huntbound
não tem promoção e a decisão congelada 2 recusa gating por level, então Challenge entra para o Knight
base desde o começo. **Divergência declarada**, com origem no fato de o V0 embarcar uma vocação só.
Registre na selection com campo de origem.

## O kernel — o que falta e o que não pode quebrar

Hoje a IA escolhe alvo sozinha, sem canal para impor um. `packages/simulation/src/kernel/kernel.ts:256`:

```
isAcquirableTarget(hunter, candidate, aggroRadius, hunterFactionId)
  -> aggroRadius 0? mesmo z? facção diferente? dentro do raio? linha de visão?
acquireTarget(...)
  -> varre world.actors(), escolhe o MAIS PRÓXIMO, desempate por MENOR entityId
```

O que a task acrescenta é um canal para **forçar** esse resultado por um tempo. As restrições não são
negociáveis:

- **Determinismo primeiro.** `packages/simulation` continua sem `Math.random()`, sem `Date.now()`,
  sem I/O. **Nenhum draw de RNG novo** — um draw a mais desloca os streams e invalida replay muito
  além desta task. Se você achar que precisa de aleatoriedade, você não precisa: escolha
  determinística com desempate explícito, como `acquireTarget` já faz por `entityId`.
- **Estado serializável.** O que a task guardar vai para `ActorState`, que só aceita **inteiros
  seguros, booleanos e strings**. Expiração por **tick absoluto**, no molde de
  `ActiveConditionState.expiresAtTick` e de `readyAtTick` — **nunca** "ticks restantes". Teste os dois
  ticks da borda.
- **Ordenação explícita.** Se duas criaturas forem tauntadas no mesmo tick, a ordem dos eventos é
  determinística.
- **A postura da PB-08-05 não é afetada.** Taunt não é condição de stat; não abuse do
  `exclusivityGroup` das stances para carregá-lo.
- **Sobrevive ao `F5` de graça.** Se o estado morar em `ActorState`, o `ActiveRunState` do PB-06 já o
  serializa inteiro. **Não escreva persistência nova.** Prove com teste.

## O julgamento que é seu — e é por isso que esta task é frontier

**Quanto tempo o taunt dura, e o que o encerra?** Há mais de uma leitura plausível, e o mapa não
decide por você:

- expirar por tick absoluto, como condição;
- durar até a criatura sair do alcance ou perder linha de visão;
- durar até o próprio taunt ser relançado.

**Escolha a mais simples e mais fácil de reverter, e registre a escolha em uma linha no commit.** O
`AGENTS.md` é explícito: ambiguidade não é motivo para parar. Mas **documente a semântica escolhida no
`docs/simulation/KERNEL_CONTRACT.md`** — comportamento de kernel sem contrato escrito é o que produz
a próxima divergência de golden.

**Condição de parada, essa sim:** se para fazer o taunt funcionar você precisar mudar um contrato
**já integrado** — `SimulationSnapshot`, a semântica de `acquireTarget` para quem não foi tauntado, ou
o formato do command log —, **pare e registre bloqueio no `STATE.md`**, não só no relatório.

## O golden

**Esta task regenera golden**, e agora por dois motivos: o kit ganha uma ability **e** o kernel ganha
comportamento. Recomponha `packages/test-fixtures/hunt/pb05/scenario.json` com
`tools/replay/generatePb05CombatFixture.ts`, regenere snapshot e eventos com
`tools/replay/cli.ts run --out packages/test-fixtures/hunt/pb05`, atualize `hashes.md` e os `.sha256`.

**Diferente das outras tasks, aqui o golden do PB-04 também pode mover** — `hunt:check` roda sobre um
cenário sem jogador conjurando, então **espera-se que ele fique inalterado**. Se ele mover, seu
comportamento novo vazou para atores que nunca foram tauntados. **Isso é defeito, não regeneração.**

Prova escrita obrigatória no commit: o que mudou no golden e por quê.

## Leitura mínima

1. esta task;
2. `docs/content/KNIGHT_BANDS.md` — Seção 1 célula 8, Seção 5 (linha "Alvo forçado" e "Raio do
   taunt"), e "Uma correção de proveniência para a PB-08-06";
3. `docs/playbooks/PB-08/README.md` — decisões congeladas 3, 7 e 8;
4. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
5. `.cursor/rules/10-boundaries.mdc`;
6. `packages/simulation/src/kernel/kernel.ts` — `isAcquirableTarget`, `acquireTarget` e o laço do
   hunter (~linhas 700-780);
7. `packages/simulation/src/kernel/conditions.ts` — o molde de expiração por tick absoluto;
8. `packages/contracts/src/simulation/types.ts` — `ActorState`, `AbilityDefinition`, eventos;
9. `references/canary/data/scripts/spells/support/challenge.lua`.

## Decisões congeladas desta task

- **Raio 1.** Oito vizinhos. Não é decisão sua alargar.
- **Sem dano, sem agressão.** `isAggressive(false)`: Challenge não fere e não deve marcar o jogador
  como agressor. Confira o que "em combate" significa para o regen do PB-07-04 e **não** mude essa
  semântica aqui.
- **Grupo secundário.** Challenge roda em `support` e **não** trava o cooldown de ataque, nem é
  travada por ele. O `secondaryCooldownGroup` do contrato v5 existe para isso.
- **Nenhum draw de RNG novo.**
- **Efeito visual próprio** (decisão congelada 7): tem que dar para ver as criaturas mudando de alvo.
  A ação não tem número de dano para mostrar, então **a legibilidade é toda visual** — é a única do
  kit em que o feedback não pode vir de uma barra.

## Passos

1. **Teste primeiro.** Cinco vermelhos, no mínimo: uma criatura mirando outro alvo passa a mirar o
   conjurador; uma criatura fora do raio 1 **não** muda; o efeito termina pela regra que você
   escolheu, testado nos dois ticks da borda; o taunt sobrevive a serializar e recarregar; e o
   cooldown de ataque **não** é travado por Challenge.
2. Implemente o canal de alvo forçado no kernel, com estado em `ActorState` e expiração por tick
   absoluto.
3. Documente a semântica em `KERNEL_CONTRACT.md`.
4. Acrescente a magia à selection, com proveniência e a divergência de vocação declarada.
5. Some a célula à faixa única da tabela de kit.
6. Preencha `CombatFxTable` para o `abilityId`.
7. Recomponha a fixture, regenere os goldens, confira o diff.
8. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm architecture:check`
- `corepack pnpm content:check`
- `corepack pnpm simulation:check` — replay golden do PB-03. **Se mover, pare**: o kernel do PB-03
  não conhece taunt.
- `corepack pnpm hunt:check` — **inalterado**. Se mover, o comportamento vazou.
- `corepack pnpm combat:check` — **vai mudar**, com prova escrita.
- `corepack pnpm qa:browser`
- `corepack pnpm verify` no fechamento.

## Risco conhecido

**Vazamento para atores não tauntados.** É o risco central. Um `if` a mais dentro de `acquireTarget`
muda o alvo de toda criatura da hunt, e o sintoma aparece como `hunt:check` vermelho — não como teste
unitário vermelho. Trate `hunt:check` e `simulation:check` como o alarme desta task.

## Definition of Done

- [ ] Criatura adjacente que estava em outro alvo passa a mirar o conjurador.
- [ ] Criatura fora do raio 1 não muda.
- [ ] O efeito termina pela regra escolhida, provada nos dois ticks da borda.
- [ ] O taunt sobrevive à serialização, **sem persistência nova**.
- [ ] Challenge não trava nem é travada pelo cooldown de ataque.
- [ ] Nenhum draw de RNG novo; `simulation:check` e `hunt:check` inalterados.
- [ ] Semântica documentada em `KERNEL_CONTRACT.md`.
- [ ] Divergência de vocação declarada na selection.
- [ ] Efeito visual próprio; dá para ver as criaturas mudando de alvo.
- [ ] Fixture recomposta, `combat:check` regenerado com prova escrita.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-06-taunt-challenge.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, docs/playbooks/PB-08/README.md (decisoes congeladas
3, 7 e 8), o STATE.md, docs/simulation/KERNEL_CONTRACT.md, docs/simulation/REPLAY_CONTRACT.md, e
docs/content/KNIGHT_BANDS.md secao 1 celula 8, secao 5 (linhas "Alvo forcado" e "Raio do taunt") e
"Uma correcao de proveniencia para a PB-08-06".

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-06-taunt com a branch
<agente>/pb08-06-taunt e rode "corepack pnpm install --prefer-offline" dentro dela.

NAO rode esta task em paralelo com a 04, 05 ou 07. E a unica com kernel, e empilhar regeneracao de
golden com elas torna impossivel provar qual mudanca moveu o que.

Comece por RED. Entregue Challenge (exeta res): nv 20, 30 mana, CD 2000ms = 40 ticks, grupo
"support" SECUNDARIO, shape 'area', RADIUS 1, SEM DANO. Confira em
references/canary/data/scripts/spells/support/challenge.lua.

E, para isso, de ao kernel a unica capacidade que falta no PB-08: ALVO FORCADO. Hoje a IA escolhe
alvo sozinha em packages/simulation/src/kernel/kernel.ts:256 (isAcquirableTarget) e acquireTarget
escolhe o MAIS PROXIMO com desempate por MENOR entityId. Nao existe canal para impor um alvo.

DUAS CORRECOES QUE VOCE HERDA DO MAPA:
1. E TAUNT DE CONTATO, NAO DE TELA. O README diz "a tela inteira vira para voce"; o snapshot NAO faz
   isso. AREA_SQUARE1X1 sao os OITO TILES ADJACENTES, raio 1. Se o playtest pedir raio maior, isso e
   divergencia a declarar com campo de origem — NAO e decisao desta task.
2. challenge.lua declara spell:vocation("elite knight;true"): no snapshot Challenge e EXCLUSIVA DA
   PROMOCAO. Huntbound nao tem promocao e a decisao congelada 2 recusa gating por level, entao ela
   entra para o Knight base. DIVERGENCIA DECLARADA na selection com campo de origem.

RESTRICOES DE KERNEL, NAO NEGOCIAVEIS:
- DETERMINISMO PRIMEIRO. Sem Math.random, sem Date.now, sem I/O. NENHUM DRAW DE RNG NOVO — um draw a
  mais desloca os streams e invalida replay muito alem desta task. Se achar que precisa de
  aleatoriedade, voce nao precisa: escolha deterministica com desempate explicito, como acquireTarget
  ja faz por entityId.
- ESTADO SERIALIZAVEL em ActorState: so inteiros seguros, booleanos e strings. Expiracao por TICK
  ABSOLUTO, no molde de ActiveConditionState.expiresAtTick e readyAtTick. NUNCA "ticks restantes".
  Teste os DOIS TICKS DA BORDA.
- Ordenacao explicita se duas criaturas forem tauntadas no mesmo tick.
- Nao abuse do exclusivityGroup das stances para carregar o taunt.
- SOBREVIVE AO F5 DE GRACA: se o estado morar em ActorState, o ActiveRunState do PB-06 ja serializa.
  NAO ESCREVA PERSISTENCIA NOVA. Prove com teste.
- isAggressive(false): Challenge nao fere e nao deve marcar o jogador como agressor. Confira o que
  "em combate" significa para o regen do PB-07-04 e NAO mude essa semantica aqui.
- Grupo SECUNDARIO: Challenge nao trava o cooldown de ataque nem e travada por ele.

O JULGAMENTO QUE E SEU, e por isso esta task e frontier: QUANTO TEMPO O TAUNT DURA e o que o encerra.
Ha mais de uma leitura plausivel — expirar por tick absoluto como condicao; durar ate a criatura sair
do alcance ou perder visao; durar ate ser relancado. ESCOLHA A MAIS SIMPLES E MAIS FACIL DE REVERTER,
registre em uma linha no commit, e DOCUMENTE A SEMANTICA EM docs/simulation/KERNEL_CONTRACT.md.
Comportamento de kernel sem contrato escrito e o que produz a proxima divergencia de golden.

CONDICAO DE PARADA: se para fazer o taunt funcionar voce precisar mudar um contrato JA INTEGRADO —
SimulationSnapshot, a semantica de acquireTarget para quem NAO foi tauntado, ou o formato do command
log —, PARE e registre bloqueio no STATE.md, nao so no relatorio.

EFEITO VISUAL PROPRIO (decisao congelada 7): a acao NAO TEM NUMERO DE DANO para mostrar, entao a
legibilidade e TODA visual. Tem que dar para ver as criaturas mudando de alvo.

O GOLDEN VAI MUDAR, por dois motivos: o kit ganha uma ability E o kernel ganha comportamento.
Recomponha com tools/replay/generatePb05CombatFixture.ts, regenere com
"tools/replay/cli.ts run --out packages/test-fixtures/hunt/pb05", atualize hashes.md e os .sha256.
Prova escrita obrigatoria no commit.

RISCO CENTRAL — VAZAMENTO PARA ATORES NAO TAUNTADOS. Um if a mais dentro de acquireTarget muda o alvo
de TODA criatura da hunt, e o sintoma aparece como hunt:check vermelho, nao como teste unitario
vermelho.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm architecture:check
- corepack pnpm content:check
- corepack pnpm simulation:check -> INALTERADO. Se mover, PARE: o kernel do PB-03 nao conhece taunt.
- corepack pnpm hunt:check       -> INALTERADO. Se mover, o comportamento VAZOU. E defeito, nao
                                    regeneracao.
- corepack pnpm combat:check     -> VAI MUDAR, com prova escrita
- corepack pnpm qa:browser
- corepack pnpm verify no fechamento

Ao terminar: atualize somente a linha PB-08-06 do STATE.md, registrando o modelo e o effort
EFETIVAMENTE usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com
git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
