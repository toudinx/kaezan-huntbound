import { describe, expect, it } from 'vitest';
import {
  HUNT_PACK_CREATURE_KEY,
  HUNT_PACK_DRAGON_CREATURE_KEY,
  HUNT_PACK_DRAGON_LOOT_KEYS,
  HUNT_PACK_HERO_CREATURE_KEY,
  HUNT_PACK_HERO_LOOT_KEYS,
  HUNT_PACK_LOOT_KEYS,
  HUNT_PACK_OUTFIT_KEY,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';
import {
  createHuntAssetSelection,
  deriveHuntPackSelection,
} from './huntSelection.ts';

function region(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:test' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: 1,
    height: 1,
    palette: [0, 100, 200],
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

const group = {
  groupId: 'huntbound-test',
  source: 'huntbound-synthetic-fixture',
  sourceSnapshot: 'pb04-synthetic-v1',
  licenseClass: 'huntbound-test' as const,
  buildProfiles: ['test', 'product'] as const,
};

const combatKeys = [
  'effect:tibia:draw-blood',
  'item:tibia:small-splash',
  'effect:tibia:hit-area',
  'effect:tibia:magic-blue',
  'item:tibia:dead-rotworm',
];

const metadata = {
  huntId: 'hunt:tibia:test-cave',
  packKey: 'test-pack',
};
const consumer = 'Test hunt asset pack';
const cyclopsAssetSelection = {
  creature: { key: 'creature:tibia:cyclops', lookType: 22 },
  loot: [
    { key: 'item:tibia:gold-coin', clientId: 3031 },
    { key: 'item:tibia:meat', clientId: 3577 },
    { key: 'item:tibia:short-sword', clientId: 3294 },
  ],
} as const;

describe('hunt selection generation', () => {
  it('derives metadata and tile keys from the region', () => {
    const selection = deriveHuntPackSelection(region(), metadata);

    expect(selection.keys).toEqual([
      'tile:tibia:100',
      'tile:tibia:200',
      HUNT_PACK_CREATURE_KEY,
      HUNT_PACK_OUTFIT_KEY,
      ...combatKeys,
      ...HUNT_PACK_LOOT_KEYS,
    ]);
    expect(selection.regionSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('creates a regular asset selection without media paths', () => {
    const manifest = createHuntAssetSelection({
      hunt: deriveHuntPackSelection(region(), metadata),
      group,
      consumer,
    });

    expect(manifest.hunt?.keys).toHaveLength(17);
    expect(manifest.entries.map(({ key }) => key)).toEqual([
      HUNT_PACK_CREATURE_KEY,
      'effect:tibia:draw-blood',
      'effect:tibia:hit-area',
      'effect:tibia:magic-blue',
      'item:tibia:dead-rotworm',
      'item:tibia:gold-coin',
      'item:tibia:ham',
      'item:tibia:legion-helmet',
      'item:tibia:lump-of-dirt',
      'item:tibia:mace',
      'item:tibia:meat',
      'item:tibia:small-splash',
      'item:tibia:sword',
      'item:tibia:worm',
      HUNT_PACK_OUTFIT_KEY,
      'tile:tibia:100',
      'tile:tibia:200',
    ]);
    expect(JSON.stringify(manifest)).not.toContain('.png');
  });

  it('maps combat keys to their frozen source identities', () => {
    const manifest = createHuntAssetSelection({
      hunt: deriveHuntPackSelection(region(), metadata),
      group,
      consumer,
    });

    expect(
      manifest.entries
        .filter(({ key }) => combatKeys.includes(key))
        .map(({ key, category, sourceIdentity }) => ({
          key,
          category,
          sourceIdentity,
        })),
    ).toEqual([
      {
        key: 'effect:tibia:draw-blood',
        category: 'effect',
        sourceIdentity: { kind: 'effectId', id: 1 },
      },
      {
        key: 'effect:tibia:hit-area',
        category: 'effect',
        sourceIdentity: { kind: 'effectId', id: 10 },
      },
      {
        key: 'effect:tibia:magic-blue',
        category: 'effect',
        sourceIdentity: { kind: 'effectId', id: 13 },
      },
      {
        key: 'item:tibia:dead-rotworm',
        category: 'object',
        sourceIdentity: { kind: 'clientId', id: 5967 },
      },
      {
        key: 'item:tibia:small-splash',
        category: 'object',
        sourceIdentity: { kind: 'clientId', id: 2889 },
      },
    ]);
  });

  it('maps the Hero creature and loot keys to their source identities', () => {
    const manifest = createHuntAssetSelection({
      hunt: deriveHuntPackSelection(region(), {
        ...metadata,
        creatureKey: HUNT_PACK_HERO_CREATURE_KEY,
        lootKeys: HUNT_PACK_HERO_LOOT_KEYS,
      }),
      group,
      consumer,
    });
    const entries = new Map(
      manifest.entries.map((entry) => [entry.key, entry]),
    );

    expect(entries.get(HUNT_PACK_HERO_CREATURE_KEY)).toMatchObject({
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: 73 },
    });
    expect(entries.get('item:tibia:arrow')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 3447 },
    });
    expect(entries.get('item:tibia:bow')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 3350 },
    });
    expect(entries.get('item:tibia:green-tunic')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 3563 },
    });
    expect(entries.get('item:tibia:sniper-arrow')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 7364 },
    });
  });

  it('derives creature and loot identities from the selected hunt', () => {
    const hunt = deriveHuntPackSelection(region(), {
      ...metadata,
      assetSelection: cyclopsAssetSelection,
    });
    const manifest = createHuntAssetSelection({
      hunt,
      group,
      consumer,
      assetSelection: cyclopsAssetSelection,
    });

    expect(hunt.keys).toContain('creature:tibia:cyclops');
    expect(hunt.keys).not.toContain(HUNT_PACK_CREATURE_KEY);
    expect(
      manifest.entries
        .filter(({ key }) =>
          ['creature:tibia:cyclops', 'item:tibia:short-sword'].includes(key),
        )
        .map(({ key, category, sourceIdentity }) => ({
          key,
          category,
          sourceIdentity,
        })),
    ).toEqual([
      {
        key: 'creature:tibia:cyclops',
        category: 'creature',
        sourceIdentity: { kind: 'lookType', id: 22 },
      },
      {
        key: 'item:tibia:short-sword',
        category: 'object',
        sourceIdentity: { kind: 'clientId', id: 3294 },
      },
    ]);
  });

  it('maps the Dragon creature and loot keys to their source identities', () => {
    const manifest = createHuntAssetSelection({
      hunt: deriveHuntPackSelection(region(), {
        ...metadata,
        creatureKey: HUNT_PACK_DRAGON_CREATURE_KEY,
        lootKeys: HUNT_PACK_DRAGON_LOOT_KEYS,
      }),
      group,
      consumer,
    });
    const entries = new Map(
      manifest.entries.map((entry) => [entry.key, entry]),
    );

    expect(entries.get(HUNT_PACK_DRAGON_CREATURE_KEY)).toMatchObject({
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: 34 },
    });
    expect(entries.get('item:tibia:dragon-ham')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 3583 },
    });
    expect(entries.get('item:tibia:burst-arrow')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 3449 },
    });
    expect(entries.get('item:tibia:dragon-s-tail')).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 11457 },
    });
  });
});
