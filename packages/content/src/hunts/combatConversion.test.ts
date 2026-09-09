import type {
  CharacterDefinition,
  ContentKey,
  ItemDefinition,
  SpellDefinition,
  VocationFamilyKey,
} from '@huntbound/contracts';
import { createContentGuid } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  abilityShapeFromSpell,
  distanceWeaponDamage,
  knightMeleeDamage,
  playerAutoAttack,
  resolveSpellPower,
} from './combatConversion.ts';

const knight: CharacterDefinition = {
  stableKey: 'character:huntbound:knight-venore-rotworm-cave',
  vocationKey: 'vocation:tibia:knight' as ContentKey,
  level: 8,
  skills: { sword: 10, magic: 0 },
  weaponItemKey: 'item:tibia:sword' as ContentKey,
  weaponAttack: 14,
  maxHealth: 185,
  maxMana: 185,
  spellKeys: ['spell:tibia:berserk' as ContentKey],
};

describe('resolveSpellPower', () => {
  const skillAttack = {
    kind: 'skillAttack' as const,
    levelFactor: 0.2,
    minSkillAttackFactor: 0.5,
    maxSkillAttackFactor: 1.5,
    finalMultiplier: 1.1,
  };

  it('keeps reading sword when the formula omits skill', () => {
    expect(resolveSpellPower(skillAttack, knight)).toEqual(
      resolveSpellPower({ ...skillAttack, skill: 'sword' }, knight),
    );
  });

  it('reads distance when the formula declares it', () => {
    const paladin = {
      ...knight,
      skills: { sword: 10, magic: 0, distance: 60 },
    };
    const swordPower = resolveSpellPower(skillAttack, paladin);
    const distancePower = resolveSpellPower(
      { ...skillAttack, skill: 'distance' },
      paladin,
    );
    expect(distancePower.maxPower).toBeGreaterThan(swordPower.maxPower);
  });
});

describe('abilityShapeFromSpell', () => {
  const base = {
    guid: createContentGuid('spell', 'tibia', 'fire-wave'),
    stableKey: 'spell:tibia:fire-wave' as ContentKey,
    displayName: 'Fire Wave',
    includedFacets: ['identity', 'spell'] as const,
    words: 'exevo flam hur',
    level: 18,
    mana: 25,
    cooldownMs: 4000,
    groupCooldownMs: 2000,
    damageType: 'fire' as const,
    allowedVocationFamilies: [
      'vocation-family:huntbound:sorcerer' as VocationFamilyKey,
    ],
    formula: {
      kind: 'levelMagic' as const,
      levelFactor: 0.2,
      minMagicFactor: 1,
      maxMagicFactor: 2,
      minAddend: 1,
      maxAddend: 2,
    },
  } satisfies SpellDefinition;

  it('maps a cone area to the cone ability shape', () => {
    expect(
      abilityShapeFromSpell({
        ...base,
        area: { shape: 'cone', radiusTiles: 4 },
      }),
    ).toEqual({ shape: 'cone', radius: 4, rangeTiles: 0 });
  });

  it('maps a target-square area to target-area with the spell range', () => {
    expect(
      abilityShapeFromSpell({
        ...base,
        stableKey: 'spell:tibia:great-fireball' as ContentKey,
        rangeTiles: 4,
        area: { shape: 'target-square', radiusTiles: 1 },
      }),
    ).toEqual({ shape: 'target-area', radius: 1, rangeTiles: 4 });
  });
});

describe('playerAutoAttack', () => {
  it('keeps Knight melee numbers for a sword without a catalog range', () => {
    expect(playerAutoAttack(knight, undefined)).toEqual({
      ...knightMeleeDamage(8, 10, 14),
      rangeTiles: 1,
    });
  });

  it('uses distance skill and weapon range for a distance weapon', () => {
    const paladin = {
      ...knight,
      skills: { sword: 10, magic: 0, distance: 60 },
      weaponAttack: 25,
    };
    const spear = {
      guid: createContentGuid('item', 'tibia', 'spear'),
      stableKey: 'item:tibia:spear' as ContentKey,
      displayName: 'spear',
      includedFacets: ['identity', 'item'] as const,
      weaponType: 'distance',
      rangeTiles: 6,
    } satisfies ItemDefinition;
    expect(playerAutoAttack(paladin, spear)).toEqual({
      ...distanceWeaponDamage(8, 60, 25),
      rangeTiles: 6,
    });
  });
});
