import { describe, expect, it } from 'vitest';

import { criticalResources } from './bootMetrics';

describe('criticalResources', () => {
  it('returns the five slowest resources in descending order', () => {
    const resources = [6, 1, 5, 2, 4, 3].map((duration, index) => ({
      name: `resource-${index}`,
      initiatorType: 'script',
      startTime: index,
      duration,
      transferSize: 100,
      encodedBodySize: 90,
      decodedBodySize: 120,
    }));

    expect(criticalResources(resources).map(({ duration }) => duration)).toEqual(
      [6, 5, 4, 3, 2],
    );
  });
});
