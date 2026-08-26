import { z } from 'zod';

import {
  ActorBlueprintSchema,
  GridPositionSchema,
} from '../simulation/schemas.ts';
import { formatSpawnSlotId } from '../simulation/spawnIdentity.ts';
import type {
  HuntDefinition,
  HuntIndex,
  HuntIndexCreature,
  HuntIndexEntry,
  HuntIndexLootEntry,
  MapRegion,
  SpawnTable,
  TransitionTable,
} from './types.ts';
import {
  HUNT_INDEX_SCHEMA_VERSION,
  HUNT_INDEX_TICKS_PER_HOUR,
  HUNT_SCHEMA_VERSION,
} from './types.ts';

const safeInteger = z.number().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const positiveInteger = safeInteger.positive();
const paletteValue = nonNegativeInteger;
const paletteIndex = safeInteger;

function addHuntIssue(
  context: z.RefinementCtx,
  code:
    | 'HUNT_REGION_OUT_OF_BUDGET'
    | 'HUNT_PALETTE_INDEX_INVALID'
    | 'HUNT_UNKNOWN_BLUEPRINT'
    | 'HUNT_TRANSITION_INVALID'
    | 'HUNT_SPAWN_OUT_OF_REGION'
    | 'SIM_SCHEMA_INVALID',
  path: readonly (string | number)[],
  message: string,
) {
  context.addIssue({
    code: 'custom',
    path: [...path],
    message,
    params: { huntCode: code },
  });
}

const RegionIdSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, 'Expected a non-empty region id')
  .transform((value) => value as MapRegion['regionId']);

const OriginSchema = z
  .object({
    x: safeInteger,
    y: safeInteger,
  })
  .strict();

const SparseObjectSchema = z
  .object({
    i: nonNegativeInteger,
    stack: z.array(paletteIndex).min(1).readonly(),
  })
  .strict();

const MapRegionFloorSchema = z
  .object({
    z: safeInteger,
    ground: z.array(paletteIndex).readonly(),
    objectsBelow: z.array(SparseObjectSchema).readonly(),
    objectsAbove: z.array(SparseObjectSchema).readonly(),
    collision: z.array(nonNegativeInteger).readonly(),
  })
  .strict();

function compareNumbers(left: number, right: number) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function addStrictOrderIssues(
  values: readonly number[],
  path: readonly (string | number)[],
  context: z.RefinementCtx,
  label: string,
  leaf?: string,
) {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    if (compareNumbers(previous, current) >= 0) {
      addHuntIssue(
        context,
        'SIM_SCHEMA_INVALID',
        [...path, index, ...(leaf === undefined ? [] : [leaf])],
        `${label} must be strictly increasing`,
      );
    }
  }
}

function addSparseIndexIssues(
  values: readonly { readonly i: number }[],
  path: readonly (string | number)[],
  cellCount: number,
  context: z.RefinementCtx,
) {
  values.forEach((value, index) => {
    if (value.i < 0 || value.i >= cellCount) {
      addHuntIssue(
        context,
        'SIM_SCHEMA_INVALID',
        [...path, index, 'i'],
        `Sparse index must be in [0, ${cellCount})`,
      );
    }
  });
}

function addPaletteReferenceIssues(
  values: readonly number[],
  path: readonly (string | number)[],
  paletteLength: number,
  context: z.RefinementCtx,
) {
  values.forEach((value, index) => {
    if (value < 0 || value >= paletteLength) {
      addHuntIssue(
        context,
        'HUNT_PALETTE_INDEX_INVALID',
        [...path, index],
        `Palette index ${value} must be in [0, ${paletteLength})`,
      );
    }
  });
}

function addStackReferenceIssues(
  values: readonly { readonly stack: readonly number[] }[],
  path: readonly (string | number)[],
  paletteLength: number,
  context: z.RefinementCtx,
) {
  values.forEach((value, index) => {
    addPaletteReferenceIssues(
      value.stack,
      [...path, index, 'stack'],
      paletteLength,
      context,
    );
  });
}

