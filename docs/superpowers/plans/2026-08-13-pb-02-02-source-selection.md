# PB-02-02 Source Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the PB-02 contract-coverage selection, validate the historical Arena Fable source without copying personal media, and provide deterministic real and synthetic source locks.

**Architecture:** `tools/asset-packer/source` owns Node-only source parsing and filesystem hashing. A strict parser normalizes the historical Arena Fable envelope, a fixed category/identity resolver maps selection entries without cross-category fallback, and source-lock functions aggregate deterministic diagnostics while keeping the source root out of artifacts. `packages/assets` remains the browser-safe schema and diagnostics boundary; fixtures and manifests are versioned inputs only.

**Tech Stack:** TypeScript 7.0.2 strict, Node 24.14.0 built-ins (`node:fs/promises`, `node:path`, `node:crypto`, `node:os`), Vitest 4.1.10, `@huntbound/assets` public schemas/diagnostics, and fixed synthetic PNG bytes.

## Global Constraints

- Use only the exact paths listed in `docs/playbooks/PB-02/tasks/PB-02-02-congelar-origem-e-selecao.md`.
- Do not copy, import, decode, or track any personal PNG; the real source root is supplied by argument or `HUNTBOUND_PERSONAL_ASSET_SOURCE` and is never persisted.
- Keep the frozen real source facts unchanged: snapshot `1b14dee3b22f6970333bef76031b473c7bcf917e`, manifest hash `edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94`, and the five locked media hashes/sizes from the task card.
- Use the fixed identity map: `lookType` → `outfits`, `clientId` → `objects`, `effectId` → `effects`, `missileId` → `missiles`; never search another map as fallback.
- Historical source entries accept only their known fields; top-level `semantic` and `objectNames` are the only ignored fields and must first be validated as objects.
- Source-lock diagnostics use relative logical paths and aggregate all independent failures in deterministic order.
- The synthetic PNG is the fixed 68-byte transparent pixel with SHA-256 `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`.
- Do not create `pack.json`, `pack.sha256`, media content-addressed output, provider/runtime code, profile catalogs, or app changes.

---

### Task 1: Add asset-packer test configuration and parser RED tests

**Files:**
- Create: `tools/asset-packer/tsconfig.json`
- Create: `tools/asset-packer/vitest.config.ts`
- Create: `tools/asset-packer/source/sourceManifest.test.ts`

**Interfaces:**
- Consumes: `AssetSelectionManifest` and `AssetValidationResult` from `@huntbound/assets`.
- Produces: failing tests that define `parseArenaFableSourceManifest` and `resolveSelectedSourceEntries`.

- [ ] **Step 1: Create the tool configs.** Mirror the content-catalog config, but alias both `@huntbound/assets` and `@huntbound/contracts` to source files and include only `tools/asset-packer/**/*.ts`.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node", "vitest/globals"],
    "paths": {
      "@huntbound/assets": ["../../packages/assets/src/index.ts"],
      "@huntbound/contracts": ["../../packages/contracts/src/index.ts"]
    }
  },
  "include": ["**/*.ts"]
}
```

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@huntbound/assets': resolve(import.meta.dirname, '../../packages/assets/src/index.ts'),
      '@huntbound/contracts': resolve(import.meta.dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  test: {
    include: ['tools/asset-packer/**/*.test.ts'],
    pool: 'forks',
  },
});
```

- [ ] **Step 2: Write the parser/resolver RED tests.** Build a small historical manifest containing one entry in each map, use a `groups` object for one entry and a one-element array for another, and assert normalization to arrays. Build a typed selection with the five frozen identities and assert the resolver returns the five source paths in selection order.

