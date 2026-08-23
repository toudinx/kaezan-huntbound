# PB-07-11 — Rotação com cargas

**Status inicial:** pending

**Classe da tarefa:** regra de simulação, conteúdo e HUD

**Modelo sugerido:** Luna `max` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o usuário jogando

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial.

## Objetivo

Fechar o kit de seis slots. Runa e poção entram como **habilidade com cargas por hunt**, recarregadas
fora de combate — sem inventário usável, sem loja, sem clique contínuo.

## Resultado esperado

O jogador tem um recurso finito que não é mana: um punhado de usos fortes que ele decide quando
gastar. Acabar as cargas no bicho errado dói, e recuar para recarregar é a mesma decisão que a
sustentação já pede.

## Dependências

- PB-07-03 integrada: cargas e regra de recarga existem no contrato.
- PB-07-04 integrada: existe um relógio de combate, e é ele que define "fora de combate".
- PB-07-07 e PB-07-08 integradas: as três vocações existem e têm slots para preencher.
- PB-07-01: quais runas cada vocação usa e quantas cargas o item carrega em `items.xml`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, decisões 3 e 5, e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, seção "runas" das três vocações e a tabela de slots;
4. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, "Extensões Huntbound permitidas" — cargas já foi
   listada em PB-07-04; confirme antes de assumir;
5. `packages/simulation/src/kernel/combat.ts`, `resolveCast` — validação de recurso e cooldown, onde
   a carga entra como terceira condição;
6. `packages/simulation/src/kernel/combat.test.ts`;
7. `apps/game/src/ui/CombatHud.ts` e `apps/game/src/hunt/CombatViewModel.ts` — como um botão de
   habilidade mostra estado.

## Decisões congeladas

- **Sem inventário usável.** Nada de `actor/use-item`, item consumível, capacidade ou peso. A carga é
  atributo da habilidade, não de um objeto na bolsa. Isso está congelado desde a abertura do playbook
  e não se reabre aqui.
- **Recarga é fora de combate**, pelo mesmo relógio que o regen usa. Não invente um segundo conceito
  de "fora de combate": se o regen e a recarga discordarem, o jogador não tem como aprender a regra.
- **Carga é contada no `ActorState`**, por habilidade, ordenada canonicamente. É estado de simulação,
  não de apresentação, e por isso sobrevive ao `F5` de graça.
- **Habilidade sem cargas configuradas é ilimitada** e se comporta exatamente como hoje — o teste de
  neutralidade da task.
- **Custo de carga e custo de mana coexistem.** Uma runa pode custar os dois; a validação recusa se
  faltar qualquer um, com diagnóstico distinto para cada caso.
- **A HUD mostra as cargas.** Recurso invisível não é decisão, é surpresa.
- **Runa não vira dinheiro.** Nada de comprar, dropar ou estocar carga entre runs além do que a
  regra de recarga define.

## Escopo permitido

```text
packages/simulation/src/kernel/combat.ts
packages/simulation/src/kernel/combat.test.ts
packages/contracts/src/simulation/**            (só se PB-07-03 tiver deixado buraco)
packages/content/src/selections/**
packages/content/src/generated/**               (regeneração por CLI)
packages/content/src/hunts/**
apps/game/src/ui/CombatHud.ts
apps/game/src/hunt/CombatViewModel.ts
apps/game/src/hunt/HuntProbe.ts
tests/e2e/**
packages/test-fixtures/**                       (regeneração por CLI)
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- item usável, bolsa, loja, economia de loot;
- Druid e Monk;
- magia de área alvejada no chão, se a runa escolhida precisar disso — nesse caso escolha outra runa
  e registre.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-11-charges -b codex/pb07-11-charges main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-11-charges install --prefer-offline
```

- [ ] **2. RED da neutralidade.**

Habilidade sem cargas configuradas se comporta exatamente como hoje: mesmo consumo, mesmo cooldown,
mesma recusa. As três magias do Knight do PB-05 continuam idênticas.

- [ ] **3. RED do consumo.**

Cada uso gasta uma carga; carga em zero recusa com diagnóstico **próprio**, distinto de
`SIM_ABILITY_NO_RESOURCE` e de `SIM_ABILITY_ON_COOLDOWN`; uma recusa por falta de carga **não** gasta
mana nem dispara cooldown; uma recusa por falta de mana **não** gasta carga. Esse par cruzado é onde
mora o bug mais provável da task.

- [ ] **4. RED da recarga.**

Fora de combate, a carga volta no intervalo configurado, até o máximo e não além; tomar dano
interrompe; o relógio é o mesmo do regen — prove comparando com o comportamento da PB-07-04, não
reimplementando a janela.

- [ ] **5. RED da persistência.**

Cargas atravessam serialização e recarga do snapshot. Sem escrever persistência nova.

- [ ] **6. GREEN.** A validação de carga entra em `resolveCast`, ao lado das de recurso e cooldown. A
      recarga entra em `applyUpkeep`, ao lado do regen.

- [ ] **7. Conteúdo: preencher o slot de cada vocação.**

