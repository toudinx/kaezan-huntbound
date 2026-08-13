import {
  type AssetSelectionManifest,
  AssetSelectionManifestSchema,
  type AssetSourceLock,
  AssetSourceLockSchema,
} from '@huntbound/assets';
import { describe, expect, it } from 'vitest';
import {
  type ArenaFableSourceManifest,
  parseArenaFableSourceManifest,
} from '../source/sourceManifest.ts';
import {
  buildAssetPackManifest,
  canonicalAssetJson,
} from './buildAssetPack.ts';

const mediaSha256 =
  '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460';

const selectedAssets = [
  {
    key: 'outfit:tibia:knight',
    category: 'outfit',
    sourceIdentity: { kind: 'lookType', id: 131 },
    sourcePath: 'outfits/131.png',
    pivot: { x: 0.5, y: 1 },
  },
  {
    key: 'creature:tibia:rotworm',
    category: 'creature',
    sourceIdentity: { kind: 'lookType', id: 26 },
    sourcePath: 'outfits/26.png',
    pivot: { x: 0.5, y: 1 },
  },
  {
    key: 'item:tibia:gold-coin',
    category: 'object',
    sourceIdentity: { kind: 'clientId', id: 3031 },
    sourcePath: 'objects/3031.png',
    pivot: { x: 0.5, y: 0.5 },
  },
  {
    key: 'effect:tibia:energy-hit',
    category: 'effect',
    sourceIdentity: { kind: 'effectId', id: 12 },
    sourcePath: 'effects/12.png',
    pivot: { x: 0.5, y: 0.5 },
  },
  {
    key: 'missile:tibia:energy-ball',
    category: 'missile',
    sourceIdentity: { kind: 'missileId', id: 36 },
    sourcePath: 'missiles/36.png',
    pivot: { x: 0.5, y: 0.5 },
  },
] as const;

function sourceEntry(
  file: string,
  groups: readonly Record<string, unknown>[] = [
    {
      kind: 'default',
      patternX: 1,
      patternY: 1,
      patternZ: 1,
      layers: 1,
      phases: [[100, 100]],
      start: 0,
      count: 1,
    },
  ],
) {
  return {
    name: '',
    file,
    cellW: 32,
    cellH: 32,
    cols: 2,
    groups,
    flags: {},
  };
}

function fixtureInput(): {
  readonly selection: AssetSelectionManifest;
  readonly sourceLock: AssetSourceLock;
  readonly sourceManifest: ArenaFableSourceManifest;
} {
  const selection = AssetSelectionManifestSchema.parse({
    schemaVersion: '1',
    selectionId: 'fixture:pb-02-contract-coverage',
    packId: 'asset-pack:fixture:pb-02-contract-coverage',
    contentVersion: 'pb-02-contract-coverage@1',
    buildProfiles: ['test', 'product'],
    groups: [
      {
        groupId: 'huntbound-test',
        source: 'huntbound-synthetic-fixture',
        sourceSnapshot: 'pb02-synthetic-v1',
        licenseClass: 'huntbound-test',
        buildProfiles: ['test', 'product'],
      },
    ],
    entries: selectedAssets.map((asset) => ({
      key: asset.key,
      category: asset.category,
      sourceIdentity: asset.sourceIdentity,
      sourceGroupId: 'huntbound-test',
      consumer: 'PB-02 browser contract fixture',
      rationale: `Covers ${asset.key}.`,
      presentation: {
        pivot: asset.pivot,
        scale: 1,
        filtering: 'nearest',
      },
    })),
  });
  const sourceLock = AssetSourceLockSchema.parse({
    schemaVersion: '1',
    source: 'huntbound-synthetic-fixture',
    sourceSnapshot: 'pb02-synthetic-v1',
    manifest: {
      path: 'manifest.json',
      sha256:
        '35ce637abe588a5989d08a112e99a53f04a34dfa4631d47cd65c6fc5137fbd5b',
      byteLength: 1901,
    },
    files: selectedAssets.map((asset) => ({
      key: asset.key,
      category: asset.category,
      sourceIdentity: asset.sourceIdentity,
      path: asset.sourcePath,
      sha256: mediaSha256,
      byteLength: 68,
    })),
  });
  const parsedSource = parseArenaFableSourceManifest({
    outfits: {
      '26': sourceEntry('outfits/26.png'),
      '131': sourceEntry('outfits/131.png', [
        {
          kind: 'idle',
          patternX: 2,
          patternY: 3,
          patternZ: 4,
          layers: 2,
          phases: [[80, 120]],
          start: 0,
          count: 48,
        },
        {
          kind: 'moving',
          patternX: 2,
          patternY: 3,
          patternZ: 4,
          layers: 2,
          phases: [
            [90, 110],
            [100, 140],
          ],
          start: 48,
          count: 96,
        },
      ]),
    },
    objects: { '3031': sourceEntry('objects/3031.png') },
    effects: { '12': sourceEntry('effects/12.png') },
    missiles: { '36': sourceEntry('missiles/36.png') },
    semantic: {},
    objectNames: {},
  });
  if (!parsedSource.ok) throw new Error('source fixture should parse');
  return { selection, sourceLock, sourceManifest: parsedSource.value };
}

