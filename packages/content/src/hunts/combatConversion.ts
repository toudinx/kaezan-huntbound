import type {
  CharacterDefinition,
  SpellDefinition,
  SpellFormulaDefinition,
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
 * They live here as constants and not on `VocationDefinition` because V0 ships
 * one vocation. The day a second one arrives these four numbers move into the
 * vocation slice of the catalog and this block goes away.
 */
export const KNIGHT_HEALTH_REGEN_MS = 6000;
export const KNIGHT_HEALTH_REGEN_AMOUNT = 1;
export const KNIGHT_RESOURCE_REGEN_MS = 6000;
export const KNIGHT_RESOURCE_REGEN_AMOUNT = 2;

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

export function resolveSpellPower(
  formula: SpellFormulaDefinition,
  character: CharacterDefinition,
): { readonly minPower: number; readonly maxPower: number } {
  switch (formula.kind) {
    case 'skillAttack':
      return skillAttackPower(
        formula,
        character.level,
        character.skills.sword,
        character.weaponAttack,
      );
    case 'skillAttackProduct':
      return skillAttackProductPower(
        formula,
        character.level,
        character.skills.sword,
        character.weaponAttack,
      );
    case 'levelMagic':
      return levelMagicPower(formula, character.level, character.skills.magic);
  }
}

export function abilityIdFromSpellKey(spellKey: string): string {
  const separator = spellKey.lastIndexOf(':');
  return separator === -1 ? spellKey : spellKey.slice(separator + 1);
}

export function abilityShapeFromSpell(spell: SpellDefinition): {
  readonly shape: 'self' | 'target' | 'area';
  readonly radius: number;
  readonly rangeTiles: number;
} {
  if (spell.area !== undefined) {
    return {
      shape: 'area',
      radius: spell.area.radiusTiles,
      rangeTiles: 0,
    };
  }
  if (spell.damageType === 'healing') {
    return { shape: 'self', radius: 0, rangeTiles: 0 };
  }
  return { shape: 'target', radius: 0, rangeTiles: MELEE_RANGE_TILES };
}

export function compareContentKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
