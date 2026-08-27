import { describe, expect, it } from 'vitest';

import {
  createAssetKey,
  type ResolvedAsset,
} from '../../../../packages/assets/src/index.ts';

import {
  actorFrame,
  actorFrameAtTick,
  animationPhase,
  stepAnimationPhase,
} from './ActorFrame';
import type { ActorMotionSegment } from './ActorMotion';

function animation(input: {
  readonly kind: string;
  readonly startFrame: number;
  readonly phases: number;
  readonly frameCount: number;
}): ResolvedAsset['animations'][number] {
  return {
    kind: input.kind,
    patternX: 4,
    patternY: 1,
    patternZ: 1,
    layers: 1,
    startFrame: input.startFrame,
    frameCount: input.frameCount,
    phaseDurationsMs: Array.from(
      { length: input.phases },
      () => [100, 100] as const,
    ),
  };
}

function asset(
  atlasFrameCount: number,
  animations: readonly ResolvedAsset['animations'][number][],
): ResolvedAsset {
  return {
    key: createAssetKey('outfit:tibia:test'),
    category: 'outfit',
    mediaUrl: 'blob:test',
    mediaSha256: 'a'.repeat(64),
    byteLength: 1,
    cellWidth: 32,
    cellHeight: 32,
    columns: atlasFrameCount,
    atlasFrameCount,
    animations,
    pivot: { x: 0.5, y: 1 },
    scale: 1,
    filtering: 'nearest',
  };
}

const movingAsset = asset(16, [
  animation({ kind: 'idle', startFrame: 0, phases: 1, frameCount: 4 }),
  animation({ kind: 'moving', startFrame: 4, phases: 3, frameCount: 12 }),
]);
const singleFrameAsset = asset(1, [
  animation({ kind: 'default', startFrame: 0, phases: 1, frameCount: 1 }),
]);

const stepMotion: ActorMotionSegment = {
  from: { x: 1, y: 1, z: 8 },
  to: { x: 2, y: 1, z: 8 },
  startTick: 0,
  durationTicks: 10,
};

function requireAnimation(
  source: ResolvedAsset,
  kind: string,
): ResolvedAsset['animations'][number] {
  const found = source.animations.find((candidate) => candidate.kind === kind);
  if (found === undefined) throw new Error(`${kind} fixture is missing`);
  return found;
}

describe('animationPhase', () => {
  it('advances one phase per declared duration', () => {
    const moving = requireAnimation(movingAsset, 'moving');

    expect(animationPhase(moving, 0)).toBe(0);
    expect(animationPhase(moving, 99)).toBe(0);
    expect(animationPhase(moving, 100)).toBe(1);
    expect(animationPhase(moving, 250)).toBe(2);
  });

  it('loops back to the first phase after the last one', () => {
    const moving = requireAnimation(movingAsset, 'moving');

    expect(animationPhase(moving, 300)).toBe(0);
    expect(animationPhase(moving, 450)).toBe(1);
    expect(animationPhase(moving, 3_050)).toBe(0);
  });
});

describe('stepAnimationPhase', () => {
  it('divides the step evenly between the declared phases', () => {
    const moving = requireAnimation(movingAsset, 'moving');

    expect(stepAnimationPhase(moving, 0)).toBe(0);
    expect(stepAnimationPhase(moving, 0.33)).toBe(0);
    expect(stepAnimationPhase(moving, 0.34)).toBe(1);
    expect(stepAnimationPhase(moving, 0.67)).toBe(2);
  });

  it('holds the last phase at the end of the step and never overruns', () => {
    const moving = requireAnimation(movingAsset, 'moving');

    expect(stepAnimationPhase(moving, 1)).toBe(2);
    expect(stepAnimationPhase(moving, 2)).toBe(2);
    expect(stepAnimationPhase(moving, -1)).toBe(0);
    expect(stepAnimationPhase(moving, Number.NaN)).toBe(0);
  });

  it('has a single phase to show when the animation declares one', () => {
    const single = requireAnimation(singleFrameAsset, 'default');

    expect(stepAnimationPhase(single, 0.9)).toBe(0);
  });
});

