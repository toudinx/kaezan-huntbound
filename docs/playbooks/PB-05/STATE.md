# PB-05 — Estado operacional

**Playbook:** `docs/playbooks/PB-05/README.md`

**Estado geral:** execução em andamento. **PB-05-05 concluída na branch
`grok/pb-05-05-hunter-ai`; PB-05-06 implementada localmente, mas bloqueada para
integração pelo QA browser de baseline.** O kernel opera em `schemaVersion` 4 /
`rulesVersion` 3. `S6` decide `hunter` (manutenção, aquisição Chebyshev, passo
guloso, golpe) e preserva o consumo de `ai` dos cenários sem `hunter`.

**Última atualização:** 2026-08-16

**Atualização vigente:** criaturas `hunter` agridem, perseguem e golpeiam em
`S6`. Aquisição e perseguição não consomem aleatoriedade; sem alvo o hunter cai
em `wander` com um `nextBelow(8)`. PB-05-06 rola loot em `S5` pelo stream
`loot` e projeta a bolsa fora do kernel; a integração aguarda a resolução do
gate browser preexistente.

**Próxima etapa:** concluir a verificação/integrar PB-05-06; só depois iniciar
PB-05-07.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-05-01 | done | `grok/pb-05-01-vocation-spell-selection` | `2933012` (ff `2f455d5..2933012`) | `docs/content/PB-05-SELECTION.md` + CLI `check-combat` exit 0; `verify` pós-ff ainda vermelho em hunt-budget (B5) |
| PB-05-02 | done | `grok/pb-05-02-import-spells-character` | `f1e8dab` (ff `624dac7..f1e8dab`) | bundle com 3 spells + ficha; hash `b0b0a0b7…c77c770`; `content:check` 0×2 |
| PB-05-03 | done | `grok/pb-05-03-combat-contracts` | `6cec836` (neste fast-forward) | `packages/contracts/src/simulation/**` v4 + `KERNEL_CONTRACT.md`; 148 testes de contracts |
| PB-05-04 | done | `grok/pb-05-04-kernel-combat` | `188a61a` | kernel v4; journals golden byte-idênticos |
| PB-05-05 | done | `grok/pb-05-05-hunter-ai` | este commit | `hunter` em S6; 20 testes novos; journals PB-03/PB-04 byte-idênticos; `verify` 1 em B5 |
| PB-05-06 | blocked (local) | `codex/pb-05-06-loot-autoloot` | `87ef9c5` (não integrado) | `loot/granted` determinístico + projeção da bolsa fora do kernel; gates de código verdes, QA browser B5 vermelho |
| PB-05-07 | pending | `<agente>/pb05-07-content-to-combat` | — | `buildHuntScenario` com combate; quatro artefatos da hunt inalterados |
| PB-05-08 | pending | `<agente>/pb05-08-combat-fixture` | — | `packages/test-fixtures/hunt/pb05/**` + `combat:check` + registro no contrato de replay |
| PB-05-09 | pending | `<agente>/pb05-09-combat-assets` | — | pack com efeitos, corpo e sangue; `assets:check` exit 0 |
| PB-05-10 | pending | `<agente>/pb05-10-combat-hud` | — | HUD, input, números de dano, autoloot e overlay de morte |
| PB-05-11 | pending | `<agente>/pb05-11-combat-browser-qa` | — | `artifacts/browser-qa.md` + 4 screenshots + specs estáveis sem `retries` |
| PB-05-12 | pending | `<agente>/pb05-12-integrated-gate` | — | `artifacts/acceptance-report.md` |

## Última task concluída

PB-05-05. Branch `grok/pb-05-05-hunter-ai` a partir de `main` (`188a61a`).
Worktree irmã `C:\Kaezan\kaezan-huntbound-pb05-05-hunter`. Fast-forward para
`main` autorizado pela task card.

## Handoff PB-05-06 — 2026-08-16

**Status:** implementação local concluída em `87ef9c5927fdd94cc0d3306f931c6de6067653fb`,
mas a task não foi integrada nem a worktree removida porque `verify` não fechou.

