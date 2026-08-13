import { describe, expect, it } from 'vitest';

import {
  type AssetMediaUrlStore,
  type AssetPackManifest,
  AssetProviderError,
  type AssetTransport,
  createAssetKey,
  createFetchAssetProvider,
} from '../index.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const digest = (character: string) => character.repeat(64);
const catalogUrl = 'https://assets.test/root/catalog.json';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

const sourceEntries = [
  {
    key: 'outfit:tibia:knight',
    category: 'outfit',
    sourceIdentity: { kind: 'lookType', id: 131 },
    pivot: { x: 0.5, y: 1 },
  },
  {
    key: 'creature:tibia:rotworm',
    category: 'creature',
    sourceIdentity: { kind: 'lookType', id: 26 },
    pivot: { x: 0.5, y: 1 },
  },
  {
    key: 'item:tibia:gold-coin',
    category: 'object',
    sourceIdentity: { kind: 'clientId', id: 3031 },
    pivot: { x: 0.5, y: 0.5 },
  },
  {
    key: 'effect:tibia:energy-hit',
    category: 'effect',
    sourceIdentity: { kind: 'effectId', id: 12 },
    pivot: { x: 0.5, y: 0.5 },
  },
  {
    key: 'missile:tibia:energy-ball',
    category: 'missile',
    sourceIdentity: { kind: 'missileId', id: 36 },
    pivot: { x: 0.5, y: 0.5 },
  },
] as const;

type PackSpec = {
  readonly packId: string;
  readonly entries?: readonly (typeof sourceEntries)[number][];
  readonly mediaCharacters?: readonly string[];
  readonly packHashCharacter?: string;
};

class FakeTransport implements AssetTransport {
  readonly json = new Map<string, unknown>();
  readonly bytes = new Map<string, Uint8Array>();
  readonly jsonReads: string[] = [];
  readonly byteReads: string[] = [];

  async readJson(url: string): Promise<unknown> {
    this.jsonReads.push(url);
    const value = this.json.get(url);
    if (value === undefined) {
      throw new Error(`missing json fixture: ${url}`);
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown;
      } catch (error) {
        throw new AssetProviderError(
          'ASSET_JSON_INVALID',
          'synthetic invalid JSON',
          [],
          error,
        );
      }
    }
    return value;
  }

  async readBytes(url: string): Promise<Uint8Array> {
    this.byteReads.push(url);
    const value = this.bytes.get(url);
    if (value === undefined) {
      throw new Error(`missing bytes fixture: ${url}`);
    }
    return value;
  }
}

class FakeMediaUrlStore implements AssetMediaUrlStore {
  readonly created: Uint8Array[] = [];
  readonly revoked: string[] = [];
  failAt: number | undefined;

  create(bytes: Uint8Array): string {
    if (this.failAt === this.created.length + 1) {
      throw new Error('synthetic URL creation failure');
    }
    this.created.push(bytes);
    return `blob:fixture-${this.created.length}`;
  }

  revoke(url: string): void {
    this.revoked.push(url);
  }
}

