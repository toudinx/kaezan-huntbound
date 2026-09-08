import type { ContentKey, ItemDefinition } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  bandSetFor,
  equipmentSlotFor,
  resolveEquippedStats,
} from './equipment.ts';

function item(
  slug: string,
  fields: Partial<ItemDefinition> = {},
): ItemDefinition {
  return {
    guid: `00000000-0000-5000-8000-${slug.padEnd(12, '0').slice(0, 12)}`,
    stableKey: `item:tibia:${slug}` as ContentKey,
    displayName: slug.replace(/-/g, ' '),
    includedFacets: ['identity', 'item'],
    ...fields,
  } as ItemDefinition;
}

const SWORD = item('sword', { attack: 14, defense: 13, weaponType: 'sword' });
const MACE = item('mace', { attack: 16, defense: 8, weaponType: 'club' });
const HELMET = item('legion-helmet', { armor: 4, slotType: 'head' });
const MEAT = item('meat', { weight: 1_200 });

const CATALOG = new Map<string, ItemDefinition>(
  [SWORD, MACE, HELMET, MEAT].map((entry) => [entry.stableKey, entry]),
);
const lookup = (itemKey: string) => CATALOG.get(itemKey);

const EMPTY = {
  weapon: null,
  shield: null,
  helmet: null,
  armor: null,
  legs: null,
  boots: null,
} as const;

describe('equipment slots', () => {
  it('sends every melee weaponType to the weapon slot', () => {
    expect(equipmentSlotFor(SWORD)).toBe('weapon');
    expect(equipmentSlotFor(MACE)).toBe('weapon');
  });

  it('maps Canary slotType words to the wearable slots', () => {
    expect(equipmentSlotFor(HELMET)).toBe('helmet');
    expect(equipmentSlotFor(item('x', { slotType: 'body' }))).toBe('armor');
    expect(equipmentSlotFor(item('x', { slotType: 'feet' }))).toBe('boots');
  });

  it('gives loot with no slot of its own nowhere to go', () => {
    expect(equipmentSlotFor(MEAT)).toBeNull();
    expect(equipmentSlotFor(item('x', { slotType: 'ring' }))).toBeNull();
  });
});

describe('worn stats', () => {
  it('sums armor and defense across the worn set', () => {
    const stats = resolveEquippedStats(
      { ...EMPTY, weapon: SWORD.stableKey, helmet: HELMET.stableKey },
      lookup,
    );

    expect(stats.armor).toBe(4);
    expect(stats.defense).toBe(13);
    expect(stats.weapon).toEqual({
      itemKey: SWORD.stableKey,
      attack: 14,
      trained: true,
    });
  });

  it('marks a weapon the Knight is not trained for', () => {
    const stats = resolveEquippedStats(
      { ...EMPTY, weapon: MACE.stableKey },
      lookup,
    );

    expect(stats.weapon).toEqual({
      itemKey: MACE.stableKey,
      attack: 16,
      trained: false,
    });
  });

  it('stands unarmoured rather than throwing on an item the slice lost', () => {
    const stats = resolveEquippedStats(
      { ...EMPTY, helmet: 'item:tibia:not-in-this-slice' },
      lookup,
    );

    expect(stats).toEqual({ weapon: null, armor: 0, defense: 0 });
  });
});

describe('band set', () => {
  const lootKeys = [
    'item:tibia:gold-coin',
    SWORD.stableKey,
    MACE.stableKey,
    MEAT.stableKey,
    HELMET.stableKey,
    SWORD.stableKey,
  ];

  it('is the equippable part of the loot the species already drops', () => {
    const set = bandSetFor(lootKeys, [], lookup);

    expect(set.pieces.map((piece) => piece.itemKey)).toEqual([
      HELMET.stableKey,
      MACE.stableKey,
      SWORD.stableKey,
    ]);
    expect(set).toMatchObject({ collected: 0, total: 3 });
  });

  it('counts a piece as found once it has been banked', () => {
    const set = bandSetFor(lootKeys, [HELMET.stableKey], lookup);

    expect(set).toMatchObject({ collected: 1, total: 3 });
    expect(
      set.pieces.find((piece) => piece.itemKey === HELMET.stableKey)?.collected,
    ).toBe(true);
  });
});
