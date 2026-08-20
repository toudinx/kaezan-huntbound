export interface RateMeter {
  /** Records that the thing being counted happened at `nowMs`. */
  mark(nowMs: number): void;
  /**
   * Events per second over the retained window, or `undefined` while there is
   * not enough history to divide by.
   */
  rate(nowMs: number): number | undefined;
}

/**
 * Counts how often something happens, over a sliding window.
 *
 * The clock is passed in rather than read, so the meter stays pure and the
 * tests can step time by hand. Two of these separate the game's two clocks: the
 * renderer runs on `requestAnimationFrame`, the simulation on a fixed
 * `TICK_DURATION_MS` step, and only reading them apart says which one is late.
 */
export function createRateMeter(windowMs = 1000): RateMeter {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be positive finite');
  }

  let samples: number[] = [];

  const forget = (nowMs: number): void => {
    const oldest = nowMs - windowMs;
    samples = samples.filter((sample) => sample >= oldest);
  };

  return {
    mark: (nowMs) => {
      if (!Number.isFinite(nowMs)) {
        return;
      }

      samples.push(nowMs);
      forget(nowMs);
    },
    rate: (nowMs) => {
      if (!Number.isFinite(nowMs)) {
        return undefined;
      }

      forget(nowMs);

      const first = samples[0];
      const last = samples[samples.length - 1];

      if (samples.length < 2 || first === undefined || last === undefined) {
        return undefined;
      }

      const spanMs = last - first;

      if (spanMs <= 0) {
        return undefined;
      }

      /**
       * `length - 1` because a span bounded by two samples contains that many
       * intervals. Counting the samples themselves would read 2 per second from
       * a single 1 s interval.
       */
      return ((samples.length - 1) * 1000) / spanMs;
    },
  };
}
