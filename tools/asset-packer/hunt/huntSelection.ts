import {
  type AssetSelectionManifest,
  AssetSelectionManifestSchema,
  type AssetSourceGroup,
  deriveHuntPackKeys,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_COMBAT_KEYS,
  HUNT_PACK_CREATURE_KEY,
  HUNT_PACK_DEAD_ROTWORM_KEY,
  HUNT_PACK_DRAGON_CREATURE_KEY,
  HUNT_PACK_DRAGON_LOOT_KEYS,
  HUNT_PACK_HERO_CREATURE_KEY,
  HUNT_PACK_HERO_LOOT_KEYS,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_LOOT_KEYS,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
  HUNT_PACK_OUTFIT_KEY,
  HUNT_PACK_SMALL_SPLASH_KEY,
  HUNT_PACK_SPELL_CLIENT_IDS,
  HUNT_PACK_SPELL_KEYS,
  type HuntPackSelection,
  hashHuntRegion,
  validateHuntPack,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';

/**
 * A ceiling on what one hunt costs to load, not a claim about the map. Orc
 * Fortress needs 541 media entries for the real 65x68x3 box the PB-10-13
 * extraction froze, and 512 predates it; the four other hunts sit between 61
 * and 226, so the headroom is structural. The byte ceiling is untouched and
 * remains far from binding.
 */
export const HUNT_PACK_BUDGET = {
  maxEntries: 640,
  maxBytes: 6 * 1024 * 1024,
} as const;

export type HuntPackCreatureAsset = {
  readonly key: string;
  readonly lookType: number;
  readonly corpse?: {
    readonly key: string;
    readonly clientId: number;
  };
};

export type HuntPackAssetConfig = {
  readonly creature: HuntPackCreatureAsset;
  readonly extraCreatures?: readonly HuntPackCreatureAsset[];
  readonly loot: readonly {
    readonly key: string;
    readonly clientId: number;
  }[];
};

const defaultAssetConfig: HuntPackAssetConfig = {
  creature: {
    key: HUNT_PACK_CREATURE_KEY,
    lookType: 26,
    corpse: { key: HUNT_PACK_DEAD_ROTWORM_KEY, clientId: 5967 },
  },
  loot: [
    { key: 'item:tibia:gold-coin', clientId: 3031 },
    { key: 'item:tibia:ham', clientId: 3582 },
    { key: 'item:tibia:legion-helmet', clientId: 3374 },
    { key: 'item:tibia:lump-of-dirt', clientId: 9692 },
    { key: 'item:tibia:mace', clientId: 3286 },
    { key: 'item:tibia:meat', clientId: 3577 },
    { key: 'item:tibia:sword', clientId: 3264 },
    { key: 'item:tibia:worm', clientId: 3492 },
  ],
};

export type HuntPackMetadata = {
  readonly huntId: string;
  readonly packKey: string;
  readonly creatureKey?: string;
  readonly lootKeys?: readonly string[];
  readonly assetSelection?: HuntPackAssetConfig;
};

export function huntPackExtraKeys(
  assetSelection: HuntPackAssetConfig = defaultAssetConfig,
): readonly string[] {
  const creatures = [
    assetSelection.creature,
    ...(assetSelection.extraCreatures ?? []),
  ];
  return [
    ...creatures.map((creature) => creature.key),
    HUNT_PACK_OUTFIT_KEY,
    ...HUNT_PACK_COMBAT_KEYS,
    ...HUNT_PACK_SPELL_KEYS,
    ...creatures.flatMap((creature) =>
      creature.corpse === undefined ? [] : [creature.corpse.key],
    ),
    ...assetSelection.loot.map(({ key }) => key),
  ];
}

const knownLootClientIds: ReadonlyMap<string, number> = new Map([
  ['item:tibia:gold-coin', 3031],
  ['item:tibia:ham', 3582],
  ['item:tibia:legion-helmet', 3374],
  ['item:tibia:lump-of-dirt', 9692],
  ['item:tibia:mace', 3286],
  ['item:tibia:meat', 3577],
  ['item:tibia:sword', 3264],
  ['item:tibia:worm', 3492],
  ['item:tibia:arrow', 3447],
  ['item:tibia:bow', 3350],
  ['item:tibia:green-tunic', 3563],
  ['item:tibia:sniper-arrow', 7364],
  ['item:tibia:dragon-ham', 3583],
  ['item:tibia:steel-shield', 3409],
  ['item:tibia:dragon-s-tail', 11457],
  ['item:tibia:crossbow', 3349],
  ['item:tibia:burst-arrow', 3449],
  ['item:tibia:longsword', 3285],
  ['item:tibia:steel-helmet', 3351],
  ['item:tibia:broadsword', 3301],
  ['item:tibia:plate-legs', 3557],
]);

function assetSelectionForMetadata(
  metadata: HuntPackMetadata,
): HuntPackAssetConfig {
  if (metadata.assetSelection !== undefined) {
    return metadata.assetSelection;
  }

  const creatureKey = metadata.creatureKey ?? HUNT_PACK_CREATURE_KEY;
  const lookType =
    creatureKey === HUNT_PACK_HERO_CREATURE_KEY
      ? 73
      : creatureKey === HUNT_PACK_DRAGON_CREATURE_KEY
        ? 34
        : creatureKey === HUNT_PACK_CREATURE_KEY
          ? 26
          : undefined;
  if (lookType === undefined) {
    throw new Error(`Unsupported hunt creature key ${creatureKey}`);
  }
  const corpse =
    creatureKey === HUNT_PACK_CREATURE_KEY
      ? defaultAssetConfig.creature.corpse
      : undefined;

  const lootKeys =
    metadata.lootKeys ??
    (creatureKey === HUNT_PACK_HERO_CREATURE_KEY
      ? HUNT_PACK_HERO_LOOT_KEYS
      : creatureKey === HUNT_PACK_DRAGON_CREATURE_KEY
        ? HUNT_PACK_DRAGON_LOOT_KEYS
        : HUNT_PACK_LOOT_KEYS);
  return {
    creature: {
      key: creatureKey,
      lookType,
      ...(corpse === undefined ? {} : { corpse }),
    },
    loot: lootKeys.map((key) => {
      const clientId = knownLootClientIds.get(key);
      if (clientId === undefined) {
        throw new Error(`Unsupported hunt loot key ${key}`);
      }
      return { key, clientId };
    }),
  };
}

export function deriveHuntPackSelection(
  region: MapRegion,
  metadata: HuntPackMetadata,
): HuntPackSelection {
  const assetSelection = assetSelectionForMetadata(metadata);
  const selection: HuntPackSelection = {
    packKey: metadata.packKey,
    huntId: metadata.huntId,
    regionSha256: hashHuntRegion(region),
    keys: [
      ...new Set([
        ...deriveHuntPackKeys(region),
        ...huntPackExtraKeys(assetSelection),
      ]),
    ],
    budget: HUNT_PACK_BUDGET,
  };
  const diagnostics = validateHuntPack(
    selection,
    region,
    selection.keys.map((key) => ({ key, bytes: 0 })),
    { extraKeys: huntPackExtraKeys(assetSelection) },
  );
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics.map(({ code, message }) => `${code}: ${message}`).join('\n'),
    );
  }
  return selection;
}

