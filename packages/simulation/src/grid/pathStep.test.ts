import {
  type ActorState,
  createEntityId,
  type KernelScenario,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  createOccupancyIndex,
  createStaticGrid,
  firstPathStepDirection,
  greedyStepDirection,
} from './index.ts';

const Z = 7;

function at(x: number, y: number) {
  return { x, y, z: Z };
}

function occupancyOf(
  ...positions: { x: number; y: number }[]
): ReturnType<typeof createOccupancyIndex> {
  const actors = positions.map(
    (position, index): ActorState => ({
      entityId: createEntityId(index + 1),
      blueprintId: 'walker',
      position: at(position.x, position.y),
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
    }),
  );
  return createOccupancyIndex(actors);
}

function gridOf(
  blockedTiles: readonly (readonly [number, number])[] = [],
  width = 8,
  height = 6,
) {
  const scenario: KernelScenario = {
    schemaVersion: 5,
    scenarioId: 'path-step-test',
    scenarioRevision: 1,
    width,
    height,
    floors: [{ z: Z, blockedTiles }],
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
        resistances: [],
        immunities: [],
      },
    ],
    initialActors: [],
  };
  return createStaticGrid(scenario);
}

describe('firstPathStepDirection', () => {
  it('returns undefined when already within targetDistance', () => {
    const grid = gridOf();
    const occupancy = occupancyOf({ x: 2, y: 2 }, { x: 3, y: 2 });
    expect(
      firstPathStepDirection(grid, occupancy, at(2, 2), at(3, 2), {
        walkerId: createEntityId(1),
        targetDistance: 1,
      }),
    ).toBeUndefined();
  });

  it('matches greedy on an open north-east line', () => {
    const grid = gridOf();
    const occupancy = occupancyOf({ x: 2, y: 3 }, { x: 4, y: 1 });
    const from = at(2, 3);
    const target = at(4, 1);
    expect(
      firstPathStepDirection(grid, occupancy, from, target, {
        walkerId: createEntityId(1),
        targetDistance: 1,
      }),
    ).toBe(greedyStepDirection(from, target));
  });

  it('breaks equal-length paths in DIRECTIONS order: east target steps north-east first', () => {
    const grid = gridOf();
    const occupancy = occupancyOf({ x: 2, y: 2 }, { x: 5, y: 2 });
    expect(
      firstPathStepDirection(grid, occupancy, at(2, 2), at(5, 2), {
        walkerId: createEntityId(1),
        targetDistance: 1,
      }),
    ).toBe('ne');
  });

  it('steps around a wall that sits on the greedy east path', () => {
    const grid = gridOf([[2, 2]]);
    const occupancy = occupancyOf({ x: 1, y: 2 }, { x: 4, y: 2 });
    // `ne` and `se` are illegal: the wall occupies the diagonal corner.
    expect(
      firstPathStepDirection(grid, occupancy, at(1, 2), at(4, 2), {
        walkerId: createEntityId(1),
        targetDistance: 1,
      }),
    ).toBe('n');
  });

  it('returns undefined when boxed in so the caller can fall back to greedy', () => {
    const grid = gridOf([
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
      [2, 2],
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
    const occupancy = occupancyOf({ x: 1, y: 2 }, { x: 6, y: 2 });
    expect(
      firstPathStepDirection(grid, occupancy, at(1, 2), at(6, 2), {
        walkerId: createEntityId(1),
        targetDistance: 1,
      }),
    ).toBeUndefined();
  });

  it('returns undefined when the search ceiling is too small to reach a goal', () => {
    const grid = gridOf();
    const occupancy = occupancyOf({ x: 0, y: 0 }, { x: 7, y: 5 });
    expect(
      firstPathStepDirection(grid, occupancy, at(0, 0), at(7, 5), {
        walkerId: createEntityId(1),
        targetDistance: 1,
        maxSearchDist: 2,
      }),
    ).toBeUndefined();
  });
});
