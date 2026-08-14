# PB-04 — Estado operacional

**Playbook:** `docs/playbooks/PB-04/README.md`

**Estado geral:** ready — nenhuma task iniciada. PB-03 foi fechado em `7097b67` como
`APPROVED_WITH_WARNINGS` pela auditoria integrada PB-03-08, sobre o commit auditado `f885535`, sem
blockers e sem task corretiva.

**Última atualização:** 2026-08-14

**Próxima task elegível:** PB-04-01.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-04-01 | pending | `codex/pb04-01-hunt-selection` | — | — |
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

Nenhum. Cada task acrescenta aqui sua seção `## PB-04-NN — handoff concluído` ao encerrar.

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
