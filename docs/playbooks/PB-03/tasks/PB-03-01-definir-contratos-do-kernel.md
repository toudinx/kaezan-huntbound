# PB-03-01 — Definir contratos do kernel

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — contratos aprovados na spec PB-03

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5 somente após
gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Primeira task serial do playbook.

## Objetivo

Criar em `@huntbound/contracts` a linguagem estável do kernel: tipos branded, versões, schemas
estritos de cenário, comando, evento, snapshot e command log, mais os códigos de diagnóstico. Não
implementar kernel, RNG, grid, loop nem I/O.

## Resultado esperado

O pacote exporta contratos browser-safe cobertos por testes. Documento inválido produz diagnóstico
estruturado e ordenado; field extra, número não inteiro, direção desconhecida, emissor proibido,
duplicata e referência cruzada inválida são rejeitados antes de qualquer simulação.

## Dependências

- PB-02 fechado em `1134fc8` como `APPROVED_WITH_WARNINGS` e `main` limpa.
- Spec PB-03 aprovada em `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`.
- Node 24.14.0 e pnpm 11.21.0 via Corepack.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/playbooks/PB-03/README.md`;
4. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`;
5. `docs/architecture/PACKAGE_BOUNDARIES.md`;
6. `packages/contracts/src/index.ts`, `src/content/identity.ts` e `src/content/diagnostics.ts` como
   referência de estilo;
7. `packages/simulation/package.json`, `tsconfig.json` e `src/index.ts`.

## Decisões congeladas

- `TickIndex`, `EntityId` são inteiros branded; `Seed` é string branded de 16 hex minúsculos;
  `StreamLabel` é string branded kebab-case.
- `SIMULATION_SCHEMA_VERSION = 1` e `SIMULATION_RULES_VERSION = 1`.
- Direções: `'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'`.
- Emissores: `'player' | 'ai' | 'scenario'`.
- Comandos: `actor/move-step`, `actor/face`, `actor/wait`, `scenario/spawn-actor`,
  `scenario/despawn-actor`.
- Eventos: `actor/spawned`, `actor/moved`, `actor/move-blocked`, `actor/faced`, `actor/despawned`,
  `command/rejected`.
- Prioridades: `scenario/*` 0, `actor/face` 1, `actor/move-step` 2, `actor/wait` 3.
- Todo número de qualquer schema do kernel é inteiro seguro. Não existe campo float.
- Coordenada é `{ x, y, z }` inteira.
- `blockedTiles` é ordenado por `(y, x)` e sem duplicata; a ordem faz parte do contrato.
- O snapshot referencia `scenarioId` e `scenarioRevision` e nunca copia terreno nem hash do cenário.
- Zod fica somente em `@huntbound/contracts`. `@huntbound/simulation` não ganha dependência.
- Esta task não usa filesystem, fetch, Web Crypto, Blob, Phaser ou Node.

## Escopo permitido

