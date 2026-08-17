import { describe, expect, it } from 'vitest';

import {
  createSeed,
  type EntityId,
  type KernelScenario,
} from '../../../../packages/contracts/src/index.ts';

import { createRestartableHuntDriver } from './RestartableHuntDriver';

const scenario: KernelScenario = {
  schemaVersion: 1,
  scenarioId: 'restart-test',
  scenarioRevision: 1,
  width: 4,
  height: 4,
  floors: [{ z: 8, blockedTiles: [] }],
  transitions: [],
  spawnGroups: [],
  maxLiveActors: 4,
  abilities: [],
  lootTables: [],
  blueprints: [
    {
      blueprintId: 'player',
      stepCooldownTicks: 1,
      behavior: 'inert',
      factionId: 1,
      maxHealth: 10,
      maxResource: 0,
      healthRegenTicks: 0,
      healthRegenAmount: 0,
      resourceRegenTicks: 0,
      resourceRegenAmount: 0,
      attackCooldownTicks: 1,
      attackMinDamage: 1,
      attackMaxDamage: 1,
      aggroRadius: 0,
      lootTableIndex: null,
      abilityIndices: [],
    },
  ],
  initialActors: [
    {
      blueprintId: 'player',
      position: { x: 1, y: 1, z: 8 },
      facing: 's',
    },
  ],
};

describe('createRestartableHuntDriver', () => {
  it('recreates the initial kernel state with the same scenario and seed', () => {
    const seed = createSeed('1122334455667788');
    const driver = createRestartableHuntDriver(scenario, seed, 0);

    const initialEvents = driver.advanceTo(50);
    expect(driver.tick).toBe(1);

    const accepted = driver.enqueue({
      tick: driver.tick,
      issuer: 'player',
      command: {
        type: 'actor/move-step',
        entityId: 1 as EntityId,
        direction: 'e',
      },
    });
    expect(accepted.ok).toBe(true);
    driver.advanceTo(100);

    driver.restart(100);

    expect(driver.tick).toBe(0);
    expect(driver.alpha).toBe(0);
    expect(driver.advanceTo(150)).toEqual(initialEvents);
  });
});
