import { createEmptyGameSave, type SaveDraft } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import {
  createMemorySaveDriver,
  createSaveRepository,
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
      schemaVersion: 1,
      stash,
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
    const future = { ...createEmptyGameSave(), schemaVersion: 2 };
    const repository = createSaveRepository(createMemorySaveDriver(future));

    await expect(repository.load()).rejects.toMatchObject({
      code: 'SAVE_VERSION_UNSUPPORTED',
      message: expect.stringContaining('2'),
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
      schemaVersion: 1,
      completedRuns: 1,
    });
  });

  it('keeps a current save document by identity', () => {
    const current = createEmptyGameSave();

    expect(migrateSaveDocument(current)).toBe(current);
  });

  it('rejects a future version from the migration entry point', () => {
    expectMigrationError(
      { ...createEmptyGameSave(), schemaVersion: 2 },
      {
        code: 'SAVE_VERSION_UNSUPPORTED',
        message: expect.stringContaining('2'),
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

  it('fails explicitly for export and import until their task is implemented', async () => {
    const repository = createSaveRepository(createMemorySaveDriver());
    const importSave = repository.import;

    await expect(repository.export()).rejects.toThrow(
      'Save export is not implemented by PB-06-02',
    );
    await expect(importSave('{}')).rejects.toThrow(
      'Save import is not implemented by PB-06-02',
    );
  });
});
