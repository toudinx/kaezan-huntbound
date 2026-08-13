import type { AssetIdAdapters } from '../adapters/AssetIdAdapters.ts';
import { createManifestAssetAdapters } from '../adapters/createManifestAssetAdapters.ts';
import {
  type AssetDiagnostic,
  type AssetValidationResult,
  validateAssetPackCatalog,
  validateAssetPackManifest,
} from '../manifest/diagnostics.ts';
import type { AssetKey } from '../manifest/identity.ts';
import type {
  AssetBuildProfile,
  AssetPackCatalog,
  AssetPackEntry,
  AssetPackManifest,
  AssetSourceGroup,
} from '../manifest/schemas.ts';
import { AssetPackRegistry } from './AssetPackRegistry.ts';
import {
  AssetProviderError,
  createAssetDiagnostic,
} from './AssetProviderError.ts';
import { BrowserAssetMediaUrlStore } from './BrowserAssetMediaUrlStore.ts';
import { BrowserAssetTransport } from './BrowserAssetTransport.ts';
import { digestSha256 as defaultDigestSha256 } from './digestSha256.ts';
import type {
  AssetMediaUrlStore,
  AssetProvider,
  AssetProviderInput,
  AssetTransport,
  ResolvedAsset,
} from './types.ts';

const encoder = new TextEncoder();

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function canonicalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }
  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort(compareText)) {
      const child = canonicalizeJsonValue(
        (value as Record<string, unknown>)[key],
      );
      if (child !== undefined) {
        output[key] = child;
      }
    }
    return output;
  }
  return value;
}

function canonicalAssetJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalizeJsonValue(value));
  if (serialized === undefined) {
    throw new AssetProviderError(
      'ASSET_JSON_INVALID',
      'Asset JSON is not serializable',
    );
  }
  return `${serialized}\n`;
}

function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function resolveRelativeUrl(
  relativePath: string,
  baseUrl: string,
  errorPath: readonly (string | number)[],
  packId: string,
): string {
  let base: URL;
  let resolved: URL;
  try {
    base = new URL(baseUrl);
    resolved = new URL(relativePath, base);
  } catch (error) {
    throw new AssetProviderError(
      'ASSET_PATH_UNSAFE',
      'Asset URL is unsafe',
      [
        createAssetDiagnostic(
          'ASSET_PATH_UNSAFE',
          errorPath,
          'Asset path cannot be resolved below its manifest base',
          { packId },
        ),
      ],
      error,
    );
  }

  const baseDirectory = new URL('.', base).pathname;
  if (
    resolved.origin !== base.origin ||
    !resolved.pathname.startsWith(baseDirectory)
  ) {
    throw new AssetProviderError('ASSET_PATH_UNSAFE', 'Asset URL is unsafe', [
      createAssetDiagnostic(
        'ASSET_PATH_UNSAFE',
        errorPath,
        'Asset path escapes its manifest base',
        { packId },
      ),
    ]);
  }
  return resolved.toString();
}

function profileDiagnostics(
  manifest: AssetPackManifest,
  profile: AssetBuildProfile,
): readonly AssetDiagnostic[] {
  const diagnostics: AssetDiagnostic[] = [];
  const groupsById = new Map(
    manifest.groups.map((group) => [group.groupId, group]),
  );
  manifest.groups.forEach((group, groupIndex) => {
    if (!group.buildProfiles.includes(profile)) {
      diagnostics.push(
        createAssetDiagnostic(
          'ASSET_PROFILE_FORBIDDEN',
          ['groups', groupIndex, 'buildProfiles'],
          `Asset group ${group.groupId} does not allow profile ${profile}`,
          { packId: manifest.packId },
        ),
      );
    }
    if (profile === 'product' && group.licenseClass === 'cipsoft-personal') {
      diagnostics.push(
        createAssetDiagnostic(
          'ASSET_LICENSE_FORBIDDEN',
          ['groups', groupIndex, 'licenseClass'],
          `License ${group.licenseClass} is forbidden for profile ${profile}`,
          { packId: manifest.packId },
        ),
      );
    }
  });
  manifest.entries.forEach((entry, entryIndex) => {
    const group: AssetSourceGroup | undefined = groupsById.get(
      entry.sourceGroupId,
    );
    if (group !== undefined && !group.buildProfiles.includes(profile)) {
      diagnostics.push(
        createAssetDiagnostic(
          'ASSET_PROFILE_FORBIDDEN',
          ['entries', entryIndex, 'sourceGroupId'],
          `Asset entry ${entry.key} is not available for profile ${profile}`,
          { key: entry.key, packId: manifest.packId },
        ),
      );
    }
  });
  return diagnostics;
}

