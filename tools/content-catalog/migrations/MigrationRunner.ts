import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type Database from 'better-sqlite3';

import { CatalogMigrationError } from '../database/catalogErrors';

export interface AppliedMigration {
  readonly id: number;
  readonly filename: string;
  readonly sha256: string;
}

interface MigrationFile {
  readonly id: number;
  readonly filename: string;
  readonly bytes: Buffer;
  readonly sha256: string;
}

const migrationName = /^(\d{3})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function migrationTableExists(database: Database.Database): boolean {
  return (
    database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
      )
      .get() !== undefined
  );
}

export function readAppliedMigrations(
  database: Database.Database,
): readonly AppliedMigration[] {
  if (!migrationTableExists(database)) {
    return [];
  }

  return database
    .prepare('SELECT id, filename, sha256 FROM schema_migrations ORDER BY id')
    .all() as AppliedMigration[];
}

function discoverMigrations(directory: string): readonly MigrationFile[] {
  const files = readdirSync(directory, { withFileTypes: true });
  const migrations: MigrationFile[] = [];
  const ids = new Set<number>();

  for (const file of files) {
    if (!file.name.endsWith('.sql')) {
      continue;
    }
    const match = migrationName.exec(file.name);
    if (!match || !file.isFile()) {
      throw new CatalogMigrationError(
        `Invalid migration filename: ${file.name}`,
      );
    }

    const id = Number(match[1]);
    if (ids.has(id)) {
      throw new CatalogMigrationError(
        `Duplicate migration id ${id} in ${directory}`,
      );
    }
    ids.add(id);

    const bytes = readFileSync(join(directory, file.name));
    migrations.push({
      id,
      filename: file.name,
      bytes,
      sha256: sha256(bytes),
    });
  }

  return [...migrations].sort((left, right) => left.id - right.id);
}

export function applyMigrations(
  database: Database.Database,
  directory: string,
): void {
  const discovered = discoverMigrations(directory);
  const byId = new Map(
    discovered.map((migration) => [migration.id, migration]),
  );
  const applied = readAppliedMigrations(database);
  const appliedById = new Map(
    applied.map((migration) => [migration.id, migration]),
  );

  for (const migration of applied) {
    const file = byId.get(migration.id);
    if (!file || file.filename !== migration.filename) {
      throw new CatalogMigrationError(
        `Applied migration ${migration.id} is missing or has a different filename`,
      );
    }
    if (file.sha256 !== migration.sha256) {
      throw new CatalogMigrationError(
        `Migration ${migration.filename} hash does not match the applied hash`,
      );
    }
  }

  const maxAppliedId = applied.at(-1)?.id ?? 0;
  const pending = discovered.filter(
    (migration) => !appliedById.has(migration.id),
  );
  if (pending.some((migration) => migration.id <= maxAppliedId)) {
    throw new CatalogMigrationError(
      `New migrations must be monotonic and greater than ${maxAppliedId}`,
    );
  }

  for (const migration of pending) {
    const applyOne = database.transaction(() => {
      database.exec(migration.bytes.toString('utf8'));
      database
        .prepare(
          'INSERT INTO schema_migrations (id, filename, sha256, applied_at) VALUES (?, ?, ?, ?)',
        )
        .run(
          migration.id,
          migration.filename,
          migration.sha256,
          new Date().toISOString(),
        );
    });
    applyOne();
  }
}
