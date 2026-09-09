import type {
  BestiaryProgress,
  BestiarySpecies,
  SaveDraft,
} from '@huntbound/contracts';

export interface BestiaryCreditResult {
  readonly credited: boolean;
  readonly creatureKey: string;
  readonly displayName: string;
  readonly kills: number;
  readonly targetKills: number;
  readonly completed: boolean;
  readonly rewardGold: number;
  readonly reason?: 'no-session' | 'duplicate-event';
}

function compareCreatureKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function progressFor(
  entries: readonly BestiaryProgress[],
  creatureKey: string,
): BestiaryProgress | undefined {
  return entries.find((entry) => entry.creatureKey === creatureKey);
}

function resultFor(
  species: BestiarySpecies,
  progress: BestiaryProgress | undefined,
  credited: boolean,
  rewardGold: number,
  reason?: BestiaryCreditResult['reason'],
): BestiaryCreditResult {
  const kills = progress?.kills ?? 0;
  return {
    credited,
    creatureKey: species.creatureKey,
    displayName: species.displayName,
    kills,
    targetKills: species.targetKills,
    completed: kills >= species.targetKills,
    rewardGold,
    ...(reason === undefined ? {} : { reason }),
  };
}

/**
 * Credits one player kill to the persistent bestiary.
 *
 * The event sequence belongs to the active run, while the count and reward
 * belong to the character. Keeping both in the same transaction means a
 * checkpoint cannot move the cursor backwards and a resumed snapshot cannot
 * pay the same death twice.
 */
export function creditBestiaryKill(
  draft: SaveDraft,
  species: BestiarySpecies,
  eventSequence: number,
): BestiaryCreditResult {
  if (!Number.isSafeInteger(eventSequence) || eventSequence <= 0) {
    throw new RangeError(
      `Bestiary event sequence must be a positive safe integer: ${eventSequence}`,
    );
  }
  if (!Number.isSafeInteger(species.targetKills) || species.targetKills <= 0) {
    throw new RangeError(
      `Bestiary targetKills must be a positive safe integer: ${species.targetKills}`,
    );
  }
  if (!Number.isSafeInteger(species.rewardGold) || species.rewardGold < 0) {
    throw new RangeError(
      `Bestiary rewardGold must be a non-negative safe integer: ${species.rewardGold}`,
    );
  }

  const session = draft.session;
  const current = progressFor(draft.bestiary, species.creatureKey);
  if (session === null) {
    return resultFor(species, current, false, 0, 'no-session');
  }
  if (eventSequence <= session.lastBestiaryEventSequence) {
    return resultFor(species, current, false, 0, 'duplicate-event');
  }

  const nextKills = (current?.kills ?? 0) + 1;
  const completed = nextKills >= species.targetKills;
  const rewardGold =
    completed && !(current?.rewardClaimed ?? false) ? species.rewardGold : 0;
  const nextProgress: BestiaryProgress = {
    creatureKey: species.creatureKey,
    kills: nextKills,
    rewardClaimed: (current?.rewardClaimed ?? false) || completed,
  };

  draft.bestiary = [
    ...draft.bestiary.filter(
      (entry) => entry.creatureKey !== species.creatureKey,
    ),
    nextProgress,
  ].sort((left, right) =>
    compareCreatureKeys(left.creatureKey, right.creatureKey),
  );
  draft.gold += rewardGold;
  draft.session = {
    ...session,
    lastBestiaryEventSequence: eventSequence,
  };

  return resultFor(species, nextProgress, true, rewardGold);
}
