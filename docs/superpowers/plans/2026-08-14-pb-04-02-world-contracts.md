# PB-04-02 World Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict, deterministic runtime contracts for `MapRegion`, `TransitionTable`, `SpawnTable`, and `HuntDefinition` without changing the PB-03 simulation contracts.

**Architecture:** Keep all PB-04 world contracts under `packages/contracts/src/hunt/`. `types.ts` owns the public data types and the local widened diagnostic vocabulary; `schemas.ts` owns strict Zod shapes and local invariants; `diagnostics.ts` converts Zod failures into stable, path/code-sorted results. The root package re-exports the hunt surface, while cross-object checks live only in `HuntDefinitionSchema` so the kernel remains unaware of Tibia identity and map palette data.

**Tech Stack:** TypeScript, Zod 4, Vitest, Biome, pnpm workspace scripts, Markdown contract documentation.

## Global Constraints

- Only add `packages/contracts/src/hunt/**`, `packages/contracts/src/index.ts`, `docs/content/MAP_REGION_CONTRACT.md`, the PB-04 state handoff, and the implementation-plan artifact.
- Do not modify any file under `packages/contracts/src/simulation/`; `SIMULATION_SCHEMA_VERSION` remains `2` and `SIMULATION_RULES_VERSION` remains `1`.
- `HUNT_SCHEMA_VERSION` is `1`; all numeric schema fields are safe integers and no float is accepted.
- A region is at most `96 × 96` tiles and `3` strictly ordered floors; `maxLiveActors` is `1..64`.
- Row-major index is `i = y * width + x`; collections declared canonical by the PB-04 task are strictly increasing and contain no duplicate key.
- World positions in `HuntDefinition` use region-local `x/y` coordinates; `MapRegion.origin` stores the absolute map origin.
- New `HUNT_*` diagnostic codes are kept in the hunt package because the task forbids changing the PB-03 `SimulationDiagnosticCode` union. Runtime results preserve the existing `SimulationValidationResult` shape, with an internal widened diagnostic adapter.
- Zod remains exclusive to `@huntbound/contracts`; no filesystem, XML, OTBM, asset, kernel, or browser code is added.

---

### Task 1: Establish the isolated worktree and MapRegion RED/GREEN cycle

**Files:**
- Create: `packages/contracts/src/hunt/types.ts`
- Create: `packages/contracts/src/hunt/schemas.ts`
- Create: `packages/contracts/src/hunt/diagnostics.ts`
- Create: `packages/contracts/src/hunt/worldContracts.test.ts`

**Interfaces:**
- `types.ts` exports `RegionId`, `HuntId`, `HUNT_SCHEMA_VERSION`, `MapRegionFloor`, `MapRegion`, `TransitionEntry`, `TransitionTable`, `SpawnSlotDefinition`, `SpawnGroupDefinition`, `SpawnTable`, `HuntDefinition`, `KernelBlueprint`, `HuntDiagnosticCode`, `HuntDiagnostic`, and the local `HuntValidationResult` helper type.
- `KernelBlueprint` is a type alias of the existing simulation `ActorBlueprint`; `GridPosition` is imported as a type from `../simulation/types.ts`.
- `schemas.ts` will export `MapRegionSchema`, `TransitionTableSchema`, `SpawnTableSchema`, and `HuntDefinitionSchema` after the later tasks add their refinements.
- `diagnostics.ts` will export `validateMapRegion` and `validateHuntDefinition`, plus the schema-to-diagnostics mapper used by the tests.

- [ ] **Step 1: Verify the baseline and create the required worktree.**