function errorFromValidation(
  message: string,
  result: Exclude<AssetValidationResult<unknown>, { readonly ok: true }>,
): AssetProviderError {
  const code = result.diagnostics[0]?.code ?? 'ASSET_SCHEMA_INVALID';
  return new AssetProviderError(code, message, result.diagnostics);
}

interface MediaReference {
  readonly entry: AssetPackEntry;
  readonly entryIndex: number;
  readonly url: string;
}

class FetchAssetProvider implements AssetProvider {
  readonly adapters: AssetIdAdapters;
  private readonly registry: AssetPackRegistry;
  private readonly loadedUrlStores = new Map<string, AssetMediaUrlStore>();

  constructor(
    private readonly catalog: AssetPackCatalog,
    private readonly catalogUrl: string,
    private readonly profile: AssetBuildProfile,
    private readonly transport: AssetTransport,
    private readonly mediaUrlStore: AssetMediaUrlStore,
    private readonly digest: (bytes: Uint8Array) => Promise<string>,
  ) {
    this.registry = new AssetPackRegistry();
    this.adapters = createManifestAssetAdapters(this.registry);
  }

  async loadPack(packId: string): Promise<void> {
    if (this.registry.getInstalledPack(packId) !== undefined) {
      return;
    }

    const reference = this.catalog.packs.find((pack) => pack.packId === packId);
    if (reference === undefined) {
      const diagnostic = createAssetDiagnostic(
        'ASSET_REFERENCE_MISSING',
        ['packs'],
        `Catalog does not reference pack ${packId}`,
        { packId },
      );
      throw new AssetProviderError(
        'ASSET_REFERENCE_MISSING',
        'Requested asset pack is not in the catalog',
        [diagnostic],
      );
    }

    const manifestUrl = resolveRelativeUrl(
      reference.manifestPath,
      this.catalogUrl,
      ['packs', this.catalog.packs.indexOf(reference), 'manifestPath'],
      packId,
    );
    let rawManifest: unknown;
    try {
      rawManifest = await this.transport.readJson(manifestUrl);
    } catch (error) {
      if (error instanceof AssetProviderError) {
        throw error;
      }
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        'Unable to load asset pack manifest',
        [],
        error,
      );
    }

    const parsedManifest = validateAssetPackManifest(rawManifest);
    if (!parsedManifest.ok) {
      throw errorFromValidation(
        'Asset pack manifest is invalid',
        parsedManifest,
      );
    }
    const manifest = parsedManifest.value;
    if (manifest.packId !== packId) {
      const diagnostic = createAssetDiagnostic(
        'ASSET_REFERENCE_MISSING',
        ['packId'],
        `Manifest pack ID does not match catalog reference ${packId}`,
        { packId: manifest.packId },
      );
      throw new AssetProviderError(
        'ASSET_REFERENCE_MISSING',
        'Asset pack manifest reference is inconsistent',
        [diagnostic],
      );
    }

    const profileErrors = profileDiagnostics(manifest, this.profile);
    if (profileErrors.length > 0) {
      throw new AssetProviderError(
        profileErrors[0]?.code ?? 'ASSET_PROFILE_FORBIDDEN',
        'Asset pack is not allowed for the selected profile',
        profileErrors,
      );
    }

    const packHashUrl = resolveRelativeUrl(
      'pack.sha256',
      manifestUrl,
      ['pack.sha256'],
      packId,
    );
    const packHashBytes = await this.readBytesOrThrow(
      packHashUrl,
      'Unable to load asset pack hash',
    );
    const packSha256 = new TextDecoder().decode(packHashBytes).trim();
    if (!isSha256(packSha256)) {
      const diagnostic = createAssetDiagnostic(
        'ASSET_PACK_HASH_MISMATCH',
        ['pack.sha256'],
        'Pack hash file is not a lowercase SHA-256 digest',
        { packId },
      );
      throw new AssetProviderError(
        'ASSET_PACK_HASH_MISMATCH',
        'Asset pack hash is invalid',
        [diagnostic],
      );
    }