async function createFixture(
  specs: readonly PackSpec[] = [{ packId: 'asset-pack:fixture:one' }],
) {
  const transport = new FakeTransport();
  const mediaUrlStore = new FakeMediaUrlStore();
  const digestsByText = new Map<string, string>();
  const packUrls = new Map<
    string,
    {
      readonly manifest: string;
      readonly hash: string;
      readonly media: readonly string[];
    }
  >();
  const manifests = new Map<string, AssetPackManifest>();
  const packs = specs.map((spec, specIndex) => {
    const entries = spec.entries ?? sourceEntries;
    const mediaCharacters =
      spec.mediaCharacters ??
      entries.map((_, entryIndex) =>
        String.fromCharCode(97 + specIndex * 5 + entryIndex),
      );
    const manifestPath = `packs/${spec.packId.split(':').at(-1)}/pack.json`;
    const manifestUrl = new URL(manifestPath, catalogUrl).toString();
    const hashUrl = new URL('pack.sha256', manifestUrl).toString();
    const mediaUrls: string[] = [];
    const manifest = {
      schemaVersion: '1',
      packId: spec.packId,
      contentVersion: `${spec.packId}@1`,
      groups: [
        {
          groupId: 'huntbound-test',
          source: 'huntbound-synthetic-fixture',
          sourceSnapshot: 'pb02-synthetic-v1',
          licenseClass: 'huntbound-test',
          buildProfiles: ['test', 'product'],
        },
      ],
      entries: entries.map((entry, entryIndex) => {
        const mediaSha256 = digest(mediaCharacters[entryIndex] ?? 'a');
        const mediaBytes = encoder.encode(`${spec.packId}:${entry.key}`);
        const mediaPath = `media/${mediaSha256}.png`;
        const mediaUrl = new URL(mediaPath, manifestUrl).toString();
        mediaUrls.push(mediaUrl);
        digestsByText.set(decoder.decode(mediaBytes), mediaSha256);
        transport.bytes.set(mediaUrl, mediaBytes);
        return {
          key: entry.key,
          category: entry.category,
          sourceIdentity: entry.sourceIdentity,
          sourceGroupId: 'huntbound-test',
          media: {
            path: mediaPath,
            sha256: mediaSha256,
            byteLength: mediaBytes.byteLength,
            mimeType: 'image/png',
          },
          cellWidth: 1,
          cellHeight: 1,
          columns: 1,
          atlasFrameCount: 1,
          animations: [
            {
              kind: 'default',
              patternX: 1,
              patternY: 1,
              patternZ: 1,
              layers: 1,
              startFrame: 0,
              frameCount: 1,
              phaseDurationsMs: [[100, 100]],
            },
          ],
          pivot: entry.pivot,
          scale: 1,
          filtering: 'nearest',
        };
      }),
    } satisfies Record<string, unknown>;
    const manifestBytes = encoder.encode(JSON.stringify(manifest));
    const packHash = digest(
      spec.packHashCharacter ?? String.fromCharCode(102 - specIndex),
    );
    digestsByText.set(decoder.decode(manifestBytes), packHash);
    digestsByText.set(canonicalJson(manifest), packHash);
    transport.json.set(manifestUrl, manifest);
    transport.bytes.set(manifestUrl, manifestBytes);
    transport.bytes.set(hashUrl, encoder.encode(`${packHash}\n`));
    const parsedManifest = manifest as unknown as AssetPackManifest;
    manifests.set(spec.packId, parsedManifest);
    packUrls.set(spec.packId, {
      manifest: manifestUrl,
      hash: hashUrl,
      media: mediaUrls,
    });
    return {
      packId: spec.packId,
      manifestPath,
      requiredKeys: entries.map((entry) => createAssetKey(entry.key)),
    };
  });
  const catalog = {
    schemaVersion: '1',
    profile: 'test',
    packs: packs.map(({ packId, manifestPath }) => ({ packId, manifestPath })),
    preloads: packs.map(({ packId, requiredKeys }) => ({
      packId,
      requiredKeys,
    })),
  };
  transport.json.set(catalogUrl, catalog);
  const digestSha256 = async (bytes: Uint8Array): Promise<string> =>
    digestsByText.get(decoder.decode(bytes)) ?? digest('z');
  const provider = await createFetchAssetProvider({
    catalogUrl,
    profile: 'test',
    transport,
    mediaUrlStore,
    digestSha256,
  });
  return {
    provider,
    transport,
    mediaUrlStore,
    packUrls,
    manifests,
    digestSha256,
  };
}

function expectDiagnosticCode(
  error: unknown,
  code: AssetProviderError['code'],
): AssetProviderError {
  expect(error).toBeInstanceOf(AssetProviderError);
  expect(error).toMatchObject({ code });
  return error as AssetProviderError;
}

