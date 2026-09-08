import type { Seed } from '../simulation/identity.ts';
import type { SimulationSnapshot } from '../simulation/types.ts';

export const SAVE_SCHEMA_VERSION = 3;

export interface RunBagEntry {
  readonly itemKey: string;
  readonly count: number;
}

/**
 * The character the player keeps between runs.
 *
 * Only the total experience is stored: the level is a pure function of it
 * (`levelForExperience`), so there is no second number that can drift out of
 * agreement with the first. Decision 1 of the PB-13 README is what makes this
 * live outside `session` -- dying costs the bag and the run credit, never the
 * character.
 */
export interface CharacterProgress {
  readonly experience: number;
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
  readonly character: CharacterProgress;
  readonly stash: readonly RunBagEntry[];
  readonly completedRuns: number;
  readonly session: ActiveRunState | null;
}

export type SaveDraft = { -readonly [K in keyof GameSave]: GameSave[K] };

export function createEmptyCharacterProgress(): CharacterProgress {
  return { experience: 0 };
}

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
    character: createEmptyCharacterProgress(),
    stash: [],
    completedRuns: 0,
    session: null,
  };
}
