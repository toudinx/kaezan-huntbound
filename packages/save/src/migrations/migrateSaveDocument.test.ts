import {
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

    const { character: _character, ...withoutCharacter } = current;
    void _character;
    const v1 = {
      ...withoutCharacter,
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

    expect(parsed.value.schemaVersion).toBe(4);
    expect(parsed.value.session).not.toBeNull();
    expect(parsed.value.session?.snapshot.spawnSlots).toEqual([]);
  });
});

describe('save schema v2 to v3', () => {
  it('gives a save written before the persistent character a level 1 one', () => {
    const current = saveWithSession(makeSession(), [
      { itemKey: 'item:tibia:gold-coin', count: 12 },
    ]);
    const { character: _character, ...withoutCharacter } = current;
    void _character;
    const v2 = { ...withoutCharacter, schemaVersion: 2 };

    const parsed = parseGameSave(migrateSaveDocument(v2));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `v2 save did not open after 2→3: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(4);
    expect(parsed.value.character).toEqual(createEmptyCharacterProgress());
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

    expect(parsed.value.character).toEqual({
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