    let actualPackSha256: string;
    try {
      actualPackSha256 = await this.digest(
        encoder.encode(canonicalAssetJson(manifest)),
      );
    } catch (error) {
      if (error instanceof AssetProviderError) {
        throw error;
      }
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        'Unable to hash asset pack manifest',
        [],
        error,
      );
    }
    if (actualPackSha256 !== packSha256) {
      const diagnostic = createAssetDiagnostic(
        'ASSET_PACK_HASH_MISMATCH',
        ['pack.sha256'],
        'Pack hash does not match the validated manifest',
        { packId },
      );
      throw new AssetProviderError(
        'ASSET_PACK_HASH_MISMATCH',
        'Asset pack hash does not match its manifest',
        [diagnostic],
      );
    }

    const mediaReferences = this.collectMediaReferences(manifest, manifestUrl);
    const mediaBytes = await this.readAndValidateMedia(mediaReferences, packId);
    if (!mediaBytes.ok) {
      throw new AssetProviderError(
        mediaBytes.diagnostics[0]?.code ?? 'ASSET_MEDIA_MISSING',
        'Asset pack media is invalid',
        mediaBytes.diagnostics,
      );
    }

    const createdUrls: string[] = [];
    const mediaUrlsBySha256 = new Map<string, string>();
    try {
      for (const reference of mediaReferences) {
        const bytes = mediaBytes.value.get(reference.entry.media.sha256);
        if (bytes === undefined) {
          throw new AssetProviderError(
            'ASSET_MEDIA_MISSING',
            'Asset media is unavailable after validation',
          );
        }
        const existingUrl = mediaUrlsBySha256.get(reference.entry.media.sha256);
        if (existingUrl !== undefined) {
          continue;
        }
        let url: string;
        try {
          url = this.mediaUrlStore.create(
            bytes,
            reference.entry.media.mimeType,
          );
        } catch (error) {
          throw new AssetProviderError(
            'ASSET_MEDIA_URL_CREATE_FAILED',
            'Unable to create asset media URL',
            [
              createAssetDiagnostic(
                'ASSET_MEDIA_URL_CREATE_FAILED',
                ['entries', reference.entryIndex, 'media'],
                'Unable to create a media URL for the asset entry',
                { key: reference.entry.key, packId },
              ),
            ],
            error,
          );
        }
        createdUrls.push(url);
        mediaUrlsBySha256.set(reference.entry.media.sha256, url);
      }

      const installed = this.registry.install({
        manifest,
        packSha256,
        mediaUrlsBySha256,
      });
      if (!installed.ok) {
        throw new AssetProviderError(
          installed.diagnostics[0]?.code ?? 'ASSET_PACK_CONFLICT',
          'Asset pack conflicts with loaded content',
          installed.diagnostics,
        );
      }
      this.loadedUrlStores.set(packId, this.mediaUrlStore);
    } catch (error) {
      for (const url of createdUrls) {
        this.mediaUrlStore.revoke(url);
      }
      throw error;
    }
  }

  async loadPreloads(): Promise<readonly ResolvedAsset[]> {
    const keys: AssetKey[] = [];
    for (const preload of this.catalog.preloads) {
      await this.loadPack(preload.packId);
      keys.push(...preload.requiredKeys);
    }
    const uniqueKeys = [...new Set(keys)];
    const validated = this.registry.validateKeys(uniqueKeys);
    if (!validated.ok) {
      throw new AssetProviderError(
        validated.diagnostics[0]?.code ?? 'ASSET_KEY_UNAVAILABLE',
        'Asset preload keys are unavailable',
        validated.diagnostics,
      );
    }
    return validated.value.map((key) => this.registry.resolve(key));
  }

  validateKeys(
    keys: readonly AssetKey[],
  ): AssetValidationResult<readonly AssetKey[]> {
    return this.registry.validateKeys(keys);
  }

  resolve(key: AssetKey): ResolvedAsset {
    return this.registry.resolve(key);
  }

  async unloadPack(packId: string): Promise<void> {
    const removed = this.registry.uninstall(packId);
    if (removed === undefined) {
      return;
    }
    const store = this.loadedUrlStores.get(packId) ?? this.mediaUrlStore;
    this.loadedUrlStores.delete(packId);
    for (const url of removed.mediaUrlsBySha256.values()) {
      store.revoke(url);
    }
  }

  async unloadAll(): Promise<void> {
    for (const packId of this.registry.listPackIds()) {
      await this.unloadPack(packId);
    }
  }

  private collectMediaReferences(
    manifest: AssetPackManifest,
    manifestUrl: string,
  ): readonly MediaReference[] {
    const references = new Map<string, MediaReference>();
    manifest.entries.forEach((entry, entryIndex) => {
      if (references.has(entry.media.sha256)) {
        return;
      }
      references.set(entry.media.sha256, {
        entry,
        entryIndex,
        url: resolveRelativeUrl(
          entry.media.path,
          manifestUrl,
          ['entries', entryIndex, 'media', 'path'],
          manifest.packId,
        ),
      });
    });
    return [...references.values()];
  }

  private async readAndValidateMedia(
    references: readonly MediaReference[],
    packId: string,
  ): Promise<
    | { readonly ok: true; readonly value: ReadonlyMap<string, Uint8Array> }
    | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
  > {
    const settled = await Promise.allSettled(
      references.map(async (reference) => ({
        reference,
        bytes: await this.readBytesOrThrow(
          reference.url,
          'Unable to load asset media',
        ),
      })),
    );
    const diagnostics: AssetDiagnostic[] = [];
    const bytesByHash = new Map<string, Uint8Array>();
    for (const [index, result] of settled.entries()) {
      const reference = references[index];
      if (reference === undefined) {
        continue;
      }
      if (result.status === 'rejected') {
        diagnostics.push(
          createAssetDiagnostic(
            'ASSET_MEDIA_MISSING',
            ['entries', reference.entryIndex, 'media', 'path'],
            'Asset media could not be loaded',
            { key: reference.entry.key, packId },
          ),
        );
        continue;
      }
      const bytes = result.value.bytes;
      if (bytes.byteLength !== reference.entry.media.byteLength) {
        diagnostics.push(
          createAssetDiagnostic(
            'ASSET_MEDIA_SIZE_MISMATCH',
            ['entries', reference.entryIndex, 'media', 'byteLength'],
            'Asset media byte length does not match its manifest',
            { key: reference.entry.key, packId },
          ),
        );
      }
      try {
        const actualHash = await this.digest(bytes);
        if (actualHash !== reference.entry.media.sha256) {
          diagnostics.push(
            createAssetDiagnostic(
              'ASSET_MEDIA_HASH_MISMATCH',
              ['entries', reference.entryIndex, 'media', 'sha256'],
              'Asset media hash does not match its manifest',
              { key: reference.entry.key, packId },
            ),
          );
        }
      } catch {
        diagnostics.push(
          createAssetDiagnostic(
            'ASSET_MEDIA_HASH_MISMATCH',
            ['entries', reference.entryIndex, 'media', 'sha256'],
            'Asset media hash could not be calculated',
            { key: reference.entry.key, packId },
          ),
        );
      }
      bytesByHash.set(reference.entry.media.sha256, bytes);
    }
    return diagnostics.length === 0
      ? { ok: true, value: bytesByHash }
      : { ok: false, diagnostics };
  }

  private async readBytesOrThrow(
    url: string,
    message: string,
  ): Promise<Uint8Array> {
    try {
      return await this.transport.readBytes(url);
    } catch (error) {
      if (error instanceof AssetProviderError) {
        throw error;
      }
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        message,
        [],
        error,
      );
    }
  }
}