export const MapRegionSchema: z.ZodType<MapRegion> = z
  .object({
    schemaVersion: z.literal(HUNT_SCHEMA_VERSION),
    regionId: RegionIdSchema,
    regionRevision: nonNegativeInteger,
    origin: OriginSchema,
    width: positiveInteger,
    height: positiveInteger,
    palette: z.array(paletteValue).readonly(),
    floors: z.array(MapRegionFloorSchema).min(1).readonly(),
  })
  .strict()
  .superRefine((region, context) => {
    if (region.width > 96) {
      addHuntIssue(
        context,
        'HUNT_REGION_OUT_OF_BUDGET',
        ['width'],
        'Region width must be at most 96 tiles',
      );
    }
    if (region.height > 96) {
      addHuntIssue(
        context,
        'HUNT_REGION_OUT_OF_BUDGET',
        ['height'],
        'Region height must be at most 96 tiles',
      );
    }
    if (region.floors.length > 3) {
      addHuntIssue(
        context,
        'HUNT_REGION_OUT_OF_BUDGET',
        ['floors'],
        'Region must contain at most 3 floors',
      );
    }

    addStrictOrderIssues(region.palette, ['palette'], context, 'palette');
    for (let index = 1; index < region.floors.length; index += 1) {
      const previous = region.floors[index - 1];
      const current = region.floors[index];
      if (
        previous !== undefined &&
        current !== undefined &&
        previous.z >= current.z
      ) {
        addHuntIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['floors', index, 'z'],
          'floors must be strictly increasing by z',
        );
      }
    }

    const cellCount = region.width * region.height;
    region.floors.forEach((floor, floorIndex) => {
      const floorPath = ['floors', floorIndex] as const;
      if (floor.ground.length !== cellCount) {
        addHuntIssue(
          context,
          'SIM_SCHEMA_INVALID',
          [...floorPath, 'ground'],
          `ground must contain exactly ${cellCount} palette indices`,
        );
      }
      addPaletteReferenceIssues(
        floor.ground,
        [...floorPath, 'ground'],
        region.palette.length,
        context,
      );
      addSparseIndexIssues(
        floor.objectsBelow,
        [...floorPath, 'objectsBelow'],
        cellCount,
        context,
      );
      addSparseIndexIssues(
        floor.objectsAbove,
        [...floorPath, 'objectsAbove'],
        cellCount,
        context,
      );
      addStackReferenceIssues(
        floor.objectsBelow,
        [...floorPath, 'objectsBelow'],
        region.palette.length,
        context,
      );
      addStackReferenceIssues(
        floor.objectsAbove,
        [...floorPath, 'objectsAbove'],
        region.palette.length,
        context,
      );
      addStrictOrderIssues(
        floor.objectsBelow.map((entry) => entry.i),
        [...floorPath, 'objectsBelow'],
        context,
        'objectsBelow',
        'i',
      );
      addStrictOrderIssues(
        floor.objectsAbove.map((entry) => entry.i),
        [...floorPath, 'objectsAbove'],
        context,
        'objectsAbove',
        'i',
      );
      addStrictOrderIssues(
        floor.collision,
        [...floorPath, 'collision'],
        context,
        'collision',
      );
      floor.collision.forEach((index, collisionIndex) => {
        if (index >= cellCount) {
          addHuntIssue(
            context,
            'SIM_SCHEMA_INVALID',
            [...floorPath, 'collision', collisionIndex],
            `Collision index must be in [0, ${cellCount})`,
          );
        }
      });
    });
  });

function compareGridPosition(
  left: { readonly x: number; readonly y: number; readonly z: number },
  right: { readonly x: number; readonly y: number; readonly z: number },
) {
  if (left.z !== right.z) {
    return left.z < right.z ? -1 : 1;
  }
  if (left.y !== right.y) {
    return left.y < right.y ? -1 : 1;
  }
  if (left.x !== right.x) {
    return left.x < right.x ? -1 : 1;
  }
  return 0;
}

const TransitionEntrySchema = z
  .object({
    from: GridPositionSchema,
    to: GridPositionSchema,
  })
  .strict();

export const TransitionTableSchema: z.ZodType<TransitionTable> = z
  .object({
    entries: z.array(TransitionEntrySchema).readonly(),
    dropped: nonNegativeInteger,
  })
  .strict()
  .superRefine((table, context) => {
    for (let index = 0; index < table.entries.length; index += 1) {
      const entry = table.entries[index];
      if (entry === undefined) {
        continue;
      }
      const entryPath = ['entries', index] as const;
      if (compareGridPosition(entry.from, entry.to) === 0) {
        addHuntIssue(
          context,
          'HUNT_TRANSITION_INVALID',
          [...entryPath, 'to'],
          'Transition from and to positions must differ',
        );
      }
      if (Math.abs(entry.to.z - entry.from.z) > 1) {
        addHuntIssue(
          context,
          'HUNT_TRANSITION_INVALID',
          [...entryPath, 'to'],
          'Transition cannot jump more than one floor',
        );
      }

      const previous = table.entries[index - 1];
      if (
        previous !== undefined &&
        compareGridPosition(previous.from, entry.from) >= 0
      ) {
        addHuntIssue(
          context,
          'HUNT_TRANSITION_INVALID',
          [...entryPath, 'from'],
          'Transitions must be strictly ordered by from (z, y, x)',
        );
      }
    }
  });

const NonEmptyStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, 'Expected a non-empty string');

const BlueprintIdSchema = NonEmptyStringSchema.regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Expected a lowercase kebab-case blueprint id',
);

const SpawnSlotSchema = z
  .object({
    creatureKey: NonEmptyStringSchema,
    blueprintId: BlueprintIdSchema,
    offsetX: safeInteger,
    offsetY: safeInteger,
    offsetZ: safeInteger,
    respawnTicks: positiveInteger,
    source: GridPositionSchema,
  })
  .strict();

const SpawnGroupSchema = z
  .object({
    center: GridPositionSchema,
    radius: safeInteger.min(0).max(15),
    sourceCenter: GridPositionSchema,
    slots: z.array(SpawnSlotSchema).min(1).readonly(),
  })
  .strict();

export const SpawnTableSchema: z.ZodType<SpawnTable> = z
  .object({
    groups: z.array(SpawnGroupSchema).readonly(),
    maxLiveActors: positiveInteger.max(64),
  })
  .strict()
  .superRefine((table, context) => {
    const sourceCentres = new Set<string>();
    const slotIds = new Set<string>();
    for (let index = 0; index < table.groups.length; index += 1) {
      const group = table.groups[index];
      if (group === undefined) {
        continue;
      }
      const groupPath = ['groups', index] as const;
      const previous = table.groups[index - 1];
      if (
        previous !== undefined &&
        compareGridPosition(previous.center, group.center) >= 0
      ) {
        addHuntIssue(
          context,
          'SIM_SCHEMA_INVALID',
          [...groupPath, 'center'],
          'Spawn groups must be strictly ordered by center (z, y, x)',
        );
      }

      const sourceCentreKey = `${group.sourceCenter.z}:${group.sourceCenter.y}:${group.sourceCenter.x}`;
      if (sourceCentres.has(sourceCentreKey)) {
        addHuntIssue(
          context,
          'SIM_SCHEMA_INVALID',
          [...groupPath, 'sourceCenter'],
          'Spawn group source centres must be unique',
        );
      }
      sourceCentres.add(sourceCentreKey);

      group.slots.forEach((slot, slotIndex) => {
        const slotId = formatSpawnSlotId(slot.source, group.sourceCenter);
        if (slotIds.has(slotId)) {
          addHuntIssue(
            context,
            'SIM_SCHEMA_INVALID',
            [...groupPath, 'slots', slotIndex, 'source'],
            'Spawn slot identities must be unique',
          );
        }
        slotIds.add(slotId);
      });
    }
  });

const HuntIdSchema = NonEmptyStringSchema.transform(
  (value) => value as HuntDefinition['huntId'],
);

function isInsideRegion(
  region: MapRegion,
  position: { readonly x: number; readonly y: number; readonly z: number },
) {
  return (
    position.x >= 0 &&
    position.x < region.width &&
    position.y >= 0 &&
    position.y < region.height &&
    region.floors.some((floor) => floor.z === position.z)
  );
}

function floorForPosition(region: MapRegion, z: number) {
  return region.floors.find((floor) => floor.z === z);
}

function isCollisionTile(
  region: MapRegion,
  position: { readonly x: number; readonly y: number; readonly z: number },
) {
  const floor = floorForPosition(region, position.z);
  if (floor === undefined) {
    return false;
  }
  return floor.collision.includes(position.y * region.width + position.x);
}