```ts
it('normalizes a single historical group and resolves all five identity maps', () => {
  const parsed = parseArenaFableSourceManifest(historicalManifest());
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error('fixture should parse');

  expect(parsed.value.outfits['131']?.groups).toHaveLength(2);
  expect(parsed.value.effects['12']?.groups).toHaveLength(1);

  const resolved = resolveSelectedSourceEntries(selectionManifest(), parsed.value);
  expect(resolved).toEqual({
    ok: true,
    value: expect.arrayContaining([
      expect.objectContaining({ sourcePath: 'outfits/131.png' }),
      expect.objectContaining({ sourcePath: 'outfits/26.png' }),
      expect.objectContaining({ sourcePath: 'objects/3031.png' }),
      expect.objectContaining({ sourcePath: 'effects/12.png' }),
      expect.objectContaining({ sourcePath: 'missiles/36.png' }),
    ]),
  });
});

it('aggregates missing identities and never falls back to another category map', () => {
  const source = historicalManifest();
  delete source.effects['12'];
  source.objects['12'] = source.objects['3031'];

  const result = resolveSelectedSourceEntries(selectionManifest(), parsed(source));

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.diagnostics.filter(({ code }) => code === 'ASSET_REFERENCE_MISSING')).toHaveLength(1);
    expect(result.diagnostics[0]?.path).toEqual(['effects', '12']);
  }
});

it.each([
  ['entry extra field', () => ({ ...historicalManifest().outfits['131'], unexpected: true })],
  ['unsafe source path', () => ({ ...historicalManifest().outfits['131'], file: '../outside.png' })],
])('rejects %s', (_name, makeEntry) => {
  const input = historicalManifest();
  input.outfits['131'] = makeEntry();
  expect(parseArenaFableSourceManifest(input).ok).toBe(false);
});
```

- [ ] **Step 3: Run the focused RED suite.**

Run: `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/source/sourceManifest.test.ts`

Expected: FAIL because `tools/asset-packer/source/sourceManifest.ts` and its exported interfaces do not exist yet. Fix test-only fixture typing/errors until the failure is specifically missing production exports.

---

### Task 2: Implement the strict historical parser and fixed selection resolver

**Files:**
- Create: `tools/asset-packer/source/sourceManifest.ts`
- Modify: `tools/asset-packer/source/sourceManifest.test.ts`

**Interfaces:**
- Consumes: unknown historical JSON and validated `AssetSelectionManifest`.
- Produces: `ArenaFableSourceManifest`, `ArenaFableSourceEntry`, `ArenaFableAnimationGroup`, `SelectedSourceEntry`, `parseArenaFableSourceManifest`, and `resolveSelectedSourceEntries`.

- [ ] **Step 1: Define normalized source types.** Use `readonly` properties. Preserve historical animation ranges as readonly `[min, max]` tuples; rename only `phases` → normalized `phases`, `start`/`count` remain source metadata. `ArenaFableSourceManifest` contains the four maps only; `semantic` and `objectNames` are validated and discarded.

```ts
export interface ArenaFableAnimationGroup {
  readonly kind: string;
  readonly patternX: number;
  readonly patternY: number;
  readonly patternZ: number;
  readonly layers: number;
  readonly phases: readonly (readonly [number, number])[];
  readonly start: number;
  readonly count: number;
}

export interface ArenaFableSourceEntry {
  readonly file: string;
  readonly cellW: number;
  readonly cellH: number;
  readonly cols: number;
  readonly groups: readonly ArenaFableAnimationGroup[];
}

export interface ArenaFableSourceManifest {
  readonly outfits: Readonly<Record<string, ArenaFableSourceEntry>>;
  readonly objects: Readonly<Record<string, ArenaFableSourceEntry>>;
  readonly effects: Readonly<Record<string, ArenaFableSourceEntry>>;
  readonly missiles: Readonly<Record<string, ArenaFableSourceEntry>>;
}
```

- [ ] **Step 2: Implement parsing with deterministic diagnostics.** Validate plain objects, exact allowed fields, positive integer dimensions/indices, finite non-negative ranges, safe relative POSIX `file`, and map keys that are positive decimal IDs. Accept a single group object or array and always return an array. Use `ASSET_SCHEMA_INVALID` for shape/field errors and `ASSET_PATH_UNSAFE` for source paths; sort diagnostics by logical path before returning.

