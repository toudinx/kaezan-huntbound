import type { AssetSourceGroup } from '../../../packages/assets/src/index.ts';
import type { HuntPackAssetConfig } from './huntSelection.ts';

export type HuntPipelineConfig = {
  readonly selectionPath: string;
  readonly generatedDirectory: string;
  readonly assetFixtureRoot: string;
  readonly runtimeDirectory: string;
  readonly packKey: string;
  readonly personalSelectionPath: string;
  readonly consumer: string;
  readonly assetSelection: HuntPackAssetConfig;
  readonly testGroup: AssetSourceGroup;
  readonly personalGroup: AssetSourceGroup;
};

/**
 * The declarative source of truth for every hunt that the content/asset
 * pipeline knows how to build.
 */
export const HUNT_PIPELINE_REGISTRY = {
  'hunt:tibia:venore-rotworm-cave': {
    selectionPath:
      'packages/content/src/selections/hunts/venore-rotworm-cave.json',
    generatedDirectory:
      'packages/content/src/generated/hunts/venore-rotworm-cave',
    assetFixtureRoot: 'packages/test-fixtures/assets/pb04',
    runtimeDirectory: 'pb04',
    packKey: 'pb-04-venore-rotworm-cave',
    personalSelectionPath:
      'packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json',
    consumer: 'PB-04 Venore Rotworm Cave asset pack',
    assetSelection: {
      creature: { key: 'creature:tibia:rotworm', lookType: 26 },
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
    },
    testGroup: {
      groupId: 'huntbound-test',
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb04-synthetic-v1',
      licenseClass: 'huntbound-test',
      buildProfiles: ['test', 'product'],
    },
    personalGroup: {
      groupId: 'huntbound-private-assets-pb04',
      source: 'huntbound-private-assets',
      sourceSnapshot: 'pb04-private-v1',
      licenseClass: 'cipsoft-personal',
      buildProfiles: ['personal'],
    },
  },
  'hunt:tibia:cyclopolis': {
    selectionPath: 'packages/content/src/selections/hunts/cyclopolis.json',
    generatedDirectory: 'packages/content/src/generated/hunts/cyclopolis',
    assetFixtureRoot: 'packages/test-fixtures/assets/pb10-08',
    runtimeDirectory: 'pb10-08',
    packKey: 'pb-10-08-cyclopolis',
    personalSelectionPath:
      'packages/assets/catalog/selections/pb-10-08-cyclopolis.json',
    consumer: 'PB-10-08 Cyclopolis asset pack',
    assetSelection: {
      creature: { key: 'creature:tibia:cyclops', lookType: 22 },
      loot: [
        { key: 'item:tibia:gold-coin', clientId: 3031 },
        { key: 'item:tibia:meat', clientId: 3577 },
        { key: 'item:tibia:short-sword', clientId: 3294 },
        { key: 'item:tibia:cyclops-toe', clientId: 9657 },
        { key: 'item:tibia:plate-shield', clientId: 3410 },
        { key: 'item:tibia:battle-shield', clientId: 3413 },
        { key: 'item:tibia:halberd', clientId: 3269 },
      ],
    },
    testGroup: {
      groupId: 'huntbound-test-pb10-08',
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb10-08-cyclopolis-synthetic-v1',
      licenseClass: 'huntbound-test',
      buildProfiles: ['test', 'product'],
    },
    personalGroup: {
      groupId: 'huntbound-private-assets-pb10-08',
      source: 'huntbound-private-assets',
      sourceSnapshot: 'pb10-08-cyclopolis-private-v1',
      licenseClass: 'cipsoft-personal',
      buildProfiles: ['personal'],
    },
  },
  'hunt:tibia:dragon-lair': {
    selectionPath: 'packages/content/src/selections/hunts/dragon-lair.json',
    generatedDirectory: 'packages/content/src/generated/hunts/dragon-lair',
    assetFixtureRoot: 'packages/test-fixtures/assets/pb10-09',
    runtimeDirectory: 'pb10-09-dragon-lair',
    packKey: 'pb-10-09-dragon-lair',
    personalSelectionPath:
      'packages/assets/catalog/selections/pb-10-09-dragon-lair.json',
    consumer: 'PB-10-09 Dragon Lair asset pack',
    assetSelection: {
      creature: { key: 'creature:tibia:dragon', lookType: 34 },
      loot: [
        { key: 'item:tibia:gold-coin', clientId: 3031 },
        { key: 'item:tibia:dragon-ham', clientId: 3583 },
        { key: 'item:tibia:steel-shield', clientId: 3409 },
        { key: 'item:tibia:dragon-s-tail', clientId: 11457 },
        { key: 'item:tibia:crossbow', clientId: 3349 },
        { key: 'item:tibia:burst-arrow', clientId: 3449 },
        { key: 'item:tibia:longsword', clientId: 3285 },
        { key: 'item:tibia:steel-helmet', clientId: 3351 },
        { key: 'item:tibia:broadsword', clientId: 3301 },
        { key: 'item:tibia:plate-legs', clientId: 3557 },
      ],
    },
    testGroup: {
      groupId: 'huntbound-test-pb10-09',
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb10-09-synthetic-v1',
      licenseClass: 'huntbound-test',
      buildProfiles: ['test', 'product'],
    },
    personalGroup: {
      groupId: 'huntbound-private-assets-pb10-09',
      source: 'huntbound-private-assets',
      sourceSnapshot: 'pb10-09-private-v1',
      licenseClass: 'cipsoft-personal',
      buildProfiles: ['personal'],
    },
  },
  'hunt:tibia:hero-cave': {
    selectionPath: 'packages/content/src/selections/hunts/hero-cave.json',
    generatedDirectory: 'packages/content/src/generated/hunts/hero-cave',
    assetFixtureRoot: 'packages/test-fixtures/assets/pb10-10',
    runtimeDirectory: 'pb10-10-hero-cave',
    packKey: 'pb-10-10-hero-cave',
    personalSelectionPath:
      'packages/assets/catalog/selections/pb-10-10-hero-cave.json',
    consumer: 'PB-10-10 Hero Cave asset pack',
    assetSelection: {
      creature: { key: 'creature:tibia:hero', lookType: 73 },
      loot: [
        { key: 'item:tibia:gold-coin', clientId: 3031 },
        { key: 'item:tibia:arrow', clientId: 3447 },
        { key: 'item:tibia:bow', clientId: 3350 },
        { key: 'item:tibia:green-tunic', clientId: 3563 },
        { key: 'item:tibia:meat', clientId: 3577 },
        { key: 'item:tibia:sniper-arrow', clientId: 7364 },
      ],
    },
    testGroup: {
      groupId: 'huntbound-test-pb10-10',
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb10-10-synthetic-v1',
      licenseClass: 'huntbound-test',
      buildProfiles: ['test', 'product'],
    },
    personalGroup: {
      groupId: 'huntbound-private-assets-pb10-10',
      source: 'huntbound-private-assets',
      sourceSnapshot: 'pb10-10-private-v1',
      licenseClass: 'cipsoft-personal',
      buildProfiles: ['personal'],
    },
  },
} as const satisfies Readonly<Record<string, HuntPipelineConfig>>;

export type HuntPipelineEntry = HuntPipelineConfig & {
  readonly huntId: string;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Returns registry entries in the order used by every pipeline command. */
export function listHuntPipelineEntries(): readonly HuntPipelineEntry[] {
  return Object.entries(HUNT_PIPELINE_REGISTRY)
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([huntId, config]) => ({ huntId, ...config }));
}

export function getHuntPipelineEntry(
  huntId: string,
): HuntPipelineEntry | undefined {
  const config = Object.entries(HUNT_PIPELINE_REGISTRY).find(
    ([registeredHuntId]) => registeredHuntId === huntId,
  )?.[1];
  return config === undefined ? undefined : { huntId, ...config };
}
