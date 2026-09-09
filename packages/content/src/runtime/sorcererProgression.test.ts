import { describe, expect, it } from 'vitest';

import {
  sorcererLevelForExperience,
  sorcererProgressAtExperience,
  sorcererSheetAtLevel,
} from './sorcererProgression.ts';

describe('sorcererSheetAtLevel', () => {
  it('starts with the authored wand and magic-oriented resource pool', () => {
    expect(sorcererSheetAtLevel(1)).toMatchObject({
      level: 1,
      weaponItemKey: 'item:tibia:wand-of-decay',
      weaponAttack: 8,
      maxHealth: 150,
      maxMana: 200,
      skills: { sword: 10, magic: 0 },
    });
  });

  it('replaces the innate wand with an equipped weapon and keeps armor', () => {
    expect(
      sorcererSheetAtLevel(5, {
        weapon: {
          itemKey: 'item:tibia:wand-of-decay',
          attack: 12,
          trained: true,
        },
        armor: 4,
        defense: 0,
      }),
    ).toMatchObject({
      weaponItemKey: 'item:tibia:wand-of-decay',
      weaponAttack: 12,
      armor: 4,
      maxHealth: 170,
      maxMana: 320,
      skills: { magic: 4 },
    });
  });
});

describe('sorcererLevelForExperience', () => {
  it('inverts the quadratic curve at level boundaries', () => {
    for (let level = 1; level <= 100; level += 1) {
      const threshold = 50 * (level - 1) ** 2;
      expect(sorcererLevelForExperience(threshold)).toBe(level);
      if (level > 1) {
        expect(sorcererLevelForExperience(threshold - 1)).toBe(level - 1);
      }
    }
  });

  it('reports progress inside the current level', () => {
    expect(sorcererProgressAtExperience(50 * 4 ** 2 + 25)).toEqual({
      level: 5,
      experience: 825,
      levelExperience: 800,
      nextLevelExperience: 1_250,
      intoLevel: 25,
      levelSpan: 450,
    });
  });
});
