import { describe, expect, it } from 'vitest';

import type {
  HuntDefinition,
  HuntId,
  RegionId,
} from '../../packages/contracts/src/hunt/types.ts';
import { analyzeBoxDensity } from './boxDensity.ts';

const WIDTH = 9;
const HEIGHT = 9;

function buildHunt(options: {
  readonly blocked?: readonly (readonly [number, number])[];
  readonly slots?: readonly (readonly [number, number])[];
}): HuntDefinition {
  const blocked = options.blocked ?? [];
  const slots = options.slots ?? [];
  return {
    schemaVersion: 1,
    huntId: 'hunt:tibia:fixture' as HuntId,
    huntRevision: 1,
    region: {
      schemaVersion: 1,
      regionId: 'region:tibia:fixture' as RegionId,
      regionRevision: 1,
      origin: { x: 0, y: 0 },
      width: WIDTH,
      height: HEIGHT,
      palette: [0],
      floors: [
        {
          z: 7,
          ground: Array.from({ length: WIDTH * HEIGHT }, () => 0),
          objectsBelow: [],
          objectsAbove: [],
          collision: blocked.map(([x, y]) => y * WIDTH + x),
        },
      ],
    },
    transitions: { entries: [], dropped: 0 },
    spawns: {
      groups: slots.map(([x, y]) => ({
        center: { x, y, z: 7 },
        radius: 0,
        slots: [
          {
            creatureKey: 'creature:tibia:rotworm',
            blueprintId: 'rotworm',
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            respawnTicks: 1800,
          },
        ],
      })),
      maxLiveActors: slots.length,
    },
    blueprints: [],
    playerStart: { x: 0, y: 0, z: 7 },
    playerBlueprintId: 'player',
  };
}

describe('analyzeBoxDensity', () => {
  it('counts every slot a tile can see inside aggro range', () => {
    const report = analyzeBoxDensity(
      buildHunt({
        slots: [
          [3, 4],
          [5, 4],
          [4, 3],
          [4, 5],
        ],
      }),
      11,
    );

    expect(report.best?.pullableSlots).toBe(4);
  });

  it('does not count a slot beyond aggro range', () => {
    const far = analyzeBoxDensity(
      buildHunt({
        slots: [
          [0, 0],
          [8, 8],
        ],
      }),
      3,
    );

    // No tile is within 3 of both corners of a 9x9 floor.
    expect(far.best?.pullableSlots).toBe(1);
  });

  it('does not count a slot behind a wall', () => {
    const wall = Array.from({ length: HEIGHT }, (_, y) => [4, y] as const);
    const report = analyzeBoxDensity(
      buildHunt({
        blocked: wall,
        slots: [
          [1, 4],
          [7, 4],
        ],
      }),
      11,
    );

    // The wall splits the floor, so no tile sees both slots.
    expect(report.best?.pullableSlots).toBe(1);
  });

  it('reports how many tiles reach at least n slots', () => {
    const report = analyzeBoxDensity(buildHunt({ slots: [[4, 4]] }), 11);

    // Every walkable tile is within 11 of the single slot.
    expect(report.tilesByPull[0]).toBe(WIDTH * HEIGHT);
    expect(report.tilesByPull[1]).toBe(WIDTH * HEIGHT);
    expect(report.tilesByPull[2]).toBeUndefined();
  });

  it('reports no spot when the map has no spawn slot', () => {
    const report = analyzeBoxDensity(buildHunt({}), 11);

    expect(report.best?.pullableSlots).toBe(0);
  });
});
