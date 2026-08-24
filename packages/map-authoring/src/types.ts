export const EMPTY_GROUND_ID = 0;

export interface AuthoringCell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ground: number | null;
}

export interface AuthoringGrid {
  readonly layoutId: string;
  readonly cells: readonly AuthoringCell[];
}

export interface WeightedGround {
  readonly serverId: number;
  readonly weight: number;
}

export interface MaterialBorderCase {
  readonly count: number;
  readonly serverId: number;
  readonly signature: number;
}

export interface MaterialTable {
  readonly key: string;
  readonly serverIds: readonly number[];
  readonly cases: readonly MaterialBorderCase[];
}

export interface BorderizeTables {
  readonly materials: readonly MaterialTable[];
  readonly floorMaterialKeys: readonly string[];
  readonly massMaterialKey: string;
  readonly borderMaterialKey: string;
  readonly massDominantServerId: number;
  readonly massVariants: readonly WeightedGround[];
}

export type BorderizeSeed = string | number;
