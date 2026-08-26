import type { AssetSourceGroup } from '../../../packages/assets/src/index.ts';

export type HuntPipelineConfig = {
  readonly selectionPath: string;
  readonly generatedDirectory: string;
  readonly assetFixtureRoot: string;
  readonly runtimeDirectory: string;
  readonly packKey: string;
  readonly personalSelectionPath: string;
  readonly consumer: string;
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
