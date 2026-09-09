import type {
  CharacterDefinition,
  CombatElement,
  ItemDefinition,
  SpellDefinition,
  SpellFormulaDefinition,
  VocationDefinition,
} from '@huntbound/contracts';

/** Frozen in `docs/content/PB-05-SELECTION.md`. */
export const TICK_DURATION_MS = 50;

/** `Creature::setParent` ground-speed fallback. */
const GROUND_SPEED_MS = 150;

/** `SERVER_BEAT` in `src/game/game.hpp`. */
const SERVER_BEAT_MS = 50;

/** `speedA` / `speedB` / `speedC` in `creature.hpp`. */
const SPEED_A = 857.36;
const SPEED_B = 261.29;
const SPEED_C = -4795.01;

/** `Weapons::getMaxWeaponDamage` melee factor; fightMode offensive. */
const MELEE_ATTACK_FACTOR = 1.0;
const MELEE_DAMAGE_MULTIPLIER = 1.0;
const MELEE_MAX_COEFFICIENT = 0.085;

/**
 * `data/XML/vocations.xml`, vocation `4` (Knight): `gainhpticks="6000"`,
 * `gainhpamount="1"`, `gainmanaticks="6000"`, `gainmanaamount="2"`.
 *
 * Defaults for a vocation slice that omits the regen fields, so the Knight
 * sheet stays identical until another vocation fills its own numbers.
 */
export const KNIGHT_HEALTH_REGEN_MS = 6000;
export const KNIGHT_HEALTH_REGEN_AMOUNT = 1;
export const KNIGHT_RESOURCE_REGEN_MS = 6000;
export const KNIGHT_RESOURCE_REGEN_AMOUNT = 2;
/** Huntbound out-of-combat regime. In-combat numbers above stay Canary. */
export const KNIGHT_OUT_OF_COMBAT_HEALTH_REGEN_MS = 500;
export const KNIGHT_OUT_OF_COMBAT_HEALTH_REGEN_AMOUNT = 1;
export const KNIGHT_OUT_OF_COMBAT_RESOURCE_REGEN_MS = 500;
export const KNIGHT_OUT_OF_COMBAT_RESOURCE_REGEN_AMOUNT = 2;
/** 4 s after the last received hit still counts as in combat. */
export const KNIGHT_COMBAT_WINDOW_MS = 4000;
/** 100‰ = 10% of applied damage. ROTATIONS.md did not freeze a permille. */
export const KNIGHT_LIFE_LEECH_PERMILLE = 100;
export const KNIGHT_MANA_LEECH_PERMILLE = 100;

export const PLAYER_FACTION_ID = 0;
export const CREATURE_FACTION_ID = 1;

/** Chebyshev melee range frozen in the PB-05 spec. */
export const MELEE_RANGE_TILES = 1;

/** `MAP_MAX_VIEW_PORT_X = 8 + 3`, `MAP_MAX_VIEW_PORT_Y = 6 + 5`: 11 em ambos os eixos,
 *  logo Chebyshev 11 é exatamente o retângulo do Canary. */
export const CANARY_VIEW_RANGE_TILES = 11;

export function luaToInt32(value: number): number {
  return Math.trunc(value);
}

export function ticksFromIntervalMs(intervalMs: number): number | null {
  if (intervalMs % TICK_DURATION_MS !== 0) {
    return null;
  }
  return intervalMs / TICK_DURATION_MS;
}

export function stepCooldownTicksFromSpeed(speed: number): number | null {
  const calculatedStepSpeed = Math.max(
    Math.floor(SPEED_A * Math.log(speed + SPEED_B) + SPEED_C + 0.5),
    1,
  );
  const durationRawMs = Math.floor(
    (1000 * GROUND_SPEED_MS) / calculatedStepSpeed,
  );
  const durationMs = Math.ceil(durationRawMs / SERVER_BEAT_MS) * SERVER_BEAT_MS;
  return ticksFromIntervalMs(durationMs);
}

export function knightMeleeDamage(
  level: number,
  skill: number,
  attack: number,
): { readonly minPower: number; readonly maxPower: number } {
  return skillWeaponDamage(level, skill, attack);
}

/**
 * Distance auto-attack. Same frozen melee coefficient until a Paladin import
 * proves `distDamage` differs from the Knight's `meleeDamage` of 1.0.
 */
export function distanceWeaponDamage(
  level: number,
  skill: number,
  attack: number,
): { readonly minPower: number; readonly maxPower: number } {
  return skillWeaponDamage(level, skill, attack);
}

