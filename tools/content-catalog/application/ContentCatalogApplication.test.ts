import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentSliceDefinition } from '@huntbound/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { importCanarySlice } from '../../../packages/content/src/application/ImportCanarySlice';
import type { SourceSnapshotLock } from '../../../packages/content/src/application/sourceLockTypes';
import { canonicalizeCatalogBundle } from '../repository/canonicalCatalog';
import { openMutableContentCatalog } from '../repository/internal/openMutableContentCatalog';
import { createTemporaryCatalogFile } from '../testing/sqliteTestSupport';

const root = fileURLToPath(new URL('../../../', import.meta.url));

function resolveCanarySourceRoot(): string | undefined {
  const fromEnv = process.env.HUNTBOUND_CANARY_SOURCE;
  if (fromEnv !== undefined) return fromEnv;
  const fallback = join(root, 'references', 'canary');
  return existsSync(join(fallback, 'data', 'XML', 'vocations.xml'))
    ? fallback
    : undefined;
}

const sourceRoot = resolveCanarySourceRoot();
const selection = JSON.parse(
  readFileSync(
    `${root}/packages/content/src/selections/pb-01-contract-coverage.json`,
    'utf8',
  ),
) as ContentSliceDefinition;
const lock = JSON.parse(
  readFileSync(
    `${root}/packages/content/src/sources/canary-157e6f9e.json`,
    'utf8',
  ),
) as SourceSnapshotLock;
const migrations = fileURLToPath(new URL('../migrations', import.meta.url));
const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

describe.skipIf(sourceRoot === undefined)(
  'Canary slice application integration',
  () => {
    const canaryRoot = sourceRoot as string;

    it('materializes the frozen real slice and is idempotent by bundle and row counts', () => {
      const temporary = createTemporaryCatalogFile();
      const catalog = openMutableContentCatalog(temporary.path, migrations);
      cleanups.push(() => {
        catalog.close();
        temporary.cleanup();
      });
      catalog.migrate();
      const result = importCanarySlice(selection, lock, {
        readSource: (relativePath) =>
          readFileSync(`${canaryRoot}/${relativePath}`, 'utf8'),
        writer: catalog,
      });
      const firstBundle = catalog.readCatalogBundle(selection.key);
      const firstCounts = catalog.countRows();

      importCanarySlice(selection, lock, {
        readSource: (relativePath) =>
          readFileSync(`${canaryRoot}/${relativePath}`, 'utf8'),
        writer: catalog,
      });

      expect(result.diagnostics).toEqual([]);
      expect(firstBundle).toEqual(catalog.readCatalogBundle(selection.key));
      expect(catalog.countRows()).toEqual(firstCounts);
      expect(firstBundle.slice.roots).toEqual(
        canonicalizeCatalogBundle(result.bundle).slice.roots,
      );
      expect(
        firstBundle.creatures.map((creature) => creature.stableKey),
      ).toEqual([
        'creature:tibia:amazon',
        'creature:tibia:orc-shaman',
        'creature:tibia:rotworm',
        'creature:tibia:snake',
      ]);
      expect(
        firstBundle.creatures.find(
          (creature) => creature.stableKey === 'creature:tibia:rotworm',
        )?.loot,
      ).toContainEqual({
        itemKey: 'item:tibia:gold-coin',
        chancePerHundredThousand: 71760,
        minCount: 1,
        maxCount: 17,
      });
      expect(firstBundle.items.length).toBeGreaterThan(0);
    });

    it('does not leave a partial slice when a bundle fails validation', () => {
      const temporary = createTemporaryCatalogFile();
      const catalog = openMutableContentCatalog(temporary.path, migrations);
      cleanups.push(() => {
        catalog.close();
        temporary.cleanup();
      });
      catalog.migrate();
      const valid = importCanarySlice(selection, lock, {
        readSource: (relativePath) =>
          readFileSync(`${canaryRoot}/${relativePath}`, 'utf8'),
        writer: catalog,
      }).bundle;
      const before = catalog.countRows();
      const invalid = structuredClone(valid) as typeof valid;
      (invalid.creatures[0] as { stableKey: string }).stableKey =
        'item:tibia:wrong-kind';

      expect(() =>
        catalog.transaction((tx) => tx.replaceCatalogBundle(invalid)),
      ).toThrow();
      expect(catalog.countRows()).toEqual(before);
      expect(catalog.readCatalogBundle(selection.key)).toEqual(
        canonicalizeCatalogBundle(valid),
      );
    });
  },
);
