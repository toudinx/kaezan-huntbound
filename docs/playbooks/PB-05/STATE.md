# PB-05 — Estado operacional

**Playbook:** `docs/playbooks/PB-05/README.md`

**Estado geral:** execução iniciada. **PB-05-01 implementada na branch, não integrada.**
`verify` na worktree ficou vermelho em `tests/e2e/hunt-budget.spec.ts` (orçamento de boot/walk
pré-existente, sem mudança em `apps/game`). Worktree e branch preservadas. B3 e B4 continuam
resolvidos.

**Última atualização:** 2026-08-16

**Atualização vigente:** PB-05-01 congelou vocação, três spells, ficha e conversões em
`docs/content/PB-05-SELECTION.md` + `packages/content/src/selections/pb-05-knight-combat.json`.
CLI `pb05:selection:check` saiu `0` no snapshot real. Integração serial adiada até `verify`
verde.

**Próxima etapa:** reexecutar `corepack pnpm verify` nesta worktree quando a máquina estiver
ociosa; se verde, fast-forward em `main`. **Não iniciar PB-05-02** enquanto a integração não
fechar.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-05-01 | blocked | `grok/pb-05-01-vocation-spell-selection` | — (commit na branch, sem ff) | `docs/content/PB-05-SELECTION.md` + CLI `check-combat` exit 0 no snapshot |
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

Nenhuma integrada. PB-05-01 está **blocked** na worktree
`C:\Kaezan\kaezan-huntbound-pb05-01-selection`, branch
`grok/pb-05-01-vocation-spell-selection`.

## Próxima task elegível

Nenhuma. PB-05-02 só fica elegível depois do fast-forward de PB-05-01 em `main`.

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
| `corepack pnpm exec vitest run --config tools/hunt-selection/vitest.config.ts` | `0` (23 testes) |
| `node ... cli.ts check-combat --selection packages/content/src/selections/pb-05-knight-combat.json --source-root-env HUNTBOUND_CANARY_SOURCE` | `0` |
| `git diff --check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` |
| `corepack pnpm qa:browser` (reexecução) | `1` em `hunt-budget.spec.ts` |

Saída do verificador de IDs (exit `0`):

```text
{"command":"check-combat","ok":true,"presentIds":["vocation:4","spell:80","spell:61","spell:123","item:3264","effect:CONST_ME_DRAWBLOOD","effect:CONST_ME_HITAREA","effect:CONST_ME_MAGIC_BLUE","effect:CONST_ANI_WEAPONTYPE","item:5967","item:2889","creature:rotworm"],"diagnostics":[]}
```

Hashes dos arquivos-fonte medidos estão em `docs/content/PB-05-SELECTION.md`. Os de
`vocations.xml`, `berserk.lua`, `rotworm.lua` e `items.xml` coincidem com
`packages/content/src/sources/canary-157e6f9e.json`.

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
| Ficha congelada em level 35 trivializa a hunt; risco aceito, alternativa registrada | spec, §6 |
| Mitigação zero porque todas as resistências do Rotworm são `0` | spec, "Parâmetros congelados" |
| Sete sistemas por tick, com `upkeep` antes de `combat` e morte antes de `ai` | spec, "Fases do tick" |

## Decisões fechadas em PB-05-01

| Decisão | Onde está documentada |
|---|---|
| Ficha permanece level `35` com as três spells; não remover Berserk | `docs/content/PB-05-SELECTION.md` |
| Skills nos defaults do snapshot (`sword 10`, `magic 0`), não treino inventado | idem |
| Arma `item:tibia:sword` `3264` `attack 14` | idem |
| Ritmo de passo fiel `player 11` / `rotworm 21`, não os `10`/`20` jogáveis de PB-04-FIX-01 | idem |
| `exura ico` usa `CALLBACK_PARAM_LEVELMAGICVALUE`; schema fica para PB-05-02/03 | idem |
| `exori ico` usa `skill * attack`, forma fora da allowlist `skillAttack`; schema em PB-05-02 | idem |

## Modelo e effort

- **Executor:** Grok 4.6 no Cursor, effort alto.
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`, `test-driven-development`,
  `verification-before-completion`.
- **Validador:** ainda não; a task não fechou.
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

- **B5 (bloqueante, PB-05-01):** `corepack pnpm verify` vermelho em `qa:browser`. A seleção não
  toca `apps/game` nem assets. Duas execuções consecutivas de `hunt-budget.spec.ts` falharam por
  orçamento ADR-001 (primeira: `actionableMs` 5051 e 5161 contra teto 5000; segunda: `actionableMs`
  4338 ok, mas `overBudget.length === 2` com tarefas de 56 ms e 50 ms). Terceira, isolada, mediu
  `actionableMs` 14380 com a máquina carregada de processos Chrome. Sem retry mascarado, sem
  timeout inflado, sem asserção enfraquecida. Worktree e branch preservadas. Reexecutar `verify`
  com a máquina ociosa; se verde, `git merge --ff-only grok/pb-05-01-vocation-spell-selection`.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