- [ ] **Step 3: Implement fixed-map resolution.** Iterate selection entries in their declared order. Map `outfit` and `creature` identities to `outfits`, `object` category/`item` key with `clientId` to `objects`, `effectId` to `effects`, and `missileId` to `missiles`. Report every absent map/ID as `ASSET_REFERENCE_MISSING` with path `[mapName, String(id)]`, key attached when available, and return no partial values when any diagnostic exists.

- [ ] **Step 4: Run the focused GREEN suite and typecheck.**

Run: `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/source/sourceManifest.test.ts`

Expected: all parser/resolver tests PASS.

Run: `corepack pnpm exec tsc --project tools/asset-packer/tsconfig.json --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit the parser slice.**

```powershell
git add tools/asset-packer/tsconfig.json tools/asset-packer/vitest.config.ts tools/asset-packer/source/sourceManifest.ts tools/asset-packer/source/sourceManifest.test.ts
git commit -m "feat: parse PB-02 source manifests"
```

---

### Task 3: Add source-lock RED/GREEN implementation and CLI verifier

**Files:**
- Create: `tools/asset-packer/source/sourceLock.ts`
- Create: `tools/asset-packer/source/sourceLock.test.ts`
- Create: `tools/asset-packer/source/verifySourceLock.ts`

**Interfaces:**
- Consumes: normalized source manifest, validated selection/lock schemas, and an external source root.
- Produces: `createAssetSourceLock`, `verifyAssetSourceLock`, and a Node CLI that accepts `--source-root` or `HUNTBOUND_PERSONAL_ASSET_SOURCE` plus `--lock`.

- [ ] **Step 1: Write source-lock RED tests using `mkdtemp`.** Create a temporary source with `manifest.json` and five relative PNG files, call `createAssetSourceLock` twice and assert the objects are byte-equivalent after canonical JSON serialization. Add a symlink that resolves outside the root and assert `ASSET_PATH_UNSAFE`. Mutate two selected files and assert one verification returns two hash diagnostics, with no temporary absolute path in any message/path.

```ts
it('creates a deterministic lock and aggregates two changed files', async () => {
  const sourceRoot = await createTemporarySource();
  const first = await createAssetSourceLock({
    sourceRoot,
    selection: selectionManifest(),
    source: 'huntbound-synthetic-fixture',
    sourceSnapshot: 'pb02-synthetic-v1',
  });
  const second = await createAssetSourceLock({
    sourceRoot,
    selection: selectionManifest(),
    source: 'huntbound-synthetic-fixture',
    sourceSnapshot: 'pb02-synthetic-v1',
  });

  expect(second).toEqual(first);
  if (!first.ok) throw new Error('lock creation should pass');

  await writeFile(join(sourceRoot, 'outfits/131.png'), Buffer.from('changed-1'));
  await writeFile(join(sourceRoot, 'outfits/26.png'), Buffer.from('changed-2'));
  const verified = await verifyAssetSourceLock({ sourceRoot, lock: first.value });

  expect(verified.ok).toBe(false);
  if (!verified.ok) {
    expect(verified.diagnostics.filter(({ code }) => code === 'ASSET_MEDIA_HASH_MISMATCH')).toHaveLength(2);
    expect(JSON.stringify(verified.diagnostics)).not.toContain(sourceRoot);
  }
});
```

- [ ] **Step 2: Run the source-lock RED suite.**

Run: `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/source/sourceLock.test.ts`

Expected: FAIL specifically because `sourceLock.ts` exports are missing.

- [ ] **Step 3: Implement secure path resolution and hashing.** Resolve the source root with `realpath`, reject non-directories, resolve every candidate with `realpath`, require it to remain within the root, require a regular file, read bytes with `node:fs/promises`, and hash with `createHash('sha256')`. Sort lock files by selection key. Verify `manifest.json` and all lock files for existence, byte length, and hash while aggregating diagnostics; use only relative lock paths in diagnostics.

- [ ] **Step 4: Implement `createAssetSourceLock`.** Read and parse `manifest.json` through `parseArenaFableSourceManifest`, resolve all selection entries, hash the manifest and selected media, and return a validated `AssetSourceLock` containing only `schemaVersion`, logical `source`, `sourceSnapshot`, relative paths, identities, sizes, and hashes. Return all parse/resolution/filesystem diagnostics together and never include `sourceRoot` in the returned value.

- [ ] **Step 5: Implement `verifyAssetSourceLock` and CLI.** Verify the lock shape with `validateAssetSourceLock` when the CLI reads JSON, parse the current historical manifest, confirm each lock entry still maps to the declared category/identity/path, then verify all bytes. The CLI must report a compact success object with `manifest` and `files.verified/files.total`, and on failure print structured diagnostics and exit 1; malformed arguments/JSON exit 2. Do not print or serialize the source root.

- [ ] **Step 6: Run GREEN tests and typecheck.**

Run: `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts`

Expected: all parser, resolver, and source-lock tests PASS.

Run: `corepack pnpm exec tsc --project tools/asset-packer/tsconfig.json --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit the source-lock slice.**

