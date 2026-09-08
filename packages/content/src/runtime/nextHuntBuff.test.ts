import { describe, expect, it } from 'vitest';

import {
  NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
  NEXT_HUNT_BUFF_PRICE,
  nextHuntBuffDamagePercent,
  nextHuntBuffOffer,
  scaleByDamageDealtPermille,
} from './nextHuntBuff.ts';

describe('next-hunt blessing offer', () => {
  it('is one priced purchase with a readable damage bonus', () => {
    expect(nextHuntBuffOffer()).toEqual({
      id: 'prepared-hunt',
      displayName: 'Prepared hunt',
      price: NEXT_HUNT_BUFF_PRICE,
      damageDealtPermille: NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
    });
    expect(nextHuntBuffDamagePercent()).toBe(25);
    expect(scaleByDamageDealtPermille(13, 250)).toBe(16);
    expect(scaleByDamageDealtPermille(0, 250)).toBe(0);
  });
});
