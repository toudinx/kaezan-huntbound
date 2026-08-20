import { describe, expect, it } from 'vitest';

import { SaveError } from '../errors/SaveError.ts';
import {
  applySaveMigrations,
  type SaveMigration,
} from './migrateSaveDocument.ts';

describe('save migration chain', () => {
  it('applies migrations in ascending order until the target version', () => {
    const order: string[] = [];
    const migrations: readonly SaveMigration[] = [
      {
        from: null,
        to: 1,
        migrate(document) {
          order.push('null-to-1');
          return { ...(document as object), value: 'one' };
        },
      },
      {
        from: 1,
        to: 2,
        migrate(document) {
          order.push('1-to-2');
          return { ...(document as object), value: 'two' };
        },
      },
    ];

    expect(applySaveMigrations({}, migrations, 2)).toEqual({
      value: 'two',
    });
    expect(order).toEqual(['null-to-1', '1-to-2']);
  });

  it('stops at the current version without invoking later migrations', () => {
    const current = { schemaVersion: 1, value: 'current' };
    let invoked = false;
    const migrations: readonly SaveMigration[] = [
      {
        from: 1,
        to: 2,
        migrate(document) {
          invoked = true;
          return document;
        },
      },
    ];

    expect(applySaveMigrations(current, migrations, 1)).toBe(current);
    expect(invoked).toBe(false);
  });

  it('fails high instead of skipping a missing link in the chain', () => {
    const migrations: readonly SaveMigration[] = [
      {
        from: null,
        to: 1,
        migrate(document) {
          return { ...(document as object), schemaVersion: 1 };
        },
      },
      {
        from: 2,
        to: 3,
        migrate(document) {
          return document;
        },
      },
    ];

    expect(() => applySaveMigrations({}, migrations, 3)).toThrow(SaveError);
    expect(() => applySaveMigrations({}, migrations, 3)).toThrow(
      /migration from version 1/i,
    );
  });
});
