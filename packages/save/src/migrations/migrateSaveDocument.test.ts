import {
  activeCharacter,
  createEmptyCharacterProgress,
  parseGameSave,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { makeSession, saveWithSession } from '../session/sessionTestUtils.ts';
import { migrateSaveDocument } from './migrateSaveDocument.ts';

describe('save schema v1 to v2', () => {
  it('discards indexed spawn slots and opens at the current schema', () => {
    const current = saveWithSession(makeSession());
    const session = current.session;
    if (session === null) {
      throw new Error('expected a session to migrate');
    }

    const v1 = {
      ...current,
      schemaVersion: 1,
      session: {
        ...session,
        snapshot: {
          ...session.snapshot,
          spawnSlots: [
            { groupIndex: 0, slotIndex: 0, readyAtTick: 12, entityId: 1 },
          ],
        },
      },
    };

    const migrated = migrateSaveDocument(v1);
    const parsed = parseGameSave(migrated);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v1 save did not open after 1→2: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(9);
    expect(parsed.value.session).not.toBeNull();
    expect(parsed.value.session?.snapshot.spawnSlots).toEqual([]);
  });
});

describe('save schema v2 to v3', () => {
  it('gives a save written before the persistent character a level 1 one', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:gold-coin', count: 12 },
    ]);
    const v2 = { ...current, schemaVersion: 2 };

    const parsed = parseGameSave(migrateSaveDocument(v2));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v2 save did not open after 2→3: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(9);
    expect(activeCharacter(parsed.value)).toEqual(
      createEmptyCharacterProgress(),
    );
    // Nothing the player had already earned is touched by the bump.
    expect(parsed.value.stash).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 12 },
    ]);
    expect(parsed.value.session).not.toBeNull();
  });
});

describe('save schema v3 to v4', () => {
  it('opens a save written before equipment with empty slots and no collection', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ]);
    const v3 = {
      ...current,
      schemaVersion: 3,
      character: { experience: 2_450 },
    };

    const parsed = parseGameSave(migrateSaveDocument(v3));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v3 save did not open after 3\u21924: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(activeCharacter(parsed.value)).toEqual({
      ...createEmptyCharacterProgress(),
      experience: 2_450,
    });
    // The helmet they already farmed is where the first equipped piece comes
    // from, so the stash it sits in is untouched.
    expect(parsed.value.stash).toEqual([
      { itemKey: 'item:tibia:legion-helmet', count: 1 },
    ]);
  });
});

describe('save schema v4 to v5', () => {
  it('adds an empty wallet without changing the existing inventory', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
    const { gold: _gold, ...withoutGold } = current;
    void _gold;
    const v4 = { ...withoutGold, schemaVersion: 4 };

    const parsed = parseGameSave(migrateSaveDocument(v4));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v4 save did not open after 4→5: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(9);
    expect(parsed.value.gold).toBe(0);
    expect(parsed.value.nextHuntBuff).toBe('none');
    expect(parsed.value.stash).toEqual([
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
  });
});

describe('save schema v5 to v6', () => {
  it('adds an empty next-hunt blessing without touching gold or stash', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
    const { nextHuntBuff: _nextHuntBuff, ...withoutBuff } = current;
    void _nextHuntBuff;
    const v5 = { ...withoutBuff, schemaVersion: 5, gold: 18 };

    const parsed = parseGameSave(migrateSaveDocument(v5));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v5 save did not open after 5→6: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(9);
    expect(parsed.value.gold).toBe(18);
    expect(parsed.value.nextHuntBuff).toBe('none');
    expect(parsed.value.stash).toEqual([
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
  });
});

describe('save schema v6 to v7', () => {
  it('adds an empty bestiary and a zero event cursor', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
    const session = current.session;
    if (session === null) {
      throw new Error('expected a session to migrate');
    }
    const { lastBestiaryEventSequence: _cursor, ...withoutCursor } = session;
    void _cursor;
    const v6 = {
      ...current,
      schemaVersion: 6,
      character: { experience: 0 },
      session: withoutCursor,
    };

    const parsed = parseGameSave(migrateSaveDocument(v6));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v6 save did not open after 6→7: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(9);
    expect(parsed.value.bestiary).toEqual([]);
    expect(parsed.value.achievements).toEqual([]);
    expect(parsed.value.session?.lastBestiaryEventSequence).toBe(0);
    expect(parsed.value.stash).toEqual([
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
  });
});

describe('save schema v7 to v8', () => {
  it('adds an empty achievement ledger to a save written before PB-13-08', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
    const v7 = {
      ...current,
      schemaVersion: 7,
      character: { experience: 0, bestiary: [] },
    };

    const parsed = parseGameSave(migrateSaveDocument(v7));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v7 save did not open after 7→8: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(9);
    expect(parsed.value.achievements).toEqual([]);
    expect(parsed.value.bestiary).toEqual([]);
    expect(parsed.value.stash).toEqual([
      { itemKey: 'item:tibia:meat', count: 4 },
    ]);
  });
});
