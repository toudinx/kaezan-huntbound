import {
  type AssetSelectionManifest,
  AssetSelectionManifestSchema,
  type AssetSourceGroup,
  deriveHuntPackKeys,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_COMBAT_KEYS,
  HUNT_PACK_CREATURE_KEY,
  HUNT_PACK_DEAD_ROTWORM_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_LOOT_KEYS,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
  HUNT_PACK_OUTFIT_KEY,
  HUNT_PACK_SMALL_SPLASH_KEY,
  type HuntPackSelection,
  hashHuntRegion,
  validateHuntPack,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';

export const HUNT_PACK_BUDGET = {
  maxEntries: 512,
  maxBytes: 6 * 1024 * 1024,
} as const;

export type HuntPackMetadata = {
  readonly huntId: string;
  readonly packKey: string;
};

export function deriveHuntPackSelection(
  region: MapRegion,
  metadata: HuntPackMetadata,
): HuntPackSelection {
  const selection: HuntPackSelection = {
    packKey: metadata.packKey,
    huntId: metadata.huntId,
    regionSha256: hashHuntRegion(region),
    keys: [
      ...deriveHuntPackKeys(region),
      HUNT_PACK_CREATURE_KEY,
      HUNT_PACK_OUTFIT_KEY,
      ...HUNT_PACK_COMBAT_KEYS,
      ...HUNT_PACK_LOOT_KEYS,
    ],
    budget: HUNT_PACK_BUDGET,
  };
  const diagnostics = validateHuntPack(
    selection,
    region,
    selection.keys.map((key) => ({ key, bytes: 0 })),
  );
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics.map(({ code, message }) => `${code}: ${message}`).join('\n'),
    );
  }
  return selection;
}

function identityForKey(key: string): {
  readonly category: 'outfit' | 'creature' | 'object' | 'effect' | 'missile';
  readonly sourceIdentity:
    | { readonly kind: 'lookType'; readonly id: number }
    | { readonly kind: 'clientId'; readonly id: number }
    | { readonly kind: 'effectId'; readonly id: number }
    | { readonly kind: 'missileId'; readonly id: number };
  readonly pivot: { readonly x: number; readonly y: number };
} {
  if (key === HUNT_PACK_CREATURE_KEY) {
    return {
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: 26 },
      pivot: { x: 0.5, y: 1 },
    };
  }
  if (key === HUNT_PACK_OUTFIT_KEY) {
    return {
      category: 'outfit',
      sourceIdentity: { kind: 'lookType', id: 131 },
      pivot: { x: 0.5, y: 1 },
    };
  }
  if (key === HUNT_PACK_BLOOD_EFFECT_KEY) {
    return {
      category: 'effect',
      sourceIdentity: { kind: 'effectId', id: 1 },
      pivot: { x: 0.5, y: 0.5 },
    };
  }
  if (key === HUNT_PACK_HIT_AREA_EFFECT_KEY) {
    return {
      category: 'effect',
      sourceIdentity: { kind: 'effectId', id: 10 },
      pivot: { x: 0.5, y: 0.5 },
    };
  }
  if (key === HUNT_PACK_MAGIC_BLUE_EFFECT_KEY) {
    return {
      category: 'effect',
      sourceIdentity: { kind: 'effectId', id: 13 },
      pivot: { x: 0.5, y: 0.5 },
    };
  }
  if (key === HUNT_PACK_SMALL_SPLASH_KEY) {
    return {
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 2889 },
      pivot: { x: 0.5, y: 0.5 },
    };
  }
  if (key === HUNT_PACK_DEAD_ROTWORM_KEY) {
    return {
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 5967 },
      pivot: { x: 0.5, y: 1 },
    };
  }

  const lootClientIds: ReadonlyMap<string, number> = new Map([
    ['item:tibia:gold-coin', 3031],
    ['item:tibia:ham', 3582],
    ['item:tibia:legion-helmet', 3374],
    ['item:tibia:lump-of-dirt', 9692],
    ['item:tibia:mace', 3286],
    ['item:tibia:meat', 3577],
    ['item:tibia:sword', 3264],
    ['item:tibia:worm', 3492],
  ]);
  const lootClientId = lootClientIds.get(key);
  if (lootClientId !== undefined) {
    return {
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: lootClientId },
      pivot: { x: 0.5, y: 1 },
    };
  }

  const match = /^tile:tibia:([1-9][0-9]*)$/.exec(key);
  if (match === null) {
    throw new Error(`Unsupported hunt asset key ${key}`);
  }
  return {
    category: 'object',
    sourceIdentity: { kind: 'clientId', id: Number(match[1]) },
    pivot: { x: 0.5, y: 1 },
  };
}

export function createHuntAssetSelection(input: {
  readonly hunt: HuntPackSelection;
  readonly group: AssetSourceGroup;
  readonly consumer: string;
}): AssetSelectionManifest {
  const entries = [...input.hunt.keys]
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const identity = identityForKey(key);
      return {
        key,
        category: identity.category,
        sourceIdentity: identity.sourceIdentity,
        sourceGroupId: input.group.groupId,
        consumer: input.consumer,
        rationale: `Covers ${key} required by the frozen hunt selection.`,
        presentation: {
          pivot: identity.pivot,
          scale: 1,
          filtering: 'nearest' as const,
        },
      };
    });

  const result = AssetSelectionManifestSchema.safeParse({
    schemaVersion: '1',
    selectionId: `selection:${input.hunt.packKey}`,
    packId: `asset-pack:${input.hunt.packKey}`,
    contentVersion: `${input.hunt.packKey}@${input.hunt.regionSha256.slice(0, 12)}`,
    buildProfiles: input.group.buildProfiles,
    groups: [input.group],
    entries,
    hunt: input.hunt,
  });
  if (!result.success) {
    throw new Error(
      result.error.issues
        .map(({ path, message }) => `${path.join('.')}: ${message}`)
        .join('\n'),
    );
  }
  return result.data;
}
