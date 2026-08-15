# PB-04 Hunt Experience Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the first hunt into a connected, finite Huntbound dungeon and correct its camera, floor composition, actor motion, input cadence, replay gate, and human product acceptance before PB-05.

**Architecture:** Keep the 50 ms deterministic kernel unchanged. Insert a versioned offline remix recipe between OTBM extraction and generated runtime content, validate one reachable walkable component per floor, and keep the runtime `MapRegion` contract stable. In the browser, separate camera framing, stacked-ground composition, actor motion sampling, and input tick gating into pure tested helpers consumed by `HuntScene`.

**Tech Stack:** TypeScript 7 strict, Vitest 4, Phaser 4.2, Vite 8, Playwright 1.62, Node 24, pnpm 11, canonical JSON and the existing headless simulation/replay tools.

## Global Constraints

- `TICK_DURATION_MS = 50` and `MAX_FRAME_DELTA_MS = 250` remain unchanged.
- PB-03's scenario, command log, snapshot, event journal, and SHA-256 sidecars remain byte-identical.
- Runtime simulation remains independent of Phaser, DOM, assets, Tibia identities, and authoring recipes.
- The OTBM and monster XML remain locked source material; the final geometry is a Huntbound-authored remix.
- Every floor has exactly one reachable walkable component under the existing eight-direction and diagonal-corner rules.
- Player start, every spawn slot, and both ends of every transition are reachable.
- `targetVisibleRows = 11`; each required viewport must show 10–12 complete world rows after camera zoom.
- Palette server id `0` never produces a pure-black visible hole.
- A visual step lasts the same number of ticks as `stepCostTicks(baseTicks, direction)`.
- Held input produces at most one command for each observed simulation tick, never one command per render frame.
- No combat, damage, death, loot, spell, vocation, save, inventory, gacha, helper, or PB-05+ feature enters this work.
- No new external dependency enters the workspace.
- PB-05 remains blocked until the user approves the personal-profile playtest and PB-04-10 closes.

---

## File Structure

### Offline authoring and validation

- `tools/map-extractor/layout.ts` — recipe types, strict parsing, deterministic tile/spawn/transition remapping.
- `tools/map-extractor/layout.test.ts` — synthetic proof of ordered copy/erase/stamp operations and placement validation.
- `tools/map-extractor/topology.ts` — reachability analysis using the same diagonal-corner rule as the kernel.
- `tools/map-extractor/topology.test.ts` — disconnected floor and unreachable functional-point failures.
- `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — versioned Huntbound remix recipe.
- Existing extractor, selection, generated hunt, and asset artifacts — integration points and generated outputs.

### Browser presentation

- `apps/game/src/hunt/CameraFraming.ts` — zoom and centered-scroll calculations.
- `apps/game/src/hunt/GroundCompositor.ts` — active-floor/lower-floor ground resolution.
- `apps/game/src/hunt/ActorMotion.ts` — per-actor movement segments and render-time sampling.
- `apps/game/src/input/TickInputGate.ts` — one input sample per observed simulation tick.
- Existing `HuntPresentation.ts`, `HuntScene.ts`, and probes — composition only.

### Determinism and acceptance

- `packages/test-fixtures/hunt/pb04/` — materialized 600-tick scenario, command log, goldens, and hashes.
- `tests/e2e/` — camera, navigation, input, presentation, screenshots, and replay parity.
- PB-04 state, QA, and acceptance documents — objective evidence plus the user's manual sign-off.

---

### Task 1: Add the deterministic remix recipe and topology gate

**Files:**

- Create: `tools/map-extractor/layout.ts`
- Create: `tools/map-extractor/layout.test.ts`
- Create: `tools/map-extractor/topology.ts`
- Create: `tools/map-extractor/topology.test.ts`
- Modify: `tools/map-extractor/extract.ts`
- Modify: `tools/map-extractor/spawns.ts`
- Modify: `tools/map-extractor/transitions.ts`
- Modify: `tools/map-extractor/types.ts`
- Modify: `tools/map-extractor/cli.ts`
- Modify: `tools/map-extractor/cli.test.ts`
- Modify: `tools/hunt-selection/types.ts`
- Modify: `tools/hunt-selection/validateHuntSelection.ts`
- Modify: `tools/hunt-selection/validateHuntSelection.test.ts`

**Interfaces:**

- Consumes: `OtbmTile`, `HuntSelection`, `MapRegion`, `SpawnTable`, `TransitionTable`.
- Produces:

```ts
export interface HuntLayoutRecipe {
  readonly schemaVersion: 1;
  readonly layoutId: string;
  readonly width: number;
  readonly height: number;
  readonly floors: readonly {
    readonly z: number;
    readonly operations: readonly HuntLayoutOperation[];
  }[];
  readonly playerStart: GridPosition;
  readonly transitions: readonly TransitionEntry[];
  readonly spawnPlacements: readonly {
    readonly source: { readonly x: number; readonly y: number; readonly z: number };
    readonly target: GridPosition;
  }[];
}

export type HuntLayoutOperation =
  | {
      readonly kind: 'copy-rect';
      readonly from: { readonly minX: number; readonly minY: number; readonly z: number };
      readonly width: number;
      readonly height: number;
      readonly to: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: 'copy-cell';
      readonly from: { readonly x: number; readonly y: number; readonly z: number };
      readonly to: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: 'erase-rect';
      readonly at: { readonly x: number; readonly y: number };
      readonly width: number;
      readonly height: number;
    };