function identityForKey(
  key: string,
  assetSelection: HuntPackAssetConfig,
): {
  readonly category:
    | 'outfit'
    | 'creature'
    | 'object'
    | 'effect'
    | 'missile'
    | 'spell';
  readonly sourceIdentity:
    | { readonly kind: 'lookType'; readonly id: number }
    | { readonly kind: 'clientId'; readonly id: number }
    | { readonly kind: 'effectId'; readonly id: number }
    | { readonly kind: 'missileId'; readonly id: number };
  readonly pivot: { readonly x: number; readonly y: number };
} {
  if (key === assetSelection.creature.key) {
    return {
      category: 'creature',
      sourceIdentity: {
        kind: 'lookType',
        id: assetSelection.creature.lookType,
      },
      pivot: { x: 0.5, y: 1 },
    };
  }
  const extraCreature = assetSelection.extraCreatures?.find(
    (creature) => creature.key === key,
  );
  if (extraCreature !== undefined) {
    return {
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: extraCreature.lookType },
      pivot: { x: 0.5, y: 1 },
    };
  }
  if (key === HUNT_PACK_HERO_CREATURE_KEY) {
    return {
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: 73 },
      pivot: { x: 0.5, y: 1 },
    };
  }
  if (key === HUNT_PACK_DRAGON_CREATURE_KEY) {
    return {
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: 34 },
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
  const spellClientId = HUNT_PACK_SPELL_CLIENT_IDS.get(key);
  if (spellClientId !== undefined) {
    return {
      category: 'spell',
      sourceIdentity: { kind: 'clientId', id: spellClientId },
      pivot: { x: 0.5, y: 0.5 },
    };
  }
  const corpse = [
    assetSelection.creature,
    ...(assetSelection.extraCreatures ?? []),
  ].find((creature) => creature.corpse?.key === key)?.corpse;
  if (corpse !== undefined) {
    return {
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: corpse.clientId },
      pivot: { x: 0.5, y: 1 },
    };
  }

  const lootClientId =
    assetSelection.loot.find((loot) => loot.key === key)?.clientId ??
    knownLootClientIds.get(key);
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
  readonly assetSelection?: HuntPackAssetConfig;
}): AssetSelectionManifest {
  const assetSelection = input.assetSelection ?? defaultAssetConfig;
  const entries = [...input.hunt.keys]
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const identity = identityForKey(key, assetSelection);
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
