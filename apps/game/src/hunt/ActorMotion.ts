import type {
  GridPosition,
  SimulationEventPayload,
} from '../../../../packages/contracts/src/index.ts';
import { stepCostTicks } from '../../../../packages/simulation/src/index.ts';

export interface ActorMotionSegment {
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly startTick: number;
  readonly durationTicks: number;
}

type MovedEvent = Extract<SimulationEventPayload, { type: 'actor/moved' }>;

export function createActorMotion(input: {
  readonly event: MovedEvent;
  readonly eventTick: number;
  readonly baseStepTicks: number;
}): ActorMotionSegment {
  const durationTicks = Math.max(
    1,
    stepCostTicks(input.baseStepTicks, input.event.facing),
  );
  return {
    from: { ...input.event.from },
    to: { ...input.event.to },
    startTick: input.eventTick,
    durationTicks,
  };
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

export function sampleActorMotion(
  motion: ActorMotionSegment,
  renderTick: number,
): GridPosition {
  const progress = clamp01(
    (renderTick - motion.startTick) / motion.durationTicks,
  );
  return {
    x: motion.from.x + (motion.to.x - motion.from.x) * progress,
    y: motion.from.y + (motion.to.y - motion.from.y) * progress,
    z: motion.from.z + (motion.to.z - motion.from.z) * progress,
  };
}

export function renderTick(tick: number, alpha: number): number {
  return Math.max(0, tick - 1 + clamp01(alpha));
}

/**
 * The presentation clock, which never runs backwards.
 *
 * Events are published from inside the fixed-step loop, after `tick` has
 * advanced but before `alpha` has been recomputed for the new tick, so that
 * read lands near the end of the tick. The frame that follows reads the fresh
 * alpha and would rewind the clock by almost a whole tick — every tick. A
 * rewound clock replays the animation phase and, since depth follows the tile
 * the actor is mostly standing on, flips his z-order back and forth: both of
 * those read on screen as flicker.
 */
export function advanceRenderTick(
  previous: number,
  tick: number,
  alpha: number,
): number {
  return Math.max(previous, renderTick(tick, alpha));
}
