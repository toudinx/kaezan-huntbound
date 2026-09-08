import type { ActiveRunState, Seed } from '@huntbound/contracts';

/**
 * How a run ended, and therefore what it was worth. `died` exists because
 * decision 1 of the PB-13 README makes death cost the bag and the credit.
 */
export type RunOutcome = 'completed' | 'abandoned' | 'died';

export interface RunIdentity {
  readonly huntId: string;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
}

export type ResumeRejection =
  | 'scenarioId'
  | 'scenarioRevision'
  | 'seed'
  | 'schemaVersion'
  | 'rulesVersion';

export type ResumeDecision =
  | { readonly kind: 'resume'; readonly session: ActiveRunState }
  | { readonly kind: 'discard'; readonly reason: ResumeRejection }
  | { readonly kind: 'fresh' };
