import type { AppAssetProfile } from './AssetProfile';
import type { AssetRuntime, AssetRuntimeSnapshot } from './createAssetRuntime';

export interface HuntboundAssetProbe {
  snapshot(): AssetRuntimeSnapshot;
  unload(): Promise<AssetRuntimeSnapshot>;
  reload(): Promise<AssetRuntimeSnapshot>;
}

declare global {
  interface Window {
    __huntboundAssetProbe?: HuntboundAssetProbe;
  }
}

function copySnapshot(snapshot: AssetRuntimeSnapshot): AssetRuntimeSnapshot {
  const keys = Object.freeze([...snapshot.keys]);

  return Object.freeze({
    state: snapshot.state,
    count: snapshot.count,
    keys,
  });
}

export function installAssetRuntimeProbe(
  profile: AppAssetProfile,
  runtime: AssetRuntime,
  target: Window,
): HuntboundAssetProbe | undefined {
  if (profile !== 'test') {
    return undefined;
  }

  const probe: HuntboundAssetProbe = {
    snapshot: () => copySnapshot(runtime.snapshot()),
    unload: async () => {
      await runtime.unload();
      return copySnapshot(runtime.snapshot());
    },
    reload: async () => {
      await runtime.preload();
      return copySnapshot(runtime.snapshot());
    },
  };

  target.__huntboundAssetProbe = probe;
  return probe;
}
