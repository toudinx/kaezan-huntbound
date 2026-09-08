import type { BestiarySpecies, HuntIndex } from '@huntbound/contracts';

/**
 * One short account milestone keeps the first loop legible: the player sees a
 * count, reaches it in a handful of kills, and receives gold rather than a
 * combat modifier. The catalog remains the source of the species list.
 */
export const BESTIARY_TARGET_KILLS = 10;
export const BESTIARY_REWARD_GOLD = 25;

/**
 * Builds the bestiary from the creatures already present in the hunt index.
 * A creature shared by several hunts is still one account entry, and the
 * UTF-16 ordering makes its save/UI projection deterministic.
 */
export function buildBestiaryCatalog(
  index: HuntIndex,
): readonly BestiarySpecies[] {
  const byKey = new Map<string, BestiarySpecies>();
  for (const hunt of index.hunts) {
    for (const creature of hunt.creatures) {
      if (byKey.has(creature.creatureKey)) continue;
      byKey.set(creature.creatureKey, {
        creatureKey: creature.creatureKey,
        displayName: creature.displayName,
        targetKills: BESTIARY_TARGET_KILLS,
        rewardGold: BESTIARY_REWARD_GOLD,
      });
    }
  }

  return [...byKey.values()].sort((left, right) =>
    left.creatureKey === right.creatureKey
      ? 0
      : left.creatureKey < right.creatureKey
        ? -1
        : 1,
  );
}
