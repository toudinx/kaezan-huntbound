/**
 * The Knight's persistent progression: how experience becomes a level, and how
 * a level becomes a character sheet.
 *
 * Before this module the sheet was resolved by hunt -- five authored rows in
 * `validateSliceSelection.ts`, one per hunting place, so changing hunt changed
 * character. Those five rows stay where they are, but as the **calibration** of
 * the curve below rather than a table consulted at runtime: every anchor they
 * froze is reproduced here by formula, and the tests assert exactly that.
 *
 * ## The stat curve
 *
 * Health is Canary's, not invented: `healthmax = 150` at level 1, `gainhp = 5`
 * for levels 2-8 and the Knight's `gainhp = 15` from 9 on
 * (`docs/content/HUNT_BANDS.md` section 4). That is `HP(8) = 185` and
 * `HP(L) = 185 + 15 * (L - 8)` above it, which lands on 440 / 740 / 1115 / 2015
 * at the five band levels.
 *
 * Sword is the ordinary trained knight's skill, interpolated between the three
 * anchors the docs froze: 10 at level 8, 60 at 35, 90 at 130. Floored, that is
 * 41 at 25, 63 at 45 and 71 at 70 -- the PB-13-01 ladder, to the unit. Below
 * level 8 it holds at 10, the base skill a knight is created with; above 130 it
 * keeps the 35->130 slope rather than stopping, because a level cap is not this
 * task's to invent.
 *
 * Mana is `max(185, 35 + 5 * (L - 8))`. 185 is the floor PB-05 froze so that
 * every action in the five-spell kit stays individually castable -- Groundshaker
 * alone costs 160, and V0 has no potions -- and `35 + 5 * (L - 8)` is Canary's
 * own knight pool, which crosses that floor at level 38 and reaches 645 at 130,
 * the number the Hero Cave sheet already carried.
 *
 * The weapon steps once, at level 70: the plain sword (attack 14) up to there,
 * the two handed sword (attack 30) from there on, which is where the PB-13-01
 * ladder put it. That pair is now the *innate* weapon -- what a Knight swings
 * with an empty hand -- and PB-13-04 lets an equipped one replace it. Keeping
 * it rather than starting the player at attack 0 is decision 3 read literally:
 * the character is born able to play, and gear is what makes them better.
 *
 * A weapon whose `weaponType` is not `sword` swings at
 * `UNTRAINED_WEAPON_SKILL` instead of the curve. The Knight trains one skill;
 * picking up a mace does not un-train it, it just does not use it, which is
 * what makes a higher-attack club the piece you sell rather than the upgrade.
 *
 * ## The experience curve
 *
 * `experienceToReachLevel(L) = 50 * (L - 1)^2`. Each level therefore costs
 * `50 * (2L - 3)` more experience than the one before it -- a straight line, so
 * the ramp never turns into a wall.
 *
 * The scale is calibrated against the `experiencePerHour` the generated hunt
 * index already carries for each band, which is the only rate measurement this
 * repository has. Farming each band at its own rate:
 *
 * | Stretch | Rate | Cost | Huntbound | Tibia |
 * |---|---:|---:|---:|---:|
 * | 1 -> 8 | 32 000 | 2 450 | 4,6 min | 8 min |
 * | 8 -> 25 | 32 000 | 26 350 | 49 min | 6,3 h |
 * | 25 -> 45 | 150 549 | 68 000 | 27 min | 7,5 h |
 * | 45 -> 70 | 114 000 | 141 250 | 74 min | 34,4 h |
 * | 70 -> 130 | 868 000 | 594 000 | 41 min | 34,2 h |
 * | **total** | | **832 050** | **3,3 h** | **82,5 h** |
 *
 * Tibia's own formula is the right-hand column and is not adopted: decision 4
 * of the PB-13 README makes the *set* the axis of progression and the level
 * merely its rhythm, and 34 hours parked in Cyclopolis is the opposite of that.
 * Three hours to cross all five bands is a rhythm; it is also short enough that
 * the interesting question stays "have I finished this band's set" rather than
 * "have I finished this band's bar".
 */

import { type EquippedStats, UNTRAINED_WEAPON_SKILL } from './equipment.ts';

const BASE_SWORD_SKILL = 10;
const SWORD_ANCHOR_LEVEL = 35;
const SWORD_ANCHOR_SKILL = 60;
const SWORD_TOP_LEVEL = 130;
const SWORD_TOP_SKILL = 90;

const BASE_HEALTH = 150;
const EARLY_HEALTH_PER_LEVEL = 5;
const KNIGHT_HEALTH_PER_LEVEL = 15;
const KNIGHT_GAIN_LEVEL = 8;

const MANA_FLOOR = 185;
const CANARY_MANA_AT_GAIN_LEVEL = 35;
const MANA_PER_LEVEL = 5;

const TWO_HANDED_LEVEL = 70;
const SWORD_ITEM_KEY = 'item:tibia:sword';
const SWORD_ATTACK = 14;
const TWO_HANDED_SWORD_ITEM_KEY = 'item:tibia:two-handed-sword';
const TWO_HANDED_SWORD_ATTACK = 30;

