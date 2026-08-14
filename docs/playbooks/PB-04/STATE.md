# PB-04 — Estado operacional

**Playbook:** `docs/playbooks/PB-04/README.md`

**Estado geral:** em andamento — PB-04-01 concluída. PB-03 foi fechado em `7097b67` como
`APPROVED_WITH_WARNINGS` pela auditoria integrada PB-03-08, sobre o commit auditado `f885535`, sem
blockers e sem task corretiva.

**Última atualização:** 2026-08-14

**Próxima task elegível:** PB-04-02.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-04-01 | done | `codex/pb04-01-hunt-selection` | `e6e3119` | `docs/content/PB-04-SELECTION.md` + CLI exit 0 no snapshot local |
| PB-04-02 | pending | `codex/pb04-02-world-contracts` | — | — |
| PB-04-03 | pending | `codex/pb04-03-tile-flags` | — | — |
| PB-04-04 | pending | `codex/pb04-04-map-extractor` | — | — |
| PB-04-05 | pending | `codex/pb04-05-kernel-floors-spawn` | — | — |
| PB-04-06 | pending | `codex/pb04-06-hunt-replay` | — | — |
| PB-04-07 | pending | `codex/pb04-07-hunt-assets` | — | — |
| PB-04-08 | pending | `codex/pb04-08-hunt-scene` | — | — |
| PB-04-09 | pending | `codex/pb04-09-hunt-browser-qa` | — | — |
| PB-04-10 | pending | `codex/pb04-10-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Spec aprovada: `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-01 `closed`; PB-02 `closed` em `1134fc8`; PB-03 `closed` em `7097b67`.
- Hunt: `hunt:tibia:venore-rotworm-cave`.
- `SIMULATION_SCHEMA_VERSION` sobe de `2` para `3`; `SIMULATION_RULES_VERSION` sobe de `1` para `2`.
- Streams RNG passam a ser `movement`, `ai`, `scenario` e `spawn`.
- Fixture da sessão: `pb-04-hunt-session`, seed `1a2b3c4d5e6f7a8b`, `600` ticks, retomada em `313`.
- Golden do PB-03 a preservar: `events.golden.jsonl`
  `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`.
- Dependências externas previstas: **nenhuma**.

## Fatos medidos no snapshot local em 2026-08-14

Registrados para que PB-04-01 comece de evidência e não de suposição:

- `references/canary/data-canary/world/canary.otbm`: OTBM v2, 40000×40000, item major `3` / minor
  `62`, salvo com Remere's Map Editor 3.8.0.
- `references/canary/config.lua.dist` declara `mapName = "otservbr"`, isto é, o OTBM acima e
  `data-otservbr-global/world/otservbr-monster.xml` são o mesmo par.
- `otservbr-monster.xml` declara 1134 grupos de spawn de Rotworm, 1575 rotworms no total.
- Na janela `x ∈ (32800, 33150)`, `y ∈ (31950, 32300)`: 72 grupos e 95 rotworms, sendo 48 em `z = 8`
  e 47 em `z = 9`.
- `references/canary/data/items/appearances.dat` existe (4 862 287 bytes) e `items.otb` **não**
  existe no snapshot; as flags de tile vêm do protobuf.
- `references/canary/data/items/items.xml` declara 345 ocorrências do atributo `floorchange`.

## Decisões operacionais

- Tasks 01, 02, 07, 08 e 09 usam GPT-5.6 Luna `xhigh` por padrão.
- Tasks 03, 04, 05 e 06 usam GPT-5.6 Sol `xhigh` por atravessarem formato binário, schema congelado
  ou golden.
- PB-04-10 usa Claude Opus 5, com fallback GPT-5.6 Sol `xhigh`, e prefere validador diferente do
  implementador.
- Fluxo padrão é serial com fast-forward automático e limpeza.
- PB-04-03 e PB-04-05 só entram em paralelo por ativação explícita do supervisor; PB-04-06 é o
  integrador único desse par. PB-04-07 pode paralelizar com 05/06 e é integrada por PB-04-08.
