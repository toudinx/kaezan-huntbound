import type {
  AchievementDefinition,
  AchievementMetric,
  AchievementProgress,
  SaveDraft,
} from '@huntbound/contracts';

/** A successful state transition that can move an achievement forward. */
export type AchievementEvent = 'hunt-completed' | 'item-equipped' | 'item-sold';

export interface AchievementUpdate {
  readonly achievementId: string;
  readonly displayName: string;
  readonly progress: number;
  readonly target: number;
  readonly completed: boolean;
  /** Gold paid by this refresh, zero when the ledger already claimed it. */
  readonly rewardGold: number;
  readonly newlyCompleted: boolean;
}

function compareAchievementIds(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function validateDefinition(definition: AchievementDefinition): void {
  if (definition.achievementId.length === 0) {
    throw new RangeError('Achievement ID must not be empty');
  }
  if (definition.displayName.length === 0) {
    throw new RangeError(
      `Achievement display name must not be empty: ${definition.achievementId}`,
    );
  }
  if (definition.description.length === 0) {
    throw new RangeError(
      `Achievement description must not be empty: ${definition.achievementId}`,
    );
  }
  if (!Number.isSafeInteger(definition.target) || definition.target <= 0) {
    throw new RangeError(
      `Achievement target must be a positive safe integer: ${definition.achievementId}`,
    );
  }
  if (
    !Number.isSafeInteger(definition.rewardGold) ||
    definition.rewardGold < 0
  ) {
    throw new RangeError(
      `Achievement rewardGold must be a non-negative safe integer: ${definition.achievementId}`,
    );
  }
}

function validateMetric(metric: AchievementMetric): void {
  if (
    metric !== 'completed-runs' &&
    metric !== 'equipped-slots' &&
    metric !== 'sold-items' &&
    metric !== 'experience' &&
    metric !== 'bestiary-species'
  ) {
    throw new RangeError(`Unknown achievement metric: ${metric}`);
  }
}

function countEquippedSlots(draft: SaveDraft): number {
  return Object.values(draft.character.equipment).filter(
    (itemKey) => itemKey !== null,
  ).length;
}

function countCompletedBestiarySpecies(draft: SaveDraft): number {
  return draft.character.bestiary.filter((entry) => entry.rewardClaimed).length;
}

function stateProgressFor(
  metric: AchievementMetric,
  draft: SaveDraft,
  current: AchievementProgress | undefined,
  event: AchievementEvent | undefined,
): number {
  switch (metric) {
    case 'completed-runs':
      return draft.completedRuns;
    case 'equipped-slots':
      return countEquippedSlots(draft);
    case 'sold-items':
      return (current?.progress ?? 0) + (event === 'item-sold' ? 1 : 0);
    case 'experience':
      return draft.character.experience;
    case 'bestiary-species':
      return countCompletedBestiarySpecies(draft);
  }
}

function sameProgress(
  left: AchievementProgress | undefined,
  right: AchievementProgress,
): boolean {
  return (
    left?.achievementId === right.achievementId &&
    left.progress === right.progress &&
    left.rewardClaimed === right.rewardClaimed
  );
}

/**
 * Reconciles the sparse achievement ledger with the facts already present in
 * the save and pays newly completed objectives in the same transaction.
 *
 * There is deliberately no account-wide sales counter here. The one sale
 * objective consumes the successful `item-sold` event, while all other
 * objectives read completed runs, worn slots, experience, or bestiary state
 * that the loop already persists.
 */
export function refreshAchievements(
  draft: SaveDraft,
  definitions: readonly AchievementDefinition[],
  event?: AchievementEvent,
): readonly AchievementUpdate[] {
  if (!Number.isSafeInteger(draft.gold) || draft.gold < 0) {
    throw new RangeError(`Achievement wallet is invalid: ${draft.gold}`);
  }

  const definitionsById = new Map<string, AchievementDefinition>();
  for (const definition of definitions) {
    validateDefinition(definition);
    validateMetric(definition.metric);
    if (definitionsById.has(definition.achievementId)) {
      throw new RangeError(
        `Achievement ID is duplicated: ${definition.achievementId}`,
      );
    }
    definitionsById.set(definition.achievementId, definition);
  }

  const currentById = new Map(
    draft.character.achievements.map((entry) => [entry.achievementId, entry]),
  );
  const nextById = new Map(currentById);
  const updates: AchievementUpdate[] = [];

  for (const definition of definitions) {
    const current = currentById.get(definition.achievementId);
    const observed = stateProgressFor(definition.metric, draft, current, event);
    const progress = current?.rewardClaimed
      ? Math.max(definition.target, current.progress, observed)
      : Math.min(definition.target, observed);
    const newlyCompleted =
      progress >= definition.target && !(current?.rewardClaimed ?? false);
    const rewardGold = newlyCompleted ? definition.rewardGold : 0;

    if (rewardGold > 0) {
      const nextGold = draft.gold + rewardGold;
      if (!Number.isSafeInteger(nextGold)) {
        throw new RangeError(
          `Achievement reward overflows the wallet: ${definition.achievementId}`,
        );
      }
      draft.gold = nextGold;
    }

    const next: AchievementProgress = {
      achievementId: definition.achievementId,
      progress,
      rewardClaimed:
        (current?.rewardClaimed ?? false) || progress >= definition.target,
    };
    if (current !== undefined || progress > 0 || next.rewardClaimed) {
      nextById.set(definition.achievementId, next);
    }

    updates.push({
      achievementId: definition.achievementId,
      displayName: definition.displayName,
      progress,
      target: definition.target,
      completed: next.rewardClaimed,
      rewardGold,
      newlyCompleted,
    });
  }

  const nextAchievements = [...nextById.values()].sort((left, right) =>
    compareAchievementIds(left.achievementId, right.achievementId),
  );
  const changed =
    nextAchievements.length !== draft.character.achievements.length ||
    nextAchievements.some(
      (entry, index) =>
        !sameProgress(draft.character.achievements[index], entry),
    );
  if (changed) {
    draft.character = {
      ...draft.character,
      achievements: nextAchievements,
    };
  }

  return updates;
}
