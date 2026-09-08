import {
  createEmptyCharacterProgress,
  createEmptyEquipment,
  createEmptyGameSave,
  SAVE_SCHEMA_VERSION,
} from '@huntbound/contracts';

import { SaveError } from '../errors/SaveError.ts';

export interface SaveMigration {
  readonly from: number | null;
  readonly to: number;
  migrate(document: unknown): unknown;
}

type SaveDocument = Record<string, unknown>;

function isSaveDocument(value: unknown): value is SaveDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasSchemaVersion(document: SaveDocument) {
  return Object.hasOwn(document, 'schemaVersion');
}

function invalidDocument(message: string): SaveError {
  return new SaveError(
    'SAVE_DOCUMENT_INVALID',
    `Save document is invalid: ${message}`,
  );
}

function unsupportedVersion(version: number, targetVersion: number): SaveError {
  return new SaveError(
    'SAVE_VERSION_UNSUPPORTED',
    `Save schema version ${version} is newer than supported version ${targetVersion}`,
  );
}

function readVersion(document: SaveDocument): number | null {
  if (!hasSchemaVersion(document)) {
    return null;
  }

  const version = document.schemaVersion;
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 0
  ) {
    throw invalidDocument('schemaVersion must be a non-negative safe integer');
  }

  return version;
}

function migrationFor(
  migrations: readonly SaveMigration[],
  from: number | null,
): SaveMigration {
  const matches = migrations.filter((migration) => migration.from === from);
  if (matches.length !== 1) {
    const version = from === null ? 'unversioned document' : `version ${from}`;
    throw invalidDocument(`expected exactly one migration from ${version}`);
  }

  const migration = matches[0];
  if (migration === undefined) {
    throw invalidDocument('migration registry is empty');
  }
  return migration;
}

function nextVersion(
  migration: SaveMigration,
  currentVersion: number | null,
  targetVersion: number,
): number {
  if (!Number.isSafeInteger(migration.to) || migration.to < 0) {
    throw invalidDocument(
      'migration target must be a non-negative safe integer',
    );
  }

  if (migration.to > targetVersion) {
    throw invalidDocument(
      `migration target ${migration.to} exceeds supported version ${targetVersion}`,
    );
  }

  if (currentVersion !== null && migration.to <= currentVersion) {
    throw invalidDocument(
      `migration from version ${currentVersion} does not advance the schema version`,
    );
  }

  return migration.to;
}

export function applySaveMigrations(
  document: unknown,
  migrations: readonly SaveMigration[],
  targetVersion: number,
): unknown {
  if (!isSaveDocument(document)) {
    throw invalidDocument('expected a JSON object');
  }

  let migrated: unknown = document;
  let version = readVersion(document);

  if (version !== null && version > targetVersion) {
    throw unsupportedVersion(version, targetVersion);
  }

  if (version === targetVersion) {
    return document;
  }

  while (version !== targetVersion) {
    const migration = migrationFor(migrations, version);
    const migratedVersion = nextVersion(migration, version, targetVersion);
    migrated = migration.migrate(migrated);
    version = migratedVersion;
  }

  return migrated;
}

const unversionedToV1: SaveMigration = {
  from: null,
  to: 1,
  migrate(document) {
    return {
      ...createEmptyGameSave(),
      ...(document as SaveDocument),
      schemaVersion: 1,
    };
  },
};

function discardIndexedSpawnSlots(document: SaveDocument): SaveDocument {
  const session = document.session;
  if (!isSaveDocument(session)) {
    return { ...document, schemaVersion: 2 };
  }

  const snapshot = session.snapshot;
  if (!isSaveDocument(snapshot)) {
    return { ...document, schemaVersion: 2 };
  }

  return {
    ...document,
    schemaVersion: 2,
    session: {
      ...session,
      snapshot: {
        ...snapshot,
        spawnSlots: [],
      },
    },
  };
}

const v1ToV2: SaveMigration = {
  from: 1,
  to: 2,
  migrate(document) {
    return discardIndexedSpawnSlots(document as SaveDocument);
  },
};

/**
 * Every save written before PB-13-03 belongs to a player who had no character
 * of their own -- the sheet came from the hunt. There is no experience to
 * recover from those documents, so the character they gain is the one they
 * would have been created with today: level 1, nothing earned. The stash and
 * the run credit they did accumulate are untouched.
 */
const v2ToV3: SaveMigration = {
  from: 2,
  to: 3,
  migrate(document) {
    return {
      ...(document as SaveDocument),
      schemaVersion: 3,
      character: createEmptyCharacterProgress(),
    };
  },
};

/**
 * PB-13-04 gives the character slots and a collection. A save written before it
 * has neither, and there is nothing to reconstruct: what the player was wearing
 * came from the level curve, not from an item they own, and no drop was ever
 * recorded as found. They arrive unarmoured with an empty collection, and the
 * stash they farmed is exactly where the first pieces come from.
 */
const v3ToV4: SaveMigration = {
  from: 3,
  to: 4,
  migrate(document) {
    const current = document as SaveDocument;
    const character = isSaveDocument(current.character)
      ? current.character
      : {};
    return {
      ...current,
      schemaVersion: 4,
      character: {
        ...character,
        equipment: createEmptyEquipment(),
        collection: [],
      },
    };
  },
};

const saveMigrations: readonly SaveMigration[] = [
  unversionedToV1,
  v1ToV2,
  v2ToV3,
  v3ToV4,
];

export function migrateSaveDocument(document: unknown): unknown {
  return applySaveMigrations(document, saveMigrations, SAVE_SCHEMA_VERSION);
}
