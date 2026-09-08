import type { ItemDefinition } from '@huntbound/contracts';

import { equipmentSlotFor } from './equipment.ts';

/**
 * Small, explicit vendor prices for the low-tier drops already used by the
 * first hunts. Items with a `sellPrice` from Canary always win; the fallback
 * keeps newly curated loot sellable until its source value is imported.
 */
const CURATED_SELL_PRICES: ReadonlyMap<string, number> = new Map([
  ['item:tibia:gold-coin', 1],
  ['item:tibia:meat', 2],
  ['item:tibia:ham', 4],
  ['item:tibia:arrow', 1],
  ['item:tibia:worm', 1],
  ['item:tibia:zombie-dust', 1],
]);

export const DEFAULT_CURATED_SELL_PRICE = 1;

export interface ItemSaleOffer {
  readonly itemKey: string;
  readonly displayName: string;
  readonly unitPrice: number;
  readonly protected: boolean;
}

export function sellPriceFor(item: ItemDefinition): number {
  return (
    item.sellPrice ??
    CURATED_SELL_PRICES.get(item.stableKey) ??
    DEFAULT_CURATED_SELL_PRICE
  );
}

/** Equippable pieces are collection rares and need a deliberate confirmation. */
export function isProtectedSaleItem(item: ItemDefinition): boolean {
  return equipmentSlotFor(item) !== null;
}

export function createItemSaleOffer(item: ItemDefinition): ItemSaleOffer {
  return {
    itemKey: item.stableKey,
    displayName: item.displayName,
    unitPrice: sellPriceFor(item),
    protected: isProtectedSaleItem(item),
  };
}
