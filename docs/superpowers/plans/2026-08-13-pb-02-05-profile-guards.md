# PB-02-05 Profile Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Integrate deterministic PB-02 packs into `test`, `personal`, and `product` profile trees, reject forbidden personal licenses before a product bundle is emitted, and enforce asset boundaries in the architecture gate.

**Architecture:** `tools/asset-packer/profile` owns Node-only profile validation, canonical catalog construction, secure byte-preserving staging, and profile build orchestration. `tools/asset-packer/vite` adapts the profile validator to Vite's `buildStart` hook without exposing pack or media paths to the app. `tools/architecture/asset-boundaries.ts` scans only consumer TypeScript and uses the TypeScript scanner for imports and string literals; the existing dependency gate calls it alongside content boundaries.

**Tech Stack:** TypeScript 7.0.2 strict, Node 24.14.0 built-ins, Zod 4.4.3 public asset schemas, Vitest 4.1.10, Vite 8.2.1, canonical JSON, SHA-256, and the existing transactional pack materializer/verifier.

## Global Constraints

- Use only the production paths listed in `docs/playbooks/PB-02/tasks/PB-02-05-fechar-perfis-e-boundaries.md`; the plan file itself records execution and does not expand the product scope.
- Profiles are exactly `test`, `personal`, and `product`; a target profile must be present in every transitively selected source group's `buildProfiles`.
- `product` always rejects `cipsoft-personal` with `ASSET_LICENSE_FORBIDDEN`, regardless of other profile fields.
- The tracked golden tree is `packages/test-fixtures/assets/pb02/expected/test/`; generated app trees under `apps/game/public/assets/test`, `product`, and `personal` are ignored.
- Pack and media files are copied byte-for-byte; only the destination catalog is rewritten canonically with the requested profile.
- The catalog is the only asset bootstrap path; consumers may use stable keys but may not hardcode pack IDs, pack paths, media paths, or personal asset paths.
- `assets:check` is reproducible and never requires `HUNTBOUND_PERSONAL_ASSET_SOURCE`; `assets:personal:check` remains an explicit local-only gate.
- Do not modify `apps/game/src`, add personal media, scan `dist`/`public`/`node_modules`/Git internals, or implement PB-02-06 composition-root/browser work.

---

### Task 1: Define profile contracts and write validation RED tests

**Files:**
- Create: `tools/asset-packer/profile/types.ts`
- Create: `tools/asset-packer/profile/profileSupport.ts`
- Create: `tools/asset-packer/profile/createSinglePackAssetCatalog.ts`
- Create: `tools/asset-packer/profile/validateAssetProfileTree.ts`
- Create: `tools/asset-packer/profile/profile.test.ts`

**Interfaces:**
- Consumes: `AssetBuildProfile`, `AssetPackCatalog`, `AssetPackManifest`, `AssetKey`, `AssetValidationResult`, and `verifyMaterializedAssetPack`.
- Produces: `ValidatedAssetProfile`, `validateAssetProfileTree`, `stageAssetProfile` input/output types, and `createSinglePackAssetCatalog` with deterministic required-key ordering.

- [x] **Step 1: Define the profile result types.** Keep all fields readonly and expose the validated catalog plus each verified pack root/manifest so staging and the Vite adapter do not re-read untrusted JSON.

```ts
export interface ValidatedAssetProfile {
  readonly profile: AssetBuildProfile;
  readonly profileRoot: string;
  readonly catalogPath: string;
  readonly catalog: AssetPackCatalog;
  readonly packs: readonly {
    readonly packRoot: string;
    readonly reference: AssetPackReference;
    readonly verified: VerifiedAssetPack;
  }[];
}

export async function validateAssetProfileTree(input: {
  readonly profile: AssetBuildProfile;
  readonly profileRoot: string;
  readonly catalogPath: string;
}): Promise<AssetValidationResult<ValidatedAssetProfile>>;

export function createSinglePackAssetCatalog(input: {
  readonly profile: AssetBuildProfile;
  readonly packId: string;
  readonly manifestPath: string;
  readonly requiredKeys: readonly AssetKey[];
}): AssetValidationResult<AssetPackCatalog>;
```

