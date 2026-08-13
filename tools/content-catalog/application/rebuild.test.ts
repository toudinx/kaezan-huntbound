import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogContentBundle } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { applyCuratedOperation } from '../../../packages/content/src/application/ApplyCuratedOperation';
import { canonicalizeCatalogBundle } from '../repository/canonicalCatalog';
import { createCatalogBundleFixture } from '../repository/catalogFixture.test-support';
import { openMutableContentCatalog } from '../repository/internal/openMutableContentCatalog';

const migrations = fileURLToPath(new URL('../migrations', import.meta.url));

describe('versioned catalog rebuild', () => {
  it('rebuilds from operation JSON without reading any source root', () => {
    const operation = createCatalogBundleFixture();
    const directory = mkdtempSync(join(tmpdir(), 'huntbound-operation-'));
    const operationPath = join(directory, '0001.json');
    const databasePath = join(directory, 'catalog.sqlite');
    writeFileSync(operationPath, `${JSON.stringify(operation)}\n`, 'utf8');
    try {
      const catalog = openMutableContentCatalog(databasePath, migrations);
      catalog.migrate();
      const loaded = JSON.parse(
        readFileSync(operationPath, 'utf8'),
      ) as CatalogContentBundle;
      applyCuratedOperation([loaded], catalog);
      expect(catalog.readCatalogBundle(operation.slice.key)).toEqual(
        canonicalizeCatalogBundle(operation),
      );
      catalog.close();
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
