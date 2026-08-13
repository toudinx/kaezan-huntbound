import type { AssetKey, EffectId } from '../manifest/identity.ts';
import type { AssetPackRegistry } from '../providers/AssetPackRegistry.ts';
import type { EffectIdAssetAdapter } from './EffectIdAssetAdapter.ts';

export class ManifestEffectIdAssetAdapter implements EffectIdAssetAdapter {
  constructor(private readonly registry: AssetPackRegistry) {}

  resolveEffectId(id: EffectId): AssetKey {
    return this.registry.resolveSourceIdentity({ kind: 'effectId', id });
  }
}