**Base:** `main` em `6f36641cd0809df83d33884c053afadf6490ff8d`.

**Branch/worktree:** `codex/pb-05-06-loot-autoloot` em
`C:\Kaezan\kaezan-huntbound-pb05-06-loot`.

**Modelo/effort:** GPT-5 Codex; o effort interno não é exposto pelo runtime.

**Entrega:** `S5` percorre tabelas na ordem declarada pelo stream `loot`, usa
comparação estritamente menor, não sorteia contagem fixa, emite `loot/granted`
depois de `actor/died`, e não rola para morte sem matador, sem tabela ou do
blueprint `player`. `projectRunBag` em `@huntbound/content` agrega por
`itemKey`, é incremental, ordenada e falha explicitamente para índice inválido.
Nenhum campo novo entrou no snapshot e nenhum golden foi alterado.

**Verificações:**

| Comando | Exit | Resultado |
|---|---:|---|
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot exec biome check .` | `0` | 392 arquivos |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot --filter @huntbound/simulation test` | `0` | 212 testes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot --filter @huntbound/content test` | `0` | 68 testes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot typecheck` | `0` | todos os 7 projetos |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot architecture:check` | `0` | fronteiras verdes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot content:check` | `0` | sidecars e catálogo verdes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot assets:check` | `0` | packs/profile verdes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot simulation:check` | `0` | PB-03 byte-idêntico |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot hunt:check` | `0` | PB-04 e respawn byte-idênticos |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot build` | `0` | build de produção |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot test` | `0` | agregado do workspace verde |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot verify` | `124` | timeout em 244 s; QA browser não fechou |

**Bloqueio reproduzido:** com build fresco, `asset-pack.spec.ts` passou; `boot-budget.spec.ts`
falhou com `actionableMs = 5235.6` (`<= 5000`); `hunt-budget.spec.ts` falhou com
`actionableMs = 4895.2`, mas `longTasksOverBudget = 147` (`< 2`). O problema é
pré-existente e fora do escopo: PB-05-05 já registrava `hunt-budget` vermelho,
e esta task não altera `apps/game`, Playwright ou performance. Não aplicar retry,
skip, timeout aumentado ou ajuste de golden.

**Próxima ação:** resolver o gate browser de baseline, rerodar `verify` na
worktree, então fazer `merge --ff-only` para `main`, verificar novamente e só
depois liberar PB-05-07. Não iniciar a próxima task.

## Próxima task elegível

PB-05-06 permanece pendente de integração por causa do bloqueio acima. PB-05-07
só fica elegível após o fast-forward e o `verify` verde.

## Verificações executadas

PB-05-05, worktree `C:\Kaezan\kaezan-huntbound-pb05-05-hunter`, 2026-08-16.
Base da branch = `188a61a` (`main` / PB-05-04).

Journals byte-idênticos (`git diff --stat` vazio nos três `events.golden.jsonl`):

