import { describe, expect, it } from 'vitest';

import type {
  Direction,
  EntityId,
  GridPosition,
  SimulationEventPayload,
} from '../../../../packages/contracts/src/index.ts';

import {
  advanceRenderTick,
  createActorMotion,
  renderTick,
  sampleActorMotion,
} from './ActorMotion';

const moved = (
  from: GridPosition,
  to: GridPosition,
  facing: Direction,
): Extract<SimulationEventPayload, { type: 'actor/moved' }> => ({
  type: 'actor/moved',
  entityId: 1 as EntityId,
  from,
  to,
  facing,
});

describe('ActorMotion', () => {
  it('uses the full logical step duration', () => {
    const motion = createActorMotion({
      event: moved({ x: 0, y: 0, z: 8 }, { x: 1, y: 0, z: 8 }, 'e'),
      eventTick: 12,
      baseStepTicks: 2,
    });

    expect(sampleActorMotion(motion, 12)).toEqual({ x: 0, y: 0, z: 8 });
    expect(sampleActorMotion(motion, 13)).toEqual({ x: 0.5, y: 0, z: 8 });
    expect(sampleActorMotion(motion, 14)).toEqual({ x: 1, y: 0, z: 8 });
  });

  it('uses three ticks for a diagonal when baseStepTicks is two', () => {
    expect(
      createActorMotion({
        event: moved({ x: 0, y: 0, z: 8 }, { x: 1, y: 1, z: 8 }, 'se'),
        eventTick: 20,
        baseStepTicks: 2,
      }).durationTicks,
    ).toBe(3);
  });

  it('clamps render samples to the segment endpoints', () => {
    const motion = createActorMotion({
      event: moved({ x: 1, y: 2, z: 8 }, { x: 3, y: 4, z: 8 }, 'se'),
      eventTick: 10,
      baseStepTicks: 2,
    });

    expect(sampleActorMotion(motion, 0)).toEqual({ x: 1, y: 2, z: 8 });
    expect(sampleActorMotion(motion, 100)).toEqual({ x: 3, y: 4, z: 8 });
    expect(renderTick(12, 0.25)).toBe(11.25);
  });
});

describe('advanceRenderTick', () => {
  it('never lets the presentation clock run backwards', () => {
    // Events are published from inside the fixed-step loop: `tick` has already
    // advanced but `alpha` still holds the previous frame's fraction, so the
    // pair reads ahead. The frame that follows reads the fresh alpha and would
    // rewind the clock by almost a whole tick, replaying the animation and
    // flipping the actor's z-order back and forth.
    const duringStep = advanceRenderTick(0, 10, 0.9);
    const afterStep = advanceRenderTick(duringStep, 10, 0);

    expect(duringStep).toBeCloseTo(9.9);
    expect(afterStep).toBe(duringStep);
  });

  it('advances with the tick fraction', () => {
    expect(advanceRenderTick(9.9, 10, 0.95)).toBeCloseTo(9.95);
    expect(advanceRenderTick(9.95, 11, 0.1)).toBeCloseTo(10.1);
  });
});
