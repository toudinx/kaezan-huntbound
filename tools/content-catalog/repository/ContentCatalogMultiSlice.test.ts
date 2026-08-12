import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../database/openDatabase';
import { createTemporaryCatalogFile } from '../testing/sqliteTestSupport';
import { canonicalizeCatalogBundle } from './canonicalCatalog';
import {
  createCatalogBundleFixture,
  createSecondSliceFixture,
  mutateBundle,
} from './catalogFixture.test-support';
import { openMutableContentCatalog } from './internal/openMutableContentCatalog';

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url),
);
const cleanups: Array<() => void> = [];

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

function sliceBWithSnakeLoot() {
  const input = createSecondSliceFixture();
  return mutateBundle(input, (draft) => {
    const snake = draft.creatures.find(
      (creature) => creature.stableKey === 'creature:tibia:snake',
    );
    if (!snake) throw new Error('Snake fixture is missing');
    snake.includedFacets = [...snake.includedFacets, 'loot'];
    snake.loot = [
      {
        itemKey: 'item:tibia:3031' as (typeof input.items)[number]['stableKey'],
        chancePerHundredThousand: 100,
        minCount: 1,
        maxCount: 1,
      },
    ];
    const projection = draft.slice.projections.find(
      (value) => value.entityKey === snake.stableKey,
    );
    if (!projection) throw new Error('Snake projection is missing');
    projection.facets = [...projection.facets, 'loot'];
  });
}

describe('catalog multi-slice semantics', () => {
  it('adds a new facet to a shared entity without changing the older slice', () => {
    const { catalog } = openMigratedCatalog();
    try {
      const first = createCatalogBundleFixture();
      const second = sliceBWithSnakeLoot();
      catalog.transaction((tx) => tx.replaceCatalogBundle(first));
      const beforeA = catalog.readCatalogBundle(first.slice.key);
      catalog.transaction((tx) => tx.replaceCatalogBundle(second));

      expect(catalog.readCatalogBundle(first.slice.key)).toEqual(beforeA);
      expect(
        catalog
          .readCatalogBundle(second.slice.key)
          .creatures.find(
            (creature) => creature.stableKey === 'creature:tibia:snake',
          )?.loot,
      ).not.toHaveLength(0);
    } finally {
      catalog.close();
    }
  });

  it('requires coordinated replacement when a shared facet changes', () => {
    const { catalog } = openMigratedCatalog();
    try {
      const first = createCatalogBundleFixture();
      const second = createSecondSliceFixture();
      catalog.transaction((tx) => {
        tx.replaceCatalogBundle(first);
        tx.replaceCatalogBundle(second);
      });
      const changedA = mutateBundle(first, (draft) => {
        const snake = draft.creatures.find(
          (creature) => creature.stableKey === 'creature:tibia:snake',
        );
        if (!snake) throw new Error('Snake fixture is missing');
        snake.stats.health = 101;
      });
      const changedB = mutateBundle(second, (draft) => {
        const snake = draft.creatures.find(
          (creature) => creature.stableKey === 'creature:tibia:snake',
        );
        if (!snake) throw new Error('Snake fixture is missing');
        snake.stats.health = 101;
      });

      expect(() =>
        catalog.transaction((tx) => tx.replaceCatalogBundle(changedA)),
      ).toThrow(/shared facet/i);
      catalog.transaction((tx) => {
        tx.replaceCatalogBundle(changedA);
        tx.replaceCatalogBundle(changedB);
      });
      expect(
        catalog
          .readCatalogBundle(first.slice.key)
          .creatures.find(
            (creature) => creature.stableKey === 'creature:tibia:snake',
          )?.stats.health,
      ).toBe(101);
    } finally {
      catalog.close();
    }
  });

  it('performs zero writes for an identical reimport', () => {
    const { catalog, path } = openMigratedCatalog();
    const inspection = openDatabase(path);
    try {
      const input = createCatalogBundleFixture();
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));
      const before = inspection
        .prepare('SELECT COUNT(*) AS count FROM content_slice_entities')
        .get() as { readonly count: number };
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));
      const after = inspection
        .prepare('SELECT COUNT(*) AS count FROM content_slice_entities')
        .get() as { readonly count: number };
      expect(after.count).toBe(before.count);
      expect(catalog.readCatalogBundle(input.slice.key)).toEqual(
        canonicalizeCatalogBundle(input),
      );
    } finally {
      inspection.close();
      catalog.close();
    }
  });

  it('replaces only the addressed slice and removes its stale rows', () => {
    const { catalog } = openMigratedCatalog();
    try {
      const first = createCatalogBundleFixture();
      const second = createSecondSliceFixture();
      catalog.transaction((tx) => {
        tx.replaceCatalogBundle(first);
        tx.replaceCatalogBundle(second);
      });
      const beforeB = catalog.readCatalogBundle(second.slice.key);
      const withoutSpell = mutateBundle(first, (draft) => {
        const spellKey = draft.spells[0]?.stableKey;
        draft.spells = [];
        draft.slice.dependencies = draft.slice.dependencies.filter(
          (key) => key !== spellKey,
        );
        draft.slice.projections = draft.slice.projections.filter(
          (projection) => projection.entityKey !== spellKey,
        );
        draft.slice.sourceFiles = draft.slice.sourceFiles.filter(
          (sourcePath) => !sourcePath.startsWith('spells/'),
        );
        draft.projectionAudits = [];
      });
      catalog.transaction((tx) => tx.replaceCatalogBundle(withoutSpell));

      expect(catalog.readCatalogBundle(second.slice.key)).toEqual(beforeB);
      expect(catalog.readCatalogBundle(first.slice.key).spells).toEqual([]);
    } finally {
      catalog.close();
    }
  });
});