| Fixture | events SHA-256 (inalterado) |
|---|---|
| pb03 | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |
| pb04 | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| pb04-respawn | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Dois wanderers, 9 ticks, sem `hunter`: 4 movimentos (nw, se, s, sw) e
`ai.drawCount` `4`. Hunter sozinho sem alvo: stream `ai` idêntico ao wanderer
na mesma célula. Varredura de restauração (16 fronteiras) com perseguição, troca
de alvo e golpe por IA: journal e snapshot final idênticos.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (388 files) |
| `corepack pnpm --filter @huntbound/simulation test` | `0` (203 testes; 183 pré-existentes + 20 em `hunter.test.ts`) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm simulation:check` | `0` |
| `corepack pnpm hunt:check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` / `hunt-budget.spec.ts` |

`verify` passou `format:check`, `assets:check`, `simulation:check`, `hunt:check`,
`architecture:check`, `typecheck`, `test`, `build` e `content:check`. Falhou em
`tests/e2e/hunt-budget.spec.ts`: `actionableMs` `4328.7` (teto `5000` ok),
`overBudget.length` `2` (teto `< 2`), tarefas `71,55` ms. Os outros 28 specs e2e
passaram. Sem retry mascarado. Esta task não toca `apps/game`; é B5 reproduzido.

PB-05-04, worktree `C:\Kaezan\kaezan-huntbound-pb05-04-kernel`, 2026-08-16.
Base da branch = `93b8517` (`grok/pb-05-03-combat-contracts`). Snapshot via
`HUNTBOUND_CANARY_SOURCE` apontando para
`C:\Kaezan\kaezan-huntbound\references\canary`.

Journals byte-idênticos (`git diff --stat` vazio nos três `events.golden.jsonl`):

| Fixture | events SHA-256 (inalterado) |
|---|---|
| pb03 | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |
| pb04 | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| pb04-respawn | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Hashes novos gerados dos arquivos reais (`Get-FileHash -Algorithm SHA256` e
confirmados por `simulation:check` / `hunt:check`):

**pb03** (`schemaVersion` 4, `rulesVersion` 3)

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `36a2aa01ceeed45368de6279fa89dc71b8e27a641b9325f9a2780026422943b5` |
| `commands.jsonl` | `4edbda41497dc4e21e117061bc7e67819973037df2f50447589aa2105bf29a12` |
| `snapshot.golden.json` | `9621f9e02bc5df1d156d9cddced3dfe4d1a78669f1ddf1cbf3794e7359196be0` |

**pb04**

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `2d56f2848eec061821d48e19bd23bf6bfdec3b00aa0a10007eb1fd04aa88b758` |
| `commands.jsonl` | `d18c520a5d90614f30ceb4c8989de67578c736e3a2d59516f0b04dc92d9e3636` |
| `snapshot.golden.json` | `56f68258d004c869c47a4f46e84c8a9f7289da9d0dffb7f133cae9c6fac42bca` |

**pb04-respawn** — mesmo cenário; commands `14df54ca…00abf5`; snapshot
`93cbf723…e28bf`.

Vetores RNG seed `0f1e2d3c4b5a6978`: `ai`/`movement`/`scenario`/`spawn` idênticos
aos golden de PB-03-02. Novos:

```text
combat: e66fd11d 3b856526 99ce4fa0 9df4f5bc c7d62962 92ff8526 819a261f 1538ef49
loot:   26036bf2 c88e45ba 04a57152 0645c023 785f789f 9ce1127a 5b7213ef 937f21c9
```

`hunt.json` regenerado só nos blueprints combat-neutral
(`a11941b2640286f95fe279dd6b451388ff592223c8dee598b17f08dfb15e8eb6`).
`region`/`transitions`/`spawns` inalterados. Não é composição de combate
(PB-05-07); é o mínimo para `HuntDefinition` validar ActorBlueprint v4.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (387 files) |
| `corepack pnpm --filter @huntbound/contracts test` | `0` (148 testes) |
| `corepack pnpm --filter @huntbound/simulation test` | `0` (183 testes) |
| `corepack pnpm exec vitest run --config tools/replay/vitest.config.ts` | `0` (47 testes) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm simulation:check` (1ª) | `0` |
| `corepack pnpm simulation:check` (2ª) | `0` |
| `corepack pnpm hunt:check` (1ª) | `0` |
| `corepack pnpm hunt:check` (2ª) | `0` |
| `corepack pnpm verify` (1ª) | `0` (29 e2e; hunt-budget `overBudget.length` `1`) |
| `corepack pnpm verify` (2ª) | `0` (29 e2e; hunt-budget `overBudget.length` `1`) |

`git status --porcelain` idêntico entre as duas execuções de `verify`. B5 não
reproduziu nesta sessão; permanece historicamente aberto e não foi mascarado.

