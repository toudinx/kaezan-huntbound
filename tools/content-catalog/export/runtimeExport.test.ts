import { describe, expect, it } from 'vitest';

import { projectRuntimeBundle } from '../../../packages/content/src/runtime/contentRegistry';
import {
  createCatalogBundleFixture,
  mutateBundle,
} from '../repository/catalogFixture.test-support';
import {
  createRuntimeExport,
  generateCatalogDocumentation,
} from './runtimeExport';

describe('runtime export', () => {
  it('serializes independent entity orderings to identical UTF-8 JSON and SHA-256', () => {
    const input = createCatalogBundleFixture();
    const shuffled = mutateBundle(input, (draft) => {
      draft.creatures.reverse();
      draft.items.reverse();
      draft.vocations.reverse();
      draft.spells.reverse();
    });

    const left = createRuntimeExport(projectRuntimeBundle(input));
    const right = createRuntimeExport(projectRuntimeBundle(shuffled));

    expect(left.json).toBe(right.json);
    expect(left.sha256).toBe(right.sha256);
    expect(left.json.endsWith('\n')).toBe(true);
    expect(JSON.parse(left.json)).not.toHaveProperty('projectionAudits');
  });

  it('documents source provenance, roots, dependencies, facets, and selected relations', () => {
    const documentation = generateCatalogDocumentation(
      createCatalogBundleFixture(),
    );

    expect(documentation).toContain('# PB-01 Catalog');
    expect(documentation).toContain('slice:huntbound:catalog-a');
    expect(documentation).toContain('creature:tibia:dragon');
    expect(documentation).toContain('creatures/dragon.json');
    expect(documentation).toContain(
      'identity, stats, appearance, combat, conditions, loot',
    );
    expect(documentation).toContain('creature:tibia:snake');
    expect(documentation.endsWith('\n')).toBe(true);
  });
});
