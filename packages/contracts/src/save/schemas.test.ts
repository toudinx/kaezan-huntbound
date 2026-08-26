import { describe, expect, it } from 'vitest';

import {
  createEmptyGameSave,
  parseGameSave,
  SAVE_SCHEMA_VERSION,
} from '../index.ts';
import type { GameSave } from './types.ts';

function createSnapshot() {
  return {
    schemaVersion: 5,
    rulesVersion: 4,
    scenarioId: 'pb-06-save-contract',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 0,
    nextEntityId: 1,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [] as unknown[],
    actors: [] as unknown[],
    pendingCommands: [] as unknown[],
    pendingIntents: [] as unknown[],
    spawnSlots: [] as unknown[],
  };
}

function createEmptyDocument() {
  return {
    schemaVersion: 2,
    stash: [] as { itemKey: string; count: number }[],
    completedRuns: 0,
    session: null as {
      huntId: string;
      scenarioId: string;
      scenarioRevision: number;
      seed: string;
      snapshot: ReturnType<typeof createSnapshot>;
      bag: { itemKey: string; count: number }[];
    } | null,
  };
}

function createFullSave() {
  return {
    schemaVersion: 2,
    stash: [
      { itemKey: 'item:tibia:gold-coin', count: 10 },
      { itemKey: 'item:tibia:health-potion', count: 2 },
    ],
    completedRuns: 3,
    session: {
      huntId: 'venore-rotworm-cave',
      scenarioId: 'pb-06-save-contract',
      scenarioRevision: 1,
      seed: '0f1e2d3c4b5a6978',
      snapshot: createSnapshot(),
      bag: [
        { itemKey: 'item:tibia:gold-coin', count: 4 },
        { itemKey: 'item:tibia:sword', count: 1 },
      ],
    },
  };
}

function expectRejectedAt(value: unknown, path: readonly (string | number)[]) {
  const result = parseGameSave(value);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected parseGameSave to reject the document');
  }
  expect(
    result.diagnostics.map((diagnostic) => diagnostic.path),
  ).toContainEqual(path);
}

describe('game save contract', () => {
  it('pins SAVE_SCHEMA_VERSION at 2', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(2);
  });

  it('createEmptyGameSave produces a valid empty v2 document', () => {
    const empty = createEmptyGameSave();

    expect(empty).toEqual({
      schemaVersion: 2,
      stash: [],
      completedRuns: 0,
      session: null,
    });
    expect(Object.keys(empty).sort()).toEqual([
      'completedRuns',
      'schemaVersion',
      'session',
      'stash',
    ]);

    const parsed = parseGameSave(empty);
    expect(parsed).toEqual({ ok: true, value: empty });
  });

  it('accepts a complete document with an active session and bag', () => {
    const document = createFullSave();
    const parsed = parseGameSave(document);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected the complete save document to be accepted');
    }

    const save: GameSave = parsed.value;
    expect(save.schemaVersion).toBe(2);
    expect(save.stash).toEqual(document.stash);
    expect(save.completedRuns).toBe(3);
    expect(save.session).not.toBeNull();
    expect(save.session?.bag).toEqual(document.session.bag);
    expect(save.session?.snapshot.scenarioId).toBe('pb-06-save-contract');
  });

  it('rejects count 0, negative, or fractional', () => {
    const zero = createEmptyDocument();
    zero.stash = [{ itemKey: 'item:tibia:gold-coin', count: 0 }];
    expectRejectedAt(zero, ['stash', 0, 'count']);

    const negative = createEmptyDocument();
    negative.stash = [{ itemKey: 'item:tibia:gold-coin', count: -1 }];
    expectRejectedAt(negative, ['stash', 0, 'count']);

    const fractional = createEmptyDocument();
    fractional.stash = [{ itemKey: 'item:tibia:gold-coin', count: 1.5 }];
    expectRejectedAt(fractional, ['stash', 0, 'count']);
  });

  it('rejects a duplicate itemKey in stash', () => {
    const document = createEmptyDocument();
    document.stash = [
      { itemKey: 'item:tibia:gold-coin', count: 1 },
      { itemKey: 'item:tibia:gold-coin', count: 2 },
    ];
    expectRejectedAt(document, ['stash', 1, 'itemKey']);
  });

  it('rejects a duplicate itemKey in bag', () => {
    const document = createFullSave();
    document.session.bag = [
      { itemKey: 'item:tibia:gold-coin', count: 1 },
      { itemKey: 'item:tibia:gold-coin', count: 2 },
    ];
    expectRejectedAt(document, ['session', 'bag', 1, 'itemKey']);
  });

  it('rejects stash that is not ordered by itemKey', () => {
    const document = createEmptyDocument();
    document.stash = [
      { itemKey: 'item:tibia:health-potion', count: 1 },
      { itemKey: 'item:tibia:gold-coin', count: 1 },
    ];
    expectRejectedAt(document, ['stash', 1, 'itemKey']);
  });

  it('rejects bag that is not ordered by itemKey', () => {
    const document = createFullSave();
    document.session.bag = [
      { itemKey: 'item:tibia:sword', count: 1 },
      { itemKey: 'item:tibia:gold-coin', count: 4 },
    ];
    expectRejectedAt(document, ['session', 'bag', 1, 'itemKey']);
  });

  it('rejects completedRuns that is negative or fractional', () => {
    const negative = createEmptyDocument();
    negative.completedRuns = -1;
    expectRejectedAt(negative, ['completedRuns']);

    const fractional = createEmptyDocument();
    fractional.completedRuns = 1.5;
    expectRejectedAt(fractional, ['completedRuns']);
  });

  it('rejects a document without schemaVersion', () => {
    const { schemaVersion: _schemaVersion, ...withoutVersion } =
      createEmptyDocument();
    void _schemaVersion;
    expectRejectedAt(withoutVersion, ['schemaVersion']);
  });

  it('rejects a session whose snapshot fails the existing snapshot schema', () => {
    const document = createFullSave();
    document.session.snapshot = { schemaVersion: 4 } as ReturnType<
      typeof createSnapshot
    >;
    expectRejectedAt(document, ['session', 'snapshot', 'rulesVersion']);
  });

  it('rejects an unknown field on the document', () => {
    const document = {
      ...createEmptyDocument(),
      xp: 1,
    };
    expectRejectedAt(document, ['xp']);
  });
});