Run from the clean main checkout:

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-02-world-contracts main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts codex/pb04-02-world-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts install --prefer-offline
```

Expected: the source checkout is clean, the new worktree is on `codex/pb04-02-world-contracts`, and the install reuses the local pnpm store without changing `pnpm-lock.yaml`.

- [ ] **Step 2: Write the failing MapRegion tests first.**

In `worldContracts.test.ts`, create a valid 2×2 one-floor region and assert `validateMapRegion` returns `{ ok: true, value }`. Add failing cases for the exact task matrix: wrong `ground` length, out-of-range ground palette index with `HUNT_PALETTE_INDEX_INVALID`, duplicate palette, unsorted palette, unsorted floors, empty floors, duplicate `objectsBelow.i`, empty object stack, unsorted collision, `i < 0`, `i >= width * height`, width/height over `96`, more than `3` floors, a decimal nested number, an unknown field, and two same-path diagnostics ordered lexically by code.

Use a helper like this so each test stays focused:

```ts
function createRegion(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:venore-rotworm-cave' as RegionId,
    regionRevision: 1,
    origin: { x: 33002, y: 31995 },
    width: 2,
    height: 2,
    palette: [100, 200],
    floors: [{ z: 8, ground: [0, 1, 0, 1], objectsBelow: [], objectsAbove: [], collision: [] }],
  };
}
```

For failures, map `result.ok === false` to `result.diagnostics.map(({ code, path }) => ({ code, path }))` and assert the stable code/path, not a localized message.

- [ ] **Step 3: Run the focused tests to prove RED.**

Run:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts
```

Expected: FAIL because the hunt modules and validators do not exist yet.

- [ ] **Step 4: Implement the shared hunt types and MapRegion schema.**

Implement the smallest schema surface needed by the failing tests:

```ts
const safeInteger = z.number().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const positiveInteger = safeInteger.positive();
```

Use `.strict()` on every object, `.readonly()` on every ordered array, branded transforms for `RegionId`/`HuntId`, and `z.literal(HUNT_SCHEMA_VERSION)` for `schemaVersion`. Validate palette values as non-negative safe integers, require strictly increasing palette values and floor `z` values, require `ground.length === width * height`, and check every `ground` and object-stack palette reference against `palette.length`. Validate sparse object/collision indices with `0 <= i < width * height`, strict `i` ordering, and non-empty stacks. Emit `HUNT_REGION_OUT_OF_BUDGET` for dimensions above `96` or more than `3` floors; use `SIM_SCHEMA_INVALID` for generic shape/order failures and `HUNT_PALETTE_INDEX_INVALID` for palette references.

- [ ] **Step 5: Implement deterministic diagnostic conversion and make MapRegion GREEN.**

In `diagnostics.ts`, copy the existing PB-03 path comparison semantics: compare path segments numerically when both are numeric, then sort by `code`, then by message. Read custom Zod issue metadata `{ huntCode }`; all unmapped Zod issues become `SIM_SCHEMA_INVALID`. Return the public `SimulationValidationResult<MapRegion>` shape through a narrow internal cast so the unchanged simulation diagnostic type can coexist with the new runtime `HUNT_*` codes.

Run:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts
```

Expected: all MapRegion tests pass.

- [ ] **Step 6: Commit the MapRegion cycle.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts add packages/contracts/src/hunt
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts commit -m "feat: add map region world contract"
```

### Task 2: Add TransitionTable and SpawnTable invariants

**Files:**
- Modify: `packages/contracts/src/hunt/schemas.ts`
- Modify: `packages/contracts/src/hunt/diagnostics.ts`
- Modify: `packages/contracts/src/hunt/worldContracts.test.ts`

**Interfaces:**
- `TransitionTableSchema` accepts `{ entries, dropped }`; `entries` are strictly ordered by `from` `(z, y, x)`, have unique `from` positions, and reject impossible self/jump transitions with `HUNT_TRANSITION_INVALID`.
- `SpawnTableSchema` accepts `{ groups, maxLiveActors }`; groups are strictly ordered by center `(z, y, x)`, have non-empty slots, radii `0..15`, positive integer respawn ticks, and a live-actor cap `1..64`.

- [ ] **Step 1: Add failing TransitionTable tests.**

Extend the valid fixture with transitions and assert failures for `from === to`, duplicate `from`, non-increasing `(z,y,x)` order, negative/non-integer `dropped`, and a destination whose floor differs by more than one level. Assert `HUNT_TRANSITION_INVALID` for geometric failures and `SIM_SCHEMA_INVALID` for malformed numeric shape.

- [ ] **Step 2: Run the TransitionTable tests to prove RED.**

