# PB-03-03 — Implementar grid e movimento

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — regras espaciais congeladas na spec

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** sim, com PB-03-02 e PB-03-04 após PB-03-01, somente por ativação do supervisor.
Paths funcionais disjuntos: esta task só toca `packages/simulation/src/grid/**`.

## Objetivo

Implementar o espaço determinístico do kernel: coordenadas inteiras, direções, terreno bloqueante
estático, índice de ocupação derivado e a regra de passo com custo, corte de canto e limites. Não
implementar loop de tick, comandos, eventos nem snapshot.

## Resultado esperado

Uma função pura de tentativa de passo decide entre sucesso e uma causa de bloqueio específica, e o
índice de ocupação é reconstruível a partir da lista de atores, sem estado oculto e sem depender de
ordem de inserção.

## Dependências

- PB-03-01 `done` e integrado em `main`.
- Tipos `Direction`, `GridPosition`, `KernelScenario`, `ActorState` e `MoveBlockedReason`
  disponíveis em `@huntbound/contracts`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`, seção “Espaço”;
4. `docs/simulation/KERNEL_CONTRACT.md`;
5. `packages/simulation/package.json`, `tsconfig.json` e `src/index.ts`;
6. `packages/contracts/src/simulation/**` apenas para os tipos consumidos.

## Decisões congeladas

- Coordenada é `{ x, y, z }` inteira; o cenário tem um único `z` e não há transição de andar.
- Direções e seus deltas: `n(0,-1)`, `ne(1,-1)`, `e(1,0)`, `se(1,1)`, `s(0,1)`, `sw(-1,1)`,
  `w(-1,0)`, `nw(-1,-1)`.
- Ordem canônica de direções e de vizinhança: `n, ne, e, se, s, sw, w, nw`.
- Terreno bloqueante é estático e vem de `scenario.blockedTiles`.
- Ocupação é derivada dos atores, reconstruída no load e **não** serializada.
- No máximo um ator por célula.
- Passo diagonal exige que as duas células ortogonais adjacentes não estejam bloqueadas por terreno;
  ocupação por ator nessas células não impede o corte.
- Custo do passo: ortogonal `base`; diagonal `Math.ceil(base * 3 / 2)`, com `base =
  blueprint.stepCooldownTicks`.
- Precedência das causas de bloqueio, na ordem: `bounds`, `terrain`, `diagonal-corner`, `occupied`.
  A causa de `cooldown` é decidida antes da geometria, por quem chama, e não por esta camada.
- Todo cálculo é inteiro. Nenhuma distância euclidiana, raiz ou float.
- Proibido: `Math.random`, `Date`, `performance`, timers, `crypto`, dependência externa.

## Escopo permitido

```text
packages/simulation/src/grid/**
packages/simulation/src/index.ts
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

## Fora de escopo

- pathfinding, line of sight, área de efeito, projétil, distância em campo de visão;
- cooldown de ator, tick, comandos, eventos, snapshot, replay;
- múltiplos andares, transições e mapa real;
- CLI, fixtures versionadas, app e browser.

## Interfaces produzidas

```ts
export const DIRECTIONS: readonly Direction[];

export function directionDelta(direction: Direction): {
  readonly dx: number;
  readonly dy: number;
};
export function isDiagonal(direction: Direction): boolean;
export function stepCostTicks(baseTicks: number, direction: Direction): number;
export function translate(position: GridPosition, direction: Direction): GridPosition;

export interface StaticGrid {
  readonly width: number;
  readonly height: number;
  readonly z: number;
  isInside(position: GridPosition): boolean;
  isBlockedTerrain(position: GridPosition): boolean;
}

export function createStaticGrid(scenario: KernelScenario): StaticGrid;

export interface OccupancyIndex {
  occupantAt(position: GridPosition): EntityId | undefined;
  isOccupied(position: GridPosition): boolean;
}

export function createOccupancyIndex(
  actors: readonly ActorState[],
): OccupancyIndex;

export type StepOutcome =
  | { readonly ok: true; readonly to: GridPosition; readonly costTicks: number }
  | { readonly ok: false; readonly reason: MoveBlockedReason; readonly attempted: GridPosition };

export function resolveStep(
  grid: StaticGrid,
  occupancy: OccupancyIndex,
  actor: ActorState,
  direction: Direction,
  baseTicks: number,
): StepOutcome;
```

`resolveStep` é pura: não muta ator, grid nem índice. A aplicação do resultado pertence ao sistema de
movimento em PB-03-05.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-03-kernel-grid main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid codex/pb03-03-kernel-grid
```

- [ ] **2. Escrever testes RED de direções e custo.**

Prove os oito deltas, a ordem canônica, `isDiagonal`, `translate` preservando `z`, e a tabela de
custo: base 0 → 0 em qualquer direção; base 2 → 2 ortogonal e 3 diagonal; base 3 → 3 ortogonal e 5
diagonal.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid --filter @huntbound/simulation test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar direções, deltas e custo; obter GREEN.**

- [ ] **4. Escrever testes RED de grid estático e ocupação.**

Prove: `isInside` rejeita `x < 0`, `y < 0`, `x >= width`, `y >= height` e `z` divergente;
`isBlockedTerrain` bate com `blockedTiles`; a construção do índice é independente da ordem da lista
de atores, provada por duas listas com a mesma composição em ordens diferentes.

- [ ] **5. Implementar `createStaticGrid` e `createOccupancyIndex`; obter GREEN.**

Indexe por chave inteira derivada de `(x, y)`; não use string concatenada com separador ambíguo.

- [ ] **6. Escrever testes RED de `resolveStep`.**

Cubra, cada um com sua causa distinta:

- passo ortogonal válido em célula livre;
- passo diagonal válido com os dois ortogonais livres;
- destino fora do grid → `bounds`;
- destino em terreno bloqueado → `terrain`;
- diagonal com um ortogonal bloqueado por terreno → `diagonal-corner`;
- diagonal com os dois ortogonais bloqueados → `diagonal-corner`;
- diagonal com ortogonal apenas ocupado por ator → sucesso;
- destino ocupado por outro ator → `occupied`;
- precedência: destino simultaneamente fora do grid e “ocupado” devolve `bounds`;
- precedência: destino bloqueado por terreno e ocupado devolve `terrain`.

- [ ] **7. Implementar `resolveStep` na precedência congelada; obter GREEN.**

- [ ] **8. Documentar.**

Acrescente a `docs/simulation/KERNEL_CONTRACT.md` a seção de espaço: deltas, ordem canônica, custo
diagonal, regra de corte de canto, precedência das causas e a natureza derivada da ocupação.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid --filter @huntbound/simulation typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid exec biome check packages/simulation
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid format:check
git -C C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid diff --check
```

- [ ] **10. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid add packages/simulation docs/simulation/KERNEL_CONTRACT.md docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid commit -m "feat: resolve deterministic grid movement"
```

Em modo paralelo, não edite `STATE.md`: deixe PB-03-05 consolidar o handoff.

- [ ] **11. Integrar e limpar.**

Modo serial:

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-03-kernel-grid
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-03-kernel-grid
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-03-kernel-grid
```

Modo paralelo: remova a worktree limpa após o commit e preserve a branch para PB-03-05.

## Critérios de aceite

- [ ] Os oito deltas, a ordem canônica e o custo diagonal inteiro estão provados.
- [ ] `bounds`, `terrain`, `diagonal-corner` e `occupied` têm teste próprio e precedência provada.
- [ ] Ocupação por ator não impede corte de canto; terreno impede.
- [ ] O índice de ocupação é derivado e independente da ordem da lista de atores.
- [ ] `resolveStep` é puro e não muta nada.
- [ ] Nenhum float, `Math.random`, relógio, timer, `crypto` ou dependência externa entra no kernel.
- [ ] Docs, commit, integração e limpeza no modo declarado estão completos.

## Condições de parada

Pare se a regra de corte de canto, o custo diagonal ou a precedência de causas precisar mudar, ou se
aparecer necessidade de múltiplos andares, pathfinding ou ocupação não bloqueante.

## Persistência e relatório final

Registre contagem de testes, comandos/exit codes, modelo/effort, modo de conclusão e a próxima task
elegível. Não implemente comandos, tick ou eventos.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-03-implementar-grid-e-movimento.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, comece por RED e implemente apenas packages/simulation/src/grid. Prove cada causa de
bloqueio e a precedência entre elas. Execute todos os gates, atualize o handoff conforme o modo
declarado, commite, integre por fast-forward na main no modo serial, reverifique e remova
worktree/branch.

Não implemente RNG, comandos, eventos, loop de tick, snapshot, replay, CLI ou app. Se surgir decisão
não coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
