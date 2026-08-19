import type { Seed } from '../simulation/identity.ts';
import type { SimulationSnapshot } from '../simulation/types.ts';

export const SAVE_SCHEMA_VERSION = 1;

export interface RunBagEntry {
  readonly itemKey: string;
  readonly count: number;
}

export interface ActiveRunState {
  readonly huntId: string;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly snapshot: SimulationSnapshot;
  readonly bag: readonly RunBagEntry[];
}

export interface GameSave {
  readonly schemaVersion: number;
  readonly stash: readonly RunBagEntry[];
  readonly completedRuns: number;
  readonly session: ActiveRunState | null;
}

export type SaveDraft = { -readonly [K in keyof GameSave]: GameSave[K] };

export type SaveDiagnosticCode = 'SAVE_DOCUMENT_INVALID';

export interface SaveDiagnostic {
  readonly code: SaveDiagnosticCode;
  readonly message: string;
  readonly path: readonly (string | number)[];
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly diagnostics: readonly SaveDiagnostic[];
    };

export function createEmptyGameSave(): GameSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    stash: [],
    completedRuns: 0,
    session: null,
  };
}
