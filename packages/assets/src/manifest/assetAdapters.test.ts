import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AssetIdAdapters,
  ClientId,
  EffectId,
  LookTypeId,
  MissileId,
} from '../index.ts';
import {
  createAssetKey,
  createClientId,
  createEffectId,
  createLookTypeId,
  createMissileId,
} from '../index.ts';

describe('asset ID adapter contracts', () => {
  it('keeps the four numeric namespaces behind distinct methods and types', () => {
    const key = createAssetKey('outfit:tibia:knight');
    const adapters: AssetIdAdapters = {
      lookTypes: {
        resolveLookType(id) {
          expectTypeOf(id).toEqualTypeOf<LookTypeId>();
          return key;
        },
      },
      clientIds: {
        resolveClientId(id) {
          expectTypeOf(id).toEqualTypeOf<ClientId>();
          return key;
        },
      },
      effects: {
        resolveEffectId(id) {
          expectTypeOf(id).toEqualTypeOf<EffectId>();
          return key;
        },
      },
      missiles: {
        resolveMissileId(id) {
          expectTypeOf(id).toEqualTypeOf<MissileId>();
          return key;
        },
      },
    };

    expect(adapters.lookTypes.resolveLookType(createLookTypeId(131))).toBe(key);
    expect(adapters.clientIds.resolveClientId(createClientId(3031))).toBe(key);
    expect(adapters.effects.resolveEffectId(createEffectId(12))).toBe(key);
    expect(adapters.missiles.resolveMissileId(createMissileId(36))).toBe(key);
  });
});
