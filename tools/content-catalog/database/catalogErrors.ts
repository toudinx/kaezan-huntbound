export type CatalogErrorCode =
  | 'catalog-migration'
  | 'catalog-closed'
  | 'catalog-not-migrated'
  | 'catalog-missing-slice'
  | 'catalog-nested-transaction'
  | 'catalog-thenable'
  | 'catalog-expired-transaction';

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message: string) {
    super(message);
    this.name = 'CatalogError';
    this.code = code;
  }
}

export class CatalogMigrationError extends CatalogError {
  constructor(message: string) {
    super('catalog-migration', message);
    this.name = 'CatalogMigrationError';
  }
}
