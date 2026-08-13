import { describe, expect, it } from 'vitest';

import {
  AssetProviderError,
  createAssetKey,
  type AssetKey,
  type AssetProvider,
  type ResolvedAsset,
} from '../../../../packages/assets/src/index.ts';

import { createAssetRuntime } from './createAssetRuntime';

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
    mediaUrl: `blob:${key}`,
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
    validateKeys: () => ({
      ok: true,
      value: [] as readonly AssetKey[],
    }),
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

describe('createAssetRuntime', () => {
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
    expect(runtime.snapshot()).toEqual({
      state: 'unloaded',
      count: 0,
      keys: [],
    });
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
});
