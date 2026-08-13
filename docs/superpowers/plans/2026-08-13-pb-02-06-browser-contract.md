# PB-02-06 Browser Asset Contract Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Connect the public asset provider to the game composition root and prove in Chromium that the test profile loads, resolves, unloads, and reloads the five PB-02 contract keys before Phaser becomes ready.

**Architecture:** Keep profile selection, provider lifecycle, and the test-only browser probe in three small modules under apps/game/src/assets. main.ts derives the profile from Vite mode, awaits the runtime preload, publishes asset readiness, installs the probe only for test, and only then creates Phaser. The existing provider, packer, schemas, and build guard remain unchanged.

**Tech Stack:** TypeScript 7 strict, Vite 8, Vitest 4, Phaser 4, @huntbound/assets, Playwright Chromium, pnpm workspace.

## Global Constraints

- The only asset bootstrap URL is /assets/<profile>/catalog.json.
- The profile is derived only from import.meta.env.MODE and is one of test, personal, or product.
- Scene, simulation, and UI code must not contain pack paths, media paths, atlas paths, or legacy numeric IDs.
- The test probe exposes only serializable snapshots plus unload() and reload().
- Preload completes before data-assets-ready="true" and before Phaser is created.
- Preload failure is blocking and actionable; it must not start Phaser or silently substitute visuals.
- The default runtime factory delegates to the public createFetchAssetProvider export.
- Runtime snapshots expose lexicographically ordered stable keys and are immutable by reference.
- unload() calls provider unloadAll() and leaves zero keys; reload reuses the same provider instance.
- Fast 4G boot remains at or below 5,000 ms.
- Do not modify provider, packer, schema, build guard, scene, simulation, or unrelated test behavior.
- Do not use personal PNGs in Playwright; use only the staged synthetic test profile.

## File Map

- Create apps/game/src/assets/AssetProfile.ts: app profile allowlist and catalog URL composition.
- Create apps/game/src/assets/AssetProfile.test.ts: profile and URL contract tests.
- Create apps/game/src/assets/createAssetRuntime.ts: renderer-agnostic provider lifecycle and immutable snapshots.
- Create apps/game/src/assets/createAssetRuntime.test.ts: runtime state, idempotence, unload/reload, concurrency, and typed failure tests.
- Create apps/game/src/assets/AssetRuntimeProbe.ts: test-only window probe installation and global type declaration.
- Create apps/game/src/assets/AssetRuntimeProbe.test.ts: profile gating and probe operation tests.
- Modify apps/game/src/main.ts: await assets before Phaser and expose readiness/error state.
- Create apps/game/src/main.test.ts: composition-root ordering and blocking failure tests with injected ports.
- Modify apps/game/package.json: add the workspace dependency on @huntbound/assets.
- Modify pnpm-lock.yaml: record the workspace dependency using pnpm lockfile generation.
- Create tests/e2e/asset-pack.spec.ts: Chromium preload/unload/reload and network/console proof.
- Create docs/assets/BROWSER_ASSET_CONTRACT.md: browser bootstrap and lifecycle contract.
- Modify docs/playbooks/PB-02/STATE.md: record PB-02-06 evidence and make PB-02-07 eligible.

---

### Task 1: Freeze the app profile and catalog URL

**Files:**

- Create apps/game/src/assets/AssetProfile.test.ts
- Create apps/game/src/assets/AssetProfile.ts

**Interfaces:**

- Produces AppAssetProfile, parseAppAssetProfile(mode: string): AppAssetProfile, and getAssetCatalogUrl(profile: AppAssetProfile): string.
- AppAssetProfile is exactly 'test' | 'personal' | 'product'.

- [ ] Step 1: Write the failing profile tests

