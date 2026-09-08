import { createEmptyGameSave, type SaveDraft } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { sellFromStash } from './sellLoot.ts';

function draftWithStash(
  stash: readonly { itemKey: string; count: number }[],
  gold = 10,
): SaveDraft {
  return { ...createEmptyGameSave(), stash, gold } as SaveDraft;
}

describe('selling from the stash', () => {
  it('removes exactly the requested quantity and credits it atomically', () => {
    const draft = draftWithStash([
      { itemKey: 'item:tibia:gold-coin', count: 12 },
      { itemKey: 'item:tibia:meat', count: 2 },
    ]);

    expect(
      sellFromStash(draft, 'item:tibia:gold-coin', 5, { unitPrice: 3 }),
    ).toEqual({
      ok: true,
      itemKey: 'item:tibia:gold-coin',
      quantity: 5,
      unitPrice: 3,
      total: 15,
      gold: 25,
      remainingCount: 7,
    });
    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 7 },
      { itemKey: 'item:tibia:meat', count: 2 },
    ]);
    expect(draft.gold).toBe(25);
  });

  it('refuses an invalid quantity or shortage without touching the draft', () => {
    const draft = draftWithStash([
      { itemKey: 'item:tibia:meat', count: 2 },
    ]);
    const before = { stash: draft.stash, gold: draft.gold };

    expect(
      sellFromStash(draft, 'item:tibia:meat', 0, { unitPrice: 2 }),
    ).toMatchObject({ ok: false, reason: 'invalid-quantity' });
    expect(
      sellFromStash(draft, 'item:tibia:meat', 3, { unitPrice: 2 }),
    ).toMatchObject({ ok: false, reason: 'insufficient-quantity' });
    expect(draft.stash).toEqual(before.stash);
    expect(draft.gold).toBe(before.gold);
  });

  it('requires explicit confirmation for a protected collection piece', () => {
    const draft = draftWithStash([
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ]);

    expect(
      sellFromStash(draft, 'item:tibia:legion-helmet', 1, {
        unitPrice: 20,
        protected: true,
      }),
    ).toMatchObject({ ok: false, reason: 'protected-item' });
    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ]);
    expect(draft.gold).toBe(10);

    expect(
      sellFromStash(
        draft,
        'item:tibia:legion-helmet',
        1,
        { unitPrice: 20, protected: true },
        { allowProtected: true },
      ),
    ).toMatchObject({ ok: true, total: 20, gold: 30 });
    expect(draft.stash).toEqual([]);
  });
});
