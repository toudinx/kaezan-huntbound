import { describe, expect, it } from 'vitest';

import {
  AssetPackManifestSchema,
  AssetPackRegistry,
  AssetProviderError,
  createClientId,
  createEffectId,
  createLookTypeId,
  createManifestAssetAdapters,
  createMissileId,
} from '../index.ts';

const digest = (character: string) => character.repeat(64);

const group = {
  groupId: 'huntbound-test',
  source: 'huntbound-synthetic-fixture',
  sourceSnapshot: 'pb02-synthetic-v1',
  licenseClass: 'huntbound-test',
  buildProfiles: ['test', 'product'],
};

const sourceEntries = [
  {
    key: 'outfit:tibia:knight',
    category: 'outfit',
    sourceIdentity: { kind: 'lookType', id: 131 },
  },
  {
    key: 'creature:tibia:rotworm',
    category: 'creature',
    sourceIdentity: { kind: 'lookType', id: 26 },
  },
  {
    key: 'item:tibia:gold-coin',
    category: 'object',
    sourceIdentity: { kind: 'clientId', id: 3031 },
  },
  {
    key: 'effect:tibia:energy-hit',
    category: 'effect',
    sourceIdentity: { kind: 'effectId', id: 12 },
  },
  {
    key: 'missile:tibia:energy-ball',
    category: 'missile',
    sourceIdentity: { kind: 'missileId', id: 36 },
  },
  {
    key: 'outfit:tibia:look-twelve',
    category: 'outfit',
    sourceIdentity: { kind: 'lookType', id: 12 },
  },
] as const;

function createManifest() {
  return AssetPackManifestSchema.parse({
    schemaVersion: '1',
    packId: 'asset-pack:fixture:adapters',
    contentVersion: 'pb-02-adapters@1',
    groups: [group],
    entries: sourceEntries.map((sourceEntry, index) => {
      const sha256 = digest(String.fromCharCode(97 + index));
      return {
        ...sourceEntry,
        sourceGroupId: group.groupId,
        media: {
          path: `media/${sha256}.png`,
          sha256,
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
        pivot: { x: 0.5, y: 0.5 },
        scale: 1,
        filtering: 'nearest',
      };
    }),
  });
}

describe('manifest asset adapters', () => {
  it('resolves each typed namespace without mixing equal numeric IDs', () => {
    const manifest = createManifest();
    const registry = new AssetPackRegistry();
    registry.install({
      manifest,
      packSha256: digest('p'),
      mediaUrlsBySha256: new Map(
        manifest.entries.map((entry) => [
          entry.media.sha256,
          `blob:${entry.key}`,
        ]),
      ),
    });
    const adapters = createManifestAssetAdapters(registry);

    expect(adapters.lookTypes.resolveLookType(createLookTypeId(131))).toBe(
      'outfit:tibia:knight',
    );
    expect(adapters.lookTypes.resolveLookType(createLookTypeId(26))).toBe(
      'creature:tibia:rotworm',
    );
    expect(adapters.clientIds.resolveClientId(createClientId(3031))).toBe(
      'item:tibia:gold-coin',
    );
    expect(adapters.effects.resolveEffectId(createEffectId(12))).toBe(
      'effect:tibia:energy-hit',
    );
    expect(adapters.missiles.resolveMissileId(createMissileId(36))).toBe(
      'missile:tibia:energy-ball',
    );
    expect(adapters.lookTypes.resolveLookType(createLookTypeId(12))).toBe(
      'outfit:tibia:look-twelve',
    );
  });

  it('throws a typed unavailable error for an ID outside loaded packs', () => {
    const registry = new AssetPackRegistry();
    const adapters = createManifestAssetAdapters(registry);

    try {
      adapters.lookTypes.resolveLookType(createLookTypeId(999));
      throw new Error('Expected lookType resolution to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AssetProviderError);
      expect(error).toMatchObject({ code: 'ASSET_KEY_UNAVAILABLE' });
    }
  });
});