```
import { describe, expect, it } from 'vitest';

import {
  getAssetCatalogUrl,
  parseAppAssetProfile,
} from './AssetProfile';

describe('AssetProfile', () => {
  it.each(['test', 'personal', 'product'] as const)(
    'accepts the %s build mode',
    (mode) => {
      expect(parseAppAssetProfile(mode)).toBe(mode);
    },
  );

  it('rejects an unsupported mode with an actionable message', () => {
    expect(() => parseAppAssetProfile('preview')).toThrowError(
      'Unsupported game asset profile "preview"; use test, personal, or product.',
    );
  });

  it.each(['test', 'personal', 'product'] as const)(
    'composes only the catalog route for %s',
    (profile) => {
      const url = getAssetCatalogUrl(profile);

      expect(url).toBe('/assets/' + profile + '/catalog.json');
      expect(url).not.toMatch(/[\\\\]|:\\/\\//);
      expect(url).not.toContain('/media/');
      expect(url).not.toContain('/packs/');
    },
  );
});
```

- [ ] Step 2: Run the focused test and verify RED

Run:

```
corepack pnpm --filter @huntbound/game test -- AssetProfile.test.ts
```

Expected: Vitest fails because AssetProfile.ts does not exist.

- [ ] Step 3: Implement the allowlist and pure URL function

```
export type AppAssetProfile = 'test' | 'personal' | 'product';

export function parseAppAssetProfile(mode: string): AppAssetProfile {
  if (mode === 'test' || mode === 'personal' || mode === 'product') {
    return mode;
  }

  throw new Error(
    'Unsupported game asset profile "' +
      mode +
      '"; use test, personal, or product.',
  );
}

export function getAssetCatalogUrl(profile: AppAssetProfile): string {
  return '/assets/' + profile + '/catalog.json';
}
```

- [ ] Step 4: Run the focused test and verify GREEN

Run the same Vitest command. Expected: all profile and URL cases pass.

- [ ] Step 5: Run game typecheck

```
corepack pnpm --filter @huntbound/game typecheck
```

Expected: exit code 0.

### Task 2: Implement the provider-backed asset runtime

**Files:**

- Create apps/game/src/assets/createAssetRuntime.test.ts
- Create apps/game/src/assets/createAssetRuntime.ts

**Interfaces:**

- Consumes public @huntbound/assets types AssetProvider, AssetBuildProfile, AssetKey, and ResolvedAsset, plus createFetchAssetProvider.
- Produces AssetRuntimeSnapshot, AssetRuntime, AssetProviderFactory, and createAssetRuntime.

```
export interface AssetRuntimeSnapshot {
  readonly state: 'idle' | 'loaded' | 'unloaded';
  readonly count: number;
  readonly keys: readonly AssetKey[];
}

export interface AssetRuntime {
  preload(): Promise<readonly ResolvedAsset[]>;
  unload(): Promise<void>;
  snapshot(): AssetRuntimeSnapshot;
}

export type AssetProviderFactory = (input: {
  readonly profile: AssetBuildProfile;
  readonly catalogUrl: string;
}) => Promise<AssetProvider>;

export function createAssetRuntime(input: {
  readonly profile: AppAssetProfile;
  readonly catalogUrl: string;
  readonly providerFactory?: AssetProviderFactory;
}): AssetRuntime;
```

- [ ] Step 1: Write the fake provider and failing lifecycle tests

Use createAssetKey for the five stable keys and a complete renderer-agnostic ResolvedAsset fixture. The fake provider needs only a typed empty adapters value, a loadPreloads implementation, and unloadAll; other methods can throw because the runtime must not call them.

