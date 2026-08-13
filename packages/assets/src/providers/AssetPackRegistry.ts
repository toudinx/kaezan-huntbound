import type {
  AssetDiagnostic,
  AssetValidationResult,
} from '../manifest/diagnostics.ts';
import type {
  AssetKey,
  ClientId,
  EffectId,
  LookTypeId,
  MissileId,
} from '../manifest/identity.ts';
import type {
  AssetPackEntry,
  AssetPackManifest,
  AssetSourceIdentity,
} from '../manifest/schemas.ts';
import {
  AssetProviderError,
  createAssetDiagnostic,
} from './AssetProviderError.ts';
import type { InstalledAssetPack, ResolvedAsset } from './types.ts';

interface RegistryIndexes {
  readonly keys: Map<AssetKey, ResolvedAsset>;
  readonly lookTypes: Map<LookTypeId, AssetKey>;
  readonly clientIds: Map<ClientId, AssetKey>;
  readonly effects: Map<EffectId, AssetKey>;
  readonly missiles: Map<MissileId, AssetKey>;
}

function emptyIndexes(): RegistryIndexes {
  return {
    keys: new Map(),
    lookTypes: new Map(),
    clientIds: new Map(),
    effects: new Map(),
    missiles: new Map(),
  };
}

function getIdentityKey(
  indexes: RegistryIndexes,
  identity: AssetSourceIdentity,
): AssetKey | undefined {
  switch (identity.kind) {
    case 'lookType':
      return indexes.lookTypes.get(identity.id);
    case 'clientId':
      return indexes.clientIds.get(identity.id);
    case 'effectId':
      return indexes.effects.get(identity.id);
    case 'missileId':
      return indexes.missiles.get(identity.id);
  }
}

function setIdentityKey(
  indexes: RegistryIndexes,
  identity: AssetSourceIdentity,
  key: AssetKey,
): void {
  switch (identity.kind) {
    case 'lookType':
      indexes.lookTypes.set(identity.id, key);
      return;
    case 'clientId':
      indexes.clientIds.set(identity.id, key);
      return;
    case 'effectId':
      indexes.effects.set(identity.id, key);
      return;
    case 'missileId':
      indexes.missiles.set(identity.id, key);
      return;
  }
}

function createResolvedAsset(
  entry: AssetPackEntry,
  mediaUrl: string,
): ResolvedAsset {
  return {
    key: entry.key,
    category: entry.category,
    mediaUrl,
    mediaSha256: entry.media.sha256,
    byteLength: entry.media.byteLength,
    cellWidth: entry.cellWidth,
    cellHeight: entry.cellHeight,
    columns: entry.columns,
    atlasFrameCount: entry.atlasFrameCount,
    animations: entry.animations.map((animation) => ({
      ...animation,
      phaseDurationsMs: animation.phaseDurationsMs.map(([minimum, maximum]) => [
        minimum,
        maximum,
      ]),
    })),
    pivot: { ...entry.pivot },
    scale: entry.scale,
    filtering: entry.filtering,
  };
}

function conflictDiagnostic(
  message: string,
  path: readonly (string | number)[],
  options: { readonly key?: AssetKey; readonly packId: string },
): AssetDiagnostic {
  return createAssetDiagnostic('ASSET_PACK_CONFLICT', path, message, options);
}

function mediaMissingDiagnostic(
  entry: AssetPackEntry,
  entryIndex: number,
  packId: string,
): AssetDiagnostic {
  return createAssetDiagnostic(
    'ASSET_MEDIA_MISSING',
    ['entries', entryIndex, 'media', 'sha256'],
    `Media URL for ${entry.media.sha256} is not available`,
    { key: entry.key, packId },
  );
}

export class AssetPackRegistry {
  private readonly packs = new Map<string, InstalledAssetPack>();
  private indexes = emptyIndexes();

