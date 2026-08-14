# PB-04-02 — Definir contratos de mundo

**Status inicial:** pending

**Classe da tarefa:** definição de contrato congelado — nomes e assinaturas que quatro tasks
posteriores consomem

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Ela é o gargalo declarado; PB-04-03 e PB-04-05 abrem em paralelo depois dela.

## Objetivo

Publicar em `@huntbound/contracts` os tipos, schemas Zod estritos e diagnósticos de `MapRegion`,
`TransitionTable`, `SpawnTable` e `HuntDefinition`. A mudança é **puramente aditiva**: nenhum schema
existente muda, nenhuma versão sobe e `corepack pnpm verify` continua verde.

## Resultado esperado

Um contrato executável que rejeita região malformada, spawn inconsistente e transição impossível,
sempre com diagnóstico ordenado e código estável, sem que nada em `packages/simulation` precise
mudar.

## Dependências

- PB-04-01 `done` e integrada em `main`.
- `packages/content/src/selections/pb-04-venore-rotworm-cave.json` congelada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Camadas do mapa”,
   “Transições”, “Spawn” e “Fronteira kernel × conteúdo”;
4. `docs/simulation/KERNEL_CONTRACT.md`, apenas para reusar `GridPosition`, `Direction` e
   `KernelBlueprint`;
5. `packages/contracts/src/simulation/**`;
6. `docs/content/PB-04-SELECTION.md`.

## Decisões congeladas

- **Nada de versão sobe aqui.** `SIMULATION_SCHEMA_VERSION` continua `2` e
  `SIMULATION_RULES_VERSION` continua `1`. `KernelScenario`, `SimulationSnapshot`, `ActorState`,
  comandos e eventos ficam intocados — a versão 3 pertence a PB-04-05, junto com o kernel e a
  migração do fixture, para que `main` nunca fique vermelha.
- `MapRegion` codifica índices row-major inteiros; ausência é ausência, não sentinela negativa.
- Ordem canônica: `floors` por `z` crescente; `transitions` por `(z, y, x)` do `from`; `groups` por
  `(z, y, x)` do centro; `objectsBelow`/`objectsAbove` e `collision` por `i`.
- Todas as coleções ordenadas são **estritamente** crescentes: par repetido é rejeitado, e é isso que
  garante unicidade sem campo extra.
- `HuntDefinition` é a fronteira: ela conhece Tibia (palette de `serverId`, `creatureKey`) e o
  cenário do kernel não. Nenhum tipo definido aqui é importado por `packages/simulation`.
- Nenhum float em nenhum schema.
- Zod permanece exclusivo de `@huntbound/contracts`.

## Escopo permitido

