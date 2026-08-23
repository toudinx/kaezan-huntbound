# PB-07-10 — Criatura com kit e o primeiro boss

**Status inicial:** pending

**Classe da tarefa:** regra de simulação, IA e conteúdo

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial.

## Objetivo

Fazer criatura fazer mais do que morder. `composeCreature` para de forçar `abilityIndices: []`, a IA
`hunter` aprende a escolher habilidade, e o playbook ganha um boss solo — o alvo contra o qual a
rotação de boss da PB-07-01 finalmente significa alguma coisa.

## Resultado esperado

Um rotworm continua sendo um rotworm. Mas existe pelo menos uma criatura que conjura, uma que
envenena, e um boss que exige do jogador usar postura, recuo e cura — não só segurar o ataque.

## Dependências

- PB-07-05 integrada: condição com duração existe, e é ela que faz veneno e paralisia funcionarem.
- PB-07-09 integrada: elemento e resistência importam.
- PB-07-01: a seção "rotação solo contra boss" descreve o comportamento que o boss precisa exercer.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md` e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, seção "rotação solo contra boss" das três vocações;
4. `.cursor/rules/10-boundaries.mdc` e `.cursor/rules/20-content.mdc`;
5. `packages/simulation/src/kernel/kernel.ts` — o comportamento `hunter`: aquisição de alvo,
   `aggroRadius`, `hasClearRangedSight` e a escolha de passo;
6. `packages/simulation/src/kernel/ai.test.ts` — o padrão de teste de IA já existente;
7. `packages/content/src/hunts/buildHuntScenario.ts`, `composeCreature`;
8. `packages/contracts/src/content/schemas.ts` — `CreatureAttackDefinitionSchema` com os ramos
   `melee`, `ranged` e `area`, `CreatureDefenseActionSchema`, `ConditionDefinitionSchema`;
9. `references/canary/data-otservbr-global/monster/bosses/**` — 94 bosses disponíveis;
10. `packages/content/src/selections/hunts/venore-rotworm-cave.json` e o layout da hunt.

## Decisões congeladas

- **A IA continua determinística.** Escolha de habilidade sai de RNG seedado ou de regra pura sobre o
  estado; nunca de `Math.random`, nunca de ordem de iteração de `Map`. Duas execuções do mesmo seed
  produzem a mesma luta.
- **A escolha de habilidade é ordenada e explícita.** Defina uma regra de prioridade e teste-a. "A
  primeira que couber, na ordem do blueprint" é uma resposta válida e é a mais simples de reverter —
  o que não vale é escolha implícita, dependente de detalhe de implementação.
- **Criatura respeita as mesmas restrições do jogador:** custo de recurso, cooldown próprio, cooldown
  de grupo, alcance e linha de visão. Uma criatura que ignora cooldown não é difícil, é quebrada.
- **Um boss, não uma família.** Escolha **um** dos 94 do snapshot, compatível com a hunt e com o
  personagem do V0. Bosstiary e progressão de boss ficam fora.
- **O boss é solo e vencível.** Se, jogando, ele for impossível ou trivial, o número muda — mas o
  ajuste é registrado, não escondido.
- **Rotworm não muda.** A hunt existente continua com a dificuldade de hoje; o boss entra em um
  encontro próprio.
- **Sem summon nesta task.** `CreatureSummonDefinitionSchema` existe, mas invocação mexe no limite de
  atores vivos e no spawn — é bullet no README, não escopo aqui.

## Escopo permitido

```text
packages/simulation/src/kernel/kernel.ts
packages/simulation/src/kernel/ai.test.ts
packages/simulation/src/kernel/*.test.ts
packages/content/src/hunts/buildHuntScenario.ts
packages/content/src/selections/**
packages/content/catalog/**                     (operação versionada, pelo CLI)
packages/content/src/generated/**               (regeneração por CLI)
packages/assets/catalog/selections/**
packages/test-fixtures/**                       (regeneração por CLI)
tests/e2e/**
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- UI de bestiary/bosstiary — decisão 12 do README;
- summon;
- segunda hunt — PB-07-13;
- cargas — PB-07-11.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-10-creatures -b codex/pb07-10-creature-kit main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-10-creatures install --prefer-offline
```

- [ ] **2. RED da conversão do kit.**

`composeCreature` para de zerar `abilityIndices`: ataques `ranged` e `area` do catálogo viram
habilidades do cenário; `defenses` de cura viram habilidade de cura; `conditions` viram condição
aplicada. Uma criatura sem nada disso — o rotworm — sai **exatamente** como sai hoje. Esse último é
o teste de neutralidade da task.

- [ ] **3. RED da escolha de habilidade pela IA.**

A criatura conjura quando pode e ataca quando não pode; respeita custo, cooldown próprio, cooldown de
grupo, alcance e linha de visão; a prioridade é a declarada e não muda com a ordem de iteração; dois
`run` do mesmo seed produzem a mesma sequência de eventos.

- [ ] **4. RED do veneno.**

Uma criatura com condição de veneno aplica-a ao acertar; o dano por tick vem do sistema do PB-07-05;
a condição expira sozinha; venenos de duas criaturas empilham, porque não têm chave de slot.

- [ ] **5. RED do encontro do boss.**

Um cenário de fixture com o boss escolhido: ele usa mais de uma habilidade ao longo da luta, o
jogador consegue vencer com a rotação descrita em `PB-07-ROTATIONS.md`, e o replay do encontro é
determinístico.

- [ ] **6. GREEN**, regenerando conteúdo pelo CLI.

- [ ] **7. Fixture e golden do encontro.**

O encontro do boss vira fixture com `scenario.json`, `commands.jsonl`, `snapshot.golden.json` e
`events.golden.jsonl`, no mesmo padrão de `packages/test-fixtures/hunt/pb05/`. Gere pelo CLI, faça os
`*.sha256` com `hash --file`, valide com `check-hashes --dir`. Se fizer sentido virar gate, acrescente
ao `package.json` ao lado de `combat:check` — e então `verify` passa a cobri-lo.

- [ ] **8. Jogar o boss.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-10-creatures dev
```

Lute com as três vocações. Se ele for trivial ou impossível, ajuste e **registre o ajuste** — número
mexido em silêncio é o que faz um boss chegar quebrado no aceite.

- [ ] **9. Gates, integração e limpeza.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-10-creatures verify
git -C C:\Kaezan\kaezan-huntbound-pb07-10-creatures add packages tests docs
git -C C:\Kaezan\kaezan-huntbound-pb07-10-creatures commit -m "feat: give creatures a kit and add the first solo boss"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-10-creature-kit
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-10-creatures
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-10-creature-kit
```

## Verificação

`verify` verde na worktree e no integrado. Teste de neutralidade do rotworm verde. Replay do
encontro do boss determinístico em duas execuções. `content:check` e `assets:check` verdes.
`check-hashes` verde na fixture nova.

## Critérios de aceite

- [ ] Rotworm sai idêntico ao de hoje.
- [ ] `composeCreature` converte ataques `ranged`/`area`, defesas de cura e condições.
- [ ] A IA escolhe habilidade por regra declarada, determinística, sem `Math.random` nem dependência
      de ordem de iteração.
- [ ] Criatura respeita custo, cooldown próprio, cooldown de grupo, alcance e linha de visão.
- [ ] Veneno aplica dano por tick pelo sistema do PB-07-05 e empilha entre fontes.
- [ ] Existe **um** boss, com fixture, golden e `check-hashes` verde.
- [ ] O boss foi jogado com as três vocações, e qualquer ajuste está registrado.
- [ ] Nenhum summon entrou.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: a IA precisar de estado que o snapshot não carrega; a escolha de habilidade não puder ser
determinística sem inventar um stream de RNG novo — nesse caso o stream é decisão de contrato e vai
para `KERNEL_CONTRACT.md`; ou se o boss escolhido exigir summon, teleporte ou mudança de mapa em
runtime.

## Persistência do handoff

`STATE.md`: status, branch, commit, boss escolhido, regra de prioridade da IA, contagem de testes,
ajustes de balanceamento, modelo e effort, próxima task elegível.

## Commit

`feat: give creatures a kit and add the first solo boss`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-10-creature-kit`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-10-creatures`; integração por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Boss escolhido e por quê, regra de prioridade da IA, o que a criatura passou a fazer, como foi lutar
com cada vocação, ajustes de balanceamento, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-10-criatura-com-kit-e-boss.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, .cursor/rules/20-content.mdc,
docs/playbooks/PB-07/README.md, o STATE.md, docs/content/PB-07-ROTATIONS.md secao "rotacao solo
contra boss", e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-10-creatures com a branch
codex/pb07-10-creature-kit e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED.

(1) composeCreature PARA DE ZERAR abilityIndices: ataques ranged e area do catalogo viram habilidades
do cenario, defenses de cura viram habilidade de cura, conditions viram condicao aplicada. TESTE DE
NEUTRALIDADE: o rotworm sai EXATAMENTE como sai hoje.

(2) A IA hunter aprende a escolher habilidade. DETERMINISTICA: sem Math.random, sem depender de ordem
de iteracao de Map. A prioridade e DECLARADA e testada — "a primeira que couber, na ordem do
blueprint" e resposta valida e a mais simples de reverter. A criatura respeita custo, cooldown
proprio, cooldown de grupo, alcance e linha de visao: criatura que ignora cooldown nao e dificil, e
quebrada. Dois run do mesmo seed produzem a mesma sequencia de eventos.

(3) Veneno: a criatura aplica ao acertar, o dano por tick vem do sistema do PB-07-05, expira sozinho,
e venenos de duas fontes EMPILHAM porque nao tem chave de slot.

(4) UM boss, escolhido entre os 94 de references/canary/data-otservbr-global/monster/bosses/**,
compativel com a hunt e com o personagem do V0. Solo e vencivel. Fixture propria com scenario.json,
commands.jsonl, snapshot.golden.json e events.golden.jsonl no padrao de test-fixtures/hunt/pb05,
gerada pelo CLI, com .sha256 por hash --file e check-hashes verde. Se virar gate, acrescente ao
package.json ao lado de combat:check.

NADA DE SUMMON nesta task. Rotworm nao muda. Bestiary/bosstiary fora.

Suba corepack pnpm dev e lute com as tres vocacoes. Se o boss for trivial ou impossivel, ajuste e
REGISTRE o ajuste; numero mexido em silencio e o que faz boss chegar quebrado no aceite.

Rode content:check, assets:check e verify. Commite, integre por fast-forward, reverifique e limpe
worktree e branch removendo o diretorio antes do prune.

Pare se a IA precisar de estado que o snapshot nao carrega, se a escolha exigir stream de RNG novo
(isso e decisao de contrato), ou se o boss exigir summon, teleporte ou mudanca de mapa em runtime.
Nao inicie a proxima task.
```
