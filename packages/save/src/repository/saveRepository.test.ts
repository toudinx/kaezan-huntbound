import {
  createEmptyEquipment,
  createEmptyGameSave,
  type GameSave,
  SAVE_SCHEMA_VERSION,
  type SaveDraft,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import {
  createMemorySaveDriver,
  createSaveRepository,
  encodeSaveDocument,
  migrateSaveDocument,
  SaveError,
} from '../index.ts';

function expectMigrationError(
  document: unknown,
  expected: { code: string; message?: unknown },
) {
  try {
    migrateSaveDocument(document);
  } catch (error) {
    expect(error).toMatchObject(expected);
    return;
  }

  throw new Error('Expected migrateSaveDocument to reject the document');
}

describe('SaveRepository', () => {
  it('loads an empty document without writing it', async () => {
    const driver = createMemorySaveDriver();
    const repository = createSaveRepository(driver);

    await expect(repository.load()).resolves.toEqual(createEmptyGameSave());
    await expect(driver.read()).resolves.toBeNull();
  });

  it('loads an existing valid document', async () => {
    const existing = { ...createEmptyGameSave(), completedRuns: 4 };
    const repository = createSaveRepository(createMemorySaveDriver(existing));

    await expect(repository.load()).resolves.toEqual(existing);
  });

  it('migrates an unversioned empty document before validation', async () => {
    const repository = createSaveRepository(createMemorySaveDriver({}));

    await expect(repository.load()).resolves.toEqual(createEmptyGameSave());
  });

  it('preserves a well-formed stash while migrating an unversioned document', async () => {
    const stash = [{ itemKey: 'item:tibia:gold-coin', count: 12 }];
    const repository = createSaveRepository(createMemorySaveDriver({ stash }));

    await expect(repository.load()).resolves.toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      character: {
        experience: 0,
        equipment: createEmptyEquipment(),
        collection: [],
        bestiary: [],
      },
      stash,
      gold: 0,
      nextHuntBuff: 'none',
      completedRuns: 0,
      session: null,
    });
  });

  it('rejects an unversioned document with a malformed stash', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({
        stash: [{ itemKey: 'item:tibia:gold-coin', count: 0 }],
      }),
    );

    await expect(repository.load()).rejects.toMatchObject({
      code: 'SAVE_DOCUMENT_INVALID',
    });
  });

  it('rejects a future save version without downgrading it', async () => {
    const future = {
      ...createEmptyGameSave(),
      schemaVersion: SAVE_SCHEMA_VERSION + 1,
    };
    const repository = createSaveRepository(createMemorySaveDriver(future));

    await expect(repository.load()).rejects.toMatchObject({
      code: 'SAVE_VERSION_UNSUPPORTED',
      message: expect.stringContaining(String(SAVE_SCHEMA_VERSION)),
    });
  });

  it('migrates the current transaction document before validation', async () => {
    const repository = createSaveRepository(createMemorySaveDriver({}));

    await expect(
      repository.transact((draft) => {
        draft.completedRuns += 1;
        return draft.completedRuns;
      }),
    ).resolves.toBe(1);

    await expect(repository.load()).resolves.toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      completedRuns: 1,
    });
  });

  it('keeps a current save document by identity', () => {
    const current = createEmptyGameSave();

    expect(migrateSaveDocument(current)).toBe(current);
  });

  it('rejects a future version from the migration entry point', () => {
    expectMigrationError(
      { ...createEmptyGameSave(), schemaVersion: SAVE_SCHEMA_VERSION + 1 },
      {
        code: 'SAVE_VERSION_UNSUPPORTED',
        message: expect.stringContaining(String(SAVE_SCHEMA_VERSION)),
      },
    );
  });

  it.each([
    ['a fractional number', { ...createEmptyGameSave(), schemaVersion: 1.5 }],
    ['a negative number', { ...createEmptyGameSave(), schemaVersion: -1 }],
    [
      'an unknown historical version',
      { ...createEmptyGameSave(), schemaVersion: 0 },
    ],
    ['a string', { ...createEmptyGameSave(), schemaVersion: '1' }],
    ['null', null],
    ['an array', []],
    ['a primitive', 'save'],
  ])('rejects %s at the migration entry point', (_label, document) => {
    expectMigrationError(document, { code: 'SAVE_DOCUMENT_INVALID' });
  });

  it.each([
    ['a fractional number', 1.5],
    ['a negative number', -1],
    ['a string', '1'],
  ])(
    'rejects a document with schemaVersion %s',
    async (_label, schemaVersion) => {
      const invalid = { ...createEmptyGameSave(), schemaVersion };
      const repository = createSaveRepository(createMemorySaveDriver(invalid));

      await expect(repository.load()).rejects.toMatchObject({
        code: 'SAVE_DOCUMENT_INVALID',
      });
    },
  );

  it('rejects an invalid document read from the driver', async () => {
    const invalid = { ...createEmptyGameSave(), completedRuns: -1 };
    const repository = createSaveRepository(createMemorySaveDriver(invalid));

    await expect(repository.load()).rejects.toBeInstanceOf(SaveError);
    await expect(repository.load()).rejects.toMatchObject({
      code: 'SAVE_DOCUMENT_INVALID',
    });
  });

  it('commits a transaction and returns its result', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());

    const result = await repository.transact((draft) => {
      draft.completedRuns += 1;
      return draft.completedRuns;
    });

    expect(result).toBe(1);
    await expect(repository.load()).resolves.toMatchObject({
      completedRuns: 1,
    });
  });

  it('does not write when the operation throws', async () => {
    const initial = { ...createEmptyGameSave(), completedRuns: 3 };
    const repository = createSaveRepository(createMemorySaveDriver(initial));
    const failure = new Error('operation failed');

    await expect(
      repository.transact((draft) => {
        draft.completedRuns = 99;
        throw failure;
      }),
    ).rejects.toBe(failure);

    await expect(repository.load()).resolves.toEqual(initial);
  });

  it('does not write a document rejected by the save contract', async () => {
    const initial = { ...createEmptyGameSave(), completedRuns: 3 };
    const repository = createSaveRepository(createMemorySaveDriver(initial));

    await expect(
      repository.transact((draft) => {
        draft.completedRuns = -1;
      }),
    ).rejects.toMatchObject({ code: 'SAVE_DOCUMENT_INVALID' });

    await expect(repository.load()).resolves.toEqual(initial);
  });

  it('keeps the committed document isolated from the transaction draft', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    let draftReference: SaveDraft | undefined;

    await repository.transact((draft) => {
      draftReference = draft;
      draft.completedRuns = 7;
    });

    if (draftReference === undefined) {
      throw new Error('Expected the transaction to expose its draft');
    }
    draftReference.completedRuns = 99;

    await expect(repository.load()).resolves.toMatchObject({
      completedRuns: 7,
    });
  });

  it('serializes concurrent transactions and exposes the first commit to the second', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());

    const first = repository.transact((draft) => {
      draft.completedRuns += 1;
      return draft.completedRuns;
    });
    const second = repository.transact((draft) => {
      expect(draft.completedRuns).toBe(1);
      draft.completedRuns += 1;
      return draft.completedRuns;
    });

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    await expect(repository.load()).resolves.toMatchObject({
      completedRuns: 2,
    });
  });

  it('exports the current document canonically', async () => {
    const repository = createSaveRepository(
      createMemorySaveDriver({ ...createEmptyGameSave(), completedRuns: 4 }),
    );

    await expect(repository.export()).resolves.toBe(
      '{"character":{"bestiary":[],"collection":[],"equipment":{"armor":null,"boots":null,"helmet":null,"legs":null,"shield":null,"weapon":null},"experience":0},"completedRuns":4,"gold":0,"nextHuntBuff":"none","schemaVersion":7,"session":null,"stash":[]}\n',
    );
  });

  it('imports an unversioned document and persists the migrated current document', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const serialized = '{"stash":[],"completedRuns":0,"session":null}';

    await repository.import(serialized);

    await expect(repository.load()).resolves.toEqual(createEmptyGameSave());
  });

  it.each([
    ['malformed JSON', '{', 'SAVE_DOCUMENT_INVALID'],
    [
      'a future schema version',
      JSON.stringify({
        ...createEmptyGameSave(),
        schemaVersion: SAVE_SCHEMA_VERSION + 1,
      }),
      'SAVE_VERSION_UNSUPPORTED',
    ],
    [
      'a schema-invalid document',
      JSON.stringify({ ...createEmptyGameSave(), completedRuns: -1 }),
      'SAVE_DOCUMENT_INVALID',
    ],
  ])(
    'does not change the existing document when import fails for %s',
    async (_label, serialized, code) => {
      const initial: GameSave = {
        ...createEmptyGameSave(),
        stash: [{ itemKey: 'item:tibia:gold-coin', count: 7 }],
        completedRuns: 3,
      };
      const repository = createSaveRepository(createMemorySaveDriver(initial));

      await expect(repository.import(serialized)).rejects.toMatchObject({
        code,
      });
      await expect(repository.load()).resolves.toEqual(initial);
    },
  );

  it('round-trips repository export and import byte-for-byte', async () => {
    const source = createSaveRepository(
      createMemorySaveDriver({ ...createEmptyGameSave(), completedRuns: 4 }),
    );
    const target = createSaveRepository(createMemorySaveDriver());
    const serialized = await source.export();

    await target.import(serialized);

    await expect(target.export()).resolves.toBe(serialized);
  });

  it('replaces the existing document instead of merging stashes', async () => {
    const initial = {
      ...createEmptyGameSave(),
      stash: [{ itemKey: 'item:tibia:gold-coin', count: 7 }],
    };
    const imported = {
      ...createEmptyGameSave(),
      stash: [{ itemKey: 'item:tibia:sword', count: 1 }],
    };
    const repository = createSaveRepository(createMemorySaveDriver(initial));

    await repository.import(encodeSaveDocument(imported));

    await expect(repository.load()).resolves.toEqual(imported);
  });
});
