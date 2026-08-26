# PB-10-01 — Spawn por identidade estável

**Status inicial:** pending

**Classe da tarefa:** **implementação complexa** — contrato já integrado, estado de kernel, migração
de save, regenera **todos** os goldens de replay

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6** —, effort `xhigh`.
A mudança atravessa contrato, kernel, save e fixtures, e a parte difícil não é escrever: é escolher
uma identidade que continue estável quando o layout da hunt for recortado de novo.

**Validador sugerido:** modelo frontier **diferente** do implementador.

**Rota:** **sem skill externa.** Teste primeiro ("Passos", item 1) e nada afirmado sem saída fresca
("Verificações exigidas") são regra do `AGENTS.md`. Skills operacionais do repositório:
`playbook-task`, `run-gates`, `worktree-cycle`, `hunt-content-pipeline`.

**Paralelismo:** **nenhum.** É a primeira task do playbook e regenera todos os goldens. Qualquer task
rodando em paralelo torna impossível provar qual mudança moveu qual hash. Integre-a sozinha.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.

## Objetivo

Fazer o estado de spawn parar de ser endereçado por **posição na lista** e passar a ser endereçado
por **identidade**, para que acrescentar uma criatura a uma hunt deixe de invalidar todo save
existente.

## O defeito, medido

`packages/contracts/src/simulation/schemas.ts:1268` guarda o estado vivo de cada spawn ancorado em
`(groupIndex, slotIndex)` — a posição do slot dentro de `hunt.spawns.groups`, mais `readyAtTick` e
`entityId`. Os mesmos índices reaparecem em três lugares:

- `compareSpawnSlots` (`schemas.ts:1313`), que é a ordenação canônica do snapshot;
- `SpawnDeferredEventPayloadSchema` (`schemas.ts:935`);
- `SpawnCappedEventPayloadSchema` (`schemas.ts:944`).

Consequência: **inserir um grupo no meio, ou um slot no meio de um grupo, renumera tudo que vem
depois**. Um save gravado antes passa a apontar para outra criatura. Não é hipótese — na PB-08-01,
onde os slots de rotworm foram de 4 para 20, isso custou **8 testes vermelhos e um ciclo inteiro de
conserto**, com **uma** mudança de conteúdo.

Este playbook mexe em conteúdo de hunt **cinco vezes**. É a única classe de quebra que fica mais cara
a cada hunt adicionada, e por isso é a primeira task.

## A decisão que é sua — e é o motivo de esta task ser frontier

**De onde sai a identidade estável de um slot?**

O critério não é "ser único". É **continuar o mesmo depois de o layout da hunt ser recortado de
novo** — porque recortar layout é exatamente o que as tasks 07 a 10 vão fazer.

A opção que a spec recomenda, e que você deve derrubar por escrito se escolher outra: **a coordenada
de origem no mapa real do Canary**. Ela já existe, já é declarada, e não se move quando a caverna é
recortada — `packages/content/src/layouts/hunts/venore-rotworm-cave.json` traz, para cada spawn, um
par `source` (a coordenada real em `otservbr-monster.xml`, por exemplo `33026, 32009, 8`) e `target`
(onde ele caiu no recorte, por exemplo `19, 7, 8`).

Hoje o extractor usa o `target` e **descarta o `source`**: `spawns.json` não tem nenhum campo de
origem. Propagá-lo é a maior parte do trabalho de conteúdo desta task.

O que a identidade escolhida tem que satisfazer, seja ela qual for:

- **estável** sob inserção, remoção e reordenação de qualquer outro slot;
- **estável** sob recorte diferente do layout, se a origem real não mudou;
- **determinística** — mesma entrada, mesma identidade, sem RNG e sem contador de iteração;
- **desempatada explicitamente** quando dois slots compartilham a mesma origem (existe: há grupos com
  2 e 3 slots em `spawns.json`);
- **serializável** em `ActorState` e no snapshot: só inteiro seguro, booleano e string;
- **ordenável** — `compareSpawnSlots` precisa de uma ordem total, e ela vira a ordem canônica do
  snapshot.

Registre a escolha em uma linha no commit **e** documente a semântica em
`docs/simulation/KERNEL_CONTRACT.md` e em `docs/content/MAP_REGION_CONTRACT.md`. Comportamento de
kernel sem contrato escrito é o que produz a próxima divergência de golden.

