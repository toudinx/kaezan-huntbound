import type { HuntIndexEntry } from '../../../../packages/contracts/src/index.ts';
import {
  type AppAssetProfile,
  getHuntAssetCatalogUrl,
} from '../assets/AssetProfile';
import {
  type AssetRuntime,
  createAssetRuntime,
} from '../assets/createAssetRuntime';

export function createHuntRuntime(
  profile: AppAssetProfile,
  hunt: Pick<HuntIndexEntry, 'runtimeDirectory'>,
  runtimeFactory: (input: {
    readonly profile: AppAssetProfile;
    readonly catalogUrl: string;
  }) => AssetRuntime = createAssetRuntime,
): AssetRuntime {
  return runtimeFactory({
    profile,
    catalogUrl: getHuntAssetCatalogUrl(profile, hunt),
  });
}
