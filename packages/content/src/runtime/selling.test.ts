import type { ItemDefinition } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  createItemSaleOffer,
  DEFAULT_CURATED_SELL_PRICE,
  isProtectedSaleItem,
  sellPriceFor,
} from './selling.ts';

function item(overrides: Partial<ItemDefinition> = {}): ItemDefinition {
  return {
    guid: 'item:tibia:9301' as ItemDefinition['guid'],
    stableKey: 'item:tibia:fixture-shard' as ItemDefinition['stableKey'],
    displayName: 'fixture shard',
    includedFacets: ['identity', 'item'],
    source: {
      system: 'canary',
      snapshot: 'fixture',
      sourceId: '9301',
      sourcePath: 'items.xml',
      sourceSha256: '0'.repeat(64),
    },
    aliases: [],
    ...overrides,
  } as unknown as ItemDefinition;
}

describe('selling content', () => {
  it('prefers a price declared by Canary', () => {
    expect(sellPriceFor(item({ sellPrice: 25 }))).toBe(25);
  });

  it('uses a conservative curated floor for an unpriced item', () => {
    expect(sellPriceFor(item())).toBe(DEFAULT_CURATED_SELL_PRICE);
  });

  it('protects equippable collection pieces', () => {
    const helmet = item({
      displayName: 'legion helmet',
      stableKey: 'item:tibia:legion-helmet' as ItemDefinition['stableKey'],
      armor: 4,
      slotType: 'head',
    });

    expect(isProtectedSaleItem(helmet)).toBe(true);
    expect(createItemSaleOffer(helmet)).toEqual({
      itemKey: 'item:tibia:legion-helmet',
      displayName: 'legion helmet',
      unitPrice: DEFAULT_CURATED_SELL_PRICE,
      protected: true,
    });
  });

  it('leaves ordinary loot sellable without collection confirmation', () => {
    expect(isProtectedSaleItem(item())).toBe(false);
    expect(createItemSaleOffer(item()).protected).toBe(false);
  });
});