```
const contractKeys = [
  'outfit:tibia:knight',
  'creature:tibia:rotworm',
  'item:tibia:gold-coin',
  'effect:tibia:energy-hit',
  'missile:tibia:energy-ball',
] as const;

function resolvedAsset(key: (typeof contractKeys)[number]): ResolvedAsset {
  const category = key.startsWith('item:') ? 'object' : key.split(':')[0];

  return {
    key: createAssetKey(key),
    category: category as ResolvedAsset['category'],
    mediaUrl: 'blob:' + key,
    mediaSha256: 'a'.repeat(64),
    byteLength: 1,
    cellWidth: 1,
    cellHeight: 1,
    columns: 1,
    atlasFrameCount: 1,
    animations: [],
    pivot: { x: 0.5, y: 0.5 },
    scale: 1,
    filtering: 'nearest',
  };
}

function createFakeProvider() {
  let loadCount = 0;
  let unloadCount = 0;
  const provider: AssetProvider = {
    adapters: {} as AssetProvider['adapters'],
    loadPack: async () => undefined,
    loadPreloads: async () => {
      loadCount += 1;
      return [...contractKeys].reverse().map(resolvedAsset);
    },
    validateKeys: () => ({ ok: true, value: [] }),
    resolve: () => {
      throw new Error('resolve is not used by the runtime test');
    },
    unloadPack: async () => undefined,
    unloadAll: async () => {
      unloadCount += 1;
    },
  };

  return {
    provider,
    counts: () => ({ loadCount, unloadCount }),
  };
}

it('loads five sorted keys once, unloads them, and reloads with one provider', async () => {
  const fake = createFakeProvider();
  let factoryCount = 0;
  const runtime = createAssetRuntime({
    profile: 'test',
    catalogUrl: '/assets/test/catalog.json',
    providerFactory: async () => {
      factoryCount += 1;
      return fake.provider;
    },
  });

  expect(runtime.snapshot()).toEqual({ state: 'idle', count: 0, keys: [] });
  await runtime.preload();
  expect(runtime.snapshot()).toEqual({
    state: 'loaded',
    count: 5,
    keys: [...contractKeys].sort().map(createAssetKey),
  });
  await runtime.preload();
  expect(fake.counts()).toEqual({ loadCount: 1, unloadCount: 0 });

  await runtime.unload();
  expect(runtime.snapshot()).toEqual({ state: 'unloaded', count: 0, keys: [] });
  await runtime.preload();
  expect(runtime.snapshot().count).toBe(5);
  expect(fake.counts()).toEqual({ loadCount: 2, unloadCount: 1 });
  expect(factoryCount).toBe(1);
});

it('shares the provider promise and load promise across concurrent preloads', async () => {
  const fake = createFakeProvider();
  let factoryCount = 0;
  const runtime = createAssetRuntime({
    profile: 'test',
    catalogUrl: '/assets/test/catalog.json',
    providerFactory: async () => {
      factoryCount += 1;
      await Promise.resolve();
      return fake.provider;
    },
  });

  await Promise.all([runtime.preload(), runtime.preload()]);

  expect(factoryCount).toBe(1);
  expect(fake.counts().loadCount).toBe(1);
});

it('keeps the typed provider error and does not publish loaded state', async () => {
  const error = new AssetProviderError(
    'ASSET_MEDIA_HASH_MISMATCH',
    'synthetic media hash failure',
  );
  const fake = createFakeProvider();
  fake.provider.loadPreloads = async () => {
    throw error;
  };
  const runtime = createAssetRuntime({
    profile: 'test',
    catalogUrl: '/assets/test/catalog.json',
    providerFactory: async () => fake.provider,
  });

  await expect(runtime.preload()).rejects.toBe(error);
  expect(runtime.snapshot()).toEqual({ state: 'idle', count: 0, keys: [] });
});

it('freezes snapshots and key arrays', () => {
  const runtime = createAssetRuntime({
    profile: 'test',
    catalogUrl: '/assets/test/catalog.json',
    providerFactory: async () => createFakeProvider().provider,
  });

  const snapshot = runtime.snapshot();
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.keys)).toBe(true);
});
```

- [ ] Step 2: Run the runtime test and verify RED

```
corepack pnpm --filter @huntbound/game test -- createAssetRuntime.test.ts
```

Expected: missing-module/factory failures because the runtime module does not exist.

- [ ] Step 3: Implement memoized provider and state transitions

