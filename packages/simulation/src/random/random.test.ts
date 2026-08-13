import type {
  RandomStreamState,
  Seed,
  StreamLabel,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  createKernelRandomStreams,
  createSeededRandom,
  restoreKernelRandomStreams,
  restoreSeededRandom,
} from './index.ts';

const seed = '0f1e2d3c4b5a6978' as Seed;
const otherSeed = '0f1e2d3c4b5a6979' as Seed;
const movement = 'movement' as StreamLabel;
const ai = 'ai' as StreamLabel;
const scenario = 'scenario' as StreamLabel;
const UINT32_RANGE = 0x1_0000_0000;

function drawMany(
  source: ReturnType<typeof createSeededRandom>,
  count: number,
) {
  return Array.from({ length: count }, () => source.nextUint32());
}

describe('deterministic random source', () => {
  it('repeats the same uint32 sequence for the same seed and label', () => {
    const left = createSeededRandom(seed, movement);
    const right = createSeededRandom(seed, movement);

    const leftValues = drawMany(left, 32);
    const rightValues = drawMany(right, 32);

    expect(leftValues).toEqual(rightValues);
    expect(leftValues.every((value) => Number.isInteger(value))).toBe(true);
    expect(
      leftValues.every((value) => value >= 0 && value < UINT32_RANGE),
    ).toBe(true);
    expect(left.drawCount).toBe(32);
    expect(right.drawCount).toBe(32);
  });

  it('diverges quickly for different seeds', () => {
    const left = drawMany(createSeededRandom(seed, movement), 32);
    const right = drawMany(createSeededRandom(otherSeed, movement), 32);
    const equalPositions = left.filter(
      (value, index) => value === right[index],
    );

    expect(equalPositions.length).toBeLessThan(10);
  });

  it('continues exactly after restoring serialized state', () => {
    const source = createSeededRandom(seed, movement);
    drawMany(source, 11);
    const saved = source.serialize();
    const restored = restoreSeededRandom(saved);

    expect(restored.serialize()).toEqual(saved);
    expect(drawMany(source, 24)).toEqual(drawMany(restored, 24));
    expect(restored.drawCount).toBe(source.drawCount);
  });

  it('derives isolated streams without consuming the parent', () => {
    const parent = createSeededRandom(seed, scenario);
    const before = parent.serialize();
    const movementA = parent.derive(movement);
    const movementB = parent.derive(movement);
    const aiA = parent.derive(ai);
    const aiB = parent.derive(ai);

    expect(parent.serialize()).toEqual(before);
    expect(movementA.serialize()).toEqual(movementB.serialize());
    expect(aiA.serialize()).toEqual(aiB.serialize());
    expect(movementA.serialize()).not.toEqual(aiA.serialize());
    expect(drawMany(movementA, 16)).toEqual(drawMany(movementB, 16));
    expect(drawMany(aiA, 16)).toEqual(drawMany(aiB, 16));
    expect(parent.drawCount).toBe(0);
  });

  it('does not let one derived stream shift another stream or the parent', () => {
    const parent = createSeededRandom(seed, scenario);
    const firstMovement = parent.derive(movement);
    const firstAi = parent.derive(ai);
    const secondMovement = parent.derive(movement);
    const secondAi = parent.derive(ai);

    drawMany(firstMovement, 37);
    drawMany(secondMovement, 37);

    expect(drawMany(firstAi, 19)).toEqual(drawMany(secondAi, 19));
    expect(drawMany(firstMovement, 19)).toEqual(drawMany(secondMovement, 19));

    const freshParent = createSeededRandom(seed, scenario);
    expect(drawMany(parent, 12)).toEqual(drawMany(freshParent, 12));
  });

  it('returns zero for nextBelow(1)', () => {
    const source = createSeededRandom(seed, movement);

    for (let index = 0; index < 32; index += 1) {
      expect(source.nextBelow(1)).toBe(0);
    }
    expect(source.drawCount).toBe(32);
  });

  it('rejects invalid nextBelow bounds', () => {
    const source = createSeededRandom(seed, movement);

    for (const bound of [
      0,
      -1,
      1.5,
      UINT32_RANGE + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => source.nextBelow(bound)).toThrow();
    }
  });

  it('samples every face with a bounded non-power-of-two range', () => {
    const source = createSeededRandom(seed, movement);
    const counts = [0, 0, 0, 0, 0, 0];

    for (let index = 0; index < 60_000; index += 1) {
      const value = source.nextBelow(6);
      counts[value] = (counts[value] ?? 0) + 1;
    }

    expect(counts.every((count) => count > 0)).toBe(true);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThan(600);
  });

  it('counts rejected uint32 values in nextBelow', () => {
    const state: RandomStreamState = {
      label: movement,
      s0: 1,
      s1: 0xd80b60b6,
      s2: 2,
      s3: 3,
      drawCount: 0,
    };
    const source = restoreSeededRandom(state);

    source.nextBelow(6);

    expect(source.drawCount).toBe(2);
  });
});

describe('kernel random streams', () => {
  it('creates and restores the three streams in canonical label order', () => {
    const streams = createKernelRandomStreams(seed);

    expect(streams.serialize().map((state) => state.label)).toEqual([
      ai,
      movement,
      scenario,
    ]);
    streams.movement.nextUint32();
    streams.scenario.nextBelow(6);
    const saved = streams.serialize();
    const restored = restoreKernelRandomStreams(saved);

    expect(restored.serialize()).toEqual(saved);
    expect(restored.ai.drawCount).toBe(0);
    expect(restored.movement.drawCount).toBe(1);
    expect(restored.scenario.drawCount).toBe(1);
  });

  it('rejects missing, extra, and duplicate stream labels', () => {
    const states = createKernelRandomStreams(seed).serialize();
    const first = states[0];
    const second = states[1];
    const third = states[2];

    if (first === undefined || second === undefined || third === undefined) {
      throw new Error('Expected three kernel random stream states.');
    }
    expect(() => restoreKernelRandomStreams(states.slice(1))).toThrow();
    expect(() =>
      restoreKernelRandomStreams([
        ...states,
        { ...first, label: 'extra' as StreamLabel },
      ]),
    ).toThrow();
    expect(() =>
      restoreKernelRandomStreams([
        first,
        { ...second, label: first.label },
        third,
      ]),
    ).toThrow();
  });

  it('freezes golden vectors for the kernel streams', () => {
    const expected: Record<string, readonly number[]> = {
      ai: [
        0xf1d5ad77, 0xce8a401b, 0x9ead377c, 0xedd33fe5, 0x327526b4, 0x2f753712,
        0x826067ea, 0x387f9b0a,
      ],
      movement: [
        0x9046423d, 0xfcd233cd, 0x207a837d, 0xa83cf41a, 0x1adb5830, 0x2241cdbd,
        0xedbec034, 0x3471c9d1,
      ],
      scenario: [
        0xfc89a05c, 0x535ac971, 0x733b1b1a, 0x27af86d8, 0x0fcb29a6, 0x971986f7,
        0xab6025df, 0x6f306771,
      ],
    };
    const streams = createKernelRandomStreams(seed);

    for (const [label, source] of [
      [ai, streams.ai],
      [movement, streams.movement],
      [scenario, streams.scenario],
    ] as const) {
      expect(drawMany(source, 8)).toEqual(expected[label]);
    }
  });
});
