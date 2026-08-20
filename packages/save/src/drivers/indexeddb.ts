import { SaveError } from '../errors/SaveError.ts';
import type { SaveDriver, TransactionOutcome } from '../repository/types.ts';

const DEFAULT_DATABASE_NAME = 'huntbound-save';
const DATABASE_VERSION = 1;
const STORE_NAME = 'save';
const DOCUMENT_KEY = 'default';

export interface IndexedDbSaveDriverOptions {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return undefined;
  }

  const name = error.name;
  return typeof name === 'string' ? name : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unavailable(error?: unknown): SaveError {
  return new SaveError(
    'SAVE_UNAVAILABLE',
    `IndexedDB is unavailable${error === undefined ? '' : `: ${errorMessage(error)}`}`,
    error,
  );
}

function upgradeBlocked(): SaveError {
  return new SaveError(
    'SAVE_UPGRADE_BLOCKED',
    'IndexedDB upgrade is blocked by another connection.',
  );
}

function transactionFailure(error?: unknown): SaveError {
  if (error instanceof SaveError) {
    return error;
  }

  if (errorName(error) === 'QuotaExceededError') {
    return new SaveError(
      'SAVE_QUOTA_EXCEEDED',
      'IndexedDB save quota was exceeded.',
      error,
    );
  }

  return new SaveError(
    'SAVE_TRANSACTION_FAILED',
    `IndexedDB save transaction failed${error === undefined ? '' : `: ${errorMessage(error)}`}`,
    error,
  );
}

function defaultIndexedDbFactory(): IDBFactory | undefined {
  const factory = globalThis.indexedDB;
  return typeof factory === 'undefined' ? undefined : factory;
}

export function createIndexedDbSaveDriver(
  options: IndexedDbSaveDriverOptions = {},
): SaveDriver {
  const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
  const factory = options.indexedDB ?? defaultIndexedDbFactory();
  let database: IDBDatabase | undefined;
  let opening: Promise<IDBDatabase> | undefined;

  function openDatabase(): Promise<IDBDatabase> {
    if (database !== undefined) {
      return Promise.resolve(database);
    }

    if (opening !== undefined) {
      return opening;
    }

    if (factory === undefined) {
      return Promise.reject(unavailable());
    }

    const pending = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(databaseName, DATABASE_VERSION);
      } catch (error) {
        reject(unavailable(error));
        return;
      }

      let blocked = false;
      let settled = false;

      request.onupgradeneeded = () => {
        const upgradedDatabase = request.result;
        if (!upgradedDatabase.objectStoreNames.contains(STORE_NAME)) {
          upgradedDatabase.createObjectStore(STORE_NAME);
        }
      };

      request.onblocked = () => {
        blocked = true;
        if (!settled) {
          settled = true;
          reject(upgradeBlocked());
        }
      };

      request.onerror = () => {
        if (!settled) {
          settled = true;
          reject(unavailable(request.error ?? undefined));
        }
      };

      request.onsuccess = () => {
        const openedDatabase = request.result;
        openedDatabase.onversionchange = () => {
          openedDatabase.close();
          if (database === openedDatabase) {
            database = undefined;
          }
        };

        if (blocked) {
          openedDatabase.close();
          return;
        }

        if (!settled) {
          settled = true;
          database = openedDatabase;
          resolve(openedDatabase);
        } else {
          openedDatabase.close();
        }
      };
    });

    opening = pending;
    pending.then(
      () => {
        if (opening === pending) {
          opening = undefined;
        }
      },
      () => {
        if (opening === pending) {
          opening = undefined;
        }
      },
    );
    return pending;
  }

  function read(): Promise<unknown> {
    return openDatabase().then(
      (openedDatabase) =>
        new Promise<unknown>((resolve, reject) => {
          let transaction: IDBTransaction;
          try {
            transaction = openedDatabase.transaction(STORE_NAME, 'readonly');
          } catch (error) {
            reject(transactionFailure(error));
            return;
          }

          let requestError: unknown;
          let document: unknown = null;
          let request: IDBRequest<unknown>;
          try {
            request = transaction.objectStore(STORE_NAME).get(DOCUMENT_KEY);
          } catch (error) {
            reject(transactionFailure(error));
            return;
          }

          request.onsuccess = () => {
            document = request.result ?? null;
          };
          request.onerror = () => {
            requestError = request.error ?? undefined;
          };
          transaction.onerror = () => {
            requestError = transaction.error ?? requestError;
          };
          transaction.onabort = () => {
            reject(transactionFailure(transaction.error ?? requestError));
          };
          transaction.oncomplete = () => resolve(document);
        }),
    );
  }

  function runTransaction<T>(
    operation: (current: unknown) => TransactionOutcome<T>,
  ): Promise<T> {
    return openDatabase().then(
      (openedDatabase) =>
        new Promise<T>((resolve, reject) => {
          let transaction: IDBTransaction;
          try {
            transaction = openedDatabase.transaction(STORE_NAME, 'readwrite');
          } catch (error) {
            reject(transactionFailure(error));
            return;
          }

          let requestError: unknown;
          let outcome: TransactionOutcome<T> | undefined;
          let operationFailed = false;
          let operationError: unknown;
          let writeFailed = false;
          let writeError: unknown;
          let store: IDBObjectStore;
          let request: IDBRequest<unknown>;
          try {
            store = transaction.objectStore(STORE_NAME);
            request = store.get(DOCUMENT_KEY);
          } catch (error) {
            reject(transactionFailure(error));
            return;
          }

          function abort(failure: unknown): void {
            try {
              transaction.abort();
            } catch (error) {
              if (operationFailed) {
                reject(failure);
              } else {
                reject(transactionFailure(error));
              }
            }
          }

          request.onsuccess = () => {
            const current = request.result ?? null;
            try {
              outcome = operation(current);
            } catch (error) {
              operationFailed = true;
              operationError = error;
              abort(error);
              return;
            }

            try {
              store.put(outcome.document, DOCUMENT_KEY);
            } catch (error) {
              writeFailed = true;
              writeError = error;
              abort(error);
            }
          };
          request.onerror = () => {
            requestError = request.error ?? undefined;
          };
          transaction.onerror = () => {
            requestError = transaction.error ?? requestError;
          };
          transaction.onabort = () => {
            if (operationFailed) {
              reject(operationError);
              return;
            }
            if (writeFailed) {
              reject(transactionFailure(writeError));
              return;
            }
            reject(transactionFailure(transaction.error ?? requestError));
          };
          transaction.oncomplete = () => {
            if (outcome === undefined) {
              reject(transactionFailure());
              return;
            }
            resolve(outcome.result);
          };
        }),
    );
  }

  return {
    read,
    runTransaction,
    close() {
      database?.close();
      database = undefined;
    },
  };
}
