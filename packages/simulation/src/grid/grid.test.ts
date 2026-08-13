import {
  type ActorState,
  createEntityId,
  type Direction,
  type GridPosition,
  type KernelScenario,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  createOccupancyIndex,
  createStaticGrid,
  DIRECTIONS,
  directionDelta,
  isDiagonal,
  resolveStep,
  stepCostTicks,
  translate,
} from './index.ts';

const scenario: KernelScenario = {
  schemaVersion: 1,
  scenarioId: 'grid-test',
  scenarioRevision: 1,
  width: 4,
  height: 3,
  z: 7,
  blockedTiles: [
    [1, 1],
    [2, 2],
  ],
  blueprints: [
    {
      blueprintId: 'walker',
      stepCooldownTicks: 2,
      behavior: 'inert',
    },
  ],
  initialActors: [],
};

function actor(
  entityId: number,
  position: GridPosition = { x: 1, y: 1, z: 7 },
): ActorState {
  return {
    entityId: createEntityId(entityId),
    blueprintId: 'walker',
    position,
    facing: 's',
    readyAtTick: 0,
  };
}

function gridWithBlockedTiles(
  blockedTiles: readonly (readonly [number, number])[],
) {
  return createStaticGrid({ ...scenario, blockedTiles });
}

describe('grid directions and movement costs', () => {
  it('exposes the canonical directions and their deltas', () => {
    expect(DIRECTIONS).toEqual(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);
    expect(
      DIRECTIONS.map((direction) => [direction, directionDelta(direction)]),
    ).toEqual([
      ['n', { dx: 0, dy: -1 }],
      ['ne', { dx: 1, dy: -1 }],
      ['e', { dx: 1, dy: 0 }],
      ['se', { dx: 1, dy: 1 }],
      ['s', { dx: 0, dy: 1 }],
      ['sw', { dx: -1, dy: 1 }],
      ['w', { dx: -1, dy: 0 }],
      ['nw', { dx: -1, dy: -1 }],
    ]);
  });

  it('identifies diagonal directions and translates without changing z', () => {
    const position = { x: 4, y: 5, z: 11 };

    expect(DIRECTIONS.map((direction) => isDiagonal(direction))).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(translate(position, 'nw')).toEqual({ x: 3, y: 4, z: 11 });
    expect(position).toEqual({ x: 4, y: 5, z: 11 });
  });

  it('calculates integer orthogonal and diagonal costs', () => {
    expect(
      DIRECTIONS.every((direction) => stepCostTicks(0, direction) === 0),
    ).toBe(true);
    expect(stepCostTicks(2, 'e')).toBe(2);
    expect(stepCostTicks(2, 'se')).toBe(3);
    expect(stepCostTicks(3, 'e')).toBe(3);
    expect(stepCostTicks(3, 'se')).toBe(5);
  });
});

describe('static grid and occupancy', () => {
  it('accepts only positions inside the declared dimensions and z level', () => {
    const grid = createStaticGrid(scenario);

    expect(grid.isInside({ x: 0, y: 0, z: 7 })).toBe(true);
    expect(grid.isInside({ x: -1, y: 0, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 0, y: -1, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 4, y: 0, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 0, y: 3, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 0, y: 0, z: 8 })).toBe(false);
  });

  it('reports only the scenario terrain as blocked', () => {
    const grid = createStaticGrid(scenario);

    expect(grid.isBlockedTerrain({ x: 1, y: 1, z: 7 })).toBe(true);
    expect(grid.isBlockedTerrain({ x: 0, y: 0, z: 7 })).toBe(false);
    expect(grid.isBlockedTerrain({ x: 1, y: 1, z: 8 })).toBe(false);
    expect(grid.isBlockedTerrain({ x: 4, y: 0, z: 7 })).toBe(false);
  });

  it('rebuilds the same occupancy index regardless of actor insertion order', () => {
    const firstActor = actor(1, { x: 0, y: 0, z: 7 });
    const secondActor = actor(2, { x: 2, y: 1, z: 7 });
    const firstIndex = createOccupancyIndex([firstActor, secondActor]);
    const secondIndex = createOccupancyIndex([secondActor, firstActor]);

    for (const position of [firstActor.position, secondActor.position]) {
      expect(firstIndex.occupantAt(position)).toBe(
        secondIndex.occupantAt(position),
      );
      expect(firstIndex.isOccupied(position)).toBe(true);
      expect(secondIndex.isOccupied(position)).toBe(true);
    }
    expect(firstIndex.occupantAt({ x: 3, y: 2, z: 7 })).toBeUndefined();
    expect(firstIndex.isOccupied({ x: 3, y: 2, z: 7 })).toBe(false);
  });
});

