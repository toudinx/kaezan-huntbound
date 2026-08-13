import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClientId, EffectId, LookTypeId, MissileId } from '../index.ts';
import {
  AssetKeySchema,
  ClientIdSchema,
  createAssetKey,
  createClientId,
  createEffectId,
  createLookTypeId,
  createMissileId,
  EffectIdSchema,
  LookTypeIdSchema,
  MissileIdSchema,
} from '../index.ts';

describe('asset identity contracts', () => {
  it('accepts the five stable key forms used by PB-02', () => {
    const keys = [
      'outfit:tibia:knight',
      'creature:tibia:rotworm',
      'item:tibia:gold-coin',
      'effect:tibia:energy-hit',
      'missile:tibia:energy-ball',
    ];

    expect(keys.map((key) => AssetKeySchema.parse(key))).toEqual(keys);
    expect(createAssetKey('outfit:tibia:knight')).toBe('outfit:tibia:knight');
  });

  it('rejects keys outside the lowercase three-segment grammar', () => {
    const invalidKeys = [
      'armor:tibia:knight',
      'Outfit:tibia:knight',
      'outfit:Tibia:knight',
      'outfit:tibia:Knight',
      'outfit:tibia:knight_name',
      'outfit:tibia:',
      'outfit::knight',
      'outfit:tibia:knight/idle',
      'outfit:tibia:../knight',
      'outfit:tibia:knight:extra',
    ];

    for (const key of invalidKeys) {
      expect(AssetKeySchema.safeParse(key).success, key).toBe(false);
      expect(() => createAssetKey(key), key).toThrow();
    }
  });

  it('accepts positive finite integers in each separate numeric namespace', () => {
    const lookType = LookTypeIdSchema.parse(12);
    const client = ClientIdSchema.parse(3031);
    const effect = EffectIdSchema.parse(12);
    const missile = MissileIdSchema.parse(36);

    expect(lookType).toBe(12);
    expect(client).toBe(3031);
    expect(effect).toBe(12);
    expect(missile).toBe(36);
    expect(createLookTypeId(12)).toBe(12);
    expect(createClientId(3031)).toBe(3031);
    expect(createEffectId(12)).toBe(12);
    expect(createMissileId(36)).toBe(36);

    expectTypeOf(lookType).toEqualTypeOf<LookTypeId>();
    expectTypeOf(client).toEqualTypeOf<ClientId>();
    expectTypeOf(effect).toEqualTypeOf<EffectId>();
    expectTypeOf(missile).toEqualTypeOf<MissileId>();

    // @ts-expect-error Numeric namespaces must not be assignable to one another.
    const mixedLookType: LookTypeId = effect;
    // @ts-expect-error Numeric namespaces must not be assignable to one another.
    const mixedEffect: EffectId = lookType;
    expect(mixedLookType).toBe(12);
    expect(mixedEffect).toBe(12);
  });

  it('rejects zero, negative, decimal, NaN, and infinite IDs', () => {
    const schemas = [
      LookTypeIdSchema,
      ClientIdSchema,
      EffectIdSchema,
      MissileIdSchema,
    ];
    const invalidIds = [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];

    for (const schema of schemas) {
      for (const id of invalidIds) {
        expect(schema.safeParse(id).success, String(id)).toBe(false);
      }
    }
  });
});
