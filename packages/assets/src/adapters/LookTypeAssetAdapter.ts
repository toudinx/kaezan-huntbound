import type { AssetKey, LookTypeId } from '../manifest/identity.ts';

export interface LookTypeAssetAdapter {
  resolveLookType(id: LookTypeId): AssetKey;
}
