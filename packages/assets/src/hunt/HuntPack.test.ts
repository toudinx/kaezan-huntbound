import { describe, expect, it } from 'vitest';

import type { MapRegion } from '../../../contracts/src/hunt/types.ts';

import {
  deriveHuntPackKeys,
  HUNT_PACK_HERO_CREATURE_KEY,
  HUNT_PACK_HERO_LOOT_KEYS,
  hashHuntRegion,
  validateHuntPack,
} from './HuntPack.ts';

function region(palette: readonly number[] = [100, 200]): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:test' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: 1,
    height: 1,
    palette,
    floors: [
      {
        z: 0,
        ground: [0],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
    ],
  };
}

const huntExtras = ['creature:tibia:rotworm', 'outfit:tibia:knight'];
const huntCombatKeys = [
  'effect:tibia:draw-blood',
  'item:tibia:small-splash',
  'effect:tibia:hit-area',
  'effect:tibia:magic-blue',
  'item:tibia:dead-rotworm',
];
const huntLootKeys = [
  'item:tibia:gold-coin',
  'item:tibia:ham',
  'item:tibia:legion-helmet',
  'item:tibia:lump-of-dirt',
  'item:tibia:mace',
  'item:tibia:meat',
  'item:tibia:sword',
  'item:tibia:worm',
];

function selectionFor(
  input: MapRegion,
  keys: readonly string[] = deriveHuntPackKeys(input),
) {
  return {
    packKey: 'pb-04-venore-rotworm-cave',
    huntId: 'hunt:tibia:venore-rotworm-cave',
    regionSha256: hashHuntRegion(input),
    keys: [...keys, ...huntExtras, ...huntCombatKeys, ...huntLootKeys],
    budget: { maxEntries: 512, maxBytes: 6 * 1024 * 1024 },
  };
}

function resolved(keys: readonly string[], bytes = 68) {
  return keys.map((key) => ({ key, bytes }));
}

describe('hunt pack key derivation', () => {
  it('filters the void palette marker and returns ordered tile keys only', () => {
    expect(deriveHuntPackKeys(region([200, 0, 100]))).toEqual([
      'tile:tibia:100',
      'tile:tibia:200',
    ]);
  });

  it('returns no keys for an empty palette', () => {
    expect(deriveHuntPackKeys(region([]))).toEqual([]);
  });

  it('does not invent creature or outfit keys', () => {
    const keys = deriveHuntPackKeys(region([100]));

    expect(keys).toEqual(['tile:tibia:100']);
    expect(keys).not.toContain('creature:tibia:rotworm');
    expect(keys).not.toContain('outfit:tibia:knight');
  });
});

describe('hunt pack validation', () => {
  it('reports every palette key missing from one selection', () => {
    const input = region([100, 200, 300]);
    const selected = selectionFor(input, ['tile:tibia:100']);
    const diagnostics = validateHuntPack(
      selected,
      input,
      resolved(selected.keys),
    );

    expect(
      diagnostics
        .filter(({ code }) => code === 'HUNT_ASSET_KEY_MISSING')
        .map(({ message }) => message),
    ).toEqual([
      'Selection is missing tile:tibia:200',
      'Selection is missing tile:tibia:300',
    ]);
  });

  it('rejects keys outside the palette and the frozen hunt extras', () => {
    const input = region([100]);
    const selected = selectionFor(input, [
      'tile:tibia:100',
      'tile:tibia:999',
      'item:tibia:unused-loot',
    ]);
    const diagnostics = validateHuntPack(
      selected,
      input,
      resolved(selected.keys),
    );

    expect(
      diagnostics
        .filter(({ code }) => code === 'HUNT_ASSET_KEY_UNEXPECTED')
        .map(({ message }) => message),
    ).toEqual([
      'Selection contains unexpected item:tibia:unused-loot',
      'Selection contains unexpected tile:tibia:999',
    ]);
  });

  it('rejects a pack over the entry budget', () => {
    const input = region([100]);
    const selected = selectionFor(input);
    const diagnostics = validateHuntPack(
      selected,
      input,
      resolved(Array.from({ length: 513 }, () => 'tile:tibia:100')),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'HUNT_PACK_OVER_ENTRIES',
        message: 'Pack has 513 entries; maximum is 512',
      }),
    );
  });

  it('rejects a pack over the byte budget', () => {
    const input = region([100]);
    const selected = selectionFor(input);
    const diagnostics = validateHuntPack(selected, input, [
      { key: 'tile:tibia:100', bytes: 6 * 1024 * 1024 + 1 },
    ]);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'HUNT_PACK_OVER_BYTES',
        message: 'Pack has 6291457 bytes; maximum is 6291456',
      }),
    );
  });

  it('rejects a selection whose region hash is stale', () => {
    const input = region([100]);
    const selected = {
      ...selectionFor(input),
      regionSha256: 'f'.repeat(64),
    };

    expect(
      validateHuntPack(selected, input, resolved(selected.keys)),
    ).toContainEqual(
      expect.objectContaining({ code: 'HUNT_PACK_REGION_STALE' }),
    );
  });

  it('reports every combat key missing from one validation', () => {
    const input = region([0, 100]);
    const complete = selectionFor(input);
    const resolvedKeys = complete.keys.filter(
      (key) => !huntCombatKeys.includes(key),
    );
    const diagnostics = validateHuntPack(
      complete,
      input,
      resolved(resolvedKeys),
    );

    expect(
      diagnostics
        .filter(({ code }) => code === 'HUNT_ASSET_KEY_MISSING')
        .map(({ message }) => message),
    ).toEqual(huntCombatKeys.map((key) => `Selection is missing ${key}`));
  });

  it('reports a resolved key that was not declared by the selection', () => {
    const input = region([100]);
    const selected = selectionFor(input);
    const diagnostics = validateHuntPack(
      selected,
      input,
      resolved([...selected.keys, 'item:tibia:unused-combat-asset']),
    );

    expect(
      diagnostics
        .filter(({ code }) => code === 'HUNT_ASSET_KEY_UNEXPECTED')
        .map(({ message }) => message),
    ).toEqual(['Selection contains unexpected item:tibia:unused-combat-asset']);
  });

  it('accepts the selected Hero creature and loot keys', () => {
    const input = region([100]);
    const selected = {
      ...selectionFor(input),
      keys: [
        'tile:tibia:100',
        HUNT_PACK_HERO_CREATURE_KEY,
        'outfit:tibia:knight',
        ...huntCombatKeys,
        ...HUNT_PACK_HERO_LOOT_KEYS,
      ],
    };

    expect(validateHuntPack(selected, input, resolved(selected.keys))).toEqual(
      [],
    );
  });
});
