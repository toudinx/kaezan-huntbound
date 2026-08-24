import {
  type AssetKey,
  createAssetKey,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';
import type { CombatCause } from '../../../../packages/contracts/src/index.ts';

export type CombatFxPlacement =
  | 'target'
  | 'self'
  | 'radius-1'
  | 'radius-3'
  | 'projectile';

export interface CombatFxRecipe {
  readonly impactKey: AssetKey | undefined;
  readonly projectileKey?: AssetKey;
  readonly bloodKey: AssetKey | undefined;
  readonly placement: CombatFxPlacement;
  readonly staggerByDistance: boolean;
  readonly stronger: boolean;
  readonly healNumber: boolean;
  readonly numberColor: string;
}

export interface CombatPostureAura {
  readonly abilityId: 'blood-rage' | 'protector';
  readonly color: number;
  readonly shape: 'open' | 'closed';
}

const hitAreaKey = createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY);
const bloodKey = createAssetKey(HUNT_PACK_BLOOD_EFFECT_KEY);
const magicBlueKey = createAssetKey(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY);

const BY_CAUSE: Readonly<Record<CombatCause, CombatFxRecipe>> = {
  attack: {
    impactKey: hitAreaKey,
    bloodKey,
    placement: 'target',
    staggerByDistance: false,
    stronger: false,
    healNumber: false,
    numberColor: '#ffcf66',
  },
  ability: {
    impactKey: undefined,
    bloodKey: undefined,
    placement: 'target',
    staggerByDistance: false,
    stronger: false,
    healNumber: false,
    numberColor: '#ff7b9d',
  },
};

const BY_ABILITY_ID: Readonly<Record<string, CombatFxRecipe>> = {
  'brutal-strike': {
    impactKey: hitAreaKey,
    bloodKey: undefined,
    placement: 'target',
    staggerByDistance: false,
    stronger: true,
    healNumber: false,
    numberColor: '#ff7b9d',
  },
  // `data/scripts/spells/attack/berserk.lua`: COMBAT_PHYSICALDAMAGE with
  // CONST_ME_HITAREA over AREA_SQUARE1X1. Exori is a swing, not a blue spell.
  berserk: {
    impactKey: hitAreaKey,
    bloodKey,
    placement: 'radius-1',
    staggerByDistance: true,
    stronger: false,
    healNumber: false,
    numberColor: '#ff7b9d',
  },
  groundshaker: {
    // The personal hunt pack has no CONST_ME_GROUNDSHAKER frame yet; keep a
    // dedicated recipe and use the closest physical ground-impact frame.
    impactKey: hitAreaKey,
    bloodKey: undefined,
    placement: 'radius-3',
    staggerByDistance: true,
    stronger: true,
    healNumber: false,
    numberColor: '#ff7b9d',
  },
  'whirlwind-throw': {
    impactKey: hitAreaKey,
    projectileKey: magicBlueKey,
    bloodKey: undefined,
    placement: 'projectile',
    staggerByDistance: false,
    stronger: false,
    healNumber: false,
    numberColor: '#ff7b9d',
  },
  'wound-cleansing': {
    impactKey: magicBlueKey,
    bloodKey: undefined,
    placement: 'self',
    staggerByDistance: false,
    stronger: false,
    healNumber: true,
    numberColor: '#73e6a5',
  },
};

const BY_POSTURE_ABILITY_ID: Readonly<
  Partial<Record<string, CombatPostureAura>>
> = {
  'blood-rage': {
    abilityId: 'blood-rage',
    color: 0xff5a5a,
    shape: 'open',
  },
  protector: {
    abilityId: 'protector',
    color: 0x5c8dff,
    shape: 'closed',
  },
};

const HEAL_RECIPE: CombatFxRecipe = {
  impactKey: undefined,
  bloodKey: undefined,
  placement: 'self',
  staggerByDistance: false,
  stronger: false,
  healNumber: true,
  numberColor: '#73e6a5',
};

export function combatFxForCause(cause: CombatCause): CombatFxRecipe {
  return BY_CAUSE[cause];
}

export function combatFxForAbility(
  abilityId: string,
): CombatFxRecipe | undefined {
  return BY_ABILITY_ID[abilityId];
}

export function combatPostureAuraForAbility(
  abilityId: string,
): CombatPostureAura | undefined {
  return BY_POSTURE_ABILITY_ID[abilityId];
}

export function combatFxForHeal(): CombatFxRecipe {
  return HEAL_RECIPE;
}
