import { describe, expect, it } from 'vitest';

import type {
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import type { SimulationKernel } from '../../../../packages/simulation/src/index.ts';

import { createSimulationHost } from './SimulationHost';

interface KernelStub {
  readonly calls: number[];
  readonly kernel: SimulationKernel;
}

function createKernelStub(): KernelStub {
  let tick = 0 as TickIndex;
  const calls: number[] = [];
  const kernel = {
    get tick() {
      return tick;
    },
    advanceOne(): readonly SimulationEvent[] {
      calls.push(tick);
      tick = (tick + 1) as TickIndex;
      return [];
    },
  } as unknown as SimulationKernel;

  return { calls, kernel };
}

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

    host.advanceTo(149);
    expect(host.tick).toBe(2);

    host.advanceTo(150);
    expect(host.tick).toBe(3);
  });

  it('limits work per call without discarding accumulated time', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.advanceTo(600);
    expect(host.tick).toBe(5);

    host.advanceTo(600);
    expect(host.tick).toBe(10);

    host.advanceTo(600);
    expect(host.tick).toBe(12);
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

  it('resets accumulated time without changing the kernel', () => {
    const { kernel } = createKernelStub();
    const host = createSimulationHost(kernel, 0);

    host.advanceTo(600);
    expect(host.tick).toBe(5);

    host.reset(600);
    expect(host.tick).toBe(5);

    host.advanceTo(600);
    expect(host.tick).toBe(5);
    host.advanceTo(650);
    expect(host.tick).toBe(6);
  });

  it('matches one equivalent elapsed interval across fractional calls', () => {
    const split = createKernelStub();
    const splitHost = createSimulationHost(split.kernel, 0);
    splitHost.advanceTo(60);
    splitHost.advanceTo(120);
    splitHost.advanceTo(180);

    const single = createKernelStub();
    const singleHost = createSimulationHost(single.kernel, 0);
    singleHost.advanceTo(180);

    expect(splitHost.tick).toBe(singleHost.tick);
    expect(split.calls).toEqual(single.calls);
  });
});
