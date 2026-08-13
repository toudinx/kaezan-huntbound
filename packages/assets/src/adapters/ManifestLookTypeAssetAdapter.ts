import type { AssetKey, LookTypeId } from '../manifest/identity.ts';
import type { AssetPackRegistry } from '../providers/AssetPackRegistry.ts';
import type { LookTypeAssetAdapter } from './LookTypeAssetAdapter.ts';

export class ManifestLookTypeAssetAdapter implements LookTypeAssetAdapter {
  constructor(private readonly registry: AssetPackRegistry) {}

  resolveLookType(id: LookTypeId): AssetKey {
    return this.registry.resolveSourceIdentity({ kind: 'lookType', id });
  }
}
