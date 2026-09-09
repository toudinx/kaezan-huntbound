import { type EquippedStats, UNTRAINED_WEAPON_SKILL } from './equipment.ts';

export const SORCERER_VOCATION_KEY = 'vocation:tibia:sorcerer';
export const SORCERER_FAMILY_KEY = 'vocation-family:huntbound:sorcerer';
export const SORCERER_WAND_ITEM_KEY = 'item:tibia:wand-of-decay';
export const SORCERER_WAND_ATTACK = 8;

const BASE_HEALTH = 150;
const HEALTH_PER_LEVEL = 5;
const BASE_MANA = 200;
const MANA_PER_LEVEL = 30;
const BASE_MAGIC_LEVEL = 0;
const MAGIC_LEVELS_PER_LEVEL = 1;

export interface SorcererSheet {
  readonly level: number;
  readonly skills: {
    readonly sword: number;
    readonly magic: number;
  };
  readonly weaponItemKey: string;
  readonly weaponAttack: number;
  readonly maxHealth: number;
  readonly maxMana: number;
  readonly armor?: number;
}

export interface SorcererProgress {
  readonly level: number;
  readonly experience: number;
  readonly levelExperience: number;
  readonly nextLevelExperience: number;
  readonly intoLevel: number;
  readonly levelSpan: number;
}

function requireLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError(`Character level must be an integer >= 1: ${level}`);
  }
  return level;
}

export function sorcererMagicLevel(level: number): number {
  requireLevel(level);
  return BASE_MAGIC_LEVEL + MAGIC_LEVELS_PER_LEVEL * (level - 1);
}

export function sorcererMaxHealth(level: number): number {
  requireLevel(level);
  return BASE_HEALTH + HEALTH_PER_LEVEL * (level - 1);
}

export function sorcererMaxMana(level: number): number {
  requireLevel(level);
  return BASE_MANA + MANA_PER_LEVEL * (level - 1);
}

export function sorcererSheetAtLevel(
  level: number,
  equipped?: EquippedStats,
): SorcererSheet {
  requireLevel(level);
  const weapon = equipped?.weapon ?? null;
  return {
    level,
    skills: {
      sword: UNTRAINED_WEAPON_SKILL,
      magic: sorcererMagicLevel(level),
    },
    weaponItemKey: weapon?.itemKey ?? SORCERER_WAND_ITEM_KEY,
    weaponAttack: weapon?.attack ?? SORCERER_WAND_ATTACK,
    maxHealth: sorcererMaxHealth(level),
    maxMana: sorcererMaxMana(level),
    ...(equipped !== undefined && equipped.armor > 0
      ? { armor: equipped.armor }
      : {}),
  };
}

function experienceToReachLevel(level: number): number {
  requireLevel(level);
  return 50 * (level - 1) ** 2;
}

export function sorcererLevelForExperience(experience: number): number {
  if (!Number.isFinite(experience) || experience <= 0) return 1;
  let level = 1 + Math.max(0, Math.floor(Math.sqrt(experience / 50)));
  while (experienceToReachLevel(level + 1) <= experience) level += 1;
  while (level > 1 && experienceToReachLevel(level) > experience) level -= 1;
  return level;
}

export function sorcererProgressAtExperience(
  experience: number,
): SorcererProgress {
  const total = Number.isFinite(experience) ? Math.max(0, experience) : 0;
  const level = sorcererLevelForExperience(total);
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
