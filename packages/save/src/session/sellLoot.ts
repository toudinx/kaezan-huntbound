import type { RunBagEntry, SaveDraft } from '@huntbound/contracts';

export interface SellItemDetails {
  readonly unitPrice: number;
  readonly protected?: boolean;
  readonly displayName?: string;
}

export interface SellOptions {
  readonly allowProtected?: boolean;
}

export type SaleFailureReason =
  | 'not-for-sale'
  | 'invalid-quantity'
  | 'item-not-in-stash'
  | 'insufficient-quantity'
  | 'protected-item'
  | 'invalid-price'
  | 'invalid-wallet'
  | 'amount-overflow'
  | 'session-destroyed';

export interface SuccessfulSale {
  readonly ok: true;
  readonly itemKey: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
  readonly gold: number;
  readonly remainingCount: number;
}

export interface FailedSale {
  readonly ok: false;
  readonly itemKey: string;
  readonly quantity: number;
  readonly reason: SaleFailureReason;
}

export type SaleResult = SuccessfulSale | FailedSale;

function failure(
  itemKey: string,
  quantity: number,
  reason: SaleFailureReason,
): FailedSale {
  return { ok: false, itemKey, quantity, reason };
}

function removeFromStash(
  stash: readonly RunBagEntry[],
  itemKey: string,
  quantity: number,
): readonly RunBagEntry[] {
  return stash.flatMap((entry) => {
    if (entry.itemKey !== itemKey) return [{ ...entry }];
    const remainingCount = entry.count - quantity;
    return remainingCount === 0
      ? []
      : [{ itemKey: entry.itemKey, count: remainingCount }];
  });
}

/**
 * Sells a quantity already banked in the stash and credits the wallet in the
 * same draft. Every failure returns before either field is changed.
 */
export function sellFromStash(
  draft: SaveDraft,
  itemKey: string,
  quantity: number,
  details: SellItemDetails,
  options: SellOptions = {},
): SaleResult {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return failure(itemKey, quantity, 'invalid-quantity');
  }

  const entry = draft.stash.find((value) => value.itemKey === itemKey);
  if (entry === undefined) {
    return failure(itemKey, quantity, 'item-not-in-stash');
  }
  if (quantity > entry.count) {
    return failure(itemKey, quantity, 'insufficient-quantity');
  }
  if (!Number.isSafeInteger(details.unitPrice) || details.unitPrice < 0) {
    return failure(itemKey, quantity, 'invalid-price');
  }
  if (!Number.isSafeInteger(draft.gold) || draft.gold < 0) {
    return failure(itemKey, quantity, 'invalid-wallet');
  }
  if (details.protected === true && options.allowProtected !== true) {
    return failure(itemKey, quantity, 'protected-item');
  }

  const total = details.unitPrice * quantity;
  if (!Number.isSafeInteger(total)) {
    return failure(itemKey, quantity, 'amount-overflow');
  }
  const gold = draft.gold + total;
  if (!Number.isSafeInteger(gold)) {
    return failure(itemKey, quantity, 'amount-overflow');
  }

  draft.stash = removeFromStash(draft.stash, itemKey, quantity);
  draft.gold = gold;
  return {
    ok: true,
    itemKey,
    quantity,
    unitPrice: details.unitPrice,
    total,
    gold,
    remainingCount: entry.count - quantity,
  };
}
