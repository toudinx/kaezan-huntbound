import type { AssetKey, ClientId } from '../manifest/identity.ts';
import type { AssetPackRegistry } from '../providers/AssetPackRegistry.ts';
import type { ClientIdAssetAdapter } from './ClientIdAssetAdapter.ts';

export class ManifestClientIdAssetAdapter implements ClientIdAssetAdapter {
  constructor(private readonly registry: AssetPackRegistry) {}

  resolveClientId(id: ClientId): AssetKey {
    return this.registry.resolveSourceIdentity({ kind: 'clientId', id });
  }
}
