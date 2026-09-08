import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createEmptyCharacterProgress,
  parseGameSave,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { migrateSaveDocument } from '../../packages/save/src/migrations/migrateSaveDocument.ts';

const legacyPath = resolve(
  import.meta.dirname,
  '../../packages/test-fixtures/save/pb06/legacy.json',
);

describe('pb06 legacy save migration', () => {
  it('opens the unversioned fixture after migrating to the current schema', () => {
    const legacy = JSON.parse(readFileSync(legacyPath, 'utf8')) as {
      schemaVersion?: unknown;
      session: { snapshot: { spawnSlots: readonly unknown[] } };
    };
    expect(legacy.schemaVersion).toBeUndefined();
    expect(
      (legacy.session.snapshot.spawnSlots[0] as { groupIndex?: unknown })
        .groupIndex,
    ).toBe(0);

    const migrated = migrateSaveDocument(legacy);
    const parsed = parseGameSave(migrated);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        `legacy save did not open after migrating: ${parsed.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    expect(parsed.value.schemaVersion).toBe(5);
    expect(parsed.value.character).toEqual(createEmptyCharacterProgress());
    expect(parsed.value.gold).toBe(0);
    expect(parsed.value.session).not.toBeNull();
    expect(parsed.value.session?.huntId).toBe('hunt:tibia:venore-rotworm-cave');
    expect(parsed.value.session?.snapshot.tick).toBe(1400);
    expect(parsed.value.session?.snapshot.actors).toHaveLength(11);
    expect(parsed.value.session?.snapshot.spawnSlots).toEqual([]);
  });
});
