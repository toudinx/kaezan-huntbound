import { describe, expect, it } from 'vitest';
import {
  HUNT_PACK_CREATURE_KEY,
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

describe('PB-04 hunt selection generation', () => {
  it('derives metadata and tile keys from the region', () => {
    const selection = deriveHuntPackSelection(region());

    expect(selection.keys).toEqual([
      'tile:tibia:100',
      'tile:tibia:200',
      HUNT_PACK_CREATURE_KEY,
      HUNT_PACK_OUTFIT_KEY,
    ]);
    expect(selection.regionSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('creates a regular asset selection without media paths', () => {
    const manifest = createHuntAssetSelection({
      hunt: deriveHuntPackSelection(region()),
      group,
    });

    expect(manifest.hunt?.keys).toHaveLength(4);
    expect(manifest.entries.map(({ key }) => key)).toEqual([
      HUNT_PACK_CREATURE_KEY,
      HUNT_PACK_OUTFIT_KEY,
      'tile:tibia:100',
      'tile:tibia:200',
    ]);
    expect(JSON.stringify(manifest)).not.toContain('.png');
  });
});