PB-05-03, worktree `C:\Kaezan\kaezan-huntbound-pb05-03-contracts`, 2026-08-16.
Base `main` = `3482381`.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (385 files) |
| `corepack pnpm --filter @huntbound/contracts test` | `0` (148 testes; 119 pré-existentes + 29 novos em `combatV4.test.ts`) |
| `corepack pnpm --filter @huntbound/contracts typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `git diff --check` | `0` |
| `corepack pnpm typecheck` (workspace) | `1` em `@huntbound/content` (faltam `abilities`/`lootTables` e campos de combate no blueprint) |
| `corepack pnpm --filter @huntbound/simulation typecheck` | `1` (`ActorState` incompleto, `PendingIntentState` sem `kind`) |

`simulation:check`, `hunt:check` e `verify` **não** foram executados como gate
de aceite: o kernel ainda fala v3. A vermelhidão do `typecheck` agregado é a
mesma composição — declarada, não mascarada. `packages/simulation` não teve
nenhum arquivo alterado.

PB-05-02, worktree `C:\Kaezan\kaezan-huntbound-pb05-02-import`, 2026-08-16.
Snapshot via `HUNTBOUND_CANARY_SOURCE` apontando para
`C:\Kaezan\kaezan-huntbound\references\canary` (não commitado). O CLI de catálogo
passa a honrar essa variável; worktree irmã não copia `references/`.

Hash do bundle **antes:** `d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`  
Hash do bundle **depois:** `b0b0a0b7a079ab12d89b323bce56f9c8e6d675dfd50967915c83c8ac8c77c770`  
(SHA-256 do arquivo real; conferido com `Get-FileHash -Algorithm SHA256`.)

`content:check` duas vezes seguidas, exit `0`, `git status --porcelain` idêntico entre
elas. `import-canary --check` exit `0` (reimport byte-idêntico à operation versionada).
Sidecars da hunt inalterados.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (384 files) |
| `corepack pnpm --filter @huntbound/contracts test` | `0` (119 testes) |
| `corepack pnpm --filter @huntbound/content test` | `0` (65 testes) |
| `corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts` | `0` (53 testes) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm content:check` (1ª) | `0` |
| `corepack pnpm content:check` (2ª) | `0` |
| `node tools/content-catalog/cli.ts import-canary --check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` |

`verify` passou `format:check`, `assets:check`, `simulation:check`, `hunt:check`,
`architecture:check`, `typecheck`, `test`, `build` e `content:check`. Falhou em
`qa:browser` (2 specs):

1. `tests/e2e/hunt-budget.spec.ts` — B5. `actionableMs` `4246.8` (teto `5000` ok),
   `overBudget.length` `2` (teto `< 2`), tarefas `68,61` ms. Sem retry mascarado.
2. `tests/e2e/hunt-mobile.spec.ts` — timeout de 15s em
   `#shell-root[data-assets-ready="true"]` no teste de câmera. Os três testes
   anteriores do mesmo arquivo passaram o mesmo `waitForHunt`. Esta task não toca
   `apps/game` nem assets. Não reexecutado para pescar verde.

Os outros 27 specs e2e passaram. Goldens de PB-03 e PB-04 byte-idênticos.

Pós-integração em `C:\Kaezan\kaezan-huntbound` (`main` = `f1e8dab`), 2026-08-16:

| Comando | Exit |
|---|---:|
| `git merge --ff-only grok/pb-05-02-import-spells-character` | `0` (`624dac7..f1e8dab`) |
| `corepack pnpm verify` (1ª, cache SQLite de 2026-08-13) | `1` em `content:check`: `FOREIGN KEY constraint failed` ao aplicar `002_spell_formulas_and_characters.sql` |
| `corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts` | `0` (54 testes, incluindo rebuild com child rows) |
| `corepack pnpm content:check` (após o fix do runner, mesmo cache) | `0` |
| `corepack pnpm exec biome check .` | `0` (384 files) |

Causa: `PRAGMA foreign_keys` é no-op dentro de transação; o cache da `main` já tinha a 001
com linhas em `spell_vocation_families`. A worktree criou cache vazio e não reproduziu.
Correção: desligar foreign keys **ao redor** da transação em `MigrationRunner`. Sem retry
mascarado no `verify` vermelho.

