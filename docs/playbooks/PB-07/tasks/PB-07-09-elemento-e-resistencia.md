# PB-07-09 — Elemento e resistência

**Status inicial:** pending

**Classe da tarefa:** regra de simulação e conversão de conteúdo

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. PB-07-10 depende dela.

## Objetivo

Fazer o elemento do dano **importar**. Hoje dano é um inteiro sem cor: um rotworm sofre o mesmo de
fogo, de gelo e de espada. O catálogo já sabe as resistências de cada criatura e o conversor as joga
fora.

## Resultado esperado

Escolher a stance elemental do Sorcerer passa a ser uma decisão sobre *contra o quê você está
lutando*, e não só sobre qual número é maior. Criatura imune a um elemento não sofre nada dele.

## Dependências

- PB-07-03 integrada: `AbilityDefinition` e `ActorBlueprint` já carregam elemento e resistência.
- PB-07-08 integrada: existe uma vocação que declara elementos diferentes, sem a qual a regra não
  tem como ser observada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md` e `STATE.md`;
3. `.cursor/rules/10-boundaries.mdc` e `.cursor/rules/20-content.mdc`;
4. `packages/simulation/src/kernel/combat.ts`, `applyDamage` — o ponto único onde vida diminui;
5. `packages/contracts/src/content/schemas.ts` — `DamageTypeSchema`, e `resistances` e `immunities`
   em `CreatureDefinitionSchema`;
6. `packages/content/src/hunts/buildHuntScenario.ts`, `composeCreature` — a função que hoje descarta
   os dois;
7. `docs/content/PB-07-ROTATIONS.md`, para saber quais elementos as três vocações usam de fato.

## Decisões congeladas

- **`applyDamage` continua sendo o ponto único.** A resistência é aplicada lá, antes do clamp e antes
  de `combat/damaged` ser emitido. Não crie um segundo lugar onde dano é ajustado.
- **O evento reporta o dano final**, o que chegou na vida. A apresentação já lê `amount` e não pode
  passar a mostrar um número diferente do que a vida perdeu.
- **Imunidade é dano zero, não ausência de evento.** `combat/damaged` com `amount: 0` continua sendo
  emitido — é o que permite à apresentação mostrar "imune" em vez de engolir o golpe em silêncio.
- **Resistência é inteiro por milhar**, truncada de forma determinística. `resistances` no catálogo é
  `number` livre: a conversão para inteiro acontece no conversor, com regra explícita e testada.
- **O elemento default é `physical`**, e um mundo em que tudo é `physical` e ninguém resiste produz
  exatamente o comportamento de hoje. Este é o teste que separa a regra do bug.
- **Leech é calculado sobre o dano final**, depois da resistência. Bater em algo resistente rende
  menos sustentação — é o que dá peso à escolha de elemento.
- **Nada de crítico.**

## Escopo permitido

```text
packages/simulation/src/kernel/combat.ts
packages/simulation/src/kernel/combat.test.ts
packages/content/src/hunts/buildHuntScenario.ts
packages/content/src/hunts/*.test.ts
packages/content/src/selections/**             (só declarar elemento onde faltar)
packages/content/src/generated/**              (regeneração por CLI)
packages/test-fixtures/**                      (regeneração por CLI)
apps/game/src/hunt/CombatFxTable.ts            (cor do número por elemento)
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- kit de criatura, boss e IA — PB-07-10;
- condição elemental nova (queimando, congelado) — bullet no README se fizer falta;
- crítico.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-09-elements -b codex/pb07-09-elements main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-09-elements install --prefer-offline
```

- [ ] **2. RED da neutralidade — escreva primeiro.**

Um mundo sem resistência declarada e com todo dano `physical` produz **exatamente** os números de
hoje. Se este teste falhar depois do GREEN, a regra vazou para onde não devia.

- [ ] **3. RED da resistência.**

Resistência positiva reduz; negativa amplifica; resistência a um elemento não afeta outro; imunidade
zera **e emite** `combat/damaged` com `amount: 0`; resistência que zeraria o dano nunca produz vida
negativa nem cura acidental.

- [ ] **4. RED da conversão.**

`composeCreature` para de descartar: `resistances` e `immunities` do catálogo chegam ao blueprint;
a conversão de `number` para inteiro por milhar é determinística e testada nas bordas; elemento
desconhecido no catálogo é **recusa** com diagnóstico, não silêncio.

- [ ] **5. RED do leech sobre dano final.**

Leech contra alvo resistente rende menos, proporcional ao dano final e não ao dano bruto.

- [ ] **6. GREEN.**

- [ ] **7. Cor do número por elemento.**

`CombatFxTable` já escolhe cor por causa. Passa a considerar o elemento. É a única mudança de
apresentação da task, e é o que torna a regra legível sem abrir menu.

- [ ] **8. Golden, gates, integração e limpeza.**

Comportamento muda onde há resistência. Se as fixtures existentes forem todas `physical` sem
resistência, os goldens **não mudam** — e isso é um resultado, não um acidente: registre-o. Se
mudarem, explique o diff.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-09-elements verify
git -C C:\Kaezan\kaezan-huntbound-pb07-09-elements add packages apps docs
git -C C:\Kaezan\kaezan-huntbound-pb07-09-elements commit -m "feat: make damage elements and creature resistances matter"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-09-elements
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-09-elements
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-09-elements
```

## Verificação

`verify` verde na worktree e no integrado. Teste de neutralidade verde. `content:check` verde. Diff
de golden explicado, ou a ausência dele registrada com o motivo.

## Critérios de aceite

- [ ] Mundo todo `physical` sem resistência produz os números de hoje.
- [ ] Resistência positiva reduz, negativa amplifica, e uma não vaza para outra.
- [ ] Imunidade produz `amount: 0` **com** evento.
- [ ] Dano nunca fica negativo nem vira cura.
- [ ] `composeCreature` para de descartar `resistances` e `immunities`.
- [ ] Elemento desconhecido é recusa com diagnóstico.
- [ ] Resistência é inteiro por milhar, com conversão testada nas bordas.
- [ ] Leech é calculado sobre o dano final.
- [ ] `applyDamage` continua o ponto único de redução de vida.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: o teste de neutralidade falhar; `resistances` do catálogo tiver valor que não converta
para inteiro por milhar sem perda relevante; ou se a ordem de aplicação entre resistência e
modificador de condição do PB-07-05 não tiver uma leitura óbvia — nesse caso a ordem é decisão de
contrato e vai para `KERNEL_CONTRACT.md`.

## Persistência do handoff

`STATE.md`: status, branch, commit, contagem de testes, ordem de aplicação escolhida, modelo e
effort, próxima task. A ordem vai também para `KERNEL_CONTRACT.md`.

## Commit

`feat: make damage elements and creature resistances matter`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-09-elements`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-09-elements`; integração por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Regra implementada, ordem de aplicação, prova de neutralidade, o que aconteceu com os goldens,
desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-09-elemento-e-resistencia.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, .cursor/rules/20-content.mdc,
docs/playbooks/PB-07/README.md, o STATE.md, docs/content/PB-07-ROTATIONS.md e apenas os arquivos
indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-09-elements com a branch codex/pb07-09-elements
e rode "corepack pnpm install --prefer-offline" dentro dela.

ESCREVA PRIMEIRO O TESTE DE NEUTRALIDADE: mundo todo physical sem resistencia declarada produz
EXATAMENTE os numeros de hoje. Se ele falhar depois do GREEN, a regra vazou.

Depois, por RED:
- resistencia positiva reduz, negativa amplifica, uma nao vaza para outra;
- IMUNIDADE E DANO ZERO COM EVENTO: combat/damaged com amount 0 continua sendo emitido, para a
  apresentacao poder mostrar "imune" em vez de engolir o golpe em silencio;
- dano nunca fica negativo nem vira cura;
- composeCreature PARA DE DESCARTAR resistances e immunities do catalogo;
- conversao de number para INTEIRO POR MILHAR e deterministica e testada nas bordas;
- elemento desconhecido no catalogo e RECUSA com diagnostico;
- LEECH E CALCULADO SOBRE O DANO FINAL, depois da resistencia: bater em algo resistente rende menos
  sustentacao, e e isso que da peso a escolha de elemento.

applyDamage continua o PONTO UNICO onde vida diminui. A resistencia entra la, antes do clamp e antes
do evento. Nao crie segundo lugar onde dano e ajustado.

Unica mudanca de apresentacao: CombatFxTable passa a considerar o elemento na cor do numero.

NADA DE CRITICO.

Se as fixtures existentes forem todas physical sem resistencia, os goldens NAO mudam — isso e um
resultado, registre. Se mudarem, explique o diff.

Rode content:check e verify. Atualize STATE.md e KERNEL_CONTRACT.md com a ordem de aplicacao entre
resistencia e modificador de condicao do PB-07-05. Commite, integre por fast-forward, reverifique e
limpe worktree e branch removendo o diretorio antes do prune.

Pare se o teste de neutralidade falhar ou se a ordem de aplicacao nao tiver leitura obvia. Nao inicie
a proxima task.
```
