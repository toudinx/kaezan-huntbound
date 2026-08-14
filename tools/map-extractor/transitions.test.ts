import { describe, expect, it } from 'vitest';

import type { MapRegion } from '../../packages/contracts/src/hunt/types.ts';
import { HUNT_SCHEMA_VERSION } from '../../packages/contracts/src/hunt/types.ts';
import type { FloorChange } from '../tile-flags/types.ts';
import type { FloorChangeCells } from './region.ts';
import { buildTransitionTable } from './transitions.ts';

const WIDTH = 5;
const HEIGHT = 5;

interface RegionOptions {
  readonly floors?: readonly number[];
  readonly collision?: readonly { readonly z: number; readonly i: number }[];
}

function region(options: RegionOptions = {}): MapRegion {
  const floors = options.floors ?? [7, 8];
  return {
    schemaVersion: HUNT_SCHEMA_VERSION,
    regionId: 'region:test' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: WIDTH,
    height: HEIGHT,
    palette: [1],
    floors: floors.map((z) => ({
      z,
      ground: Array.from({ length: WIDTH * HEIGHT }, () => 0),
      objectsBelow: [],
      objectsAbove: [],
      collision: (options.collision ?? [])
        .filter((entry) => entry.z === z)
        .map((entry) => entry.i)
        .sort((left, right) => left - right),
    })),
  };
}

function cell(x: number, y: number) {
  return y * WIDTH + x;
}

function changes(
  entries: readonly {
    readonly z: number;
    readonly x: number;
    readonly y: number;
    readonly values: readonly FloorChange[];
  }[],
): FloorChangeCells {
  const byFloor = new Map<number, Map<number, ReadonlySet<FloorChange>>>();
  for (const entry of entries) {
    const floor = byFloor.get(entry.z) ?? new Map();
    floor.set(cell(entry.x, entry.y), new Set(entry.values));
    byFloor.set(entry.z, floor);
  }
  return byFloor;
}

describe('buildTransitionTable', () => {
  it('sends down to the same column one floor below', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 7, x: 2, y: 2, values: ['down'] }]),
    );

    expect(built.table.entries).toEqual([
      { from: { x: 2, y: 2, z: 7 }, to: { x: 2, y: 2, z: 8 } },
    ]);
    expect(built.table.dropped).toBe(0);
  });

  it('sends north one tile north and one floor up', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 2, y: 2, values: ['north'] }]),
    );

    expect(built.table.entries).toEqual([
      { from: { x: 2, y: 2, z: 8 }, to: { x: 2, y: 1, z: 7 } },
    ]);
  });

  it('sends south one tile south and one floor up', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 2, y: 2, values: ['south'] }]),
    );

    expect(built.table.entries[0]?.to).toEqual({ x: 2, y: 3, z: 7 });
  });

  it('sends east one tile east and one floor up', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 2, y: 2, values: ['east'] }]),
    );

    expect(built.table.entries[0]?.to).toEqual({ x: 3, y: 2, z: 7 });
  });

  it('sends west one tile west and one floor up', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 2, y: 2, values: ['west'] }]),
    );

    expect(built.table.entries[0]?.to).toEqual({ x: 1, y: 2, z: 7 });
  });

  it('sends southalt two tiles south and one floor up', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 2, y: 1, values: ['southalt'] }]),
    );

    expect(built.table.entries[0]?.to).toEqual({ x: 2, y: 3, z: 7 });
  });

  it('sends eastalt two tiles east and one floor up', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 1, y: 2, values: ['eastalt'] }]),
    );

    expect(built.table.entries[0]?.to).toEqual({ x: 3, y: 2, z: 7 });
  });

  it('lets down win over the upward values on the same cell', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 7, x: 2, y: 2, values: ['down', 'north'] }]),
    );

    expect(built.table.entries[0]?.to).toEqual({ x: 2, y: 2, z: 8 });
  });

  it('drops a destination outside the region', () => {
    const built = buildTransitionTable(
      region(),
      changes([{ z: 8, x: 0, y: 2, values: ['west'] }]),
    );

    expect(built.table.entries).toEqual([]);
    expect(built.table.dropped).toBe(1);
    expect(built.diagnostics).toEqual([
      {
        path: 'transitions.from[8,2,0]',
        code: 'HUNT_TRANSITION_DROPPED',
        message: 'Destination (-1, 2, 7) falls outside the extracted region',
      },
    ]);
  });

  it('drops a destination on a collision tile', () => {
    const built = buildTransitionTable(
      region({ collision: [{ z: 7, i: cell(2, 1) }] }),
      changes([{ z: 8, x: 2, y: 2, values: ['north'] }]),
    );

    expect(built.table.entries).toEqual([]);
    expect(built.table.dropped).toBe(1);
    expect(built.diagnostics[0]).toEqual({
      path: 'transitions.from[8,2,2]',
      code: 'HUNT_TRANSITION_DROPPED',
      message: 'Destination (2, 1, 7) is a collision tile',
    });
  });

  it('drops a destination on a floor that was not extracted', () => {
    const built = buildTransitionTable(
      region({ floors: [8] }),
      changes([{ z: 8, x: 2, y: 2, values: ['north'] }]),
    );

    expect(built.table.entries).toEqual([]);
    expect(built.table.dropped).toBe(1);
    expect(built.diagnostics[0]).toEqual({
      path: 'transitions.from[8,2,2]',
      code: 'HUNT_TRANSITION_DROPPED',
      message: 'Destination (2, 1, 7) is on a floor that was not extracted',
    });
  });

  it('never emits two entries sharing the same origin', () => {
    const built = buildTransitionTable(
      region(),
      changes([
        { z: 7, x: 2, y: 2, values: ['down'] },
        { z: 8, x: 2, y: 2, values: ['north', 'east'] },
      ]),
    );

    const origins = built.table.entries.map(
      (entry) => `${entry.from.z}:${entry.from.y}:${entry.from.x}`,
    );
    expect(new Set(origins).size).toBe(origins.length);
    expect(built.table.entries).toHaveLength(2);
  });

  it('orders entries by origin z, then y, then x', () => {
    const built = buildTransitionTable(
      region(),
      changes([
        { z: 8, x: 3, y: 1, values: ['north'] },
        { z: 7, x: 1, y: 3, values: ['down'] },
        { z: 8, x: 1, y: 1, values: ['north'] },
        { z: 7, x: 4, y: 0, values: ['down'] },
      ]),
    );

    expect(built.table.entries.map((entry) => entry.from)).toEqual([
      { x: 4, y: 0, z: 7 },
      { x: 1, y: 3, z: 7 },
      { x: 1, y: 1, z: 8 },
      { x: 3, y: 1, z: 8 },
    ]);
  });
});
