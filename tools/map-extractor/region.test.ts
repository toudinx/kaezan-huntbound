import { describe, expect, it } from 'vitest';

import { validateMapRegion } from '../../packages/contracts/src/hunt/diagnostics.ts';
import type { OtbmTile } from './otbm.ts';
import { buildMapRegion, indexTileFlags, VOID_SERVER_ID } from './region.ts';
import { tileFlags, tileFlagsTable } from './testing/tileFlagsFixture.ts';

const GRASS = 100;
const WALL = 200;
const CRATE = 300;
const ROOF = 400;
const BLOCKING_GROUND = 500;

const flags = indexTileFlags(
  tileFlagsTable([
    tileFlags(GRASS, { ground: true }),
    tileFlags(WALL, { blocking: true }),
    tileFlags(CRATE),
    tileFlags(ROOF, { top: true }),
    tileFlags(BLOCKING_GROUND, { ground: true, blocking: true }),
  ]),
);

const region = { minX: 10, minY: 20, maxX: 12, maxY: 21, floors: [7] };
const identity = { regionId: 'region:test', regionRevision: 1 };

function build(tiles: readonly OtbmTile[]) {
  return buildMapRegion(tiles, region, flags, identity);
}

/** Local row-major index of an absolute coordinate. */
function cell(x: number, y: number) {
  return (y - region.minY) * 3 + (x - region.minX);
}

describe('buildMapRegion', () => {
  it('puts the ground item on the ground layer', () => {
    const built = build([{ x: 10, y: 20, z: 7, items: [GRASS] }]);
    const floor = built.region.floors[0];

    expect(built.region.palette).toContain(GRASS);
    expect(floor?.ground[cell(10, 20)]).toBe(
      built.region.palette.indexOf(GRASS),
    );
  });

  it('puts a top item on objectsAbove', () => {
    const built = build([{ x: 10, y: 20, z: 7, items: [GRASS, ROOF] }]);
    const floor = built.region.floors[0];

    expect(floor?.objectsAbove).toEqual([
      { i: cell(10, 20), stack: [built.region.palette.indexOf(ROOF)] },
    ]);
    expect(floor?.objectsBelow).toEqual([]);
  });

  it('puts the remaining items on objectsBelow in stacking order', () => {
    const built = build([
      { x: 10, y: 20, z: 7, items: [GRASS, CRATE, WALL, ROOF] },
    ]);
    const floor = built.region.floors[0];
    const index = (serverId: number) => built.region.palette.indexOf(serverId);

    expect(floor?.objectsBelow).toEqual([
      { i: cell(10, 20), stack: [index(CRATE), index(WALL)] },
    ]);
    expect(floor?.objectsAbove).toEqual([
      { i: cell(10, 20), stack: [index(ROOF)] },
    ]);
  });

  it('marks the cell as collision when any item blocks', () => {
    const built = build([{ x: 11, y: 20, z: 7, items: [GRASS, WALL] }]);

    expect(built.region.floors[0]?.collision).toContain(cell(11, 20));
  });

  it('marks the cell as collision when the ground itself blocks', () => {
    const built = build([{ x: 11, y: 20, z: 7, items: [BLOCKING_GROUND] }]);

    expect(built.region.floors[0]?.collision).toContain(cell(11, 20));
  });

  it('does not mark a walkable cell as collision', () => {
    const built = build([{ x: 11, y: 20, z: 7, items: [GRASS, CRATE] }]);

    expect(built.region.floors[0]?.collision).not.toContain(cell(11, 20));
  });

  it('treats a tile without ground as void: collision, no object, no palette entry', () => {
    const built = build([
      { x: 10, y: 20, z: 7, items: [GRASS] },
      { x: 11, y: 20, z: 7, items: [CRATE, ROOF] },
    ]);
    const floor = built.region.floors[0];

    expect(built.region.palette).not.toContain(CRATE);
    expect(built.region.palette).not.toContain(ROOF);
    expect(floor?.collision).toContain(cell(11, 20));
    expect(floor?.objectsBelow.map((entry) => entry.i)).not.toContain(
      cell(11, 20),
    );
    expect(floor?.objectsAbove.map((entry) => entry.i)).not.toContain(
      cell(11, 20),
    );
    expect(floor?.ground[cell(11, 20)]).toBe(
      built.region.palette.indexOf(VOID_SERVER_ID),
    );
  });

  it('reports every void cell with HUNT_EMPTY_TILE', () => {
    const built = build([{ x: 10, y: 20, z: 7, items: [GRASS] }]);

    // Six cells in the 3x2 region, one of them has ground.
    expect(
      built.diagnostics.filter((item) => item.code === 'HUNT_EMPTY_TILE'),
    ).toHaveLength(5);
  });

  it('emits a sorted palette without duplicates that the layers index into', () => {
    const built = build([
      { x: 12, y: 21, z: 7, items: [GRASS, ROOF] },
      { x: 10, y: 20, z: 7, items: [GRASS, CRATE] },
    ]);

    expect([...built.region.palette]).toEqual([
      VOID_SERVER_ID,
      GRASS,
      CRATE,
      ROOF,
    ]);
    expect(built.region.floors[0]?.ground[cell(12, 21)]).toBe(1);
  });

  it('keeps sparse layers strictly ordered by cell index', () => {
    const built = build([
      { x: 12, y: 20, z: 7, items: [GRASS, CRATE] },
      { x: 10, y: 21, z: 7, items: [GRASS, CRATE] },
      { x: 10, y: 20, z: 7, items: [GRASS, CRATE] },
    ]);

    expect(
      built.region.floors[0]?.objectsBelow.map((entry) => entry.i),
    ).toEqual([cell(10, 20), cell(12, 20), cell(10, 21)]);
  });

  it('reports a server id that the tile flags table does not cover', () => {
    const built = build([{ x: 10, y: 20, z: 7, items: [GRASS, 999] }]);

    expect(
      built.diagnostics.filter((item) => item.code === 'HUNT_ID_MISMATCH'),
    ).toEqual([
      {
        path: 'region.floors[7].cells[0].items[1]',
        code: 'HUNT_ID_MISMATCH',
        message: 'serverId 999 is absent from the tile flags table',
      },
    ]);
    expect(built.region.palette).not.toContain(999);
  });

  it('emits one floor per extracted z, ordered by z', () => {
    const built = buildMapRegion(
      [
        { x: 10, y: 20, z: 8, items: [GRASS] },
        { x: 10, y: 20, z: 7, items: [GRASS] },
      ],
      { ...region, floors: [7, 8] },
      flags,
      identity,
    );

    expect(built.region.floors.map((floor) => floor.z)).toEqual([7, 8]);
  });

  it('produces a region that satisfies the frozen contract', () => {
    const built = build([
      { x: 10, y: 20, z: 7, items: [GRASS, CRATE, ROOF] },
      { x: 11, y: 21, z: 7, items: [BLOCKING_GROUND] },
    ]);

    const result = validateMapRegion(built.region);
    expect(result.ok ? [] : result.diagnostics).toEqual([]);
  });

  it('collects the floor change values of every item on a tile', () => {
    const stairs = 600;
    const withStairs = indexTileFlags(
      tileFlagsTable([
        tileFlags(GRASS, { ground: true }),
        tileFlags(stairs, { floorChange: 'down' }),
      ]),
    );
    const built = buildMapRegion(
      [{ x: 11, y: 20, z: 7, items: [GRASS, stairs] }],
      region,
      withStairs,
      identity,
    );

    expect(built.floorChanges.get(7)?.get(cell(11, 20))).toEqual(
      new Set(['down']),
    );
  });
});
