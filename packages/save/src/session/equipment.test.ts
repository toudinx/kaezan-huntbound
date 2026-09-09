import {
  activeCharacter,
  createEmptyGameSave,
  type SaveDraft,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { equipFromStash, unequipToStash } from './equipment.ts';

function draftWithStash(
  stash: readonly { itemKey: string; count: number }[],
): SaveDraft {
  return { ...createEmptyGameSave(), stash } as SaveDraft;
}

describe('equipping from the stash', () => {
  it('moves the piece out of the stash and into the slot', () => {
    const draft = draftWithStash([
      { itemKey: 'item:tibia:legion-helmet', count: 2 },
    ]);

    expect(equipFromStash(draft, 'helmet', 'item:tibia:legion-helmet')).toBe(
      true,
    );
    expect(activeCharacter(draft).equipment.helmet).toBe(
      'item:tibia:legion-helmet',
    );
    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ]);
  });

  it('drops the last copy out of the stash entirely', () => {
    const draft = draftWithStash([{ itemKey: 'item:tibia:sword', count: 1 }]);

    equipFromStash(draft, 'weapon', 'item:tibia:sword');

    expect(draft.stash).toEqual([]);
  });

  it('returns the piece it replaced, so a swap loses nothing', () => {
    const draft = draftWithStash([
      { itemKey: 'item:tibia:mace', count: 1 },
      { itemKey: 'item:tibia:sword', count: 1 },
    ]);

    equipFromStash(draft, 'weapon', 'item:tibia:sword');
    equipFromStash(draft, 'weapon', 'item:tibia:mace');

    expect(activeCharacter(draft).equipment.weapon).toBe('item:tibia:mace');
    expect(draft.stash).toEqual([{ itemKey: 'item:tibia:sword', count: 1 }]);
  });

  it('refuses an item the stash does not hold and changes nothing', () => {
    const draft = draftWithStash([]);

    expect(equipFromStash(draft, 'weapon', 'item:tibia:sword')).toBe(false);
    expect(activeCharacter(draft).equipment.weapon).toBeNull();
    expect(draft.stash).toEqual([]);
  });
});

describe('unequipping', () => {
  it('puts the piece back in the stash, merged with what is there', () => {
    const draft = draftWithStash([
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ]);
    equipFromStash(draft, 'helmet', 'item:tibia:legion-helmet');
    draft.stash = [{ itemKey: 'item:tibia:legion-helmet', count: 3 }];

    expect(unequipToStash(draft, 'helmet')).toBe(true);
    expect(activeCharacter(draft).equipment.helmet).toBeNull();
    expect(draft.stash).toEqual([
      { itemKey: 'item:tibia:legion-helmet', count: 4 },
    ]);
  });

  it('is a no-op on an empty slot', () => {
    const draft = draftWithStash([]);

    expect(unequipToStash(draft, 'boots')).toBe(false);
  });
});