- [x] **Step 2: Write RED tests for profile validation.** Build temporary profile roots from the tracked fixture pack and a generated catalog. Cover a valid `test` profile, a valid `product` profile, a missing catalog/profile reference, a divergent `pack.sha256`, a missing transitive media file, a group that omits the target profile, and a `cipsoft-personal` group selected by `product`. Assert every independent diagnostic is returned and no diagnostic contains the temporary absolute root.

```ts
it('aggregates profile, pack, media, and license failures before publishing', async () => {
  const root = await createProfileFixture({
    profile: 'product',
    group: { buildProfiles: ['personal'], licenseClass: 'cipsoft-personal' },
    removeMedia: true,
    corruptPackHash: true,
  });

  const result = await validateAssetProfileTree({
    profile: 'product',
    profileRoot: root,
    catalogPath: join(root, 'catalog.json'),
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'ASSET_MEDIA_MISSING',
        'ASSET_MEDIA_HASH_MISMATCH',
        'ASSET_PROFILE_FORBIDDEN',
        'ASSET_LICENSE_FORBIDDEN',
      ]),
    );
    expect(JSON.stringify(result.diagnostics)).not.toContain(root);
  }
});

it('creates a canonical single-pack catalog with sorted required keys', () => {
  const result = createSinglePackAssetCatalog({
    profile: 'test',
    packId: 'asset-pack:fixture:pb-02-contract-coverage',
    manifestPath: 'packs/pb-02-contract-coverage/pack.json',
    requiredKeys: [
      'outfit:tibia:knight',
      'item:tibia:gold-coin',
      'creature:tibia:rotworm',
    ],
  });

  expect(result).toEqual({
    ok: true,
    value: expect.objectContaining({
      profile: 'test',
      preloads: [{
        packId: 'asset-pack:fixture:pb-02-contract-coverage',
        requiredKeys: [
          'creature:tibia:rotworm',
          'item:tibia:gold-coin',
          'outfit:tibia:knight',
        ],
      }],
    }),
  });
});
```

- [x] **Step 3: Run the focused RED suite.**

Run: `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/profile/profile.test.ts`

Expected: FAIL because the profile modules and public functions do not exist yet; correct only test fixture typing until the failure is specifically missing production exports.

---

### Task 2: Implement profile validation and transactional staging

**Files:**
- Modify: `tools/asset-packer/profile/profileSupport.ts`
- Modify: `tools/asset-packer/profile/createSinglePackAssetCatalog.ts`
- Modify: `tools/asset-packer/profile/validateAssetProfileTree.ts`
- Create: `tools/asset-packer/profile/stageAssetProfile.ts`
- Modify: `tools/asset-packer/profile/profile.test.ts`

**Interfaces:**
- Consumes: canonical profile catalogs and the existing `createMaterializedAssetPackVerifier`/`verifyMaterializedAssetPack` results.
- Produces: `stageAssetProfile(input)` that validates source and target policy, copies only validated pack trees byte-for-byte, writes a target-profile catalog, and promotes a complete sibling staging tree atomically.

- [x] **Step 1: Implement safe profile-path and JSON helpers.** Resolve the catalog and pack manifest paths as POSIX-relative paths below the profile root, reject missing/non-regular/symlinked files, prefix diagnostics with logical catalog/pack paths, and never include the resolved root in diagnostic messages. Reuse `canonicalAssetJson`, `sortAssetDiagnostics`, and `verifyMaterializedAssetPack` instead of duplicating pack/schema/hash validation.

- [x] **Step 2: Implement `createSinglePackAssetCatalog`.** Sort `requiredKeys` with the existing asset text comparator, emit `schemaVersion: '1'`, one pack reference, and one preload, then return `validateAssetPackCatalog` so callers never receive unchecked catalog data.

