import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type Database from 'better-sqlite3';

export interface TemporaryCatalog {
  readonly directory: string;
  readonly path: string;
  cleanup(): void;
}

export function createTemporaryCatalogFile(): TemporaryCatalog {
  const directory = mkdtempSync(join(tmpdir(), 'huntbound-content-catalog-'));
  const path = join(directory, 'catalog.sqlite');
  return {
    directory,
    path,
    cleanup: () => rmSync(directory, { force: true, recursive: true }),
  };
}

export function createTemporaryMigrationDirectory(
  files: Readonly<Record<string, string>>,
): { readonly path: string; cleanup(): void } {
  const path = mkdtempSync(join(tmpdir(), 'huntbound-content-migrations-'));
  for (const [filename, contents] of Object.entries(files)) {
    writeFileSync(join(path, filename), contents);
  }
  return {
    path,
    cleanup: () => rmSync(path, { force: true, recursive: true }),
  };
}

export function foreignKeyViolations(
  database: Database.Database,
): readonly unknown[] {
  return database.pragma('foreign_key_check') as readonly unknown[];
}

export function normalizedSqliteSchema(
  database: Database.Database,
): readonly string[] {
  const rows = database
    .prepare(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    )
    .all() as Array<{
    readonly type: string;
    readonly name: string;
    readonly tbl_name: string;
    readonly sql: string | null;
  }>;
  return rows.map(
    (row) =>
      `${row.type}|${row.name}|${row.tbl_name}|${row.sql?.replace(/\s+/g, ' ').trim() ?? ''}`,
  );
}

export function logicalDump(database: Database.Database): string {
  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as Array<{ readonly name: string }>;
  return JSON.stringify(
    tables.map(({ name }) => ({
      name,
      rows: database
        .prepare(`SELECT * FROM "${name.replaceAll('"', '""')}" ORDER BY rowid`)
        .all(),
    })),
  );
}

export function readTextFile(path: string): string {
  return readFileSync(path, 'utf8');
}