export const HuntDefinitionSchema: z.ZodType<HuntDefinition> = z
  .object({
    schemaVersion: z.literal(HUNT_SCHEMA_VERSION),
    huntId: HuntIdSchema,
    huntRevision: nonNegativeInteger,
    region: MapRegionSchema,
    transitions: TransitionTableSchema,
    spawns: SpawnTableSchema,
    blueprints: z.array(ActorBlueprintSchema).readonly(),
    playerStart: GridPositionSchema,
    playerBlueprintId: BlueprintIdSchema,
  })
  .strict()
  .superRefine((definition, context) => {
    const blueprintIds = new Set<string>();
    definition.blueprints.forEach((blueprint, index) => {
      if (blueprintIds.has(blueprint.blueprintId)) {
        addHuntIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['blueprints', index, 'blueprintId'],
          'blueprintId must be unique',
        );
      }
      blueprintIds.add(blueprint.blueprintId);
    });

    if (!blueprintIds.has(definition.playerBlueprintId)) {
      addHuntIssue(
        context,
        'HUNT_UNKNOWN_BLUEPRINT',
        ['playerBlueprintId'],
        `Unknown player blueprint ${definition.playerBlueprintId}`,
      );
    }

    definition.spawns.groups.forEach((group, groupIndex) => {
      const groupPath = ['spawns', 'groups', groupIndex] as const;
      if (!isInsideRegion(definition.region, group.center)) {
        addHuntIssue(
          context,
          'HUNT_SPAWN_OUT_OF_REGION',
          [...groupPath, 'center'],
          'Spawn group center must be inside the extracted region',
        );
      }
      group.slots.forEach((slot, slotIndex) => {
        if (!blueprintIds.has(slot.blueprintId)) {
          addHuntIssue(
            context,
            'HUNT_UNKNOWN_BLUEPRINT',
            [...groupPath, 'slots', slotIndex, 'blueprintId'],
            `Unknown spawn blueprint ${slot.blueprintId}`,
          );
        }
      });
    });

    if (!isInsideRegion(definition.region, definition.playerStart)) {
      addHuntIssue(
        context,
        'HUNT_SPAWN_OUT_OF_REGION',
        ['playerStart'],
        'Player start must be inside the extracted region',
      );
    } else if (isCollisionTile(definition.region, definition.playerStart)) {
      addHuntIssue(
        context,
        'HUNT_SPAWN_OUT_OF_REGION',
        ['playerStart'],
        'Player start must not occupy a collision tile',
      );
    }

    definition.transitions.entries.forEach((entry, entryIndex) => {
      const entryPath = ['transitions', 'entries', entryIndex] as const;
      if (!isInsideRegion(definition.region, entry.from)) {
        addHuntIssue(
          context,
          'HUNT_TRANSITION_INVALID',
          [...entryPath, 'from'],
          'Transition origin must be inside the extracted region',
        );
      }
      if (!isInsideRegion(definition.region, entry.to)) {
        addHuntIssue(
          context,
          'HUNT_TRANSITION_INVALID',
          [...entryPath, 'to'],
          'Transition destination must be inside the extracted region',
        );
      }
    });
  });

const huntIndexChancePerHundredThousand = safeInteger.min(0).max(100_000);

const HuntIndexLootEntrySchema: z.ZodType<HuntIndexLootEntry> = z
  .object({
    itemKey: NonEmptyStringSchema,
    chancePerHundredThousand: huntIndexChancePerHundredThousand,
    minCount: positiveInteger,
    maxCount: positiveInteger,
  })
  .strict()
  .refine((entry) => entry.minCount <= entry.maxCount, {
    path: ['maxCount'],
    message: 'Loot minCount must be less than or equal to maxCount',
  });

const HuntIndexCreatureSchema: z.ZodType<HuntIndexCreature> = z
  .object({
    creatureKey: NonEmptyStringSchema,
    displayName: NonEmptyStringSchema,
    slotCount: positiveInteger,
    health: nonNegativeInteger,
    experience: nonNegativeInteger,
    lookType: nonNegativeInteger,
    respawnTicks: positiveInteger,
    experiencePerHour: nonNegativeInteger,
    loot: z.array(HuntIndexLootEntrySchema).readonly(),
  })
  .strict()
  .superRefine((creature, context) => {
    for (let index = 1; index < creature.loot.length; index += 1) {
      const previous = creature.loot[index - 1];
      const current = creature.loot[index];
      if (previous === undefined || current === undefined) continue;
      if (
        previous.chancePerHundredThousand < current.chancePerHundredThousand
      ) {
        context.addIssue({
          code: 'custom',
          path: ['loot', index, 'chancePerHundredThousand'],
          message:
            'Loot must be ordered by chancePerHundredThousand descending',
        });
      } else if (
        previous.chancePerHundredThousand ===
          current.chancePerHundredThousand &&
        previous.itemKey >= current.itemKey
      ) {
        context.addIssue({
          code: 'custom',
          path: ['loot', index, 'itemKey'],
          message: 'Loot ties must be ordered by itemKey ascending',
        });
      }
    }
  });

