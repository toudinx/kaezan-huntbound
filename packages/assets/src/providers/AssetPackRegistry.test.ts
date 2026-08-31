import { describe, expect, it } from 'vitest';

import {
  type AssetPackManifest,
  AssetPackManifestSchema,
  AssetPackRegistry,
  type AssetSourceIdentity,
  type AssetValidationResult,
  createAssetKey,
  createClientId,
  createEffectId,
  createLookTypeId,
  createMissileId,
  type InstalledAssetPack,
} from '../index.ts';

const digest = (character: string) => character.repeat(64);

const definitions = [
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
  {
    key: 'spell:tibia:berserk',
    category: 'spell',
    sourceIdentity: { kind: 'clientId', id: 3031 },
    pivot: { x: 0.5, y: 0.5 },
  },
] as const;

type Definition = {
  readonly key: string;
  readonly category:
    | 'outfit'
    | 'creature'
    | 'object'
    | 'effect'
    | 'missile'
    | 'spell';
  readonly sourceIdentity:
    | { readonly kind: 'lookType'; readonly id: number }
    | { readonly kind: 'clientId'; readonly id: number }
    | { readonly kind: 'effectId'; readonly id: number }
    | { readonly kind: 'missileId'; readonly id: number };
  readonly pivot: { readonly x: number; readonly y: number };
};

const group = {
  groupId: 'huntbound-test',
  source: 'huntbound-synthetic-fixture',
  sourceSnapshot: 'pb02-synthetic-v1',
  licenseClass: 'huntbound-test',
  buildProfiles: ['test', 'product'],
} as const;

