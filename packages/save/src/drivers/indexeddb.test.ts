import { describe, expect, it } from 'vitest';

import { createIndexedDbSaveDriver } from './indexeddb.ts';

describe('IndexedDbSaveDriver', () => {
  it('maps a synchronously rejected IndexedDB factory to SAVE_UNAVAILABLE', async () => {
    const indexedDB = {
      open() {
        throw new Error('IndexedDB is unavailable.');
      },
    } as unknown as IDBFactory;
    const driver = createIndexedDbSaveDriver({ indexedDB });

    await expect(driver.read()).rejects.toMatchObject({
      code: 'SAVE_UNAVAILABLE',
    });
  });
});