Use only public @huntbound/assets exports. Keep the provider promise after unload, keep a separate in-flight load promise for concurrent calls, and freeze every snapshot.

```
const defaultProviderFactory: AssetProviderFactory = ({
  profile,
  catalogUrl,
}) => createFetchAssetProvider({ profile, catalogUrl });

function makeSnapshot(
  state: AssetRuntimeSnapshot['state'],
  keys: readonly AssetKey[],
): AssetRuntimeSnapshot {
  const frozenKeys = Object.freeze(
    [...keys].sort((left, right) => left.localeCompare(right)),
  );
  return Object.freeze({
    state,
    count: frozenKeys.length,
    keys: frozenKeys,
  });
}
```

The preload algorithm returns the loaded asset array immediately when already loaded, returns the current in-flight promise when loading, awaits an in-flight unload before starting a new load, sorts resolved assets by key, and resets to idle on an initial load failure or retains unloaded after a failed reload. The unload algorithm awaits an in-flight preload (swallowing its failure only for cleanup), awaits the memoized provider if it exists, calls unloadAll(), then publishes an empty unloaded snapshot.

- [ ] Step 4: Run the runtime tests and typecheck

```
corepack pnpm --filter @huntbound/game test -- createAssetRuntime.test.ts
corepack pnpm --filter @huntbound/game typecheck
```

Expected: all runtime tests pass and typecheck exits 0.

### Task 3: Add the test-only asset probe

**Files:**

- Create apps/game/src/assets/AssetRuntimeProbe.test.ts
- Create apps/game/src/assets/AssetRuntimeProbe.ts

**Interfaces:**

- Consumes AppAssetProfile, AssetRuntime, and AssetRuntimeSnapshot.
- Produces HuntboundAssetProbe and installAssetRuntimeProbe(profile, runtime, target).

```
export interface HuntboundAssetProbe {
  snapshot(): AssetRuntimeSnapshot;
  unload(): Promise<AssetRuntimeSnapshot>;
  reload(): Promise<AssetRuntimeSnapshot>;
}
```

- [ ] Step 1: Write failing tests for profile gating and operations

```
it('installs the probe only for test', () => {
  const target = {} as Window;
  const runtime = createControlledRuntime();

  expect(installAssetRuntimeProbe('personal', runtime, target)).toBeUndefined();
  expect('__huntboundAssetProbe' in target).toBe(false);
  expect(installAssetRuntimeProbe('product', runtime, target)).toBeUndefined();
  expect('__huntboundAssetProbe' in target).toBe(false);

  const probe = installAssetRuntimeProbe('test', runtime, target);
  expect(probe).toBe(target.__huntboundAssetProbe);
  expect(target.__huntboundAssetProbe?.snapshot()).toEqual(runtime.snapshot());
});

it('delegates unload and reload and returns fresh immutable snapshots', async () => {
  const target = {} as Window;
  const runtime = createControlledRuntime();
  const probe = installAssetRuntimeProbe('test', runtime, target);

  expect(probe).toBeDefined();
  const first = probe?.snapshot();
  const unloaded = await probe?.unload();
  const reloaded = await probe?.reload();

  expect(unloaded?.state).toBe('unloaded');
  expect(unloaded?.count).toBe(0);
  expect(reloaded).toEqual(runtime.snapshot());
  expect(reloaded).not.toBe(first);
  expect(Object.isFrozen(reloaded)).toBe(true);
  expect(Object.isFrozen(reloaded?.keys)).toBe(true);
});
```

The test helper implements snapshot, unload, and preload with a small state variable and returns frozen snapshots; it does not expose a provider.

- [ ] Step 2: Run the probe test and verify RED

```
corepack pnpm --filter @huntbound/game test -- AssetRuntimeProbe.test.ts
```

Expected: missing-module/export failure.

- [ ] Step 3: Implement the gated closure probe

Declare the optional global in this module only:

```
declare global {
  interface Window {
    __huntboundAssetProbe?: HuntboundAssetProbe;
  }
}
```

