import { test as base, expect, type Page } from '@playwright/test';

const DATABASE_NAME = 'huntbound-save';
const STORE_NAME = 'save';
const DOCUMENT_KEY = 'default';

interface SaveProbeTransaction<T> {
  readonly document: unknown;
  readonly result: T;
}

interface SaveProbe {
  read(): Promise<unknown>;
  runTransaction<T>(
    operation: (current: unknown) => SaveProbeTransaction<T>,
  ): Promise<T>;
}

async function deleteSaveDatabase(page: Page): Promise<void> {
  await page.evaluate(
    ({ databaseName }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(
            request.error ?? new Error('Unable to delete the save database.'),
          );
        request.onblocked = () =>
          reject(new Error('Save database deletion was blocked.'));
      }),
    { databaseName: DATABASE_NAME },
  );
}

async function waitForSaveProbe(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: unknown;
    };
    return target.__huntboundSaveProbe !== undefined;
  });
}

const test = base.extend<{ savePage: Page }>({
  savePage: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const savePage = await context.newPage();
      await savePage.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForSaveProbe(savePage);
      await use(savePage);
      await context.close();
    },
    { scope: 'worker' },
  ],
});

async function writeSaveDocument(
  page: Page,
  document: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(async (nextDocument) => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }
    await probe.runTransaction(() => ({
      document: nextDocument,
      result: undefined,
    }));
  }, document);
}

async function readSaveDocument(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }
    return probe.read();
  });
}

async function readFromFreshConnection(page: Page): Promise<unknown> {
  return page.evaluate(
    ({ databaseName, storeName, documentKey }) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onerror = () =>
          reject(
            request.error ?? new Error('Unable to open the save database.'),
          );
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(storeName, 'readonly');
          const getRequest = transaction
            .objectStore(storeName)
            .get(documentKey);
          let document: unknown = null;

          getRequest.onsuccess = () => {
            document = getRequest.result ?? null;
          };
          transaction.oncomplete = () => {
            database.close();
            resolve(document);
          };
          transaction.onabort = () => {
            database.close();
            reject(
              transaction.error ??
                new Error('Unable to read the save database transaction.'),
            );
          };
        };
      }),
    {
      databaseName: DATABASE_NAME,
      storeName: STORE_NAME,
      documentKey: DOCUMENT_KEY,
    },
  );
}

test.beforeEach(async ({ savePage }) => {
  await waitForSaveProbe(savePage);
  await deleteSaveDatabase(savePage);
});

test.afterEach(async ({ savePage }) => {
  await deleteSaveDatabase(savePage);
});

test('reads null from an empty database', async ({ savePage }) => {
  await expect(readSaveDocument(savePage)).resolves.toBeNull();
});

test('writes and reads the same opaque document', async ({ savePage }) => {
  const document = { nested: { value: 7 }, label: 'browser-save' };

  await writeSaveDocument(savePage, document);

  await expect(readSaveDocument(savePage)).resolves.toEqual(document);
});

test('resolves after the transaction is durable to a fresh connection', async ({
  savePage,
}) => {
  const document = { checkpoint: 1400, durable: true };

  await writeSaveDocument(savePage, document);

  await expect(readFromFreshConnection(savePage)).resolves.toEqual(document);
});

test('aborts and does not commit when the transaction operation throws', async ({
  savePage,
}) => {
  const initial = { completedRuns: 2 };
  await writeSaveDocument(savePage, initial);

  await expect(
    savePage.evaluate(async () => {
      const target = globalThis as typeof globalThis & {
        __huntboundSaveProbe?: SaveProbe;
      };
      const probe = target.__huntboundSaveProbe;
      if (probe === undefined) {
        throw new Error('Save probe is not installed in the test browser.');
      }
      await probe.runTransaction((current) => {
        if (typeof current === 'object' && current !== null) {
          (current as { completedRuns: number }).completedRuns = 99;
        }
        throw new Error('operation failed');
      });
    }),
  ).rejects.toThrow('operation failed');

  await expect(readSaveDocument(savePage)).resolves.toEqual(initial);
});

test('serializes concurrent transactions without losing a write', async ({
  savePage,
}) => {
  const results = await savePage.evaluate(async () => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }
    const increment = () =>
      probe.runTransaction((current) => {
        const count =
          typeof current === 'object' &&
          current !== null &&
          'count' in current &&
          typeof current.count === 'number'
            ? current.count
            : 0;
        const nextCount = count + 1;
        return {
          document: { count: nextCount },
          result: nextCount,
        };
      });

    return Promise.all([increment(), increment()]);
  });

  expect(results.sort()).toEqual([1, 2]);
  await expect(readSaveDocument(savePage)).resolves.toEqual({ count: 2 });
});

test('preserves the document after a page reload', async ({ savePage }) => {
  const document = { checkpoint: 200, afterReload: true };
  await writeSaveDocument(savePage, document);

  await savePage.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
  });
  const reloadedPage = await savePage.context().newPage();
  try {
    await reloadedPage.goto('/', { waitUntil: 'commit' });
    await waitForSaveProbe(reloadedPage);
    await expect(readSaveDocument(reloadedPage)).resolves.toEqual(document);
  } finally {
    await reloadedPage.close();
  }
});
