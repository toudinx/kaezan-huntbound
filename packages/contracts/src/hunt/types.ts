import type {
  ActorBlueprint,
  GridPosition,
  SimulationDiagnostic,
  SimulationDiagnosticCode,
  SimulationValidationResult,
} from '../simulation/types.ts';

export type KernelBlueprint = ActorBlueprint;

export type RegionId = string & { readonly __brand: 'RegionId' };
export type HuntId = string & { readonly __brand: 'HuntId' };

export const HUNT_SCHEMA_VERSION = 1;

export interface MapRegionFloor {
  readonly z: number;
  readonly ground: readonly number[];
  readonly objectsBelow: readonly {
    readonly i: number;
    readonly stack: readonly number[];
  }[];
  readonly objectsAbove: readonly {
    readonly i: number;
    readonly stack: readonly number[];
  }[];
  readonly collision: readonly number[];
}

export interface MapRegion {
  readonly schemaVersion: number;
  readonly regionId: RegionId;
  readonly regionRevision: number;
  readonly origin: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
  readonly palette: readonly number[];
  readonly floors: readonly MapRegionFloor[];
}

export interface TransitionEntry {
  readonly from: GridPosition;
  readonly to: GridPosition;
}

export interface TransitionTable {
  readonly entries: readonly TransitionEntry[];
  readonly dropped: number;
}

export interface SpawnSlotDefinition {
  readonly creatureKey: string;
  readonly blueprintId: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly offsetZ: number;
  readonly respawnTicks: number;
  /** Absolute Canary cell this seat was declared on. Survives a layout recut. */
  readonly source: GridPosition;
}

export interface SpawnGroupDefinition {
  readonly center: GridPosition;
  readonly radius: number;
  /** Absolute Canary centre of the XML group. Survives a layout recut. */
  readonly sourceCenter: GridPosition;
  readonly slots: readonly SpawnSlotDefinition[];
}

export interface SpawnTable {
  readonly groups: readonly SpawnGroupDefinition[];
  readonly maxLiveActors: number;
}

export interface HuntDefinition {
  readonly schemaVersion: number;
  readonly huntId: HuntId;
  readonly huntRevision: number;
  readonly region: MapRegion;
  readonly transitions: TransitionTable;
  readonly spawns: SpawnTable;
  readonly blueprints: readonly KernelBlueprint[];
  readonly playerStart: GridPosition;
  readonly playerBlueprintId: string;
}

export type HuntDiagnosticCode =
  | SimulationDiagnosticCode
  | 'HUNT_REGION_OUT_OF_BUDGET'
  | 'HUNT_UNKNOWN_BLUEPRINT'
  | 'HUNT_TRANSITION_INVALID'
  | 'HUNT_SPAWN_OUT_OF_REGION'
  | 'HUNT_PALETTE_INDEX_INVALID'
  | 'HUNT_INTERVAL_NOT_DIVISIBLE'
  | 'HUNT_UNKNOWN_ITEM'
  | 'HUNT_UNKNOWN_CREATURE'
  | 'HUNT_SPELL_NOT_ALLOWED';

export interface HuntDiagnostic extends Omit<SimulationDiagnostic, 'code'> {
  readonly code: HuntDiagnosticCode;
}

export type HuntValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly diagnostics: readonly HuntDiagnostic[];
    };

export type PublicHuntValidationResult<T> = SimulationValidationResult<T>;
