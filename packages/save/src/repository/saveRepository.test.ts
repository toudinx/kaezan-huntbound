import { createEmptyGameSave, type SaveDraft } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  createMemorySaveDriver,
  createSaveRepository,
  SaveError,
} from '../index.ts';

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