function skillWeaponDamage(
  level: number,
  skill: number,
  attack: number,
): { readonly minPower: number; readonly maxPower: number } {
  const levelTotal = Math.trunc(level / 5);
  return {
    minPower: levelTotal,
    maxPower: Math.round(
      MELEE_MAX_COEFFICIENT *
        MELEE_ATTACK_FACTOR *
        MELEE_DAMAGE_MULTIPLIER *
        attack *
        skill +
        levelTotal,
    ),
  };
}

function skillAttackPower(
  formula: Extract<SpellFormulaDefinition, { kind: 'skillAttack' }>,
  level: number,
  skill: number,
  attack: number,
): { readonly minPower: number; readonly maxPower: number } {
  const min = -(
    (level * formula.levelFactor +
      (skill + attack) * formula.minSkillAttackFactor) *
    formula.finalMultiplier
  );
  const max = -(
    (level * formula.levelFactor +
      (skill + attack) * formula.maxSkillAttackFactor) *
    formula.finalMultiplier
  );
  return {
    minPower: Math.abs(luaToInt32(min)),
    maxPower: Math.abs(luaToInt32(max)),
  };
}

function skillAttackProductPower(
  formula: Extract<SpellFormulaDefinition, { kind: 'skillAttackProduct' }>,
  level: number,
  skill: number,
  attack: number,
): { readonly minPower: number; readonly maxPower: number } {
  const skillTotal = skill * attack;
  const levelTotal = level * formula.levelFactor;
  const min = -(
    (skillTotal * formula.minSkillAttackFactor +
      formula.minAddend +
      levelTotal) *
    formula.finalMultiplier
  );
  const max = -(
    (skillTotal * formula.maxSkillAttackFactor +
      formula.maxAddend +
      levelTotal) *
    formula.finalMultiplier
  );
  return {
    minPower: Math.abs(luaToInt32(min)),
    maxPower: Math.abs(luaToInt32(max)),
  };
}

function levelMagicPower(
  formula: Extract<SpellFormulaDefinition, { kind: 'levelMagic' }>,
  level: number,
  magicLevel: number,
): { readonly minPower: number; readonly maxPower: number } {
  const min =
    level * formula.levelFactor +
    magicLevel * formula.minMagicFactor +
    formula.minAddend;
  const max =
    level * formula.levelFactor +
    magicLevel * formula.maxMagicFactor +
    formula.maxAddend;
  return {
    minPower: luaToInt32(min),
    maxPower: luaToInt32(max),
  };
}

function formulaWeaponSkill(
  formula: Extract<
    SpellFormulaDefinition,
    { kind: 'skillAttack' | 'skillAttackProduct' }
  >,
): 'sword' | 'distance' {
  return formula.skill ?? 'sword';
}

function characterWeaponSkill(
  character: CharacterDefinition,
  skill: 'sword' | 'distance',
): number {
  if (skill === 'distance') {
    return character.skills.distance ?? 0;
  }
  return character.skills.sword;
}

export function resolveSpellPower(
  formula: SpellFormulaDefinition,
  character: CharacterDefinition,
): { readonly minPower: number; readonly maxPower: number } {
  switch (formula.kind) {
    case 'skillAttack':
      return skillAttackPower(
        formula,
        character.level,
        characterWeaponSkill(character, formulaWeaponSkill(formula)),
        character.weaponAttack,
      );
    case 'skillAttackProduct':
      return skillAttackProductPower(
        formula,
        character.level,
        characterWeaponSkill(character, formulaWeaponSkill(formula)),
        character.weaponAttack,
      );
    case 'levelMagic':
      return levelMagicPower(formula, character.level, character.skills.magic);
  }
}

export function combatElementFromDamageType(
  damageType: SpellDefinition['damageType'],
): CombatElement {
  if (damageType === 'healing') {
    return 'physical';
  }
  return damageType;
}

export function abilityIdFromSpellKey(spellKey: string): string {
  const separator = spellKey.lastIndexOf(':');
  return separator === -1 ? spellKey : spellKey.slice(separator + 1);
}