describe('ActorFrame', () => {
  it('picks the moving phase from elapsed milliseconds', () => {
    const moving = requireAnimation(movingAsset, 'moving');
    const stride = moving.patternX * moving.layers;

    expect(actorFrame(movingAsset, 'n', 0)).toBe(moving.startFrame);
    expect(actorFrame(movingAsset, 'n', 100)).toBe(moving.startFrame + stride);
    expect(actorFrame(movingAsset, 'n', 250)).toBe(
      moving.startFrame + 2 * stride,
    );
  });

  it('keeps cycling a creature without an idle animation while it stands still', () => {
    const idleless = asset(16, [
      animation({ kind: 'moving', startFrame: 0, phases: 3, frameCount: 12 }),
    ]);

    const stride = 4;

    expect(actorFrame(idleless, 'n', 0, false)).toBe(0);
    expect(actorFrame(idleless, 'n', 100, false)).toBe(stride);
    expect(actorFrame(idleless, 'n', 300, false)).toBe(0);
  });

  it('spreads the walk cycle across the step rather than the wall clock', () => {
    const moving = requireAnimation(movingAsset, 'moving');
    const stride = moving.patternX * moving.layers;
    const phaseAt = (renderTick: number) =>
      (actorFrameAtTick({
        asset: movingAsset,
        facing: 'n',
        motion: stepMotion,
        renderTick,
      }) -
        moving.startFrame) /
      stride;

    // Three phases over a ten-tick step: one phase every 3 1/3 ticks, so the
    // legs finish exactly one cycle in the time the feet cross one tile.
    expect(phaseAt(0)).toBe(0);
    expect(phaseAt(3)).toBe(0);
    expect(phaseAt(4)).toBe(1);
    expect(phaseAt(6)).toBe(1);
    expect(phaseAt(7)).toBe(2);
    expect(phaseAt(9)).toBe(2);
  });

  it('keeps the cycle inside the step when the step is slow', () => {
    const moving = requireAnimation(movingAsset, 'moving');
    const stride = moving.patternX * moving.layers;
    const slowStep: ActorMotionSegment = { ...stepMotion, durationTicks: 30 };
    const phaseAt = (renderTick: number) =>
      (actorFrameAtTick({
        asset: movingAsset,
        facing: 'n',
        motion: slowStep,
        renderTick,
      }) -
        moving.startFrame) /
      stride;

    // The asset declares 100 ms phases, which on the wall clock would run the
    // cycle five times over a 1500 ms step. Tied to the step it runs once.
    expect(phaseAt(0)).toBe(0);
    expect(phaseAt(9)).toBe(0);
    expect(phaseAt(10)).toBe(1);
    expect(phaseAt(20)).toBe(2);
    expect(phaseAt(29)).toBe(2);
  });

  it('holds the last walk phase across the tick the AI leaves between steps', () => {
    // The kernel queues a creature's next step for the tick *after* it comes
    // off cooldown, so consecutive `actor/moved` events are `cost + 1` ticks
    // apart. Dropping to the idle pose in that tick put a standing frame in
    // the middle of every tile a humanoid walked.
    const moving = requireAnimation(movingAsset, 'moving');
    const stride = moving.patternX * moving.layers;

    expect(
      actorFrameAtTick({
        asset: movingAsset,
        facing: 'n',
        motion: stepMotion,
        renderTick: 10,
      }),
    ).toBe(moving.startFrame + 2 * stride);
  });

  it('falls back to the idle set once the step has ended', () => {
    expect(
      actorFrameAtTick({
        asset: movingAsset,
        facing: 'n',
        motion: stepMotion,
        renderTick: 12,
      }),
    ).toBe(0);
  });

  it('orders the direction patterns north, east, south, west', () => {
    // Tibia's Direction enum is the patternX index, and it runs north, east,
    // south, west. Reading it as south-first shows the front sprite while the
    // actor walks away, which is what the moonwalk looked like.
    const moving = requireAnimation(movingAsset, 'moving');
    const stride = moving.layers;

    expect(actorFrame(movingAsset, 'n', 0)).toBe(moving.startFrame);
    expect(actorFrame(movingAsset, 'e', 0)).toBe(moving.startFrame + stride);
    expect(actorFrame(movingAsset, 's', 0)).toBe(
      moving.startFrame + 2 * stride,
    );
    expect(actorFrame(movingAsset, 'w', 0)).toBe(
      moving.startFrame + 3 * stride,
    );
  });

  it('folds the diagonals onto the east and west patterns', () => {
    const moving = requireAnimation(movingAsset, 'moving');
    const east = actorFrame(movingAsset, 'e', 0);
    const west = actorFrame(movingAsset, 'w', 0);

    expect(actorFrame(movingAsset, 'ne', 0)).toBe(east);
    expect(actorFrame(movingAsset, 'se', 0)).toBe(east);
    expect(actorFrame(movingAsset, 'nw', 0)).toBe(west);
    expect(actorFrame(movingAsset, 'sw', 0)).toBe(west);
    expect(west).toBe(moving.startFrame + 3 * moving.layers);
  });

  it('uses Tibia direction patterns and the moving phase', () => {
    const moving = movingAsset.animations.find(({ kind }) => kind === 'moving');
    if (moving === undefined) throw new Error('moving fixture is missing');

    expect(actorFrame(movingAsset, 'e', 0)).toBe(
      moving.startFrame + moving.layers,
    );
    expect(actorFrame(movingAsset, 'n', 100)).toBeGreaterThan(
      actorFrame(movingAsset, 'n', 0),
    );
  });

  it('uses idle when asked for a completed segment and supports static assets', () => {
    expect(actorFrame(movingAsset, 'n', 0, false)).toBe(0);
    expect(actorFrame(singleFrameAsset, 'w', 0.8)).toBe(0);
  });
});