  install(input: {
    readonly manifest: AssetPackManifest;
    readonly packSha256: string;
    readonly mediaUrlsBySha256: ReadonlyMap<string, string>;
  }): AssetValidationResult<InstalledAssetPack> {
    const { manifest } = input;
    const existing = this.packs.get(manifest.packId);
    if (existing !== undefined) {
      if (existing.packSha256 === input.packSha256) {
        return { ok: true, value: existing };
      }
      return {
        ok: false,
        diagnostics: [
          conflictDiagnostic(
            `Pack ${manifest.packId} is already loaded with a different hash`,
            ['packId'],
            { packId: manifest.packId },
          ),
        ],
      };
    }

    const candidateIndexes: RegistryIndexes = {
      keys: new Map(this.indexes.keys),
      lookTypes: new Map(this.indexes.lookTypes),
      clientIds: new Map(this.indexes.clientIds),
      effects: new Map(this.indexes.effects),
      missiles: new Map(this.indexes.missiles),
    };
    const diagnostics: AssetDiagnostic[] = [];
    const assets: ResolvedAsset[] = [];
    const sourceIdentitiesByKey = new Map<AssetKey, AssetSourceIdentity>();
    const ownedMediaUrlsBySha256 = new Map<string, string>();

    manifest.entries.forEach((entry, entryIndex) => {
      const mediaUrl = input.mediaUrlsBySha256.get(entry.media.sha256);
      if (mediaUrl === undefined) {
        diagnostics.push(
          mediaMissingDiagnostic(entry, entryIndex, manifest.packId),
        );
        return;
      }

      const existingAsset = candidateIndexes.keys.get(entry.key);
      if (existingAsset !== undefined) {
        diagnostics.push(
          conflictDiagnostic(
            `Asset key ${entry.key} conflicts with a loaded pack`,
            ['entries', entryIndex, 'key'],
            { key: entry.key, packId: manifest.packId },
          ),
        );
      }

      const existingKey = getIdentityKey(
        candidateIndexes,
        entry.sourceIdentity,
      );
      if (existingKey !== undefined) {
        diagnostics.push(
          conflictDiagnostic(
            `Source identity ${entry.sourceIdentity.kind}:${entry.sourceIdentity.id} conflicts with ${existingKey}`,
            ['entries', entryIndex, 'sourceIdentity', 'id'],
            { key: entry.key, packId: manifest.packId },
          ),
        );
      }

      const asset = createResolvedAsset(entry, mediaUrl);
      assets.push(asset);
      sourceIdentitiesByKey.set(entry.key, entry.sourceIdentity);
      ownedMediaUrlsBySha256.set(entry.media.sha256, mediaUrl);
      candidateIndexes.keys.set(entry.key, asset);
      setIdentityKey(candidateIndexes, entry.sourceIdentity, entry.key);
    });

    if (diagnostics.length > 0) {
      return { ok: false, diagnostics };
    }

    const installed: InstalledAssetPack = {
      packId: manifest.packId,
      packSha256: input.packSha256,
      assets: Object.freeze(assets),
      mediaUrlsBySha256: ownedMediaUrlsBySha256,
      sourceIdentitiesByKey,
    };

    this.packs.set(manifest.packId, installed);
    this.indexes = candidateIndexes;
    return { ok: true, value: installed };
  }

  resolve(key: AssetKey): ResolvedAsset {
    const asset = this.indexes.keys.get(key);
    if (asset !== undefined) {
      return asset;
    }

    const diagnostic = createAssetDiagnostic(
      'ASSET_KEY_UNAVAILABLE',
      ['key'],
      `Asset key ${key} is not loaded`,
      { key },
    );
    throw new AssetProviderError(
      'ASSET_KEY_UNAVAILABLE',
      'Requested asset key is not loaded',
      [diagnostic],
    );
  }

  validateKeys(
    keys: readonly AssetKey[],
  ): AssetValidationResult<readonly AssetKey[]> {
    const diagnostics: AssetDiagnostic[] = [];
    keys.forEach((key, index) => {
      if (!this.indexes.keys.has(key)) {
        diagnostics.push(
          createAssetDiagnostic(
            'ASSET_KEY_UNAVAILABLE',
            [index],
            `Asset key ${key} is not loaded`,
            { key },
          ),
        );
      }
    });
    return diagnostics.length === 0
      ? { ok: true, value: keys }
      : { ok: false, diagnostics };
  }

  resolveSourceIdentity(identity: AssetSourceIdentity): AssetKey {
    const key = getIdentityKey(this.indexes, identity);
    if (key !== undefined) {
      return key;
    }

    const diagnostic = createAssetDiagnostic(
      'ASSET_KEY_UNAVAILABLE',
      ['sourceIdentity', 'id'],
      `Source identity ${identity.kind}:${identity.id} is not loaded`,
    );
    throw new AssetProviderError(
      'ASSET_KEY_UNAVAILABLE',
      'Requested source identity is not loaded',
      [diagnostic],
    );
  }

  uninstall(packId: string): InstalledAssetPack | undefined {
    const removed = this.packs.get(packId);
    if (removed === undefined) {
      return undefined;
    }

    this.packs.delete(packId);
    const nextIndexes = emptyIndexes();
    for (const pack of this.packs.values()) {
      for (const asset of pack.assets) {
        nextIndexes.keys.set(asset.key, asset);
        const sourceIdentity = pack.sourceIdentitiesByKey.get(asset.key);
        if (sourceIdentity !== undefined) {
          setIdentityKey(nextIndexes, sourceIdentity, asset.key);
        }
      }
    }
    this.indexes = nextIndexes;
    return removed;
  }

  listPackIds(): readonly string[] {
    return [...this.packs.keys()].sort((left, right) =>
      left.localeCompare(right),
    );
  }

  getInstalledPack(packId: string): InstalledAssetPack | undefined {
    return this.packs.get(packId);
  }
}
