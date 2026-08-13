import type { AssetKey, EffectId } from '../manifest/identity.ts';

export interface EffectIdAssetAdapter {
  resolveEffectId(id: EffectId): AssetKey;
}
