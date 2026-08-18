import { describe, expect, it } from 'vitest';

import type { AssetAnimationGroup } from '../../../../packages/assets/src/index.ts';

import { effectFrame } from './EffectAnimation';

function group(
  input: Partial<AssetAnimationGroup> & {
    readonly frameCount: number;
  },
): AssetAnimationGroup {
  return {
    kind: 'default',
    patternX: 1,
    patternY: 1,
    patternZ: 1,
    layers: 1,
    startFrame: 0,
    phaseDurationsMs: [],
    ...input,
  };
}

describe('effectFrame', () => {
  it('returns 0 for any elapsed time when frameCount is 1', () => {
    const animation = group({
      frameCount: 1,
      startFrame: 4,
      phaseDurationsMs: [[100, 140]],
    });

    expect(effectFrame(animation, Number.NEGATIVE_INFINITY)).toBe(0);
    expect(effectFrame(animation, -50)).toBe(0);
    expect(effectFrame(animation, 0)).toBe(0);
    expect(effectFrame(animation, 1_000)).toBe(0);
  });

  it('advances one frame per uniform phase and never leaves the declared range', () => {
    const animation = group({
      frameCount: 4,
      phaseDurationsMs: [
        [100, 100],
        [100, 100],
        [100, 100],
        [100, 100],
      ],
    });
    const last = animation.startFrame + animation.frameCount - 1;

    expect(effectFrame(animation, 0)).toBe(0);
    expect(effectFrame(animation, 99)).toBe(0);
    expect(effectFrame(animation, 100)).toBe(1);
    expect(effectFrame(animation, 199)).toBe(1);
    expect(effectFrame(animation, 200)).toBe(2);
    expect(effectFrame(animation, 300)).toBe(3);
    expect(effectFrame(animation, 10_000)).toBe(last);
    expect(effectFrame(animation, 10_000)).toBeLessThanOrEqual(last);
  });

  it('uses each phase duration instead of averaging them', () => {
    const animation = group({
      frameCount: 3,
      phaseDurationsMs: [
        [50, 50],
        [150, 150],
        [100, 100],
      ],
    });

    expect(effectFrame(animation, 49)).toBe(0);
    expect(effectFrame(animation, 50)).toBe(1);
    expect(effectFrame(animation, 199)).toBe(1);
    expect(effectFrame(animation, 200)).toBe(2);
  });

  it('stays on the first frame when elapsed time is before createdAtMs', () => {
    const animation = group({
      frameCount: 3,
      startFrame: 2,
      phaseDurationsMs: [
        [100, 100],
        [100, 100],
        [100, 100],
      ],
    });

    expect(effectFrame(animation, -1)).toBe(2);
    expect(effectFrame(animation, Number.NaN)).toBe(2);
  });

  it('holds the last frame after the phases end instead of looping', () => {
    const animation = group({
      frameCount: 3,
      phaseDurationsMs: [
        [100, 100],
        [100, 100],
        [100, 100],
      ],
    });

    expect(effectFrame(animation, 300)).toBe(2);
    expect(effectFrame(animation, 600)).toBe(2);
    expect(effectFrame(animation, 300)).not.toBe(0);
  });

  it('offsets the index by startFrame', () => {
    const animation = group({
      startFrame: 5,
      frameCount: 3,
      phaseDurationsMs: [
        [100, 100],
        [100, 100],
        [100, 100],
      ],
    });

    expect(effectFrame(animation, 0)).toBe(5);
    expect(effectFrame(animation, 100)).toBe(6);
    expect(effectFrame(animation, 250)).toBe(7);
    expect(effectFrame(animation, 10_000)).toBe(7);
  });

  it('stays on the first frame when phaseDurationsMs is empty', () => {
    const animation = group({
      startFrame: 3,
      frameCount: 6,
      phaseDurationsMs: [],
    });

    expect(effectFrame(animation, 0)).toBe(3);
    expect(effectFrame(animation, 500)).toBe(3);
    expect(Number.isNaN(effectFrame(animation, 500))).toBe(false);
  });

  it('never reaches extra frames when frameCount outruns the declared phases', () => {
    const animation = group({
      startFrame: 1,
      frameCount: 6,
      phaseDurationsMs: [
        [100, 100],
        [100, 100],
        [100, 100],
      ],
    });
    const lastDeclared = animation.startFrame + 2;
    const lastPossible = animation.startFrame + animation.frameCount - 1;

    expect(effectFrame(animation, 0)).toBe(1);
    expect(effectFrame(animation, 100)).toBe(2);
    expect(effectFrame(animation, 200)).toBe(3);
    expect(effectFrame(animation, 10_000)).toBe(lastDeclared);
    expect(effectFrame(animation, 10_000)).toBeLessThan(lastPossible);
    expect(Number.isNaN(effectFrame(animation, 10_000))).toBe(false);
  });

  it('reduces each [min, max] phase pair to min so the clock stays deterministic', () => {
    const animation = group({
      frameCount: 2,
      phaseDurationsMs: [
        [80, 200],
        [80, 200],
      ],
    });

    expect(effectFrame(animation, 79)).toBe(0);
    expect(effectFrame(animation, 80)).toBe(1);
    expect(effectFrame(animation, 140)).toBe(1);
  });
});