- Golden divergente nunca é reescrito para "fazer passar". Regeneração exige causa identificada e,
  quando a semântica mudar, bump explícito de `SIMULATION_RULES_VERSION`.
- Qualquer uso de relógio, aleatoriedade global ou float no kernel é falha bloqueante.
- Qualquer vazamento de identidade Tibia (`serverId`, `clientId`, `lookType`, `huntId`, `regionId`)
  para `packages/simulation` é falha bloqueante.

## Handoffs

PB-04-01 acrescenta a seleção congelada, o validador e o relatório abaixo. A próxima task elegível
é PB-04-02; PB-04-04 continua responsável por confirmar ou corrigir `expectedDroppedTransitions`.

## PB-04-01 — handoff concluído

- **Status:** done; conclusão serial em worktree isolada, pronta para integração fast-forward.
- **Commit da feature:** `e6e3119` (`docs: freeze the first hunt selection`).
- **Artefatos:** `packages/content/src/selections/pb-04-venore-rotworm-cave.json`,
  `tools/hunt-selection/**` e `docs/content/PB-04-SELECTION.md`.
- **Seleção medida:** `x=33002..33030`, `y=31995..32027`, largura `29`, altura `33`, andares
  `[8,9]`, `8` grupos e `12` slots de Rotworm; `4` slots em `z=8`, `8` em `z=9`, zero espécies
  estranhas e `expectedDroppedTransitions=0` por delegação ao PB-04-04.
- **Comandos e exit codes:** baseline `corepack pnpm verify` `0`; RED inicial do validador `1`
  por módulo ausente; GREEN `corepack pnpm exec vitest run --config tools/hunt-selection/vitest.config.ts tools/hunt-selection` `0` com `12/12` testes; `biome check tools/hunt-selection packages/content` `0`; `format:check` `0`; typecheck local `tools/hunt-selection/tsconfig.json` `0`; CLI real e `corepack pnpm hunt:selection:check` `0`; verify completo `0` com `9/9` testes browser.
- **Snapshot e política:** `references/` foi apenas lido; nenhum byte foi copiado. O script
  `hunt:selection:check` ficou fora de `check` e `verify` porque requer
  `HUNTBOUND_CANARY_SOURCE`.
- **Modelo/effort efetivos:** Codex/GPT-5 nesta sessão; effort efetivo não é exposto pela
  interface. Modelo sugerido pelo roteiro: GPT-5.6 Luna `xhigh`.
- **Skills e validador:** `using-superpowers`, `brainstorming`, `writing-plans`,
  `using-git-worktrees`, `executing-plans`, `test-driven-development` e
  `verification-before-completion`; validação por Vitest focado, Biome, TypeScript, CLI real e
  `corepack pnpm verify`.

## Bloqueios

- Nenhum bloqueio de execução. PB-04-01 é elegível.
- Warning W3 herdado da auditoria PB-03-08, não bloqueante: o script `test` da raiz enumera apenas
  `asset-boundaries.test.ts` e `check-boundaries.test.ts` em `node --test`, então
  `simulation-boundaries.test.ts` e `content-boundaries.test.ts` não rodam no gate agregado. PB-04-05
  altera `simulation-boundaries.ts` e **deve** corrigir o enumerador na mesma task, porque a regra
  nova de identidade Tibia precisa entrar em gate agregado. Isso fecha W3 como efeito colateral
  legítimo, e não como ampliação silenciosa de escopo.
- Warnings W1, W2, W4, W5 e W6 da auditoria PB-03-08 seguem abertos e não bloqueantes; estão em
  `docs/playbooks/PB-03/artifacts/acceptance-report.md` §10 e não devem ser absorvidos por uma task
  do PB-04 sem card próprio.
- Os warnings `FIXABLE` herdados de PB-02 estão em
  `docs/playbooks/PB-02/artifacts/acceptance-report.md` §11; não bloqueiam PB-04 e não devem ser
  absorvidos sem card próprio.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
