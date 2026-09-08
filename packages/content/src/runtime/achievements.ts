import type { AchievementDefinition } from '@huntbound/contracts';

import { experienceToReachLevel } from './knightProgression.ts';

/** Gold is useful in the first loop and does not add combat power directly. */
export const FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD = 25;

export const FIRST_LOOP_ACHIEVEMENT_IDS = {
  firstHunt: 'achievement:huntbound:first-hunt',
  armedAndReady: 'achievement:huntbound:armed-and-ready',
  honestWork: 'achievement:huntbound:honest-work',
  gettingStronger: 'achievement:huntbound:getting-stronger',
  fieldGuide: 'achievement:huntbound:field-guide',
} as const;

/**
 * The first five goals are intentionally a projection of existing loop
 * state. They are content, rather than a second progression system: a save
 * can answer every objective from runs, equipment, sales, XP and bestiary.
 */
export function buildAchievementCatalog(): readonly AchievementDefinition[] {
  return [
    {
      achievementId: FIRST_LOOP_ACHIEVEMENT_IDS.firstHunt,
      displayName: 'First Hunt',
      description: 'Complete your first hunt.',
      metric: 'completed-runs',
      target: 1,
      rewardGold: FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD,
    },
    {
      achievementId: FIRST_LOOP_ACHIEVEMENT_IDS.armedAndReady,
      displayName: 'Armed and Ready',
      description: 'Equip your first piece of gear.',
      metric: 'equipped-slots',
      target: 1,
      rewardGold: FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD,
    },
    {
      achievementId: FIRST_LOOP_ACHIEVEMENT_IDS.honestWork,
      displayName: 'Honest Work',
      description: 'Sell your first stash item.',
      metric: 'sold-items',
      target: 1,
      rewardGold: FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD,
    },
    {
      achievementId: FIRST_LOOP_ACHIEVEMENT_IDS.gettingStronger,
      displayName: 'Getting Stronger',
      description: 'Reach level 2.',
      metric: 'experience',
      target: experienceToReachLevel(2),
      rewardGold: FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD,
    },
    {
      achievementId: FIRST_LOOP_ACHIEVEMENT_IDS.fieldGuide,
      displayName: 'Field Guide',
      description: 'Complete your first bestiary entry.',
      metric: 'bestiary-species',
      target: 1,
      rewardGold: FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD,
    },
  ];
}
