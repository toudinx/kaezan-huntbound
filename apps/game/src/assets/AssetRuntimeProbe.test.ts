import { describe, expect, it } from 'vitest';

import { createAssetKey } from '../../../../packages/assets/src/index.ts';
import { installAssetRuntimeProbe } from './AssetRuntimeProbe';
import type { AssetRuntime, AssetRuntimeSnapshot } from './createAssetRuntime';

function makeSnapshot(
  state: AssetRuntimeSnapshot['state'],
): AssetRuntimeSnapshot {
  const keys =
    state === 'loaded'
      ? Object.freeze([createAssetKey('outfit:tibia:knight')])
      : Object.freeze([] as const);

  return Object.freeze({
    state,
    count: keys.length,
    keys,
  });
}

function createControlledRuntime(): AssetRuntime {
  let state: AssetRuntimeSnapshot['state'] = 'loaded';

  return {
    snapshot: () => makeSnapshot(state),
    unload: async () => {
      state = 'unloaded';
    },
    preload: async () => {
      state = 'loaded';
      return [];
    },
  };
}

describe('AssetRuntimeProbe', () => {
  it('installs the probe only for test', () => {
    const target = {} as Window;
    const runtime = createControlledRuntime();

    expect(
      installAssetRuntimeProbe('personal', runtime, target),
    ).toBeUndefined();
    expect('__huntboundAssetProbe' in target).toBe(false);
    expect(
      installAssetRuntimeProbe('product', runtime, target),
    ).toBeUndefined();
    expect('__huntboundAssetProbe' in target).toBe(false);

    const probe = installAssetRuntimeProbe('test', runtime, target);
    expect(probe).toBe(target.__huntboundAssetProbe);
    expect(target.__huntboundAssetProbe?.snapshot()).toEqual(
      runtime.snapshot(),
    );
  });

  it('delegates unload and reload and returns fresh immutable snapshots', async () => {
    const target = {} as Window;
    const runtime = createControlledRuntime();
    const probe = installAssetRuntimeProbe('test', runtime, target);

    expect(probe).toBeDefined();
    if (!probe) {
      throw new Error('Expected a test probe.');
    }

    const first = probe.snapshot();
    const unloaded = await probe.unload();
    const reloaded = await probe.reload();

    expect(unloaded).toEqual({ state: 'unloaded', count: 0, keys: [] });
    expect(reloaded).toEqual({
      state: 'loaded',
      count: 1,
      keys: ['outfit:tibia:knight'],
    });
    expect(reloaded).not.toBe(first);
    expect(Object.isFrozen(reloaded)).toBe(true);
    expect(Object.isFrozen(reloaded.keys)).toBe(true);
  });
});
