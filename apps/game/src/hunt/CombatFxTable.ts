import {
  type AssetKey,
  createAssetKey,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';
import type { CombatCause } from '../../../../packages/contracts/src/index.ts';

export type CombatFxPlacement = 'target' | 'self' | 'radius-1';

export interface CombatFxRecipe {
  readonly impactKey: AssetKey | undefined;
  readonly bloodKey: AssetKey | undefined;
  readonly placement: CombatFxPlacement;
  readonly staggerByDistance: boolean;
  readonly stronger: boolean;
  readonly healNumber: boolean;
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
  },
  ability: {
    impactKey: undefined,
    bloodKey: undefined,
    placement: 'target',
    staggerByDistance: false,
    stronger: false,
    healNumber: false,
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
  },
  berserk: {
    impactKey: magicBlueKey,
    bloodKey: undefined,
    placement: 'radius-1',
    staggerByDistance: true,
    stronger: false,
    healNumber: false,
  },
  'wound-cleansing': {
    impactKey: magicBlueKey,
    bloodKey: undefined,
    placement: 'self',
    staggerByDistance: false,
    stronger: false,
    healNumber: true,
  },
};

export function combatFxForCause(cause: CombatCause): CombatFxRecipe {
  return BY_CAUSE[cause];
}

export function combatFxForAbility(
  abilityId: string,
): CombatFxRecipe | undefined {
  return BY_ABILITY_ID[abilityId];
}
