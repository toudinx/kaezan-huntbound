import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../database/openDatabase';
import {
  createTemporaryCatalogFile,
  foreignKeyViolations,
  logicalDump,
} from '../testing/sqliteTestSupport';
import {
  createCatalogBundleFixture,
  mutateBundle,
  withAliasAmbiguity,
  withCrossSliceFamily,
  withCrossSliceLootTarget,
  withCrossSliceSummonTarget,
  withGuidCollision,
  withSourceTupleCollision,
  withStableKeyCollision,
  withWrongChildKind,
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

describe('catalog constraints and rollback', () => {
  it.each([
    ['guid collision', withGuidCollision()],
    ['stable key collision', withStableKeyCollision()],
    ['source tuple collision', withSourceTupleCollision()],
    ['alias ambiguity', withAliasAmbiguity()],
    ['loot target missing in same slice', withCrossSliceLootTarget()],
    ['summon target missing in same slice', withCrossSliceSummonTarget()],
    ['wrong child kind', withWrongChildKind()],
    ['family missing in same slice', withCrossSliceFamily()],
  ])('rolls back %s', (_name, invalidBundle) => {
    const { catalog, path } = openMigratedCatalog();
    const inspection = openDatabase(path);
    try {
      const before = logicalDump(inspection);
      expect(() =>
        catalog.transaction((tx) => tx.replaceCatalogBundle(invalidBundle)),
      ).toThrow();
      expect(logicalDump(inspection)).toBe(before);
      expect(foreignKeyViolations(inspection)).toEqual([]);
    } finally {
      inspection.close();
      catalog.close();
    }
  });

  it('rolls back every table after a deliberately late SQL failure', () => {
    const { catalog, path } = openMigratedCatalog();
    const inspection = openDatabase(path);
    try {
      const input = createCatalogBundleFixture();
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));
      const before = logicalDump(inspection);
      inspection.exec(`
        CREATE TRIGGER abort_spell_audit
        BEFORE INSERT ON spell_source_vocation_refs
        BEGIN
          SELECT RAISE(ABORT, 'late fixture failure');
        END;
      `);
      const changed = mutateBundle(input, (draft) => {
        const audit = draft.projectionAudits[0];
        if (!audit) throw new Error('Fixture audit is missing');
        audit.rawReference = 'changed audit';
      });

      expect(() =>
        catalog.transaction((tx) => tx.replaceCatalogBundle(changed)),
      ).toThrow(/late fixture failure/i);
      expect(logicalDump(inspection)).toBe(before);
      expect(foreignKeyViolations(inspection)).toEqual([]);
    } finally {
      inspection.close();
      catalog.close();
    }
  });

  it('keeps identity and alias history after removing the final active slice', () => {
    const { catalog, path } = openMigratedCatalog();
    const inspection = openDatabase(path);
    try {
      const input = createCatalogBundleFixture();
      catalog.transaction((tx) => tx.replaceCatalogBundle(input));
      const removed = mutateBundle(input, (draft) => {
        draft.spells = [];
        draft.slice.dependencies = draft.slice.dependencies.filter(
          (key) => key !== input.spells[0]?.stableKey,
        );
        draft.slice.projections = draft.slice.projections.filter(
          (projection) => projection.entityKey !== input.spells[0]?.stableKey,
        );
        draft.slice.sourceFiles = draft.slice.sourceFiles.filter(
          (sourcePath) => sourcePath !== input.spells[0]?.source.sourcePath,
        );
        draft.projectionAudits = [];
      });
      catalog.transaction((tx) => tx.replaceCatalogBundle(removed));

      const spell = inspection
        .prepare(
          `SELECT l.guid, l.stable_key, r.alias
           FROM content_identity_ledger l
           JOIN content_alias_registry r ON r.entity_guid = l.guid
           WHERE l.stable_key = ?`,
        )
        .get(input.spells[0]?.stableKey) as
        | {
            readonly guid: string;
            readonly stable_key: string;
            readonly alias: string;
          }
        | undefined;
      expect(spell?.stable_key).toBe(input.spells[0]?.stableKey);
      expect(spell?.alias).toBe('80');
      expect(
        inspection
          .prepare('SELECT 1 FROM content_entities WHERE guid = ?')
          .get(spell?.guid),
      ).toBeUndefined();
    } finally {
      inspection.close();
      catalog.close();
    }
  });
});
