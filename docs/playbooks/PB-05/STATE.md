# PB-05 — Estado operacional

**Playbook:** `docs/playbooks/PB-05/README.md`

**Estado geral:** execução em andamento. **PB-05-03 concluída na branch
`grok/pb-05-03-combat-contracts`, não integrada em `main`.** Um `main` com contrato
v4 e kernel v3 fica vermelho no gate agregado. A integração das duas branches
pertence a PB-05-04. B5 continua aberto e não foi mascarado.

**Última atualização:** 2026-08-16

**Atualização vigente:** `@huntbound/contracts` publica `KernelScenario` v4
(`SIMULATION_SCHEMA_VERSION` 4, `SIMULATION_RULES_VERSION` 3) com abilities,
lootTables, blueprint de combate, `ActorState` estendido, intents discriminadas,
comandos `actor/attack` e `actor/cast-ability`, eventos de combate/loot e os
oito diagnósticos novos. Nenhuma linha de `packages/simulation` foi tocada.

**Próxima etapa:** PB-05-04. Implementar combate no kernel sobre esta branch e
integrar o conjunto em `main`.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-05-01 | done | `grok/pb-05-01-vocation-spell-selection` | `2933012` (ff `2f455d5..2933012`) | `docs/content/PB-05-SELECTION.md` + CLI `check-combat` exit 0; `verify` pós-ff ainda vermelho em hunt-budget (B5) |
| PB-05-02 | done | `grok/pb-05-02-import-spells-character` | `f1e8dab` (ff `624dac7..f1e8dab`) | bundle com 3 spells + ficha; hash `b0b0a0b7…c77c770`; `content:check` 0×2 |
| PB-05-03 | done (branch preservada) | `grok/pb-05-03-combat-contracts` | `6cec836` (não em `main`) | `packages/contracts/src/simulation/**` v4 + `KERNEL_CONTRACT.md`; 148 testes de contracts |
| PB-05-04 | pending | `<agente>/pb05-04-kernel-combat` | — | kernel v4; journals golden de PB-03 e PB-04 byte-idênticos; **integra esta branch + a de 04** |
| PB-05-05 | pending | `<agente>/pb05-05-hunter-ai` | — | comportamento `hunter` com varredura de retomada verde |
| PB-05-06 | pending | `<agente>/pb05-06-loot-autoloot` | — | `loot/granted` determinístico + projeção da bolsa fora do kernel |
| PB-05-07 | pending | `<agente>/pb05-07-content-to-combat` | — | `buildHuntScenario` com combate; quatro artefatos da hunt inalterados |
| PB-05-08 | pending | `<agente>/pb05-08-combat-fixture` | — | `packages/test-fixtures/hunt/pb05/**` + `combat:check` + registro no contrato de replay |
| PB-05-09 | pending | `<agente>/pb05-09-combat-assets` | — | pack com efeitos, corpo e sangue; `assets:check` exit 0 |
| PB-05-10 | pending | `<agente>/pb05-10-combat-hud` | — | HUD, input, números de dano, autoloot e overlay de morte |
| PB-05-11 | pending | `<agente>/pb05-11-combat-browser-qa` | — | `artifacts/browser-qa.md` + 4 screenshots + specs estáveis sem `retries` |
| PB-05-12 | pending | `<agente>/pb05-12-integrated-gate` | — | `artifacts/acceptance-report.md` |

## Última task concluída

PB-05-03. Branch `grok/pb-05-03-combat-contracts` **preservada** em `6cec836`.
Worktree irmã `C:\Kaezan\kaezan-huntbound-pb05-03-contracts` removida após o
commit. **Não** houve fast-forward para `main`: o corte 03/04 deixa o gate
agregado vermelho por composição (contrato v4, kernel v3), não por defeito
mascarado.

## Próxima task elegível

PB-05-04. Kernel de combate. Deve partir desta branch (ou integrá-la em
sequência) e só então fast-forward `main` com o conjunto. B5 não bloqueia.

## Verificações executadas

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

## Decisões fechadas em PB-05-03

| Decisão | Onde está documentada |
|---|---|
| Documento v3 é reprovado; `schemaVersion: 3` num documento v4 produz `SIM_VERSION_MISMATCH` | `KERNEL_CONTRACT.md`; `combatV4.test.ts` |
| `health > maxHealth` e `abilityCooldowns` com índice fora do blueprint **não** cabem no schema isolado do snapshot (o snapshot não carrega blueprints). Seguem o padrão de `transitionGuard`: checagem em `restoreSimulationKernel`, PB-05-04 | `KERNEL_CONTRACT.md`, seção Snapshot |
| Entrada de loot do kernel não se chama `LootEntryDefinition` no export público: esse nome já pertence ao catálogo (`itemKey`). O kernel usa o shape inline em `LootTableDefinition.entries` (`itemIndex`) | `packages/contracts/src/simulation/types.ts` |
| `isConcurrentActorAction` publica as quatro ações da duplicata de borda; o `CommandBuffer` ainda só cobre `move-step`/`wait` até PB-05-04 | `KERNEL_CONTRACT.md`; `schemas.ts` |
| Fases S3–S7 são contrato pretendido, não comportamento do kernel atual | `KERNEL_CONTRACT.md`, seção Fases |

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

- **Executor PB-05-03:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `claude/pb-05-03-combat-contracts`; a
  branch efetiva é `grok/pb-05-03-combat-contracts` porque o executor é Grok.
  Worktree irmã no path pedido. Integração **não** feita; pertence a PB-05-04.

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

- **B5 (aberto, não bloqueia PB-05-04):** `corepack pnpm verify` vermelho em `qa:browser`.
  Esta task não toca `apps/game` nem assets. Na worktree de PB-05-02: hunt-budget
  `overBudget.length` `2` contra teto `< 2` (`actionableMs` `4246.8` ok); hunt-mobile
  (câmera) timeout de boot após três testes do mesmo arquivo terem passado. Sem retry
  mascarado, sem timeout inflado, sem asserção enfraquecida. Histórico pós-ff de
  PB-05-01 em `main`: hunt-budget `overBudget.length` `8`. Worktree e branch de
  PB-05-01 preservadas até este gate ficar verde.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
