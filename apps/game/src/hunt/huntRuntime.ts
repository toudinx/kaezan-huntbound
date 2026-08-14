import {
  createAssetRuntime,
  type AssetRuntime,
} from '../assets/createAssetRuntime';
import {
  getHuntAssetCatalogUrl,
  type AppAssetProfile,
} from '../assets/AssetProfile';

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