```powershell
git add tools/asset-packer/source/sourceLock.ts tools/asset-packer/source/sourceLock.test.ts tools/asset-packer/source/verifySourceLock.ts
git commit -m "feat: verify PB-02 source locks"
```

---

### Task 4: Generate and version the real selection, synthetic source, and locks

**Files:**
- Create: `tools/asset-packer/testing/createPb02SyntheticSource.ts`
- Create: `packages/assets/catalog/selections/pb-02-contract-coverage.json`
- Create: `packages/assets/catalog/sources/arena-fable-tibia-1b14dee.json`
- Create: `packages/test-fixtures/assets/pb02/source/manifest.json`
- Create: `packages/test-fixtures/assets/pb02/source/outfits/131.png`
- Create: `packages/test-fixtures/assets/pb02/source/outfits/26.png`
- Create: `packages/test-fixtures/assets/pb02/source/objects/3031.png`
- Create: `packages/test-fixtures/assets/pb02/source/effects/12.png`
- Create: `packages/test-fixtures/assets/pb02/source/missiles/36.png`
- Create: `packages/test-fixtures/assets/pb02/selection.json`
- Create: `packages/test-fixtures/assets/pb02/source-lock.json`
- Modify: `packages/test-fixtures/src/index.ts`

**Interfaces:**
- Consumes: frozen five-entry selection and `createAssetSourceLock`.
- Produces: deterministic synthetic source generator with `--check`, exact real source lock, and a synthetic selection/lock suitable for PB-02-03 tests.

- [ ] **Step 1: Add the exact real selection JSON.** Use the five entries and real group values from the task card; validate it with `validateAssetSelectionManifest` before writing or committing. Keep entry order as outfit, creature, object, effect, missile.

- [ ] **Step 2: Implement the synthetic generator.** Compute the repository fixture directory from `import.meta.dirname`, create only the approved relative directories/files, write the fixed transparent pixel bytes to all five paths, and write a minimal historical manifest with `cellW/cellH = 1`, `cols = 1`, and one default group/frame per entry. `--check` compares bytes and canonical JSON without writing and exits 1 on drift.

- [ ] **Step 3: Generate synthetic artifacts and derive the synthetic selection.** Replace only real group `source`, `sourceSnapshot`, `licenseClass`, and profile arrays with `huntbound-test`, `pb02-synthetic-v1`, `huntbound-test`, and `test/product`; preserve keys, categories, IDs, rationale, and presentation. Generate `source-lock.json` through the same lock function and validate both JSON documents through public schemas.