## Restrições de kernel, não negociáveis

- **Determinismo primeiro.** `packages/simulation` continua sem `Math.random()`, sem `Date.now()`,
  sem I/O, sem dependência externa. **Nenhum draw de RNG novo** — um draw a mais desloca os streams e
  invalida replay muito além desta task.
- **A ordem de spawn não pode mudar por acidente.** Se a identidade nova produzir uma ordenação
  diferente da atual, o comportamento do jogo muda junto. Ou você preserva a ordem observável, ou
  prova por escrito que a mudança é intencional e desejável. **As duas são aceitáveis; silêncio não
  é.**
- **`maxLiveActors` e a semântica de `spawn/capped` e `spawn/deferred` não mudam.** Só o endereço
  dentro do payload.
- **Nenhuma persistência nova.** O `ActiveRunState` do PB-06 já serializa o snapshot inteiro.

## A migração de save

`SAVE_SCHEMA_VERSION` é **1** (`packages/contracts/src/save/types.ts:4`). Esta task o leva a **2** e
escreve a primeira migração real do repositório em
`packages/save/src/migrations/migrateSaveDocument.ts`, que já tem o runner pronto
(`SaveMigration { from, to, migrate }`).

A migração 1 para 2 tem um problema honesto: um save v1 guarda `(groupIndex, slotIndex)` contra uma
hunt que ela **não sabe qual é** além do `session.huntId`. Duas saídas legítimas, e você escolhe uma:

1. **traduzir** os índices lendo a `hunt.json` daquele `huntId` e reemitindo a identidade nova;
2. **descartar o estado de spawn** e deixar todos os slots prontos para spawnar, preservando o resto
   do save.

A 2 é mais simples e mais fácil de reverter; a 1 preserva mais. Escolha, registre em uma linha no
commit, e **teste o round-trip** — o save v1 de `packages/test-fixtures/save/pb06/legacy.json` tem
que abrir depois da migração.

## Os goldens

**Esta task move goldens de propósito, e move quase todos.** O snapshot canônico muda de forma, então
espera-se mover:

| Gate | Fixture | Esperado |
|---|---|---|
| `simulation:check` | `test-fixtures/simulation/pb03` | **move** se o cenário tiver spawn; se não tiver, **inalterado** — confira antes de aceitar |
| `hunt:check` | `hunt/pb04` e `hunt/pb04-respawn` | **move** |
| `combat:check` | `hunt/pb05` | **move** |
| `save:check` | `save/pb06` | **move**, com `schemaVersion` 2 |

Regenere pelos tools — `tools/replay/cli.ts run --out <dir>` e `tools/save/cli.ts` —, atualize
`hashes.md` e os `.sha256`, e **prove por escrito no commit** o que mudou e por quê. O `AGENTS.md` é
explícito: golden diferente é mudança de comportamento, e reescrever golden para passar é defeito.

O que **não** pode acontecer: o número de criaturas vivas, os ticks de respawn ou a ordem de
aparecimento mudarem sem você ter dito que mudariam.

## Condição de parada

Se para fazer isto funcionar você precisar mudar a semântica de `SimulationSnapshot` além do endereço
do slot — o formato do command log, a identidade de `EntityId`, ou a ordem de execução do tick —,
**pare e registre bloqueio no `STATE.md`**, não só no relatório.

## Leitura mínima

1. esta task;
2. a spec do playbook, decisão congelada 5, e o `README.md` deste playbook;
3. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
4. `docs/content/MAP_REGION_CONTRACT.md`;
5. `.cursor/rules/10-boundaries.mdc` e `.cursor/rules/50-tests.mdc`;
6. `packages/contracts/src/simulation/schemas.ts` — `SpawnSlotStateSchema`, `compareSpawnSlots`,
   `SpawnDeferredEventPayloadSchema`, `SpawnCappedEventPayloadSchema`;
7. `packages/contracts/src/hunt/types.ts:50` — `SpawnSlotDefinition`;
8. `packages/simulation/src/kernel/kernel.ts` — o laço de spawn e respawn;
9. `tools/map-extractor/spawns.ts` e `layout.ts` — onde `spawnPlacements` vira `spawns.json`;
10. `packages/save/src/migrations/migrateSaveDocument.ts`.

