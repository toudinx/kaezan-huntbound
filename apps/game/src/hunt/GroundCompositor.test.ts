import { describe, expect, it } from 'vitest';

import type { MapRegion } from '../../../../packages/contracts/src/index.ts';

import { resolveGroundSample } from './GroundCompositor';

function regionWithStackedGround(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:test:stacked-ground' as MapRegion['regionId'],
    regionRevision: 2,
    origin: { x: 0, y: 0 },
    width: 2,
    height: 2,
    palette: [0, 101, 102],
    floors: [
      {
        z: 7,
        ground: [1, 2, 0, 0],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
      {
        z: 8,
        ground: [1, 1, 0, 1],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
    ],
  };
}

describe('GroundCompositor', () => {
  it('reveals lower-floor ground through an active-floor void', () => {
    const region = regionWithStackedGround();

    expect(resolveGroundSample(region, 7, 3)).toEqual({
      paletteIndex: 1,
      sourceZ: 8,
    });
    expect(resolveGroundSample(region, 8, 2)).toBeUndefined();
  });

  it('prefers active-floor ground and ignores invalid palette entries', () => {
    const region = regionWithStackedGround();

    expect(resolveGroundSample(region, 7, 0)).toEqual({
      paletteIndex: 1,
      sourceZ: 7,
    });
    expect(resolveGroundSample(region, 7, 1)).toEqual({
      paletteIndex: 2,
      sourceZ: 7,
    });
  });
});