- [ ] **Step 4: Write the real source lock from the external root.** Run the lock creator against `C:\Kaezan\kaezan-arena-fable\frontend\public\assets\tibia`; compare output to the six frozen facts before writing `packages/assets/catalog/sources/arena-fable-tibia-1b14dee.json`. If any real hash/size differs, stop and report the divergence instead of changing the lock.

- [ ] **Step 5: Export the fixture path constant.** Add `PB02_SYNTHETIC_ASSET_FILES` to `packages/test-fixtures/src/index.ts` with the manifest and five relative paths; do not export absolute paths or binary contents.

- [ ] **Step 6: Verify generation and tracking.**

```powershell
node tools/asset-packer/testing/createPb02SyntheticSource.ts
node tools/asset-packer/testing/createPb02SyntheticSource.ts --check
git ls-files -- 'packages/test-fixtures/assets/pb02/source/**/*.png'
```

Expected: `--check` is clean; exactly five tracked PNGs are listed, each 68 bytes and the frozen synthetic hash.

---

### Task 5: Document selection, update handoff, and run integrated gates

**Files:**
- Create: `docs/assets/PB-02-SELECTION.md`
- Modify: `docs/playbooks/PB-02/STATE.md`

**Interfaces:**
- Consumes: versioned selection/locks, synthetic generator output, and fresh test/gate evidence.
- Produces: durable PB-02-02 handoff with `PB-02-03` as the next serial task and no premature PB-02-03/04 implementation.

- [ ] **Step 1: Document the five stable-key mappings.** Record real source provenance, lock hash/size table, synthetic fixture policy, the external-root rule, PB-01 linkage, and explicit confirmation that no personal PNG is tracked.

- [ ] **Step 2: Update `STATE.md`.** Mark PB-02-02 `done`, record branch and integrated commit, commands/exit codes/counts/hashes, effective model/skills/validator, and `PB-02-03` as next eligible task. Preserve PB-02-01 evidence and state that PB-02-03/04 were not started.

- [ ] **Step 3: Run task gates before integration.**

```powershell
corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts
corepack pnpm exec tsc --project tools/asset-packer/tsconfig.json --noEmit
corepack pnpm --filter @huntbound/test-fixtures typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check tools/asset-packer packages/assets/catalog packages/test-fixtures/src
corepack pnpm format:check
git diff --check
git ls-files apps/game/public/assets/personal
git ls-files -- 'packages/test-fixtures/assets/pb02/source/**/*.png'
```

Expected: all commands exit 0; the personal-asset scan is empty; exactly five synthetic PNGs are tracked.

- [ ] **Step 4: Commit the completed task.**

```powershell
git add tools/asset-packer packages/assets/catalog packages/test-fixtures docs/assets/PB-02-SELECTION.md docs/playbooks/PB-02/STATE.md docs/superpowers/plans/2026-08-13-pb-02-02-source-selection.md
git commit -m "feat: freeze PB-02 asset selection"
```

- [ ] **Step 5: Integrate and reverify on `main`.** Fast-forward `main` to the task branch, rerun the focused tool suite plus `corepack pnpm test`, and inspect `git status --short --branch` and `git diff --check`.

- [ ] **Step 6: Clean up only after fresh verification.** Confirm the expected commit is reachable from `main`, remove the validated task worktree, run `git worktree prune`, and delete only the integrated temporary branch. Leave the external Arena Fable source untouched.

## Self-Review

- The parser/resolver, source lock, generator, artifacts, documentation, handoff, and integration gates each have an explicit task.
- No task relies on a placeholder or an unstated fallback; identity map and frozen hashes are written verbatim.
- All later interfaces consume the normalized source types and public asset schemas defined earlier.
- The plan does not include pack materialization, provider/runtime code, personal media copying, or profile work beyond the synthetic selection required by PB-02-02.
