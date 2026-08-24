import { describe, expect, it } from 'vitest';

import { borderize } from './index.ts';

const tables = {
  materials: [
    { key: 'floor', serverIds: [10], cases: [] },
    { key: 'mass', serverIds: [100], cases: [] },
    {
      key: 'border',
      serverIds: [200],
      cases: [{ count: 1, serverId: 200, signature: 0 }],
    },
  ],
  floorMaterialKeys: ['floor'],
  massMaterialKey: 'mass',
  borderMaterialKey: 'border',
  massDominantServerId: 100,
  massVariants: [{ serverId: 100, weight: 1 }],
} as const;

const weightedTables = {
  ...tables,
  materials: [
    tables.materials[0],
    { key: 'mass', serverIds: [100, 101], cases: [] },
    tables.materials[2],
  ],
  massVariants: [
    { serverId: 100, weight: 3 },
    { serverId: 101, weight: 1 },
  ],
} as const;

const northTables = {
  ...tables,
  materials: [
    { key: 'floor', serverIds: [10], cases: [] },
    { key: 'mass', serverIds: [100], cases: [] },
    {
      key: 'border',
      serverIds: [200],
      cases: [{ count: 1, serverId: 200, signature: 0 }],
    },
  ],
} as const;

const fallbackTables = {
  ...northTables,
  materials: [
    { key: 'floor', serverIds: [10], cases: [] },
    { key: 'mass', serverIds: [100], cases: [] },
    { key: 'border', serverIds: [200], cases: [] },
  ],
} as const;

describe('borderize', () => {
  it('fills an empty cell with the dominant mass', () => {
    const result = borderize(
      {
        layoutId: 'layout:test',
        cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
      },
      tables,
      'seed-a',
    );

    expect(result.cells[0]?.ground).toBe(100);
  });

  it('fills a null ground with mass', () => {
    const result = borderize(
      {
        layoutId: 'layout:test',
        cells: [{ x: 0, y: 0, z: 8, ground: null }],
      },
      tables,
      'seed-a',
    );

    expect(result.cells[0]?.ground).toBe(100);
  });

  it('preserves an existing floor', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: [{ x: 0, y: 0, z: 8, ground: 10 }],
    } as const;

    expect(borderize(grid, tables, 'seed-a')).toEqual(grid);
  });

  it('produces both weighted variations with the dominant one more frequent', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: Array.from({ length: 256 }, (_, index) => ({
        x: index % 16,
        y: Math.floor(index / 16),
        z: 8,
        ground: 0,
      })),
    } as const;

    const grounds = borderize(grid, weightedTables, 'seed-a').cells.map(
      (cell) => cell.ground,
    );
    const dominant = grounds.filter((ground) => ground === 100).length;
    const variant = grounds.filter((ground) => ground === 101).length;

    expect(dominant).toBeGreaterThan(variant);
    expect(variant).toBeGreaterThan(0);
  });

  it('is stable for the same coordinate and seed', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: [{ x: 3, y: 5, z: 8, ground: 0 }],
    } as const;

    expect(borderize(grid, weightedTables, 'seed-a')).toEqual(
      borderize(grid, weightedTables, 'seed-a'),
    );
  });

  it('uses the border table when a mass cell has floor to the north', () => {
    const result = borderize(
      {
        layoutId: 'layout:test',
        cells: [
          { x: 0, y: 0, z: 8, ground: 10 },
          { x: 0, y: 1, z: 8, ground: 100 },
        ],
      },
      northTables,
      'seed-a',
    );

    expect(result.cells.find((cell) => cell.y === 1)?.ground).toBe(200);
  });

  it('falls back to the dominant mass for an unobserved signature', () => {
    const result = borderize(
      {
        layoutId: 'layout:test',
        cells: [
          { x: 0, y: 0, z: 8, ground: 10 },
          { x: 0, y: 1, z: 8, ground: 100 },
        ],
      },
      fallbackTables,
      'seed-a',
    );

    expect(result.cells.find((cell) => cell.y === 1)?.ground).toBe(100);
  });

  it('does not depend on the input cell order', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: [
        { x: 0, y: 0, z: 8, ground: 10 },
        { x: 0, y: 1, z: 8, ground: 100 },
        { x: 2, y: 0, z: 8, ground: 0 },
      ],
    } as const;
    const shuffled = { ...grid, cells: [...grid.cells].reverse() } as const;

    expect(borderize(grid, northTables, 'seed-a')).toEqual(
      borderize(shuffled, northTables, 'seed-a'),
    );
  });

  it('does not mutate the input grid', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
    } as const;
    const before = JSON.stringify(grid);

    borderize(grid, tables, 'seed-a');

    expect(JSON.stringify(grid)).toBe(before);
  });

  it('rejects a missing floor material reference', () => {
    const invalidTables = {
      ...tables,
      floorMaterialKeys: ['missing'],
    } as const;

    expect(() =>
      borderize(
        {
          layoutId: 'layout:test',
          cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
        },
        invalidTables,
        'seed-a',
      ),
    ).toThrowError(
      new Error('floorMaterialKeys references missing material "missing".'),
    );
  });

  it.each([
    [0, 'massVariants weights must be positive safe integers.'],
    [1.5, 'massVariants weights must be positive safe integers.'],
  ])('rejects an invalid mass variant weight', (weight, message) => {
    const invalidTables = {
      ...tables,
      massVariants: [{ serverId: 100, weight }],
    } as const;

    expect(() =>
      borderize(
        {
          layoutId: 'layout:test',
          cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
        },
        invalidTables,
        'seed-a',
      ),
    ).toThrowError(new Error(message));
  });

  it('rejects a border signature outside the eight-bit range', () => {
    const invalidTables = {
      ...tables,
      materials: [
        tables.materials[0],
        tables.materials[1],
        {
          key: 'border',
          serverIds: [200],
          cases: [{ count: 1, serverId: 200, signature: 256 }],
        },
      ],
    } as const;

    expect(() =>
      borderize(
        {
          layoutId: 'layout:test',
          cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
        },
        invalidTables,
        'seed-a',
      ),
    ).toThrowError(
      new Error('border signature must be an integer from 0 to 255.'),
    );
  });

  it('rejects duplicate cell coordinates', () => {
    const grid = {
      layoutId: 'layout:test',
      cells: [
        { x: 0, y: 0, z: 8, ground: 0 },
        { x: 0, y: 0, z: 8, ground: 100 },
      ],
    } as const;

    expect(() => borderize(grid, tables, 'seed-a')).toThrowError(
      new Error('grid contains duplicate cell coordinates: 8:0:0.'),
    );
  });

  it('rejects a dominant mass outside the mass material', () => {
    const invalidTables = { ...tables, massDominantServerId: 999 } as const;

    expect(() =>
      borderize(
        {
          layoutId: 'layout:test',
          cells: [{ x: 0, y: 0, z: 8, ground: 0 }],
        },
        invalidTables,
        'seed-a',
      ),
    ).toThrowError(
      new Error('massDominantServerId must belong to the mass material.'),
    );
  });
});
