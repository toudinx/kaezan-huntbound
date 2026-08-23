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
  readonly alpha: number;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  /**
   * Forgets the gap before the next frame, without touching the kernel.
   *
   * The presentation sleeps the loop when the window loses focus, and Phaser
   * rebases its own clock when focus returns, so the first frame back reports
   * the entire away-duration as a single delta. Banking that spends the whole
   * catch-up budget replaying a hunt that was supposed to be paused.
   */
  resyncClock(): void;
  reset(nowMs: number): void;
}

export function createSimulationHost(
  kernel: SimulationKernel,
  startNowMs: number,
): SimulationHost {
  let lastNowMs = Number.isFinite(startNowMs) ? startNowMs : 0;
  let accumulatedMs = 0;
  let rebaseNextAdvance = false;

  const advanceAvailableTicks = (): readonly SimulationEvent[] => {
    // Time the catch-up budget cannot pay for is dropped, not carried.
    //
    // Clamping only the amount *read* left the excess sitting in the
    // accumulator as debt, and that debt is what the player saw. It drains at
    // most MAX_FRAME_DELTA_MS per frame, so any frame slower than that made it
    // grow without bound; while it is above one tick `alpha` is pinned at 1,
    // which kills interpolation outright, and the kernel spends the whole
    // budget every frame. Against a ten-tick step that is a fixed fraction of
    // a tile per frame: the actor stops walking and starts hopping, and keeps
    // hopping long after the stall that caused it is over. Resuming from a
    // blurred window fed the whole away-duration in as debt and reproduced it
    // every time.
    //
    // Dropping the excess costs simulated time during a stall, which for a
    // local single-player hunt is invisible, and buys back a presentation
    // clock that always interpolates.
    accumulatedMs = Math.min(accumulatedMs, MAX_FRAME_DELTA_MS);

    const ticksToAdvance = Math.floor(accumulatedMs / TICK_DURATION_MS);
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
    get alpha() {
      return Math.max(0, Math.min(accumulatedMs / TICK_DURATION_MS, 1));
    },
    advanceTo(nowMs) {
      if (rebaseNextAdvance && Number.isFinite(nowMs)) {
        rebaseNextAdvance = false;
        lastNowMs = nowMs;
        return advanceAvailableTicks();
      }

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
    resyncClock() {
      rebaseNextAdvance = true;
    },
    reset(nowMs) {
      rebaseNextAdvance = false;
      accumulatedMs = 0;
      lastNowMs = Number.isFinite(nowMs) ? nowMs : 0;
    },
  };
}
