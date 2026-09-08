import { describe, expect, it } from 'vitest';

import {
  createEmptyEquipment,
  createEmptyGameSave,
  parseGameSave,
  SAVE_SCHEMA_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '../index.ts';
import type { GameSave } from './types.ts';

function createSnapshot() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
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
    schemaVersion: SAVE_SCHEMA_VERSION,
    character: {
      experience: 0,
      equipment: createEmptyEquipment(),
      collection: [] as string[],
      bestiary: [] as {
        creatureKey: string;
        kills: number;
        rewardClaimed: boolean;
      }[],
      achievements: [] as {
        achievementId: string;
        progress: number;
        rewardClaimed: boolean;
      }[],
    },
    stash: [] as { itemKey: string; count: number }[],
    gold: 0,
    nextHuntBuff: 'none' as const,
    completedRuns: 0,
    session: null as {
      huntId: string;
      scenarioId: string;
      scenarioRevision: number;
      seed: string;
      snapshot: ReturnType<typeof createSnapshot>;
      bag: { itemKey: string; count: number }[];
      lastBestiaryEventSequence: number;
    } | null,
  };
}

function createFullSave() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    character: {
      experience: 28_800,
      equipment: createEmptyEquipment(),
      collection: [] as string[],
      bestiary: [],
      achievements: [],
    },
    stash: [
      { itemKey: 'item:tibia:gold-coin', count: 10 },
      { itemKey: 'item:tibia:health-potion', count: 2 },
    ],
    gold: 37,
    nextHuntBuff: 'none' as const,
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
      lastBestiaryEventSequence: 0,
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
  it('pins SAVE_SCHEMA_VERSION at 8', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(8);
  });

  it('createEmptyGameSave produces a valid empty v8 document', () => {
    const empty = createEmptyGameSave();

    expect(empty).toEqual({
      schemaVersion: SAVE_SCHEMA_VERSION,
      character: {
        experience: 0,
        equipment: createEmptyEquipment(),
        collection: [],
        bestiary: [],
        achievements: [],
      },
      stash: [],
      gold: 0,
      nextHuntBuff: 'none',
      completedRuns: 0,
      session: null,
    });
    expect(Object.keys(empty).sort()).toEqual([
      'character',
      'completedRuns',
      'gold',
      'nextHuntBuff',
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
    expect(save.schemaVersion).toBe(8);
    expect(save.character).toEqual({
      experience: 28_800,
      equipment: createEmptyEquipment(),
      collection: [],
      bestiary: [],
      achievements: [],
    });
    expect(save.stash).toEqual(document.stash);
    expect(save.gold).toBe(37);
    expect(save.nextHuntBuff).toBe('none');
    expect(save.completedRuns).toBe(3);
    expect(save.session).not.toBeNull();
    expect(save.session?.bag).toEqual(document.session.bag);
    expect(save.session?.snapshot.scenarioId).toBe('pb-06-save-contract');
    expect(save.session?.lastBestiaryEventSequence).toBe(0);
  });

  it('accepts sorted bestiary progress and rejects duplicates or unsorted entries', () => {
    const accepted = createEmptyDocument();
    accepted.character.bestiary = [
      { creatureKey: 'creature:tibia:orc', kills: 3, rewardClaimed: false },
      {
        creatureKey: 'creature:tibia:rotworm',
        kills: 10,
        rewardClaimed: true,
      },
    ];
    expect(parseGameSave(accepted).ok).toBe(true);

    const duplicate = createEmptyDocument();
    duplicate.character.bestiary = [
      { creatureKey: 'creature:tibia:orc', kills: 1, rewardClaimed: false },
      { creatureKey: 'creature:tibia:orc', kills: 2, rewardClaimed: false },
    ];
    expectRejectedAt(duplicate, ['character', 'bestiary', 1, 'creatureKey']);

    const unsorted = createEmptyDocument();
    unsorted.character.bestiary = [
      {
        creatureKey: 'creature:tibia:rotworm',
        kills: 1,
        rewardClaimed: false,
      },
      { creatureKey: 'creature:tibia:orc', kills: 2, rewardClaimed: false },
    ];
    expectRejectedAt(unsorted, ['character', 'bestiary', 1, 'creatureKey']);
  });

  it('accepts sorted achievement progress and rejects duplicates or unsorted entries', () => {
    const accepted = createEmptyDocument();
    accepted.character.achievements = [
      {
        achievementId: 'achievement:huntbound:first-hunt',
        progress: 1,
        rewardClaimed: true,
      },
      {
        achievementId: 'achievement:huntbound:honest-work',
        progress: 0,
        rewardClaimed: false,
      },
    ];
    expect(parseGameSave(accepted).ok).toBe(true);

    const duplicate = createEmptyDocument();
    duplicate.character.achievements = [
      {
        achievementId: 'achievement:huntbound:first-hunt',
        progress: 1,
        rewardClaimed: true,
      },
      {
        achievementId: 'achievement:huntbound:first-hunt',
        progress: 1,
        rewardClaimed: true,
      },
    ];
    expectRejectedAt(duplicate, [
      'character',
      'achievements',
      1,
      'achievementId',
    ]);

    const unsorted = createEmptyDocument();
    unsorted.character.achievements = [
      {
        achievementId: 'achievement:huntbound:honest-work',
        progress: 0,
        rewardClaimed: false,
      },
      {
        achievementId: 'achievement:huntbound:first-hunt',
        progress: 1,
        rewardClaimed: true,
      },
    ];
    expectRejectedAt(unsorted, [
      'character',
      'achievements',
      1,
      'achievementId',
    ]);
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

  it('rejects gold that is negative or fractional', () => {
    const negative = createEmptyDocument();
    negative.gold = -1;
    expectRejectedAt(negative, ['gold']);

    const fractional = createEmptyDocument();
    fractional.gold = 1.5;
    expectRejectedAt(fractional, ['gold']);
  });

  it('rejects an unknown nextHuntBuff state', () => {
    const document = createEmptyDocument();
    (document as { nextHuntBuff: string }).nextHuntBuff = 'stocked';
    expectRejectedAt(document, ['nextHuntBuff']);
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

  it('rejects a fractional or negative character experience', () => {
    const fractional = createEmptyDocument();
    fractional.character = { ...fractional.character, experience: 1.5 };
    expectRejectedAt(fractional, ['character', 'experience']);

    const negative = createEmptyDocument();
    negative.character = { ...negative.character, experience: -1 };
    expectRejectedAt(negative, ['character', 'experience']);
  });

  it('rejects a document without a character', () => {
    const { character: _character, ...withoutCharacter } =
      createEmptyDocument();
    void _character;
    expectRejectedAt(withoutCharacter, ['character']);
  });

  it('rejects an unknown field on the document', () => {
    const document = {
      ...createEmptyDocument(),
      xp: 1,
    };
    expectRejectedAt(document, ['xp']);
  });
});
