import type { Seed } from '../simulation/identity.ts';
import type { SimulationSnapshot } from '../simulation/types.ts';

export const SAVE_SCHEMA_VERSION = 6;

/**
 * Whether a next-hunt blessing is sitting on the character.
 *
 * `none` is the empty wallet of blessings: nothing bought, nothing running.
 * `pending` is paid and waiting for the next run. `active` is already inside
 * that run. Reloading must not charge again and must not stretch the duration
 * past the run that consumed it.
 */
export const NEXT_HUNT_BUFF_STATES = ['none', 'pending', 'active'] as const;

export type NextHuntBuffState = (typeof NEXT_HUNT_BUFF_STATES)[number];

export interface RunBagEntry {
  readonly itemKey: string;
  readonly count: number;
}

/**
 * The six places a piece of gear can sit.
 *
 * They are Huntbound slots, not Canary's `slotType` words: which of those words
 * lands here is a content rule and lives in
 * `packages/content/src/runtime/equipment.ts`. The save only needs to know that
 * a slot holds at most one item key.
 */
export const EQUIPMENT_SLOTS = [
  'weapon',
  'shield',
  'helmet',
  'armor',
  'legs',
  'boots',
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

/** What the character is wearing. `null` is an empty slot. */
export type CharacterEquipment = {
  readonly [Slot in EquipmentSlot]: string | null;
};

/**
 * The character the player keeps between runs.
 *
 * Experience is stored alone and the level is a pure function of it
 * (`levelForExperience`), so there is no second number that can drift out of
 * agreement with the first. Decision 1 of the PB-13 README is what makes this
 * live outside `session` -- dying costs the bag and the run credit, never the
 * character.
 *
 * `equipment` is the set the character is wearing and `collection` is every
 * item key they have ever banked, which is the axis decision 4 of that README
 * makes the point of staying in a band. A piece that is being worn is not in
 * the stash: it left it when it was equipped and returns when it comes off.
 */
export interface CharacterProgress {
  readonly experience: number;
  readonly equipment: CharacterEquipment;
  /** Unique item keys ever banked, in UTF-16 code unit order. */
  readonly collection: readonly string[];
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
  /** Gold already banked by the character; it survives runs and reloads. */
  readonly gold: number;
  /**
   * The next-hunt blessing. `none` reproduces a save written before PB-13-06.
   */
  readonly nextHuntBuff: NextHuntBuffState;
  readonly completedRuns: number;
  readonly session: ActiveRunState | null;
}

export type SaveDraft = { -readonly [K in keyof GameSave]: GameSave[K] };

export function createEmptyEquipment(): CharacterEquipment {
  return {
    weapon: null,
    shield: null,
    helmet: null,
    armor: null,
    legs: null,
    boots: null,
  };
}

export function createEmptyCharacterProgress(): CharacterProgress {
  return {
    experience: 0,
    equipment: createEmptyEquipment(),
    collection: [],
  };
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
    gold: 0,
    nextHuntBuff: 'none',
    completedRuns: 0,
    session: null,
  };
}
