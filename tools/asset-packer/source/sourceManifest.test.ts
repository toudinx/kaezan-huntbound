import {
  type AssetSelectionManifest,
  AssetSelectionManifestSchema,
} from '@huntbound/assets';
import { describe, expect, it } from 'vitest';

import {
  parseArenaFableSourceManifest,
  resolveSelectedSourceEntries,
} from './sourceManifest.ts';

type HistoricalEntry = Record<string, unknown>;
type HistoricalMap = Record<string, HistoricalEntry>;
type HistoricalFixture = {
  readonly outfits: HistoricalMap;
  readonly objects: HistoricalMap;
  readonly effects: HistoricalMap;
  readonly missiles: HistoricalMap;
  readonly semantic: Record<string, unknown>;
  readonly objectNames: Record<string, unknown>;
};

const identities = [
  { kind: 'lookType', id: 131 },
  { kind: 'lookType', id: 26 },
  { kind: 'clientId', id: 3031 },
  { kind: 'effectId', id: 12 },
  { kind: 'missileId', id: 36 },
] as const;

const keys = [
  'outfit:tibia:knight',
  'creature:tibia:rotworm',
  'item:tibia:gold-coin',
  'effect:tibia:energy-hit',
  'missile:tibia:energy-ball',
] as const;

const categories = [
  'outfit',
  'creature',
  'object',
  'effect',
  'missile',
] as const;

function sourceEntry(file: string, groups: unknown): HistoricalEntry {
  return {
    name: '',
    file,
    cellW: 32,
    cellH: 32,
    cols: 1,
    groups,
    flags: {},
  };
}

function animationGroup(kind: string, count = 1): HistoricalEntry {
  return {
    kind,
    patternX: 1,
    patternY: 1,
    patternZ: 1,
    layers: 1,
    phases: Array.from({ length: count }, () => [100, 100]),
    start: 0,
    count,
  };
}

function historicalManifest(): HistoricalFixture {
  return {
    outfits: {
      '131': sourceEntry('outfits/131.png', [
        animationGroup('idle'),
        animationGroup('moving', 2),
      ]),
      '26': sourceEntry('outfits/26.png', animationGroup('moving')),
    },
    objects: {
      '3031': sourceEntry('objects/3031.png', animationGroup('object')),
    },
    effects: {
      '12': sourceEntry('effects/12.png', animationGroup('object')),
    },
    missiles: {
      '36': sourceEntry('missiles/36.png', animationGroup('object')),
    },
    semantic: {},
    objectNames: {},
  };
}

function selectionManifest(): AssetSelectionManifest {
  return AssetSelectionManifestSchema.parse({
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
    entries: keys.map((key, index) => ({
      key,
      category: categories[index],
      sourceIdentity: identities[index],
      sourceGroupId: 'huntbound-test',
      consumer: 'PB-02 browser contract fixture',
      rationale: `Covers ${key}.`,
      presentation: {
        pivot: { x: 0.5, y: index < 2 ? 1 : 0.5 },
        scale: 1,
        filtering: 'nearest',
      },
    })),
  });
}

function mutableMap(
  source: HistoricalFixture,
  map: keyof Pick<
    HistoricalFixture,
    'outfits' | 'objects' | 'effects' | 'missiles'
  >,
): HistoricalMap {
  return source[map];
}

describe('Arena Fable source manifest', () => {
  it('normalizes a single historical group and resolves all five identity maps', () => {
    const parsed = parseArenaFableSourceManifest(historicalManifest());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('fixture should parse');

    expect(parsed.value.outfits['131']?.groups).toHaveLength(2);
    expect(parsed.value.effects['12']?.groups).toHaveLength(1);

    const resolved = resolveSelectedSourceEntries(
      selectionManifest(),
      parsed.value,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error('selection should resolve');

    expect(resolved.value.map(({ sourcePath }) => sourcePath)).toEqual([
      'outfits/131.png',
      'outfits/26.png',
      'objects/3031.png',
      'effects/12.png',
      'missiles/36.png',
    ]);
  });

  it('aggregates missing identities and never falls back to another category map', () => {
    const source = historicalManifest();
    delete mutableMap(source, 'effects')['12'];
    const goldCoin = mutableMap(source, 'objects')['3031'];
    if (goldCoin === undefined) throw new Error('gold coin fixture is missing');
    mutableMap(source, 'objects')['12'] = goldCoin;

    const parsed = parseArenaFableSourceManifest(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('fixture should parse');

    const result = resolveSelectedSourceEntries(
      selectionManifest(),
      parsed.value,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.diagnostics.filter(
          ({ code }) => code === 'ASSET_REFERENCE_MISSING',
        ),
      ).toHaveLength(1);
      expect(result.diagnostics[0]?.path).toEqual(['effects', '12']);
    }
  });

  it.each([
    [
      'entry extra field',
      () => ({ ...historicalManifest().outfits['131'], unexpected: true }),
    ],
    [
      'unsafe source path',
      () => ({
        ...historicalManifest().outfits['131'],
        file: '../outside.png',
      }),
    ],
  ])('rejects %s', (_name, makeEntry) => {
    const input = historicalManifest();
    mutableMap(input, 'outfits')['131'] = makeEntry();

    const result = parseArenaFableSourceManifest(input);

    expect(result.ok).toBe(false);
  });
});
