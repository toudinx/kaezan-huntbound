import type { AssetKey, MissileId } from '../manifest/identity.ts';
import type { AssetPackRegistry } from '../providers/AssetPackRegistry.ts';
import type { MissileIdAssetAdapter } from './MissileIdAssetAdapter.ts';

export class ManifestMissileIdAssetAdapter implements MissileIdAssetAdapter {
  constructor(private readonly registry: AssetPackRegistry) {}

  resolveMissileId(id: MissileId): AssetKey {
    return this.registry.resolveSourceIdentity({ kind: 'missileId', id });
  }
}