describe('asset pack manifest builder', () => {
  it('builds five ordered entries with explicit presentation and normalized animation metadata', () => {
    const result = buildAssetPackManifest(fixtureInput());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('pack manifest should build');
    expect(result.value.entries.map(({ key }) => key)).toEqual([
      'creature:tibia:rotworm',
      'effect:tibia:energy-hit',
      'item:tibia:gold-coin',
      'missile:tibia:energy-ball',
      'outfit:tibia:knight',
    ]);
    expect(result.value.groups.map(({ groupId }) => groupId)).toEqual([
      'huntbound-test',
    ]);
    const knight = result.value.entries.at(-1);
    expect(knight).toMatchObject({
      key: 'outfit:tibia:knight',
      cellWidth: 32,
      cellHeight: 32,
      columns: 2,
      atlasFrameCount: 144,
      pivot: { x: 0.5, y: 1 },
      scale: 1,
      filtering: 'nearest',
      animations: [
        {
          kind: 'idle',
          patternX: 2,
          patternY: 3,
          patternZ: 4,
          layers: 2,
          startFrame: 0,
          frameCount: 48,
          phaseDurationsMs: [[80, 120]],
        },
        {
          kind: 'moving',
          patternX: 2,
          patternY: 3,
          patternZ: 4,
          layers: 2,
          startFrame: 48,
          frameCount: 96,
          phaseDurationsMs: [
            [90, 110],
            [100, 140],
          ],
        },
      ],
    });
  });

  it('deduplicates identical locked media by using one content-addressed path', () => {
    const result = buildAssetPackManifest(fixtureInput());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('pack manifest should build');
    expect(
      new Set(result.value.entries.map(({ media }) => media.path)),
    ).toEqual(new Set([`media/${mediaSha256}.png`]));
  });

  it('aggregates two missing source identities and one lock category mismatch in stable order', () => {
    const input = fixtureInput();
    const { '26': _missingRotworm, ...remainingOutfits } =
      input.sourceManifest.outfits;
    const { '36': _missingMissile, ...remainingMissiles } =
      input.sourceManifest.missiles;
    const sourceLock = {
      ...input.sourceLock,
      files: input.sourceLock.files.map((file) =>
        file.key === 'item:tibia:gold-coin'
          ? { ...file, category: 'outfit' as const }
          : file,
      ),
    } as AssetSourceLock;

    const result = buildAssetPackManifest({
      ...input,
      sourceLock,
      sourceManifest: {
        ...input.sourceManifest,
        outfits: remainingOutfits,
        missiles: remainingMissiles,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('divergent inputs should fail');
    expect(
      result.diagnostics.map(({ code, key, path }) => ({ code, key, path })),
    ).toEqual([
      {
        code: 'ASSET_CATEGORY_MISMATCH',
        key: 'item:tibia:gold-coin',
        path: ['sourceLock', 'files', 2, 'category'],
      },
      {
        code: 'ASSET_REFERENCE_MISSING',
        key: 'missile:tibia:energy-ball',
        path: ['sourceManifest', 'missiles', '36'],
      },
      {
        code: 'ASSET_REFERENCE_MISSING',
        key: 'creature:tibia:rotworm',
        path: ['sourceManifest', 'outfits', '26'],
      },
    ]);
  });
});

describe('canonical asset JSON', () => {
  it('sorts object keys recursively and writes UTF-8 JSON with one LF newline', () => {
    expect(
      canonicalAssetJson({ z: 0, a: { beta: 2, alpha: 1 }, list: [2, 1] }),
    ).toBe('{"a":{"alpha":1,"beta":2},"list":[2,1],"z":0}\n');
  });
});
