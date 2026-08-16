import type { CatalogContentBundle, ContentKey } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { createContentRegistry, projectRuntimeBundle } from './contentRegistry';

const bundle = {
  schemaVersion: '1',
  contentVersion: 'test-v1',
  slice: {
    key: 'slice:huntbound:runtime-test',
    objective: 'runtime test',
    consumer: 'runtime tests',
    roots: ['creature:tibia:snake'],
    dependencies: [],
    projections: [
      {
        entityKey: 'creature:tibia:snake',
        facets: ['identity', 'stats', 'appearance'],
        consumer: 'runtime tests',
        rationale: 'runtime lookup',
      },
    ],
    dependencyMode: 'reachable-only' as const,
    curationState: 'accepted' as const,
    exportVersion: '1',
  },
  vocationFamilies: [],
  projectionAudits: [],
  vocations: [],
  creatures: [
    {
      guid: '9a8dd398-e67b-5a98-be03-3406bd581cf9',
      stableKey: 'creature:tibia:snake',
      displayName: 'Snake',
      includedFacets: ['identity', 'stats', 'appearance'],
      source: {
        system: 'canary' as const,
        snapshot: 'test',
        sourceId: '28',
        sourcePath: 'creatures/snake.lua',
        sourceSha256: 'a'.repeat(64),
      },
      aliases: [],
      stats: { health: 15, experience: 10, speed: 60 },
      lookType: 28,
      attacks: [],
      defenses: [],
      conditions: [],
      summons: [],
      resistances: {},
      immunities: [],
      loot: [],
    },
  ],
  items: [],
  spells: [],
  characters: [],
} as unknown as CatalogContentBundle;

describe('runtime content registry', () => {
  it('projects away catalog provenance, aliases, audits, and source slice fields', () => {
    const runtime = projectRuntimeBundle(bundle);
    const serialized = JSON.stringify(runtime);

    expect(serialized).not.toContain('sourcePath');
    expect(serialized).not.toContain('sourceSha256');
    expect(serialized).not.toContain('projectionAudits');
    expect(serialized).not.toContain('aliases');
    expect(serialized).not.toContain('snapshot');
    expect(runtime.creatures[0]).not.toHaveProperty('source');
  });

  it('validates once, freezes the stored clone, and reports missing keys with slice context', () => {
    const registry = createContentRegistry(projectRuntimeBundle(bundle));
    (bundle.creatures[0] as { displayName: string }).displayName =
      'Mutated after construction';

    const snakeKey = 'creature:tibia:snake' as ContentKey;
    const missingKey = 'item:tibia:missing' as ContentKey;
    expect(registry.getCreature(snakeKey).displayName).toBe('Snake');
    expect(registry.has(snakeKey)).toBe(true);
    expect(() => registry.getItem(missingKey)).toThrow(
      /item:tibia:missing.*slice:huntbound:runtime-test/,
    );
  });
});
