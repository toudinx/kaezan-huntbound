# MB-02 — `map-authoring` e `borderize` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` syntax for tracking.

**Goal:** Criar `@huntbound/map-authoring` e uma implementação pura, determinística e browser-safe de `borderize(grid, tables, seed)`.

**Architecture:** O package recebe uma grade autoral plana e um descritor explícito que liga as tabelas medidas aos papéis de piso, massa e borda. Ele calcula classificações sobre um snapshot da entrada, preenche vazios com seleção ponderada por hash de coordenada, aplica peças de borda por assinatura de oito vizinhos e retorna células em ordem canônica sem mutar a entrada.

**Tech Stack:** TypeScript 7, Node 24 nos scripts do workspace, Vitest 4.1, `@huntbound/contracts` como única dependência de projeto e `lib: ["ES2022"]` sem DOM.

**Spec:** `docs/superpowers/specs/2026-08-24-map-authoring-borderize-design.md`

## Global Constraints

- `@huntbound/map-authoring` depende somente de `@huntbound/contracts`.
- A implementação não importa `node:*`, DOM, Phaser, filesystem ou dependência externa.
- `Math.random()` e `Date.now()` não aparecem no package.
- `ground === 0` ou `ground === null` é vazio; piso existente nunca muda.
- A assinatura usa N, NE, E, SE, S, SW, W, NW nos bits 0 a 7.
- Assinatura ausente usa `massDominantServerId`; não lança.
- A entrada não é mutada e a saída é ordenada por `z`, `y`, `x`.
- Testes de comportamento são escritos e vistos falhar antes do código de produção correspondente.
- Use sempre `corepack pnpm`; não use `npm`, `yarn` ou `pnpm` direto.

---

### Task 1: Registrar o package e a fronteira arquitetural

**Files:**
- Create: `packages/map-authoring/package.json`
- Create: `packages/map-authoring/tsconfig.json`
- Modify: `tools/architecture/dependency-policy.json`
- Modify: `tools/architecture/check-boundaries.test.ts`
- Modify: `pnpm-lock.yaml` via `corepack pnpm install --lockfile-only --offline`

**Interfaces:**
- Produces the workspace package name `@huntbound/map-authoring`.
- Allows only `@huntbound/contracts` in the package policy.
- Makes the existing boundary checker reject `node:*` imports from this package.

- [ ] **Step 1: Create the manifest and non-DOM TypeScript config**

Create `packages/map-authoring/package.json`:

```json
{
  "name": "@huntbound/map-authoring",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --project tsconfig.json",
    "build": "tsc --project tsconfig.json"
  },
  "dependencies": {
    "@huntbound/contracts": "0.0.0"
  },
  "devDependencies": {
    "vitest": "4.1.10"
  }
}
```

Create `packages/map-authoring/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 2: Register the policy before writing the algorithm**

Add this project entry to `tools/architecture/dependency-policy.json`:

```json
"@huntbound/map-authoring": ["@huntbound/contracts"]
```

Add this external rule:

```json
"@huntbound/map-authoring": {
  "allowedDependencies": [],
  "forbidDomLibraries": ["phaser"],
  "forbidNodeBuiltins": true
}
```

- [ ] **Step 3: Add the boundary regression test**

Extend the `packagePolicy` fixture in `tools/architecture/check-boundaries.test.ts` with the new
package and external rule. Add this test:

```ts
it('reports a Node builtin import from map-authoring', async () => {
  const workspace = await createWorkspace({
    '@huntbound/map-authoring': {
      source: 'import { readFile } from "node:fs";\nvoid readFile;\n',
    },
  });

  assert.ok(
    (await checkBoundaries(workspace.root, workspace.policyPath)).some(
      (diagnostic) =>
        diagnostic.includes(
          'import "node:fs" violates the Node builtin rule for @huntbound/map-authoring',
        ),
    ),
  );
});
```

This is a guard for the existing checker, so it does not require production code in the new
package.

- [ ] **Step 4: Refresh only the workspace lockfile importer**

Run:

```powershell
corepack pnpm install --lockfile-only --offline
```

Expected: the new importer is recorded, no dependency version changes, exit code `0`.

- [ ] **Step 5: Run the boundary gates**

Run:

```powershell
node --test tools/architecture/check-boundaries.test.ts
corepack pnpm architecture:check
```

Expected: all boundary tests pass and the real workspace has no diagnostics.

---

### Task 2: Fixar o primeiro ciclo RED/GREEN do contrato e do preenchimento

**Files:**
- Create: `packages/map-authoring/src/borderize.test.ts`
- Create: `packages/map-authoring/src/types.ts`
- Create: `packages/map-authoring/src/borderize.ts`
- Create: `packages/map-authoring/src/index.ts`

**Interfaces:**
- Produces `AuthoringCell`, `AuthoringGrid`, `WeightedGround`, `MaterialBorderCase`,
  `MaterialTable`, `BorderizeTables`, `BorderizeSeed` and `borderize`.
- `borderize` returns a new grid with the same `layoutId` and canonical cell order.

- [ ] **Step 1: Write the first failing tests**

Create `packages/map-authoring/src/borderize.test.ts`. The test imports the missing `./index.ts`
and uses this valid table fixture:

```ts
import { describe, expect, it } from 'vitest';
import { borderize } from './index.ts';

