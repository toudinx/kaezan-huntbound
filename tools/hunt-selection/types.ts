export interface HuntSelectionRegion {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}

export interface HuntSelectionExcludedCreature {
  readonly name: string;
  readonly reason: string;
  readonly count: number;
}

/**
 * Snapshot files this hunt is extracted from, as paths relative to the snapshot
 * root and frozen by the content source lock.
 *
 * Declaring them per hunt is what lets several hunts come from several maps: the
 * pipeline never assumes a single global map, and adding a hunt is a selection
 * file plus its lock entries, never a code change.
 */
export interface HuntSelectionSource {
  readonly map: string;
  readonly spawns: string;
}

export interface HuntSelection {
  readonly key: string;
  readonly displayName: string;
  readonly sourceUrl: string;
  readonly source: HuntSelectionSource;
  readonly recommendedLevel: number;
  readonly soloVocation: string;
  readonly region: HuntSelectionRegion;
  readonly creatures: readonly string[];
  readonly excludedCreatures: readonly HuntSelectionExcludedCreature[];
  readonly expectedSpawnGroups: number;
  readonly expectedSpawnSlots: number;
  readonly expectedDroppedTransitions: number;
  readonly budget: {
    readonly maxFloors: number;
    readonly maxWidth: number;
    readonly maxHeight: number;
  };
}

export interface HuntSelectionDiagnostic {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface HuntSelectionReport {
  readonly ok: boolean;
  readonly width: number;
  readonly height: number;
  readonly floors: readonly number[];
  readonly spawnGroups: number;
  readonly spawnSlots: number;
  readonly creatureNames: readonly string[];
  readonly diagnostics: readonly HuntSelectionDiagnostic[];
}
