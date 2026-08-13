# PB-03 — Estado operacional

**Playbook:** `docs/playbooks/PB-03/README.md`

**Estado geral:** ready — PB-02 fechado; nenhuma task de PB-03 iniciada

**Última atualização:** 2026-08-13

**Próxima task elegível:** PB-03-01.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-03-01 | pending | `codex/pb03-01-kernel-contracts` | — | — |
| PB-03-02 | pending | `codex/pb03-02-kernel-random` | — | — |
| PB-03-03 | pending | `codex/pb03-03-kernel-grid` | — | — |
| PB-03-04 | pending | `codex/pb03-04-kernel-commands` | — | — |
| PB-03-05 | pending | `codex/pb03-05-kernel-tick-loop` | — | — |
| PB-03-06 | pending | `codex/pb03-06-kernel-replay` | — | — |
| PB-03-07 | pending | `codex/pb03-07-kernel-browser` | — | — |
| PB-03-08 | pending | `codex/pb03-08-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Spec aprovada: `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-01: `closed`. PB-02: `closed` em `1134fc8` como `APPROVED_WITH_WARNINGS`; fechamento
  documental em `1e33e63`.
- `TICK_DURATION_MS = 50`, `MAX_FRAME_DELTA_MS = 250`.
- `SIMULATION_SCHEMA_VERSION = 1`, `SIMULATION_RULES_VERSION = 1`.
- Cenário do fixture: `pb-03-kernel-coverage`, revisão `1`, grid 16×16 em `z = 7`.
- Seed do fixture: `0f1e2d3c4b5a6978`. Ticks: `200`, retomada em `117`.
- RNG: xoshiro128\*\* com seeding SplitMix32 e derivação FNV-1a 32; streams `movement`, `ai` e
  `scenario`.
- Dependências previstas: nenhuma nova. `@huntbound/simulation` continua sem dependência externa;
  Zod permanece somente em `@huntbound/contracts`.
- Gate raiz conhecido: `corepack pnpm verify`, verde e idempotente após PB-02-FIX-02.

## Decisões operacionais

- Tasks 01–04 e 07 usam GPT-5.6 Luna `xhigh` por padrão; gatilhos de escalonamento seguem a política.
- PB-03-05 e PB-03-06 usam GPT-5.6 Sol `xhigh` por atravessarem subsistemas e congelarem o golden.
- PB-03-08 usa Claude Code/Opus 5, com fallback GPT-5.6 Sol `xhigh`, e prefere validador diferente.
- Fluxo padrão é serial com fast-forward automático e limpeza.
- PB-03-02/03/04 só entram em paralelo por ativação explícita do supervisor. Nesse modo não editam o
  handoff compartilhado; PB-03-05 é o integrador único.
- Golden divergente nunca é reescrito para "fazer passar". Regeneração exige causa identificada e,
  quando a semântica mudar, bump explícito de `SIMULATION_RULES_VERSION`.
- Qualquer uso de relógio, aleatoriedade global ou float no kernel é falha bloqueante.

## Handoffs

Nenhum. O playbook ainda não iniciou.

## Bloqueios

Nenhum. Os warnings `FIXABLE` herdados de PB-02 estão listados em
`docs/playbooks/PB-02/artifacts/acceptance-report.md` §11; eles não bloqueiam PB-03 e não devem ser
absorvidos por uma task deste playbook sem card próprio.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar PB-03-05 consolidar o handoff compartilhado.