const tables = {
  materials: [
    { key: 'floor', serverIds: [10], cases: [] },
    { key: 'mass', serverIds: [100], cases: [] },
    {
      key: 'border',
      serverIds: [200],
      cases: [{ count: 1, serverId: 200, signature: 0 }],
    },
  ],
  floorMaterialKeys: ['floor'],
  massMaterialKey: 'mass',
  borderMaterialKey: 'border',
  massDominantServerId: 100,
  massVariants: [{ serverId: 100, weight: 1 }],
} as const;

describe('borderize', () => {
  it('fills an empty cell with the dominant mass', () => {
    const result = borderize(
      {
        layoutId: 'layout:test',
        cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
      },
      tables,
      'seed-a',
    );

    expect(result.cells[0]?.ground).toBe(100);
  });

  it('preserves an existing floor', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: [{ x: 0, y: 0, z: 8, ground: 10 }],
    } as const;

    expect(borderize(grid, tables, 'seed-a')).toEqual(grid);
  });
});
```

- [ ] **Step 2: Verify the correct RED**

Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: Vitest fails because `packages/map-authoring/src/index.ts` does not exist. Fix a test
typo only if the failure differs; do not add implementation before this failure.

- [ ] **Step 3: Add the minimal public types and implementation**

Create `types.ts` with these exact readonly contracts:

```ts
export const EMPTY_GROUND_ID = 0;

export interface AuthoringCell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ground: number | null;
}

export interface AuthoringGrid {
  readonly layoutId: string;
  readonly cells: readonly AuthoringCell[];
}

export interface WeightedGround {
  readonly serverId: number;
  readonly weight: number;
}

export interface MaterialBorderCase {
  readonly count: number;
  readonly serverId: number;
  readonly signature: number;
}

export interface MaterialTable {
  readonly key: string;
  readonly serverIds: readonly number[];
  readonly cases: readonly MaterialBorderCase[];
}

export interface BorderizeTables {
  readonly materials: readonly MaterialTable[];
  readonly floorMaterialKeys: readonly string[];
  readonly massMaterialKey: string;
  readonly borderMaterialKey: string;
  readonly massDominantServerId: number;
  readonly massVariants: readonly WeightedGround[];
}

