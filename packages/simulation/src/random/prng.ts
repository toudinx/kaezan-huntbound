const SPLIT_MIX_INCREMENT = 0x9e3779b9;
const SPLIT_MIX_MULTIPLIER_A = 0x21f0aaad;
const SPLIT_MIX_MULTIPLIER_B = 0x735a2d97;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const UINT32_RANGE = 0x1_0000_0000;

export type RandomState = [number, number, number, number];

export interface RandomStateResult {
  readonly value: number;
  readonly state: RandomState;
}

export interface SplitMix32Result {
  readonly value: number;
  readonly state: number;
}

export function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

export function splitMix32Next(state: number): SplitMix32Result {
  const nextState = (state + SPLIT_MIX_INCREMENT) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 16), SPLIT_MIX_MULTIPLIER_A) >>> 0;
  value = Math.imul(value ^ (value >>> 15), SPLIT_MIX_MULTIPLIER_B) >>> 0;
  value = (value ^ (value >>> 15)) >>> 0;
  return { value, state: nextState };
}

export function fnv1a32(value: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

function parseSeedWord(seed: string, start: number): number {
  return Number.parseInt(seed.slice(start, start + 8), 16) >>> 0;
}

function nextSplitMixValue(state: number): { value: number; state: number } {
  return splitMix32Next(state);
}

export function expandSeed(seed: string): RandomState {
  const upper = parseSeedWord(seed, 0);
  const lower = parseSeedWord(seed, 8);
  let upperState = upper;
  let lowerState = lower;
  const state: RandomState = [0, 0, 0, 0];

  ({ value: state[0], state: upperState } = nextSplitMixValue(upperState));
  ({ value: state[1], state: lowerState } = nextSplitMixValue(lowerState));
  ({ value: state[2], state: upperState } = nextSplitMixValue(upperState));
  ({ value: state[3], state: lowerState } = nextSplitMixValue(lowerState));

  if (state.every((word) => word === 0)) {
    let fallbackState = (upperState ^ lowerState ^ upper ^ lower) >>> 0;
    do {
      const result = nextSplitMixValue(fallbackState);
      fallbackState = result.state;
      state[0] = result.value;
    } while (state[0] === 0);
  }

  return state;
}

export function deriveState(
  parent: readonly number[],
  label: string,
): RandomState {
  let mixer = fnv1a32(label);
  const state: RandomState = [0, 0, 0, 0];

  for (let index = 0; index < state.length; index += 1) {
    const parentWord = parent[index] ?? 0;
    const result = nextSplitMixValue((mixer ^ parentWord) >>> 0);
    state[index] = result.value;
    mixer = result.state;
  }

  if (state.every((word) => word === 0)) {
    const result = nextSplitMixValue(mixer);
    state[0] = result.value === 0 ? 1 : result.value;
  }

  return state;
}

export function nextXoshiro128StarStar(
  current: readonly number[],
): RandomStateResult {
  const s0 = current[0] ?? 0;
  const s1 = current[1] ?? 0;
  const s2 = current[2] ?? 0;
  const s3 = current[3] ?? 0;
  const value = Math.imul(rotateLeft(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
  const t = (s1 << 9) >>> 0;

  const nextS2 = (s2 ^ s0) >>> 0;
  const nextS3 = (s3 ^ s1) >>> 0;
  const nextS1 = (s1 ^ nextS2) >>> 0;
  const nextS0 = (s0 ^ nextS3) >>> 0;

  return {
    value,
    state: [nextS0, nextS1, (nextS2 ^ t) >>> 0, rotateLeft(nextS3, 11)],
  };
}
