import { afterEach, describe, expect, it } from 'vitest';

import { parsePreviewPort, previewOrigin } from './previewPort.ts';

describe('parsePreviewPort', () => {
  const previous = process.env.PLAYWRIGHT_PREVIEW_PORT;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.PLAYWRIGHT_PREVIEW_PORT;
      return;
    }
    process.env.PLAYWRIGHT_PREVIEW_PORT = previous;
  });

  it('defaults to 4173 when the env is unset', () => {
    delete process.env.PLAYWRIGHT_PREVIEW_PORT;
    expect(parsePreviewPort()).toBe(4173);
    expect(previewOrigin()).toBe('http://127.0.0.1:4173');
  });

  it('reads PLAYWRIGHT_PREVIEW_PORT so a worktree can avoid a busy 4173', () => {
    expect(parsePreviewPort('4174')).toBe(4174);
    expect(previewOrigin(4174)).toBe('http://127.0.0.1:4174');
  });

  it('rejects a non-integer port instead of falling through to a colliding default', () => {
    expect(() => parsePreviewPort('not-a-port')).toThrow(
      /PLAYWRIGHT_PREVIEW_PORT/,
    );
  });
});
