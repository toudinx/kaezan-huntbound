import {
  DEFAULT_KNIGHT_VOCATION_KEY,
  type GameSave,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '@huntbound/contracts';

import type { ResumeDecision, RunIdentity } from './types.ts';

export type { ResumeDecision, ResumeRejection, RunIdentity } from './types.ts';

export function decideResume(
  save: GameSave,
  identity: RunIdentity,
): ResumeDecision {
  const session = save.session;
  if (session === null) {
    return { kind: 'fresh' };
  }
  if (
    session.vocationKey !==
    (identity.vocationKey ?? DEFAULT_KNIGHT_VOCATION_KEY)
  ) {
    return { kind: 'discard', reason: 'vocationKey' };
  }
  if (session.scenarioId !== identity.scenarioId) {
    return { kind: 'discard', reason: 'scenarioId' };
  }
  if (session.scenarioRevision !== identity.scenarioRevision) {
    return { kind: 'discard', reason: 'scenarioRevision' };
  }
  if (session.seed !== identity.seed) {
    return { kind: 'discard', reason: 'seed' };
  }
  if (session.snapshot.schemaVersion !== SIMULATION_SCHEMA_VERSION) {
    return { kind: 'discard', reason: 'schemaVersion' };
  }
  if (session.snapshot.rulesVersion !== SIMULATION_RULES_VERSION) {
    return { kind: 'discard', reason: 'rulesVersion' };
  }
  return { kind: 'resume', session };
}
