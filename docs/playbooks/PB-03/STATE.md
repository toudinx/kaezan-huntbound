# PB-03 — Estado operacional

**Playbook:** `docs/playbooks/PB-03/README.md`

**Estado geral:** ready — PB-03-01 e PB-03-02 concluídas; PB-03-03 é a próxima task elegível

**Última atualização:** 2026-08-13

**Próxima task elegível:** PB-03-03.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-03-01 | done | `codex/pb03-01-kernel-contracts` | `c09a4cc` | 37 testes; typecheck; architecture; Biome; format; diff check |
| PB-03-02 | done | `codex/pb03-02-kernel-random` | `4dbcc96` | 12 testes; typecheck; architecture; Biome; format; diff check |
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
- Dependências externas previstas: nenhuma nova. `@huntbound/simulation` declara somente a dependência
  interna `@huntbound/contracts`; Zod permanece somente em `@huntbound/contracts`.
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

## PB-03-01 — handoff concluído

PB-03-01 foi implementada na branch `codex/pb03-01-kernel-contracts`. O commit funcional integrado
é `c09a4cc` (`feat: define deterministic kernel contracts`). `@huntbound/contracts` agora publica
identidade branded, versões, tipos de cenário/comando/evento/snapshot/log, schemas Zod estritos,
`commandPriority`, factories e os validadores estruturados do kernel. `packages/simulation` ficou
inalterado.

Exports efetivos incluem `TickIndexSchema`, `EntityIdSchema`, `SeedSchema`, `StreamLabelSchema` e
suas factories; `SIMULATION_SCHEMA_VERSION`, `SIMULATION_RULES_VERSION`, `TICK_DURATION_MS` e
`MAX_FRAME_DELTA_MS`; `KernelScenarioSchema`, `SimulationCommandSchema`,
`SimulationCommandInputSchema`, `SimulationCommandRecordSchema`, `SimulationEventSchema`,
`SimulationSnapshotSchema`, `SimulationCommandLogSchema`, os schemas auxiliares e
`commandPriority`; `validateKernelScenario`, `validateSimulationSnapshot`,
`validateSimulationCommandLog`, `simulationDiagnosticsFromZodError` e todos os tipos públicos de
`packages/contracts/src/simulation/types.ts`.

As invariantes cobertas incluem inteiros seguros, seed/label branded, strictness, ordem e unicidade de
`blockedTiles`, referências de blueprint, posições iniciais, emissor permitido por comando,
ordenação de streams/atores/comandos, sequência crescente do log, versões e diagnósticos ordenados por
path/code. O contrato durável está em `docs/simulation/KERNEL_CONTRACT.md`.

Evidência fresca:

```text
corepack pnpm --filter @huntbound/contracts test -> exit 0; 37 passed (4 files)
corepack pnpm --filter @huntbound/contracts typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/contracts -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
```

O ciclo TDD observou RED por módulos ausentes antes da implementação; após o GREEN, uma falha de
export duplicado e avisos de formatação foram corrigidos sem ampliar o escopo. Não houve alteração de
versões, comandos/eventos, floats, dependências novas, I/O ou contratos de conteúdo/assets.

Modelo/effort efetivos: Codex baseado em GPT-5; o alias Luna/xhigh sugerido não é exposto nesta
sessão. Skills usadas: `superpowers:using-superpowers`, `superpowers:brainstorming`,
`superpowers:writing-plans`, `superpowers:using-git-worktrees`,
`superpowers:test-driven-development` e `superpowers:verification-before-completion`. Validador
efetivo: gates automatizados; não houve gatilho objetivo para escalonamento.

Modo de conclusão: serial, com fast-forward em `main`, reverificação integrada e remoção da worktree
e da branch temporárias. PB-03-02 é a próxima task elegível; RNG não foi antecipado.

## PB-03-02 — handoff concluído

PB-03-02 foi implementada na branch `codex/pb03-02-kernel-random`. O commit funcional integrado é
`4dbcc96` (`feat: seed deterministic kernel randomness`). `@huntbound/simulation` agora publica
`createSeededRandom`, `restoreSeededRandom`, `createKernelRandomStreams` e
`restoreKernelRandomStreams`, com `RandomSource` serializável e `KernelRandomStreams` para
`movement`, `ai` e `scenario`.

O PRNG usa xoshiro128** com aritmética uint32, seeding SplitMix32 a partir das duas metades da seed de
64 bits, derivação FNV-1a 32 + SplitMix32 sem consumir o pai e `nextBelow` por rejeição. O contador
`drawCount` inclui valores rejeitados e a restauração recusa estado zero, labels ausentes, duplicados ou
extras. O contrato durável foi atualizado em `docs/simulation/KERNEL_CONTRACT.md`.

Vetores golden para a seed `0f1e2d3c4b5a6978` (oito primeiros `nextUint32()` por stream):

```text
ai:       f1d5ad77 ce8a401b 9ead377c edd33fe5 327526b4 2f753712 826067ea 387f9b0a
movement: 9046423d fcd233cd 207a837d a83cf41a 1adb5830 2241cdbd edbec034 3471c9d1
scenario: fc89a05c 535ac971 733b1b1a 27af86d8 0fcb29a6 971986f7 ab6025df 6f306771
```

Evidência fresca na worktree da task:

```text
node node_modules/vitest/vitest.mjs run --root packages/simulation --reporter=verbose -> exit 0; 12 passed
node node_modules/typescript/bin/tsc --project packages/simulation/tsconfig.json --pretty false -> exit 0
node tools/architecture/check-boundaries.ts -> exit 0
node node_modules/@biomejs/biome/bin/biome check packages/simulation -> exit 0
node node_modules/@biomejs/biome/bin/biome format packages/simulation -> exit 0
node node_modules/@biomejs/biome/bin/biome format . -> exit 0
git diff --check -> exit 0
```

O comando pnpm acionou a revalidação de dependências e tentou consultar metadados do registry; a
execução foi interrompida após `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Os binários locais equivalentes aos
scripts foram executados com sucesso, sem alterar o lockfile além do importer de `packages/simulation`.

Modelo/effort efetivos: Codex baseado em GPT-5; o alias Luna/xhigh sugerido não é exposto nesta sessão.
Skills usadas: `superpowers:using-superpowers`, `superpowers:brainstorming`, `superpowers:writing-plans`,
`superpowers:executing-plans`, `superpowers:using-git-worktrees`,
`superpowers:test-driven-development` e `superpowers:verification-before-completion`. Validador
efetivo: gates automatizados; não houve gatilho objetivo para escalonamento.

Modo de conclusão: serial, com fast-forward em `main`, reverificação integrada e remoção da worktree e
da branch temporárias. PB-03-03 é a próxima task elegível; grid, comandos e loop não foram antecipados.

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
