import {
  type GameSave,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { decideResume } from './decideResume.ts';
import {
  makeSession,
  OTHER_SEED,
  saveWithSession,
  TEST_IDENTITY,
} from './sessionTestUtils.ts';

function emptySave(): GameSave {
  return {
    schemaVersion: 1,
    stash: [],
    completedRuns: 0,
    session: null,
  };
}

describe('decideResume', () => {
  it('returns fresh when the save has no session', () => {
    expect(decideResume(emptySave(), TEST_IDENTITY)).toEqual({ kind: 'fresh' });
  });

  it('returns resume with the session when every compatibility field matches', () => {
    const session = makeSession();
    const save = saveWithSession(session);

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'resume',
      session,
    });
  });

  it('discards when scenarioId differs', () => {
    const save = saveWithSession(makeSession({ scenarioId: 'other-scenario' }));

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'scenarioId',
    });
  });

  it('discards when scenarioRevision differs', () => {
    const save = saveWithSession(makeSession({ scenarioRevision: 2 }));

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'scenarioRevision',
    });
  });

  it('discards when seed differs', () => {
    const save = saveWithSession(makeSession({ seed: OTHER_SEED }));

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'seed',
    });
  });

  it('discards when snapshot.schemaVersion differs from SIMULATION_SCHEMA_VERSION', () => {
    const session = makeSession();
    const save = saveWithSession({
      ...session,
      snapshot: {
        ...session.snapshot,
        schemaVersion: SIMULATION_SCHEMA_VERSION + 1,
      },
    });

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'schemaVersion',
    });
  });

  it('discards when snapshot.rulesVersion differs from SIMULATION_RULES_VERSION', () => {
    const session = makeSession();
    const save = saveWithSession({
      ...session,
      snapshot: {
        ...session.snapshot,
        rulesVersion: SIMULATION_RULES_VERSION + 1,
      },
    });

    expect(decideResume(save, TEST_IDENTITY)).toEqual({
      kind: 'discard',
      reason: 'rulesVersion',
    });
  });
});
