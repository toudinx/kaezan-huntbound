import { fileURLToPath } from 'node:url';

import {
  createSqliteContentCatalog,
  type OpenMutableContentCatalog,
} from '../SqliteContentCatalog';

const migrationsDirectory = fileURLToPath(
  new URL('../../migrations', import.meta.url),
);

export function openMutableContentCatalog(
  path: string,
  migrationDirectory = migrationsDirectory,
): OpenMutableContentCatalog {
  const repository = createSqliteContentCatalog(path, migrationDirectory);
  return {
    migrate: () => repository.migrate(),
    close: () => repository.close(),
    readCatalogBundle: (sliceKey) => repository.readCatalogBundle(sliceKey),
    countRows: () => repository.countRows(),
    transaction: (operation) => repository.transaction(operation),
  };
}
