import { describe, expect, it } from 'vitest';

import {
  AssetPackCatalogSchema,
  AssetPackManifestSchema,
  AssetSelectionManifestSchema,
  AssetSourceLockSchema,
  validateAssetPackCatalog,
  validateAssetPackManifest,
  validateAssetSelectionManifest,
  validateAssetSourceLock,
} from '../index.ts';

const digest = (character: string) => character.repeat(64);

const keys: string[] = [
  'outfit:tibia:knight',
  'creature:tibia:rotworm',
  'item:tibia:gold-coin',
  'effect:tibia:energy-hit',
  'missile:tibia:energy-ball',
];

const identities = [
  { kind: 'lookType', id: 131 },
  { kind: 'lookType', id: 26 },
  { kind: 'clientId', id: 3031 },
  { kind: 'effectId', id: 12 },
  { kind: 'missileId', id: 36 },
];

const categories = ['outfit', 'creature', 'object', 'effect', 'missile'];

const group = {
  groupId: 'huntbound-test',
  source: 'huntbound-synthetic-fixture',
  sourceSnapshot: 'pb02-synthetic-v1',
  licenseClass: 'huntbound-test',
  buildProfiles: ['test', 'product'],
};

function selectionManifest() {
  return {
    schemaVersion: '1',
    selectionId: 'fixture:pb-02-contract-coverage',
    packId: 'asset-pack:fixture:pb-02-contract-coverage',
    contentVersion: 'pb-02-contract-coverage@1',
    buildProfiles: ['test', 'product'],
    groups: [group],
    entries: keys.map((key, index) => ({
      key,
      category: itemAt(categories, index),
      sourceIdentity: itemAt(identities, index),
      sourceGroupId: group.groupId,
      consumer: 'PB-02 browser contract fixture',
      rationale: `Covers ${key}.`,
      presentation: {
        pivot: { x: 0.5, y: index < 2 ? 1 : 0.5 },
        scale: 1,
        filtering: 'nearest',
      },
    })),
  };
}

function sourceLock() {
  return {
    schemaVersion: '1',
    source: 'huntbound-synthetic-fixture',
    sourceSnapshot: 'pb02-synthetic-v1',
    manifest: {
      path: 'manifest.json',
      sha256: digest('a'),
      byteLength: 808964,
    },
    files: keys.map((key, index) => ({
      key,
      category: itemAt(categories, index),
      sourceIdentity: itemAt(identities, index),
      path: `${itemAt(categories, index)}/${itemAt(identities, index).id}.png`,
      sha256: digest(String.fromCharCode(98 + index)),
      byteLength: index + 1,
    })),
  };
}

function packManifest() {
  return {
    schemaVersion: '1',
    packId: 'asset-pack:fixture:pb-02-contract-coverage',
    contentVersion: 'pb-02-contract-coverage@1',
    groups: [group],
    entries: keys.map((key, index) => ({
      key,
      category: itemAt(categories, index),
      sourceIdentity: itemAt(identities, index),
      sourceGroupId: group.groupId,
      media: {
        path: `media/${digest(String.fromCharCode(98 + index))}.png`,
        sha256: digest(String.fromCharCode(98 + index)),
        byteLength: index + 1,
        mimeType: 'image/png',
      },
      cellWidth: 1,
      cellHeight: 1,
      columns: 1,
      atlasFrameCount: 1,
      animations: [
        {
          kind: 'default',
          patternX: 0,
          patternY: 0,
          patternZ: 0,
          layers: 1,
          startFrame: 0,
          frameCount: 1,
          phaseDurationsMs: [[100, 100]],
        },
      ],
      pivot: { x: 0.5, y: 0.5 },
      scale: 1,
      filtering: 'nearest',
    })),
  };
}