- [x] **Step 3: Implement `validateAssetProfileTree`.** Read and validate the catalog, require its `profile` to equal the requested profile, verify every referenced pack, match each returned `packId`, ensure every group allows the target profile, emit `ASSET_LICENSE_FORBIDDEN` for every `cipsoft-personal` group targeting `product`, and confirm each preload key exists in its referenced pack. Preserve all independent diagnostics in deterministic path/code order.

- [x] **Step 4: Implement `stageAssetProfile`.** Validate the source catalog using its declared profile, then apply the target profile policy to all verified source packs. Build a temporary sibling tree under the destination parent, copy catalog-referenced pack directories recursively using `readFile`/`writeFile` (no decode/re-encode), write only the target catalog with canonical JSON, validate the staging tree with the target profile, and promote it with destination backup/rollback. Reject symlinked or non-directory transaction targets and clean staging after failures.

- [x] **Step 5: Add GREEN and safety regression tests.** Assert `test` and `product` staging from the golden fixture produce equal pack/media bytes and a catalog with the requested profile; assert a failed target validation leaves the previous destination unchanged; assert missing media, unexpected pack files, and an unsafe manifest path fail before promotion.

- [x] **Step 6: Run focused GREEN checks.**

Run: `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/profile/profile.test.ts`

Expected: all profile validation/catalog/staging tests PASS.

Run: `corepack pnpm exec tsc --project tools/asset-packer/tsconfig.json --noEmit`

Expected: exit 0.

---

### Task 3: Add profile build orchestration, fixture catalog, and scripts

