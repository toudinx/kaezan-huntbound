import { describe, expect, it } from 'vitest';

import {
  createSeed,
  type EntityId,
  type KernelScenario,
  SIMULATION_SCHEMA_VERSION,
} from '../../../../packages/contracts/src/index.ts';

import { createRestartableHuntDriver } from './RestartableHuntDriver';

const scenario: KernelScenario = {
  schemaVersion: SIMULATION_SCHEMA_VERSION,
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
  conditions: [],
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

  it('restores the persisted tick and exposes the current roster to the scene', () => {
    const seed = createSeed('1122334455667788');
    const original = createRestartableHuntDriver(scenario, seed, 0);
    original.advanceTo(150);
    const snapshot = original.snapshot();

    const resumed = createRestartableHuntDriver(scenario, seed, 0, snapshot);

    expect(resumed.tick).toBe(snapshot.tick);
    expect(resumed.advanceTo(0)).toEqual([
      {
        tick: snapshot.tick,
        sequence: 0,
        payload: {
          type: 'actor/spawned',
          entityId: 1,
          blueprintId: 'player',
          position: { x: 1, y: 1, z: 8 },
          facing: 's',
        },
      },
    ]);
  });
});
