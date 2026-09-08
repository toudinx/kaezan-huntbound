import { describe, expect, it } from 'vitest';

import { huntSlug } from './huntSlug.ts';

describe('huntSlug', () => {
  it('reads the kebab-case tail of a hunt key', () => {
    expect(huntSlug('hunt:tibia:venore-rotworm-cave')).toBe(
      'venore-rotworm-cave',
    );
  });

  it('throws on a key whose tail is not a kebab-case slug', () => {
    expect(() => huntSlug('hunt:tibia:Venore_Rotworm')).toThrow(
      'Hunt key does not end in a kebab-case slug',
    );
  });
});
