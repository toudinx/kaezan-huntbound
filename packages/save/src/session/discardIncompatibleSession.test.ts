import { SIMULATION_SCHEMA_VERSION } from '@huntbound/contracts';
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
});