Run:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts -t TransitionTable
```

Expected: FAIL until the schema is implemented.

- [ ] **Step 3: Implement TransitionTableSchema.**

Define strict `GridPositionSchema` reuse, non-negative integer `dropped`, and a `.superRefine` that checks self transitions, duplicate `from` keys, strict canonical order, and `Math.abs(to.z - from.z) > 1`. Use `HUNT_TRANSITION_INVALID` for all transition-specific invariants.

- [ ] **Step 4: Add failing SpawnTable tests.**

Cover negative/over-15 radius, non-integer/zero/negative respawn ticks, `maxLiveActors` outside `1..64`, unsorted groups, duplicate centers, and an empty group. Keep the tests at the public validator/schema boundary so each malformed input produces a structured diagnostic.

- [ ] **Step 5: Run the SpawnTable tests to prove RED.**

Run:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts -t SpawnTable
```

Expected: FAIL for the new cases before implementation.

- [ ] **Step 6: Implement SpawnTableSchema and make the task GREEN.**

Use strict schemas for slot/group/table objects, validate non-empty string keys, safe integer offsets, `radius` in `0..15`, `respawnTicks > 0`, and `maxLiveActors` in `1..64`. Require non-empty groups and strictly increasing centers. Export validators for the two tables only if the test surface needs them; the required public validators remain `validateMapRegion` and `validateHuntDefinition`.

- [ ] **Step 7: Run the combined focused suite and commit.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts add packages/contracts/src/hunt
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts commit -m "feat: validate hunt transitions and spawns"
```

### Task 3: Add HuntDefinition cross-object validation

**Files:**
- Modify: `packages/contracts/src/hunt/schemas.ts`
- Modify: `packages/contracts/src/hunt/diagnostics.ts`
- Modify: `packages/contracts/src/hunt/worldContracts.test.ts`

**Interfaces:**
- `HuntDefinitionSchema` composes the four world schemas plus existing `ActorBlueprintSchema` and `GridPositionSchema`.
- `validateHuntDefinition(input)` returns a deterministic structured result and checks relationships that individual tables cannot know.

- [ ] **Step 1: Add failing HuntDefinition tests.**

Create a minimal valid definition with one region floor, one inert player blueprint, one in-region player start, one in-region transition, and one spawn group. Add cases for a slot blueprint absent from `blueprints` (`HUNT_UNKNOWN_BLUEPRINT`), an unknown player blueprint (`HUNT_UNKNOWN_BLUEPRINT`), a group center outside the region (`HUNT_SPAWN_OUT_OF_REGION`), a player start outside the region or on a collision tile (`HUNT_SPAWN_OUT_OF_REGION`), and a transition whose `from.z` is not present in `region.floors` (`HUNT_TRANSITION_INVALID`). Also assert duplicate blueprint IDs are rejected and every `HuntDefinition` object is strict.

- [ ] **Step 2: Run HuntDefinition tests to prove RED.**

Run:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts -t HuntDefinition
```

Expected: FAIL for the cross-object cases before the refinement exists.

- [ ] **Step 3: Implement HuntDefinitionSchema refinements.**

Use local coordinates for `playerStart`, group centers, and transition endpoints. Build sets of blueprint IDs and floor `z` values. Check every spawn group center has an in-region `x/y` and extracted floor, every spawn slot blueprint exists, `playerBlueprintId` exists, `playerStart` is in the region and not in the matching floor collision list, and every transition endpoint is in an extracted floor/grid. Use `HUNT_UNKNOWN_BLUEPRINT`, `HUNT_SPAWN_OUT_OF_REGION`, and `HUNT_TRANSITION_INVALID` at the most specific field path.

- [ ] **Step 4: Make the complete focused suite GREEN.**

Run:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts exec vitest run packages/contracts/src/hunt/worldContracts.test.ts
```

Expected: all MapRegion, TransitionTable, SpawnTable, and HuntDefinition tests pass with deterministic diagnostics.

- [ ] **Step 5: Commit the HuntDefinition cycle.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts add packages/contracts/src/hunt
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts commit -m "feat: validate hunt definition contracts"
```

### Task 4: Export, document, and prove regression behavior

