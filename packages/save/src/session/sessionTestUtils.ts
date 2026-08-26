import {
  type ActiveRunState,
  createSeed,
  type GameSave,
  type KernelScenario,
  type RunBagEntry,
  type SaveDraft,
  type Seed,
  SIMULATION_SCHEMA_VERSION,
} from '@huntbound/contracts';
import { createSimulationKernel } from '@huntbound/simulation/src/kernel/index.ts';
import { snapshotKernel } from '@huntbound/simulation/src/state/snapshot.ts';

import { createMemorySaveDriver } from '../drivers/memory.ts';
import type { SaveDriver, TransactionOutcome } from '../repository/types.ts';

export const TEST_SEED: Seed = createSeed('0f1e2d3c4b5a6978');
export const OTHER_SEED: Seed = createSeed('aaaaaaaaaaaaaaaa');

export const TEST_IDENTITY = {
  huntId: 'hunt:pb06-06-session',
  scenarioId: 'pb06-06-session',
  scenarioRevision: 1,
  seed: TEST_SEED,
} as const;

export function testScenario(
  overrides: Partial<KernelScenario> = {},
): KernelScenario {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: TEST_IDENTITY.scenarioId,
    scenarioRevision: TEST_IDENTITY.scenarioRevision,
    width: 4,
    height: 4,
    floors: [{ z: 7, blockedTiles: [] }],
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
        behavior: 'wander',
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
    initialActors: [
      { blueprintId: 'walker', position: { x: 1, y: 1, z: 7 }, facing: 's' },
    ],
    ...overrides,
  };
}

export function makeSession(
  overrides: Partial<ActiveRunState> = {},
): ActiveRunState {
  const scenario = testScenario();
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  kernel.advance(3);
  return {
    huntId: TEST_IDENTITY.huntId,
    scenarioId: scenario.scenarioId,
    scenarioRevision: scenario.scenarioRevision,
    seed: TEST_SEED,
    snapshot: snapshotKernel(kernel),
    bag: [],
    ...overrides,
  };
}

export function saveWithSession(
  session: ActiveRunState,
  stash: readonly RunBagEntry[] = [],
  completedRuns = 0,
): GameSave {
  return {
    schemaVersion: 2,
    stash,
    completedRuns,
    session,
  };
}

export function draftFrom(save: GameSave): SaveDraft {
  return structuredClone(save) as SaveDraft;
}

export function createCountingDriver(initial: unknown = null): {
  readonly driver: SaveDriver;
  readonly writeCount: () => number;
} {
  const inner = createMemorySaveDriver(initial);
  let writeCount = 0;
  return {
    writeCount: () => writeCount,
    driver: {
      read() {
        return inner.read();
      },
      async runTransaction<T>(
        operation: (current: unknown) => TransactionOutcome<T>,
      ) {
        writeCount += 1;
        return inner.runTransaction(operation);
      },
      close() {
        inner.close();
      },
    },
  };
}

export function createHoldableDriver(initial: unknown = null): {
  readonly driver: SaveDriver;
  readonly writeCount: () => number;
  holdNextWrite(): void;
  releaseHeldWrite(): void;
} {
  const inner = createMemorySaveDriver(initial);
  let writeCount = 0;
  let held: Promise<void> = Promise.resolve();
  let release = (): void => {};

  return {
    writeCount: () => writeCount,
    holdNextWrite() {
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releaseHeldWrite() {
      release();
    },
    driver: {
      read() {
        return inner.read();
      },
      async runTransaction<T>(
        operation: (current: unknown) => TransactionOutcome<T>,
      ) {
        writeCount += 1;
        const gate = held;
        await gate;
        return inner.runTransaction(operation);
      },
      close() {
        inner.close();
      },
    },
  };
}
