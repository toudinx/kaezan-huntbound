import { describe, expect, it } from 'vitest';

import type { MapRegion } from '../../packages/contracts/src/hunt/types.ts';
import { HUNT_SCHEMA_VERSION } from '../../packages/contracts/src/hunt/types.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import type { HuntLayoutRecipe } from './layout.ts';
import { buildSpawnTable } from './spawns.ts';

const WIDTH = 10;
const HEIGHT = 10;
const MIN_X = 1000;
const MIN_Y = 2000;

const region: MapRegion = {
  schemaVersion: HUNT_SCHEMA_VERSION,
  regionId: 'region:test' as MapRegion['regionId'],
  regionRevision: 1,
  origin: { x: MIN_X, y: MIN_Y },
  width: WIDTH,
  height: HEIGHT,
  palette: [1],
  floors: [7, 8].map((z) => ({
    z,
    ground: Array.from({ length: WIDTH * HEIGHT }, () => 0),
    objectsBelow: [],
    objectsAbove: [],
    collision: [],
  })),
};

const selection: HuntSelection = {
  key: 'hunt:tibia:test',
  displayName: 'Test',
  sourceUrl: 'https://example.invalid/test',
  source: {
    map: 'data-otservbr-global/world/otservbr.otbm',
    spawns: 'data-otservbr-global/world/otservbr-monster.xml',
  },
  layout: 'layouts/hunts/venore-rotworm-cave.json',
  recommendedLevel: 8,
  soloVocation: 'vocation:tibia:knight',
  band: 1,
  region: {
    minX: MIN_X,
    minY: MIN_Y,
    maxX: MIN_X + WIDTH - 1,
    maxY: MIN_Y + HEIGHT - 1,
    floors: [7, 8],
  },
  creatures: ['creature:tibia:rotworm'],
  excludedCreatures: [],
  expectedSpawnGroups: 0,
  expectedSpawnSlots: 0,
  expectedDroppedTransitions: 0,
  budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
};

interface SlotFixture {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly spawntime?: string;
}

interface GroupFixture {
  readonly centerX: number;
  readonly centerY: number;
  readonly centerZ: number;
  readonly radius: number;
  readonly slots: readonly SlotFixture[];
}

function monsterXml(groups: readonly GroupFixture[]): string {
  const body = groups
    .map((group) => {
      const slots = group.slots
        .map(
          (slot) =>
            `<monster name="${slot.name}" x="${slot.x}" y="${slot.y}" z="${slot.z}" spawntime="${slot.spawntime ?? '90'}" />`,
        )
        .join('');
      return `<monster centerx="${group.centerX}" centery="${group.centerY}" centerz="${group.centerZ}" radius="${group.radius}">${slots}</monster>`;
    })
    .join('');
  return `<?xml version="1.0"?><monsters>${body}</monsters>`;
}

