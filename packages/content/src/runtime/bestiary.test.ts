import type { HuntIndex, HuntIndexCreature } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  BESTIARY_REWARD_GOLD,
  BESTIARY_TARGET_KILLS,
  buildBestiaryCatalog,
} from './bestiary.ts';

function creature(creatureKey: string, displayName: string): HuntIndexCreature {
  return {
    creatureKey,
    displayName,
    slotCount: 1,
    health: 10,
    experience: 5,
    lookType: 1,
    respawnTicks: 10,
    experiencePerHour: 1_800,
    loot: [],
  };
}

function indexWithCreatures(
  creatures: readonly HuntIndexCreature[],
): HuntIndex {
  return {
    schemaVersion: 1,
    hunts: [
      {
        huntId: 'hunt:tibia:test' as HuntIndex['hunts'][number]['huntId'],
        runtimeDirectory: 'test',
        displayName: 'Test Hunt',
        band: 1,
        recommendedLevel: 1,
        soloVocation: 'vocation:tibia:knight',
        sourceUrl: 'https://example.invalid/test',
        maxLiveActors: 1,
        experiencePerHour: 1_800,
        creatures,
      },
    ],
  };
}

describe('buildBestiaryCatalog', () => {
  it('deduplicates shared creatures, orders them, and gives each a cosmetic-free goal', () => {
    const catalog = buildBestiaryCatalog(
      indexWithCreatures([
        creature('creature:tibia:rotworm', 'Rotworm'),
        creature('creature:tibia:orc', 'Orc'),
        creature('creature:tibia:rotworm', 'Rotworm alias'),
      ]),
    );

    expect(catalog).toEqual([
      {
        creatureKey: 'creature:tibia:orc',
        displayName: 'Orc',
        targetKills: BESTIARY_TARGET_KILLS,
        rewardGold: BESTIARY_REWARD_GOLD,
      },
      {
        creatureKey: 'creature:tibia:rotworm',
        displayName: 'Rotworm',
        targetKills: BESTIARY_TARGET_KILLS,
        rewardGold: BESTIARY_REWARD_GOLD,
      },
    ]);
  });
});
