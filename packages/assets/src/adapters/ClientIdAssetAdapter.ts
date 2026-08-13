import type { AssetKey, ClientId } from '../manifest/identity.ts';

export interface ClientIdAssetAdapter {
  resolveClientId(id: ClientId): AssetKey;
}
