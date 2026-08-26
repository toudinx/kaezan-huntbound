import {
  HUNT_INDEX_SCHEMA_VERSION,
  HuntIndexSchema,
  type SpawnTable,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import type { HuntSelection } from '../hunt-selection/types.ts';
import { buildHuntIndex, type HuntIndexCreatureSource } from './generate.ts';

const selection: HuntSelection = {
  key: 'hunt:tibia:venore-rotworm-cave',
  displayName: 'Venore Rotworm Cave',
  sourceUrl: 'https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave',
  source: {
    map: 'data-otservbr-global/world/otservbr.otbm',
    spawns: 'data-otservbr-global/world/otservbr-monster.xml',
  },
  layout: '../../layouts/hunts/venore-rotworm-cave.json',
  recommendedLevel: 8,
  soloVocation: 'vocation:tibia:knight',
  band: 1,
  region: {
    minX: 33002,
    minY: 31995,
    maxX: 33065,
    maxY: 32090,
    floors: [8, 9],
  },
  creatures: ['creature:tibia:rotworm'],
  excludedCreatures: [],
  expectedSpawnGroups: 13,
  expectedSpawnSlots: 20,
  expectedDroppedTransitions: 0,
  budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
};

function spawnTable(): SpawnTable {
  return {
    maxLiveActors: 20,
    groups: [
      {
        center: { x: 1, y: 1, z: 8 },
        radius: 3,
        sourceCenter: { x: 33008, y: 32077, z: 8 },
        slots: Array.from({ length: 20 }, (_value, index) => ({
          blueprintId: 'rotworm',
          creatureKey: 'creature:tibia:rotworm',
          offsetX: index,
          offsetY: 0,
          offsetZ: 0,
          respawnTicks: 1800,
          source: { x: 33008 + index, y: 32077, z: 8 },
        })),
      },
    ],
  };
}

const rotworm: HuntIndexCreatureSource = {
  stableKey: 'creature:tibia:rotworm',
  displayName: 'Rotworm',
  stats: { health: 65, experience: 40 },
  lookType: 26,
  loot: [
    {
      itemKey: 'item:tibia:z-item',
      chancePerHundredThousand: 3000,
      minCount: 1,
      maxCount: 1,
    },
    {
      itemKey: 'item:tibia:gold-coin',
      chancePerHundredThousand: 71760,
      minCount: 1,
      maxCount: 17,
    },
    {
      itemKey: 'item:tibia:a-item',
      chancePerHundredThousand: 3000,
      minCount: 1,
      maxCount: 1,
    },
  ],
};

describe('buildHuntIndex', () => {
  it('derives the hunt card from spawn slots and the generated creature catalog', () => {
    const index = buildHuntIndex({
      selections: [selection],
      catalogCreatures: [rotworm],
      spawnsByHuntId: new Map([[selection.key, spawnTable()]]),
    });

    expect(index).toEqual({
      schemaVersion: HUNT_INDEX_SCHEMA_VERSION,
      hunts: [
        {
          huntId: selection.key,
          displayName: 'Venore Rotworm Cave',
          band: 1,
          recommendedLevel: 8,
          soloVocation: 'vocation:tibia:knight',
          sourceUrl:
            'https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave',
          maxLiveActors: 20,
          experiencePerHour: 32000,
          creatures: [
            {
              creatureKey: 'creature:tibia:rotworm',
              displayName: 'Rotworm',
              slotCount: 20,
              health: 65,
              experience: 40,
              lookType: 26,
              respawnTicks: 1800,
              experiencePerHour: 32000,
              loot: [
                {
                  itemKey: 'item:tibia:gold-coin',
                  chancePerHundredThousand: 71760,
                  minCount: 1,
                  maxCount: 17,
                },
                {
                  itemKey: 'item:tibia:a-item',
                  chancePerHundredThousand: 3000,
                  minCount: 1,
                  maxCount: 1,
                },
                {
                  itemKey: 'item:tibia:z-item',
                  chancePerHundredThousand: 3000,
                  minCount: 1,
                  maxCount: 1,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(HuntIndexSchema.parse(index)).toEqual(index);
  });

  it('rejects a band order that lowers recommended level', () => {
    const later = {
      ...selection,
      key: 'hunt:tibia:later-cave',
      displayName: 'Later Cave',
      band: 2,
      recommendedLevel: 7,
    };

    expect(() =>
      buildHuntIndex({
        selections: [selection, later],
        catalogCreatures: [rotworm],
        spawnsByHuntId: new Map([
          [selection.key, spawnTable()],
          [later.key, spawnTable()],
        ]),
      }),
    ).toThrow(/band.*recommendedLevel/i);
  });
});
