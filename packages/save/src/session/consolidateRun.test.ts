import { activeCharacter, createEmptyGameSave } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { consolidateRun } from './consolidateRun.ts';
import { draftFrom, makeSession, saveWithSession } from './sessionTestUtils.ts';

describe('consolidateRun', () => {
  it('completing merges bag into stash in UTF-16 order, increments completedRuns and clears the session', () => {
    const draft = draftFrom(
      saveWithSession(
        makeSession({
          bag: [
            { itemKey: 'item:tibia:gold-coin', count: 4 },
            { itemKey: 'item:tibia:meat', count: 1 },
          ],
        }),
        [{ itemKey: 'item:tibia:arrow', count: 12 }],
        3,
      ),
    );

    consolidateRun(draft, 'completed');

    expect(draft.completedRuns).toBe(4);
    expect(draft.session).toBeNull();
    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:arrow', count: 12 },
      { itemKey: 'item:tibia:gold-coin', count: 4 },
      { itemKey: 'item:tibia:meat', count: 1 },
    ]);
  });

  it('records everything banked in the collection, and a death records nothing', () => {
    const bag = [
      { itemKey: 'item:tibia:sword', count: 1 },
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ];

    const banked = draftFrom(saveWithSession(makeSession({ bag })));
    consolidateRun(banked, 'completed');
    expect(activeCharacter(banked).collection).toEqual([
      'item:tibia:legion-helmet',
      'item:tibia:sword',
    ]);

    const died = draftFrom(saveWithSession(makeSession({ bag })));
    consolidateRun(died, 'died');
    expect(activeCharacter(died).collection).toEqual([]);
  });

  it('adds counts for itemKeys that already exist in the stash instead of duplicating entries', () => {
    const draft = draftFrom(
      saveWithSession(
        makeSession({
          bag: [{ itemKey: 'item:tibia:gold-coin', count: 3 }],
        }),
        [{ itemKey: 'item:tibia:gold-coin', count: 7 }],
      ),
    );

    consolidateRun(draft, 'completed');

    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 10 },
    ]);
  });

  it('abandoning consolidates the bag and clears the session without incrementing completedRuns', () => {
    const draft = draftFrom(
      saveWithSession(
        makeSession({
          bag: [{ itemKey: 'item:tibia:meat', count: 2 }],
        }),
        [],
        5,
      ),
    );

    consolidateRun(draft, 'abandoned');

    expect(draft.completedRuns).toBe(5);
    expect(draft.session).toBeNull();
    expect(draft.stash).toEqual([{ itemKey: 'item:tibia:meat', count: 2 }]);
  });

  it('dying clears the session without banking the bag or crediting the run', () => {
    const draft = draftFrom(
      saveWithSession(
        makeSession({
          bag: [
            { itemKey: 'item:tibia:gold-coin', count: 9 },
            { itemKey: 'item:tibia:meat', count: 2 },
          ],
        }),
        [{ itemKey: 'item:tibia:arrow', count: 12 }],
        5,
      ),
    );

    consolidateRun(draft, 'died');

    expect(draft.completedRuns).toBe(5);
    expect(draft.session).toBeNull();
    expect(draft.stash).toEqual([{ itemKey: 'item:tibia:arrow', count: 12 }]);
  });

  it('consolidating twice adds the bag only once', () => {
    const draft = draftFrom(
      saveWithSession(
        makeSession({
          bag: [{ itemKey: 'item:tibia:gold-coin', count: 4 }],
        }),
        [{ itemKey: 'item:tibia:gold-coin', count: 1 }],
        0,
      ),
    );

    consolidateRun(draft, 'completed');
    consolidateRun(draft, 'completed');

    expect(draft.completedRuns).toBe(1);
    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 5 },
    ]);
  });

  it('is a silent no-op when there is no session', () => {
    const draft = draftFrom({
      ...createEmptyGameSave(),
      stash: [{ itemKey: 'item:tibia:arrow', count: 2 }],
      completedRuns: 8,
      nextHuntBuff: 'pending',
    });

    expect(() => consolidateRun(draft, 'completed')).not.toThrow();
    expect(draft.completedRuns).toBe(8);
    expect(draft.session).toBeNull();
    expect(draft.stash).toEqual([{ itemKey: 'item:tibia:arrow', count: 2 }]);
    expect(draft.nextHuntBuff).toBe('pending');
  });

  it('ends an active next-hunt blessing with the run, including a death', () => {
    const completed = draftFrom({
      ...saveWithSession(makeSession()),
      nextHuntBuff: 'active',
    });
    consolidateRun(completed, 'completed');
    expect(completed.nextHuntBuff).toBe('none');

    const died = draftFrom({
      ...saveWithSession(makeSession()),
      nextHuntBuff: 'active',
    });
    consolidateRun(died, 'died');
    expect(died.nextHuntBuff).toBe('none');
  });
});
