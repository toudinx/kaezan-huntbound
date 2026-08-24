import { describe, expect, it } from 'vitest';

import { calculateMaterialSignature, createMaterialGrid } from './signature.ts';
import type { MaterialWindow } from './types.ts';

const window: MaterialWindow = {
  floors: [7],
  maxX: 2,
  maxY: 2,
  minX: 0,
  minY: 0,
  reason: 'synthetic signature fixture',
};

describe('calculateMaterialSignature', () => {
  it('encodes neighbors as N, NE, E, SE, S, SW, W, NW low bits', () => {
    const grid = createMaterialGrid(window, [
      { items: [101], x: 0, y: 0, z: 7 },
      { items: [101], x: 1, y: 0, z: 7 },
      { items: [101], x: 2, y: 0, z: 7 },
      { items: [351], x: 0, y: 1, z: 7 },
      { items: [101], x: 1, y: 1, z: 7 },
      { items: [351], x: 2, y: 1, z: 7 },
      { items: [101], x: 0, y: 2, z: 7 },
      { items: [351], x: 1, y: 2, z: 7 },
      { items: [101], x: 2, y: 2, z: 7 },
    ]);

    expect(
      calculateMaterialSignature(grid, { x: 1, y: 1, z: 7 }, new Set([101])),
    ).toBe(171);
  });

  it('treats neighbors outside the declared window as different material', () => {
    const grid = createMaterialGrid(window, [
      { items: [101], x: -1, y: 0, z: 7 },
      { items: [101], x: 0, y: 0, z: 7 },
      { items: [101], x: 1, y: 0, z: 7 },
      { items: [101], x: 0, y: 1, z: 7 },
      { items: [101], x: 1, y: 1, z: 7 },
      { items: [101], x: 0, y: 2, z: 7 },
      { items: [101], x: 1, y: 2, z: 7 },
    ]);

    expect(
      calculateMaterialSignature(grid, { x: 0, y: 0, z: 7 }, new Set([101])),
    ).toBe(28);
  });
});
