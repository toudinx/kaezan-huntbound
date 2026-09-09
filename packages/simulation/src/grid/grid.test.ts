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
  inFacingCone,
  isDiagonal,
  resolveStep,
  stepCostTicks,
  translate,
} from './index.ts';

const scenario: KernelScenario = {
  schemaVersion: 5,
  scenarioId: 'grid-test',
  scenarioRevision: 1,
  width: 4,
  height: 3,
  floors: [
    {
      z: 7,
      blockedTiles: [
        [1, 1],
        [2, 2],
      ],
    },
    { z: 8, blockedTiles: [[0, 0]] },
  ],
  transitions: [],
  spawnGroups: [],
  maxLiveActors: 8,
  abilities: [],
  lootTables: [],
  conditions: [],
  blueprints: [
    {
      blueprintId: 'walker',
      stepCooldownTicks: 2,
      behavior: 'inert',
      factionId: 0,
      maxHealth: 1,
      maxResource: 0,
      healthRegenTicks: 0,
      healthRegenAmount: 0,
      resourceRegenTicks: 0,
      resourceRegenAmount: 0,
      attackCooldownTicks: 0,
      attackMinDamage: 0,
      attackMaxDamage: 0,
      attackRangeTiles: 1,
      aggroRadius: 0,
      lootTableIndex: null,
      abilityIndices: [],
      outOfCombatHealthRegenTicks: 0,
      outOfCombatHealthRegenAmount: 0,
      outOfCombatResourceRegenTicks: 0,
      outOfCombatResourceRegenAmount: 0,
      combatWindowTicks: 0,
      lifeLeechPermille: 0,
      manaLeechPermille: 0,
      attackElement: 'physical',
      armor: 0,
      resistances: [],
      immunities: [],
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
    transitionGuard: null,
    health: 1,
    resource: 0,
    targetEntityId: null,
    attackReadyAtTick: 0,
    groupCooldowns: [],
    abilityCooldowns: [],
    nextHealthRegenTick: 0,
    nextResourceRegenTick: 0,
    lastDamageReceivedTick: 0,
    activeConditions: [],
    abilityCharges: [],
    forcedTargetEntityId: null,
    forcedTargetExpiresAtTick: 0,
  };
}

function gridWithBlockedTiles(
  blockedTiles: readonly (readonly [number, number])[],
) {
  return createStaticGrid({
    ...scenario,
    floors: [
      { z: 7, blockedTiles },
      { z: 8, blockedTiles: [] },
    ],
  });
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

  it('keeps a 90-degree Chebyshev cone in front of the facing', () => {
    const from = { x: 3, y: 3, z: 7 };
    expect(inFacingCone(from, { x: 5, y: 3, z: 7 }, 'e', 3)).toBe(true);
    expect(inFacingCone(from, { x: 5, y: 4, z: 7 }, 'e', 3)).toBe(true);
    expect(inFacingCone(from, { x: 1, y: 3, z: 7 }, 'e', 3)).toBe(false);
    expect(inFacingCone(from, from, 'e', 3)).toBe(false);
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
  it('reports exactly the declared floors', () => {
    const grid = createStaticGrid(scenario);

    expect(grid.floors).toEqual([7, 8]);
    expect(grid.hasFloor(7)).toBe(true);
    expect(grid.hasFloor(8)).toBe(true);
    expect(grid.hasFloor(6)).toBe(false);
    expect(grid.hasFloor(9)).toBe(false);
  });

  it('accepts only positions inside the declared dimensions and a declared floor', () => {
    const grid = createStaticGrid(scenario);

    expect(grid.isInside({ x: 0, y: 0, z: 7 })).toBe(true);
    expect(grid.isInside({ x: 0, y: 0, z: 8 })).toBe(true);
    expect(grid.isInside({ x: -1, y: 0, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 0, y: -1, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 4, y: 0, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 0, y: 3, z: 7 })).toBe(false);
    expect(grid.isInside({ x: 0, y: 0, z: 9 })).toBe(false);
  });

  it('keeps terrain per floor, so one column can be free above and solid below', () => {
    const grid = createStaticGrid(scenario);

    expect(grid.isBlockedTerrain({ x: 1, y: 1, z: 7 })).toBe(true);
    expect(grid.isBlockedTerrain({ x: 1, y: 1, z: 8 })).toBe(false);
    expect(grid.isBlockedTerrain({ x: 0, y: 0, z: 8 })).toBe(true);
    expect(grid.isBlockedTerrain({ x: 0, y: 0, z: 7 })).toBe(false);
    expect(grid.isBlockedTerrain({ x: 1, y: 1, z: 9 })).toBe(false);
    expect(grid.isBlockedTerrain({ x: 4, y: 0, z: 7 })).toBe(false);
  });

  it('resolves a transition only for the cell that declares it', () => {
    const grid = createStaticGrid({
      ...scenario,
      transitions: [{ from: { x: 2, y: 0, z: 7 }, to: { x: 2, y: 0, z: 8 } }],
    });

    expect(grid.transitionAt({ x: 2, y: 0, z: 7 })).toEqual({
      x: 2,
      y: 0,
      z: 8,
    });
    expect(grid.transitionAt({ x: 2, y: 0, z: 8 })).toBeUndefined();
    expect(grid.transitionAt({ x: 1, y: 0, z: 7 })).toBeUndefined();
  });

  it('keys occupancy by floor, so two actors can share an (x, y) column', () => {
    // The PB-03 index keyed on `(x, y)` alone. With floors that key collides:
    // an actor on `z = 8` would block the same column on `z = 7`.
    const upstairs = actor(1, { x: 2, y: 1, z: 7 });
    const downstairs = actor(2, { x: 2, y: 1, z: 8 });
    const index = createOccupancyIndex([upstairs, downstairs]);

    expect(index.occupantAt({ x: 2, y: 1, z: 7 })).toBe(upstairs.entityId);
    expect(index.occupantAt({ x: 2, y: 1, z: 8 })).toBe(downstairs.entityId);
    expect(index.isOccupied({ x: 2, y: 1, z: 9 })).toBe(false);
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

  it('ignores an actor standing on the same column of another floor', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const belowActor = actor(2, { x: 2, y: 1, z: 8 });

    expect(
      resolveStep(
        gridWithBlockedTiles([]),
        createOccupancyIndex([movingActor, belowActor]),
        movingActor,
        'e',
        2,
      ),
    ).toEqual({ ok: true, to: { x: 2, y: 1, z: 7 }, costTicks: 2 });
  });

  it('cuts corners against the origin floor, not the floor below', () => {
    // `(2,1)` and `(1,2)` are solid on `z = 8` only, so a diagonal on `z = 7`
    // must ignore them entirely.
    const grid = createStaticGrid({
      ...scenario,
      floors: [
        { z: 7, blockedTiles: [] },
        {
          z: 8,
          blockedTiles: [
            [2, 1],
            [1, 2],
          ],
        },
      ],
    });
    const upstairs = actor(1, { x: 1, y: 1, z: 7 });
    const downstairs = actor(2, { x: 1, y: 1, z: 8 });

    expect(
      resolveStep(grid, createOccupancyIndex([upstairs]), upstairs, 'se', 2),
    ).toEqual({ ok: true, to: { x: 2, y: 2, z: 7 }, costTicks: 3 });
    expect(
      resolveStep(
        grid,
        createOccupancyIndex([downstairs]),
        downstairs,
        'se',
        2,
      ),
    ).toEqual({
      ok: false,
      reason: 'diagonal-corner',
      attempted: { x: 2, y: 2, z: 8 },
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

describe('resolveStep across a transition', () => {
  const stairs = createStaticGrid({
    ...scenario,
    floors: [
      { z: 7, blockedTiles: [] },
      { z: 8, blockedTiles: [] },
    ],
    transitions: [{ from: { x: 2, y: 1, z: 7 }, to: { x: 2, y: 1, z: 8 } }],
  });

  it('carries the arrival cell in transitionedTo when the step lands on a transition', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });

    expect(
      resolveStep(
        stairs,
        createOccupancyIndex([movingActor]),
        movingActor,
        'e',
        2,
      ),
    ).toEqual({
      ok: true,
      to: { x: 2, y: 1, z: 7 },
      costTicks: 2,
      transitionedTo: { x: 2, y: 1, z: 8 },
    });
  });

  it('leaves transitionedTo absent for an ordinary step', () => {
    const movingActor = actor(1, { x: 0, y: 1, z: 7 });

    expect(
      resolveStep(
        stairs,
        createOccupancyIndex([movingActor]),
        movingActor,
        'e',
        2,
      ),
    ).toEqual({ ok: true, to: { x: 1, y: 1, z: 7 }, costTicks: 2 });
  });

  it('ignores the transition entirely while the actor is guarded', () => {
    const guarded: ActorState = {
      ...actor(1, { x: 1, y: 1, z: 7 }),
      transitionGuard: { x: 1, y: 1, z: 7 },
    };

    expect(
      resolveStep(stairs, createOccupancyIndex([guarded]), guarded, 'e', 2),
    ).toEqual({ ok: true, to: { x: 2, y: 1, z: 7 }, costTicks: 2 });
  });

  it('does not block a guarded step even when the landing cell is taken', () => {
    const guarded: ActorState = {
      ...actor(1, { x: 1, y: 1, z: 7 }),
      transitionGuard: { x: 1, y: 1, z: 7 },
    };
    const landingActor = actor(2, { x: 2, y: 1, z: 8 });

    expect(
      resolveStep(
        stairs,
        createOccupancyIndex([guarded, landingActor]),
        guarded,
        'e',
        2,
      ),
    ).toEqual({ ok: true, to: { x: 2, y: 1, z: 7 }, costTicks: 2 });
  });

  it('blocks the whole step when the transition target is occupied', () => {
    const movingActor = actor(1, { x: 1, y: 1, z: 7 });
    const landingActor = actor(2, { x: 2, y: 1, z: 8 });

    expect(
      resolveStep(
        stairs,
        createOccupancyIndex([movingActor, landingActor]),
        movingActor,
        'e',
        2,
      ),
    ).toEqual({
      ok: false,
      reason: 'transition-blocked',
      attempted: { x: 2, y: 1, z: 7 },
    });
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
