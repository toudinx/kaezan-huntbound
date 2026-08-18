import { describe, expect, it } from 'vitest';

import {
  createAssetKey,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';

import { combatFxForAbility, combatFxForCause } from './CombatFxTable';

describe('combatFxForCause', () => {
  it('maps a basic attack to hit-area impact and blood on the target', () => {
    expect(combatFxForCause('attack')).toEqual({
      impactKey: createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY),
      bloodKey: createAssetKey(HUNT_PACK_BLOOD_EFFECT_KEY),
      placement: 'target',
      staggerByDistance: false,
      stronger: false,
      healNumber: false,
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
    });
  });

  it('returns undefined for an unknown abilityId', () => {
    expect(combatFxForAbility('unknown-spell')).toBeUndefined();
  });
});
