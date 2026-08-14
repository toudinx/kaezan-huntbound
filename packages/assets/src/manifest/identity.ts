import { z } from 'zod';

export type AssetKey = string & {
  readonly __brand: 'AssetKey';
};

export type LookTypeId = number & {
  readonly __brand: 'LookTypeId';
};

export type ClientId = number & {
  readonly __brand: 'ClientId';
};

export type EffectId = number & {
  readonly __brand: 'EffectId';
};

export type MissileId = number & {
  readonly __brand: 'MissileId';
};

const assetKeyPattern =
  /^(?:outfit|creature|item|tile|effect|missile):[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;

const positiveInteger = z.number().finite().int().positive();

export const AssetKeySchema: z.ZodType<AssetKey> = z
  .string()
  .regex(assetKeyPattern, {
    message:
      'Asset key must be kind:source:slug in lowercase kebab-case using a supported kind',
  })
  .transform((value) => value as AssetKey);

export const LookTypeIdSchema: z.ZodType<LookTypeId> =
  positiveInteger.transform((value) => value as LookTypeId);

export const ClientIdSchema: z.ZodType<ClientId> = positiveInteger.transform(
  (value) => value as ClientId,
);

export const EffectIdSchema: z.ZodType<EffectId> = positiveInteger.transform(
  (value) => value as EffectId,
);

export const MissileIdSchema: z.ZodType<MissileId> = positiveInteger.transform(
  (value) => value as MissileId,
);

export function createAssetKey(input: unknown): AssetKey {
  return AssetKeySchema.parse(input);
}

export function createLookTypeId(input: unknown): LookTypeId {
  return LookTypeIdSchema.parse(input);
}

export function createClientId(input: unknown): ClientId {
  return ClientIdSchema.parse(input);
}

export function createEffectId(input: unknown): EffectId {
  return EffectIdSchema.parse(input);
}

export function createMissileId(input: unknown): MissileId {
  return MissileIdSchema.parse(input);
}
