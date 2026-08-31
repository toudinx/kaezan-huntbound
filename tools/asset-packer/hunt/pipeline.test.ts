import { describe, expect, it } from 'vitest';

import { compactAssetPipelineOutput } from './pipeline.ts';

describe('compactAssetPipelineOutput', () => {
  it('replaces verbose path lists with their count', () => {
    expect(
      compactAssetPipelineOutput({
        ok: true,
        packSha256: 'abc',
        paths: ['catalog.json', 'pack.json', 'pack.sha256'],
      }),
    ).toEqual({ ok: true, packSha256: 'abc', pathCount: 3 });
  });
});
