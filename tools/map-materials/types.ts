export interface MaterialDefinition {
  readonly key: string;
  readonly serverIds: readonly number[];
}

export interface MaterialWindow {
  readonly floors: readonly number[];
  readonly maxX: number;
  readonly maxY: number;
  readonly minX: number;
  readonly minY: number;
  readonly reason: string;
}

export interface MaterialGridCell {
  readonly items: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MaterialGrid {
  readonly bounds: MaterialWindow;
  readonly cells: ReadonlyMap<string, MaterialGridCell>;
}

export interface MaterialObservation {
  readonly serverId: number;
  readonly signature: number;
}

export interface MaterialBorderCase {
  readonly count: number;
  readonly serverId: number;
  readonly signature: number;
}

export interface MaterialAmbiguityCandidate {
  readonly count: number;
  readonly serverId: number;
}

export interface MaterialAmbiguity {
  readonly candidates: readonly MaterialAmbiguityCandidate[];
  readonly materialKey: string;
  readonly message: string;
  readonly signature: number;
}

export interface MaterialCoverage {
  readonly minimumOccurrence: number | null;
  readonly observedCases: number;
  readonly sampledTiles: number;
  readonly totalCases: 256;
}

export interface MaterialTableEntry extends MaterialDefinition {
  readonly ambiguities: readonly MaterialAmbiguity[];
  readonly cases: readonly MaterialBorderCase[];
  readonly coverage: MaterialCoverage;
}

export interface MaterialBordersTable {
  readonly materials: readonly MaterialTableEntry[];
  readonly schemaVersion: number;
  readonly sourcePath: string;
  readonly windows: readonly MaterialWindow[];
}

export interface MaterialMiningRecipe {
  readonly ambiguityMinimumOccurrence: number;
  readonly materials: readonly MaterialDefinition[];
  readonly schemaVersion: number;
  readonly sourcePath: string;
  readonly windows: readonly MaterialWindow[];
}