/** Experience for level 2, and the unit the whole curve is scaled in. */
export const KNIGHT_EXPERIENCE_UNIT = 50;

/** The stats the ladder moves, for one level. */
export interface KnightSheet {
  readonly level: number;
  readonly skills: { readonly sword: number; readonly magic: number };
  readonly weaponItemKey: string;
  readonly weaponAttack: number;
  readonly maxHealth: number;
  readonly maxMana: number;
  /** Present only when the character wears something. */
  readonly armor?: number;
}

/** Where a character stands inside its current level. */
export interface KnightProgress {
  readonly level: number;
  readonly experience: number;
  /** Total experience the current level started at. */
  readonly levelExperience: number;
  /** Total experience the next level starts at. */
  readonly nextLevelExperience: number;
  /** Experience earned since the current level began. */
  readonly intoLevel: number;
  /** Experience the current level costs end to end. */
  readonly levelSpan: number;
}

function requireLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError(`Character level must be an integer >= 1: ${level}`);
  }
  return level;
}

export function knightSwordSkill(level: number): number {
  requireLevel(level);
  if (level <= KNIGHT_GAIN_LEVEL) {
    return BASE_SWORD_SKILL;
  }
  if (level <= SWORD_ANCHOR_LEVEL) {
    return Math.floor(
      BASE_SWORD_SKILL +
        ((SWORD_ANCHOR_SKILL - BASE_SWORD_SKILL) *
          (level - KNIGHT_GAIN_LEVEL)) /
          (SWORD_ANCHOR_LEVEL - KNIGHT_GAIN_LEVEL),
    );
  }
  return Math.floor(
    SWORD_ANCHOR_SKILL +
      ((SWORD_TOP_SKILL - SWORD_ANCHOR_SKILL) * (level - SWORD_ANCHOR_LEVEL)) /
        (SWORD_TOP_LEVEL - SWORD_ANCHOR_LEVEL),
  );
}

export function knightMaxHealth(level: number): number {
  requireLevel(level);
  if (level <= KNIGHT_GAIN_LEVEL) {
    return BASE_HEALTH + EARLY_HEALTH_PER_LEVEL * (level - 1);
  }
  return (
    BASE_HEALTH +
    EARLY_HEALTH_PER_LEVEL * (KNIGHT_GAIN_LEVEL - 1) +
    KNIGHT_HEALTH_PER_LEVEL * (level - KNIGHT_GAIN_LEVEL)
  );
}

export function knightMaxMana(level: number): number {
  requireLevel(level);
  return Math.max(
    MANA_FLOOR,
    CANARY_MANA_AT_GAIN_LEVEL + MANA_PER_LEVEL * (level - KNIGHT_GAIN_LEVEL),
  );
}

export function knightSheetAtLevel(
  level: number,
  equipped?: EquippedStats,
): KnightSheet {
  requireLevel(level);
  const twoHanded = level >= TWO_HANDED_LEVEL;
  const weapon = equipped?.weapon ?? null;
  const trained = weapon === null || weapon.trained;
  return {
    level,
    skills: {
      sword: trained ? knightSwordSkill(level) : UNTRAINED_WEAPON_SKILL,
      magic: 0,
    },
    weaponItemKey:
      weapon?.itemKey ??
      (twoHanded ? TWO_HANDED_SWORD_ITEM_KEY : SWORD_ITEM_KEY),
    weaponAttack:
      weapon?.attack ?? (twoHanded ? TWO_HANDED_SWORD_ATTACK : SWORD_ATTACK),
    maxHealth: knightMaxHealth(level),
    maxMana: knightMaxMana(level),
    ...(equipped !== undefined && equipped.armor > 0
      ? { armor: equipped.armor }
      : {}),
  };
}

export function experienceToReachLevel(level: number): number {
  requireLevel(level);
  return KNIGHT_EXPERIENCE_UNIT * (level - 1) ** 2;
}

/**
 * The inverse of the curve, corrected by comparison rather than trusted from
 * `Math.sqrt`: a level that flickers at its own boundary because a float came
 * back one ulp short would show as a level lost on reload.
 */
export function levelForExperience(experience: number): number {
  if (!Number.isFinite(experience) || experience <= 0) {
    return 1;
  }
  let level =
    1 + Math.max(0, Math.floor(Math.sqrt(experience / KNIGHT_EXPERIENCE_UNIT)));
  while (experienceToReachLevel(level + 1) <= experience) {
    level += 1;
  }
  while (level > 1 && experienceToReachLevel(level) > experience) {
    level -= 1;
  }
  return level;
}

export function knightProgressAtExperience(experience: number): KnightProgress {
  const total = Number.isFinite(experience) ? Math.max(0, experience) : 0;
  const level = levelForExperience(total);
  const levelExperience = experienceToReachLevel(level);
  const nextLevelExperience = experienceToReachLevel(level + 1);
  return {
    level,
    experience: total,
    levelExperience,
    nextLevelExperience,
    intoLevel: total - levelExperience,
    levelSpan: nextLevelExperience - levelExperience,
  };
}
