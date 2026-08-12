import type { CatalogContentBundle } from '@huntbound/contracts';

export interface ContentCatalogReadPort {
  readCatalogBundle(sliceKey: string): CatalogContentBundle;
  countRows(): Readonly<Record<string, number>>;
}
