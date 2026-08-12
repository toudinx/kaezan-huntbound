import { fileURLToPath } from 'node:url';

import type Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../database/openDatabase';
import {
  createTemporaryCatalogFile,
  createTemporaryMigrationDirectory,
  logicalDump,
  readTextFile,
} from '../testing/sqliteTestSupport';
import { applyMigrations, readAppliedMigrations } from './MigrationRunner';

const temporaryCleanups: Array<() => void> = [];

afterEach(() => {
  while (temporaryCleanups.length > 0) {
    temporaryCleanups.pop()?.();
  }
});

function withTemporaryDatabase(
  files: Readonly<Record<string, string>>,
  operation: (database: Database.Database, directory: string) => void,
) {
  const catalog = createTemporaryCatalogFile();
  const migrationDirectory = createTemporaryMigrationDirectory(files);
  temporaryCleanups.push(migrationDirectory.cleanup, catalog.cleanup);
  const database = openDatabase(catalog.path);
  try {
    operation(database, migrationDirectory.path);
  } finally {
    database.close();
  }
}

function createInitialMigrationDirectory() {
  const directory = createTemporaryMigrationDirectory({
    '001_initial_catalog.sql': readTextFile(
      fileURLToPath(new URL('./001_initial_catalog.sql', import.meta.url)),
    ),
  });
  temporaryCleanups.push(directory.cleanup);
  return directory.path;
}

const migrationTable = `
CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL
);`;

describe('MigrationRunner', () => {
  it('enables foreign keys and applies the initial migration once', () => {
    const catalog = createTemporaryCatalogFile();
    temporaryCleanups.push(catalog.cleanup);
    const database = openDatabase(catalog.path);

    try {
      const migrationsDirectory = createInitialMigrationDirectory();
      applyMigrations(database, migrationsDirectory);
      const first = readAppliedMigrations(database);
      applyMigrations(database, migrationsDirectory);

      expect(database.pragma('foreign_keys', { simple: true })).toBe(1);
      expect(database.pragma('journal_mode', { simple: true })).toBe('wal');
      expect(readAppliedMigrations(database)).toEqual(first);
      expect(first).toHaveLength(1);
    } finally {
      database.close();
    }
  });

  it('does not force WAL for an in-memory database', () => {
    const database = openDatabase(':memory:');
    try {
      expect(database.pragma('foreign_keys', { simple: true })).toBe(1);
      expect(database.pragma('journal_mode', { simple: true })).toBe('memory');
    } finally {
      database.close();
    }
  });

  it('rejects duplicate ids, retroactive ids, invalid filenames and changed hashes', () => {
    withTemporaryDatabase(
      {
        '001_one.sql': `${migrationTable}\n`,
        '001_two.sql': `${migrationTable}\n`,
      },
      (database, directory) => {
        expect(() => applyMigrations(database, directory)).toThrow(
          /duplicate/i,
        );
      },
    );

    withTemporaryDatabase(
      { 'bad.sql': `${migrationTable}\n` },
      (database, directory) => {
        expect(() => applyMigrations(database, directory)).toThrow(/filename/i);
      },
    );

    withTemporaryDatabase(
      { '002_two.sql': `${migrationTable}\n` },
      (database, directory) => {
        applyMigrations(database, directory);
        const nextDirectory = createTemporaryMigrationDirectory({
          '001_one.sql': `${migrationTable}\n`,
          '002_two.sql': `${migrationTable}\n`,
        });
        temporaryCleanups.push(nextDirectory.cleanup);
        expect(() => applyMigrations(database, nextDirectory.path)).toThrow(
          /monotonic/i,
        );
      },
    );

    withTemporaryDatabase(
      { '001_one.sql': `${migrationTable}\n` },
      (database, directory) => {
        applyMigrations(database, directory);
        const changedDirectory = createTemporaryMigrationDirectory({
          '001_one.sql': `${migrationTable}\n-- changed`,
        });
        temporaryCleanups.push(changedDirectory.cleanup);
        expect(() => applyMigrations(database, changedDirectory.path)).toThrow(
          /hash/i,
        );
      },
    );
  });

  it('rolls back schema and migration row when SQL fails', () => {
    withTemporaryDatabase(
      {
        '001_one.sql': `${migrationTable}\nCREATE TABLE stable(id INTEGER);`,
        '002_two.sql': 'CREATE TABLE leaked(id INTEGER); SELECT broken;',
      },
      (database, directory) => {
        const firstDirectory = createTemporaryMigrationDirectory({
          '001_one.sql': `${migrationTable}\nCREATE TABLE stable(id INTEGER);`,
        });
        temporaryCleanups.push(firstDirectory.cleanup);
        applyMigrations(database, firstDirectory.path);
        const before = logicalDump(database);

        expect(() => applyMigrations(database, directory)).toThrow();
        expect(logicalDump(database)).toBe(before);
      },
    );
  });
});
