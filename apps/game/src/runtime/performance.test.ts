import { describe, expect, it } from 'vitest';

import { readShellActionableDuration } from './performance';

describe('readShellActionableDuration', () => {
  it('rejects a missing actionable mark', () => {
    expect(() => readShellActionableDuration([])).toThrow(
      'huntbound:shell-actionable mark is missing.',
    );
  });

  it('rejects duplicate actionable marks', () => {
    expect(() =>
      readShellActionableDuration([
        { name: 'huntbound:shell-actionable', startTime: 1_200 },
        { name: 'huntbound:shell-actionable', startTime: 1_400 },
      ]),
    ).toThrow('huntbound:shell-actionable mark must be unique.');
  });

  it('returns a valid actionable duration in milliseconds', () => {
    expect(
      readShellActionableDuration([
        { name: 'huntbound:shell-actionable', startTime: 4_800 },
      ]),
    ).toBe(4_800);
  });
});
