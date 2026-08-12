import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from './database/openDatabase';
import {
  applyMigrations,
  readAppliedMigrations,
} from './migrations/MigrationRunner';
import {
  createTemporaryCatalogFile,
  normalizedSqliteSchema,
} from './testing/sqliteTestSupport';

const migrationsDirectory = fileURLToPath(
  new URL('./migrations', import.meta.url),
);
const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

function buildTemporaryCatalog() {
  const temporary = createTemporaryCatalogFile();
  cleanups.push(temporary.cleanup);
  const database = openDatabase(temporary.path);
  applyMigrations(database, migrationsDirectory);
  return database;
}

describe('catalog reconstruction', () => {
  it('rebuilds identical schema and migration hashes in independent databases', () => {
    const left = buildTemporaryCatalog();
    const right = buildTemporaryCatalog();
    try {
      expect(normalizedSqliteSchema(left)).toEqual(
        normalizedSqliteSchema(right),
      );
      expect(readAppliedMigrations(left)).toEqual(readAppliedMigrations(right));
    } finally {
      left.close();
      right.close();
    }
  });
});
