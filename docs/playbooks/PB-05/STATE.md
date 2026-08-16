# PB-05 — Estado operacional

**Playbook:** `docs/playbooks/PB-05/README.md`

**Estado geral:** execução iniciada. **PB-05-01 integrada em `main`** por `git merge --ff-only`
(`2f455d5..2933012`). `verify` pós-integração ficou vermelho em
`tests/e2e/hunt-budget.spec.ts` (B5, orçamento ADR-001 pré-existente; a seleção não toca
`apps/game`). Worktree e branch preservadas até B5 fechar. B3 e B4 continuam resolvidos.

**Última atualização:** 2026-08-16

**Atualização vigente:** freeze na `main` em `2933012` — spells irrestritas, ficha no level `8`
da hunt, HP Canary `185`, mana loadout `185`. Fast-forward feito a pedido; `verify` integrado
ainda vermelho em hunt-budget.

**Próxima etapa:** PB-05-02 está elegível (a seleção congelada já está em `main`). B5 não
bloqueia import de conteúdo. Não iniciar PB-05-02 neste chat.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-05-01 | done | `grok/pb-05-01-vocation-spell-selection` | `2933012` (ff `2f455d5..2933012`) | `docs/content/PB-05-SELECTION.md` + CLI `check-combat` exit 0; `verify` pós-ff ainda vermelho em hunt-budget (B5) |
| PB-05-02 | pending | `<agente>/pb05-02-import-spells-character` | — | bundle regenerado com três spells + ficha congelada; `content:check` exit 0 |
| PB-05-03 | pending | `<agente>/pb05-03-combat-contracts` | — | `packages/contracts/src/simulation/**` v4 + `KERNEL_CONTRACT.md` |
| PB-05-04 | pending | `<agente>/pb05-04-kernel-combat` | — | kernel v4; journals golden de PB-03 e PB-04 byte-idênticos |
| PB-05-05 | pending | `<agente>/pb05-05-hunter-ai` | — | comportamento `hunter` com varredura de retomada verde |
| PB-05-06 | pending | `<agente>/pb05-06-loot-autoloot` | — | `loot/granted` determinístico + projeção da bolsa fora do kernel |
| PB-05-07 | pending | `<agente>/pb05-07-content-to-combat` | — | `buildHuntScenario` com combate; quatro artefatos da hunt inalterados |
| PB-05-08 | pending | `<agente>/pb05-08-combat-fixture` | — | `packages/test-fixtures/hunt/pb05/**` + `combat:check` + registro no contrato de replay |
| PB-05-09 | pending | `<agente>/pb05-09-combat-assets` | — | pack com efeitos, corpo e sangue; `assets:check` exit 0 |
| PB-05-10 | pending | `<agente>/pb05-10-combat-hud` | — | HUD, input, números de dano, autoloot e overlay de morte |
| PB-05-11 | pending | `<agente>/pb05-11-combat-browser-qa` | — | `artifacts/browser-qa.md` + 4 screenshots + specs estáveis sem `retries` |
| PB-05-12 | pending | `<agente>/pb05-12-integrated-gate` | — | `artifacts/acceptance-report.md` |

## Última task concluída

PB-05-01. Fast-forward em `main` para `2933012`. Worktree
`C:\Kaezan\kaezan-huntbound-pb05-01-selection` e branch
`grok/pb-05-01-vocation-spell-selection` preservadas porque o `verify` pós-integração
ficou vermelho (B5).

## Próxima task elegível

PB-05-02. A seleção congelada está em `main`. B5 é orçamento de browser pré-existente e
não impede o import das spells.

## Verificações executadas

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

## Modelo e effort

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

- **B5 (aberto, não bloqueia PB-05-02):** `corepack pnpm verify` vermelho em `qa:browser` /
  `hunt-budget.spec.ts` depois do ff em `main`. A seleção não toca `apps/game` nem assets.
  Histórico: worktree (actionableMs 5051/5161; depois overBudget.length 2; isolado 14380 ms);
  pós-ff em `main`: actionableMs 4467 ok, `overBudget.length` 8 contra teto `< 2`. Sem retry
  mascarado, sem timeout inflado, sem asserção enfraquecida. Fast-forward feito a pedido.
  Worktree e branch preservadas até este gate ficar verde; aí `git worktree prune` +
  `git branch -d grok/pb-05-01-vocation-spell-selection`.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
