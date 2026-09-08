/**
 * The one between-runs purchase PB-13-06 adds.
 *
 * Price is a modest sold stack of common loot — gold coins and meat already
 * sit at 1–4 gold each — so the wallet has a destination without emptying
 * after a single run. The blessing is +25% damage dealt for the next hunt
 * and nothing else: no inventory, no manual use, charges stay free.
 */
export const NEXT_HUNT_BUFF_ID = 'prepared-hunt';
export const NEXT_HUNT_BUFF_PRICE = 50;
export const NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE = 250;

export interface NextHuntBuffOffer {
  readonly id: typeof NEXT_HUNT_BUFF_ID;
  readonly displayName: string;
  readonly price: number;
  readonly damageDealtPermille: number;
}

export function nextHuntBuffOffer(): NextHuntBuffOffer {
  return {
    id: NEXT_HUNT_BUFF_ID,
    displayName: 'Prepared hunt',
    price: NEXT_HUNT_BUFF_PRICE,
    damageDealtPermille: NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
  };
}

export function nextHuntBuffDamagePercent(): number {
  return NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE / 10;
}

/** Same integer scale the kernel uses for `damageDealtPermille`. */
export function scaleByDamageDealtPermille(
  value: number,
  permille: number,
): number {
  if (value === 0 || permille === 0) {
    return value;
  }
  const scaled = Math.trunc((value * (1000 + permille)) / 1000);
  return scaled < 0 ? 0 : scaled;
}
