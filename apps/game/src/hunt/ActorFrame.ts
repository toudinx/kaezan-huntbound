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
 * Which phase a walking figure shows, spread across the step it is taking.
 *
 * A walk cycle belongs to the step, not to the wall clock. Tibia divides the
 * step duration by the number of walk phases and advances a phase per slice,
 * so the feet stay planted whatever the creature's speed; reading the phase
 * off the clock instead leaves the two running at unrelated rates. The knight
 * declares eight 300 ms phases, a 2400 ms cycle, against a 500 ms step: on the
 * clock his legs needed almost five tiles to finish one cycle and he slid over
 * the ground the whole way.
 */
export function stepAnimationPhase(
  animation: ResolvedAsset['animations'][number],
  progress: number,
): number {
  const count = animation.phaseDurationsMs.length;
  if (count <= 1) return 0;

  const clamped = Number.isFinite(progress)
    ? Math.min(Math.max(progress, 0), 1)
    : 0;
  return Math.min(Math.floor(clamped * count), count - 1);
}

function frameFor(
  asset: ResolvedAsset,
  animation: ResolvedAsset['animations'][number],
  facing: Direction,
  phase: number,
): number {
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
 * The frame to show for an actor after `elapsedMs` of animation.
 *
 * This is the clock-driven reading, which is what a figure standing still
 * wants: an idle set cycles on its own declared durations, and so does a
 * creature that declares no idle set at all. A figure mid-step is driven by
 * `stepAnimationPhase` instead.
 */
export function actorFrame(
  asset: ResolvedAsset,
  facing: Direction,
  elapsedMs: number,
  moving = true,
): number {
  if (asset.atlasFrameCount <= 1) return 0;

  const animation = animationFor(asset, moving);
  return frameFor(
    asset,
    animation,
    facing,
    animationPhase(animation, elapsedMs),
  );
}

/**
 * How long a figure keeps its walking pose after the step it is taking ends.
 *
 * A creature's steps are not back to back. The AI only decides once the actor
 * is off cooldown, and it queues the intent for the *next* tick, so two
 * `actor/moved` events sit `cost + 1` ticks apart while the step between them
 * animates over `cost`. The PB-04 golden shows it exactly: every rotworm gap
 * is 21 or 31 against step costs of 20 and 30, while the player, who moves
 * from held input rather than from the AI, gaps at a clean 20.
 *
 * That leftover tick used to draw the idle pose. The rotworm declares no idle
 * set, so nothing showed and nobody noticed; a humanoid outfit declares one,
 * and it punched a rigid standing frame into every tile of the march. Holding
 * the last walk phase across the gap costs 50 ms of settle when the figure
 * really does stop, which is below what the eye picks up.
 */
const WALK_SETTLE_TICKS = 1;

/**
 * The frame an actor shows at a render tick, given the step it is walking.
 *
 * Mid-step the phase comes from how far along the step the actor is, so one
 * walk cycle covers exactly one tile. Standing still it comes from the
 * simulation tick rather than wall time, so the presentation stays
 * reproducible, and it keeps running once the step is over: a creature that
 * declares no idle set carries on cycling its moving set, which is what
 * standing creatures do in Tibia.
 */
export function actorFrameAtTick(input: {
  readonly asset: ResolvedAsset;
  readonly facing: Direction;
  readonly motion: ActorMotionSegment | undefined;
  readonly renderTick: number;
}): number {
  if (input.asset.atlasFrameCount <= 1) return 0;

  const motion = input.motion;
  const moving =
    motion !== undefined &&
    input.renderTick <
      motion.startTick + motion.durationTicks + WALK_SETTLE_TICKS;
  const animation = animationFor(input.asset, moving);
  const phase = moving
    ? stepAnimationPhase(
        animation,
        (input.renderTick - motion.startTick) / motion.durationTicks,
      )
    : animationPhase(animation, input.renderTick * TICK_DURATION_MS);

  return frameFor(input.asset, animation, input.facing, phase);
}