describe('fetch asset provider', () => {
  it('loads a complete pack, resolves all keys, and preloads required assets', async () => {
    const fixture = await createFixture();

    const assets = await fixture.provider.loadPreloads();

    expect(assets).toHaveLength(5);
    expect(assets.map(({ key }) => key)).toEqual(
      sourceEntries.map(({ key }) => key),
    );
    expect(fixture.mediaUrlStore.created).toHaveLength(5);
    expect(
      fixture.provider.resolve(createAssetKey('effect:tibia:energy-hit')),
    ).toMatchObject({
      mediaUrl: 'blob:fixture-4',
      mediaSha256: digest('d'),
    });
  });

  it('aggregates missing media and keeps the registry empty', async () => {
    const fixture = await createFixture();
    const urls = fixture.packUrls.get('asset-pack:fixture:one');
    if (urls === undefined) throw new Error('missing pack fixture');
    fixture.transport.bytes.delete(urls.media[1] ?? '');
    fixture.transport.bytes.delete(urls.media[3] ?? '');

    try {
      await fixture.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected load to fail');
    } catch (error) {
      const providerError = expectDiagnosticCode(error, 'ASSET_MEDIA_MISSING');
      expect(
        providerError.diagnostics.filter(
          ({ code }) => code === 'ASSET_MEDIA_MISSING',
        ),
      ).toHaveLength(2);
      expect(fixture.mediaUrlStore.created).toHaveLength(0);
      expect(() =>
        fixture.provider.resolve(createAssetKey('outfit:tibia:knight')),
      ).toThrow();
    }
  });

  it('rejects invalid JSON, schema, and pack hashes before media creation', async () => {
    const invalidJson = await createFixture();
    const jsonUrls = invalidJson.packUrls.get('asset-pack:fixture:one');
    if (jsonUrls === undefined) throw new Error('missing pack fixture');
    invalidJson.transport.json.set(jsonUrls.manifest, '{');
    try {
      await invalidJson.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected invalid JSON to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_JSON_INVALID');
    }

    const invalidSchema = await createFixture();
    const schemaUrls = invalidSchema.packUrls.get('asset-pack:fixture:one');
    if (schemaUrls === undefined) throw new Error('missing pack fixture');
    const invalidManifest = {
      ...invalidSchema.manifests.get('asset-pack:fixture:one'),
      entries: [],
    };
    const invalidSchemaHash = digest('s');
    invalidSchema.transport.json.set(schemaUrls.manifest, invalidManifest);
    invalidSchema.transport.bytes.set(
      schemaUrls.hash,
      encoder.encode(`${invalidSchemaHash}\n`),
    );
    try {
      await invalidSchema.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected invalid schema to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_SCHEMA_INVALID');
    }

    const invalidHash = await createFixture();
    const hashUrls = invalidHash.packUrls.get('asset-pack:fixture:one');
    if (hashUrls === undefined) throw new Error('missing pack fixture');
    invalidHash.transport.bytes.set(
      hashUrls.hash,
      encoder.encode(`${digest('x')}\n`),
    );
    try {
      await invalidHash.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected invalid pack hash to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_PACK_HASH_MISMATCH');
    }
  });

  it('rejects size and content hash mismatches without installing media', async () => {
    const sizeFixture = await createFixture();
    const sizeUrls = sizeFixture.packUrls.get('asset-pack:fixture:one');
    if (sizeUrls === undefined) throw new Error('missing pack fixture');
    const originalBytes = sizeFixture.transport.bytes.get(
      sizeUrls.media[0] ?? '',
    );
    if (originalBytes === undefined) throw new Error('missing media fixture');
    sizeFixture.transport.bytes.set(
      sizeUrls.media[0] ?? '',
      encoder.encode('different-length'),
    );
    try {
      await sizeFixture.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected size mismatch to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_MEDIA_SIZE_MISMATCH');
      expect(sizeFixture.mediaUrlStore.created).toHaveLength(0);
    }

    const hashFixture = await createFixture();
    const hashUrls = hashFixture.packUrls.get('asset-pack:fixture:one');
    if (hashUrls === undefined) throw new Error('missing pack fixture');
    const hashBytes = hashFixture.transport.bytes.get(hashUrls.media[0] ?? '');
    if (hashBytes === undefined) throw new Error('missing media fixture');
    const corruptedBytes = hashBytes.slice();
    corruptedBytes[0] = (corruptedBytes[0] ?? 0) ^ 1;
    hashFixture.transport.bytes.set(hashUrls.media[0] ?? '', corruptedBytes);
    try {
      await hashFixture.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected content hash mismatch to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_MEDIA_HASH_MISMATCH');
      expect(hashFixture.mediaUrlStore.created).toHaveLength(0);
    }
  });

  it('revokes staged URLs when URL creation fails', async () => {
    const fixture = await createFixture();
    fixture.mediaUrlStore.failAt = 3;

    try {
      await fixture.provider.loadPack('asset-pack:fixture:one');
      throw new Error('Expected URL creation to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_MEDIA_URL_CREATE_FAILED');
      expect(fixture.mediaUrlStore.created).toHaveLength(2);
      expect(fixture.mediaUrlStore.revoked).toEqual([
        'blob:fixture-1',
        'blob:fixture-2',
      ]);
    }
  });

  it('revokes every URL from a conflicting pack and does not replace the first pack', async () => {
    const fixture = await createFixture([
      { packId: 'asset-pack:fixture:one' },
      {
        packId: 'asset-pack:fixture:conflict',
        entries: [sourceEntries[0]],
        mediaCharacters: ['f'],
      },
    ]);
    await fixture.provider.loadPack('asset-pack:fixture:one');
    const createdBeforeConflict = fixture.mediaUrlStore.created.length;

    try {
      await fixture.provider.loadPack('asset-pack:fixture:conflict');
      throw new Error('Expected pack conflict to fail');
    } catch (error) {
      expectDiagnosticCode(error, 'ASSET_PACK_CONFLICT');
      expect(fixture.mediaUrlStore.created).toHaveLength(
        createdBeforeConflict + 1,
      );
      expect(fixture.mediaUrlStore.revoked).toEqual([
        `blob:fixture-${createdBeforeConflict + 1}`,
      ]);
      expect(
        fixture.provider.resolve(createAssetKey('outfit:tibia:knight'))
          .mediaUrl,
      ).toBe('blob:fixture-1');
    }
  });

  it('does not fetch or create URLs again for an already loaded pack', async () => {
    const fixture = await createFixture();
    await fixture.provider.loadPack('asset-pack:fixture:one');
    const jsonReads = fixture.transport.jsonReads.length;
    const byteReads = fixture.transport.byteReads.length;
    const created = fixture.mediaUrlStore.created.length;

    await fixture.provider.loadPack('asset-pack:fixture:one');

    expect(fixture.transport.jsonReads).toHaveLength(jsonReads);
    expect(fixture.transport.byteReads).toHaveLength(byteReads);
    expect(fixture.mediaUrlStore.created).toHaveLength(created);
  });

  it('unloads one pack selectively and unloadAll revokes remaining ownership', async () => {
    const fixture = await createFixture([
      {
        packId: 'asset-pack:fixture:one',
        entries: [sourceEntries[0]],
        mediaCharacters: ['a'],
      },
      {
        packId: 'asset-pack:fixture:two',
        entries: [sourceEntries[1]],
        mediaCharacters: ['b'],
      },
    ]);
    await fixture.provider.loadPack('asset-pack:fixture:one');
    await fixture.provider.loadPack('asset-pack:fixture:two');

    await fixture.provider.unloadPack('asset-pack:fixture:one');

    expect(fixture.mediaUrlStore.revoked).toEqual(['blob:fixture-1']);
    expect(() =>
      fixture.provider.resolve(createAssetKey('outfit:tibia:knight')),
    ).toThrow();
    expect(
      fixture.provider.resolve(createAssetKey('creature:tibia:rotworm'))
        .mediaUrl,
    ).toBe('blob:fixture-2');

    await fixture.provider.unloadAll();

    expect(fixture.mediaUrlStore.revoked).toEqual([
      'blob:fixture-1',
      'blob:fixture-2',
    ]);
    expect(() =>
      fixture.provider.resolve(createAssetKey('creature:tibia:rotworm')),
    ).toThrow();
  });
});
