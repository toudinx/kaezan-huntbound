import type { ActiveRunState, Seed } from '@huntbound/contracts';

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
