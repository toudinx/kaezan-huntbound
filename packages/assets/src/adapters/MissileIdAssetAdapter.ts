import type { AssetKey, MissileId } from '../manifest/identity.ts';

export interface MissileIdAssetAdapter {
  resolveMissileId(id: MissileId): AssetKey;
}
