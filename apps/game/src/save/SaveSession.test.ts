import { describe, expect, it } from 'vitest';
import {
  type AchievementDefinition,
  activeCharacter,
  type BestiarySpecies,
  createEmptyCharacterProgress,
  createEmptyGameSave,
  DEFAULT_KNIGHT_VOCATION_KEY,
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

const ORC_BESTIARY: BestiarySpecies = {
  creatureKey: 'creature:tibia:orc',
  displayName: 'Orc',
  targetKills: 2,
  rewardGold: 25,
};

const FIRST_SALE_ACHIEVEMENT: AchievementDefinition = {
  achievementId: 'achievement:test:first-sale',
  displayName: 'First sale',
  description: 'Sell one item.',
  metric: 'sold-items',
  target: 1,
  rewardGold: 25,
};

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
    expect(activeCharacter(await repository.load())).toMatchObject({
      experience: 400,
    });

    experience = 650;
    await saveSession.finish('died');

    const afterDeath = await repository.load();
    expect(afterDeath).toMatchObject({
      stash: [],
      completedRuns: 0,
      session: null,
    });
    expect(activeCharacter(afterDeath)).toMatchObject({ experience: 650 });
    expect(saveSession.getState().character).toEqual({
      ...createEmptyCharacterProgress(),
      experience: 650,
    });
    saveSession.destroy();
  });

  it('persists bestiary kills and does not replay progress or reward after reload', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const options = { bestiary: [ORC_BESTIARY] };
    const saveSession = createSaveSession(repository, options);
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

    await expect(
      saveSession.recordBestiaryKill(ORC_BESTIARY.creatureKey, 11),
    ).resolves.toMatchObject({ credited: true, kills: 1 });
    await expect(repository.load()).resolves.toMatchObject({
      bestiary: [
        {
          creatureKey: ORC_BESTIARY.creatureKey,
          kills: 1,
          rewardClaimed: false,
        },
      ],
      session: { lastBestiaryEventSequence: 11 },
      gold: 0,
    });
    saveSession.destroy();

    const reloaded = createSaveSession(repository, options);
    const resumed = await reloaded.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    expect(resumed.decision.kind).toBe('resume');
    reloaded.attachRun({
      identity: TEST_IDENTITY,
      driver: resumed.driver,
      getBag: () => [],
      getExperience: () => 0,
    });

    await expect(
      reloaded.recordBestiaryKill(ORC_BESTIARY.creatureKey, 11),
    ).resolves.toMatchObject({
      credited: false,
      reason: 'duplicate-event',
      kills: 1,
    });
    await expect(
      reloaded.recordBestiaryKill(ORC_BESTIARY.creatureKey, 12),
    ).resolves.toMatchObject({
      credited: true,
      kills: 2,
      completed: true,
      rewardGold: 25,
    });
    await expect(repository.load()).resolves.toMatchObject({
      bestiary: [
        {
          creatureKey: ORC_BESTIARY.creatureKey,
          kills: 2,
          rewardClaimed: true,
        },
      ],
      session: { lastBestiaryEventSequence: 12 },
      gold: 25,
    });
    reloaded.destroy();
  });

  it('keeps bestiary progress and its reward when death clears the run bag', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const saveSession = createSaveSession(repository, {
      bestiary: [ORC_BESTIARY],
    });
    const boot = await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    saveSession.attachRun({
      identity: TEST_IDENTITY,
      driver: boot.driver,
      getBag: () => [{ itemKey: 'item:tibia:gold-coin', count: 4 }],
      getExperience: () => 0,
    });

    await saveSession.recordBestiaryKill(ORC_BESTIARY.creatureKey, 21);
    await saveSession.recordBestiaryKill(ORC_BESTIARY.creatureKey, 22);
    await saveSession.finish('died');

    await expect(repository.load()).resolves.toMatchObject({
      bestiary: [
        {
          creatureKey: ORC_BESTIARY.creatureKey,
          kills: 2,
          rewardClaimed: true,
        },
      ],
      gold: 25,
      stash: [],
      session: null,
    });
    saveSession.destroy();
  });

  it('reopens a run at the experience the save already holds', async () => {
    const seeded = saveWithSession(makeSession());
    const repository = createSaveRepository(
      createMemorySaveDriver({
        ...seeded,
        characters: seeded.characters.map((entry) =>
          entry.vocationKey === DEFAULT_KNIGHT_VOCATION_KEY
            ? { ...entry, experience: 28_800 }
            : entry,
        ),
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

  it('sells a stash quantity, updates the wallet, and keeps the result after reload', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        ...createEmptyGameSave(),
        stash: [{ itemKey: 'item:tibia:meat', count: 3 }],
        gold: 4,
        session: null,
      }),
    );
    const resolveSellItem = (itemKey: string) =>
      itemKey === 'item:tibia:meat'
        ? { displayName: 'meat', unitPrice: 2, protected: false }
        : undefined;
    const saveSession = createSaveSession(repository, { resolveSellItem });

    await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    await expect(saveSession.sell('item:tibia:meat', 2)).resolves.toMatchObject(
      {
        ok: true,
        total: 4,
        gold: 8,
        remainingCount: 1,
      },
    );
    expect(saveSession.getState()).toMatchObject({
      stash: [{ itemKey: 'item:tibia:meat', count: 1 }],
      gold: 8,
    });
    await expect(repository.load()).resolves.toMatchObject({
      stash: [{ itemKey: 'item:tibia:meat', count: 1 }],
      gold: 8,
    });

    saveSession.destroy();
    const reloaded = createSaveSession(repository, { resolveSellItem });
    await reloaded.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    await expect(reloaded.sell('item:tibia:meat', 1)).resolves.toMatchObject({
      ok: true,
      total: 2,
      gold: 10,
    });
    await expect(repository.load()).resolves.toMatchObject({
      stash: [],
      gold: 10,
    });
    reloaded.destroy();
  });

  it('pays a sale achievement once and keeps it claimed after reload', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        ...createEmptyGameSave(),
        stash: [{ itemKey: 'item:tibia:meat', count: 1 }],
        gold: 4,
        session: null,
      }),
    );
    const options = {
      resolveSellItem: () => ({
        displayName: 'meat',
        unitPrice: 2,
        protected: false,
      }),
      achievements: [FIRST_SALE_ACHIEVEMENT],
    };
    const saveSession = createSaveSession(repository, options);
    await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    await expect(saveSession.sell('item:tibia:meat', 1)).resolves.toMatchObject(
      {
        ok: true,
        gold: 6,
      },
    );
    await expect(repository.load()).resolves.toMatchObject({
      gold: 31,
      achievements: [
        {
          achievementId: FIRST_SALE_ACHIEVEMENT.achievementId,
          progress: 1,
          rewardClaimed: true,
        },
      ],
    });
    saveSession.destroy();

    const reloaded = createSaveSession(repository, options);
    await reloaded.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    await expect(repository.load()).resolves.toMatchObject({
      gold: 31,
      achievements: [
        {
          achievementId: FIRST_SALE_ACHIEVEMENT.achievementId,
          progress: 1,
          rewardClaimed: true,
        },
      ],
    });
    reloaded.destroy();
  });

  it('does not sell a protected collection piece without explicit confirmation', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        ...createEmptyGameSave(),
        stash: [{ itemKey: 'item:tibia:legion-helmet', count: 1 }],
        gold: 4,
      }),
    );
    const saveSession = createSaveSession(repository, {
      resolveSellItem: () => ({
        displayName: 'legion helmet',
        unitPrice: 20,
        protected: true,
      }),
    });

    await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    await expect(
      saveSession.sell('item:tibia:legion-helmet', 1),
    ).resolves.toMatchObject({ ok: false, reason: 'protected-item' });
    await expect(repository.load()).resolves.toMatchObject({
      stash: [{ itemKey: 'item:tibia:legion-helmet', count: 1 }],
      gold: 4,
    });

    await expect(
      saveSession.sell('item:tibia:legion-helmet', 1, true),
    ).resolves.toMatchObject({ ok: true, gold: 24 });
    saveSession.destroy();
  });

  it('activates a pending next-hunt blessing once when the run starts', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        ...createEmptyGameSave(),
        gold: 50,
        nextHuntBuff: 'pending',
        session: null,
      }),
    );
    const saveSession = createSaveSession(repository);
    await saveSession.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });

    expect(saveSession.getState().nextHuntBuff).toBe('active');
    await expect(repository.load()).resolves.toMatchObject({
      nextHuntBuff: 'active',
      gold: 50,
    });

    saveSession.destroy();
    const reloaded = createSaveSession(repository);
    await reloaded.boot({
      identity: TEST_IDENTITY,
      createDriver: createTestDriver,
    });
    expect(reloaded.getState().nextHuntBuff).toBe('active');
    await expect(repository.load()).resolves.toMatchObject({
      nextHuntBuff: 'active',
      gold: 50,
    });
    reloaded.destroy();
  });
});