**Files:**
- Create: `packages/contracts/src/hunt/index.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `docs/content/MAP_REGION_CONTRACT.md`
- Modify: `docs/playbooks/PB-04/STATE.md`

**Interfaces:**
- `packages/contracts` root exports all public hunt types, schemas, diagnostic codes, and validators.
- The documentation describes row-major layers, palette references, canonical ordering, `dropped`, `respawnTicks = spawntimeSeconds * 1000 / 50`, and the complete diagnostic table.

- [ ] **Step 1: Add the public exports and a root import test.**

Create `hunt/index.ts` re-exporting `types.ts`, `schemas.ts`, and `diagnostics.ts`; add `export * from './hunt/index.ts';` to the root index. In the existing contract test or a new type-level assertion, import `MapRegionSchema`, `HuntDefinitionSchema`, `validateMapRegion`, and `HUNT_SCHEMA_VERSION` from `@huntbound/contracts` and assert they are available.

- [ ] **Step 2: Write the contract documentation.**

Document that `origin` is absolute while positions are region-local, that palette references are compact indices, that empty sparse entries mean absence, and that all ordered arrays are strictly increasing. Include the exact bounds and all codes: `SIM_SCHEMA_INVALID`, `HUNT_REGION_OUT_OF_BUDGET`, `HUNT_UNKNOWN_BLUEPRINT`, `HUNT_TRANSITION_INVALID`, `HUNT_SPAWN_OUT_OF_REGION`, and `HUNT_PALETTE_INDEX_INVALID`. Explain that `HuntDefinition` is the Tibia-aware boundary and `packages/simulation` remains Tibia-free.

- [ ] **Step 3: Run mutation probes for invariants that were not observed RED.**

For each order/uniqueness check that did not produce a clear RED before implementation, temporarily remove exactly that production comparison, rerun the corresponding focused test, and restore the comparison immediately. Record the observed mutation result in the PB-04-02 handoff: palette order, floor order, sparse `i` order/uniqueness, collision order, transition order/`from` uniqueness, and spawn-group order/center uniqueness.

- [ ] **Step 4: Run all required package and repository gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts --filter @huntbound/contracts typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts exec biome check packages/contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts verify
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts diff --check
```

Expected: every command exits `0`; no simulation file is modified; existing PB-03 versions and golden files remain unchanged.

- [ ] **Step 5: Update the PB-04 handoff with evidence.**

Add `## PB-04-02 — handoff concluído` to `STATE.md`, record the implementation commit(s), test count, mutation probes, exact commands/exit codes, and mark PB-04-03 and PB-04-05 as eligible. Keep the PB-04-04 `expectedDroppedTransitions = 0` reconciliation note.

- [ ] **Step 6: Commit the documentation and exports.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts add packages/contracts docs/content/MAP_REGION_CONTRACT.md docs/playbooks/PB-04/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts commit -m "docs: record PB-04 world contract handoff"
```

### Task 5: Integrate by fast-forward and verify main

**Files:**
- Modify: `docs/playbooks/PB-04/STATE.md` only if the final integrated commit hash differs from the recorded feature hash.

- [ ] **Step 1: Fast-forward the clean main checkout.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-02-world-contracts
```

- [ ] **Step 2: Re-run the final verification on main.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound diff --check
git -C C:\Kaezan\kaezan-huntbound status --short --branch
```

Expected: `verify` and `diff --check` exit `0`, main is clean, and `packages/contracts/src/simulation/**` has no diff.

- [ ] **Step 3: Remove the worktree and branch only after capturing the final hash.**

```powershell
git -C C:\Kaezan\kaezan-huntbound log -1 --oneline
Remove-Item -LiteralPath C:\Kaezan\kaezan-huntbound-pb04-02-world-contracts -Recurse -Force
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-02-world-contracts
```

The final response will report the integrated commit, the test/gate evidence, the unchanged simulation boundary, and the next eligible tasks.

## Plan self-review

- Spec coverage: every required schema, invariant, diagnostic, documentation section, mutation proof, gate, handoff, and integration step is assigned above.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation step is present.
- Type consistency: all later tasks consume the types and schemas introduced in Task 1; `HuntDefinitionSchema` is the only layer that needs cross-object context; root exports are added only after the modules exist.
- Scope check: extraction, tile flags, kernel floors/spawn, assets, scene, input, and browser QA are explicitly absent; PB-04-03 and PB-04-05 are only marked eligible after this handoff.
