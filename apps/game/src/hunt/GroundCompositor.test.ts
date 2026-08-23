import { describe, expect, it } from 'vitest';

import type { MapRegion } from '../../../../packages/contracts/src/index.ts';

import {
  groundBounds,
  groundCompositionStats,
  groundEdgeCells,
  resolveGroundSample,
  unresolvedGroundCells,
} from './GroundCompositor';

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

/**
 * A floor with a margin of void around it and one hole inside it, which is the
 * shape the extracted hunt actually has: the region rectangle is wider than the
 * ground it carries.
 */
function regionWithMarginAndHole(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:test:margin-and-hole' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: 4,
    height: 4,
    palette: [0, 101],
    floors: [
      {
        z: 7,
        // . . . .
        // . # # .
        // . # . .
        // . . . .
        ground: [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
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

  it('lists every cell the compositor leaves without ground', () => {
    const region = regionWithMarginAndHole();

    expect(unresolvedGroundCells(region, 7)).toEqual([
      0, 1, 2, 3, 4, 7, 8, 10, 11, 12, 13, 14, 15,
    ]);
  });

  /**
   * The void treatment must not decide for itself which cell is empty, or the
   * scene and the compositor drift apart the moment the extraction window
   * changes. This pins the list to the one answer `resolveGroundSample` gives.
   */
  it('agrees with resolveGroundSample on every cell', () => {
    const region = regionWithMarginAndHole();
    const listed = new Set(unresolvedGroundCells(region, 7));

    for (let index = 0; index < region.width * region.height; index += 1) {
      expect(listed.has(index)).toBe(
        resolveGroundSample(region, 7, index) === undefined,
      );
    }
  });

  it('counts the listed cells as the unresolved half of the stats', () => {
    const region = regionWithMarginAndHole();
    const stats = groundCompositionStats(region, 7);

    expect(stats.unresolvedGroundCells).toBe(
      unresolvedGroundCells(region, 7).length,
    );
    expect(stats.composedGroundCells + stats.unresolvedGroundCells).toBe(
      region.width * region.height,
    );
  });

  it('boxes the cells that do have ground, ignoring the empty margin', () => {
    const region = regionWithMarginAndHole();

    expect(groundBounds(region, 7)).toEqual({
      minX: 1,
      minY: 1,
      maxX: 2,
      maxY: 2,
    });
  });

  /**
   * A flat fill of one dark colour still reads as a hole punched in the page
   * where it meets a lit floor. The cells that touch ground are the ones that
   * have to read as a rock face instead, so the scene needs them named.
   */
  it('names the empty cells that touch ground orthogonally', () => {
    const region = regionWithMarginAndHole();

    // Ground sits at 5, 6 and 9. Their orthogonal empty neighbours are the
    // cells around them; 0, 3, 12 and 15 only touch ground diagonally.
    expect(groundEdgeCells(region, 7)).toEqual([1, 2, 4, 7, 8, 10, 13]);
  });

  it('treats an edge cell as a subset of the empty cells', () => {
    const region = regionWithMarginAndHole();
    const empty = new Set(unresolvedGroundCells(region, 7));

    for (const index of groundEdgeCells(region, 7)) {
      expect(empty.has(index)).toBe(true);
    }
  });

  it('names no edge when the floor carries no ground at all', () => {
    const region = regionWithMarginAndHole();
    const empty = {
      ...region,
      floors: region.floors.map((floor) => ({
        ...floor,
        ground: new Array(16).fill(0),
      })),
    };

    expect(groundEdgeCells(empty, 7)).toEqual([]);
  });

  it('boxes nothing when the floor carries no ground at all', () => {
    const region = regionWithMarginAndHole();
    const empty: MapRegion = {
      ...region,
      floors: region.floors.map((floor) => ({
        ...floor,
        ground: new Array(16).fill(0),
      })),
    };

    expect(groundBounds(empty, 7)).toBeUndefined();
  });
});
