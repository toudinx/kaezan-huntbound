# PB-07-05 — Sistema de condições e stances

**Status inicial:** pending

**Classe da tarefa:** sistema novo no kernel; herdado por vocações, criaturas e boss

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. Tudo de PB-07-07 em diante depende deste sistema.

## Objetivo

Dar ao kernel a noção de **condição com duração**: algo aplicado a um ator, que expira sozinho, que
modifica como ele luta enquanto dura, e que pode ser exclusivo de um slot. É o que sustenta stance,
haste, magic shield, veneno e paralisia — cinco coisas que hoje não têm onde morar.

## Resultado esperado

Uma stance ligada muda os números do combate, desliga ao ser relançada, expulsa a stance rival do
mesmo slot, e sobrevive a um `F5` porque vive no snapshot. Um veneno tira vida sozinho e para na
hora certa. Nada disso precisa de caso especial na cena.

## Dependências

- PB-07-03 integrada: os campos de condição ativa e de cooldown por grupo existem.
- PB-07-04 integrada: `applyUpkeep` já escolhe taxa por relógio de combate, e é no mesmo lugar que a
  expiração e o dano por tick da condição vão morar.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, decisões 6, 8 e 9, e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, a tabela de stances 2026, o delta contra o snapshot e a
   adaptação proposta para o Sorcerer;
4. `.cursor/rules/10-boundaries.mdc`;
5. `packages/simulation/src/kernel/combat.ts` — `applyUpkeep`, `applyDamage`, `resolveCast` e
   `abilityOnCooldown`;
6. `packages/simulation/src/kernel/kernel.ts` — onde o passo de movimento lê `stepCooldownTicks`, que
   é o que haste precisa modificar;
7. `packages/contracts/src/simulation/types.ts`, os campos publicados em PB-07-03;
8. `packages/contracts/src/content/schemas.ts`, `ConditionDefinitionSchema` — hoje uma união de um
   membro.

## Decisões congeladas

- **Condição é dado do cenário, endereçada por índice.** Como `abilities` e `lootTables`. Nenhuma
  string livre entra no estado do kernel.
- **Expiração é por tick absoluto**, comparado do mesmo jeito que `readyAtTick` e `attackReadyAtTick`
  já são. Não conte para trás; não guarde "ticks restantes", que teria de ser decrementado e
  divergiria no replay.
- **Exclusividade é por chave de slot.** Aplicar uma condição com a chave de outra já ativa **remove
  a anterior**. É assim que Blood Rage e Protector se expulsam. Chave ausente significa que a
  condição empilha livremente — veneno de duas criaturas não se cancela.
- **Stance é toggle.** Relançar a stance ativa **desliga** e não cobra mana de novo. É a regra do
  Vocation Adjustments 2026 e é o que faz dela um modo, não um botão.
- **Stance persiste porque vive no `ActorState`**, que o `ActiveRunState` do PB-06 já serializa
  inteiro. Não escreva persistência nova; prove que a existente cobre.
- **Sorcerer sem crítico.** As três stances elementais são adaptadas conforme PB-07-01. Não
  introduza chance de crítico.
- **O grupo secundário de cooldown é canal separado.** Uma stance em cooldown de grupo secundário não
  pode travar um ataque do grupo primário.
- **Modificador é inteiro por milhar**, e a ordem de aplicação de múltiplos modificadores é
  determinística e documentada. Duas condições que mexem no mesmo número precisam produzir o mesmo
  resultado em qualquer máquina.

## Escopo permitido

