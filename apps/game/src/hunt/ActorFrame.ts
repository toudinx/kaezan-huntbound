import type { ResolvedAsset } from '../../../../packages/assets/src/index.ts';
import {
  type Direction,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';
import type { ActorMotionSegment } from './ActorMotion';

/**
 * The `patternX` column a facing reads from.
 *
 * Tibia stores the four facings in its own `Direction` order — north, east,
 * south, west — and a diagonal borrows the column of the side it leans to, so
 * a creature walking north-east keeps showing its east sprite. Reading the
 * column as south-first draws the actor's front while it walks away from the
 * camera, and its back while it walks towards it.
 */
function directionPattern(direction: Direction): number {
  switch (direction) {
    case 'n':
      return 0;
    case 'e':
    case 'ne':
    case 'se':
      return 1;
    case 's':
      return 2;
    case 'w':
    case 'nw':
    case 'sw':
      return 3;
  }
  return 0;
}

function animationFor(
  asset: ResolvedAsset,
  moving: boolean,
): ResolvedAsset['animations'][number] {
  const preferred = asset.animations.find(({ kind }) =>
    moving ? kind === 'moving' : kind === 'idle',
  );
  return (
    preferred ?? (asset.animations[0] as ResolvedAsset['animations'][number])
  );
}

/**
 * Which animation phase is showing after `elapsedMs`, using the durations the
 * asset itself declares. Each entry of `phaseDurationsMs` is a `[min, max]`
 * pair that Tibia randomises within; we always take `min` so the presentation
 * stays a pure function of the simulation clock.
 */
export function animationPhase(
  animation: ResolvedAsset['animations'][number],
  elapsedMs: number,
): number {
  const durations = animation.phaseDurationsMs;
  if (durations.length === 0) return 0;

  const cycleMs = durations.reduce(
    (total, phase) => total + Math.max(phase[0] ?? 0, 0),
    0,
  );
  if (cycleMs <= 0) return 0;

  const elapsed = Number.isFinite(elapsedMs) ? Math.max(elapsedMs, 0) : 0;
  let remaining = elapsed % cycleMs;

  for (let phase = 0; phase < durations.length; phase += 1) {
    const duration = durations[phase]?.[0] ?? 0;
    if (duration <= 0) continue;
    if (remaining < duration) return phase;
    remaining -= duration;
  }

  return durations.length - 1;
}

/**
 * The frame to show for an actor after `elapsedMs` of animation.
 *
 * The phase comes from the clock rather than from how far along the step the
 * actor is: a step lasts as long as the simulation says, while a phase lasts as
 * long as the asset says, and tying one to the other made the whole cycle play
 * inside a single step.
 */
export function actorFrame(
  asset: ResolvedAsset,
  facing: Direction,
  elapsedMs: number,
  moving = true,
): number {
  if (asset.atlasFrameCount <= 1) return 0;

  const animation = animationFor(asset, moving);
  const phase = animationPhase(animation, elapsedMs);
  const patternX = Math.max(animation.patternX, 1);
  const patternY = Math.max(animation.patternY, 1);
  const patternZ = Math.max(animation.patternZ, 1);
  const direction = Math.min(directionPattern(facing), patternX - 1);
  const frame =
    animation.startFrame +
    (((phase * patternZ + 0) * patternY + 0) * patternX + direction) *
      animation.layers;

  return Math.min(Math.max(frame, 0), asset.atlasFrameCount - 1);
}

/**
 * The frame an actor shows at a render tick, given the step it is walking.
 *
 * The animation clock runs off the simulation tick rather than wall time so the
 * presentation stays reproducible, and it keeps running once the step is over:
 * a creature that declares no idle set carries on cycling its moving set, which
 * is what standing creatures do in Tibia.
 */
export function actorFrameAtTick(input: {
  readonly asset: ResolvedAsset;
  readonly facing: Direction;
  readonly motion: ActorMotionSegment | undefined;
  readonly renderTick: number;
}): number {
  const motion = input.motion;
  const moving =
    motion !== undefined &&
    input.renderTick < motion.startTick + motion.durationTicks;

  return actorFrame(
    input.asset,
    input.facing,
    input.renderTick * TICK_DURATION_MS,
    moving,
  );
}