Return undefined without touching target for personal and product. For test, create a closure that calls runtime.snapshot(), awaits runtime.unload() and returns the resulting snapshot, or awaits runtime.preload() and returns runtime.snapshot() for reload. Assign the closure to target.__huntboundAssetProbe and return it.

- [ ] Step 4: Run probe tests and typecheck

```
corepack pnpm --filter @huntbound/game test -- AssetRuntimeProbe.test.ts
corepack pnpm --filter @huntbound/game typecheck
```

Expected: all probe tests pass and typecheck exits 0.

### Task 4: Integrate preload into the composition root

**Files:**

- Create apps/game/src/main.test.ts
- Modify apps/game/src/main.ts

**Interfaces:**

- main.ts exports bootstrapApp(overrides?: MainBootstrapOverrides): Promise<void> so the order can be tested without starting real Phaser in Vitest.
- The browser entrypoint calls await bootstrapApp() only when document exists.

- [ ] Step 1: Write the failing order test with injected ports

Build a fake document with #shell-root, #game-root, and #ui-root, fake app-shell/viewport/lifecycle ports, and a fake runtime whose preload() appends preload:start/preload:end to an event log. Inject createAssetRuntime, installAssetRuntimeProbe, and createGame into bootstrapApp.

```
it('preloads assets before readiness, probe installation, and Phaser creation', async () => {
  const events: string[] = [];
  const runtime = createFakeRuntime(events);
  const roots = createFakeRoots();

  await bootstrapApp({
    document: roots.document,
    window: roots.window,
    createAssetRuntime: (input) => {
      events.push('runtime:' + input.profile + ':' + input.catalogUrl);
      return runtime;
    },
    installAssetRuntimeProbe: (profile, activeRuntime) => {
      events.push('probe:' + profile + ':' + (activeRuntime === runtime));
      return undefined;
    },
    mountAppShell: () => {
      events.push('shell');
      return { destroy: () => undefined };
    },
    createGame: () => {
      events.push('game');
      return fakeGameRuntime;
    },
    createViewportController: () => ({ start: () => () => undefined }),
    createRuntimeLifecycle: () => ({ start: () => () => undefined }),
  });

  expect(events).toEqual([
    'runtime:test:/assets/test/catalog.json',
    'shell',
    'preload:start',
    'preload:end',
    'probe:test:true',
    'game',
  ]);
  expect(roots.shellRoot.getAttribute('data-assets-ready')).toBe('true');
  expect(roots.shellRoot.getAttribute('data-assets-count')).toBe('5');
});
```

- [ ] Step 2: Run the main test and verify RED

```
corepack pnpm --filter @huntbound/game test -- main.test.ts
```

Expected: missing bootstrapApp/asset integration failure and no asset-order proof.

- [ ] Step 3: Add the blocking-failure assertions

Add a second test where runtime.preload() rejects an AssetProviderError. Assert:

```
expect(roots.shellRoot.getAttribute('data-assets-ready')).toBe('false');
expect(roots.shellRoot.getAttribute('data-assets-count')).toBe('0');
expect(events).not.toContain('game');
expect(bridgeSnapshot.phase).toBe('error');
expect(bridgeSnapshot.message).toContain('ASSET_MEDIA_HASH_MISMATCH');
```

Capture the bridge passed to the fake shell mount so the test checks that the error remains actionable without requiring a page exception.

- [ ] Step 4: Implement bootstrapApp with the frozen order

Keep the existing HMR teardown, viewport, lifecycle, shell, and performance logic. Move browser startup into bootstrapApp and use this sequence:

