import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../database/openDatabase';
import {
  createTemporaryCatalogFile,
  foreignKeyViolations,
} from '../testing/sqliteTestSupport';
import { canonicalizeCatalogBundle } from './canonicalCatalog';
import { createCatalogBundleFixture } from './catalogFixture.test-support';
import { openMutableContentCatalog } from './internal/openMutableContentCatalog';

const cleanups: Array<() => void> = [];
const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url),
);

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

function openMigratedCatalog() {
  const temporary = createTemporaryCatalogFile();
  cleanups.push(temporary.cleanup);
  const catalog = openMutableContentCatalog(
    temporary.path,
    migrationsDirectory,
  );
  catalog.migrate();
  return { catalog, path: temporary.path };
}

describe('SqliteContentCatalog', () => {
  it('persists and reconstructs every catalog field canonically', () => {
    const { catalog, path } = openMigratedCatalog();
    const input = createCatalogBundleFixture();

    try {
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));

      expect(catalog.readCatalogBundle(input.slice.key)).toEqual(
        canonicalizeCatalogBundle(input),
      );
      const inspection = openDatabase(path);
      try {
        expect(foreignKeyViolations(inspection)).toEqual([]);
      } finally {
        inspection.close();
      }
    } finally {
      catalog.close();
    }
  });

  it('preserves two raw spell references without creating aliases', () => {
    const { catalog } = openMigratedCatalog();
    const input = createCatalogBundleFixture();

    try {
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));
      const output = catalog.readCatalogBundle(input.slice.key);

      expect(
        output.projectionAudits.map((audit) => audit.rawReference),
      ).toEqual(['elite knight', 'knight']);
      expect(output.spells[0]?.aliases).not.toContainEqual(
        expect.objectContaining({ alias: 'elite knight' }),
      );
    } finally {
      catalog.close();
    }
  });
});
