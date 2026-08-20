import {
  createIndexedDbSaveDriver,
  type SaveDriver,
  type TransactionOutcome,
} from '../../../../packages/save/src/index.ts';
import type { AppAssetProfile } from '../assets/AssetProfile';

const DATABASE_NAME = 'huntbound-save';

export interface SaveProbe {
  read(): Promise<unknown>;
  runTransaction<T>(
    operation: (current: unknown) => TransactionOutcome<T>,
  ): Promise<T>;
  clear(): Promise<void>;
}

declare global {
  interface Window {
    __huntboundSaveProbe?: SaveProbe;
  }
}

function deleteDatabase(): Promise<void> {
  const factory = globalThis.indexedDB;
  if (typeof factory === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable.'));
  }

  return new Promise<void>((resolve, reject) => {
    const request = factory.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to delete the save database.'));
    request.onblocked = () =>
      reject(new Error('Save database deletion was blocked.'));
  });
}

export function installSaveProbe(
  profile: AppAssetProfile,
  target: Window,
): SaveProbe | undefined {
  if (profile !== 'test') {
    return undefined;
  }

  let driver: SaveDriver = createIndexedDbSaveDriver();
  const probe: SaveProbe = {
    read: () => driver.read(),
    runTransaction: <T>(
      operation: (current: unknown) => TransactionOutcome<T>,
    ) => driver.runTransaction(operation),
    clear: async () => {
      driver.close();
      await deleteDatabase();
      driver = createIndexedDbSaveDriver();
    },
  };

  target.__huntboundSaveProbe = probe;
  return probe;
}