export function parseHuntLayoutRecipe(
  raw: unknown,
  sourceRegion: HuntSelectionRegion,
): HuntLayoutRecipe;

export function applyHuntLayout(
  sourceTiles: readonly OtbmTile[],
  recipe: HuntLayoutRecipe,
): readonly OtbmTile[];

export interface HuntTopologyReport {
  readonly floors: readonly {
    readonly z: number;
    readonly walkableTiles: number;
    readonly componentCount: number;
    readonly unreachable: readonly number[];
  }[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export function analyzeHuntTopology(hunt: HuntDefinition): HuntTopologyReport;
```

- Add blocking extraction diagnostics `HUNT_LAYOUT_INVALID`, `HUNT_WALKABLE_DISCONNECTED`, `HUNT_PLAYER_START_UNREACHABLE`, `HUNT_SPAWN_UNREACHABLE`, and `HUNT_TRANSITION_UNREACHABLE`.
- Add `layout: string` to `HuntSelection`; it is a safe repo-relative path resolved relative to the selection file, not a snapshot source path.

- [ ] **Step 1: Write failing layout parser tests**

```ts
it('rejects an operation whose target leaves the authored region', () => {
  expect(() =>
    parseHuntLayoutRecipe(
      {
        schemaVersion: 1,
        layoutId: 'layout:huntbound:test',
        width: 4,
        height: 4,
        floors: [{
          z: 8,
          operations: [{
            kind: 'copy-rect',
            from: { minX: 100, minY: 200, z: 8 },
            width: 2,
            height: 2,
            to: { x: 3, y: 3 },
          }],
        }],
        playerStart: { x: 0, y: 0, z: 8 },
        transitions: [],
        spawnPlacements: [],
      },
      { minX: 100, minY: 200, maxX: 103, maxY: 203, floors: [8] },
    ),
  ).toThrow(/HUNT_LAYOUT_INVALID/);
});
```

- [ ] **Step 2: Run the focused extractor suite and confirm RED**

Run:

```powershell
corepack pnpm exec vitest run --config tools/map-extractor/vitest.config.ts tools/map-extractor/layout.test.ts
```

Expected: FAIL because `layout.ts` and `parseHuntLayoutRecipe` do not exist.

- [ ] **Step 3: Implement strict parsing and ordered tile operations**

Implement parsing without a new schema library. Reject unknown keys, unsafe integers, duplicate floor z values, source coordinates outside `sourceRegion`, target rectangles outside recipe bounds, duplicate spawn sources, and functional points outside the recipe. `applyHuntLayout` starts every authored floor empty, applies operations in JSON order, copies complete OTBM item stacks into recipe-local coordinates, and returns tiles sorted by `(z, y, x)`. The extractor calls `buildMapRegion` with local bounds `0..width-1 × 0..height-1`, so generated remix regions have `origin={x:0,y:0}` instead of claiming Tibia world coordinates.

- [ ] **Step 4: Prove operation order and byte stability**

```ts
it('applies copy, erase, and copy-cell in declared order', () => {
  const output = applyHuntLayout(sourceTiles, recipe);

  expect(output).toEqual([
    { x: 0, y: 0, z: 8, items: [100, 200] },
    { x: 1, y: 0, z: 8, items: [100] },
  ]);
  expect(applyHuntLayout(sourceTiles, recipe)).toEqual(output);
});
```

- [ ] **Step 5: Write failing topology tests**

Build a synthetic 7×5 hunt with two walkable islands, one spawn on the second island, and a transition landing there. Assert all three blocking diagnostics and canonical diagnostic order.

```ts
const report = analyzeHuntTopology(disconnectedHunt());

expect(report.floors).toEqual([
  { z: 8, walkableTiles: 6, componentCount: 2, unreachable: [19, 20, 26] },
]);
expect(report.diagnostics.map(({ code }) => code)).toEqual([
  'HUNT_SPAWN_UNREACHABLE',
  'HUNT_TRANSITION_UNREACHABLE',
  'HUNT_WALKABLE_DISCONNECTED',
]);
```

- [ ] **Step 6: Implement reachability with kernel-equivalent corner rules**

Use eight candidate directions. A diagonal edge is traversable only when the horizontal and vertical adjacent cells are both in bounds and not in `floor.collision`. The root is `playerStart` on its floor; for other floors, roots are reachable transition destinations. Analyze floors in transition-reachability order and sort diagnostics by path, code, then message.

- [ ] **Step 7: Integrate recipe loading into the extractor CLI**

Resolve `selection.layout` relative to the selection JSON. Parse and apply the recipe before `buildMapRegion`; remap selected XML spawn slots through `spawnPlacements`; use the recipe's explicit transition table and `playerStart`; then call `analyzeHuntTopology`. Any topology diagnostic is blocking. Include the layout file's SHA-256 and component counts in the CLI summary and `--check` output.

- [ ] **Step 8: Run Task 1 gates**

```powershell
corepack pnpm exec vitest run --config tools/map-extractor/vitest.config.ts
corepack pnpm exec vitest run --config tools/hunt-selection/vitest.config.ts
corepack pnpm typecheck
corepack pnpm architecture:check
corepack pnpm format:check
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 9: Commit Task 1**

```powershell
git add tools/map-extractor tools/hunt-selection
git commit -m "feat: compile connected hunt remixes"
```

---

### Task 2: Author and generate the connected Venore remix

**Files:**

- Create: `packages/content/src/layouts/hunts/venore-rotworm-cave.json`
- Modify: `packages/content/src/selections/hunts/venore-rotworm-cave.json`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/region.json`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/region.sha256`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/transitions.json`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/transitions.sha256`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/spawns.json`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/spawns.sha256`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json`
- Modify: `packages/content/src/generated/hunts/venore-rotworm-cave/hunt.sha256`
- Modify: `tools/map-extractor/extract.test.ts`
- Create: `tools/map-extractor/generatedTopology.test.ts`
- Modify: `tools/asset-packer/hunt/huntArtifacts.test.ts`
- Regenerate: `packages/test-fixtures/assets/pb04/selection.json`
- Regenerate: `packages/test-fixtures/assets/pb04/expected/test/**`
- Regenerate: `packages/test-fixtures/assets/pb04/expected/product/**`
- Modify: `docs/content/PB-04-SELECTION.md`
- Modify: `docs/content/MAP_REGION_CONTRACT.md`

**Interfaces:**

- Consumes: Task 1's `HuntLayoutRecipe`, extractor CLI, and topology report.
- Produces: the same runtime `HuntDefinition` shape and stable asset keys; no runtime schema bump.

- [ ] **Step 1: Record the current topology as a failing regression test**

Read the generated hunt and assert the desired result:

```ts
import { readFileSync } from 'node:fs';

import type { HuntDefinition } from '../../packages/contracts/src/index.ts';

const hunt = JSON.parse(
  readFileSync(
    'packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json',
    'utf8',
  ),
) as HuntDefinition;

it('generates one connected component on each authored floor', () => {
  const report = analyzeHuntTopology(hunt);

  expect(report.diagnostics).toEqual([]);
  expect(report.floors.map(({ z, componentCount }) => ({ z, componentCount })))
    .toEqual([
      { z: 8, componentCount: 1 },
      { z: 9, componentCount: 1 },
    ]);
});
```

Run the focused test before creating the recipe. Expected: RED because floor 9 currently has four components of sizes `37`, `35`, `32`, and `32`.

- [ ] **Step 2: Author the upper-floor dungeon recipe**

Use the existing connected upper-floor component at local bounds `x=5..24`, `y=9..27` as source material. Reposition it with at least a two-tile non-walkable visual border. Keep one intentional entrance chamber, one loop through the middle, two smaller connected chambers, and one route to the lower-floor transition. Remove three of the four current transition points; the final upper floor has exactly one down transition and no unreachable walkable tile.

- [ ] **Step 3: Author the lower-floor covil/arena recipe**

Use the current lower-floor rooms as visual stamps, not as separate spots. Build one connected lower floor with a short approach and one open chamber. Preserve enough wall and border tiles that a 10–12-row camera never sees an abrupt raw crop while the player occupies normal walkable cells. Place exactly one return transition in the approach and move all retained rotworm spawn slots into the connected component with at least one free adjacent tile each.

The final recipe must satisfy these content assertions:

```ts
expect(hunt.transitions.entries).toHaveLength(2);
expect(hunt.transitions.entries[1]?.from).toEqual(hunt.transitions.entries[0]?.to);
expect(hunt.transitions.entries[1]?.to).toEqual(hunt.transitions.entries[0]?.from);
expect(hunt.spawns.groups.flatMap((group) => group.slots)).toHaveLength(12);
expect(hunt.playerStart.z).toBe(8);
```

- [ ] **Step 4: Generate content twice and prove idempotence**

Before generation, bump `HUNT_REVISION` and `REGION_REVISION` in `tools/map-extractor/extract.ts`
from `1` to `2`; the authored geometry and all coordinate-bearing tables changed.

```powershell
corepack pnpm hunt:extract
git diff -- packages/content/src/generated/hunts/venore-rotworm-cave
corepack pnpm hunt:extract:check
corepack pnpm hunt:extract:check
```

Expected: both checks exit `0`; the second check changes no file.

- [ ] **Step 5: Regenerate the hunt asset selections and test packs**

```powershell
corepack pnpm assets:pb04:artifacts:check
```

Expected initially: FAIL because region SHA and required tile keys changed.

Regenerate the synthetic selection, source lock, and profile outputs with these commands:

```powershell
node --no-warnings --experimental-transform-types tools/asset-packer/hunt/generateArtifacts.ts
node --no-warnings --experimental-transform-types tools/asset-packer/cli.ts build-profile --profile test --selection packages/test-fixtures/assets/pb04/selection.json --source-lock packages/test-fixtures/assets/pb04/source-lock.json --source-root packages/test-fixtures/assets/pb04/source --output packages/test-fixtures/assets/pb04/expected/test
node --no-warnings --experimental-transform-types tools/asset-packer/cli.ts build-profile --profile product --selection packages/test-fixtures/assets/pb04/selection.json --source-lock packages/test-fixtures/assets/pb04/source-lock.json --source-root packages/test-fixtures/assets/pb04/source --output packages/test-fixtures/assets/pb04/expected/product
```

Then run:

```powershell
corepack pnpm assets:pb04:artifacts:check
corepack pnpm assets:pb04:pack:check
corepack pnpm assets:pb04:profile:check
corepack pnpm assets:pb04:hunt:check
```

Expected: all exit `0`. Do not commit `apps/game/public/assets/personal/**`.

- [ ] **Step 6: Update selection and map-contract documentation**

Record that the OTBM bounds are the source-material envelope, the recipe SHA identifies the final geometry, geometry fidelity is not required, each floor has one component, and the final generated counts for width, height, palette, walkable cells, transitions, spawns, and empty cells.

- [ ] **Step 7: Run Task 2 gates**

```powershell
corepack pnpm hunt:extract:sidecar
corepack pnpm assets:check
corepack pnpm content:check
corepack pnpm test
corepack pnpm typecheck
corepack pnpm format:check
git diff --check
```

Expected: all exit `0`.

- [ ] **Step 8: Commit Task 2**

```powershell
git add packages/content packages/test-fixtures/assets tools/asset-packer tools/map-extractor docs/content
git commit -m "feat: curate the first connected hunt"
```

---

### Task 3: Correct stacked ground composition and Tibia-like camera framing

**Files:**

- Create: `apps/game/src/hunt/CameraFraming.ts`
- Create: `apps/game/src/hunt/CameraFraming.test.ts`
- Create: `apps/game/src/hunt/GroundCompositor.ts`
- Create: `apps/game/src/hunt/GroundCompositor.test.ts`
- Modify: `apps/game/src/hunt/CameraController.ts`
- Modify: `apps/game/src/hunt/CameraController.test.ts`
- Modify: `apps/game/src/hunt/HuntPresentation.ts`
- Modify: `apps/game/src/hunt/HuntPresentation.test.ts`
- Modify: `apps/game/src/phaser/scenes/HuntScene.ts`
- Modify: `apps/game/src/hunt/HuntProbe.ts`
- Modify: `apps/game/src/hunt/HuntProbe.test.ts`

**Interfaces:**

```ts
export const TARGET_VISIBLE_ROWS = 11;
export const MIN_VISIBLE_ROWS = 10;
export const MAX_VISIBLE_ROWS = 12;

export interface CameraFraming {
  readonly zoom: number;
  readonly visibleRows: number;
}

export function calculateCameraFraming(input: {
  readonly viewportHeight: number;
  readonly tileSize: number;
}): CameraFraming;

export function centeredCameraScroll(input: {
  readonly targetX: number;
  readonly targetY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly zoom: number;
}): { readonly scrollX: number; readonly scrollY: number };

export interface GroundSample {
  readonly paletteIndex: number;
  readonly sourceZ: number;
}

export function resolveGroundSample(
  region: MapRegion,
  activeZ: number,
  cellIndex: number,
): GroundSample | undefined;
```

- [ ] **Step 1: Write failing camera framing tests for all required viewports**

```ts
for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  it(`frames ${viewport.width}x${viewport.height} at 10-12 rows`, () => {
    const framing = calculateCameraFraming({
      viewportHeight: viewport.height,
      tileSize: 32,
    });

    expect(framing.visibleRows).toBeGreaterThanOrEqual(10);
    expect(framing.visibleRows).toBeLessThanOrEqual(12);
  });
}
```

Run:

```powershell
corepack pnpm --filter @huntbound/game test -- CameraFraming.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement fixed-row zoom and centered scroll**

Compute `zoom = viewportHeight / (TARGET_VISIBLE_ROWS * tileSize)` and `visibleRows = viewportHeight / (tileSize * zoom)`. Reject non-finite or non-positive dimensions. Center scroll in world units:

```ts
const scrollX = targetX - viewportWidth / (2 * zoom);
const scrollY = targetY - viewportHeight / (2 * zoom);
```

Do not clamp scroll to the authored bounding box; a dark cave backdrop handles the small finite-map margin and keeps the player centered.

- [ ] **Step 3: Write failing stacked-ground tests**

Extend the existing two-floor synthetic region so an active-floor void has real ground below and another cell is void on every floor.

```ts
expect(resolveGroundSample(region, 7, 3)).toEqual({
  paletteIndex: 1,
  sourceZ: 8,
});
expect(resolveGroundSample(region, 8, 3)).toBeUndefined();
```

- [ ] **Step 4: Implement lower-floor ground resolution**

Search the active floor first, then floors with increasing `z`. A palette entry resolves only when its server id is a positive safe integer. Return no sprite when every floor is void; `HuntScene` fills those pixels with the cave backdrop color `#24120e`, never black.

- [ ] **Step 5: Integrate composition into `HuntPresentation`**

Use `resolveGroundSample` for the ground layer. Keep `objectsBelow`, actors, and `objectsAbove` from the active floor only. Add `sourceZ` to ground draw commands so unit tests and the probe distinguish active ground from ground seen through an opening.

- [ ] **Step 6: Integrate framing into `HuntScene`**

On create and resize:

```ts
const framing = calculateCameraFraming({
  viewportHeight: this.scale.height,
  tileSize: this.tileSize,
});
this.cameras.main.setZoom(framing.zoom);
this.cameras.main.setBackgroundColor('#24120e');
```

Replace the large deadzone controller with centered scroll sampled from the player's interpolated world position. Keep `roundPixels = true`. Remove `setBounds` clamping that exposes the whole `29×33` region and pushes the player away from center.

- [ ] **Step 7: Extend the test probe**

Add `zoom`, `visibleRows`, `composedGroundCells`, and `unresolvedGroundCells` to `HuntProbeState.camera/drawn`. The unresolved count is the number of visible authored cells for which `resolveGroundSample` returned `undefined`; this may exist only outside the connected dungeon border and is painted by the cave backdrop.

- [ ] **Step 8: Run Task 3 gates**

```powershell
corepack pnpm --filter @huntbound/game test
corepack pnpm --filter @huntbound/game typecheck
corepack pnpm architecture:check
corepack pnpm format:check
git diff --check
```

Expected: all exit `0`.

- [ ] **Step 9: Commit Task 3**

```powershell
git add apps/game/src/hunt apps/game/src/phaser/scenes/HuntScene.ts
git commit -m "fix: frame and compose the hunt like Tibia"
```

---

### Task 4: Make actor motion and held input follow simulation time

**Files:**

- Create: `apps/game/src/hunt/ActorMotion.ts`
- Create: `apps/game/src/hunt/ActorMotion.test.ts`
- Create: `apps/game/src/hunt/ActorFrame.ts`
- Create: `apps/game/src/hunt/ActorFrame.test.ts`
- Create: `apps/game/src/input/TickInputGate.ts`
- Create: `apps/game/src/input/TickInputGate.test.ts`
- Modify: `apps/game/src/hunt/HuntPresentation.ts`
- Modify: `apps/game/src/hunt/HuntPresentation.test.ts`
- Modify: `apps/game/src/phaser/scenes/HuntScene.ts`
- Modify: `apps/game/src/input/InputMap.test.ts`

**Interfaces:**

```ts
export interface ActorMotionSegment {
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly startTick: number;
  readonly durationTicks: number;
}

export function createActorMotion(input: {
  readonly event: Extract<SimulationEventPayload, { type: 'actor/moved' }>;
  readonly eventTick: number;
  readonly baseStepTicks: number;
}): ActorMotionSegment;

export function sampleActorMotion(
  motion: ActorMotionSegment,
  renderTick: number,
): GridPosition;

export function renderTick(tick: number, alpha: number): number;

export interface TickInputGate {
  take(tick: number): boolean;
  reset(): void;
}

export function createTickInputGate(): TickInputGate;
```

- [ ] **Step 1: Write failing motion-duration tests**

```ts
const moved = (
  from: GridPosition,
  to: GridPosition,
  facing: Direction,
): Extract<SimulationEventPayload, { type: 'actor/moved' }> => ({
  type: 'actor/moved',
  entityId: 1 as EntityId,
  from,
  to,
  facing,
});

it('uses the full logical step duration', () => {
  const motion = createActorMotion({
    event: moved({ x: 0, y: 0, z: 8 }, { x: 1, y: 0, z: 8 }, 'e'),
    eventTick: 12,
    baseStepTicks: 2,
  });

  expect(sampleActorMotion(motion, 12)).toEqual({ x: 0, y: 0, z: 8 });
  expect(sampleActorMotion(motion, 13)).toEqual({ x: 0.5, y: 0, z: 8 });
  expect(sampleActorMotion(motion, 14)).toEqual({ x: 1, y: 0, z: 8 });
});

it('uses three ticks for a diagonal when baseStepTicks is two', () => {
  expect(createActorMotion({
    event: moved({ x: 0, y: 0, z: 8 }, { x: 1, y: 1, z: 8 }, 'se'),
    eventTick: 20,
    baseStepTicks: 2,
  }).durationTicks).toBe(3);
});
```

- [ ] **Step 2: Implement per-actor segments using the shared kernel helper**

Import `stepCostTicks` from `@huntbound/simulation`; do not duplicate the diagonal formula. Clamp progress to `[0, 1]`. Define `renderTick(driver.tick, driver.alpha)` as `Math.max(0, driver.tick - 1 + clampedAlpha)` so an event emitted at tick `t` starts at its source cell immediately after that tick is processed.

- [ ] **Step 3: Store motion in `HuntPresentation`**

Pass a `stepCooldownTicksByBlueprint: ReadonlyMap<string, number>` option created from `hunt.blueprints`. On `actor/moved`, create a segment from the event's own `from`, `to`, `facing`, and `tick`. `actor/move-blocked` leaves the segment unchanged. Spawn and transition snap without cross-floor interpolation. Replace `previous/target + global alpha` with `motion + sampleActorMotion`.

- [ ] **Step 4: Write and implement actor-frame tests**

Map Tibia's four directional patterns as south `0`, east `1`, north `2`, west `3`; diagonals use their horizontal facing. Use the selected animation group's `patternX`, `patternY`, `patternZ`, `layers`, `startFrame`, and phase count. Keep `patternY=0`, `patternZ=0`, and `layer=0` in PB-04; outfit recolor/addon layer composition remains PB-07.

Use this exact flattened-atlas index, with `phase` clamped to the available phase count:

```ts
const frame =
  animation.startFrame +
  (((phase * Math.max(animation.patternZ, 1) + 0) *
      Math.max(animation.patternY, 1) +
      0) *
      Math.max(animation.patternX, 1) +
    directionPattern) *
    animation.layers;
```

```ts
const moving = movingAsset.animations.find(({ kind }) => kind === 'moving');
if (moving === undefined) throw new Error('moving fixture is missing');

expect(actorFrame(movingAsset, 'e', 0)).toBe(
  moving.startFrame + moving.layers,
);
expect(actorFrame(movingAsset, 'n', 1)).toBeGreaterThan(
  actorFrame(movingAsset, 'n', 0),
);
expect(actorFrame(singleFrameAsset, 'w', 0.8)).toBe(0);
```

Advance the moving phase from segment progress; use the idle group when no incomplete segment exists. Apply `sprite.setFrame(frame)` only when `atlasFrameCount > 1`.

- [ ] **Step 5: Write failing tick-input gate tests**

```ts
it('takes once per observed tick and never catches up with a burst', () => {
  const gate = createTickInputGate();

  expect(gate.take(10)).toBe(true);
  expect(gate.take(10)).toBe(false);
  expect(gate.take(13)).toBe(true);
  expect(gate.take(13)).toBe(false);
});
```

- [ ] **Step 6: Gate `InputMap.drain()` in `HuntScene`**

Before `driver.advanceTo(time)`, call `inputGate.take(driver.tick)`. Drain and enqueue at most one action only when it returns `true`. A skipped render interval emits one current-tick command, never one command for every missed tick. Reset the gate on scene create/shutdown.

- [ ] **Step 7: Prove blocked moves do not animate and repeated rendering stays monotonic**

Extend `HuntPresentation.test.ts` with actor samples at 0%, 25%, 50%, 100%, and after completion. Handle an intervening `actor/move-blocked` and assert every sampled coordinate remains monotonic and within the segment endpoints.

- [ ] **Step 8: Run Task 4 gates**

```powershell
corepack pnpm --filter @huntbound/game test
corepack pnpm --filter @huntbound/game typecheck
corepack pnpm simulation:check
corepack pnpm architecture:check
corepack pnpm format:check
git diff --check
```

Expected: all exit `0`; `simulation:check` prints the same PB-03 hashes as before the task.

- [ ] **Step 9: Commit Task 4**

```powershell
git add apps/game/src/hunt apps/game/src/input apps/game/src/phaser/scenes/HuntScene.ts
git commit -m "fix: pace hunt actors by simulation time"
```

---

### Task 5: Materialize the missing PB-04 replay fixture and gate

**Files:**

- Create: `packages/test-fixtures/hunt/pb04/scenario.json`
- Create: `packages/test-fixtures/hunt/pb04/scenario.sha256`
- Create: `packages/test-fixtures/hunt/pb04/commands.jsonl`
- Create: `packages/test-fixtures/hunt/pb04/commands.sha256`
- Create: `packages/test-fixtures/hunt/pb04/snapshot.golden.json`
- Create: `packages/test-fixtures/hunt/pb04/snapshot.golden.sha256`
- Create: `packages/test-fixtures/hunt/pb04/events.golden.jsonl`
- Create: `packages/test-fixtures/hunt/pb04/events.golden.sha256`
- Create: `packages/test-fixtures/hunt/pb04/hashes.md`
- Create: `packages/test-fixtures/hunt/pb04-respawn/scenario.json`
- Create: `packages/test-fixtures/hunt/pb04-respawn/scenario.sha256`
- Create: `packages/test-fixtures/hunt/pb04-respawn/commands.jsonl`
- Create: `packages/test-fixtures/hunt/pb04-respawn/commands.sha256`
- Create: `packages/test-fixtures/hunt/pb04-respawn/snapshot.golden.json`
- Create: `packages/test-fixtures/hunt/pb04-respawn/snapshot.golden.sha256`
- Create: `packages/test-fixtures/hunt/pb04-respawn/events.golden.jsonl`
- Create: `packages/test-fixtures/hunt/pb04-respawn/events.golden.sha256`
- Create: `packages/test-fixtures/hunt/pb04-respawn/hashes.md`
- Create: `tools/replay/pb04HuntFixture.test.ts`
- Modify: `tests/e2e/support/huntSession.ts`
- Modify: `tests/e2e/support/huntSession.test.ts`
- Modify: `tests/e2e/hunt-replay.spec.ts`
- Modify: `package.json`
- Modify: `biome.json` only if generated goldens require the same exclusion already used by PB-03
- Modify: `docs/simulation/REPLAY_CONTRACT.md`
- Modify: `docs/playbooks/PB-04/tasks/PB-04-06-construir-cenario-e-replay-da-hunt.md`
- Modify: `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`

**Interfaces:**

- Consumes: corrected generated `hunt.json`, `buildHuntScenario`, replay CLI, and browser kernel probe.
- Produces: root script `hunt:check` and one source of truth for Node/browser PB-04 replay.

- [ ] **Step 1: Replace the old hard-coded browser route with a fixture contract test**

Read `scenario.json` and `commands.jsonl` from `packages/test-fixtures/hunt/pb04`. Assert header values exactly:

```ts
expect(log.header).toMatchObject({
  scenarioId: 'scenario:hunt:tibia:venore-rotworm-cave',
  seed: '1a2b3c4d5e6f7a8b',
  tickCount: 600,
});
```

Expected initial result: RED because the fixture files do not exist.

- [ ] **Step 2: Generate `scenario.json` from the corrected hunt**

Call `buildHuntScenario` with seed `1a2b3c4d5e6f7a8b` and encode with `encodeCanonicalJson`. Do not hand-edit the scenario. Assert two floors, two directed transitions, all 12 spawn slots, player blueprint, and the corrected `scenarioRevision`.

- [ ] **Step 3: Author the static external command log**

Use only issuer `player` in the main session. Schedule movement no more frequently than every four ticks. The route must deliberately cover movement on both floors, one transition in each direction, terrain blocking, occupied blocking, `spawn/deferred`, and one rejected player command targeting an unknown entity. Do not place a scenario despawn command in this player-only log.

- [ ] **Step 4: Assert coverage before writing goldens**

```ts
expect(coverage.finalTick).toBe(600);
expect(coverage.playerMoves).toBeGreaterThan(0);
expect(coverage.playerTransitions).toBeGreaterThanOrEqual(2);
expect(coverage.playerBlockedReasons).toEqual(
  expect.arrayContaining(['terrain', 'occupied']),
);
expect(coverage.eventTypes).toEqual(
  expect.arrayContaining(['spawn/deferred', 'command/rejected']),
);
```

If the corrected topology cannot deliver this coverage, correct the command route; do not weaken the assertions.

- [ ] **Step 5: Generate goldens and sidecars with the replay CLI**

```powershell
node --no-warnings --experimental-transform-types tools/replay/cli.ts run --scenario packages/test-fixtures/hunt/pb04/scenario.json --log packages/test-fixtures/hunt/pb04/commands.jsonl --out packages/test-fixtures/hunt/pb04
```

Record all four SHA-256 values and the event count in `hashes.md` with the route-coverage matrix.

- [ ] **Step 6: Add a focused real-respawn fixture without corrupting the 600-tick contract**

The source `spawntime=90` seconds is `1,800` ticks, so a full respawn cannot occur inside the frozen
600-tick main session. Materialize the same scenario under `pb04-respawn`, use a log header with
`tickCount=1805`, and enqueue one `scenario/despawn-actor` command at tick `1` for a rotworm that the
boot deterministically spawned. Assert `actor/despawned`, the slot waiting for 1,800 ticks, and a
later `actor/spawned` for the same blueprint. This supplementary fixture preserves both frozen facts:
the main browser-parity session remains 600 ticks, and real 90-second respawn is still proven.

Add a dated correction note to PB-04-06 and the original PB-04 design: the respawn proof is in the
supplementary real-scenario fixture because fitting 1,800 ticks into 600 was arithmetically
impossible. Do not change `respawnTicks`, `TICK_DURATION_MS`, or the source XML meaning.

- [ ] **Step 7: Prove snapshot-resume convergence**

In `pb04HuntFixture.test.ts`, run the main fixture twice and compare canonical snapshot/event bytes.
Restore at every boundary `0..600` and assert convergence with the uninterrupted run. For the
respawn fixture, restore at `0`, `1`, `2`, `1800`, `1801`, and `1805`. Mutate seed, a state-changing
command, a blocked command, and `rulesVersion`, asserting the same distinctions required by PB-04-06.

- [ ] **Step 8: Add `hunt:check` to root gates**

Add:

```json
"hunt:check": "node --no-warnings --experimental-transform-types tools/replay/cli.ts verify --scenario packages/test-fixtures/hunt/pb04/scenario.json --log packages/test-fixtures/hunt/pb04/commands.jsonl --snapshot packages/test-fixtures/hunt/pb04/snapshot.golden.json --events packages/test-fixtures/hunt/pb04/events.golden.jsonl && node --no-warnings --experimental-transform-types tools/replay/cli.ts verify --scenario packages/test-fixtures/hunt/pb04-respawn/scenario.json --log packages/test-fixtures/hunt/pb04-respawn/commands.jsonl --snapshot packages/test-fixtures/hunt/pb04-respawn/snapshot.golden.json --events packages/test-fixtures/hunt/pb04-respawn/events.golden.jsonl"
```

Run `hunt:check` immediately after `simulation:check` in both `check` and `verify`.

- [ ] **Step 9: Make browser replay consume the materialized fixture**

Delete route construction from `tests/e2e/support/huntSession.ts`. Read canonical fixture text and compare Chromium's snapshot text, SHA-256, event count, and final tick to the committed Node goldens.

- [ ] **Step 10: Run Task 5 gates twice**

```powershell
corepack pnpm exec vitest run --config tools/replay/vitest.config.ts
corepack pnpm simulation:check
corepack pnpm hunt:check
corepack pnpm hunt:check
corepack pnpm qa:browser -- tests/e2e/hunt-replay.spec.ts
corepack pnpm verify
corepack pnpm verify
git diff --check
```

Expected: every command exits `0`, the second pass changes no file, and PB-03 hashes remain unchanged.

- [ ] **Step 11: Commit Task 5**

```powershell
git add packages/test-fixtures/hunt tools/replay tests/e2e package.json biome.json docs/simulation
git commit -m "test: freeze the corrected PB-04 hunt replay"
```

---

### Task 6: Re-run browser QA and require human product acceptance

**Files:**

- Modify: `tests/e2e/hunt-play.spec.ts`
- Modify: `tests/e2e/hunt-mobile.spec.ts`
- Modify: `tests/e2e/hunt-screenshots.spec.ts`
- Modify: `tests/e2e/support/huntDriver.ts`
- Modify: `packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json`
- Modify: `packages/test-fixtures/assets/pb04/personal-source-lock.json`
- Modify: `docs/playbooks/PB-04/artifacts/screenshots/hunt-mobile-390x844.png`
- Modify: `docs/playbooks/PB-04/artifacts/screenshots/hunt-tablet-768x1024.png`
- Modify: `docs/playbooks/PB-04/artifacts/screenshots/hunt-desktop-1366x768.png`
- Modify: `docs/playbooks/PB-04/artifacts/screenshots/hunt-desktop-wide-1920x1080.png`
- Modify: `docs/playbooks/PB-04/artifacts/browser-qa.md`
- Create: `docs/playbooks/PB-04/artifacts/product-acceptance.md`
- Create: `docs/playbooks/PB-04/tasks/PB-04-FIX-01-corrigir-experiencia-da-hunt.md`
- Modify: `docs/playbooks/PB-04/README.md`
- Modify: `docs/playbooks/PB-04/STATE.md`
- Modify: `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`

**Interfaces:**

- Consumes: corrected hunt, presentation probe, `hunt:check`, and four required viewports.
- Produces: objective browser evidence and an explicit user-controlled eligibility decision for PB-04-10.

- [ ] **Step 1: Remove hard-coded old-map coordinates from browser tests**

Derive the down transition, return transition, floor ids, and legal test routes from the corrected `hunt.json`. Keep assertions about behavior, not the previous coordinates `(23, 14, 8)` or the previous four-pocket topology.

- [ ] **Step 2: Add camera and composition assertions in all viewports**

```ts
expect(state.camera.visibleRows).toBeGreaterThanOrEqual(10);
expect(state.camera.visibleRows).toBeLessThanOrEqual(12);
expect(state.camera.zoom).toBeGreaterThan(1);
expect(state.drawn.composedGroundCells).toBeGreaterThan(0);
```

Walk at least six accepted steps and assert the player's screen-space center remains within one tile of the playfield center except during floor transition. Replace the old “deadzone must hold” assertion; the corrected design intentionally centers the player.

- [ ] **Step 3: Add input-cadence browser proof**

Hold one keyboard direction for less than one player step duration, release it, and assert exactly one accepted move. Record all commands/events during the hold and assert no duplicate player command sequence exists for a single tick.

- [ ] **Step 4: Add corrected-topology navigation proof**

Use a deterministic breadth-first route over `hunt.region` in test support to walk from `playerStart` to every transition origin. Assert that each floor's reachable walkable count equals the offline topology report and that the player can descend and return.

- [ ] **Step 5: Regenerate test-profile screenshots deliberately**

```powershell
$env:HUNTBOUND_HUNT_SCREENSHOTS='write'
corepack pnpm qa:browser -- tests/e2e/hunt-screenshots.spec.ts
Remove-Item Env:HUNTBOUND_HUNT_SCREENSHOTS
```

Verify PNG dimensions, test-profile asset requests only, and zero console/page/network error. The committed screenshots must not contain personal CipSoft media.

- [ ] **Step 6: Run full automated acceptance**

```powershell
corepack pnpm hunt:check
corepack pnpm simulation:check
corepack pnpm assets:check
corepack pnpm architecture:check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm qa:browser
corepack pnpm verify
git diff --check
```

Expected: all commands exit `0`; browser QA reports four viewports, 10–12 visible rows, two-way floor navigation, connected topology, paced input, and zero runtime errors.

- [ ] **Step 7: Launch the personal profile for the user's playtest**

Generate/check the personal pack from the configured local source, then start Vite in personal mode on an available local port. Give the URL to the user and stop execution at this checkpoint. Do not approve on the user's behalf.

```powershell
corepack pnpm assets:pb04:personal:generate
corepack pnpm assets:pb04:personal:check
corepack pnpm --filter @huntbound/game dev -- --mode personal --host 127.0.0.1
```

Commit the generated personal selection and source lock, but never commit
`apps/game/public/assets/personal/**`.

The user verifies:

1. the framing reads like Tibia;
2. player and rotworms are easy to follow;
3. no black squares or giant crop voids appear;
4. each floor reads as one dungeon or intentional arena;
5. all visible areas belong to a comprehensible route;
6. walking and floor changes feel continuous.

- [ ] **Step 8: Record the user's decision**

Write `product-acceptance.md` with date, tested commit, profile, viewport, checklist results, user decision, and any blocking findings. A rejection keeps PB-04 open and creates another correction cycle; it cannot be downgraded to a warning.

- [ ] **Step 9: Synchronize the PB-04 roadmap**

Add `PB-04-FIX-01` to the PB-04 README/state, mark Tasks 1–6 evidence, close W9/W11 only when their gates actually pass, and change `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` from the stale “PB-04 is next to execute” wording to the real state. PB-04-10 becomes eligible only when automated gates and `product-acceptance.md` are approved.

- [ ] **Step 10: Commit Task 6 after user approval**

```powershell
git add tests/e2e packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json packages/test-fixtures/assets/pb04/personal-source-lock.json docs/playbooks/PB-04 docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
git commit -m "test: accept the corrected first hunt experience"
```

- [ ] **Step 11: Leave PB-04-10 as the next task**

Do not execute PB-04-10 or PB-05 in this plan. Report the exact tested commit and fresh gate outputs so the independent PB-04-10 auditor can verify them.

---

## Final Verification Matrix

| Requirement | Proof |
|---|---|
| One connected component per floor | `topology.test.ts`, real generated-hunt assertion, browser BFS route |
| Remix is not faithful-map constrained | versioned layout recipe and updated selection contract |
| Dungeon plus intentional arena | recipe structure, screenshots, human product gate |
| 10–12 visible rows | camera unit tests and four-viewport probe assertions |
| No black void tiles | stacked-ground unit tests, cave backdrop, personal playtest |
| Motion follows step duration | `ActorMotion.test.ts` with orthogonal/diagonal timing |
| No render-frame input burst | `TickInputGate.test.ts` and held-key browser proof |
| PB-03 remains unchanged | `simulation:check` before/after and unchanged sidecars |
| PB-04 replay is complete | materialized 600-tick fixture, resume `0..600`, `hunt:check` twice |
| Node/browser parity | `hunt-replay.spec.ts` against committed fixture |
| Human product acceptance | approved `product-acceptance.md` |
| No future playbook scope | architecture review and PB-04-10 eligibility report |