describe('buildSpawnTable', () => {
  it('remaps selected XML slots through a Huntbound layout recipe', () => {
    const layout: HuntLayoutRecipe = {
      schemaVersion: 1,
      layoutId: 'layout:huntbound:test',
      width: WIDTH,
      height: HEIGHT,
      floors: [7, 8].map((z) => ({ z, operations: [] })),
      cells: [],
      playerStart: { x: 0, y: 0, z: 7 },
      transitions: [],
      spawnPlacements: [
        {
          source: { x: MIN_X + 5, y: MIN_Y + 3, z: 8 },
          target: { x: 1, y: 2, z: 8 },
        },
      ],
    };
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X + 4,
          centerY: MIN_Y + 5,
          centerZ: 8,
          radius: 3,
          slots: [{ name: 'Rotworm', x: 1, y: -2, z: 8 }],
        },
      ]),
      selection,
      region,
      layout,
    );

    expect(built.table.groups[0]).toMatchObject({
      center: { x: 1, y: 2, z: 8 },
      slots: [
        {
          offsetX: 0,
          offsetY: 0,
          offsetZ: 0,
          source: { x: MIN_X + 5, y: MIN_Y + 3, z: 8 },
        },
      ],
      sourceCenter: { x: MIN_X + 4, y: MIN_Y + 5, z: 8 },
    });
    expect(built.diagnostics).toEqual([]);
  });

  it('turns a group inside the box into a definition with a local center', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X + 4,
          centerY: MIN_Y + 5,
          centerZ: 8,
          radius: 3,
          slots: [{ name: 'Rotworm', x: 1, y: -2, z: 8 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups).toEqual([
      {
        center: { x: 4, y: 5, z: 8 },
        radius: 3,
        slots: [
          {
            creatureKey: 'creature:tibia:rotworm',
            blueprintId: 'rotworm',
            offsetX: 1,
            offsetY: -2,
            offsetZ: 0,
            respawnTicks: 1800,
            source: { x: MIN_X + 5, y: MIN_Y + 3, z: 8 },
          },
        ],
        sourceCenter: { x: MIN_X + 4, y: MIN_Y + 5, z: 8 },
      },
    ]);
    expect(built.diagnostics).toEqual([]);
  });

  it('drops a slot whose offset lands outside the region', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X + 1,
          centerY: MIN_Y + 1,
          centerZ: 8,
          radius: 3,
          slots: [
            { name: 'Rotworm', x: -3, y: 0, z: 8 },
            { name: 'Rotworm', x: 1, y: 1, z: 8 },
          ],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups[0]?.slots).toHaveLength(1);
    expect(built.diagnostics).toEqual([
      {
        path: 'spawns.groups[0].slots[0]',
        code: 'HUNT_SPAWN_OUT_OF_REGION',
        message: 'Rotworm at (998, 2001, 8) falls outside the extracted region',
      },
    ]);
  });

  it('converts a 90 second spawntime into 1800 ticks', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 0, y: 0, z: 8, spawntime: '90' }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups[0]?.slots[0]?.respawnTicks).toBe(1800);
  });

  it('rejects a spawntime that does not divide into whole ticks', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 0, y: 0, z: 8, spawntime: '0.03' }],
        },
      ]),
      selection,
      region,
    );

    expect(built.diagnostics.map((item) => [item.path, item.code])).toEqual([
      ['spawns.groups[0].slots[0]', 'HUNT_SPAWNTIME_NOT_DIVISIBLE'],
    ]);
    expect(built.table.groups).toEqual([]);
  });

  it('omits an excluded creature without a diagnostic', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [
            { name: 'Snake', x: 0, y: 0, z: 8 },
            { name: 'Rotworm', x: 1, y: 0, z: 8 },
          ],
        },
      ]),
      {
        ...selection,
        excludedCreatures: [
          { name: 'Snake', reason: 'absent from PB-01 catalog', count: 1 },
        ],
      },
      region,
    );

    expect(built.table.groups[0]?.slots).toHaveLength(1);
    expect(built.diagnostics).toEqual([]);
  });

  it('reports a creature that is neither selected nor excluded', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Dragon', x: 0, y: 0, z: 8 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.diagnostics).toEqual([
      {
        path: 'spawns.groups[0].slots[0]',
        code: 'HUNT_UNKNOWN_CREATURE',
        message: 'Dragon is not included in the PB-01 catalog selection',
      },
    ]);
  });

  it('orders groups canonically by center z, then y, then x', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X + 5,
          centerY: MIN_Y + 1,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 0, y: 0, z: 8 }],
        },
        {
          centerX: MIN_X + 2,
          centerY: MIN_Y + 3,
          centerZ: 7,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 0, y: 0, z: 7 }],
        },
        {
          centerX: MIN_X + 1,
          centerY: MIN_Y + 1,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 0, y: 0, z: 8 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups.map((group) => group.center)).toEqual([
      { x: 2, y: 3, z: 7 },
      { x: 1, y: 1, z: 8 },
      { x: 5, y: 1, z: 8 },
    ]);
  });

  it('skips a group whose center and selected slots are outside the region', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X - 5,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 4, y: 0, z: 8 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups).toEqual([]);
    expect(built.diagnostics).toEqual([]);
  });

  it('keeps a group whose selected slot is inside when its center is outside', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X - 1,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 1, y: 0, z: 8 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups).toMatchObject([
      {
        center: { x: -1, y: 0, z: 8 },
        sourceCenter: { x: MIN_X - 1, y: MIN_Y, z: 8 },
        slots: [
          {
            offsetX: 1,
            offsetY: 0,
            offsetZ: 0,
            source: { x: MIN_X, y: MIN_Y, z: 8 },
          },
        ],
      },
    ]);
    expect(built.diagnostics).toEqual([]);
  });

  it('skips a group whose floor was not extracted', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 6,
          radius: 2,
          slots: [{ name: 'Rotworm', x: 0, y: 0, z: 6 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups).toEqual([]);
  });

  it('records the creature keys the spawn table needs a blueprint for', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots: [
            { name: 'Rotworm', x: 0, y: 0, z: 8 },
            { name: 'Rotworm', x: 1, y: 0, z: 8 },
          ],
        },
      ]),
      selection,
      region,
    );

    expect(built.creatureKeys).toEqual(['creature:tibia:rotworm']);
  });

  it('caps maxLiveActors at the frozen ceiling of 64', () => {
    const slots = Array.from({ length: 70 }, (_value, index) => ({
      name: 'Rotworm',
      x: index % 9,
      y: Math.floor(index / 9) % 9,
      z: 8,
    }));
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X,
          centerY: MIN_Y,
          centerZ: 8,
          radius: 2,
          slots,
        },
      ]),
      selection,
      region,
    );

    expect(built.table.maxLiveActors).toBe(64);
  });

  it('keeps a slot offset relative to its own group center', () => {
    const built = buildSpawnTable(
      monsterXml([
        {
          centerX: MIN_X + 4,
          centerY: MIN_Y + 4,
          centerZ: 8,
          radius: 3,
          slots: [{ name: 'Rotworm', x: -2, y: 3, z: 7 }],
        },
      ]),
      selection,
      region,
    );

    expect(built.table.groups[0]?.slots[0]).toMatchObject({
      offsetX: -2,
      offsetY: 3,
      offsetZ: -1,
    });
  });
});
