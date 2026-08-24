import type { BorderizeSeed, WeightedGround } from './types.ts';

export function hashCoordinate(
  seed: BorderizeSeed,
  layoutId: string,
  x: number,
  y: number,
  z: number,
): number {
  let hash = 2166136261;
  for (const value of [
    String(seed),
    layoutId,
    String(x),
    String(y),
    String(z),
  ]) {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectWeightedGround(
  variants: readonly WeightedGround[],
  hash: number,
): number {
  if (variants.length === 0) {
    throw new Error('massVariants must contain at least one variant.');
  }

  let totalWeight = 0;
  for (const variant of variants) {
    if (!Number.isSafeInteger(variant.weight) || variant.weight <= 0) {
      throw new Error('massVariants weights must be positive safe integers.');
    }
    totalWeight += variant.weight;
    if (!Number.isSafeInteger(totalWeight)) {
      throw new Error('massVariants total weight must be a safe integer.');
    }
  }

  const target = hash % totalWeight;
  let cumulativeWeight = 0;
  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (target < cumulativeWeight) {
      return variant.serverId;
    }
  }

  throw new Error('massVariants could not select a ground.');
}