PB-05-01, worktree `C:\Kaezan\kaezan-huntbound-pb05-01-selection`, 2026-08-16. Snapshot via
`HUNTBOUND_CANARY_SOURCE` apontando para `C:\Kaezan\kaezan-huntbound\references\canary` (não
commitado).

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (384 files) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm test` | `0` na segunda execução; a primeira falhou por timeout de 5s em `ContentCatalogApplication.test.ts` (teste pré-existente, 5269 ms) |
| `corepack pnpm content:check` | `0`; sidecars da hunt inalterados |
| `corepack pnpm exec vitest run --config tools/hunt-selection/vitest.config.ts` | `0` (24 testes, freeze revisado) |
| `node ... cli.ts check-combat --selection packages/content/src/selections/pb-05-knight-combat.json --source-root-env HUNTBOUND_CANARY_SOURCE` | `0` |
| `git diff --check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` |
| `corepack pnpm qa:browser` (reexecução) | `1` em `hunt-budget.spec.ts` |

Saída do verificador de IDs (exit `0`):

```text
{"command":"check-combat","ok":true,"presentIds":["vocation:4","spell:80","spell:61","spell:123","item:3264","effect:CONST_ME_DRAWBLOOD","effect:CONST_ME_HITAREA","effect:CONST_ME_MAGIC_BLUE","effect:CONST_ANI_WEAPONTYPE","item:5967","item:2889","creature:rotworm"],"diagnostics":[]}
```

Freeze revisado nesta sessão (spells irrestritas, ficha level `8`): `biome check .` exit `0`
(384 files); `vitest` hunt-selection exit `0` (24 testes); `pb05:selection:check` exit `0` no
mesmo snapshot. `typecheck`/`test`/`content:check`/`verify` não foram reexecutados nesta
revisão — `verify` continua B5.

Pós-integração em `C:\Kaezan\kaezan-huntbound` (`main` = `2933012`), 2026-08-16:

| Comando | Exit |
|---|---:|
| `git merge --ff-only grok/pb-05-01-vocation-spell-selection` | `0` (`2f455d5..2933012`) |
| `corepack pnpm exec biome check .` | `0` (384 files) |
| `corepack pnpm verify` | `1` em `qa:browser` / `hunt-budget.spec.ts` |

`verify` passou `format:check`, `assets:check`, `simulation:check`, `hunt:check`,
`architecture:check`, `typecheck`, `test`, `build` e `content:check`. Falhou em
`tests/e2e/hunt-budget.spec.ts`: `actionableMs` `4467` (teto `5000` ok),
`overBudget.length` `8` (teto `< 2`), tarefas `122,54,83,64,92,54,56,58` ms. Os outros
28 specs e2e passaram. Sem retry mascarado.

Fatos de baseline da autoria (commit `420b6fb`, 2026-08-15) permanecem válidos e não foram
remeados aqui.

## Decisões fechadas em PB-05-05

| Decisão | Onde está documentada |
|---|---|
| `hunter` em S6: manutenção, aquisição Chebyshev no mesmo andar com empate por menor `EntityId`, passo guloso, golpe adjacente, fallback `wander` | `KERNEL_CONTRACT.md`, seção Sistemas / S6 |
| Aquisição e perseguição não consomem o stream `ai`; sem alvo consome um `nextBelow(8)` | `KERNEL_CONTRACT.md`; `hunter.test.ts` |
| Alvo morto é limpo mesmo com o hunter em cooldown, porque o snapshot recusa `targetEntityId` de ator morto | `KERNEL_CONTRACT.md`; schema v4 já exigia alvo vivo |
| `greedyStepDirection` mapeia o sinal de `dx`/`dy` na ordem canônica | `packages/simulation/src/grid/directions.ts` |

## Decisões fechadas em PB-05-04

| Decisão | Onde está documentada |
|---|---|
| Sete fases implementadas: S3 upkeep, S4 combat, S5 death (sem loot), S6 wander, S7 spawn | `KERNEL_CONTRACT.md`, seção Fases |
| `CommandBuffer` cobre as quatro ações concorrentes | `commandBuffer.ts`; `isConcurrentActorAction` |
| Streams serializados: `ai`, `combat`, `loot`, `movement`, `scenario`, `spawn` | `streams.ts`; `KERNEL_CONTRACT.md` |
| `itemKey` e `spellKey` reprovados na fronteira do kernel | `simulation-boundaries.ts` |
| Blueprints da hunt extraída ficam combat-neutral; composição real é PB-05-07 | `extract.ts`; `hunt.json` hash `a11941b2…15e8eb6` |
| Eventos novos de combate são não-estruturais na apresentação; `actor/died` remove o sprite | `HuntPresentation.ts`; HUD fica para PB-05-10 |

## Decisões fechadas em PB-05-03

| Decisão | Onde está documentada |
|---|---|
| Documento v3 é reprovado; `schemaVersion: 3` num documento v4 produz `SIM_VERSION_MISMATCH` | `KERNEL_CONTRACT.md`; `combatV4.test.ts` |
| `health > maxHealth` e `abilityCooldowns` com índice fora do blueprint **não** cabem no schema isolado do snapshot (o snapshot não carrega blueprints). Seguem o padrão de `transitionGuard`: checagem em `restoreSimulationKernel`, PB-05-04 | `KERNEL_CONTRACT.md`, seção Snapshot |
| Entrada de loot do kernel não se chama `LootEntryDefinition` no export público: esse nome já pertence ao catálogo (`itemKey`). O kernel usa o shape inline em `LootTableDefinition.entries` (`itemIndex`) | `packages/contracts/src/simulation/types.ts` |
| `isConcurrentActorAction` publica as quatro ações da duplicata de borda; o `CommandBuffer` ainda só cobre `move-step`/`wait` até PB-05-04 | `KERNEL_CONTRACT.md`; `schemas.ts` |
| Fases S3–S7 eram contrato pretendido em PB-05-03; implementadas em PB-05-04 | `KERNEL_CONTRACT.md`, seção Fases |

## Decisões descobertas durante a autoria

| Decisão | Onde está documentada |
|---|---|
| Fórmula float é resolvida no conteúdo; o kernel só recebe `min`/`max` inteiros | spec, "Direção escolhida" §1 |
| `itemKey` e `spellKey` entram na proibição executável do kernel | spec, §2 |
| A região **não** é reextraída; o combate é composto em `buildHuntScenario` | spec, §3 |
| Autoloot sem comando de coleta; bolsa é projeção de eventos fora do kernel | spec, §4 |
| Corpo e sangue são apresentação pura, sem estado no kernel | spec, §4 |
| Fuga em vida baixa fica fora por ausência de fonte no importer | spec, §5 |
| `spell.level` é provenance; kit irrestrito desde o início da run | spec, §6; `PB-05-SELECTION.md` |
| Mitigação zero porque todas as resistências do Rotworm são `0` | spec, "Parâmetros congelados" |
| Sete sistemas por tick, com `upkeep` antes de `combat` e morte antes de `ai` | spec, "Fases do tick" |

## Decisões fechadas em PB-05-01

| Decisão | Onde está documentada |
|---|---|
| Spells irrestritas; ficha no level `8` da hunt; HP `185` Canary; mana loadout `185` | `docs/content/PB-05-SELECTION.md` |
| Skills nos defaults do snapshot (`sword 10`, `magic 0`), não treino inventado | idem |
| Arma `item:tibia:sword` `3264` `attack 14` | idem |
| Ritmo de passo fiel `player 11` / `rotworm 21`, não os `10`/`20` jogáveis de PB-04-FIX-01 | idem |
| `exura ico` usa `CALLBACK_PARAM_LEVELMAGICVALUE`; schema fica para PB-05-02/03 | idem |
| `exori ico` usa `skill * attack`, forma fora da allowlist `skillAttack`; schema em PB-05-02 | idem |

## Decisões fechadas em PB-05-02

| Decisão | Onde está documentada |
|---|---|
| Brutal Strike não cabe em `skillAttack`; kind novo `skillAttackProduct` (`skill * attack` + addends) | `docs/content/CANARY_LUA_MAPPING.md`; schema em `packages/contracts/src/content/schemas.ts` |
| Wound Cleansing não cabe em `skillAttack`; kind novo `levelMagic` (`level` + `magicLevel`, cura positiva) | idem |
| Ficha é conteúdo Huntbound (`character:huntbound:…`), não entidade Tibia | `CANARY_LUA_MAPPING.md`; `CharacterDefinitionSchema` |
| `setArea` é opcional; spells sem área omitem o campo | parser + schema |
| Forma de fórmula não reconhecida → `lua.invalid-formula`, nunca aceitação silenciosa | `parseSpellLua.ts` + testes |
| `PRAGMA foreign_keys` no-op dentro de transação; o runner desliga FK ao redor do apply | `tools/content-catalog/migrations/MigrationRunner.ts` |

## Modelo e effort

- **Executor PB-05-05:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-05-hunter-ai`; a branch
  efetiva é `grok/pb-05-05-hunter-ai` porque o executor é Grok. Worktree irmã
  no path pedido.

