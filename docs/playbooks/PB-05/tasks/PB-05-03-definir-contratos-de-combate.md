# PB-05-03 — Definir os contratos de combate (v4)

**Status inicial:** pending

**Classe da tarefa:** alteração de schema congelado — gatilho de escalonamento pela política de
modelos

**Modelo sugerido:** Claude Opus 5, GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`. **Luna está excluída em
qualquer effort.**

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** sim, com PB-05-02, por ativação do supervisor. Esta task toca
`packages/contracts/src/simulation/**`; PB-05-02 toca `packages/content` e o schema de catálogo.

## Objetivo

Publicar o vocabulário de combate: `KernelScenario` v4, blueprint com facção e estatísticas,
`AbilityDefinition`, `LootTableDefinition`, `ActorState` estendido, comandos e eventos novos,
intents internas com espécie, e os diagnósticos correspondentes — **sem implementar regra nenhuma**.

`.cursor/rules/10-boundaries.mdc` diz que alterar contrato é condição de parada. A spec aprovada do
PB-05 é a autorização explícita que abre exceção para esta task, e apenas para ela.

## Resultado esperado

`@huntbound/contracts` valida documentos v4 e reprova documentos v3, com diagnósticos estruturados,
ordenados e testados. Nenhuma linha de `packages/simulation` muda nesta task: o kernel continua
compilando contra o contrato antigo até PB-05-04.

## Dependências

- PB-05-01 `done` e integrada em `main`.
- Spec aprovada em `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "Contratos v4",
   "Fases do tick" e "Parâmetros congelados";
4. `docs/simulation/KERNEL_CONTRACT.md` inteiro;
5. `packages/contracts/src/simulation/**` inteiro;
6. `packages/contracts/src/hunt/types.ts`, porque `KernelBlueprint` é alias de `ActorBlueprint`;
7. `.cursor/rules/10-boundaries.mdc`.

## Decisões congeladas

- `SIMULATION_SCHEMA_VERSION`: `3` → `4`. `SIMULATION_RULES_VERSION`: `2` → `3`.
- `KernelScenario` v4 acrescenta `abilities` e `lootTables`. Documento v3 é **reprovado**; não há
  compatibilidade, mesma política do salto v2 → v3.
- Blueprint ganha `factionId`, `maxHealth`, `maxResource`, `healthRegenTicks`, `healthRegenAmount`,
  `resourceRegenTicks`, `resourceRegenAmount`, `attackCooldownTicks`, `attackMinDamage`,
  `attackMaxDamage`, `aggroRadius`, `lootTableIndex` e `abilityIndices`. Todos obrigatórios; ator sem
  combate declara valores neutros.
- `ActorBehavior` ganha `hunter`.
- `ActorState` ganha `health`, `resource`, `targetEntityId`, `attackReadyAtTick`, `groupReadyAtTick`,
  `abilityCooldowns`, `nextHealthRegenTick` e `nextResourceRegenTick`.
- `PendingIntentState` vira união discriminada por `kind: 'move' | 'attack'`, mantendo a unicidade
  `(tick, entityId)` e a ordem canônica `(tick, entityId)`.
- Comandos novos: `actor/attack` prioridade `3` e `actor/cast-ability` prioridade `4`; `actor/wait`
  passa a `5`. A duplicata de borda cobre as quatro ações concorrentes.
- Eventos novos exatamente como a spec declara, incluindo `position` em `actor/died`.
- Diagnósticos novos: `SIM_TARGET_UNKNOWN`, `SIM_TARGET_SAME_FACTION`, `SIM_ATTACK_OUT_OF_RANGE`,
  `SIM_ATTACK_ON_COOLDOWN`, `SIM_ABILITY_UNKNOWN`, `SIM_ABILITY_ON_COOLDOWN`,
  `SIM_ABILITY_NO_RESOURCE`, `SIM_ABILITY_OUT_OF_RANGE`.
- Todo número é inteiro seguro. Nenhum float, em nenhum campo.
- Os schemas continuam estritos: campo desconhecido é rejeitado.

## Escopo permitido

```text
packages/contracts/src/simulation/**
packages/contracts/src/hunt/**            (apenas o que decorre do alias de blueprint)
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- `packages/simulation` — nenhuma regra, nenhuma fase, nenhum sistema;
- `packages/content`, `packages/assets`, `apps/game`, `tools/**`;
- migrar fixtures — pertence a PB-05-04;
- a IA `hunter`, o loot e a tradução de conteúdo.

## Interfaces produzidas

As declaradas na seção "Contratos v4" da spec, mais os validadores públicos já existentes, que passam
a reconhecer v4:

```ts
validateKernelScenario(input)
validateSimulationSnapshot(input)
validateSimulationCommandLog(input)
```

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-03-contracts -b claude/pb-05-03-combat-contracts main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-03-contracts install --prefer-offline
```

- [ ] **2. Escrever testes RED do cenário v4.**

Prove: documento v3 sem `abilities`/`lootTables` é rejeitado; `schemaVersion: 3` produz
`SIM_VERSION_MISMATCH`; blueprint sem os campos de combate é rejeitado; `attackMinDamage >
attackMaxDamage` é rejeitado; `minPower > maxPower` é rejeitado; `lootTableIndex` fora do intervalo
de `lootTables` é rejeitado; `abilityIndices` com índice inexistente, duplicado ou fora de ordem é
rejeitado; `radius` não nulo fora de `area` é rejeitado; `rangeTiles` não nulo fora de `target` é
rejeitado; `chancePerHundredThousand` fora de `[1, 100000]` é rejeitado; `minCount > maxCount` é
rejeitado; qualquer float é rejeitado.

- [ ] **3. Implementar o cenário v4 e as versões; obter GREEN.**

- [ ] **4. Escrever testes RED do snapshot v4.**

Prove: `abilityCooldowns` fora de ordem, com par repetido ou com índice não declarado no blueprint é
rejeitado; `health` maior que `maxHealth` do blueprint é rejeitado; `health` negativo é rejeitado;
`targetEntityId` apontando para ator ausente é rejeitado; `pendingIntents` com `kind` desconhecido é
rejeitado; duas intents com o mesmo `(tick, entityId)` são rejeitadas; intent de ataque cujo alvo não
existe no snapshot é rejeitada; snapshot `schemaVersion: 3` produz `SIM_VERSION_MISMATCH`.

- [ ] **5. Implementar o snapshot v4; obter GREEN.**

- [ ] **6. Escrever testes RED de comandos e eventos.**

Prove: `actor/attack` e `actor/cast-ability` são aceitos de `player` e de `ai` e recusados de
`scenario` com `SIM_COMMAND_FORBIDDEN`; `commandPriority` devolve a tabela nova inteira; a duplicata
de borda cobre as quatro ações concorrentes e não dispara para `actor/face`; cada evento novo valida
seu payload e recusa campo desconhecido; `actor/died` exige `position`.

- [ ] **7. Implementar comandos, eventos e diagnósticos; obter GREEN.**

- [ ] **8. Provar a ordenação determinística dos diagnósticos.**

Um documento com múltiplos erros produz a mesma lista, na mesma ordem, em execuções repetidas —
ordenada por `path` e depois por `code`, como o contrato já exige.

- [ ] **9. Documentar o contrato v4.**

Atualize `docs/simulation/KERNEL_CONTRACT.md`: versões, blueprint, abilities, loot tables, estado do
ator, intents com espécie, tabela de comandos com as prioridades novas, tabela de eventos, os
diagnósticos novos, os streams `combat` e `loot`, e as sete fases do tick. Descreva as fases como
**contrato pretendido**, deixando claro que a implementação chega em PB-05-04 — documentação que
promete comportamento inexistente é o defeito D3 em outra forma.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-03-contracts exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-03-contracts --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-03-contracts typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-03-contracts architecture:check
git -C C:\Kaezan\kaezan-huntbound-pb05-03-contracts diff --check
```

`simulation:check`, `hunt:check` e `verify` **não** passam nesta task, porque o kernel ainda não fala
v4. Isso é esperado e precisa estar declarado no relatório. A branch fica vermelha no gate agregado
até PB-05-04.

- [ ] **11. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-03-contracts add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb05-03-contracts commit -m "feat: publish the v4 combat contracts"
```

- [ ] **12. Integrar.**

**Esta task não integra sozinha em `main`.** Um `main` com contrato v4 e kernel v3 fica vermelho no
gate agregado. Preserve a branch e a worktree, registre no `STATE.md`, e deixe **PB-05-04 integrar as
duas branches em sequência**, verificando o conjunto. A worktree limpa pode ser removida após o
commit; a branch, não.

## Verificação

Testes de `@huntbound/contracts`, `typecheck` e `architecture:check` verdes; `biome check .` sai `0`.
A vermelhidão de `verify` é esperada e declarada, não mascarada.

## Critérios de aceite

- [ ] Documento v3 é reprovado com diagnóstico próprio, em cenário e em snapshot.
- [ ] Todos os campos novos são inteiros seguros e nenhum float é aceito.
- [ ] `abilityCooldowns` e `pendingIntents` têm ordem canônica total, provada por teste.
- [ ] As prioridades de comando novas estão completas e a duplicata cobre as quatro ações.
- [ ] Todo evento novo valida payload e recusa campo desconhecido.
- [ ] A ordenação dos diagnósticos é determinística.
- [ ] `KERNEL_CONTRACT.md` descreve v4 e marca as fases como pretendidas até PB-05-04.
- [ ] Nenhum arquivo de `packages/simulation` foi tocado.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: algum campo de combate exigir float para representar o conteúdo real; a união
discriminada de intents quebrar a unicidade `(tick, entityId)`; a tabela de prioridades gerar ordem
ambígua entre comandos do mesmo ator; ou se a mudança de contrato exigir tocar `packages/simulation`
para compilar — nesse caso o corte entre 03 e 04 está errado e precisa ser rediscutido, não
contornado.

## Persistência do handoff

Atualize `STATE.md` com status, branch **preservada**, commit, testes, modelo e effort usados, e o
registro explícito de que a integração pertence a PB-05-04.

## Commit

`feat: publish the v4 combat contracts`

## Ciclo de conclusão

Branch-base `main`; branch `claude/pb-05-03-combat-contracts`, **preservada**; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-03-contracts`, removida após o commit; integração delegada a
PB-05-04.

## Relatório final

Mudanças, contagem de testes, decisões de schema, declaração explícita de que `verify` está vermelha
por composição e não por defeito, e a próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5, GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Nao use Luna nesta task: ela altera schema congelado.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-03-definir-contratos-de-combate.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que
PB-05-01 esta done e integrada.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-03-contracts com a branch
claude/pb-05-03-combat-contracts e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Suba o schema para 4 e as rules para 3 e publique o vocabulario de combate:
abilities, lootTables, blueprint com faccao e estatisticas, ActorState estendido, intents com kind,
comandos actor/attack e actor/cast-ability, os eventos novos e os diagnosticos novos. Nenhum float em
nenhum campo. Documento v3 tem que ser reprovado.

NAO implemente regra: nenhum arquivo de packages/simulation pode ser tocado. Se o contrato nao
compilar sem mexer no kernel, PARE: o corte entre as tasks esta errado.

Rode biome check ., os testes de @huntbound/contracts, typecheck e architecture:check. simulation:check,
hunt:check e verify VAO falhar porque o kernel ainda fala v3 — isso e esperado, declare no relatorio e
nao tente mascarar.

Commite, PRESERVE a branch e nao integre em main: a integracao das duas branches pertence a PB-05-04.
Remova apenas a worktree limpa. Atualize o STATE.md registrando isso.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
