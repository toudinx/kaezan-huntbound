import type { AssetPackRegistry } from '../providers/AssetPackRegistry.ts';
import type { AssetIdAdapters } from './AssetIdAdapters.ts';
import { ManifestClientIdAssetAdapter } from './ManifestClientIdAssetAdapter.ts';
import { ManifestEffectIdAssetAdapter } from './ManifestEffectIdAssetAdapter.ts';
import { ManifestLookTypeAssetAdapter } from './ManifestLookTypeAssetAdapter.ts';
import { ManifestMissileIdAssetAdapter } from './ManifestMissileIdAssetAdapter.ts';

export function createManifestAssetAdapters(
  registry: AssetPackRegistry,
): AssetIdAdapters {
  return {
    lookTypes: new ManifestLookTypeAssetAdapter(registry),
    clientIds: new ManifestClientIdAssetAdapter(registry),
    effects: new ManifestEffectIdAssetAdapter(registry),
    missiles: new ManifestMissileIdAssetAdapter(registry),
  };
}