describe('resolveStep', () => {
  it('resolves a valid orthogonal step with its base cost', () => {
    const grid = gridWithBlockedTiles([]);
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const outcome = resolveStep(
      grid,
      createOccupancyIndex([movingActor]),
      movingActor,
      'e',
      2,
    );

    expect(outcome).toEqual({
      ok: true,
      to: { x: 2, y: 1, z: 7 },
      costTicks: 2,
    });
  });

  it('resolves a valid diagonal step when both corner cells are free', () => {
    const grid = gridWithBlockedTiles([]);
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });

    expect(
      resolveStep(
        grid,
        createOccupancyIndex([movingActor]),
        movingActor,
        'se',
        3,
      ),
    ).toEqual({
      ok: true,
      to: { x: 2, y: 2, z: 7 },
      costTicks: 5,
    });
  });

  it.each([
    ['bounds', gridWithBlockedTiles([]), { x: 0, y: 0, z: 7 }, 'nw'],
    ['terrain', gridWithBlockedTiles([[2, 1]]), { x: 1, y: 1, z: 7 }, 'e'],
    [
      'diagonal-corner',
      gridWithBlockedTiles([[2, 1]]),
      { x: 1, y: 1, z: 7 },
      'se',
    ],
  ] as const)(
    'returns %s for the corresponding blocked step',
    (reason, grid, position, direction) => {
      const movingActor = actor(1, position);
      const outcome = resolveStep(
        grid,
        createOccupancyIndex([movingActor]),
        movingActor,
        direction,
        2,
      );

      expect(outcome).toEqual({
        ok: false,
        reason,
        attempted: translate(position, direction),
      });
    },
  );

  it('returns diagonal-corner when both orthogonal corner cells have terrain', () => {
    const grid = gridWithBlockedTiles([
      [2, 1],
      [1, 2],
    ]);
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });

    expect(
      resolveStep(
        grid,
        createOccupancyIndex([movingActor]),
        movingActor,
        'se',
        2,
      ),
    ).toEqual({
      ok: false,
      reason: 'diagonal-corner',
      attempted: { x: 2, y: 2, z: 7 },
    });
  });

  it('allows an actor in a corner cell because only terrain blocks corner cutting', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const cornerActor = actor(2, { x: 2, y: 1, z: 7 });

    expect(
      resolveStep(
        gridWithBlockedTiles([]),
        createOccupancyIndex([movingActor, cornerActor]),
        movingActor,
        'se',
        2,
      ),
    ).toEqual({
      ok: true,
      to: { x: 2, y: 2, z: 7 },
      costTicks: 3,
    });
  });

  it('returns occupied when the destination contains another actor', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const destinationActor = actor(2, { x: 2, y: 1, z: 7 });

    expect(
      resolveStep(
        gridWithBlockedTiles([]),
        createOccupancyIndex([movingActor, destinationActor]),
        movingActor,
        'e',
        2,
      ),
    ).toEqual({
      ok: false,
      reason: 'occupied',
      attempted: { x: 2, y: 1, z: 7 },
    });
  });

  it('uses bounds before occupancy when the attempted destination is outside', () => {
    const movingActor = actor(1, { x: 0, y: 0, z: 7 });
    const outsideActor = actor(2, { x: -1, y: -1, z: 7 });

    expect(
      resolveStep(
        gridWithBlockedTiles([]),
        createOccupancyIndex([movingActor, outsideActor]),
        movingActor,
        'nw',
        2,
      ),
    ).toEqual({
      ok: false,
      reason: 'bounds',
      attempted: { x: -1, y: -1, z: 7 },
    });
  });

  it('uses terrain before occupancy when the destination has both blockers', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const destinationActor = actor(2, { x: 2, y: 1, z: 7 });

    expect(
      resolveStep(
        gridWithBlockedTiles([[2, 1]]),
        createOccupancyIndex([movingActor, destinationActor]),
        movingActor,
        'e',
        2,
      ),
    ).toEqual({
      ok: false,
      reason: 'terrain',
      attempted: { x: 2, y: 1, z: 7 },
    });
  });

  it('does not mutate the actor while resolving a step', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const before = {
      ...movingActor,
      position: { ...movingActor.position },
    };
    const grid = gridWithBlockedTiles([]);
    const occupancy = createOccupancyIndex([movingActor]);

    resolveStep(grid, occupancy, movingActor, 'e', 2);

    expect(movingActor).toEqual(before);
    expect(occupancy.occupantAt(movingActor.position)).toBe(
      movingActor.entityId,
    );
  });
});

describe('grid direction typing', () => {
  it('accepts every direction in the closed direction set', () => {
    const directions: Direction[] = [
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
      'nw',
    ];

    expect(directions).toEqual(DIRECTIONS);
  });
});