- **Executor PB-05-04:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-04-kernel-combat` a partir
  de `claude/pb-05-03-combat-contracts`; a branch efetiva é
  `grok/pb-05-04-kernel-combat` a partir de `grok/pb-05-03-combat-contracts`
  porque o executor é Grok e as tasks 01–03 usaram o mesmo prefixo.

- **Executor PB-05-03:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `claude/pb-05-03-combat-contracts`; a
  branch efetiva é `grok/pb-05-03-combat-contracts` porque o executor é Grok.
  Worktree irmã no path pedido. Integração em `main` pertence a PB-05-04.

PB-05-02 (histórico):

- **Executor PB-05-02:** Grok 4.6 no Cursor, effort alto.
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`, `hunt-content-pipeline`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-02-import-spells-character`; a branch
  efetiva é `grok/pb-05-02-import-spells-character` porque o executor é Grok. Worktree irmã
  no path pedido.

PB-05-01 (histórico):

- **Executor:** Grok 4.6 no Cursor, effort alto.
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`, `test-driven-development`,
  `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `claude/pb-05-01-vocation-spell-selection`; a branch
  efetiva é `grok/pb-05-01-vocation-spell-selection` porque o executor é Grok. Worktree irmã no
  path pedido. `tools/hunt-selection` entrou no script `test` da raiz para os testes novos rodarem
  em `verify`.

## Bloqueios

- ~~**B3 (bloqueante, externo ao PB-05):** PB-04 aberto.~~ **Resolvido em 2026-08-16** pela
  reavaliação PB-04-10: veredito `APPROVED_WITH_WARNINGS` sobre `9f1c14c`, registro `d8253dc`.
  Warnings remanescentes do PB-04 (W9, W12, W17, W8, B2) não bloqueiam combate; B2 é pré-requisito
  de PB-07.

- ~~**B4 (bloqueante, pré-requisito de instrução):** `AGENTS.md` vivia só em
  `claude/agent-instructions-shared`.~~ **Resolvido em 2026-08-16** pelo merge `5aeb8bb`. Fast-forward
  era impossível (a branch tinha divergido); o merge commit integrou `AGENTS.md`, `CLAUDE.md`,
  `.cursor/rules`, `.cursor/skills` e o motor de hooks. `docs/08_POLITICA_MODELOS_AGENTES.md` com
  Grok 4.6 está em `main`.

- **B5 (historicamente aberto; reproduziu em PB-05-05):** `qa:browser` /
  hunt-budget já foi vermelho em PB-05-01 (`overBudget.length` `8`) e PB-05-02
  (`2`). Em PB-05-04 passou com `1`. Em PB-05-05 falhou com `overBudget.length`
  `2` (teto `< 2`), tarefas `71,55` ms, `actionableMs` `4328.7`. Sem retry
  mascarado. Esta task não toca `apps/game` nem o renderer; o kernel `hunter`
  não entra na hunt jogável até PB-05-07. Não se declara B5 fechado.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
