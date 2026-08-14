import type {
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import {
  MAX_FRAME_DELTA_MS,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';
import type { SimulationKernel } from '../../../../packages/simulation/src/index.ts';

export interface SimulationHost {
  readonly tick: TickIndex;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  reset(nowMs: number): void;
}

export function createSimulationHost(
  kernel: SimulationKernel,
  startNowMs: number,
): SimulationHost {
  let lastNowMs = Number.isFinite(startNowMs) ? startNowMs : 0;
  let accumulatedMs = 0;

  const advanceAvailableTicks = (): readonly SimulationEvent[] => {
    const elapsedThisCall = Math.min(accumulatedMs, MAX_FRAME_DELTA_MS);
    const ticksToAdvance = Math.floor(elapsedThisCall / TICK_DURATION_MS);
    const events: SimulationEvent[] = [];

    for (let index = 0; index < ticksToAdvance; index += 1) {
      events.push(...kernel.advanceOne());
    }

    accumulatedMs -= ticksToAdvance * TICK_DURATION_MS;
    return events;
  };

  return {
    get tick() {
      return kernel.tick;
    },
    advanceTo(nowMs) {
      if (Number.isFinite(nowMs)) {
        const deltaMs = nowMs - lastNowMs;
        if (Number.isFinite(deltaMs) && deltaMs > 0) {
          accumulatedMs += deltaMs;
          lastNowMs = nowMs;
        } else if (deltaMs === 0) {
          lastNowMs = nowMs;
        }
      }

      return advanceAvailableTicks();
    },
    reset(nowMs) {
      accumulatedMs = 0;
      lastNowMs = Number.isFinite(nowMs) ? nowMs : 0;
    },
  };
}