function catalog() {
  return {
    schemaVersion: '1',
    profile: 'test',
    packs: [
      {
        packId: 'asset-pack:fixture:pb-02-contract-coverage',
        manifestPath: 'packs/pb-02-contract-coverage/pack.json',
      },
    ],
    preloads: [
      {
        packId: 'asset-pack:fixture:pb-02-contract-coverage',
        requiredKeys: [...keys],
      },
    ],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing test fixture item at index ${index}`);
  }
  return item;
}

describe('asset manifest schemas', () => {
  it('accepts the minimum valid selection, source lock, pack, and catalog', () => {
    expect(
      AssetSelectionManifestSchema.safeParse(selectionManifest()).success,
    ).toBe(true);
    expect(AssetSourceLockSchema.safeParse(sourceLock()).success).toBe(true);
    expect(AssetPackManifestSchema.safeParse(packManifest()).success).toBe(
      true,
    );
    expect(AssetPackCatalogSchema.safeParse(catalog()).success).toBe(true);
  });

  it('rejects unknown fields through the public validation diagnostics', () => {
    const input = selectionManifest() as Record<string, unknown>;
    input.unexpected = true;

    const result = validateAssetSelectionManifest(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_SCHEMA_INVALID', path: [] }),
        ]),
      );
    }
  });

  it('reports missing source groups and duplicate keys and IDs', () => {
    const missingGroup = selectionManifest();
    itemAt(missingGroup.entries, 0).sourceGroupId = 'missing-group';

    const missingResult = validateAssetSelectionManifest(missingGroup);
    expect(missingResult.ok).toBe(false);
    if (!missingResult.ok) {
      expect(missingResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_REFERENCE_MISSING' }),
        ]),
      );
    }

    const duplicateKey = selectionManifest();
    itemAt(duplicateKey.entries, 1).key = itemAt(duplicateKey.entries, 0).key;
    const duplicateKeyResult = validateAssetSelectionManifest(duplicateKey);
    expect(duplicateKeyResult.ok).toBe(false);
    if (!duplicateKeyResult.ok) {
      expect(duplicateKeyResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_KEY_DUPLICATE' }),
        ]),
      );
    }

    const duplicateId = selectionManifest();
    itemAt(duplicateId.entries, 1).key = 'creature:tibia:rotworm-copy';
    itemAt(duplicateId.entries, 1).sourceIdentity = {
      kind: 'lookType',
      id: 131,
    };
    const duplicateIdResult = validateAssetSelectionManifest(duplicateId);
    expect(duplicateIdResult.ok).toBe(false);
    if (!duplicateIdResult.ok) {
      expect(duplicateIdResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_ID_DUPLICATE' }),
        ]),
      );
    }
  });

  it('rejects category and source identity combinations from another namespace', () => {
    const input = selectionManifest();
    itemAt(input.entries, 2).category = 'effect';

    const result = validateAssetSelectionManifest(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_CATEGORY_MISMATCH' }),
        ]),
      );
    }
  });

  it('rejects unsafe source-lock paths and non-lowercase hashes', () => {
    const unsafePaths = [
      '../x.png',
      'C:\\x.png',
      '/x.png',
      'https://x.test/x.png',
    ];

    for (const path of unsafePaths) {
      const input = sourceLock();
      itemAt(input.files, 0).path = path;
      const result = validateAssetSourceLock(input);

      expect(result.ok, path).toBe(false);
      if (!result.ok) {
        expect(result.diagnostics).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'ASSET_PATH_UNSAFE' }),
          ]),
        );
      }
    }

    const uppercaseHash = sourceLock();
    itemAt(uppercaseHash.files, 0).sha256 = digest('A');
    const hashResult = validateAssetSourceLock(uppercaseHash);
    expect(hashResult.ok).toBe(false);
    if (!hashResult.ok) {
      expect(hashResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_SCHEMA_INVALID' }),
        ]),
      );
    }
  });

  it('rejects inconsistent animation ranges and media paths', () => {
    const input = packManifest();
    itemAt(itemAt(input.entries, 0).animations, 0).phaseDurationsMs = [
      [200, 100],
    ];
    itemAt(input.entries, 1).media.path = '../media/unsafe.png';

    const result = validateAssetPackManifest(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_ANIMATION_INVALID' }),
          expect.objectContaining({ code: 'ASSET_PATH_UNSAFE' }),
        ]),
      );
    }
  });

  it('rejects product selection groups that carry personal assets', () => {
    const input = selectionManifest();
    itemAt(input.groups, 0).licenseClass = 'cipsoft-personal';

    const result = validateAssetSelectionManifest(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_LICENSE_FORBIDDEN' }),
        ]),
      );
    }
  });

  it('rejects preloads that reference unknown packs or duplicate keys', () => {
    const missingPack = catalog();
    itemAt(missingPack.preloads, 0).packId = 'asset-pack:missing';
    const missingPackResult = validateAssetPackCatalog(missingPack);
    expect(missingPackResult.ok).toBe(false);
    if (!missingPackResult.ok) {
      expect(missingPackResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_REFERENCE_MISSING' }),
        ]),
      );
    }

    const duplicatePack = catalog();
    duplicatePack.packs.push(clone(itemAt(duplicatePack.packs, 0)));
    const duplicatePackResult = validateAssetPackCatalog(duplicatePack);
    expect(duplicatePackResult.ok).toBe(false);
    if (!duplicatePackResult.ok) {
      expect(duplicatePackResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_PACK_CONFLICT' }),
        ]),
      );
    }

    const duplicatePreloadKey = catalog();
    itemAt(duplicatePreloadKey.preloads, 0).requiredKeys.push(itemAt(keys, 0));
    const duplicatePreloadKeyResult =
      validateAssetPackCatalog(duplicatePreloadKey);
    expect(duplicatePreloadKeyResult.ok).toBe(false);
    if (!duplicatePreloadKeyResult.ok) {
      expect(duplicatePreloadKeyResult.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_KEY_DUPLICATE' }),
        ]),
      );
    }
  });
});
