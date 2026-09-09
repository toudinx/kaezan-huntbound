import { z } from 'zod';

import { SeedSchema } from '../simulation/identity.ts';
import { SimulationSnapshotSchema } from '../simulation/schemas.ts';
import {
  EQUIPMENT_SLOTS,
  NEXT_HUNT_BUFF_STATES,
  SAVE_SCHEMA_VERSION,
} from './types.ts';

const safeInteger = z.number().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const positiveInteger = safeInteger.positive();
const nonEmptyString = z.string().min(1);
const itemKeySlot = nonEmptyString.nullable();

export const RunBagEntrySchema = z
  .object({
    itemKey: nonEmptyString,
    count: positiveInteger,
  })
  .strict();

function refineUniqueSortedItemKeys(
  entries: readonly { readonly itemKey: string }[],
  context: z.RefinementCtx,
) {
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (previous === undefined || current === undefined) {
      continue;
    }

    if (previous.itemKey === current.itemKey) {
      context.addIssue({
        code: 'custom',
        path: [index, 'itemKey'],
        message: 'itemKey must be unique',
      });
    } else if (previous.itemKey > current.itemKey) {
      context.addIssue({
        code: 'custom',
        path: [index, 'itemKey'],
        message: 'entries must be ordered by itemKey in UTF-16 code unit order',
      });
    }
  }
}

const RunBagEntriesSchema = z
  .array(RunBagEntrySchema)
  .readonly()
  .superRefine(refineUniqueSortedItemKeys);

export const EquipmentSlotSchema = z.enum(EQUIPMENT_SLOTS);

export const CharacterEquipmentSchema = z
  .object({
    weapon: itemKeySlot,
    shield: itemKeySlot,
    helmet: itemKeySlot,
    armor: itemKeySlot,
    legs: itemKeySlot,
    boots: itemKeySlot,
  })
  .strict();

const CollectionSchema = z
  .array(nonEmptyString)
  .readonly()
  .superRefine((keys, context) => {
    for (let index = 1; index < keys.length; index += 1) {
      const previous = keys[index - 1];
      const current = keys[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous === current) {
        context.addIssue({
          code: 'custom',
          path: [index],
          message: 'collection entries must be unique',
        });
      } else if (previous > current) {
        context.addIssue({
          code: 'custom',
          path: [index],
          message:
            'collection must be ordered by item key in UTF-16 code unit order',
        });
      }
    }
  });

const BestiaryProgressSchema = z
  .object({
    creatureKey: nonEmptyString,
    kills: nonNegativeInteger,
    rewardClaimed: z.boolean(),
  })
  .strict();

const BestiaryProgressEntriesSchema = z
  .array(BestiaryProgressSchema)
  .readonly()
  .superRefine((entries, context) => {
    for (let index = 1; index < entries.length; index += 1) {
      const previous = entries[index - 1];
      const current = entries[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous.creatureKey === current.creatureKey) {
        context.addIssue({
          code: 'custom',
          path: [index, 'creatureKey'],
          message: 'creatureKey must be unique',
        });
      } else if (previous.creatureKey > current.creatureKey) {
        context.addIssue({
          code: 'custom',
          path: [index, 'creatureKey'],
          message:
            'entries must be ordered by creatureKey in UTF-16 code unit order',
        });
      }
    }
  });

const AchievementProgressSchema = z
  .object({
    achievementId: nonEmptyString,
    progress: nonNegativeInteger,
    rewardClaimed: z.boolean(),
  })
  .strict();

const AchievementProgressEntriesSchema = z
  .array(AchievementProgressSchema)
  .readonly()
  .superRefine((entries, context) => {
    for (let index = 1; index < entries.length; index += 1) {
      const previous = entries[index - 1];
      const current = entries[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous.achievementId === current.achievementId) {
        context.addIssue({
          code: 'custom',
          path: [index, 'achievementId'],
          message: 'achievementId must be unique',
        });
      } else if (previous.achievementId > current.achievementId) {
        context.addIssue({
          code: 'custom',
          path: [index, 'achievementId'],
          message:
            'entries must be ordered by achievementId in UTF-16 code unit order',
        });
      }
    }
  });

export const CharacterProgressSchema = z
  .object({
    vocationKey: nonEmptyString,
    experience: nonNegativeInteger,
    equipment: CharacterEquipmentSchema,
    collection: CollectionSchema,
  })
  .strict();

const CharacterProgressEntriesSchema = z
  .array(CharacterProgressSchema)
  .min(1)
  .readonly()
  .superRefine((entries, context) => {
    for (let index = 1; index < entries.length; index += 1) {
      const previous = entries[index - 1];
      const current = entries[index];
      if (previous === undefined || current === undefined) continue;
      if (previous.vocationKey === current.vocationKey) {
        context.addIssue({
          code: 'custom',
          path: [index, 'vocationKey'],
          message: 'vocationKey must be unique',
        });
      } else if (previous.vocationKey > current.vocationKey) {
        context.addIssue({
          code: 'custom',
          path: [index, 'vocationKey'],
          message:
            'characters must be ordered by vocationKey in UTF-16 code unit order',
        });
      }
    }
  });

export const ActiveRunStateSchema = z
  .object({
    vocationKey: nonEmptyString,
    huntId: nonEmptyString,
    scenarioId: nonEmptyString,
    scenarioRevision: nonNegativeInteger,
    seed: SeedSchema,
    snapshot: SimulationSnapshotSchema,
    bag: RunBagEntriesSchema,
    lastBestiaryEventSequence: nonNegativeInteger,
  })
  .strict();

export const GameSaveSchema = z
  .object({
    schemaVersion: z.literal(SAVE_SCHEMA_VERSION),
    characters: CharacterProgressEntriesSchema,
    activeVocationKey: nonEmptyString,
    bestiary: BestiaryProgressEntriesSchema,
    achievements: AchievementProgressEntriesSchema,
    stash: RunBagEntriesSchema,
    gold: nonNegativeInteger,
    nextHuntBuff: z.enum(NEXT_HUNT_BUFF_STATES),
    completedRuns: nonNegativeInteger,
    session: ActiveRunStateSchema.nullable(),
  })
  .strict()
  .superRefine((save, context) => {
    if (
      !save.characters.some(
        (character) => character.vocationKey === save.activeVocationKey,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['activeVocationKey'],
        message: 'activeVocationKey must name one of the characters',
      });
    }
  });
