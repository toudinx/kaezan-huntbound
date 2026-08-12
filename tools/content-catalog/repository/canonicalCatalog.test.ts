import { describe, expect, it } from 'vitest';
import {
  canonicalizeCatalogBundle,
  validatePersistableBundle,
} from './canonicalCatalog';
import {
  createCatalogBundleFixture,
  creatureWithItemKey,
  shuffledFixture,
  withDuplicateAlias,
  withDuplicateAllowedFamily,
  withDuplicateSourceFile,
  withMismatchedFamilyMembership,
  withoutIdentityFacet,
  withUnreachableDependency,
} from './catalogFixture.test-support';

describe('canonical catalog validation', () => {
  it.each([
    ['missing identity facet', withoutIdentityFacet()],
    ['wrong stable-key kind', creatureWithItemKey()],
    ['unreachable dependency', withUnreachableDependency()],
    ['duplicate source file', withDuplicateSourceFile()],
    ['duplicate alias', withDuplicateAlias()],
    ['duplicate spell family', withDuplicateAllowedFamily()],
    ['mismatched vocation family directions', withMismatchedFamilyMembership()],
  ])('rejects %s before persistence', (_name, input) => {
    expect(() => validatePersistableBundle(input)).toThrow();
  });

  it('canonicalizes identity arrays but preserves ordered relation arrays', () => {
    const canonical = canonicalizeCatalogBundle(shuffledFixture());
    expect(canonical.creatures.map((value) => value.stableKey)).toEqual([
      'creature:tibia:dragon',
      'creature:tibia:snake',
    ]);
    expect(canonical.creatures[0]?.attacks.map((value) => value.name)).toEqual([
      'bite',
      'bolt',
      'wave',
    ]);
  });

  it('accepts the complete deterministic fixture', () => {
    expect(validatePersistableBundle(createCatalogBundleFixture())).toEqual(
      createCatalogBundleFixture(),
    );
  });
});
