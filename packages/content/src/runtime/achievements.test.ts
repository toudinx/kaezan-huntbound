import { describe, expect, it } from 'vitest';

import {
  buildAchievementCatalog,
  FIRST_LOOP_ACHIEVEMENT_IDS,
  FIRST_LOOP_ACHIEVEMENT_REWARD_GOLD,
} from './achievements.ts';
import { experienceToReachLevel } from './knightProgression.ts';

describe('buildAchievementCatalog', () => {
  it('defines one small, existing-state goal for each first-loop action', () => {
    expect(buildAchievementCatalog()).toEqual([
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
    ]);
  });
});
