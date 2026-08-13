import type { AssetIdAdapters } from '../adapters/AssetIdAdapters.ts';
import type { AssetValidationResult } from '../manifest/diagnostics.ts';
import type { AssetKey } from '../manifest/identity.ts';
import type {
  AssetAnimationGroup,
  AssetBuildProfile,
  AssetPackEntry,
  AssetSourceIdentity,
} from '../manifest/schemas.ts';

export interface ResolvedAsset {
  readonly key: AssetKey;
  readonly category: AssetPackEntry['category'];
  readonly mediaUrl: string;
  readonly mediaSha256: string;
  readonly byteLength: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly columns: number;
  readonly atlasFrameCount: number;
  readonly animations: readonly AssetAnimationGroup[];
  readonly pivot: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly filtering: 'nearest' | 'linear';
}

export interface InstalledAssetPack {
  readonly packId: string;
  readonly packSha256: string;
  readonly assets: readonly ResolvedAsset[];
  readonly mediaUrlsBySha256: ReadonlyMap<string, string>;
  readonly sourceIdentitiesByKey: ReadonlyMap<AssetKey, AssetSourceIdentity>;
}

export interface AssetTransport {
  readJson(url: string): Promise<unknown>;
  readBytes(url: string): Promise<Uint8Array>;
}

export interface AssetMediaUrlStore {
  create(bytes: Uint8Array, mimeType: 'image/png'): string;
  revoke(url: string): void;
}

export interface AssetProvider {
  readonly adapters: AssetIdAdapters;
  loadPack(packId: string): Promise<void>;
  loadPreloads(): Promise<readonly ResolvedAsset[]>;
  validateKeys(
    keys: readonly AssetKey[],
  ): AssetValidationResult<readonly AssetKey[]>;
  resolve(key: AssetKey): ResolvedAsset;
  unloadPack(packId: string): Promise<void>;
  unloadAll(): Promise<void>;
}

export interface AssetProviderInput {
  readonly catalogUrl: string;
  readonly profile: AssetBuildProfile;
  readonly transport?: AssetTransport;
  readonly mediaUrlStore?: AssetMediaUrlStore;
  readonly digestSha256?: (bytes: Uint8Array) => Promise<string>;
}