function createManifest(
  packId: string,
  entries: readonly Definition[] = definitions,
): AssetPackManifest {
  return AssetPackManifestSchema.parse({
    schemaVersion: '1',
    packId,
    contentVersion: `${packId}@1`,
    groups: [group],
    entries: entries.map((entry, index) => {
      const mediaSha256 = digest(String.fromCharCode(97 + index));
      return {
        key: entry.key,
        category: entry.category,
        sourceIdentity: entry.sourceIdentity,
        sourceGroupId: group.groupId,
        media: {
          path: `media/${mediaSha256}.png`,
          sha256: mediaSha256,
          byteLength: 1,
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
  });
}

function mediaUrlsFor(
  manifest: AssetPackManifest,
): ReadonlyMap<string, string> {
  return new Map(
    manifest.entries.map((entry) => [
      entry.media.sha256,
      `blob:${entry.media.sha256.slice(0, 8)}`,
    ]),
  );
}

function install(
  registry: AssetPackRegistry,
  manifest: AssetPackManifest,
  packSha256 = digest('p'),
): InstalledAssetPack {
  const result = registry.install({
    manifest,
    packSha256,
    mediaUrlsBySha256: mediaUrlsFor(manifest),
  });
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(
      result.diagnostics.map(({ message }) => message).join('; '),
    );
  }
  return result.value;
}

function identity(
  kind: AssetSourceIdentity['kind'],
  id: number,
): AssetSourceIdentity {
  switch (kind) {
    case 'lookType':
      return { kind, id: createLookTypeId(id) };
    case 'clientId':
      return { kind, id: createClientId(id) };
    case 'effectId':
      return { kind, id: createEffectId(id) };
    case 'missileId':
      return { kind, id: createMissileId(id) };
  }
}

function assertFailure<T>(
  result: AssetValidationResult<T>,
): Extract<AssetValidationResult<T>, { readonly ok: false }> {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected an unsuccessful validation result');
  }
  return result;
}

describe('AssetPackRegistry', () => {
  it('installs all six indexes and keeps spell clientIds separate from objects', () => {
    const registry = new AssetPackRegistry();
    const manifest = createManifest('asset-pack:fixture:one');

    install(registry, manifest);

    expect(registry.listPackIds()).toEqual(['asset-pack:fixture:one']);
    expect(
      registry.resolve(createAssetKey('outfit:tibia:knight')),
    ).toMatchObject({
      key: 'outfit:tibia:knight',
      mediaUrl: `blob:${digest('a').slice(0, 8)}`,
      category: 'outfit',
    });
    expect(registry.resolveSourceIdentity(identity('lookType', 131))).toBe(
      'outfit:tibia:knight',
    );
    expect(registry.resolveSourceIdentity(identity('clientId', 3031))).toBe(
      'item:tibia:gold-coin',
    );
    expect(registry.resolveSourceIdentity(identity('effectId', 12))).toBe(
      'effect:tibia:energy-hit',
    );
    expect(registry.resolveSourceIdentity(identity('missileId', 36))).toBe(
      'missile:tibia:energy-ball',
    );
    expect(
      registry.resolve(createAssetKey('spell:tibia:berserk')),
    ).toMatchObject({
      key: 'spell:tibia:berserk',
      category: 'spell',
    });
  });

  it('reports every missing key in input order', () => {
    const registry = new AssetPackRegistry();
    install(registry, createManifest('asset-pack:fixture:one'));

    const result = assertFailure(
      registry.validateKeys([
        createAssetKey('item:tibia:missing'),
        createAssetKey('outfit:tibia:missing'),
        createAssetKey('effect:tibia:missing'),
      ]),
    );

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'ASSET_KEY_UNAVAILABLE',
        key: 'item:tibia:missing',
      }),
      expect.objectContaining({
        code: 'ASSET_KEY_UNAVAILABLE',
        key: 'outfit:tibia:missing',
      }),
      expect.objectContaining({
        code: 'ASSET_KEY_UNAVAILABLE',
        key: 'effect:tibia:missing',
      }),
    ]);
  });

  it('rejects stable-key and namespaced-identity conflicts atomically', () => {
    const registry = new AssetPackRegistry();
    const first = createManifest('asset-pack:fixture:one', [definitions[0]]);
    install(registry, first);

    const keyConflict = createManifest('asset-pack:fixture:key-conflict', [
      { ...definitions[0], sourceIdentity: { kind: 'lookType', id: 132 } },
    ]);
    const keyResult = assertFailure(
      registry.install({
        manifest: keyConflict,
        packSha256: digest('k'),
        mediaUrlsBySha256: mediaUrlsFor(keyConflict),
      }),
    );
    expect(keyResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ASSET_PACK_CONFLICT' }),
      ]),
    );

    const identityConflict = createManifest(
      'asset-pack:fixture:identity-conflict',
      [
        {
          ...definitions[0],
          key: 'outfit:tibia:archer',
        },
      ],
    );
    const identityResult = assertFailure(
      registry.install({
        manifest: identityConflict,
        packSha256: digest('i'),
        mediaUrlsBySha256: mediaUrlsFor(identityConflict),
      }),
    );
    expect(identityResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ASSET_PACK_CONFLICT' }),
      ]),
    );
    expect(registry.listPackIds()).toEqual(['asset-pack:fixture:one']);
    expect(registry.resolve(createAssetKey('outfit:tibia:knight')).key).toBe(
      'outfit:tibia:knight',
    );
  });

  it('is idempotent for the same pack hash and rejects a changed hash', () => {
    const registry = new AssetPackRegistry();
    const manifest = createManifest('asset-pack:fixture:one');
    const first = install(registry, manifest, digest('a'));

    const same = registry.install({
      manifest,
      packSha256: digest('a'),
      mediaUrlsBySha256: mediaUrlsFor(manifest),
    });
    expect(same).toEqual({ ok: true, value: first });

    const changed = assertFailure(
      registry.install({
        manifest,
        packSha256: digest('b'),
        mediaUrlsBySha256: mediaUrlsFor(manifest),
      }),
    );
    expect(changed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ASSET_PACK_CONFLICT' }),
      ]),
    );
    expect(
      registry.resolve(createAssetKey('outfit:tibia:knight')).mediaUrl,
    ).toBe(`blob:${digest('a').slice(0, 8)}`);
  });

  it('keeps previous state when media ownership is incomplete', () => {
    const registry = new AssetPackRegistry();
    const first = createManifest('asset-pack:fixture:one', [definitions[0]]);
    install(registry, first);

    const second = createManifest('asset-pack:fixture:two', [definitions[1]]);
    const result = assertFailure(
      registry.install({
        manifest: second,
        packSha256: digest('s'),
        mediaUrlsBySha256: new Map(),
      }),
    );

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ASSET_MEDIA_MISSING' }),
      ]),
    );
    expect(registry.listPackIds()).toEqual(['asset-pack:fixture:one']);
    expect(() =>
      registry.resolve(createAssetKey('creature:tibia:rotworm')),
    ).toThrow();
  });

  it('uninstalls only the selected pack and leaves other assets available', () => {
    const registry = new AssetPackRegistry();
    const first = createManifest('asset-pack:fixture:one', [definitions[0]]);
    const second = createManifest('asset-pack:fixture:two', [definitions[1]]);
    install(registry, first, digest('a'));
    install(registry, second, digest('b'));

    const removed = registry.uninstall('asset-pack:fixture:one');

    expect(removed?.packId).toBe('asset-pack:fixture:one');
    expect(registry.listPackIds()).toEqual(['asset-pack:fixture:two']);
    expect(() =>
      registry.resolve(createAssetKey('outfit:tibia:knight')),
    ).toThrow();
    expect(
      registry.resolve(createAssetKey('creature:tibia:rotworm')).mediaUrl,
    ).toBe(`blob:${digest('a').slice(0, 8)}`);
  });
});
