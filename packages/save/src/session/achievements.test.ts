import {
  type AchievementDefinition,
  createEmptyGameSave,
  type SaveDraft,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { refreshAchievements } from './achievements.ts';

const definitions: readonly AchievementDefinition[] = [
  {
    achievementId: 'achievement:test:run',
    displayName: 'First run',
    description: 'Complete one run.',
    metric: 'completed-runs',
    target: 1,
    rewardGold: 5,
  },
  {
    achievementId: 'achievement:test:equip',
    displayName: 'Equipped',
    description: 'Equip one piece.',
    metric: 'equipped-slots',
    target: 1,
    rewardGold: 7,
  },
  {
    achievementId: 'achievement:test:sell',
    displayName: 'Sold',
    description: 'Sell one item.',
    metric: 'sold-items',
    target: 1,
    rewardGold: 11,
  },
  {
    achievementId: 'achievement:test:xp',
    displayName: 'Levelled',
    description: 'Reach the target XP.',
    metric: 'experience',
    target: 50,
    rewardGold: 13,
  },
  {
    achievementId: 'achievement:test:bestiary',
    displayName: 'Field guide',
    description: 'Complete one species.',
    metric: 'bestiary-species',
    target: 1,
    rewardGold: 17,
  },
];

function draft(): SaveDraft {
  return structuredClone(createEmptyGameSave()) as SaveDraft;
}

describe('refreshAchievements', () => {
  it('projects existing loop state and pays each newly completed goal once', () => {
    const save = draft();
    save.completedRuns = 1;
    save.character = {
      ...save.character,
      experience: 50,
      equipment: { ...save.character.equipment, helmet: 'item:test:helmet' },
      bestiary: [
        {
          creatureKey: 'creature:test:rat',
          kills: 10,
          rewardClaimed: true,
        },
      ],
    };

    const first = refreshAchievements(save, definitions);

    expect(first.filter((entry) => entry.newlyCompleted)).toHaveLength(4);
    expect(save.gold).toBe(42);
    expect(save.character.achievements).toEqual([
      {
        achievementId: 'achievement:test:bestiary',
        progress: 1,
        rewardClaimed: true,
      },
      {
        achievementId: 'achievement:test:equip',
        progress: 1,
        rewardClaimed: true,
      },
      {
        achievementId: 'achievement:test:run',
        progress: 1,
        rewardClaimed: true,
      },
      {
        achievementId: 'achievement:test:xp',
        progress: 50,
        rewardClaimed: true,
      },
    ]);

    const goldAfterFirst = save.gold;
    const second = refreshAchievements(save, definitions);

    expect(second.filter((entry) => entry.newlyCompleted)).toEqual([]);
    expect(save.gold).toBe(goldAfterFirst);
  });

  it('uses the successful sale event without adding a global sales counter', () => {
    const save = draft();

    const beforeSale = refreshAchievements(save, definitions);
    expect(
      beforeSale.find((entry) => entry.achievementId.endsWith(':sell')),
    ).toMatchObject({
      progress: 0,
      completed: false,
    });

    const firstSale = refreshAchievements(save, definitions, 'item-sold');
    expect(
      firstSale.find((entry) => entry.achievementId.endsWith(':sell')),
    ).toMatchObject({
      progress: 1,
      completed: true,
      newlyCompleted: true,
      rewardGold: 11,
    });
    expect(save.gold).toBe(11);

    refreshAchievements(save, definitions, 'item-sold');
    expect(save.gold).toBe(11);
  });

  it('keeps an unlocked objective complete when its source state later changes', () => {
    const save = draft();
    save.character = {
      ...save.character,
      equipment: { ...save.character.equipment, weapon: 'item:test:sword' },
    };
    refreshAchievements(save, definitions);

    save.character = {
      ...save.character,
      equipment: { ...save.character.equipment, weapon: null },
    };
    refreshAchievements(save, definitions);

    expect(
      save.character.achievements.find(
        (entry) => entry.achievementId === 'achievement:test:equip',
      ),
    ).toEqual({
      achievementId: 'achievement:test:equip',
      progress: 1,
      rewardClaimed: true,
    });
  });
});
