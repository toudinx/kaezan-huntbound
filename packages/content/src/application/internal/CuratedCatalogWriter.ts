import type { CatalogContentBundle, ContentGuid } from '@huntbound/contracts';

export interface CuratedCatalogTransactionWriter {
  replaceCatalogBundle(bundle: CatalogContentBundle): void;
  listOrphanEntities(): readonly ContentGuid[];
}

export interface CuratedCatalogWriter {
  transaction<Operation extends (tx: CuratedCatalogTransactionWriter) => unknown>(
    operation: Operation &
      (Extract<ReturnType<Operation>, PromiseLike<unknown>> extends never
        ? unknown
        : never),
  ): ReturnType<Operation>;
}
