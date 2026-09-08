import {
  type ActiveRunState,
  createEmptyGameSave,
  type SaveDraft,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { activateNextHuntBuff, buyNextHuntBuff } from './nextHuntBuff.ts';
import { makeSession } from './sessionTestUtils.ts';

function draftWithGold(
  gold: number,
  session: ActiveRunState | null = null,
): SaveDraft {
  return { ...createEmptyGameSave(), gold, session } as SaveDraft;
}

describe('buying the next-hunt blessing', () => {
  it('debits the wallet and parks the blessing as pending', () => {
    const draft = draftWithGold(80);

    expect(buyNextHuntBuff(draft, 50)).toEqual({
      ok: true,
      gold: 30,
      nextHuntBuff: 'pending',
    });
    expect(draft.gold).toBe(30);
    expect(draft.nextHuntBuff).toBe('pending');
  });

  it('refuses a second purchase, an open run, or a short wallet without touching the draft', () => {
    const pending = draftWithGold(80);
    expect(buyNextHuntBuff(pending, 50)).toMatchObject({ ok: true });
    const afterBuy = { gold: pending.gold, nextHuntBuff: pending.nextHuntBuff };
    expect(buyNextHuntBuff(pending, 50)).toMatchObject({
      ok: false,
      reason: 'already-held',
    });
    expect(pending.gold).toBe(afterBuy.gold);
    expect(pending.nextHuntBuff).toBe(afterBuy.nextHuntBuff);

    const inRun = draftWithGold(80, makeSession());
    expect(buyNextHuntBuff(inRun, 50)).toMatchObject({
      ok: false,
      reason: 'run-active',
    });
    expect(inRun.gold).toBe(80);
    expect(inRun.nextHuntBuff).toBe('none');

    const poor = draftWithGold(49);
    expect(buyNextHuntBuff(poor, 50)).toMatchObject({
      ok: false,
      reason: 'insufficient-gold',
    });
    expect(poor.gold).toBe(49);
    expect(poor.nextHuntBuff).toBe('none');
  });

  it('activates a pending blessing once and ignores a missing one', () => {
    const pending = draftWithGold(30);
    pending.nextHuntBuff = 'pending';
    activateNextHuntBuff(pending);
    expect(pending.nextHuntBuff).toBe('active');
    activateNextHuntBuff(pending);
    expect(pending.nextHuntBuff).toBe('active');

    const empty = draftWithGold(30);
    activateNextHuntBuff(empty);
    expect(empty.nextHuntBuff).toBe('none');
  });
});
