import { describe, expect, it } from 'vitest';

import {
  ContentGuidSchema,
  ContentKeySchema,
  createContentGuid,
  HUNTBOUND_CONTENT_NAMESPACE,
  VocationFamilyKeySchema,
} from './identity';

describe('content identity', () => {
  it('uses the frozen Huntbound UUID namespace', () => {
    expect(HUNTBOUND_CONTENT_NAMESPACE).toBe(
      '471cdc3d-d99e-4bed-9782-9923d845f3d7',
    );
  });

  it.each([
    ['creature', '26', '9a8dd398-e67b-5a98-be03-3406bd581cf9'],
    ['item', '3031', '78974d81-ae2d-5ba6-855e-04d1909ab11a'],
    ['spell', '80', '48bec9e6-c6e6-5fd4-9d59-cc29a6478a4c'],
    ['vocation', '4', 'e3823a68-9f12-51e1-9b83-fde613163995'],
  ] as const)(
    'creates the canonical UUIDv5 for %s/%s',
    (kind, sourceId, expected) => {
      expect(createContentGuid(kind, 'tibia', sourceId)).toBe(expected);
    },
  );

  it('is deterministic for the same source tuple', () => {
    expect(createContentGuid('creature', 'tibia', '26')).toBe(
      createContentGuid('creature', 'tibia', '26'),
    );
  });

  it('does not derive the GUID from display names, paths, or snapshots', () => {
    const guid = createContentGuid('creature', 'tibia', '26');

    expect(guid).toBe(createContentGuid('creature', 'tibia', '26'));
    expect(guid).not.toBe(createContentGuid('creature', 'tibia', '27'));
    expect(guid).not.toBe(createContentGuid('item', 'tibia', '26'));
  });

  it('accepts canonical content keys and rejects ambiguous slugs', () => {
    expect(ContentKeySchema.parse('creature:tibia:rotworm')).toBe(
      'creature:tibia:rotworm',
    );
    expect(ContentKeySchema.parse('vocation:tibia:elite-knight')).toBe(
      'vocation:tibia:elite-knight',
    );

    for (const value of [
      'Creature:tibia:rotworm',
      'creature:tibia:rot_worm',
      'creature:tibia:rot worm',
      'creature:tibia:',
      'creature:tibia:rotworm-',
    ]) {
      expect(ContentKeySchema.safeParse(value).success).toBe(false);
    }
  });

  it('keeps vocation families as a separate identity namespace', () => {
    expect(
      VocationFamilyKeySchema.parse('vocation-family:huntbound:knight'),
    ).toBe('vocation-family:huntbound:knight');
    expect(
      ContentKeySchema.safeParse('vocation-family:huntbound:knight').success,
    ).toBe(false);
  });

  it('validates only UUIDv5 content GUIDs', () => {
    expect(
      ContentGuidSchema.safeParse(createContentGuid('spell', 'tibia', '80'))
        .success,
    ).toBe(true);
    expect(ContentGuidSchema.safeParse('not-a-guid').success).toBe(false);
    expect(
      ContentGuidSchema.safeParse('48BEC9E6-C6E6-5FD4-9D59-CC29A6478A4C')
        .success,
    ).toBe(false);
  });
});