Conforme `PB-07-ROTATIONS.md`. Se a runa canônica de uma vocação exigir algo fora de escopo, escolha
outra do snapshot e registre a troca com o motivo.

- [ ] **8. HUD e probe.**

O botão da habilidade mostra as cargas restantes; `HuntProbeState` as expõe para o teste de browser
poder afirmar estado em vez de pixel.

- [ ] **9. Spec de browser no projeto `correctness`.**

Usar a habilidade reduz a carga exibida; com zero, o botão fica indisponível pelo motivo certo;
recuar recarrega.

- [ ] **10. Gates, jogar, integrar e limpar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-11-charges verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-11-charges dev
git -C C:\Kaezan\kaezan-huntbound-pb07-11-charges add packages apps tests docs
git -C C:\Kaezan\kaezan-huntbound-pb07-11-charges commit -m "feat: close the kit with charge-limited abilities"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-11-charges
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-11-charges
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-11-charges
```

## Verificação

`verify` verde na worktree e no integrado. Teste de neutralidade verde. Specs de browser estáveis
**sem `retries`**. Inspeção do passo 10 descrita: gaste as cargas, recue, veja voltar.

## Critérios de aceite

- [ ] Habilidade sem cargas configuradas é idêntica ao comportamento de hoje.
- [ ] Falta de carga tem diagnóstico próprio, distinto de mana e de cooldown.
- [ ] Recusa por carga não gasta mana nem cooldown; recusa por mana não gasta carga.
- [ ] Recarga usa o mesmo relógio de combate do regen, sem segunda implementação da janela.
- [ ] Cargas vivem no `ActorState`, ordenadas canonicamente, e sobrevivem ao `F5` sem persistência
      nova.
- [ ] As três vocações têm o slot preenchido.
- [ ] A HUD mostra as cargas restantes e o probe as expõe.
- [ ] Nenhum item usável, comando de usar item, bolsa ou loja entrou.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: a recarga exigir um conceito de "fora de combate" diferente do da PB-07-04; a carga não
couber no `ActorState` publicado em PB-07-03; ou se toda runa razoável de uma vocação exigir área
alvejada no chão.

## Persistência do handoff

`STATE.md`: status, branch, commit, runas escolhidas por vocação, contagem de testes, modelo e
effort, próxima task elegível.

## Commit

`feat: close the kit with charge-limited abilities`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-11-charges`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-11-charges`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Runas escolhidas e trocas com motivo, regra de recarga, contagem de testes, o que a inspeção mostrou,
desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Luna max ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-11-rotacao-com-cargas.md

Leia AGENTS.md, docs/playbooks/PB-07/README.md (decisoes 3 e 5), o STATE.md,
docs/content/PB-07-ROTATIONS.md secao runas, e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-11-charges com a branch codex/pb07-11-charges e
rode "corepack pnpm install --prefer-offline" dentro dela.

SEM INVENTARIO USAVEL. Nada de actor/use-item, item consumivel, capacidade, peso ou loja. A carga e
atributo da HABILIDADE. Isso esta congelado e nao se reabre.

Comece por RED.

(1) NEUTRALIDADE: habilidade sem cargas configuradas se comporta exatamente como hoje. As tres magias
do Knight do PB-05 continuam identicas.

(2) CONSUMO: cada uso gasta uma carga; carga zero recusa com diagnostico PROPRIO, distinto de
SIM_ABILITY_NO_RESOURCE e SIM_ABILITY_ON_COOLDOWN. PAR CRUZADO, que e onde mora o bug mais provavel:
recusa por falta de carga NAO gasta mana nem dispara cooldown, e recusa por falta de mana NAO gasta
carga.

(3) RECARGA: fora de combate a carga volta no intervalo configurado, ate o maximo e nao alem; tomar
dano interrompe. USE O MESMO RELOGIO DE COMBATE DA PB-07-04. Nao invente um segundo conceito de "fora
de combate": se regen e recarga discordarem, o jogador nao tem como aprender a regra.

(4) PERSISTENCIA: cargas atravessam serializacao e recarga do snapshot, sem escrever persistencia
nova — elas vivem no ActorState.

Validacao de carga entra em resolveCast ao lado de recurso e cooldown. Recarga entra em applyUpkeep
ao lado do regen.

Preencha o slot de runa das tres vocacoes conforme PB-07-ROTATIONS.md. Se a runa canonica exigir area
alvejada no chao (fora de escopo), escolha outra e registre a troca.

A HUD mostra as cargas restantes e HuntProbeState as expoe. Escreva spec no projeto correctness
afirmando estado: usar reduz, zero deixa indisponivel pelo motivo certo, recuar recarrega. Sem
retries.

Rode verify. NUNCA rode playwright test direto. Suba corepack pnpm dev, gaste as cargas, recue e veja
voltar. Commite, integre por fast-forward, reverifique e limpe worktree e branch removendo o
diretorio antes do prune.

Pare se a recarga exigir conceito de fora de combate diferente do da PB-07-04, ou se a carga nao
couber no ActorState publicado em PB-07-03. Nao inicie a proxima task.
```
