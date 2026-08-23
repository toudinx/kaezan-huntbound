import { describe, expect, it } from 'vitest';

import type {
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import {
  MAX_FRAME_DELTA_MS,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';
import type { SimulationKernel } from '../../../../packages/simulation/src/index.ts';

import { createSimulationHost } from './SimulationHost';

interface KernelStub {
  readonly calls: number[];
  readonly kernel: SimulationKernel;
}

function createKernelStub(events: readonly SimulationEvent[] = []): KernelStub {
  let tick = 0 as TickIndex;
  const calls: number[] = [];
  const kernel = {
    get tick() {
      return tick;
    },
    advanceOne(): readonly SimulationEvent[] {
      calls.push(tick);
      tick = (tick + 1) as TickIndex;
      return events;
    },
  } as unknown as SimulationKernel;

  return { calls, kernel };
}

/** The most ticks one frame is allowed to buy. */
const CATCH_UP_TICKS = Math.floor(MAX_FRAME_DELTA_MS / TICK_DURATION_MS);

describe('createSimulationHost', () => {
  it('advances only after a complete fixed tick', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.advanceTo(49);
    expect(host.tick).toBe(0);

    host.advanceTo(50);
    expect(host.tick).toBe(1);
  });

  it('keeps fractional time between frames', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.advanceTo(99);
    expect(host.tick).toBe(1);
    expect(host.alpha).toBeCloseTo(0.98);

    host.advanceTo(100);
    expect(host.tick).toBe(2);
    expect(host.alpha).toBe(0);
  });

  it('drops the time it could not consume instead of carrying it as debt', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    // A 600 ms frame is worth twelve ticks and the catch-up budget pays for
    // only a few. Keeping the rest made the accumulator a debt the next frames
    // had to work off, which is the spiral of death.
    host.advanceTo(600);

    expect(host.tick).toBe(CATCH_UP_TICKS);
    expect(host.alpha).toBe(0);
  });

  it('never latches alpha at one while frames stay slower than the budget', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    // Frames slower than the catch-up budget used to pin alpha at 1 forever, so
    // interpolation died and every actor hopped a fixed fraction of a tile per
    // frame instead of gliding.
    let now = 0;
    for (let frame = 0; frame < 12; frame += 1) {
      now += 300;
      host.advanceTo(now);
      expect(host.alpha).toBeLessThan(1);
    }
  });

  it('caps how far the kernel can jump in a single frame', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    // Ten seconds away from the window must not buy two hundred ticks of
    // catch-up in one frame: the player would teleport across the map.
    host.advanceTo(10_000);

    expect(host.tick).toBe(CATCH_UP_TICKS);
  });

  it('drops the gap a paused window opened, instead of banking it', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.advanceTo(100);
    expect(host.tick).toBe(2);

    // The window lost focus here and the loop slept for thirty seconds. Phaser
    // rebases its own clock on focus, so the first frame back reports the whole
    // away-duration as one delta. Banking it spent the entire catch-up budget
    // on a hunt that was supposed to be paused.
    host.resyncClock();
    host.advanceTo(30_100);

    expect(host.tick).toBe(2);
    expect(host.alpha).toBe(0);

    host.advanceTo(30_150);
    expect(host.tick).toBe(3);
  });

  it('keeps running normally when no resync was requested', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.resyncClock();
    host.advanceTo(50);
    expect(host.tick).toBe(0);

    host.advanceTo(100);
    expect(host.tick).toBe(1);
  });

  it('forwards events emitted by each consumed kernel tick', () => {
    const event = { marker: 'tick-event' } as unknown as SimulationEvent;
    const { kernel } = createKernelStub([event]);
    const host = createSimulationHost(kernel, 0);

    expect(host.advanceTo(50)).toEqual([event]);
  });

  it('treats backward and non-finite timestamps as zero delta', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 100);

    host.advanceTo(50);
    host.advanceTo(Number.NaN);
    host.advanceTo(Number.POSITIVE_INFINITY);
    expect(host.tick).toBe(0);

    host.advanceTo(150);
    expect(host.tick).toBe(1);
  });

  it('treats a finite timestamp subtraction overflow as zero delta', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, -Number.MAX_VALUE);

    host.advanceTo(Number.MAX_VALUE);

    expect(host.tick).toBe(0);
  });

  it('resets accumulated time without changing the kernel', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.advanceTo(600);
    expect(host.tick).toBe(CATCH_UP_TICKS);

    host.reset(600);
    expect(host.tick).toBe(CATCH_UP_TICKS);

    host.advanceTo(600);
    expect(host.tick).toBe(CATCH_UP_TICKS);
    host.advanceTo(650);
    expect(host.tick).toBe(CATCH_UP_TICKS + 1);
  });

  it('matches equivalent elapsed intervals while no frame exceeds the budget', () => {
    const fine = createKernelStub();
    const fineHost = createSimulationHost(fine.kernel, 0);
    for (const now of [50, 100, 150, 200]) fineHost.advanceTo(now);

    const coarse = createKernelStub();
    const coarseHost = createSimulationHost(coarse.kernel, 0);
    for (const now of [100, 200]) coarseHost.advanceTo(now);

    expect(fineHost.tick).toBe(coarseHost.tick);
    expect(fine.calls).toEqual(coarse.calls);
  });

  it('deliberately loses simulated time to a frame that exceeds the budget', () => {
    // This is the trade the catch-up ceiling buys, stated rather than implied:
    // wall time and simulated time stop agreeing across a stall. A hunt that
    // hitches runs a little behind the clock, and in exchange it never stops
    // interpolating. Nothing here is networked or scored against wall time, so
    // the drift costs nothing a player can observe.
    const smooth = createKernelStub();
    const smoothHost = createSimulationHost(smooth.kernel, 0);
    for (const now of [100, 200, 300, 400, 500, 600]) smoothHost.advanceTo(now);

    const stalled = createKernelStub();
    const stalledHost = createSimulationHost(stalled.kernel, 0);
    stalledHost.advanceTo(600);

    expect(smoothHost.tick).toBe(12);
    expect(stalledHost.tick).toBe(CATCH_UP_TICKS);
    expect(stalledHost.tick).toBeLessThan(smoothHost.tick);
  });
});