```text
packages/contracts/src/hunt/**
packages/contracts/src/index.ts
docs/content/MAP_REGION_CONTRACT.md
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- **qualquer arquivo de `packages/contracts/src/simulation/`** — versões, cenário, snapshot,
  comandos e eventos pertencem a PB-04-05;
- `packages/simulation`, `packages/content`, `packages/assets`, `tools/**` e `apps/game`;
- migrar o fixture do PB-03;
- qualquer leitura de binário, XML ou OTBM.

## Interfaces produzidas

```ts
export type RegionId = string & { readonly __brand: 'RegionId' };
export type HuntId = string & { readonly __brand: 'HuntId' };

export const HUNT_SCHEMA_VERSION = 1;

export interface MapRegionFloor {
  readonly z: number;
  readonly ground: readonly number[];
  readonly objectsBelow: readonly { readonly i: number; readonly stack: readonly number[] }[];
  readonly objectsAbove: readonly { readonly i: number; readonly stack: readonly number[] }[];
  readonly collision: readonly number[];
}

export interface MapRegion {
  readonly schemaVersion: number;
  readonly regionId: RegionId;
  readonly regionRevision: number;
  readonly origin: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
  readonly palette: readonly number[];
  readonly floors: readonly MapRegionFloor[];
}

export interface TransitionEntry {
  readonly from: GridPosition;
  readonly to: GridPosition;
}

export interface TransitionTable {
  readonly entries: readonly TransitionEntry[];
  readonly dropped: number;
}

export interface SpawnSlotDefinition {
  readonly creatureKey: string;
  readonly blueprintId: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly offsetZ: number;
  readonly respawnTicks: number;
}

export interface SpawnGroupDefinition {
  readonly center: GridPosition;
  readonly radius: number;
  readonly slots: readonly SpawnSlotDefinition[];
}

export interface SpawnTable {
  readonly groups: readonly SpawnGroupDefinition[];
  readonly maxLiveActors: number;
}

export interface HuntDefinition {
  readonly schemaVersion: number;
  readonly huntId: HuntId;
  readonly huntRevision: number;
  readonly region: MapRegion;
  readonly transitions: TransitionTable;
  readonly spawns: SpawnTable;
  readonly blueprints: readonly KernelBlueprint[];
  readonly playerStart: GridPosition;
  readonly playerBlueprintId: string;
}

export const MapRegionSchema: z.ZodType<MapRegion>;
export const TransitionTableSchema: z.ZodType<TransitionTable>;
export const SpawnTableSchema: z.ZodType<SpawnTable>;
export const HuntDefinitionSchema: z.ZodType<HuntDefinition>;

export function validateMapRegion(input: unknown): SimulationValidationResult<MapRegion>;
export function validateHuntDefinition(input: unknown): SimulationValidationResult<HuntDefinition>;
```

`SimulationValidationResult` e `SimulationDiagnostic` são reusados de PB-03-01 sem alteração.

Códigos de diagnóstico novos: `HUNT_REGION_OUT_OF_BUDGET`, `HUNT_UNKNOWN_BLUEPRINT`,
`HUNT_TRANSITION_INVALID`, `HUNT_SPAWN_OUT_OF_REGION`, `HUNT_PALETTE_INDEX_INVALID`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-02-world-contracts main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts codex/pb04-02-world-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts install --prefer-offline
```

A instalação resolve do store local em segundos e não altera `pnpm-lock.yaml`. Sem ela, todo gate
falha por `node_modules` ausente.

- [ ] **2. Escrever testes RED de `MapRegion`.**

Cubra, cada caso com seu código de diagnóstico:

- região válida mínima de 2 × 2 com um andar passa;
- `ground` com comprimento diferente de `width * height` é rejeitado;
- índice de `ground` fora do alcance da palette → `HUNT_PALETTE_INDEX_INVALID`;
- `palette` com duplicata é rejeitada;
- `palette` fora de ordem crescente é rejeitada;
- `floors` fora de ordem crescente de `z` é rejeitado;
- `floors` vazio é rejeitado;
- `objectsBelow` com `i` repetido é rejeitado;
- `objectsBelow` com `stack` vazio é rejeitado;
- `collision` fora de ordem estrita é rejeitada;
- `i` negativo ou `>= width * height` é rejeitado;
- `width` ou `height` acima de 96 → `HUNT_REGION_OUT_OF_BUDGET`;
- mais de 3 andares → `HUNT_REGION_OUT_OF_BUDGET`;
- float em qualquer campo numérico é rejeitado;
- campo desconhecido é rejeitado;
- dois diagnósticos no mesmo `path` saem ordenados por `code`.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `MapRegion` e seu schema; obter GREEN.**

- [ ] **4. Escrever testes RED de `TransitionTable`.**

Cubra: `from` igual a `to` → `HUNT_TRANSITION_INVALID`; duas entradas com o mesmo `from` são
rejeitadas; ordem não estrita por `(z, y, x)` é rejeitada; `dropped` negativo ou não inteiro é
rejeitado; `to` com salto de mais de um andar → `HUNT_TRANSITION_INVALID`.

- [ ] **5. Implementar `TransitionTable`; obter GREEN.**

- [ ] **6. Escrever testes RED de `SpawnTable` e `HuntDefinition`.**

Cubra: `radius` negativo ou maior que 15 é rejeitado; `respawnTicks` não inteiro, negativo ou zero é
rejeitado; `maxLiveActors` fora de `1..64` é rejeitado; grupos fora de ordem canônica são rejeitados;
grupo com zero slots é rejeitado; `blueprintId` de slot ausente de `blueprints` →
`HUNT_UNKNOWN_BLUEPRINT`; `playerBlueprintId` ausente de `blueprints` → `HUNT_UNKNOWN_BLUEPRINT`;
centro de grupo fora da região → `HUNT_SPAWN_OUT_OF_REGION`; `playerStart` fora da região ou em tile
de colisão é rejeitado; `transitions` cujo `from` cai em andar ausente de `region.floors` é
rejeitada.

- [ ] **7. Implementar `SpawnTable` e `HuntDefinition`; obter GREEN.**

- [ ] **8. Provar por mutação as invariantes que passarem de primeira.**

Se um teste de ordenação ou unicidade passar sem RED prévio, desligue a verificação correspondente na
produção e confirme que exatamente aquele teste cai. Registre no relatório qual mutação derrubou qual
teste. Uma invariante que nenhuma mutação derruba não está provada.

- [ ] **9. Documentar.**

Crie `docs/content/MAP_REGION_CONTRACT.md` com: a codificação row-major das camadas, a palette, a
ordem canônica de cada coleção, a semântica de `dropped`, a conversão de `spawntime` para
`respawnTicks` e a tabela completa de diagnósticos. Deixe explícito que `HuntDefinition` conhece
identidade Tibia e o cenário do kernel não.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts exec biome check packages/contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts verify
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts diff --check
```

`verify` **precisa** passar. Se ele falhar, a mudança não foi aditiva: algo em
`packages/contracts/src/simulation/` foi tocado, o que está fora de escopo.

- [ ] **11. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts add packages/contracts docs
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts commit -m "feat: define hunt world contracts"
```

- [ ] **12. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-02-world-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-02-world-contracts
```

`git worktree remove` falha com "Directory not empty" por causa de `node_modules`; por isso a remoção
é por `Remove-Item` seguida de `prune`.

## Critérios de aceite

- [ ] `MapRegion`, `TransitionTable`, `SpawnTable` e `HuntDefinition` têm schema estrito, tipos
      exportados e validadores estruturados.
- [ ] Toda coleção ordenada é estritamente crescente e o par repetido é rejeitado por teste.
- [ ] Os tetos de 96 × 96, 3 andares e 64 atores vivos são recusados pelo schema, não por convenção.
- [ ] Nenhum arquivo de `packages/contracts/src/simulation/` foi modificado.
- [ ] Nenhuma versão subiu; `corepack pnpm verify` passa antes e depois da integração.
- [ ] Nenhum float é aceito em nenhum schema.
- [ ] Invariantes que passaram sem RED foram provadas por mutação, com registro do que caiu.
- [ ] `docs/content/MAP_REGION_CONTRACT.md` existe e cobre codificação, ordem e diagnósticos.

## Condições de parada

Pare se a codificação de camadas não couber em inteiros; se `HuntDefinition` exigir mudança em
`packages/contracts/src/simulation/` para ser expressa; ou se algum teto congelado tornar a região
escolhida em PB-04-01 inexprimível.

## Persistência e relatório final

Registre contagem de testes, mutações executadas, comandos/exit codes, modelo/effort, modo de
conclusão e a próxima task elegível. Atualize `STATE.md` com a seção
`## PB-04-02 — handoff concluído` e declare PB-04-03 e PB-04-05 como elegíveis.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-02-definir-contratos-de-mundo.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada e rode "corepack pnpm install --prefer-offline" dentro dela antes de qualquer gate.

Comece por RED e implemente apenas packages/contracts/src/hunt. A mudança é puramente aditiva:
nao toque em packages/contracts/src/simulation, nao suba nenhuma versao, e exija que
"corepack pnpm verify" passe. Prove cada invariante de ordem e unicidade; toda invariante que passar
sem RED previo deve ser provada por mutacao da producao, com registro.

Execute os gates listados, atualize o handoff, commite, integre por fast-forward na main,
reverifique e limpe worktree/branch removendo o diretorio antes do prune.

Não implemente extração, kernel, assets, cena ou input. Se surgir decisão não coberta, pare e
registre o bloqueio. Não inicie a próxima task.
```
