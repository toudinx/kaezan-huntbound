import { z } from 'zod';

import { SeedSchema } from '../simulation/identity.ts';
import { SimulationSnapshotSchema } from '../simulation/schemas.ts';
import { EQUIPMENT_SLOTS, SAVE_SCHEMA_VERSION } from './types.ts';

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

export const CharacterProgressSchema = z
  .object({
    experience: nonNegativeInteger,
    equipment: CharacterEquipmentSchema,
    collection: CollectionSchema,
  })
  .strict();

export const ActiveRunStateSchema = z
  .object({
    huntId: nonEmptyString,
    scenarioId: nonEmptyString,
    scenarioRevision: nonNegativeInteger,
    seed: SeedSchema,
    snapshot: SimulationSnapshotSchema,
    bag: RunBagEntriesSchema,
  })
  .strict();

export const GameSaveSchema = z
  .object({
    schemaVersion: z.literal(SAVE_SCHEMA_VERSION),
    character: CharacterProgressSchema,
    stash: RunBagEntriesSchema,
    gold: nonNegativeInteger,
    completedRuns: nonNegativeInteger,
    session: ActiveRunStateSchema.nullable(),
  })
  .strict();
