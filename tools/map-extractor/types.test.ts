import { describe, expect, it } from 'vitest';

import { isBlockingDiagnostic } from './types.ts';

describe('map extractor diagnostics', () => {
  it('treats HUNT_EMPTY_TILE as blocking', () => {
    expect(
      isBlockingDiagnostic({
        path: 'region.floors[8].cells[0]',
        code: 'HUNT_EMPTY_TILE',
        message: 'Cell has no ground item',
      }),
    ).toBe(true);
  });
});