```
const profile = parseAppAssetProfile(import.meta.env.MODE);
const catalogUrl = getAssetCatalogUrl(profile);
const shellRoot = browserDocument.querySelector('#shell-root');
const gameRoot = browserDocument.querySelector('#game-root');
const uiRoot = browserDocument.querySelector('#ui-root');

setAssetReadiness(shellRoot, false, 0);
const bridge = createSceneBridge(initialBootSnapshot);
const assetRuntime = createAssetRuntime({ profile, catalogUrl });
const appShell = mountAppShell(uiRoot, bridge);

try {
  const assets = await assetRuntime.preload();
  setAssetReadiness(shellRoot, true, assets.length);
  if (profile === 'test') {
    installAssetRuntimeProbe(profile, assetRuntime, browserWindow);
  }
} catch (error) {
  setAssetReadiness(shellRoot, false, 0);
  bridge.publish({
    ...bridge.getSnapshot(),
    phase: 'error',
    renderer: 'unavailable',
    message: formatAssetBootError(error),
  });
  return;
}

const runtime = createGame(gameRoot, bridge);
// Existing viewport, lifecycle, performance, and HMR wiring follows here.
```

Use AssetProviderError to include its stable error code in the shell message. Do not create Phaser or register lifecycle/viewport resources before preload succeeds. The browser entrypoint must not execute in the node Vitest environment; guard the call with if (typeof document !== 'undefined') await bootstrapApp().

- [ ] Step 5: Run app tests and typecheck

```
corepack pnpm --filter @huntbound/game test
corepack pnpm --filter @huntbound/game typecheck
```

Expected: all app tests pass, including the new order/failure tests, and typecheck exits 0.

### Task 5: Add the browser contract proof and documentation

**Files:**

- Modify apps/game/package.json
- Modify pnpm-lock.yaml
- Create tests/e2e/asset-pack.spec.ts
- Create docs/assets/BROWSER_ASSET_CONTRACT.md

**Interfaces:**

- The browser test consumes window.__huntboundAssetProbe only in the Vite test build.
- The app consumes the catalog through the runtime; no test assertion may require an app source media path.

- [ ] Step 1: Add the workspace dependency and regenerate the lockfile

Add this direct dependency:

```
"dependencies": {
  "@huntbound/assets": "workspace:*",
  "phaser": "4.2.1"
}
```

Run:

```
corepack pnpm install --lockfile-only
```

Expected: only the @huntbound/game importer changes for the workspace dependency; package resolutions stay unchanged.

- [ ] Step 2: Write the failing Playwright scenario

```
import { expect, test } from '@playwright/test';

const expectedKeys = [
  'creature:tibia:rotworm',
  'effect:tibia:energy-hit',
  'item:tibia:gold-coin',
  'missile:tibia:energy-ball',
  'outfit:tibia:knight',
];

test('loads, unloads, and reloads the five browser asset contract keys', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const requestPaths: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    requestPaths.push(new URL(request.url()).pathname);
  });

  await page.goto('/');
  await expect(page.locator('#shell-root[data-assets-ready="true"]')).toHaveCount(1, {
    timeout: 5_000,
  });
  await expect(page.locator('#shell-root[data-assets-count="5"]')).toHaveCount(1);

  const initial = await page.evaluate(() => window.__huntboundAssetProbe?.snapshot());
  expect(initial).toEqual({ state: 'loaded', count: 5, keys: expectedKeys });

  const unloaded = await page.evaluate(async () => window.__huntboundAssetProbe?.unload());
  expect(unloaded).toEqual({ state: 'unloaded', count: 0, keys: [] });

  const reloaded = await page.evaluate(async () => window.__huntboundAssetProbe?.reload());
  expect(reloaded).toEqual({ state: 'loaded', count: 5, keys: expectedKeys });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(requestPaths).toContain('/assets/test/catalog.json');
});
```

Add a helper in the same spec to read /assets/test/catalog.json and each referenced pack manifest through page.evaluate, derive new URL(entry.media.path, manifestUrl).pathname, and assert every derived pathname appears in requestPaths. This keeps media discovery in the manifest and does not hardcode media hashes in the app.

- [ ] Step 3: Run the focused browser test and capture RED

