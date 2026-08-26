import { parseGameSave } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { makeSession, saveWithSession } from '../session/sessionTestUtils.ts';
import { migrateSaveDocument } from './migrateSaveDocument.ts';

describe('save schema v1 to v2', () => {
  it('discards indexed spawn slots and opens as schema 2', () => {
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

    expect(parsed.value.schemaVersion).toBe(2);
    expect(parsed.value.session).not.toBeNull();
    expect(parsed.value.session?.snapshot.spawnSlots).toEqual([]);
  });
});
