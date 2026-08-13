import type {
  AssetBuildProfile,
  AssetKey,
  AssetPackCatalog,
  AssetValidationResult,
} from '../../../packages/assets/src/index.ts';
import { validateAssetPackCatalog } from '../../../packages/assets/src/index.ts';

import { compareAssetText } from '../pack/assetPackSupport.ts';

export function createSinglePackAssetCatalog(input: {
  readonly profile: AssetBuildProfile;
  readonly packId: string;
  readonly manifestPath: string;
  readonly requiredKeys: readonly AssetKey[];
}): AssetValidationResult<AssetPackCatalog> {
  return validateAssetPackCatalog({
    schemaVersion: '1',
    profile: input.profile,
    packs: [
      {
        packId: input.packId,
        manifestPath: input.manifestPath,
      },
    ],
    preloads: [
      {
        packId: input.packId,
        requiredKeys: [...input.requiredKeys].sort(compareAssetText),
      },
    ],
  });
}
