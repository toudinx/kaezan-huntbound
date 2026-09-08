import type { BestiarySpecies } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { creditBestiaryKill } from './bestiary.ts';
import { consolidateRun } from './consolidateRun.ts';
import { draftFrom, makeSession, saveWithSession } from './sessionTestUtils.ts';

const ORC: BestiarySpecies = {
  creatureKey: 'creature:tibia:orc',
  displayName: 'Orc',
  targetKills: 2,
  rewardGold: 25,
};

function createDraft() {
  return draftFrom(saveWithSession(makeSession()));
}

describe('creditBestiaryKill', () => {
  it('credits account progress at the kill and pays a completed goal once', () => {
    const draft = createDraft();

    expect(creditBestiaryKill(draft, ORC, 4)).toMatchObject({
      credited: true,
      kills: 1,
      targetKills: 2,
      completed: false,
      rewardGold: 0,
    });
    expect(draft.character.bestiary).toEqual([
      { creatureKey: ORC.creatureKey, kills: 1, rewardClaimed: false },
    ]);
    expect(draft.gold).toBe(0);

    expect(creditBestiaryKill(draft, ORC, 5)).toMatchObject({
      credited: true,
      kills: 2,
      completed: true,
      rewardGold: 25,
    });
    expect(draft.gold).toBe(25);
    expect(draft.character.bestiary).toEqual([
      { creatureKey: ORC.creatureKey, kills: 2, rewardClaimed: true },
    ]);

    expect(creditBestiaryKill(draft, ORC, 6)).toMatchObject({
      credited: true,
      kills: 3,
      completed: true,
      rewardGold: 0,
    });
    expect(draft.gold).toBe(25);
  });

  it('treats a replayed event as a no-op and keeps progress through death', () => {
    const draft = createDraft();

    creditBestiaryKill(draft, ORC, 9);
    const beforeReplay = structuredClone(draft);
    expect(creditBestiaryKill(draft, ORC, 9)).toMatchObject({
      credited: false,
      reason: 'duplicate-event',
      kills: 1,
      rewardGold: 0,
    });
    expect(draft).toEqual(beforeReplay);

    consolidateRun(draft, 'died');
    expect(draft.session).toBeNull();
    expect(draft.character.bestiary).toEqual([
      { creatureKey: ORC.creatureKey, kills: 1, rewardClaimed: false },
    ]);
  });
});
