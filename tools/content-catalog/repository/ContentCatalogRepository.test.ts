import { fileURLToPath } from 'node:url';

import type { CatalogContentBundle } from '@huntbound/contracts';
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
  it('round-trips every character kit band instead of flattening the active band', () => {
    const { catalog } = openMigratedCatalog();
    const character = {
      stableKey: 'character:huntbound:kit-round-trip',
      vocationKey: 'vocation:tibia:4',
      level: 35,
      skills: { sword: 100, magic: 0 },
      weaponItemKey: 'item:tibia:3031',
      weaponAttack: 14,
      maxHealth: 1000,
      maxMana: 300,
      kit: [
        { minLevel: 1, maxLevel: 8, spellKeys: ['spell:tibia:80'] },
        { minLevel: 9, maxLevel: null, spellKeys: ['spell:tibia:80'] },
      ],
    } as unknown as CatalogContentBundle['characters'][number];
    const input = {
      ...createCatalogBundleFixture(),
      characters: [character],
    } as CatalogContentBundle;

    try {
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));

      expect(catalog.readCatalogBundle(input.slice.key)).toEqual(
        canonicalizeCatalogBundle(input),
      );
    } finally {
      catalog.close();
    }
  });

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
