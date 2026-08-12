import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import type { CuratedCatalogTransactionWriter } from '../../../packages/content/src/application/internal/CuratedCatalogWriter';
import { openDatabase } from '../database/openDatabase';
import {
  createTemporaryCatalogFile,
  logicalDump,
} from '../testing/sqliteTestSupport';
import { createCatalogBundleFixture } from './catalogFixture.test-support';
import { openMutableContentCatalog } from './internal/openMutableContentCatalog';
import { openContentCatalog } from './openContentCatalog';

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url),
);
const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

function pathForCatalog() {
  const temporary = createTemporaryCatalogFile();
  cleanups.push(temporary.cleanup);
  return temporary.path;
}

function openMigratedMutable() {
  const path = pathForCatalog();
  const catalog = openMutableContentCatalog(path, migrationsDirectory);
  catalog.migrate();
  return { catalog, path };
}

function runtimeThenable(): never {
  return Object.defineProperty({}, 'then', {
    value: () => undefined,
  }) as never;
}

describe('catalog lifecycle and capability boundaries', () => {
  it('requires migrate and closes idempotently', () => {
    const catalog = openContentCatalog(pathForCatalog(), migrationsDirectory);
    expect(() => catalog.countRows()).toThrow(/not migrated/i);
    catalog.migrate();
    catalog.close();
    catalog.close();
    expect(() => catalog.countRows()).toThrow(/closed/i);
    expect(() =>
      catalog.readCatalogBundle('slice:huntbound:catalog-a'),
    ).toThrow(/closed/i);
    expect(() => catalog.migrate()).toThrow(/closed/i);
  });

  it('rejects mutable operations before migrate and after close', () => {
    const path = pathForCatalog();
    const catalog = openMutableContentCatalog(path, migrationsDirectory);
    expect(() => catalog.transaction(() => undefined)).toThrow(/not migrated/i);
    catalog.migrate();
    catalog.close();
    expect(() => catalog.transaction(() => undefined)).toThrow(/closed/i);
  });

  it('does not expose transaction on the public handle', () => {
    const catalog = openContentCatalog(pathForCatalog(), migrationsDirectory);
    expect('transaction' in catalog).toBe(false);
    expect(
      (catalog as unknown as { transaction?: unknown }).transaction,
    ).toBeUndefined();
    catalog.close();
  });

  it('rejects thenables, nested transactions and expired transaction handles', () => {
    const { catalog } = openMigratedMutable();
    try {
      expect(() => catalog.transaction(() => runtimeThenable())).toThrow(
        /thenable/i,
      );
      expect(() =>
        catalog.transaction(() => catalog.transaction(() => undefined)),
      ).toThrow(/nested/i);

      let leaked: CuratedCatalogTransactionWriter | undefined;
      catalog.transaction((tx) => {
        leaked = tx;
      });
      expect(() => leaked?.listOrphanEntities()).toThrow(/expired/i);
    } finally {
      catalog.close();
    }
  });

  it('rolls back a write performed before a runtime thenable is returned', () => {
    const { catalog, path } = openMigratedMutable();
    const inspection = openDatabase(path);
    try {
      const before = logicalDump(inspection);
      expect(() =>
        catalog.transaction((tx) => {
          tx.replaceCatalogBundle(createCatalogBundleFixture());
          return runtimeThenable();
        }),
      ).toThrow(/thenable/i);
      expect(logicalDump(inspection)).toBe(before);
    } finally {
      inspection.close();
      catalog.close();
    }
  });

  it('reports missing slices and lexically ordered counts for every owned table', () => {
    const catalog = openContentCatalog(pathForCatalog(), migrationsDirectory);
    catalog.migrate();
    expect(() => catalog.readCatalogBundle('slice:huntbound:missing')).toThrow(
      /missing slice/i,
    );
    const names = Object.keys(catalog.countRows());
    expect(names).toEqual(
      [...names].sort((left, right) => left.localeCompare(right)),
    );
    expect(names).toContain('schema_migrations');
    expect(names.some((name) => name.startsWith('sqlite_'))).toBe(false);
    catalog.close();
  });
});
