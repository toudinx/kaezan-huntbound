import { parseGameSave, SIMULATION_SCHEMA_VERSION } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { createSaveRepository } from '../repository/SaveRepository.ts';
import { consolidateRun } from './consolidateRun.ts';
import { decideResume } from './decideResume.ts';
import {
  createCountingDriver,
  makeSession,
  saveWithSession,
  TEST_IDENTITY,
} from './sessionTestUtils.ts';

function v4ShapedSnapshot(
  snapshot: ReturnType<typeof makeSession>['snapshot'],
) {
  return {
    ...snapshot,
    schemaVersion: 4,
    rulesVersion: 3,
    actors: snapshot.actors.map((actor) => {
      const record = { ...actor } as Record<string, unknown>;
      delete record.groupCooldowns;
      delete record.lastDamageReceivedTick;
      delete record.activeConditions;
      delete record.abilityCharges;
      record.groupReadyAtTick = 9;
      return record;
    }),
  };
}

describe('incompatible session discard', () => {
  it('preserves the bag in stash and clears the session in a single transaction', async () => {
    const session = makeSession({
      bag: [
        { itemKey: 'item:tibia:gold-coin', count: 4 },
        { itemKey: 'item:tibia:meat', count: 1 },
      ],
      snapshot: {
        ...makeSession().snapshot,
        schemaVersion: SIMULATION_SCHEMA_VERSION + 1,
      },
    });
    const save = saveWithSession(session, [
      { itemKey: 'item:tibia:arrow', count: 2 },
    ]);
    const counting = createCountingDriver(save);
    const repository = createSaveRepository(counting.driver);

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'schemaVersion',
    });

    await repository.transact((draft) => {
      consolidateRun(draft, 'abandoned');
    });

    expect(counting.writeCount()).toBe(1);
    await expect(repository.load()).resolves.toEqual({
      schemaVersion: 1,
      completedRuns: 0,
      session: null,
      stash: [
        { itemKey: 'item:tibia:arrow', count: 2 },
        { itemKey: 'item:tibia:gold-coin', count: 4 },
        { itemKey: 'item:tibia:meat', count: 1 },
      ],
    });
  });

  it('discards a v4 session under schema v5 while preserving the bag', async () => {
    const session = makeSession({
      bag: [
        { itemKey: 'item:tibia:gold-coin', count: 4 },
        { itemKey: 'item:tibia:meat', count: 1 },
      ],
    });
    const parsed = parseGameSave(
      saveWithSession(
        {
          ...session,
          snapshot: v4ShapedSnapshot(
            session.snapshot,
          ) as unknown as typeof session.snapshot,
        },
        [{ itemKey: 'item:tibia:arrow', count: 2 }],
      ),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(decideResume(parsed.value, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'schemaVersion',
    });

    const counting = createCountingDriver(parsed.value);
    const repository = createSaveRepository(counting.driver);
    await repository.transact((draft) => {
      consolidateRun(draft, 'abandoned');
    });

    await expect(repository.load()).resolves.toEqual({
      schemaVersion: 1,
      completedRuns: 0,
      session: null,
      stash: [
        { itemKey: 'item:tibia:arrow', count: 2 },
        { itemKey: 'item:tibia:gold-coin', count: 4 },
        { itemKey: 'item:tibia:meat', count: 1 },
      ],
    });
  });
});
