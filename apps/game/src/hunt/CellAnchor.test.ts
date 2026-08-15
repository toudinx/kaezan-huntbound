import { describe, expect, it } from 'vitest';

import { cellAnchor } from './CellAnchor';

describe('cellAnchor', () => {
  it('covers exactly its own tile when the cell is one tile wide', () => {
    const anchor = cellAnchor({
      cell: { x: 0, y: 0 },
      cellWidth: 32,
      cellHeight: 32,
      scale: 1,
      tileSize: 32,
    });

    expect(anchor).toEqual({
      originX: 1,
      originY: 1,
      x: 32,
      y: 32,
      width: 32,
      height: 32,
    });
  });

  it('lands a two-tile cell on the same tile as a one-tile cell', () => {
    const small = cellAnchor({
      cell: { x: 3, y: 4 },
      cellWidth: 32,
      cellHeight: 32,
      scale: 1,
      tileSize: 32,
    });
    const large = cellAnchor({
      cell: { x: 3, y: 4 },
      cellWidth: 64,
      cellHeight: 64,
      scale: 1,
      tileSize: 32,
    });

    // Tibia authors a one-sqm figure into the bottom-right tile of its cell and
    // reserves the rest for creatures that really are two tiles across, so both
    // cells must hang from the same corner for the figure to stand on its sqm.
    expect(large.x).toBe(small.x);
    expect(large.y).toBe(small.y);
    expect(large.originX).toBe(1);
    expect(large.originY).toBe(1);
    expect(large.width).toBe(64);
    expect(large.height).toBe(64);
  });

  it('measures the cell in tiles rather than in source pixels', () => {
    const anchor = cellAnchor({
      cell: { x: 1, y: 1 },
      cellWidth: 64,
      cellHeight: 32,
      scale: 1,
      tileSize: 16,
    });

    expect(anchor.width).toBe(32);
    expect(anchor.height).toBe(16);
    expect(anchor.x).toBe(32);
    expect(anchor.y).toBe(32);
  });

  it('honours the asset scale', () => {
    const anchor = cellAnchor({
      cell: { x: 0, y: 0 },
      cellWidth: 32,
      cellHeight: 32,
      scale: 2,
      tileSize: 32,
    });

    expect(anchor.width).toBe(64);
    expect(anchor.height).toBe(64);
  });

  it('follows a fractional cell while a step is in flight', () => {
    const anchor = cellAnchor({
      cell: { x: 2.5, y: 1.25 },
      cellWidth: 64,
      cellHeight: 64,
      scale: 1,
      tileSize: 32,
    });

    expect(anchor.x).toBe(112);
    expect(anchor.y).toBe(72);
  });
});
