import { describe, expect, it } from 'vitest';

import {
  createAssetKey,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';

import {
  combatFxForAbility,
  combatFxForCause,
  combatFxForHeal,
} from './CombatFxTable';

describe('combatFxForCause', () => {
  it('maps a basic attack to hit-area impact and blood on the target', () => {
    expect(combatFxForCause('attack')).toEqual({
      impactKey: createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY),
      bloodKey: createAssetKey(HUNT_PACK_BLOOD_EFFECT_KEY),
      placement: 'target',
      staggerByDistance: false,
      stronger: false,
      healNumber: false,
      numberColor: '#ffcf66',
    });
  });

  it('does not give ability damage a generic impact — that visual is keyed by abilityId', () => {
    expect(combatFxForCause('ability')).toEqual({
      impactKey: undefined,
      bloodKey: undefined,
      placement: 'target',
      staggerByDistance: false,
      stronger: false,
      healNumber: false,
      numberColor: '#ff7b9d',
    });
  });
});

describe('combatFxForAbility', () => {
  it('maps brutal-strike to a stronger hit-area on the target', () => {
    expect(combatFxForAbility('brutal-strike')).toEqual({
      impactKey: createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY),
      bloodKey: undefined,
      placement: 'target',
      staggerByDistance: false,
      stronger: true,
      healNumber: false,
      numberColor: '#ff7b9d',
    });
  });

  it('maps berserk to staggered magic-blue on a radius-1 area', () => {
    expect(combatFxForAbility('berserk')).toEqual({
      impactKey: createAssetKey(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY),
      bloodKey: undefined,
      placement: 'radius-1',
      staggerByDistance: true,
      stronger: false,
      healNumber: false,
      numberColor: '#ff7b9d',
    });
  });

  it('maps wound-cleansing to magic-blue on self with a heal number', () => {
    expect(combatFxForAbility('wound-cleansing')).toEqual({
      impactKey: createAssetKey(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY),
      bloodKey: undefined,
      placement: 'self',
      staggerByDistance: false,
      stronger: false,
      healNumber: true,
      numberColor: '#73e6a5',
    });
  });

  it('returns undefined for an unknown abilityId', () => {
    expect(combatFxForAbility('unknown-spell')).toBeUndefined();
  });

  it('keeps attack, ability, and heal numbers on three distinct table colors', () => {
    expect(
      new Set([
        combatFxForCause('attack').numberColor,
        combatFxForCause('ability').numberColor,
        combatFxForHeal().numberColor,
      ]),
    ).toHaveLength(3);
  });
});
