import {
  HUNT_INDEX_SCHEMA_VERSION,
  HUNT_INDEX_TICKS_PER_HOUR,
  type HuntIndex,
  type HuntIndexCreature,
  type HuntIndexLootEntry,
  HuntIndexSchema,
  type SpawnTable,
} from '../../packages/contracts/src/index.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';

export interface HuntIndexCreatureSource {
  readonly stableKey: string;
  readonly displayName: string;
  readonly stats: {
    readonly health: number;
    readonly experience: number;
  };
  readonly lookType: number;
  readonly loot: readonly HuntIndexLootEntry[];
}

export interface HuntIndexBuildInput {
  readonly selections: readonly HuntSelection[];
  readonly catalogCreatures: readonly HuntIndexCreatureSource[];
  readonly spawnsByHuntId: ReadonlyMap<string, SpawnTable>;
}

interface CreatureSlots {
  readonly creatureKey: string;
  readonly slots: readonly {
    readonly respawnTicks: number;
  }[];
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function integerExperiencePerHour(input: {
  readonly slotCount: number;
  readonly experience: number;
  readonly respawnTicks: number;
  readonly activeSlotCount: number;
  readonly totalSlotCount: number;
}): number {
  const numerator =
    BigInt(input.slotCount) *
    BigInt(input.experience) *
    BigInt(HUNT_INDEX_TICKS_PER_HOUR) *
    BigInt(input.activeSlotCount);
  const denominator = BigInt(input.respawnTicks) * BigInt(input.totalSlotCount);
  const result = Number(numerator / denominator);
  if (!Number.isSafeInteger(result)) {
    throw new Error('Derived experiencePerHour exceeds the safe integer range');
  }
  return result;
}

function requireBand(selection: HuntSelection): number {
  if (
    !Number.isSafeInteger(selection.band) ||
    selection.band < 1 ||
    selection.band > 5
  ) {
    throw new Error(
      `Invalid band for ${selection.key}: expected an integer from 1 to 5`,
    );
  }
  return selection.band;
}

function groupCreatureSlots(spawns: SpawnTable): readonly CreatureSlots[] {
  const slotsByCreature = new Map<
    string,
    { readonly respawnTicks: number }[]
  >();
  for (const group of spawns.groups) {
    for (const slot of group.slots) {
      const slots = slotsByCreature.get(slot.creatureKey) ?? [];
      slots.push({ respawnTicks: slot.respawnTicks });
      slotsByCreature.set(slot.creatureKey, slots);
    }
  }

  return [...slotsByCreature.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([creatureKey, slots]) => ({ creatureKey, slots }));
}

function singleRespawnTicks(
  huntId: string,
  creatureKey: string,
  slots: readonly { readonly respawnTicks: number }[],
): number {
  const first = slots[0]?.respawnTicks;
  if (first === undefined) {
    throw new Error(`Hunt ${huntId} has no slots for ${creatureKey}`);
  }
  if (slots.some((slot) => slot.respawnTicks !== first)) {
    throw new Error(
      `Hunt ${huntId} has multiple respawnTicks for ${creatureKey}`,
    );
  }
  return first;
}

function sortedLoot(
  loot: readonly HuntIndexLootEntry[],
): readonly HuntIndexLootEntry[] {
  return [...loot].sort((left, right) => {
    const byChance =
      right.chancePerHundredThousand - left.chancePerHundredThousand;
    return byChance === 0
      ? compareStrings(left.itemKey, right.itemKey)
      : byChance;
  });
}

function buildCreature(
  huntId: string,
  creatureSlots: CreatureSlots,
  catalog: HuntIndexCreatureSource,
  activeSlotCount: number,
  totalSlotCount: number,
): HuntIndexCreature {
  const respawnTicks = singleRespawnTicks(
    huntId,
    creatureSlots.creatureKey,
    creatureSlots.slots,
  );
  const slotCount = creatureSlots.slots.length;
  return {
    creatureKey: creatureSlots.creatureKey,
    displayName: catalog.displayName,
    slotCount,
    health: catalog.stats.health,
    experience: catalog.stats.experience,
    lookType: catalog.lookType,
    respawnTicks,
    experiencePerHour: integerExperiencePerHour({
      slotCount,
      experience: catalog.stats.experience,
      respawnTicks,
      activeSlotCount,
      totalSlotCount,
    }),
    loot: sortedLoot(catalog.loot),
  };
}

function validateCatalogKeys(
  catalogCreatures: readonly HuntIndexCreatureSource[],
): ReadonlyMap<string, HuntIndexCreatureSource> {
  const byKey = new Map<string, HuntIndexCreatureSource>();
  for (const creature of catalogCreatures) {
    if (byKey.has(creature.stableKey)) {
      throw new Error(`Duplicate creature catalog key: ${creature.stableKey}`);
    }
    byKey.set(creature.stableKey, creature);
  }
  return byKey;
}

function validateBandOrder(hunts: readonly HuntSelection[]): void {
  const ordered = [...hunts].sort((left, right) => {
    const byBand = left.band - right.band;
    return byBand === 0
      ? left.recommendedLevel - right.recommendedLevel
      : byBand;
  });
  let highestRecommendedLevel = 0;
  let previousBand = 0;
  for (const hunt of ordered) {
    requireBand(hunt);
    if (
      hunt.band > previousBand &&
      hunt.recommendedLevel < highestRecommendedLevel
    ) {
      throw new Error(
        `Invalid band order: band ${hunt.band} has recommendedLevel ${hunt.recommendedLevel}, below ${highestRecommendedLevel}`,
      );
    }
    if (hunt.band > previousBand) previousBand = hunt.band;
    highestRecommendedLevel = Math.max(
      highestRecommendedLevel,
      hunt.recommendedLevel,
    );
  }
}

export function buildHuntIndex(input: HuntIndexBuildInput): HuntIndex {
  const catalogByKey = validateCatalogKeys(input.catalogCreatures);
  const seenHuntIds = new Set<string>();
  validateBandOrder(input.selections);

  const hunts = input.selections.map((selection) => {
    if (seenHuntIds.has(selection.key)) {
      throw new Error(`Duplicate hunt selection key: ${selection.key}`);
    }
    seenHuntIds.add(selection.key);

    const spawns = input.spawnsByHuntId.get(selection.key);
    if (spawns === undefined) {
      throw new Error(`Missing generated spawns for ${selection.key}`);
    }
    const creatureSlots = groupCreatureSlots(spawns);
    const totalSlotCount = creatureSlots.reduce(
      (total, creature) => total + creature.slots.length,
      0,
    );
    if (totalSlotCount === 0) {
      throw new Error(`Hunt ${selection.key} has no generated spawn slots`);
    }
    const activeSlotCount = Math.min(totalSlotCount, spawns.maxLiveActors);
    const creatures = creatureSlots.map((entry) => {
      const catalog = catalogByKey.get(entry.creatureKey);
      if (catalog === undefined) {
        throw new Error(
          `Generated spawn creature is absent from the catalog: ${entry.creatureKey}`,
        );
      }
      return buildCreature(
        selection.key,
        entry,
        catalog,
        activeSlotCount,
        totalSlotCount,
      );
    });

    const experiencePerHour = creatures.reduce(
      (total, creature) => total + creature.experiencePerHour,
      0,
    );

    return {
      huntId: selection.key,
      displayName: selection.displayName,
      band: requireBand(selection),
      recommendedLevel: selection.recommendedLevel,
      soloVocation: selection.soloVocation,
      sourceUrl: selection.sourceUrl,
      maxLiveActors: spawns.maxLiveActors,
      experiencePerHour,
      creatures,
    };
  });

  hunts.sort((left, right) => compareStrings(left.huntId, right.huntId));
  return HuntIndexSchema.parse({
    schemaVersion: HUNT_INDEX_SCHEMA_VERSION,
    hunts,
  });
}

export function encodeHuntIndex(index: HuntIndex): string {
  return `${JSON.stringify(HuntIndexSchema.parse(index), null, 2)}\n`;
}
