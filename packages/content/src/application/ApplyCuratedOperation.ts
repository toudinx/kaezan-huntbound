import type { CatalogContentBundle } from '@huntbound/contracts';

import type { CuratedCatalogWriter } from './internal/CuratedCatalogWriter.ts';
import { applyValidatedBundles } from './validateAndApply.ts';

export function applyCuratedOperation(
  operations: readonly [CatalogContentBundle, ...CatalogContentBundle[]],
  writer: CuratedCatalogWriter,
): void {
  applyValidatedBundles(operations, (operation) =>
    writer.transaction((transaction) => {
      operation(transaction);
    }),
  );
}
