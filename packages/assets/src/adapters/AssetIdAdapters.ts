import type { ClientIdAssetAdapter } from './ClientIdAssetAdapter.ts';
import type { EffectIdAssetAdapter } from './EffectIdAssetAdapter.ts';
import type { LookTypeAssetAdapter } from './LookTypeAssetAdapter.ts';
import type { MissileIdAssetAdapter } from './MissileIdAssetAdapter.ts';

export interface AssetIdAdapters {
  readonly lookTypes: LookTypeAssetAdapter;
  readonly clientIds: ClientIdAssetAdapter;
  readonly effects: EffectIdAssetAdapter;
  readonly missiles: MissileIdAssetAdapter;
}
