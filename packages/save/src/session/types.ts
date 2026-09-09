import type {
  ActiveRunState,
  CharacterProgress,
  Seed,
} from '@huntbound/contracts';

/**
 * How a run ended, and therefore what it was worth. `died` exists because
 * decision 1 of the PB-13 README makes death cost the bag and the credit.
 */
export type RunOutcome = 'completed' | 'abandoned' | 'died';

/**
 * One write's worth of state: where the run is, and where the character is.
 *
 * They travel together because they have to agree. A checkpoint rewinds the
 * run to the tick it captured; if the experience earned after that tick had
 * been banked separately, resuming would hand the player the same kills twice.
 */
export interface RunCheckpoint {
  readonly session: ActiveRunState;
  /**
   * Only what a run can move.
   *
   * Equipment and the collection belong to the atlas, which is the one place
   * they can be changed and the one place no run is open. Handing the whole
   * character to a checkpoint would let a mid-run write replace a set the
   * player put on between runs with the one they wore when the run started.
   */
  readonly character: Pick<CharacterProgress, 'experience'>;
}

export interface RunIdentity {
  readonly huntId: string;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  /** Optional keeps old callers source-compatible; new runs always provide it. */
  readonly vocationKey?: string;
}

export type ResumeRejection =
  | 'vocationKey'
  | 'scenarioId'
  | 'scenarioRevision'
  | 'seed'
  | 'schemaVersion'
  | 'rulesVersion';

export type ResumeDecision =
  | { readonly kind: 'resume'; readonly session: ActiveRunState }
  | { readonly kind: 'discard'; readonly reason: ResumeRejection }
  | { readonly kind: 'fresh' };
