import { describe, expect, it } from 'vitest';

import {
  createMemorySaveDriver,
  createSaveRepository,
  type SaveDriver,
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
    const repository = createSaveRepository(
      createMemorySaveDriver(saveWithSession(session)),
    );
    const saveSession = createSaveSession(repository);

    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    expect(boot.decision).toEqual({ kind: 'resume', session });
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
