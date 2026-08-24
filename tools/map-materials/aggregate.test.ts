import { describe, expect, it } from 'vitest';

import { aggregateMaterial } from './aggregate.ts';

describe('aggregateMaterial', () => {
  it('selects the most frequent server id and records its count per signature', () => {
    const result = aggregateMaterial(
      { key: 'dirt-wall', serverIds: [356, 357] },
      [
        { serverId: 356, signature: 42 },
        { serverId: 356, signature: 42 },
        { serverId: 356, signature: 42 },
        { serverId: 357, signature: 42 },
        { serverId: 357, signature: 9 },
        { serverId: 357, signature: 9 },
      ],
    );

    expect(result.cases).toEqual([
      { count: 2, serverId: 357, signature: 9 },
      { count: 3, serverId: 356, signature: 42 },
    ]);
    expect(result.coverage).toEqual({
      minimumOccurrence: 2,
      observedCases: 2,
      sampledTiles: 6,
      totalCases: 256,
    });
    expect(result.ambiguities).toEqual([]);
  });

  it('reports an ambiguity within ten percent with material and signature', () => {
    const result = aggregateMaterial(
      { key: 'dirt-wall', serverIds: [356, 357] },
      [
        ...Array.from({ length: 10 }, () => ({ serverId: 356, signature: 42 })),
        ...Array.from({ length: 9 }, () => ({ serverId: 357, signature: 42 })),
      ],
    );

    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0]).toMatchObject({
      materialKey: 'dirt-wall',
      signature: 42,
    });
    expect(result.ambiguities[0]?.message).toMatch(/dirt-wall.*signature 42/i);
  });
});
