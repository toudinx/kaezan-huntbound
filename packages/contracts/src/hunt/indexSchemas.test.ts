import { describe, expect, it } from 'vitest';

import { HUNT_INDEX_SCHEMA_VERSION, HuntIndexSchema } from './index.ts';

function creature(creatureKey: string) {
  return {
    creatureKey,
    displayName: 'Creature',
    slotCount: 1,
    health: 1,
    experience: 1,
    lookType: 1,
    respawnTicks: 1,
    experiencePerHour: 72_000,
    loot: [
      {
        itemKey: 'item:tibia:gold-coin',
        chancePerHundredThousand: 1,
        minCount: 1,
        maxCount: 1,
      },
    ],
  };
}

function hunt(
  huntId: string,
  band: number,
  recommendedLevel: number,
  creatureKey = 'creature:tibia:rotworm',
) {
  return {
    huntId,
    runtimeDirectory: 'test-pack',
    displayName: 'Test Hunt',
    band,
    recommendedLevel,
    soloVocation: 'vocation:tibia:knight',
    sourceUrl: 'https://example.invalid/hunt',
    maxLiveActors: 1,
    experiencePerHour: 72_000,
    creatures: [creature(creatureKey)],
  };
}

describe('HuntIndexSchema', () => {
  it('accepts the generated index shape and keeps the schema version separate', () => {
    const value = {
      schemaVersion: HUNT_INDEX_SCHEMA_VERSION,
      hunts: [hunt('hunt:tibia:test', 1, 8)],
    };

    expect(HuntIndexSchema.parse(value)).toEqual(value);
  });

  it('rejects unordered hunts, creatures, and loot', () => {
    const value = {
      schemaVersion: HUNT_INDEX_SCHEMA_VERSION,
      hunts: [
        {
          ...hunt('hunt:tibia:z', 1, 8, 'creature:tibia:z'),
          creatures: [
            creature('creature:tibia:z'),
            creature('creature:tibia:a'),
          ],
        },
        hunt('hunt:tibia:a', 2, 25),
      ],
    };

    expect(() => HuntIndexSchema.parse(value)).toThrow(
      /strictly ordered by huntId|strictly ordered by creatureKey/,
    );
  });

  it('rejects a higher band with a lower recommended level', () => {
    const value = {
      schemaVersion: HUNT_INDEX_SCHEMA_VERSION,
      hunts: [hunt('hunt:tibia:a', 1, 25), hunt('hunt:tibia:b', 2, 8)],
    };

    expect(() => HuntIndexSchema.parse(value)).toThrow(
      /higher band cannot have a lower recommendedLevel/,
    );
  });
});
