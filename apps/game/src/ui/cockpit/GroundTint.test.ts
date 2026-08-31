import { describe, expect, it } from 'vitest';

import { averageOpaqueColor, groundTileAssetKey, scaleRgb } from './GroundTint';

describe('averageOpaqueColor', () => {
  it('averages the pixels the tile actually paints', () => {
    expect(averageOpaqueColor([200, 100, 50, 255, 100, 50, 25, 255])).toEqual({
      r: 150,
      g: 75,
      b: 38,
    });
  });

  it('ignores transparent pixels instead of averaging them toward black', () => {
    expect(
      averageOpaqueColor([60, 120, 90, 255, 0, 0, 0, 0, 0, 0, 0, 0]),
    ).toEqual({ r: 60, g: 120, b: 90 });
  });

  it('reports no colour for a tile that paints nothing', () => {
    expect(averageOpaqueColor([0, 0, 0, 0])).toBeUndefined();
  });
});

describe('ground tile keys', () => {
  it('addresses the pack entry for a ground client id', () => {
    expect(groundTileAssetKey(101)).toBe('tile:tibia:101');
  });
});

describe('scaleRgb', () => {
  it('darkens without leaving the channel range', () => {
    expect(scaleRgb({ r: 200, g: 100, b: 50 }, 0.5)).toEqual({
      r: 100,
      g: 50,
      b: 25,
    });
    expect(scaleRgb({ r: 200, g: 100, b: 50 }, 4)).toEqual({
      r: 255,
      g: 255,
      b: 200,
    });
  });
});