```
corepack pnpm assets:stage:test
corepack pnpm exec playwright test tests/e2e/asset-pack.spec.ts --project=chromium
```

Expected: the scenario fails because the app has no asset runtime/probe integration yet.

- [ ] Step 4: Implement the dependency and browser documentation

Write BROWSER_ASSET_CONTRACT.md with these sections:

1. Bootstrap: the three profile routes and the catalog-only rule.
2. Boot order: profile/URL, runtime creation, preload, readiness attributes, test probe, Phaser.
3. Runtime lifecycle: idle/loaded/unloaded states, sorted keys, provider memoization, unload URL revocation, reload behavior, and typed blocking errors.
4. Probe boundary: test-only global, serializable snapshots, no registry or blob URL exposure, and no probe in personal/product builds.
5. Browser evidence: the Playwright command and the five stable keys.

Do not include personal paths, media hashes, or legacy IDs in consumer examples.

- [ ] Step 5: Run the focused browser test and verify GREEN

```
corepack pnpm assets:stage:test
corepack pnpm exec playwright test tests/e2e/asset-pack.spec.ts --project=chromium
```

Expected: the asset-pack scenario passes with zero console errors, page errors, failed requests, and all manifest-discovered media requests observed.

### Task 6: Update the PB-02 handoff and run all gates

**Files:**

- Modify docs/playbooks/PB-02/STATE.md

- [ ] Step 1: Run the complete task gate set

Run each command separately from the worktree root:

```
corepack pnpm assets:stage:test
corepack pnpm --filter @huntbound/game test
corepack pnpm --filter @huntbound/game typecheck
corepack pnpm --filter @huntbound/game build
corepack pnpm exec playwright test tests/e2e/asset-pack.spec.ts tests/e2e/boot-budget.spec.ts --project=chromium
corepack pnpm architecture:check
corepack pnpm verify
git diff --check
```

Expected: every command exits 0; the boot-budget output reports actionable duration at or below 5,000 ms.

- [ ] Step 2: Run the focused consumer-boundary scan

```
rg -n --glob 'apps/game/src/**/*.ts' --glob '!**/*.test.ts' 'media/|packs/|pack\\.json|catalog\\.json|\\.png|lookType|clientId|effectId|missileId' apps/game/src
```

Expected: no media/pack path or legacy numeric ID appears in consumer modules; the only catalog route is composed by AssetProfile.ts and the test probe type is not a media path.

- [ ] Step 3: Record handoff evidence

Update STATE.md with:

- PB-02-06 status done, branch codex/pb02-06-browser-contract, and the final implementation commit.
- Fresh counts for game tests, typecheck, build, Playwright asset-pack/boot-budget, architecture, and verify.
- Observed actionable boot duration from the boot-budget output.
- The five stable keys and the unload/reload result.
- Confirmation that no provider/packer/schema/guard files changed.
- PB-02-07 as the next eligible task.

- [ ] Step 4: Self-review the diff and commit the implementation

Run:

```
git diff --stat main...HEAD
git diff -- apps/game/src/assets apps/game/src/main.ts apps/game/src/main.test.ts apps/game/package.json pnpm-lock.yaml tests/e2e/asset-pack.spec.ts docs/assets/BROWSER_ASSET_CONTRACT.md docs/playbooks/PB-02/STATE.md
git status --short
```

Confirm the implementation diff contains only the task files. Then commit with:

```
git add apps/game/src/assets apps/game/src/main.ts apps/game/src/main.test.ts apps/game/package.json pnpm-lock.yaml tests/e2e/asset-pack.spec.ts docs/assets/BROWSER_ASSET_CONTRACT.md docs/playbooks/PB-02/STATE.md
git commit -m "feat: preload asset contract pack"
```

- [ ] Step 5: Verify the final worktree state

```
git diff --check HEAD^ HEAD
git status --short
git log -3 --oneline --decorate
```

Expected: clean worktree, implementation commit present, and no untracked staged assets or generated personal/product output.