```text
packages/simulation/src/kernel/**
packages/contracts/src/content/schemas.ts        (ampliar ConditionDefinitionSchema)
packages/contracts/src/simulation/**             (só se PB-07-03 tiver deixado buraco)
packages/content/src/hunts/buildHuntScenario.ts
packages/test-fixtures/**                        (regeneração por CLI)
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- vocação nova, magia nova, seleção de conteúdo — PB-07-07 e PB-07-08;
- kit de criatura e boss — PB-07-10;
- cargas — PB-07-11;
- apresentação da stance na HUD. Se a HUD não mostrar qual stance está ativa, isso é bullet novo no
  README, não escopo aqui.

## Os tipos de condição a suportar

O mínimo que as decisões do playbook exigem. `PB-07-ROTATIONS.md` pode acrescentar; não pode tirar.

| Tipo | O que faz | Quem usa |
|---|---|---|
| Modificador de skill | altera o número que a fórmula de dano lê | Blood Rage, Sharpshooter, Protector |
| Modificador de dano causado | escala o dano que o ator aplica | Protector, stances elementais adaptadas |
| Modificador de dano recebido | escala o dano que o ator sofre | Blood Rage, Protector |
| Modificador de velocidade | altera `stepCooldownTicks` efetivo | Haste, Charge, paralisia |
| Escudo de mana | dano consome mana antes de vida | Magic Shield |
| Dano por tick | tira vida em intervalo fixo | veneno, e o DoT de boss do PB-07-10 |

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-05-conditions -b codex/pb07-05-conditions main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-05-conditions install --prefer-offline
```

- [ ] **2. RED do ciclo de vida.**

Aplicar registra a condição com o tick de expiração certo; ela some **no** tick de expiração e não um
depois — teste os dois ticks; reaplicar a mesma condição renova a expiração sem duplicar a entrada; a
lista de condições ativas mantém ordem canônica; um snapshot serializado e recarregado converge para
o mesmo estado.

- [ ] **3. RED da exclusividade.**

Duas condições com a mesma chave de slot: aplicar a segunda remove a primeira, e o efeito da primeira
some no mesmo tick. Duas condições sem chave empilham. Uma condição com chave não interfere em outra
com chave diferente.

- [ ] **4. RED do toggle.**

Relançar a stance ativa desliga e **não** cobra mana. Lançar com nenhuma ativa liga e cobra. Lançar a
rival troca, cobrando a rival. Estado "sem stance" é válido e é o inicial.

- [ ] **5. RED de cada tipo de modificador.**

Um teste por linha da tabela. Para velocidade, prove que o passo fica mais rápido de verdade — o
número que muda é o `stepCooldownTicks` efetivo, e paralisia é o mesmo mecanismo com sinal
contrário. Para escudo de mana, prove que o dano come mana primeiro, que sobra passa para a vida, e
que mana em zero devolve o comportamento normal. Para dano por tick, prove o intervalo e a parada.

- [ ] **6. RED da composição.**

Duas condições mexendo no mesmo número produzem resultado determinístico e documentado. Este é o
teste que impede o bug que só aparece com stance mais haste mais veneno ao mesmo tempo.

- [ ] **7. RED do canal secundário.**

Cooldown de grupo secundário não trava o grupo primário, e vice-versa.

- [ ] **8. GREEN.** A expiração e o dano por tick vão para `applyUpkeep`, que já é o passo por tick.
      A consulta de modificador é função pura consultada por quem calcula dano, cura e passo — não
      espalhe `if` de condição por dentro de `resolveAttack` e `resolveCast`.

- [ ] **9. Provar a persistência.**

Um teste que ligue uma stance, serialize o snapshot, recarregue e confirme que continua ligada com a
expiração correta. Sem escrever persistência nova.

- [ ] **10. Golden, gates, integração e limpeza.**

