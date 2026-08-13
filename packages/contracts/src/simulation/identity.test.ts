import { describe, expect, it } from 'vitest';

import {
  createEntityId,
  createSeed,
  createStreamLabel,
  createTickIndex,
  EntityIdSchema,
  SeedSchema,
  StreamLabelSchema,
  TickIndexSchema,
} from './identity';

describe('simulation identity', () => {
  it('accepts the frozen branded identity formats', () => {
    expect(TickIndexSchema.parse(0)).toBe(0);
    expect(EntityIdSchema.parse(1)).toBe(1);
    expect(SeedSchema.parse('0f1e2d3c4b5a6978')).toBe('0f1e2d3c4b5a6978');
    expect(StreamLabelSchema.parse('movement')).toBe('movement');
    expect(StreamLabelSchema.parse('scenario-spawn')).toBe('scenario-spawn');
  });

  it('rejects invalid numeric identities and stream labels', () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(TickIndexSchema.safeParse(value).success).toBe(false);
    }

    for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(EntityIdSchema.safeParse(value).success).toBe(false);
    }

    for (const value of ['movement_label', 'Movement', 'movement label', '']) {
      expect(StreamLabelSchema.safeParse(value).success).toBe(false);
    }
  });

  it('accepts only lowercase sixteen-character hexadecimal seeds', () => {
    expect(SeedSchema.safeParse('0000000000000000').success).toBe(true);
    expect(SeedSchema.safeParse('ffffffffffffffff').success).toBe(true);

    for (const value of [
      '0F1e2d3c4b5a6978',
      '0f1e2d3c4b5a697',
      '0f1e2d3c4b5a69789',
      '0f1e2d3c4b5a69zg',
    ]) {
      expect(SeedSchema.safeParse(value).success).toBe(false);
    }
  });

  it('creates branded values only after validation', () => {
    expect(createTickIndex(0)).toBe(0);
    expect(createEntityId(1)).toBe(1);
    expect(createSeed('0f1e2d3c4b5a6978')).toBe('0f1e2d3c4b5a6978');
    expect(createStreamLabel('movement')).toBe('movement');

    expect(() => createTickIndex(-1)).toThrow();
    expect(() => createEntityId(0)).toThrow();
    expect(() => createSeed('0F1E2D3C4B5A6978')).toThrow();
    expect(() => createStreamLabel('movement_label')).toThrow();
  });
});
