import { readFileSync } from 'node:fs';

import type { ContentSliceDefinition } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { validateSliceSelection } from '../../../packages/content/src/selections/validateSliceSelection';

describe('versioned PB-01 selection manifest', () => {
  it('validates the checked-in manifest against the frozen selection policy', () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL(
          '../../../packages/content/src/selections/pb-01-contract-coverage.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as ContentSliceDefinition;

    expect(validateSliceSelection(manifest)).toEqual([]);
  });
});
