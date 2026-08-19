import { z } from 'zod';

import { SeedSchema } from '../simulation/identity.ts';
import { SimulationSnapshotSchema } from '../simulation/schemas.ts';
import { SAVE_SCHEMA_VERSION } from './types.ts';

const safeInteger = z.number().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const positiveInteger = safeInteger.positive();
const nonEmptyString = z.string().min(1);

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
    stash: RunBagEntriesSchema,
    completedRuns: nonNegativeInteger,
    session: ActiveRunStateSchema.nullable(),
  })
  .strict();
