# Contrato do kernel determinístico

Este documento congela a linguagem pública compartilhada por `@huntbound/contracts` e pelo kernel
headless de PB-03. A task PB-03-01 define somente tipos, schemas e diagnósticos; não implementa RNG,
grid, aplicação de comandos, loop de tick, snapshot/restore ou replay.

## Versões e tempo

| Constante | Valor |
| --- | ---: |
| `SIMULATION_SCHEMA_VERSION` | `1` |
| `SIMULATION_RULES_VERSION` | `1` |
| `TICK_DURATION_MS` | `50` |
| `MAX_FRAME_DELTA_MS` | `250` |

O kernel avança em ticks inteiros de 50 ms e nunca lê relógio. O driver externo pode acumular no
máximo 250 ms por frame, sem descartar ticks. Mudanças incompatíveis de formato exigem incremento de
`SIMULATION_SCHEMA_VERSION`; mudanças semânticas das regras exigem incremento de
`SIMULATION_RULES_VERSION`.

## Identidade e números

Os tipos `TickIndex`, `EntityId`, `Seed` e `StreamLabel` são brands TypeScript. Eles só podem ser
obtidos pelos schemas ou factories públicas depois de validação:

- `TickIndex` é inteiro seguro não negativo e aceita zero.
- `EntityId` é inteiro seguro positivo e começa em um.
- `Seed` é exatamente 16 caracteres hexadecimais minúsculos.
- `StreamLabel` é uma string kebab-case minúscula, como `movement` ou `scenario-spawn`.

Todo número nos schemas do kernel é inteiro seguro. Não existe campo float. Coordenadas têm o formato
`{ x, y, z }`, e todos os eixos são inteiros seguros.

## Cenário

`KernelScenario` contém `schemaVersion`, `scenarioId`, `scenarioRevision`, `width`, `height`, `z`,
`blockedTiles`, `blueprints` e `initialActors`.

- `width` e `height` são positivos.
- `blockedTiles` fica dentro do grid, sem duplicatas e estritamente ordenado por `(y, x)`.
- `blueprintId` é kebab-case e único.
- `stepCooldownTicks` é inteiro seguro não negativo.
- Cada ator inicial referencia um blueprint existente, está dentro do grid, usa o `z` do cenário, não
  ocupa terreno bloqueado e não compartilha célula com outro ator.
- Os schemas são estritos: campos desconhecidos são rejeitados.

As direções canônicas, nesta ordem, são:

`n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`.

Os comportamentos de blueprint são `inert` e `wander`.

## Comandos

Todo comando usa o envelope:

```ts
{
  tick: TickIndex,
  issuer: 'player' | 'ai' | 'scenario',
  command: SimulationCommand,
}
```

| Tipo | Payload | Emissor permitido | Prioridade |
| --- | --- | --- | ---: |
| `scenario/spawn-actor` | `blueprintId`, `position`, `facing` | `scenario` | 0 |
| `scenario/despawn-actor` | `entityId` | `scenario` | 0 |
| `actor/face` | `entityId`, `direction` | `player`, `ai` | 1 |
| `actor/move-step` | `entityId`, `direction` | `player`, `ai` | 2 |
| `actor/wait` | `entityId` | `player`, `ai` | 3 |

`commandPriority(type)` devolve a prioridade congelada acima. O schema valida emissor e tipo em
conjunto; uma combinação proibida produz `SIM_COMMAND_FORBIDDEN` nos diagnósticos estruturados.

`SimulationCommandRecord` adiciona `sequence`, um inteiro seguro positivo. No command log, sequences
são estritamente crescentes e ticks são não decrescentes.

## Eventos

Eventos usam o envelope `{ tick, sequence, payload }`. A sequência é um inteiro seguro positivo e é
monotônica global na execução.

| Tipo | Payload |
| --- | --- |
| `actor/spawned` | `entityId`, `blueprintId`, `position`, `facing` |
| `actor/moved` | `entityId`, `from`, `to`, `facing` |
| `actor/move-blocked` | `entityId`, `attempted`, `reason` |
| `actor/faced` | `entityId`, `facing` |
| `actor/despawned` | `entityId` |
| `command/rejected` | `commandType`, `commandSequence`, `code` |

As causas de bloqueio são `bounds`, `terrain`, `occupied`, `diagonal-corner` e `cooldown`.

## Snapshot

`SimulationSnapshot` referencia `scenarioId` e `scenarioRevision`; ele não copia terreno, ocupação ou
hash do cenário. O formato contém:

```text
schemaVersion, rulesVersion, scenarioId, scenarioRevision, seed, tick,
nextEntityId, nextEventSequence, nextCommandSequence,
randomStreams, actors, pendingCommands
```

As coleções têm ordem canônica parte do contrato:

- `randomStreams` por `label`, sem duplicatas;
- `actors` por `entityId`, sem duplicatas;
- `pendingCommands` por `(tick, sequence)`.

`RandomStreamState` guarda `label`, quatro palavras `s0`–`s3` uint32 e `drawCount` não negativo.
`ActorState` guarda `entityId`, `blueprintId`, `position`, `facing` e `readyAtTick`.

## Command log

`SimulationCommandLog` tem um header estrito:

```text
kind = "header"
schemaVersion, rulesVersion, scenarioId, scenarioRevision, seed, tickCount
```

O header e cada `SimulationCommandRecord` são validados antes de qualquer simulação. Versão
incompatível produz `SIM_VERSION_MISMATCH`; seed inválida produz `SIM_SEED_INVALID`; uma sequência
repetida ou regressiva produz `SIM_COMMAND_DUPLICATE`.

## Diagnósticos

Os validadores públicos são:

```ts
validateKernelScenario(input)
validateSimulationSnapshot(input)
validateSimulationCommandLog(input)
```

Todos devolvem `SimulationValidationResult<T>`. Em caso de falha, cada item tem `code`, `message` e
`path`; os itens são ordenados deterministicamente por `path` e depois por `code`. O código genérico
para shape ou invariantes de schema é `SIM_SCHEMA_INVALID`. Os demais códigos públicos estão
declarados em `SimulationDiagnosticCode` e ficam disponíveis para as tasks que implementam a
execução do kernel.

Zod é uma dependência exclusiva de `@huntbound/contracts`. O contrato não importa Node, DOM, Phaser,
filesystem, fetch, Web Crypto, Blob ou qualquer outro pacote Huntbound.

