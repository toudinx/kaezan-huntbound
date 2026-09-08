import { describe, expect, it } from 'vitest';

import {
  experienceToReachLevel,
  knightProgressAtExperience,
  knightSheetAtLevel,
  levelForExperience,
} from './knightProgression.ts';

/**
 * The five sheets PB-13-01 authored in `validateSliceSelection.ts`. The curve
 * replaces them at runtime, so what has to stay true is that it lands on the
 * same numbers they froze.
 */
const LADDER = [
  { level: 8, sword: 10, weaponAttack: 14, maxHealth: 185, maxMana: 185 },
  { level: 25, sword: 41, weaponAttack: 14, maxHealth: 440, maxMana: 185 },
  { level: 45, sword: 63, weaponAttack: 14, maxHealth: 740, maxMana: 220 },
  { level: 70, sword: 71, weaponAttack: 30, maxHealth: 1115, maxMana: 345 },
  { level: 130, sword: 90, weaponAttack: 30, maxHealth: 2015, maxMana: 645 },
] as const;

describe('knightSheetAtLevel', () => {
  it.each(LADDER)('reproduces the band sheet at level $level', (band) => {
    const sheet = knightSheetAtLevel(band.level);
    expect(sheet.skills.sword).toBe(band.sword);
    expect(sheet.weaponAttack).toBe(band.weaponAttack);
    expect(sheet.maxHealth).toBe(band.maxHealth);
    expect(sheet.maxMana).toBe(band.maxMana);
  });

  it('starts the character at 150 health with the kit already castable', () => {
    const sheet = knightSheetAtLevel(1);
    expect(sheet.maxHealth).toBe(150);
    expect(sheet.maxMana).toBe(185);
    expect(sheet.skills.sword).toBe(10);
    expect(sheet.weaponItemKey).toBe('item:tibia:sword');
  });

  it('steps to the two handed sword at level 70 and not before', () => {
    expect(knightSheetAtLevel(69).weaponItemKey).toBe('item:tibia:sword');
    expect(knightSheetAtLevel(70).weaponItemKey).toBe(
      'item:tibia:two-handed-sword',
    );
  });

  it('never gives back health or skill on the way up', () => {
    for (let level = 2; level <= 200; level += 1) {
      const previous = knightSheetAtLevel(level - 1);
      const current = knightSheetAtLevel(level);
      expect(current.maxHealth).toBeGreaterThan(previous.maxHealth);
      expect(current.maxMana).toBeGreaterThanOrEqual(previous.maxMana);
      expect(current.skills.sword).toBeGreaterThanOrEqual(
        previous.skills.sword,
      );
    }
  });

  it('rejects a level below 1', () => {
    expect(() => knightSheetAtLevel(0)).toThrow(RangeError);
  });
});

describe('levelForExperience', () => {
  it('starts at level 1 with nothing earned', () => {
    expect(levelForExperience(0)).toBe(1);
    expect(levelForExperience(-1)).toBe(1);
    expect(levelForExperience(49)).toBe(1);
  });

  it('inverts the curve exactly on every boundary', () => {
    for (let level = 1; level <= 200; level += 1) {
      const threshold = experienceToReachLevel(level);
      expect(levelForExperience(threshold)).toBe(level);
      if (level > 1) {
        expect(levelForExperience(threshold - 1)).toBe(level - 1);
      }
    }
  });
});

describe('knightProgressAtExperience', () => {
  it('reports the slice of the current level that is already earned', () => {
    const progress = knightProgressAtExperience(2450 + 100);
    expect(progress.level).toBe(8);
    expect(progress.levelExperience).toBe(2450);
    expect(progress.nextLevelExperience).toBe(3200);
    expect(progress.intoLevel).toBe(100);
    expect(progress.levelSpan).toBe(750);
  });
});

describe('the sheet a set produces', () => {
  it('keeps the innate weapon when nothing is equipped', () => {
    expect(knightSheetAtLevel(35)).toEqual(
      knightSheetAtLevel(35, { weapon: null, armor: 0, defense: 0 }),
    );
  });

  it('replaces the innate weapon with the equipped one, and carries armor', () => {
    const sheet = knightSheetAtLevel(35, {
      weapon: { itemKey: 'item:tibia:sword', attack: 14, trained: true },
      armor: 4,
      defense: 21,
    });

    expect(sheet.weaponItemKey).toBe('item:tibia:sword');
    expect(sheet.weaponAttack).toBe(14);
    expect(sheet.skills.sword).toBe(60);
    expect(sheet.armor).toBe(4);
  });

  it('swings an untrained weapon at the base skill, so attack can mislead', () => {
    const trained = knightSheetAtLevel(35, {
      weapon: { itemKey: 'item:tibia:sword', attack: 14, trained: true },
      armor: 0,
      defense: 0,
    });
    const untrained = knightSheetAtLevel(35, {
      weapon: { itemKey: 'item:tibia:mace', attack: 16, trained: false },
      armor: 0,
      defense: 0,
    });

    expect(trained.skills.sword).toBe(60);
    expect(untrained.skills.sword).toBe(10);
    expect(untrained.weaponAttack).toBeGreaterThan(trained.weaponAttack);
  });
});
