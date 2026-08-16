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
  runtimeFactory: (input: {
    readonly profile: AppAssetProfile;
    readonly catalogUrl: string;
  }) => AssetRuntime = createAssetRuntime,
): AssetRuntime {
  return runtimeFactory({
    profile,
    catalogUrl: getHuntAssetCatalogUrl(profile),
  });
}
