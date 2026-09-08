import type { NextHuntBuffState, SaveDraft } from '@huntbound/contracts';

export type BuffPurchaseFailureReason =
  | 'run-active'
  | 'already-held'
  | 'insufficient-gold'
  | 'invalid-price'
  | 'invalid-wallet';

export interface SuccessfulBuffPurchase {
  readonly ok: true;
  readonly gold: number;
  readonly nextHuntBuff: NextHuntBuffState;
}

export interface FailedBuffPurchase {
  readonly ok: false;
  readonly reason: BuffPurchaseFailureReason;
}

export type BuffPurchaseResult = SuccessfulBuffPurchase | FailedBuffPurchase;

function failure(reason: BuffPurchaseFailureReason): FailedBuffPurchase {
  return { ok: false, reason };
}

/**
 * Pays for the next-hunt blessing in the same draft that records it.
 *
 * Between runs only: an open session is a hunt already in progress, and buying
 * then would either stack on a run that did not pay or survive a reload as a
 * second charge. One pending blessing at a time; duration is the next run.
 */
export function buyNextHuntBuff(
  draft: SaveDraft,
  price: number,
): BuffPurchaseResult {
  if (!Number.isSafeInteger(price) || price <= 0) {
    return failure('invalid-price');
  }
  if (!Number.isSafeInteger(draft.gold) || draft.gold < 0) {
    return failure('invalid-wallet');
  }
  if (draft.session !== null) {
    return failure('run-active');
  }
  if (draft.nextHuntBuff !== 'none') {
    return failure('already-held');
  }
  if (draft.gold < price) {
    return failure('insufficient-gold');
  }

  draft.gold -= price;
  draft.nextHuntBuff = 'pending';
  return { ok: true, gold: draft.gold, nextHuntBuff: 'pending' };
}

/**
 * Marks a paid blessing as belonging to the run that just started.
 *
 * Idempotent on `active` so a reload mid-hunt does not look like a new
 * purchase. `none` is left alone — a missing blessing is not invented here.
 */
export function activateNextHuntBuff(draft: SaveDraft): void {
  if (draft.nextHuntBuff === 'pending') {
    draft.nextHuntBuff = 'active';
  }
}