export function abilityShapeFromSpell(spell: SpellDefinition): {
  readonly shape: 'self' | 'target' | 'area' | 'cone' | 'target-area';
  readonly radius: number;
  readonly rangeTiles: number;
} {
  if (spell.area !== undefined) {
    if (spell.area.shape === 'cone') {
      return {
        shape: 'cone',
        radius: spell.area.radiusTiles,
        rangeTiles: 0,
      };
    }
    if (spell.area.shape === 'target-square') {
      return {
        shape: 'target-area',
        radius: spell.area.radiusTiles,
        rangeTiles: spell.rangeTiles ?? MELEE_RANGE_TILES,
      };
    }
    return {
      shape: 'area',
      radius: spell.area.radiusTiles,
      rangeTiles: 0,
    };
  }
  if (spell.damageType === 'healing') {
    return { shape: 'self', radius: 0, rangeTiles: 0 };
  }
  return {
    shape: 'target',
    radius: 0,
    rangeTiles: spell.rangeTiles ?? MELEE_RANGE_TILES,
  };
}

const DISTANCE_WEAPON_TYPE = 'distance';
const WAND_WEAPON_TYPES: ReadonlySet<string> = new Set(['wand', 'rod']);

export interface PlayerAutoAttack {
  readonly minPower: number;
  readonly maxPower: number;
  readonly rangeTiles: number;
}

export function playerAutoAttack(
  character: CharacterDefinition,
  weapon: ItemDefinition | undefined,
): PlayerAutoAttack {
  if (weapon !== undefined && WAND_WEAPON_TYPES.has(weapon.weaponType ?? '')) {
    const minPower = weapon.minDamage ?? weapon.attack ?? 0;
    const maxPower = weapon.maxDamage ?? weapon.attack ?? minPower;
    return {
      minPower,
      maxPower: maxPower < minPower ? minPower : maxPower,
      rangeTiles: weapon.rangeTiles ?? MELEE_RANGE_TILES,
    };
  }
  if (weapon !== undefined && weapon.weaponType === DISTANCE_WEAPON_TYPE) {
    return {
      ...distanceWeaponDamage(
        character.level,
        character.skills.distance ?? 0,
        character.weaponAttack,
      ),
      rangeTiles: weapon.rangeTiles ?? MELEE_RANGE_TILES,
    };
  }
  return {
    ...knightMeleeDamage(
      character.level,
      character.skills.sword,
      character.weaponAttack,
    ),
    rangeTiles: MELEE_RANGE_TILES,
  };
}

export function vocationCombatNumbers(vocation: VocationDefinition): {
  readonly healthRegenMs: number;
  readonly healthRegenAmount: number;
  readonly resourceRegenMs: number;
  readonly resourceRegenAmount: number;
  readonly outOfCombatHealthRegenMs: number;
  readonly outOfCombatHealthRegenAmount: number;
  readonly outOfCombatResourceRegenMs: number;
  readonly outOfCombatResourceRegenAmount: number;
  readonly combatWindowMs: number;
  readonly lifeLeechPermille: number;
  readonly manaLeechPermille: number;
} {
  return {
    healthRegenMs: vocation.healthRegenMs ?? KNIGHT_HEALTH_REGEN_MS,
    healthRegenAmount: vocation.healthRegenAmount ?? KNIGHT_HEALTH_REGEN_AMOUNT,
    resourceRegenMs: vocation.manaRegenMs ?? KNIGHT_RESOURCE_REGEN_MS,
    resourceRegenAmount:
      vocation.manaRegenAmount ?? KNIGHT_RESOURCE_REGEN_AMOUNT,
    outOfCombatHealthRegenMs:
      vocation.outOfCombatHealthRegenMs ?? KNIGHT_OUT_OF_COMBAT_HEALTH_REGEN_MS,
    outOfCombatHealthRegenAmount:
      vocation.outOfCombatHealthRegenAmount ??
      KNIGHT_OUT_OF_COMBAT_HEALTH_REGEN_AMOUNT,
    outOfCombatResourceRegenMs:
      vocation.outOfCombatManaRegenMs ?? KNIGHT_OUT_OF_COMBAT_RESOURCE_REGEN_MS,
    outOfCombatResourceRegenAmount:
      vocation.outOfCombatManaRegenAmount ??
      KNIGHT_OUT_OF_COMBAT_RESOURCE_REGEN_AMOUNT,
    combatWindowMs: vocation.combatWindowMs ?? KNIGHT_COMBAT_WINDOW_MS,
    lifeLeechPermille: vocation.lifeLeechPermille ?? KNIGHT_LIFE_LEECH_PERMILLE,
    manaLeechPermille: vocation.manaLeechPermille ?? KNIGHT_MANA_LEECH_PERMILLE,
  };
}

export function compareContentKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