const HuntIndexEntrySchema: z.ZodType<HuntIndexEntry> = z
  .object({
    huntId: HuntIdSchema,
    runtimeDirectory: NonEmptyStringSchema,
    displayName: NonEmptyStringSchema,
    band: safeInteger.min(1).max(5),
    recommendedLevel: positiveInteger,
    soloVocation: NonEmptyStringSchema,
    sourceUrl: NonEmptyStringSchema,
    maxLiveActors: positiveInteger.max(64),
    experiencePerHour: nonNegativeInteger,
    creatures: z.array(HuntIndexCreatureSchema).min(1).readonly(),
  })
  .strict();

function derivedHuntExperiencePerHour(
  creature: HuntIndexCreature,
  totalSlotCount: number,
  activeSlotCount: number,
): number {
  return Number(
    (BigInt(creature.slotCount) *
      BigInt(creature.experience) *
      BigInt(HUNT_INDEX_TICKS_PER_HOUR) *
      BigInt(activeSlotCount)) /
      (BigInt(creature.respawnTicks) * BigInt(totalSlotCount)),
  );
}

export const HuntIndexSchema: z.ZodType<HuntIndex> = z
  .object({
    schemaVersion: z.literal(HUNT_INDEX_SCHEMA_VERSION),
    hunts: z.array(HuntIndexEntrySchema).min(1).readonly(),
  })
  .strict()
  .superRefine((index, context) => {
    for (let huntIndex = 1; huntIndex < index.hunts.length; huntIndex += 1) {
      const previous = index.hunts[huntIndex - 1];
      const current = index.hunts[huntIndex];
      if (
        previous !== undefined &&
        current !== undefined &&
        previous.huntId >= current.huntId
      ) {
        context.addIssue({
          code: 'custom',
          path: ['hunts', huntIndex, 'huntId'],
          message: 'Hunts must be strictly ordered by huntId',
        });
      }
    }

    index.hunts.forEach((hunt, huntIndex) => {
      const totalSlotCount = hunt.creatures.reduce(
        (total, creature) => total + creature.slotCount,
        0,
      );
      const activeSlotCount = Math.min(totalSlotCount, hunt.maxLiveActors);
      let totalExperiencePerHour = 0;
      for (
        let creatureIndex = 1;
        creatureIndex < hunt.creatures.length;
        creatureIndex += 1
      ) {
        const previousCreature = hunt.creatures[creatureIndex - 1];
        const creature = hunt.creatures[creatureIndex];
        if (
          previousCreature !== undefined &&
          creature !== undefined &&
          previousCreature.creatureKey >= creature.creatureKey
        ) {
          context.addIssue({
            code: 'custom',
            path: [
              'hunts',
              huntIndex,
              'creatures',
              creatureIndex,
              'creatureKey',
            ],
            message: 'Creatures must be strictly ordered by creatureKey',
          });
        }
      }
      hunt.creatures.forEach((creature, creatureIndex) => {
        const expected = derivedHuntExperiencePerHour(
          creature,
          totalSlotCount,
          activeSlotCount,
        );
        totalExperiencePerHour += creature.experiencePerHour;
        if (creature.experiencePerHour !== expected) {
          context.addIssue({
            code: 'custom',
            path: [
              'hunts',
              huntIndex,
              'creatures',
              creatureIndex,
              'experiencePerHour',
            ],
            message: `experiencePerHour must be ${expected} for the declared slots and respawnTicks`,
          });
        }
      });
      if (hunt.experiencePerHour !== totalExperiencePerHour) {
        context.addIssue({
          code: 'custom',
          path: ['hunts', huntIndex, 'experiencePerHour'],
          message: `experiencePerHour must equal the sum of creature contributions (${totalExperiencePerHour})`,
        });
      }
    });

    const byBand = [...index.hunts].sort((left, right) =>
      left.band === right.band
        ? left.huntId < right.huntId
          ? -1
          : left.huntId > right.huntId
            ? 1
            : 0
        : left.band - right.band,
    );
    let highestBand = 0;
    let highestRecommendedLevel = 0;
    for (let position = 0; position < byBand.length; position += 1) {
      const current = byBand[position];
      if (
        current !== undefined &&
        current.band > highestBand &&
        current.recommendedLevel < highestRecommendedLevel
      ) {
        const currentIndex = index.hunts.indexOf(current);
        context.addIssue({
          code: 'custom',
          path: ['hunts', currentIndex, 'recommendedLevel'],
          message: 'A higher band cannot have a lower recommendedLevel',
        });
      }
      if (current !== undefined && current.band > highestBand) {
        highestBand = current.band;
      }
      if (current !== undefined) {
        highestRecommendedLevel = Math.max(
          highestRecommendedLevel,
          current.recommendedLevel,
        );
      }
    }
  });
