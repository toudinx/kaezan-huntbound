import {
  createSqliteContentCatalog,
  type OpenContentCatalog,
} from './SqliteContentCatalog';

export function openContentCatalog(
  path: string,
  migrationsDirectory?: string,
): OpenContentCatalog {
  const repository = createSqliteContentCatalog(path, migrationsDirectory);
  return {
    migrate: () => repository.migrate(),
    close: () => repository.close(),
    readCatalogBundle: (sliceKey) => repository.readCatalogBundle(sliceKey),
    countRows: () => repository.countRows(),
  };
}
