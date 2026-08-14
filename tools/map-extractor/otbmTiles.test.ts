import { describe, expect, it } from 'vitest';

import type { OtbmBounds } from './otbm.ts';
import { readOtbmTiles } from './otbm.ts';
import { encodeOtbmMap } from './testing/otbmFixture.ts';

const bounds: OtbmBounds = {
  minX: 100,
  minY: 200,
  maxX: 103,
  maxY: 203,
  floors: [7, 8],
};

describe('readOtbmTiles', () => {
  it('returns a tile inside the box with absolute coordinates', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 101, y: 202, items: [4526] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)).toEqual([
      { x: 101, y: 202, z: 7, items: [4526] },
    ]);
  });

  it('discards a tile outside the box', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [
          { x: 104, y: 202, items: [1] },
          { x: 101, y: 204, items: [2] },
        ],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)).toEqual([]);
  });

  it('discards a floor that is not extracted', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 9,
        tiles: [{ x: 101, y: 202, items: [1] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)).toEqual([]);
  });

  it('preserves the stacking order of the items in a tile', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 100, y: 200, items: [9, 3, 7, 3] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)[0]?.items).toEqual([9, 3, 7, 3]);
  });

  it('reads tile attribute items before child item nodes', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 100, y: 200, attributeItems: [11, 12], items: [21, 22] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)[0]?.items).toEqual([11, 12, 21, 22]);
  });

  it('filters a partially outside tile area per tile, not per area', () => {
    const buffer = encodeOtbmMap([
      {
        // The area corner sits outside the box; four of its tiles do not.
        baseX: 98,
        baseY: 198,
        baseZ: 7,
        tiles: [
          { x: 98, y: 198, items: [1] },
          { x: 100, y: 200, items: [2] },
          { x: 103, y: 203, items: [3] },
          { x: 104, y: 204, items: [4] },
        ],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)).toEqual([
      { x: 100, y: 200, z: 7, items: [2] },
      { x: 103, y: 203, z: 7, items: [3] },
    ]);
  });

  it('reads tiles from every extracted floor', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 8,
        tiles: [{ x: 100, y: 200, items: [8] }],
      },
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 100, y: 200, items: [7] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)).toEqual([
      { x: 100, y: 200, z: 8, items: [8] },
      { x: 100, y: 200, z: 7, items: [7] },
    ]);
  });

  it('skips the tile flags attribute without losing items', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [
          { x: 100, y: 200, tileFlags: 0x0004_0001, attributeItems: [55] },
        ],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)[0]?.items).toEqual([55]);
  });

  it('reads a house tile as an ordinary tile', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 100, y: 200, houseId: 42, items: [1234] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)).toEqual([
      { x: 100, y: 200, z: 7, items: [1234] },
    ]);
  });

  it('does not treat a tile zone child node as an item', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 100, y: 200, items: [1234], zones: [5, 6] }],
      },
    ]);

    expect(readOtbmTiles(buffer, bounds)[0]?.items).toEqual([1234]);
  });

  it('rejects an unknown tile attribute instead of guessing its length', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [{ x: 100, y: 200, rawAttributes: [200] }],
      },
    ]);

    expect(() => readOtbmTiles(buffer, bounds)).toThrow(/200/);
  });

  it('ignores items nested inside a container item', () => {
    const buffer = encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [
          { x: 100, y: 200, items: [{ id: 1740, contents: [2148, 2148] }, 99] },
        ],
      },
    ]);
    // A container writes its content as grandchildren of the tile; only the
    // direct children stack on the tile.
    expect(readOtbmTiles(buffer, bounds)[0]?.items).toEqual([1740, 99]);
  });
});
