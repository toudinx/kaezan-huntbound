import { describe, expect, it } from 'vitest';
import {
  createEmptyCharacterProgress,
  parseGameSave,
} from '../../../../packages/contracts/src/index.ts';

import {
  createMemorySaveDriver,
  createSaveRepository,
  type SaveDriver,
  SaveError,
  type TransactionOutcome,
} from '../../../../packages/save/src/index.ts';
import {
  createCountingDriver,
  createHoldableDriver,
  makeSession,
  saveWithSession,
  TEST_IDENTITY,
  TEST_SEED,
  testScenario,
} from '../../../../packages/save/src/session/sessionTestUtils.ts';

import { createRestartableHuntDriver } from '../hunt/RestartableHuntDriver';
import { createSaveSession } from './SaveSession';

function createTestDriver(
  snapshot?: Parameters<typeof createRestartableHuntDriver>[3],
) {
  return createRestartableHuntDriver(testScenario(), TEST_SEED, 0, snapshot);
}

describe('createSaveSession', () => {
  it('resumes a compatible session by rebuilding the driver at its persisted tick', async () => {
    const session = makeSession();
    const stored = saveWithSession(session);
    const parsed = parseGameSave(stored);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const repository = createSaveRepository(createMemorySaveDriver(stored));
    const saveSession = createSaveSession(repository);

    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    expect(boot.decision).toEqual({
      kind: 'resume',
      session: parsed.value.session,
    });
    expect(boot.driver.tick).toBe(session.snapshot.tick);
    expect(boot.bag).toEqual(session.bag);

    saveSession.destroy();
  });

  it('discards an incompatible session while consolidating its bag into the stash', async () => {
    const session = makeSession({
      scenarioId: 'old-scenario',
      bag: [{ itemKey: 'item:tibia:gold-coin', count: 3 }],
    });
    const repository = createSaveRepository(
      createMemorySaveDriver(
        saveWithSession(session, [{ itemKey: 'item:tibia:arrow', count: 2 }]),
      ),
    );
    const saveSession = createSaveSession(repository);

    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    expect(boot.decision).toEqual({ kind: 'discard', reason: 'scenarioId' });
    expect(boot.driver.tick).toBe(0);
    await expect(repository.load()).resolves.toMatchObject({
      session: null,
      stash: [
        { itemKey: 'item:tibia:arrow', count: 2 },
        { itemKey: 'item:tibia:gold-coin', count: 3 },
      ],
    });

    saveSession.destroy();
  });

  it('starts fresh without changing an existing stash when no session exists', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        schemaVersion: 1,
        stash: [{ itemKey: 'item:tibia:meat', count: 7 }],
        completedRuns: 4,
        session: null,
      }),
    );
    const saveSession = createSaveSession(repository);

    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    expect(boot.decision).toEqual({ kind: 'fresh' });
    expect(boot.driver.tick).toBe(0);
    expect(saveSession.getState()).toMatchObject({
      stash: [{ itemKey: 'item:tibia:meat', count: 7 }],
      completedRuns: 4,
    });

    saveSession.destroy();
  });

  it('publishes a read error and still starts a fresh run', async () => {
    const failure = new Error('IndexedDB unavailable');
    const driver: SaveDriver = {
      read: async () => {
        throw failure;
      },
      runTransaction: async <T>(
        _operation: (current: unknown) => TransactionOutcome<T>,
      ) => {
        throw failure;
      },
      close: () => undefined,
    };
    const saveSession = createSaveSession(createSaveRepository(driver));

    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    expect(boot.decision).toEqual({ kind: 'fresh' });
    expect(boot.driver.tick).toBe(0);
    expect(saveSession.getState().status).toBe('error');
    expect(saveSession.getState().message).toContain('IndexedDB unavailable');

    saveSession.destroy();
  });

  it('names the save error code the player is looking at', async () => {
    const failure = new SaveError(
      'SAVE_VERSION_UNSUPPORTED',
      'Save schema version 2 is newer than supported version 1',
    );
    const driver: SaveDriver = {
      read: async () => {
        throw failure;
      },
      runTransaction: async <T>(
        _operation: (current: unknown) => TransactionOutcome<T>,
      ) => {
        throw failure;
      },
      close: () => undefined,
    };
    const saveSession = createSaveSession(createSaveRepository(driver));

    await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    // The prose alone cannot be searched for, mapped to a recovery path or
    // matched by a test. The code is the only stable name the failure has.
    expect(saveSession.getState().message).toContain(
      'SAVE_VERSION_UNSUPPORTED',
    );
    expect(saveSession.getState().message).toContain(
      'newer than supported version 1',
    );

    saveSession.destroy();
  });

  it('snapshots the kernel only on the ticks that actually checkpoint', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const saveSession = createSaveSession(repository, { everyTicks: 4 });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    // The scheduler takes a lazy `capture` for exactly this reason. Building
    // the snapshot before handing it over threw away 3 of every 4 and made the
    // session allocate a fresh copy of kernel state twenty times a second.
    let snapshots = 0;
    const driver = {
      ...boot.driver,
      snapshot: () => {
        snapshots += 1;
        return boot.driver.snapshot();
      },
    };
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver,
      getBag: () => [],
      getExperience: () => 0,
    });

    saveSession.onTick(1);
    saveSession.onTick(2);
    saveSession.onTick(3);
    expect(snapshots).toBe(0);

    saveSession.onTick(4);
    expect(snapshots).toBe(1);

    saveSession.destroy();
  });

  it('checkpoints only at the configured boundary and consolidates a run once', async () => {
    const counted = createCountingDriver();
    const repository = createSaveRepository(counted.driver);
    const saveSession = createSaveSession(repository, { everyTicks: 4 });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    let bag = [{ itemKey: 'item:tibia:gold-coin', count: 3 }];
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => bag,
      getExperience: () => 0,
    });

    saveSession.onTick(3);
    expect(counted.writeCount()).toBe(0);
    saveSession.onTick(4);
    await saveSession.pagehide();
    expect(counted.writeCount()).toBe(1);

    bag = [{ itemKey: 'item:tibia:gold-coin', count: 5 }];
    await saveSession.finish('completed');
    await saveSession.finish('completed');

    await expect(repository.load()).resolves.toMatchObject({
      stash: [{ itemKey: 'item:tibia:gold-coin', count: 5 }],
      completedRuns: 1,
      session: null,
    });
    saveSession.destroy();
  });

  it('drops the bag and the credit when the run ends in a death, checkpoint included', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const saveSession = createSaveSession(repository, { everyTicks: 1 });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    const bag = [{ itemKey: 'item:tibia:gold-coin', count: 7 }];
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => bag,
      getExperience: () => 0,
    });

    // The checkpoint writes the bag first, so the death has to clear a session
    // that is already on disk rather than one that only exists in memory.
    saveSession.onTick(1);
    await saveSession.pagehide();
    await expect(repository.load()).resolves.toMatchObject({
      session: { bag },
    });

    await saveSession.finish('died');

    await expect(repository.load()).resolves.toMatchObject({
      stash: [],
      completedRuns: 0,
      session: null,
    });
    expect(saveSession.getState().bag).toEqual([]);
    saveSession.destroy();
  });

  it('keeps the experience the run earned even when it ends in a death', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const saveSession = createSaveSession(repository, { everyTicks: 1 });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    expect(boot.character).toEqual(createEmptyCharacterProgress());

    let experience = 0;
    const bag = [{ itemKey: 'item:tibia:gold-coin', count: 7 }];
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => bag,
      getExperience: () => experience,
    });

    // A kill before the last checkpoint, and one after it: the second is the
    // one only `finish` can bank.
    experience = 400;
    saveSession.onTick(1);
    await saveSession.pagehide();
    await expect(repository.load()).resolves.toMatchObject({
      character: { experience: 400 },
    });

    experience = 650;
    await saveSession.finish('died');

    await expect(repository.load()).resolves.toMatchObject({
      character: { experience: 650 },
      stash: [],
      completedRuns: 0,
      session: null,
    });
    expect(saveSession.getState().character).toEqual({
      ...createEmptyCharacterProgress(),
      experience: 650,
      collection: ['item:tibia:gold-coin'],
    });
    saveSession.destroy();
  });

  it('reopens a run at the experience the save already holds', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        ...saveWithSession(makeSession()),
        character: { ...createEmptyCharacterProgress(), experience: 28_800 },
      }),
    );
    const saveSession = createSaveSession(repository);

    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    const resumed = { ...createEmptyCharacterProgress(), experience: 28_800 };
    expect(boot.character).toEqual(resumed);
    expect(saveSession.getState().character).toEqual(resumed);
    saveSession.destroy();
  });

  it('flushes an in-flight checkpoint on pagehide', async () => {
    const held = createHoldableDriver();
    held.holdNextWrite();
    const repository = createSaveRepository(held.driver);
    const saveSession = createSaveSession(repository, { everyTicks: 4 });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => [],
      getExperience: () => 0,
    });
    saveSession.onTick(4);

    const flushed = saveSession.pagehide();
    await Promise.resolve();
    expect(held.writeCount()).toBe(1);
    held.releaseHeldWrite();
    await flushed;

    await expect(repository.load()).resolves.toMatchObject({
      session: { scenarioId: TEST_IDENTITY.scenarioId },
    });
    saveSession.destroy();
  });

  it('disposes the scheduler on destroy without scheduling another write', async () => {
    const held = createHoldableDriver();
    held.holdNextWrite();
    const repository = createSaveRepository(held.driver);
    const saveSession = createSaveSession(repository, { everyTicks: 4 });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => [],
      getExperience: () => 0,
    });
    saveSession.onTick(4);
    saveSession.onTick(8);
    saveSession.destroy();
    held.releaseHeldWrite();
    await Promise.resolve();
    await Promise.resolve();

    expect(held.writeCount()).toBe(1);
  });

  it('captures the final bag synchronously before an asynchronous consolidation', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const saveSession = createSaveSession(repository);
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    let bag = [{ itemKey: 'item:tibia:meat', count: 4 }];
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => bag,
      getExperience: () => 0,
    });

    const finishing = saveSession.finish('abandoned');
    bag = [];
    await finishing;

    await expect(repository.load()).resolves.toMatchObject({
      stash: [{ itemKey: 'item:tibia:meat', count: 4 }],
      session: null,
    });
    saveSession.destroy();
  });
});
