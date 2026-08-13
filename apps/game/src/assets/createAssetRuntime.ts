import {
  createFetchAssetProvider,
  type AssetBuildProfile,
  type AssetKey,
  type AssetProvider,
  type ResolvedAsset,
} from '../../../../packages/assets/src/index.ts';

import type { AppAssetProfile } from './AssetProfile';

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

function compareKeys(left: AssetKey, right: AssetKey): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function makeSnapshot(
  state: AssetRuntimeSnapshot['state'],
  keys: readonly AssetKey[],
): AssetRuntimeSnapshot {
  const frozenKeys = Object.freeze([...keys].sort(compareKeys));

  return Object.freeze({
    state,
    count: frozenKeys.length,
    keys: frozenKeys,
  });
}

const defaultProviderFactory: AssetProviderFactory = ({
  profile,
  catalogUrl,
}) => createFetchAssetProvider({ profile, catalogUrl });

export function createAssetRuntime(input: {
  readonly profile: AppAssetProfile;
  readonly catalogUrl: string;
  readonly providerFactory?: AssetProviderFactory;
}): AssetRuntime {
  const providerFactory = input.providerFactory ?? defaultProviderFactory;
  let providerPromise: Promise<AssetProvider> | undefined;
  let loadPromise: Promise<readonly ResolvedAsset[]> | undefined;
  let unloadPromise: Promise<void> | undefined;
  let state: AssetRuntimeSnapshot['state'] = 'idle';
  let loadedAssets: readonly ResolvedAsset[] = Object.freeze([]);
  let currentSnapshot = makeSnapshot(state, []);

  const getProvider = (): Promise<AssetProvider> => {
    providerPromise ??= providerFactory({
      profile: input.profile,
      catalogUrl: input.catalogUrl,
    });
    return providerPromise;
  };

  const preload = (): Promise<readonly ResolvedAsset[]> => {
    if (state === 'loaded') {
      return Promise.resolve(loadedAssets);
    }

    if (loadPromise !== undefined) {
      return loadPromise;
    }

    const currentLoad = (async () => {
      if (unloadPromise !== undefined) {
        await unloadPromise;
      }

      const provider = await getProvider();
      const assets = Object.freeze(
        [...(await provider.loadPreloads())].sort((left, right) =>
          compareKeys(left.key, right.key),
        ),
      );

      loadedAssets = assets;
      state = 'loaded';
      currentSnapshot = makeSnapshot(
        state,
        assets.map((asset) => asset.key),
      );

      return assets;
    })();

    loadPromise = currentLoad;
    currentLoad.then(
      () => {
        if (loadPromise === currentLoad) {
          loadPromise = undefined;
        }
      },
      () => {
        if (loadPromise === currentLoad) {
          loadPromise = undefined;
        }

        if (state === 'loaded') {
          return;
        }

        loadedAssets = Object.freeze([]);
        state = state === 'unloaded' ? 'unloaded' : 'idle';
        currentSnapshot = makeSnapshot(state, []);
      },
    );

    return currentLoad;
  };

  const unload = (): Promise<void> => {
    if (unloadPromise !== undefined) {
      return unloadPromise;
    }

    const currentUnload = (async () => {
      const pendingLoad = loadPromise;
      if (pendingLoad !== undefined) {
        try {
          await pendingLoad;
        } catch {
          // The provider still needs cleanup after a failed load.
        }
      }

      const provider =
        providerPromise === undefined ? undefined : await providerPromise;
      await provider?.unloadAll();

      loadedAssets = Object.freeze([]);
      state = 'unloaded';
      currentSnapshot = makeSnapshot(state, []);
    })();

    unloadPromise = currentUnload;
    currentUnload.then(
      () => {
        if (unloadPromise === currentUnload) {
          unloadPromise = undefined;
        }
      },
      () => {
        if (unloadPromise === currentUnload) {
          unloadPromise = undefined;
        }
      },
    );

    return currentUnload;
  };

  return {
    preload,
    unload,
    snapshot: () => currentSnapshot,
  };
}
