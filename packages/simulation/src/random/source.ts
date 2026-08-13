import type {
  RandomStreamState,
  Seed,
  StreamLabel,
} from '@huntbound/contracts';

import {
  deriveState,
  expandSeed,
  nextXoshiro128StarStar,
  type RandomState,
  UINT32_RANGE,
} from './prng.ts';

const seedPattern = /^[0-9a-f]{16}$/;
const labelPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface RandomSource {
  readonly label: StreamLabel;
  readonly drawCount: number;
  nextUint32(): number;
  nextBelow(bound: number): number;
  derive(label: StreamLabel): RandomSource;
  serialize(): RandomStreamState;
}

function assertSeed(seed: unknown): asserts seed is Seed {
  if (typeof seed !== 'string') {
    throw new TypeError('Seed must be a string.');
  }
  if (!seedPattern.test(seed)) {
    throw new RangeError('Seed must be 16 lowercase hexadecimal characters.');
  }
}

function assertLabel(label: unknown): asserts label is StreamLabel {
  if (typeof label !== 'string') {
    throw new TypeError('Stream label must be a string.');
  }
  if (!labelPattern.test(label)) {
    throw new RangeError('Stream label must be lowercase kebab-case.');
  }
}

function assertUint32(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${field} must be an integer.`);
  }
  if (value < 0 || value >= UINT32_RANGE) {
    throw new RangeError(`${field} must be an unsigned 32-bit integer.`);
  }
}

function assertDrawCount(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError('drawCount must be a safe integer.');
  }
  if (value < 0) {
    throw new RangeError('drawCount must not be negative.');
  }
}

function assertRandomState(state: RandomStreamState): RandomState {
  if (typeof state !== 'object' || state === null) {
    throw new TypeError('Random stream state must be an object.');
  }

  assertLabel(state.label);
  assertUint32(state.s0, 's0');
  assertUint32(state.s1, 's1');
  assertUint32(state.s2, 's2');
  assertUint32(state.s3, 's3');
  assertDrawCount(state.drawCount);

  if (state.s0 === 0 && state.s1 === 0 && state.s2 === 0 && state.s3 === 0) {
    throw new RangeError('Random stream state must not be all zero.');
  }

  return [state.s0, state.s1, state.s2, state.s3];
}

function createSource(
  label: StreamLabel,
  initialState: RandomState,
  initialDrawCount: number,
): RandomSource {
  let state = [...initialState] as RandomState;
  let drawCount = initialDrawCount;

  const nextUint32 = () => {
    const result = nextXoshiro128StarStar(state);
    state = result.state;
    drawCount += 1;
    return result.value;
  };

  return {
    get label() {
      return label;
    },
    get drawCount() {
      return drawCount;
    },
    nextUint32,
    nextBelow(bound: number) {
      if (typeof bound !== 'number' || !Number.isInteger(bound)) {
        throw new TypeError('Bound must be an integer.');
      }
      if (bound < 1 || bound > UINT32_RANGE) {
        throw new RangeError(`Bound must be in [1, ${UINT32_RANGE}].`);
      }

      const limit = Math.floor(UINT32_RANGE / bound) * bound;
      let value = 0;
      do {
        value = nextUint32();
      } while (value >= limit);
      return value % bound;
    },
    derive(childLabel: StreamLabel) {
      assertLabel(childLabel);
      return createSource(childLabel, deriveState(state, childLabel), 0);
    },
    serialize() {
      return {
        label,
        s0: state[0] ?? 0,
        s1: state[1] ?? 0,
        s2: state[2] ?? 0,
        s3: state[3] ?? 0,
        drawCount,
      };
    },
  };
}

export function createSeededRandom(
  seed: Seed,
  label: StreamLabel,
): RandomSource {
  assertSeed(seed);
  assertLabel(label);
  return createSource(label, deriveState(expandSeed(seed), label), 0);
}

export function restoreSeededRandom(state: RandomStreamState): RandomSource {
  const randomState = assertRandomState(state);
  return createSource(state.label, randomState, state.drawCount);
}