Comportamento muda; golden do PB-05 muda. Regenere pelo CLI e explique o diff. Depois:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-05-conditions verify
git -C C:\Kaezan\kaezan-huntbound-pb07-05-conditions add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb07-05-conditions commit -m "feat: give the kernel timed conditions and stance slots"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-05-conditions
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-05-conditions
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-05-conditions
```

## Verificação

`verify` verde na worktree e no integrado. Testes de `@huntbound/simulation` com contagem registrada.
Diff de golden explicado. Teste de round-trip de snapshot com stance ativa.

## Critérios de aceite

- [ ] Condição é endereçada por índice do cenário; nenhuma string livre no estado.
- [ ] Expiração é por tick absoluto, testada nos dois ticks da borda.
- [ ] Chave de slot expulsa a rival; ausência de chave empilha.
- [ ] Toggle desliga sem cobrar mana; "sem stance" é estado válido.
- [ ] Os seis tipos da tabela têm teste próprio.
- [ ] Composição de duas condições sobre o mesmo número é determinística e documentada.
- [ ] Canal secundário de cooldown não trava o primário.
- [ ] Stance sobrevive a serialização e recarga, sem persistência nova.
- [ ] A consulta de modificador é função pura; não há `if` de condição espalhado pela resolução.
- [ ] Nenhuma chance de crítico entrou no kernel.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: a forma publicada em PB-07-03 não couber num dos seis tipos; a composição de
modificadores não tiver ordem determinística óbvia; a persistência do PB-06 **não** cobrir a stance;
ou se o escudo de mana exigir mudar a ordem de resolução de combate.

## Persistência do handoff

`STATE.md`: status, branch, commit, contagem de testes, ordem de composição escolhida, modelo e
effort, próxima task elegível. A ordem de composição vai também para `KERNEL_CONTRACT.md` — é regra
durável, não estado.

## Commit

`feat: give the kernel timed conditions and stance slots`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-05-conditions`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-05-conditions`; integração por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Tipos implementados, ordem de composição, contagem de testes, diff de golden explicado, prova de
persistência, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-05-sistema-de-condicoes-e-stances.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, docs/playbooks/PB-07/README.md (decisoes 6, 8 e 9),
o STATE.md, docs/content/PB-07-ROTATIONS.md e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-05-conditions com a branch
codex/pb07-05-conditions e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente CONDICAO COM DURACAO no kernel, suportando seis tipos: modificador de
skill, de dano causado, de dano recebido, de velocidade (stepCooldownTicks efetivo), escudo de mana,
e dano por tick.

Regras que precisam de teste:
- condicao e endereçada por INDICE na tabela do cenario, como abilities e lootTables. Nenhuma string
  livre no estado do kernel.
- expiracao por TICK ABSOLUTO, como readyAtTick. NAO guarde "ticks restantes". Teste os dois ticks da
  borda.
- EXCLUSIVIDADE POR CHAVE DE SLOT: aplicar uma condicao com a chave de outra ativa REMOVE a anterior.
  E assim que Blood Rage e Protector se expulsam. Sem chave, empilha: veneno de duas criaturas nao se
  cancela.
- STANCE E TOGGLE: relancar a ativa DESLIGA e NAO cobra mana. "Sem stance" e estado valido e inicial.
- composicao de duas condicoes sobre o mesmo numero e DETERMINISTICA e documentada em
  KERNEL_CONTRACT.md.
- canal de cooldown SECUNDARIO nao trava o primario, e vice-versa.
- modificador e inteiro por milhar. Nada de ponto flutuante no kernel.

Expiracao e dano por tick vao para applyUpkeep, que ja e o passo por tick. A consulta de modificador
e FUNCAO PURA consultada por quem calcula dano, cura e passo: NAO espalhe if de condicao por dentro
de resolveAttack e resolveCast.

Prove que a stance sobrevive a serializacao e recarga SEM escrever persistencia nova — ela vive no
ActorState, que o ActiveRunState do PB-06 ja serializa inteiro.

NAO introduza chance de critico. As stances de Sorcerer sao as adaptadas por PB-07-ROTATIONS.md.

Comportamento muda, entao o golden do PB-05 muda. Regenere pelo CLI e explique o diff.

Rode verify. Atualize STATE.md e KERNEL_CONTRACT.md, commite, integre por fast-forward, reverifique e
limpe worktree e branch removendo o diretorio antes do prune.

Pare se a forma publicada em PB-07-03 nao couber num dos seis tipos, se a composicao nao tiver ordem
determinista obvia, ou se a persistencia do PB-06 nao cobrir a stance. Nao inicie a proxima task.
```
