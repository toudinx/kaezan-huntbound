import type {
  AssetBuildProfile,
  AssetPackCatalog,
  AssetPackManifest,
  AssetPackReference,
  AssetValidationResult,
} from '../../../packages/assets/src/index.ts';

import type { VerifiedAssetPack } from '../pack/verifyMaterializedAssetPack.ts';

export interface ProfilePolicyPack {
  readonly reference: AssetPackReference;
  readonly manifest: AssetPackManifest;
}

export interface ValidatedProfilePack extends ProfilePolicyPack {
  readonly packRoot: string;
  readonly verified: VerifiedAssetPack;
}

export interface ValidatedAssetProfile {
  readonly profile: AssetBuildProfile;
  readonly profileRoot: string;
  readonly catalogPath: string;
  readonly catalog: AssetPackCatalog;
  readonly packs: readonly ValidatedProfilePack[];
}

export type StagedAssetProfile = ValidatedAssetProfile;

export type AssetProfileValidationResult =
  AssetValidationResult<ValidatedAssetProfile>;
