import {
  createEmptyCharacterProgress,
  createEmptyEquipment,
  createEmptyGameSave,
  DEFAULT_KNIGHT_VOCATION_KEY,
  DEFAULT_PALADIN_VOCATION_KEY,
  DEFAULT_SORCERER_VOCATION_KEY,
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

/**
 * PB-13-05 adds the persistent wallet. A previous save has no credited gold,
 * so the additive default is zero and leaves every existing inventory and run
 * exactly where it was.
 */
const v4ToV5: SaveMigration = {
  from: 4,
  to: 5,
  migrate(document) {
    return {
      ...(document as SaveDocument),
      schemaVersion: 5,
      gold: 0,
    };
  },
};

/**
 * PB-13-06 adds the next-hunt blessing. A previous save has no purchase, so
 * the additive default is `none` and leaves gold, stash and the open run
 * exactly where they were.
 */
const v5ToV6: SaveMigration = {
  from: 5,
  to: 6,
  migrate(document) {
    return {
      ...(document as SaveDocument),
      schemaVersion: 6,
      nextHuntBuff: 'none',
    };
  },
};

/**
 * PB-13-07 adds account bestiary progress and the per-run event cursor that
 * makes a kill replay-safe. A save from before the feature has no kills to
 * recover, so the additive defaults are an empty bestiary and a zero cursor.
 */
const v6ToV7: SaveMigration = {
  from: 6,
  to: 7,
  migrate(document) {
    const current = document as SaveDocument;
    const character = isSaveDocument(current.character)
      ? current.character
      : {};
    const session = isSaveDocument(current.session)
      ? {
          ...current.session,
          lastBestiaryEventSequence: 0,
        }
      : current.session;
    return {
      ...current,
      schemaVersion: 7,
      character: {
        ...character,
        bestiary: [],
      },
      session,
    };
  },
};

/**
 * PB-13-08 adds the first-loop achievement ledger. Older saves already carry
 * every fact these objectives observe, except for a successful sale event;
 * the additive empty ledger therefore preserves the old save exactly and
 * starts new objectives at zero.
 */
const v7ToV8: SaveMigration = {
  from: 7,
  to: 8,
  migrate(document) {
    const current = document as SaveDocument;
    const character = isSaveDocument(current.character)
      ? current.character
      : {};
    return {
      ...current,
      schemaVersion: 8,
      character: {
        ...character,
        achievements: [],
      },
    };
  },
};

/**
 * PB-14 gives the account one independent character per vocation. The old
 * character becomes the Knight, while its account ledgers move to the root.
 * A session keeps the same run, but now names the vocation whose sheet must be
 * used when that run is resumed.
 */
const v8ToV9: SaveMigration = {
  from: 8,
  to: 9,
  migrate(document) {
    const current = document as SaveDocument;
    const legacy = isSaveDocument(current.character) ? current.character : {};
    const { character: _legacyCharacter, ...withoutLegacyCharacter } = current;
    const knight = {
      ...createEmptyCharacterProgress(DEFAULT_KNIGHT_VOCATION_KEY),
      ...legacy,
      vocationKey: DEFAULT_KNIGHT_VOCATION_KEY,
    };
    const {
      bestiary: _bestiary,
      achievements: _achievements,
      ...knightWithoutLedgers
    } = knight as Record<string, unknown>;

    const session = isSaveDocument(current.session)
      ? {
          ...current.session,
          vocationKey:
            typeof current.activeVocationKey === 'string'
              ? current.activeVocationKey
              : DEFAULT_KNIGHT_VOCATION_KEY,
        }
      : current.session;
    const characters = [
      knightWithoutLedgers,
      createEmptyCharacterProgress(DEFAULT_PALADIN_VOCATION_KEY),
      createEmptyCharacterProgress(DEFAULT_SORCERER_VOCATION_KEY),
    ].sort((left, right) =>
      String(left.vocationKey) < String(right.vocationKey)
        ? -1
        : String(left.vocationKey) > String(right.vocationKey)
          ? 1
          : 0,
    );

    return {
      ...withoutLegacyCharacter,
      schemaVersion: 9,
      characters,
      activeVocationKey:
        typeof current.activeVocationKey === 'string'
          ? current.activeVocationKey
          : DEFAULT_KNIGHT_VOCATION_KEY,
      bestiary: Array.isArray(legacy.bestiary) ? legacy.bestiary : [],
      achievements: Array.isArray(legacy.achievements)
        ? legacy.achievements
        : [],
      session,
    };
  },
};

const saveMigrations: readonly SaveMigration[] = [
  unversionedToV1,
  v1ToV2,
  v2ToV3,
  v3ToV4,
  v4ToV5,
  v5ToV6,
  v6ToV7,
  v7ToV8,
  v8ToV9,
];

export function migrateSaveDocument(document: unknown): unknown {
  return applySaveMigrations(document, saveMigrations, SAVE_SCHEMA_VERSION);
}