## Passos

1. **Teste primeiro.** Cinco vermelhos, no mínimo:
   - inserir um grupo **no meio** de uma hunt não muda a identidade de nenhum slot existente;
   - inserir um slot **no meio** de um grupo idem;
   - dois slots com a mesma origem recebem identidades diferentes e ordem determinística;
   - um snapshot serializado e recarregado devolve exatamente o mesmo estado de spawn;
   - um save v1 de fixture abre depois da migração 1 para 2.
2. Propague a origem real do spawn no extractor: o `source` de `spawnPlacements` chega em
   `spawns.json` e em `hunt.json`. Regenere com `corepack pnpm hunt:extract` e confira o diff.
3. Troque o endereço no contrato: `SpawnSlotStateSchema`, `compareSpawnSlots` e os dois payloads de
   evento.
4. Ajuste o kernel para o endereço novo, sem tocar em `maxLiveActors` nem na semântica de deferral.
5. Escreva a migração 1 para 2 e suba `SAVE_SCHEMA_VERSION`.
6. Documente a identidade escolhida em `KERNEL_CONTRACT.md` e `MAP_REGION_CONTRACT.md`.
7. Regenere os goldens, confira o diff **hash por hash**, e escreva a prova.
8. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm architecture:check`
- `corepack pnpm content:check` — o `spawns.json` regenerado passa no sidecar
- `corepack pnpm simulation:check` — **confira antes se o cenário do PB-03 tem spawn.** Se não tiver
  e mover, o comportamento vazou
- `corepack pnpm hunt:check` — **vai mudar**, com prova escrita
- `corepack pnpm combat:check` — **vai mudar**, com prova escrita
- `corepack pnpm save:check` — **vai mudar**, com `schemaVersion` 2
- `corepack pnpm qa:browser`
- `corepack pnpm verify` no fechamento

## Risco conhecido

**Mudar comportamento sem perceber, escondido atrás de um golden que você já esperava mover.** Esta é
a única task do playbook em que quatro goldens mudam de propósito ao mesmo tempo — e é exatamente aí
que uma mudança de ordem de spawn passa despercebida. A defesa é comparar o diff **semanticamente**,
não só confirmar que o hash é novo: mesmo número de criaturas, mesmos ticks de respawn, mesma ordem
de aparecimento.

## Definition of Done

- [ ] Estado de spawn endereçado por identidade estável, não por posição na lista.
- [ ] Origem real do spawn propagada do layout até `spawns.json`.
- [ ] Inserir grupo ou slot no meio não muda a identidade de nenhum outro slot, provado por teste.
- [ ] Empate de origem resolvido de forma determinística e testada.
- [ ] Ordem canônica do snapshot preservada, ou mudança provada como intencional.
- [ ] Nenhum draw de RNG novo.
- [ ] Migração de save 1 para 2, com round-trip do save v1 de fixture.
- [ ] Identidade documentada em `KERNEL_CONTRACT.md` e `MAP_REGION_CONTRACT.md`.
- [ ] Goldens regenerados com prova escrita, hash por hash.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados, e o B9 fechado.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-01-spawn-por-identidade.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, .cursor/rules/50-tests.mdc,
docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md,
docs/simulation/KERNEL_CONTRACT.md, docs/simulation/REPLAY_CONTRACT.md e
docs/content/MAP_REGION_CONTRACT.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-01-spawn-identity com a branch
<agente>/pb10-01-spawn-identity e rode "corepack pnpm install --prefer-offline" dentro dela.

NAO rode nada em paralelo com esta task. Ela regenera quase todos os goldens, e qualquer outra
mudanca simultanea torna impossivel provar qual delas moveu qual hash.

Comece por RED. O defeito: o estado vivo de spawn e endereçado por (groupIndex, slotIndex) em
SpawnSlotStateSchema, packages/contracts/src/simulation/schemas.ts:1268, e os mesmos indices estao em
compareSpawnSlots (:1313), SpawnDeferredEventPayloadSchema (:935) e SpawnCappedEventPayloadSchema
(:944). Inserir um grupo ou um slot NO MEIO renumera tudo depois e invalida todo save existente. Na
PB-08-01 isso custou 8 testes vermelhos com UMA mudanca de conteudo; o PB-10 mexe em conteudo CINCO
vezes.

A DECISAO QUE E SUA: de onde sai a identidade estavel. O criterio nao e "ser unico", e CONTINUAR O
MESMO depois de o layout da hunt ser recortado de novo. A opcao recomendada pela spec, que voce pode
derrubar POR ESCRITO: a coordenada de origem no mapa real do Canary. Ela ja existe em
packages/content/src/layouts/hunts/venore-rotworm-cave.json como spawnPlacements[].source, e o
extractor hoje usa o target e DESCARTA o source — spawns.json nao tem campo de origem. Propaga-lo e a
maior parte do trabalho de conteudo desta task.

A identidade tem que ser: estavel sob insercao/remocao/reordenacao; estavel sob recorte diferente do
layout; deterministica sem RNG e sem contador de iteracao; desempatada explicitamente quando dois
slots compartilham origem (existe: ha grupos com 2 e 3 slots); serializavel (inteiro seguro, booleano
ou string); e ordenavel, porque compareSpawnSlots vira a ordem canonica do snapshot.

RESTRICOES NAO NEGOCIAVEIS:
- Sem Math.random, sem Date.now, sem I/O em packages/simulation. NENHUM DRAW DE RNG NOVO.
- A ORDEM DE SPAWN NAO PODE MUDAR POR ACIDENTE. Ou voce preserva a ordem observavel, ou prova por
  escrito que a mudanca e intencional. As duas sao aceitaveis; silencio nao e.
- maxLiveActors e a semantica de spawn/capped e spawn/deferred NAO mudam. So o endereco no payload.
- NENHUMA PERSISTENCIA NOVA: o ActiveRunState do PB-06 ja serializa o snapshot inteiro.

MIGRACAO DE SAVE: SAVE_SCHEMA_VERSION e 1 em packages/contracts/src/save/types.ts:4. Leve para 2 e
escreva a migracao em packages/save/src/migrations/migrateSaveDocument.ts, que ja tem o runner
SaveMigration { from, to, migrate }. Um save v1 guarda indices contra uma hunt que ele so identifica
por session.huntId. Duas saidas legitimas: TRADUZIR os indices lendo a hunt.json daquele huntId, ou
DESCARTAR o estado de spawn deixando todos os slots prontos e preservando o resto do save. A segunda e
mais simples e mais facil de reverter. Escolha, registre em uma linha no commit, e teste o round-trip
com packages/test-fixtures/save/pb06/legacy.json.

OS GOLDENS VAO MOVER, de proposito: hunt:check (pb04 e pb04-respawn), combat:check (pb05) e
save:check (pb06, agora schemaVersion 2). simulation:check (pb03) so deve mover SE o cenario tiver
spawn — CONFIRA ANTES; se nao tiver e mover, o comportamento vazou. Regenere com
"tools/replay/cli.ts run --out <dir>" e tools/save/cli.ts, atualize hashes.md e os .sha256.

RISCO CENTRAL: mudar comportamento sem perceber, escondido atras de um golden que voce ja esperava
mover. Compare o diff SEMANTICAMENTE, nao so o hash: mesmo numero de criaturas vivas, mesmos ticks de
respawn, mesma ordem de aparecimento.

DOCUMENTE a identidade escolhida em docs/simulation/KERNEL_CONTRACT.md e
docs/content/MAP_REGION_CONTRACT.md. Comportamento de kernel sem contrato escrito e o que produz a
proxima divergencia de golden.

CONDICAO DE PARADA: se precisar mudar a semantica de SimulationSnapshot alem do endereco do slot — o
formato do command log, a identidade de EntityId, ou a ordem de execucao do tick —, PARE e registre
bloqueio no STATE.md, nao so no relatorio.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm architecture:check
- corepack pnpm content:check
- corepack pnpm simulation:check  -> so move se o cenario do PB-03 tiver spawn
- corepack pnpm hunt:check        -> VAI MUDAR, com prova escrita
- corepack pnpm combat:check      -> VAI MUDAR, com prova escrita
- corepack pnpm save:check        -> VAI MUDAR, schemaVersion 2
- corepack pnpm qa:browser
- corepack pnpm verify no fechamento

Ao terminar: atualize somente a linha PB-10-01 do STATE.md com o modelo e o effort EFETIVAMENTE
usados, e feche o bloqueio B9. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main
com git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
