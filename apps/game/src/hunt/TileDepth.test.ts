import { describe, expect, it } from 'vitest';

import { actorDepth, tileDepth } from './TileDepth';

const REGION_WIDTH = 10;

function depth(
  x: number,
  y: number,
  layer: Parameters<typeof tileDepth>[0]['layer'],
  stackIndex = 0,
): number {
  return tileDepth({ x, y, layer, stackIndex, regionWidth: REGION_WIDTH });
}

describe('tileDepth', () => {
  it('orders the layers inside one tile', () => {
    expect(depth(2, 3, 'ground')).toBeLessThan(depth(2, 3, 'objectsBelow'));
    expect(depth(2, 3, 'objectsBelow')).toBeLessThan(depth(2, 3, 'actors'));
    expect(depth(2, 3, 'actors')).toBeLessThan(depth(2, 3, 'objectsAbove'));
  });

  it('lets a wall east of an actor cover it', () => {
    // Tibia draws a row from left to right, so the tile the actor leans into is
    // painted after the actor and hides the part of him that overhangs it.
    expect(depth(3, 3, 'objectsBelow')).toBeGreaterThan(depth(2, 3, 'actors'));
  });

  it('lets a wall south of an actor cover it', () => {
    expect(depth(2, 4, 'objectsBelow')).toBeGreaterThan(depth(2, 3, 'actors'));
  });

  it('keeps an actor in front of the walls north and west of him', () => {
    // His head passes in front of whatever stands behind him.
    expect(depth(2, 3, 'actors')).toBeGreaterThan(depth(2, 2, 'objectsBelow'));
    expect(depth(2, 3, 'actors')).toBeGreaterThan(depth(1, 3, 'objectsBelow'));
  });

  it('never lets a stack reach the layer above it', () => {
    expect(depth(2, 3, 'objectsBelow', 999)).toBeLessThan(
      depth(2, 3, 'actors'),
    );
    expect(depth(2, 3, 'objectsBelow', 0)).toBeLessThan(
      depth(2, 3, 'objectsBelow', 1),
    );
  });

  it('keeps the whole of one row behind the row under it', () => {
    const lastOfRow = depth(REGION_WIDTH - 1, 3, 'objectsAbove', 999);
    const firstOfNextRow = depth(0, 4, 'ground');

    expect(lastOfRow).toBeLessThan(firstOfNextRow);
  });
});

describe('actorDepth', () => {
  function stepping(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): number {
    return actorDepth({ from, to, regionWidth: REGION_WIDTH });
  }

  it('keeps the floor of both tiles under an actor walking north', () => {
    // The simulation moves him to the destination the moment the step starts,
    // but he glides over the tile he is leaving for the whole step. Sorting him
    // with the destination buries him under the floor he is still standing on,
    // and he fades back in as he slides off it.
    const north = stepping({ x: 4, y: 5 }, { x: 4, y: 4 });

    expect(north).toBeGreaterThan(depth(4, 5, 'ground'));
    expect(north).toBeGreaterThan(depth(4, 4, 'ground'));
  });

  it('keeps the floor of both tiles under an actor walking south', () => {
    const south = stepping({ x: 4, y: 5 }, { x: 4, y: 6 });

    expect(south).toBeGreaterThan(depth(4, 5, 'ground'));
    expect(south).toBeGreaterThan(depth(4, 6, 'ground'));
  });

  it('sorts a standing actor with his own tile', () => {
    expect(stepping({ x: 4, y: 5 }, { x: 4, y: 5 })).toBe(
      depth(4, 5, 'actors'),
    );
  });

  it('still passes behind the wall beyond the tile he is entering', () => {
    const east = stepping({ x: 4, y: 5 }, { x: 5, y: 5 });

    expect(depth(6, 5, 'objectsBelow')).toBeGreaterThan(east);
  });

  it('still passes in front of the wall before the tile he is leaving', () => {
    const west = stepping({ x: 4, y: 5 }, { x: 3, y: 5 });

    expect(west).toBeGreaterThan(depth(2, 5, 'objectsBelow'));
  });
});