```text
packages/contracts/src/index.ts
packages/contracts/src/simulation/**
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

## Fora de escopo

- implementação de PRNG, grid, comandos, loop, snapshot ou replay;
- qualquer alteração em `packages/simulation/src/**` além de nenhuma;
- fixtures, CLI, app, browser e Playwright;
- alterar contratos de conteúdo ou de assets.

## Interfaces produzidas

### Identidade e versões

```ts
export type TickIndex = number & { readonly __brand: 'TickIndex' };
export type EntityId = number & { readonly __brand: 'EntityId' };
export type Seed = string & { readonly __brand: 'Seed' };
export type StreamLabel = string & { readonly __brand: 'StreamLabel' };

export const SIMULATION_SCHEMA_VERSION = 1;
export const SIMULATION_RULES_VERSION = 1;
export const TICK_DURATION_MS = 50;
export const MAX_FRAME_DELTA_MS = 250;
```

Cada branded type possui schema e factory que rejeita `NaN`, infinito, decimal, negativo fora do
domínio e string fora do padrão. `TickIndex` aceita zero; `EntityId` começa em 1.

### Cenário

```ts
export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export type ActorBehavior = 'inert' | 'wander';

export interface GridPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ActorBlueprint {
  readonly blueprintId: string;
  readonly stepCooldownTicks: number;
  readonly behavior: ActorBehavior;
}

export interface KernelScenario {
  readonly schemaVersion: number;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly width: number;
  readonly height: number;
  readonly z: number;
  readonly blockedTiles: readonly (readonly [number, number])[];
  readonly blueprints: readonly ActorBlueprint[];
  readonly initialActors: readonly {
    readonly blueprintId: string;
    readonly position: GridPosition;
    readonly facing: Direction;
  }[];
}
```

Refinements obrigatórios: `width`/`height` positivos; `blockedTiles` dentro do grid, ordenados por
`(y, x)`, sem duplicata; `blueprintId` único e kebab-case; `stepCooldownTicks` inteiro não negativo;
`initialActors` referenciando blueprint existente, dentro do grid, fora de tile bloqueado, sem duas
entradas na mesma célula; `position.z === z`.

### Comandos

```ts
export type CommandIssuer = 'player' | 'ai' | 'scenario';

export type SimulationCommand =
  | { readonly type: 'actor/move-step'; readonly entityId: EntityId; readonly direction: Direction }
  | { readonly type: 'actor/face'; readonly entityId: EntityId; readonly direction: Direction }
  | { readonly type: 'actor/wait'; readonly entityId: EntityId }
  | {
      readonly type: 'scenario/spawn-actor';
      readonly blueprintId: string;
      readonly position: GridPosition;
      readonly facing: Direction;
    }
  | { readonly type: 'scenario/despawn-actor'; readonly entityId: EntityId };

export interface SimulationCommandInput {
  readonly tick: TickIndex;
  readonly issuer: CommandIssuer;
  readonly command: SimulationCommand;
}

export interface SimulationCommandRecord extends SimulationCommandInput {
  readonly sequence: number;
}

export function commandPriority(type: SimulationCommand['type']): number;
```

`scenario/*` só pode ser emitido por `scenario`; `actor/*` só por `player` ou `ai`. A violação é
`SIM_COMMAND_FORBIDDEN`.

### Eventos

```ts
export type MoveBlockedReason =
  | 'bounds'
  | 'terrain'
  | 'occupied'
  | 'diagonal-corner'
  | 'cooldown';

export type SimulationEventPayload =
  | { readonly type: 'actor/spawned'; readonly entityId: EntityId; readonly blueprintId: string; readonly position: GridPosition; readonly facing: Direction }
  | { readonly type: 'actor/moved'; readonly entityId: EntityId; readonly from: GridPosition; readonly to: GridPosition; readonly facing: Direction }
  | { readonly type: 'actor/move-blocked'; readonly entityId: EntityId; readonly attempted: GridPosition; readonly reason: MoveBlockedReason }
  | { readonly type: 'actor/faced'; readonly entityId: EntityId; readonly facing: Direction }
  | { readonly type: 'actor/despawned'; readonly entityId: EntityId }
  | { readonly type: 'command/rejected'; readonly commandType: SimulationCommand['type']; readonly commandSequence: number; readonly code: SimulationDiagnosticCode };

export interface SimulationEvent {
  readonly tick: TickIndex;
  readonly sequence: number;
  readonly payload: SimulationEventPayload;
}
```

### Snapshot e log

```ts
export interface RandomStreamState {
  readonly label: StreamLabel;
  readonly s0: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
  readonly drawCount: number;
}

export interface ActorState {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly facing: Direction;
  readonly readyAtTick: number;
}

export interface SimulationSnapshot {
  readonly schemaVersion: number;
  readonly rulesVersion: number;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly tick: TickIndex;
  readonly nextEntityId: number;
  readonly nextEventSequence: number;
  readonly nextCommandSequence: number;
  readonly randomStreams: readonly RandomStreamState[];
  readonly actors: readonly ActorState[];
  readonly pendingCommands: readonly SimulationCommandRecord[];
}

export interface SimulationCommandLogHeader {
  readonly kind: 'header';
  readonly schemaVersion: number;
  readonly rulesVersion: number;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly tickCount: number;
}

export interface SimulationCommandLog {
  readonly header: SimulationCommandLogHeader;
  readonly commands: readonly SimulationCommandRecord[];
}
```

`actors` é ordenado por `entityId`; `randomStreams` por `label`; `pendingCommands` por
`(tick, sequence)`. A ordenação é invariante de schema, não detalhe de implementação.

### Diagnósticos

```ts
export type SimulationDiagnosticCode =
  | 'SIM_SCHEMA_INVALID'
  | 'SIM_VERSION_MISMATCH'
  | 'SIM_SCENARIO_MISMATCH'
  | 'SIM_SEED_INVALID'
  | 'SIM_TICK_IN_PAST'
  | 'SIM_COMMAND_UNKNOWN_ENTITY'
  | 'SIM_COMMAND_FORBIDDEN'
  | 'SIM_COMMAND_DUPLICATE'
  | 'SIM_MOVE_OUT_OF_BOUNDS'
  | 'SIM_MOVE_BLOCKED_TERRAIN'
  | 'SIM_MOVE_BLOCKED_OCCUPIED'
  | 'SIM_MOVE_DIAGONAL_CORNER'
  | 'SIM_MOVE_ON_COOLDOWN'
  | 'SIM_SPAWN_TILE_UNAVAILABLE'
  | 'SIM_STATE_NOT_INTEGER'
  | 'SIM_STATE_NOT_SERIALIZABLE'
  | 'SIM_REPLAY_DIVERGED';

export interface SimulationDiagnostic {
  readonly code: SimulationDiagnosticCode;
  readonly message: string;
  readonly path: readonly (string | number)[];
}

export type SimulationValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly SimulationDiagnostic[] };

export function validateKernelScenario(input: unknown): SimulationValidationResult<KernelScenario>;
export function validateSimulationSnapshot(input: unknown): SimulationValidationResult<SimulationSnapshot>;
export function validateSimulationCommandLog(input: unknown): SimulationValidationResult<SimulationCommandLog>;
```

Diagnósticos são ordenados por `path` e depois por `code`, resultado determinístico.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-01-kernel-contracts main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts codex/pb03-01-kernel-contracts
```

- [ ] **2. Escrever testes RED de identidade e versões.**

Cubra seed válida e inválida (uppercase, 15 ou 17 chars, não hex), `TickIndex` zero válido,
`EntityId` zero inválido, `StreamLabel` com underscore inválido, e prove que os branded types não
aceitam número cru por cast público.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts --filter @huntbound/contracts test
```

Esperado: RED por módulos/exports ausentes.

- [ ] **3. Implementar identidade e constantes; obter GREEN.**

Brands só após parse bem-sucedido, no mesmo padrão de `content/identity.ts`.

- [ ] **4. Escrever testes RED dos schemas.**

Inclua documento mínimo válido de cenário, comando, evento, snapshot e log, e mutações controladas
para: field extra, `blockedTiles` desordenado, tile duplicado, ator inicial em tile bloqueado, dois
atores na mesma célula, `blueprintId` inexistente, `position.z` divergente, número decimal em
qualquer campo, direção desconhecida, `scenario/*` emitido por `player`, `actor/*` emitido por
`scenario`, `sequence` não crescente no log, snapshot com `actors` fora de ordem e versão divergente.

- [ ] **5. Implementar schemas, refinements e conversão de diagnósticos; obter GREEN.**

Não use `passthrough()`, coerção silenciosa, `z.any()` ou `unknown` persistido. Todo número usa
inteiro seguro. Ordene diagnósticos por path e code.

- [ ] **6. Exportar pelo entrypoint e documentar o contrato.**

`packages/contracts/src/index.ts` reexporta o namespace de simulação sem colidir com os nomes de
conteúdo. `docs/simulation/KERNEL_CONTRACT.md` registra versões, tick, direções, tabela de comandos,
tabela de eventos, prioridades, formato do log, formato do snapshot e a regra de somente inteiros.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts --filter @huntbound/contracts typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts exec biome check packages/contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts format:check
git -C C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts diff --check
```

- [ ] **8. Atualizar handoff e commitar.**

Marque PB-03-01 `done`, registre exports efetivos, contagem de testes e indique PB-03-02.

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts add packages/contracts docs/simulation/KERNEL_CONTRACT.md docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts commit -m "feat: define deterministic kernel contracts"
```

- [ ] **9. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-01-kernel-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/contracts typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-01-kernel-contracts
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-01-kernel-contracts
```

## Critérios de aceite

- [ ] Todos os tipos, constantes, schemas, validators e diagnósticos obrigatórios são exports
      públicos.
- [ ] Schemas são strict; refinements de ordem, unicidade e referência cruzada têm teste.
- [ ] Nenhum campo aceita número não inteiro.
- [ ] Emissor e tipo de comando são validados juntos.
- [ ] Contratos não importam Node, DOM, fetch, crypto, Blob, Phaser nem outro pacote Huntbound.
- [ ] `packages/simulation` permanece inalterado.
- [ ] Docs, handoff, commit, integração e limpeza estão completos.

## Condições de parada

Pare se for necessário mudar tick, versões, conjunto de comandos/eventos, formato de seed ou
introduzir float, dependência nova ou I/O. Registre o bloqueio e a decisão pendente.

## Persistência e relatório final

Registre em `STATE.md` exports efetivos, contagem de testes, comandos/exit codes, modelo/effort,
commit integrado, limpeza e PB-03-02 como próxima task. Não implemente kernel.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion. Escale somente por gatilho objetivo registrado no STATE.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-01-definir-contratos-do-kernel.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, comece por RED, implemente apenas tipos, constantes, schemas e diagnósticos em
@huntbound/contracts, execute todos os gates, atualize STATE.md, commite, integre por fast-forward na
main, reverifique e remova worktree/branch. Não implemente RNG, grid, comandos, loop, snapshot,
replay, CLI ou app.

Se surgir decisão não coberta, pare e registre o bloqueio. Não inicie PB-03-02.
```