**Files:**
- Create: `tools/asset-packer/profile/buildAssetProfile.ts`
- Modify: `tools/asset-packer/cli.ts`
- Create: `tools/asset-packer/profile/compareAssetProfileTrees.ts`
- Create: `tools/asset-packer/profile/profile-cli.test.ts`
- Create: `packages/test-fixtures/assets/pb02/expected/test/catalog.json`
- Modify: `package.json`
- Modify: `apps/game/package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: existing `buildAssetPackManifest`, `materializeAssetPack`, source-lock verifier, profile validator/stager, and the frozen five-entry selection.
- Produces: CLI commands `stage-profile`, `profile-check`, and `build-profile`; root scripts from the task card; app build scripts `build`, `build:personal`, and `build:product`.

- [x] **Step 1: Write CLI RED tests.** Test parser rejection for an unknown `--source-root-env`, successful `profile-check` on the golden tree, successful `stage-profile --profile product` from the golden `test` root, and `build-profile --check` refusing to rewrite an existing personal output. Keep source-root values out of stdout/stderr assertions.

- [x] **Step 2: Implement `stage-profile` and `profile-check`.** Parse exactly `test|personal|product`; stage from a validated source profile and print one compact JSON summary on success. `profile-check` validates the requested profile root and exits 1 with structured diagnostics on failure.

- [x] **Step 3: Implement `build-profile`.** Accept `--source-root-env` only when its value is `HUNTBOUND_PERSONAL_ASSET_SOURCE`; require that environment value to be absolute and an existing directory; verify the source lock, build the single pack, create the catalog with all selection keys sorted canonically, validate the complete generated profile, and either stage it to `--output` or compare it to the existing output for `--check` without rewriting.

- [x] **Step 4: Add the canonical test catalog.** Use the pack reference `packs/pb-02-contract-coverage/pack.json`, profile `test`, and all five required keys ordered as `creature`, `effect`, `item`, `missile`, `outfit`; serialize as canonical JSON with LF and a final newline.

- [x] **Step 5: Register root/app scripts and ignores.** Add the exact `assets:test:generate:check`, `assets:stage:test`, `assets:stage:product`, `assets:personal:generate`, `assets:personal:check`, `assets:product:check`, `assets:check`, and `build` commands from the card. Add `corepack pnpm assets:check` to `check` and `verify` before build/QA, never add the personal check to those reproducible gates, and make app `build` use `vite build --mode test`.

- [x] **Step 6: Run RED/GREEN CLI and reproducibility checks.**

Run: `corepack pnpm assets:check`

Expected: synthetic pack `--check` and golden `test` profile validation both exit 0.

Run: `corepack pnpm assets:stage:test && corepack pnpm assets:stage:product && corepack pnpm assets:product:check`

Expected: both ignored staging trees validate and product accepts only the synthetic `huntbound-test` group.

---

### Task 4: Add Vite guard and restricted product proof

**Files:**
- Create: `tools/asset-packer/vite/assetProfileGuardPlugin.ts`
- Create: `tools/asset-packer/vite/assetProfileGuardPlugin.test.ts`
- Create: `tools/asset-packer/testing/createRestrictedProductProof.ts`
- Modify: `apps/game/vite.config.ts`

**Interfaces:**
- Consumes: `assetProfileGuardPlugin({ profile, publicDir })` and the profile validator.
- Produces: a Vite plugin whose `buildStart` rejects invalid profile trees before bundle transforms, and a deterministic local helper that turns an ignored product pack into a structurally valid `cipsoft-personal` proof.

- [x] **Step 1: Write the Vite RED test.** Create temporary `test` and `product` profile roots, call the plugin's `buildStart` hook directly, assert valid trees resolve, and assert a product tree with a personal group rejects with an error containing `ASSET_LICENSE_FORBIDDEN` before any bundle hook is needed.

- [x] **Step 2: Implement the guard plugin.** Use `name: 'huntbound:asset-profile-guard'`, `enforce: 'pre'`, and an async `buildStart` that calls `validateAssetProfileTree` against `<publicDir>/catalog.json`. Format only logical diagnostics into the thrown error; do not expose absolute roots or media bytes.

- [x] **Step 3: Configure mode/profile selection.** Change `defineConfig` to receive `{ mode }`, reject every mode other than `test`, `personal`, or `product`, and install the plugin with `resolve(import.meta.dirname, 'public/assets', mode)`. Keep Vite's ordinary public directory unchanged so built assets retain `assets/<mode>/...` paths.

- [x] **Step 4: Implement the proof helper.** Read the existing ignored product catalog and first pack, change every group to `licenseClass: 'cipsoft-personal'` and `buildProfiles: ['personal']`, canonicalize `pack.json`, update `pack.sha256`, and leave media bytes/catalog/profile untouched. Print a compact proof summary and fail without creating files outside the supplied product root.

- [x] **Step 5: Prove negative and positive product builds.** Stage product, run the proof helper, assert `corepack pnpm --filter @huntbound/game build:product` exits 1 with `ASSET_LICENSE_FORBIDDEN`, restage product, run `assets:product:check`, and assert the same build exits 0.

---

### Task 5: Add live asset boundary scanning and dependency policy

**Files:**
- Create: `tools/architecture/asset-boundaries.ts`
- Create: `tools/architecture/asset-boundaries.test.ts`
- Modify: `tools/architecture/check-boundaries.ts`
- Modify: `tools/architecture/check-boundaries.test.ts`
- Modify: `tools/architecture/dependency-policy.json`

**Interfaces:**
- Consumes: repository root and temporary source fixtures.
- Produces: `checkAssetBoundaries(root): Promise<readonly string[]>`, called by `checkBoundaries`, with TypeScript-scanner diagnostics for forbidden imports and media/pack path literals.

- [x] **Step 1: Write boundary RED tests.** Temporary fixture files must fail for `@huntbound/assets` in simulation, Phaser/Node/filesystem imports in `packages/assets/src`, `'/assets/personal/packs/x.png'` in app source, `packs/x/pack.json` in a feature package, and a media extension literal in simulation. Add controls proving the approved tooling/catalog/fixture paths and `apps/game/vite.config.ts` do not produce false positives.

- [x] **Step 2: Implement TypeScript-scanner literal/import collection.** Walk only `apps/game/src`, `packages/simulation/src`, and feature package `src` trees; skip `dist`, `public`, `node_modules`, Git internals, `packages/assets` manifest/tooling/fixture allowlists, and `apps/game/src/assets/AssetProfile.ts`. Use `typescript/unstable/ast` tokens with line/column locations; never regex-scan bundles or generated files.

- [x] **Step 3: Enforce the asset rules.** Report internal asset imports from simulation, Node builtins/Phaser/filesystem imports from the browser asset package, media-extension literals in consumers, `/packs/` and `assets/personal` literals, and `pack.json`/`catalog.json`/`media/` paths outside the manifest/tooling/fixture/composition allowlists. Keep diagnostics relative to `root`.

- [x] **Step 4: Integrate the scanner and policy.** Append `checkAssetBoundaries(root)` to the existing `checkBoundaries` result and add the `@huntbound/assets` external rule with `allowedDependencies: ['zod']`, `forbidDomLibraries: ['phaser']`, and `forbidNodeBuiltins: true`.

- [x] **Step 5: Run the boundary RED/GREEN suite.**

Run: `node --test tools/architecture/asset-boundaries.test.ts tools/architecture/check-boundaries.test.ts`

Expected: all negative fixtures fail with actionable relative diagnostics and the current repository returns no boundary diagnostics.

---

### Task 6: Document profiles, update handoff, and run complete gates

**Files:**
- Create: `docs/assets/ASSET_PROFILES.md`
- Modify: `docs/playbooks/PB-02/STATE.md`

**Interfaces:**
- Consumes: implemented profile APIs, scripts, proof output, and fresh verification evidence.
- Produces: durable PB-02-05 documentation, `PB-02-06` as the next eligible task, and an auditable integrated state record.

- [x] **Step 1: Document profile policy and commands.** Record profile/license matrix, catalog layout, staging guarantees, product defense-in-depth, source-root environment rule, reproducible/local gates, ignored output paths, Vite guard timing, and boundary allowlists. Keep the personal export path out of versioned output.

- [x] **Step 2: Update `STATE.md`.** Mark PB-02-05 `done`, record branch and integrated commit, fresh command exit codes/counts, negative/positive product proof, scripts and ignored-path evidence, effective skills/validator, and PB-02-06 as next eligible. Preserve PB-02-03/04 handoff facts and state that app composition/provider use was not implemented.

- [x] **Step 3: Run the full verification matrix.**

```powershell
corepack pnpm assets:check
corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts
corepack pnpm --filter @huntbound/assets test
corepack pnpm typecheck
corepack pnpm architecture:check
corepack pnpm build
corepack pnpm exec biome check tools/asset-packer tools/architecture packages/assets apps/game/vite.config.ts package.json
corepack pnpm format:check
git diff --check
git ls-files apps/game/public/assets
```

Expected: every command exits 0; the final tracked-file scan is empty for generated profile trees.

- [x] **Step 4: Commit and integrate only after fresh verification.** Commit the task branch with `feat: enforce asset build profiles`, fast-forward `main`, rerun `assets:check`, `architecture:check`, and `build` on `main`, then remove only the validated worktree/branch after confirming the expected commit is an ancestor.

## Self-Review

- Every task card requirement maps to a concrete file and RED/GREEN or gate step.
- The target/source profile distinction is explicit, so staging the `test` golden into `product` cannot bypass target license checks.
- Pack verification remains delegated to the existing verifier; profile code checks only transitive references, policies, and transaction boundaries.
- The Vite mode is explicit and the plugin knows only the profile root; app feature code remains outside PB-02-05.
- Boundary scanning is source-only and allowlisted, with no bundle regex or generated-output dependency.