export async function createFetchAssetProvider(
  input: AssetProviderInput,
): Promise<AssetProvider> {
  const transport: AssetTransport =
    input.transport ?? new BrowserAssetTransport();
  let rawCatalog: unknown;
  try {
    rawCatalog = await transport.readJson(input.catalogUrl);
  } catch (error) {
    if (error instanceof AssetProviderError) {
      throw error;
    }
    throw new AssetProviderError(
      'ASSET_TRANSPORT_FAILED',
      'Unable to load asset catalog',
      [],
      error,
    );
  }

  const parsedCatalog = validateAssetPackCatalog(rawCatalog);
  if (!parsedCatalog.ok) {
    throw errorFromValidation('Asset catalog is invalid', parsedCatalog);
  }
  const catalog = parsedCatalog.value;
  if (catalog.profile !== input.profile) {
    const diagnostic = createAssetDiagnostic(
      'ASSET_CATALOG_PROFILE_MISMATCH',
      ['profile'],
      `Catalog profile ${catalog.profile} does not match requested profile ${input.profile}`,
    );
    throw new AssetProviderError(
      'ASSET_CATALOG_PROFILE_MISMATCH',
      'Asset catalog profile does not match the requested profile',
      [diagnostic],
    );
  }

  const mediaUrlStore = input.mediaUrlStore ?? new BrowserAssetMediaUrlStore();
  const digest = input.digestSha256 ?? defaultDigestSha256;
  return new FetchAssetProvider(
    catalog,
    input.catalogUrl,
    input.profile,
    transport,
    mediaUrlStore,
    digest,
  );
}