export type BorderizeSeed = string | number;
```

Create `index.ts`:

```ts
export { borderize } from './borderize.ts';
export {
  EMPTY_GROUND_ID,
  type AuthoringCell,
  type AuthoringGrid,
  type BorderizeSeed,
  type BorderizeTables,
  type MaterialBorderCase,
  type MaterialTable,
  type WeightedGround,
} from './types.ts';
```

Implement the first minimal `borderize` behavior in `borderize.ts`: copy and sort cells,
preserve floors and replace `0`/null with `massDominantServerId`. Leave nonempty non-floor cells
unchanged until the next RED cycle.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: 2 tests pass with no warnings or skipped tests.

---

### Task 3: Implementar hash de coordenada e seleção ponderada

**Files:**
- Create: `packages/map-authoring/src/hash.ts`
- Modify: `packages/map-authoring/src/borderize.ts`
- Modify: `packages/map-authoring/src/borderize.test.ts`

**Interfaces:**
- Internal `hashCoordinate(seed, layoutId, x, y, z): number` returns an unsigned 32-bit hash.
- Internal `selectWeightedGround(variants, hash): number` returns one declared `serverId`.
- Empty cells use coordinate hashing; invalid empty variant configuration is rejected.

- [ ] **Step 1: Add the failing weighted-selection test**

Add this fixture:

```ts
const weightedTables = {
  ...tables,
  massVariants: [
    { serverId: 100, weight: 3 },
    { serverId: 101, weight: 1 },
  ],
} as const;
```

Add this test:

```ts
it('produces both weighted variations with the dominant one more frequent', () => {
  const grid = {
    layoutId: 'layout:test',
    cells: Array.from({ length: 256 }, (_, index) => ({
      x: index % 16,
      y: Math.floor(index / 16),
      z: 8,
      ground: 0,
    })),
  } as const;

  const grounds = borderize(grid, weightedTables, 'seed-a').cells.map(
    (cell) => cell.ground,
  );
  const dominant = grounds.filter((ground) => ground === 100).length;
  const variant = grounds.filter((ground) => ground === 101).length;

  expect(dominant).toBeGreaterThan(variant);
  expect(variant).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Verify RED for the new behavior**

Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: the new distribution test fails because the minimal implementation always returns
`100`. The same-coordinate stability assertion may pass already; the required RED is the
distribution assertion and must fail for the missing weighted behavior.

- [ ] **Step 3: Implement the deterministic hash**

Create `hash.ts` with FNV-1a-style integer mixing, explicit separators, and unsigned conversion:

```ts
export function hashCoordinate(
  seed: string | number,
  layoutId: string,
  x: number,
  y: number,
  z: number,
): number {
  let hash = 2166136261;
  for (const value of [String(seed), layoutId, String(x), String(y), String(z)]) {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
```

Implement `selectWeightedGround` with positive safe-integer validation, cumulative weights and
`hash % totalWeight`. Preserve the declared variant order.

- [ ] **Step 4: Connect selection and verify GREEN**

Replace direct dominant-id assignment with:

```ts
selectWeightedGround(
  tables.massVariants,
  hashCoordinate(seed, grid.layoutId, cell.x, cell.y, cell.z),
)
```

Add a same-coordinate test using two calls with the same grid, seed and layout. Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: all focused tests pass, both ids appear, and the dominant count is greater.

---

### Task 4: Implementar assinatura, borda, fallback e independência de ordem

**Files:**
- Create: `packages/map-authoring/src/signature.ts`
- Modify: `packages/map-authoring/src/borderize.ts`
- Modify: `packages/map-authoring/src/borderize.test.ts`

**Interfaces:**
- Internal `calculateSignature(cells, center, massIds): number` follows the frozen bit order.
- `borderize` uses only the original cell map for floor adjacency and signatures.
- A mass cell adjacent to a floor receives a matching border case; an absent case receives the
  dominant mass.

- [ ] **Step 1: Add failing tests for north border and fallback**

Use a two-cell grid and case signature `0`, so the north floor is the only populated neighbor:

```ts
const northTables = {
  ...tables,
  materials: [
    { key: 'floor', serverIds: [10], cases: [] },
    { key: 'mass', serverIds: [100], cases: [] },
    {
      key: 'border',
      serverIds: [200],
      cases: [{ count: 1, serverId: 200, signature: 0 }],
    },
  ],
} as const;

it('uses the border table when a mass cell has floor to the north', () => {
  const result = borderize(
    {
      layoutId: 'layout:test',
      cells: [
        { x: 0, y: 0, z: 8, ground: 10 },
        { x: 0, y: 1, z: 8, ground: 100 },
      ],
    },
    northTables,
    'seed-a',
  );

  expect(result.cells.find((cell) => cell.y === 1)?.ground).toBe(200);
});

it('falls back to the dominant mass for an unobserved signature', () => {
  const result = borderize(
    {
      layoutId: 'layout:test',
      cells: [
        { x: 0, y: 0, z: 8, ground: 10 },
        { x: 0, y: 1, z: 8, ground: 100 },
      ],
    },
    tables,
    'seed-a',
  );

  expect(result.cells.find((cell) => cell.y === 1)?.ground).toBe(100);
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: the north-border assertion fails because the current implementation leaves the mass at
`100`; the fallback remains green and proves an absent signature is not an exception.

- [ ] **Step 3: Implement the frozen neighbor order**

Create `signature.ts` with these offsets:

```ts
const NEIGHBORS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
] as const;
```

Set a bit only when the original neighbor exists and its ground belongs to `massIds`. In
`borderize.ts`, detect any floor neighbor from the original map, calculate the signature for the
mass cell, then find the matching border case. Use its `serverId` if present; otherwise use
`massDominantServerId`.

- [ ] **Step 4: Add order and immutability tests**

Add:

```ts
it('does not depend on the input cell order', () => {
  const grid = {
    layoutId: 'layout:test',
    cells: [
      { x: 0, y: 0, z: 8, ground: 10 },
      { x: 0, y: 1, z: 8, ground: 100 },
      { x: 2, y: 0, z: 8, ground: 0 },
    ],
  } as const;
  const shuffled = { ...grid, cells: [...grid.cells].reverse() } as const;

  expect(borderize(grid, northTables, 'seed-a')).toEqual(
    borderize(shuffled, northTables, 'seed-a'),
  );
});

it('does not mutate the input grid', () => {
  const grid = {
    layoutId: 'layout:test',
    cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
  } as const;
  const before = JSON.stringify(grid);

  borderize(grid, tables, 'seed-a');

  expect(JSON.stringify(grid)).toBe(before);
});
```

- [ ] **Step 5: Run focused tests and refactor only after GREEN**

Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: all behavior tests pass. Only after GREEN, extract helpers for coordinate keys, table
lookup or sorting when they remove duplication; rerun the focused suite after each refactor.

---

### Task 5: Fechar validação, tipos e gates locais

**Files:**
- Modify: `packages/map-authoring/src/types.ts`
- Modify: `packages/map-authoring/src/hash.ts`
- Modify: `packages/map-authoring/src/signature.ts`
- Modify: `packages/map-authoring/src/borderize.ts`
- Modify: `packages/map-authoring/src/index.ts`
- Modify: `packages/map-authoring/src/borderize.test.ts`

- [ ] **Step 1: Add validation tests**

Cover these invalid inputs with exact error assertions:
- `floorMaterialKeys` references a missing material;
- a weight is zero or non-integer;
- a border signature is outside `0..255`;
- two cells share the same `x/y/z`;
- `massDominantServerId` is not in the mass material ids.

Each test must keep all other fields valid. Keep missing border signatures as the valid fallback path.

- [ ] **Step 2: Implement validation without changing valid behavior**

Validate safe-integer coordinates, unique coordinates, material references, disjoint ids between
materials, positive safe-integer weights, dominant-id membership and signatures in `0..255`.
Build lookup maps once per call. Do not sort weighted variants before selection; only sort output
cells.

- [ ] **Step 3: Run focused typecheck and tests**

Run:

```powershell
corepack pnpm --filter @huntbound/map-authoring typecheck
corepack pnpm --filter @huntbound/map-authoring test
```

Expected: both exit `0`, with no TypeScript diagnostics, skipped tests or warnings.

- [ ] **Step 4: Run the architecture and complete test gates**

Run:

```powershell
corepack pnpm architecture:check
corepack pnpm typecheck
corepack pnpm test
```

Expected: the package is discovered by the workspace, boundary policy is clean, all package/tool
tests pass, and no generated artifact or golden changes are produced.

---

### Task 6: Registrar estado, integrar e verificar a `main`

**Files:**
- Modify: `docs/projects/map-editor/STATE.md` (somente a linha de MB-02)

- [ ] **Step 1: Run full verification in the task worktree**

Run:

```powershell
corepack pnpm verify
```

Expected: all blocking gates pass, including typecheck, package tests, architecture, build and
browser correctness. Preserve any failure output; do not retry to mask a failure or weaken a gate.

- [ ] **Step 2: Update only the MB-02 row**

Replace only that row with:

```markdown
| MB-02 | done | `codex/mb-02-borderize-pure` | `feat: decide map borders from the measured table` | GPT-5 (Codex), esforço padrão |
```

Do not edit B1, B2, other task rows or frozen decisions.

- [ ] **Step 3: Commit with the task's frozen message**

Run:

```powershell
git add packages/map-authoring tools/architecture/dependency-policy.json tools/architecture/check-boundaries.test.ts pnpm-lock.yaml docs/projects/map-editor/STATE.md
git commit -m "feat: decide map borders from the measured table"
```

Expected: the commit contains the package, tests, boundary registration, lockfile importer and
single state-row update. Never use `--no-verify`.

- [ ] **Step 4: Fast-forward into `main`**

From `C:\Kaezan\kaezan-huntbound`, confirm the main worktree is clean and run:

```powershell
git merge --ff-only codex/mb-02-borderize-pure
```

Expected: fast-forward succeeds without conflict or merge commit.

- [ ] **Step 5: Repeat full verification after integration**

Run from the main worktree:

```powershell
corepack pnpm verify
```

Expected: the same gates pass after integration. Use this fresh output in the final report.

- [ ] **Step 6: Remove only the validated task worktree and branch**

After confirming no task process is running, run:

```powershell
git worktree remove C:\Kaezan\kaezan-huntbound-mb-02-borderize-pure
git worktree prune
git branch -d codex/mb-02-borderize-pure
git status --porcelain
git branch --no-merged main
git worktree list
```

Expected: the task worktree is gone, its branch is merged and deleted, and the final checks show a
clean `main`, no unmerged task branch for MB-02 and only the expected existing worktrees/branches.







