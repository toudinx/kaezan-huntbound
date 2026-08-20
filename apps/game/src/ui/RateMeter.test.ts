import { describe, expect, it } from 'vitest';

import { createRateMeter } from './RateMeter';

describe('createRateMeter', () => {
  it('has no reading before it has two samples', () => {
    const meter = createRateMeter();

    expect(meter.rate(0)).toBeUndefined();
    meter.mark(0);
    expect(meter.rate(0)).toBeUndefined();
  });

  it('measures a steady 60 per second', () => {
    const meter = createRateMeter();

    for (let i = 0; i <= 60; i += 1) {
      meter.mark(i * (1000 / 60));
    }

    expect(meter.rate(1000)).toBeCloseTo(60, 0);
  });

  it('measures a steady 20 per second', () => {
    const meter = createRateMeter();

    for (let i = 0; i <= 20; i += 1) {
      meter.mark(i * 50);
    }

    expect(meter.rate(1000)).toBeCloseTo(20, 0);
  });

  it('forgets samples older than its window', () => {
    const meter = createRateMeter(1000);

    for (let i = 0; i <= 10; i += 1) {
      meter.mark(i * 10);
    }
    for (let i = 0; i <= 20; i += 1) {
      meter.mark(5000 + i * 50);
    }

    expect(meter.rate(6000)).toBeCloseTo(20, 0);
  });

  it('drops to no reading once the samples fall out of the window', () => {
    const meter = createRateMeter(1000);

    meter.mark(0);
    meter.mark(16);

    expect(meter.rate(20)).toBeDefined();
    expect(meter.rate(5000)).toBeUndefined();
  });

  it('rejects a window that is not positive finite', () => {
    expect(() => createRateMeter(0)).toThrow(/windowMs/);
    expect(() => createRateMeter(Number.NaN)).toThrow(/windowMs/);
  });

  it('ignores a sample that is not finite', () => {
    const meter = createRateMeter();

    meter.mark(0);
    meter.mark(Number.NaN);
    meter.mark(1000 / 60);

    expect(meter.rate(1000 / 60)).toBeCloseTo(60, 0);
  });
});
