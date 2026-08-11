/**
 * Pure classification and aggregation for the PB-00R-02 stall controls.
 *
 * No I/O lives here on purpose: the harness that launches Chromium, cycles
 * `vite preview` and writes raw output is separate, so this part stays under
 * unit test. Nothing in this file may be read as acceptance evidence — the
 * controls are diagnostic only.
 */

/**
 * A boundary held longer than this counts as a stall.
 *
 * Deliberately slack: the stalls reported historically sit near 10.000 ms and
 * healthy runs stay under ~200 ms, so no observation lands near the frontier.
 */
export const STALL_THRESHOLD_MS = 3_000;

export type StallBoundary = 'send' | 'headerWait';

/**
 * Worst per-run distances observed on `Network.responseReceived`:
 * `maxSendMs` is the largest `sendEnd - sendStart` and `maxHeaderWaitMs` the
 * largest `receiveHeadersStart - sendEnd`. `null` means the run recorded no
 * usable timing for that boundary.
 */
export interface BoundaryTimings {
  readonly maxSendMs: number | null;
  readonly maxHeaderWaitMs: number | null;
}

export interface StallVerdict {
  readonly stalled: boolean;
  readonly thresholdMs: number;
  readonly worstMs: number | null;
  readonly worstBoundary: StallBoundary | null;
}

/**
 * Applies the recorded stall criterion to one execution.
 *
 * A run is stalled when either boundary is strictly above the threshold. Ties
 * between the two boundaries resolve to `send`, which is the earlier one.
 */
export function classifyStall(timings: BoundaryTimings): StallVerdict {
  const { maxSendMs, maxHeaderWaitMs } = timings;

  let worstMs: number | null = null;
  let worstBoundary: StallBoundary | null = null;

  if (maxSendMs !== null) {
    worstMs = maxSendMs;
    worstBoundary = 'send';
  }

  if (
    maxHeaderWaitMs !== null &&
    (worstMs === null || maxHeaderWaitMs > worstMs)
  ) {
    worstMs = maxHeaderWaitMs;
    worstBoundary = 'headerWait';
  }

  return {
    stalled: worstMs !== null && worstMs > STALL_THRESHOLD_MS,
    thresholdMs: STALL_THRESHOLD_MS,
    worstMs,
    worstBoundary,
  };
}

/**
 * Upper bound on the true rate that `runs` observations with zero events are
 * still compatible with, by the rule of three: 3/n at roughly 95% confidence.
 *
 * Returns `null` without runs, and never claims more than 100%, because 3/n
 * exceeds one below three runs and a probability cannot.
 */
export function ruleOfThreeUpperBoundPercent(runs: number): number | null {
  if (runs <= 0) {
    return null;
  }

  return Math.min(100, Math.round((300 / runs) * 10) / 10);
}

export interface ControlRunRecord {
  readonly control: string;
  readonly index: number;
  readonly stalled: boolean;
  readonly worstMs: number | null;
}

export interface ControlMatrixRow {
  readonly control: string;
  readonly runs: number;
  readonly stalls: number;
  readonly worstMs: number | null;
  /**
   * Only present when the control observed zero stalls. 0/N never proves
   * absence, so a zero row carries the rate it remains compatible with instead
   * of an unqualified "does not happen".
   */
  readonly upperBoundPercent: number | null;
}

/** Collapses per-run records into one row per control, in first-seen order. */
export function aggregateMatrix(
  records: readonly ControlRunRecord[],
): ControlMatrixRow[] {
  const order: string[] = [];
  const runs = new Map<string, number>();
  const stalls = new Map<string, number>();
  const worst = new Map<string, number | null>();

  for (const record of records) {
    if (!runs.has(record.control)) {
      order.push(record.control);
      runs.set(record.control, 0);
      stalls.set(record.control, 0);
      worst.set(record.control, null);
    }

    runs.set(record.control, (runs.get(record.control) ?? 0) + 1);

    if (record.stalled) {
      stalls.set(record.control, (stalls.get(record.control) ?? 0) + 1);
    }

    const previousWorst = worst.get(record.control) ?? null;

    if (
      record.worstMs !== null &&
      (previousWorst === null || record.worstMs > previousWorst)
    ) {
      worst.set(record.control, record.worstMs);
    }
  }

  return order.map((control) => {
    const controlRuns = runs.get(control) ?? 0;
    const controlStalls = stalls.get(control) ?? 0;

    return {
      control,
      runs: controlRuns,
      stalls: controlStalls,
      worstMs: worst.get(control) ?? null,
      upperBoundPercent:
        controlStalls === 0 ? ruleOfThreeUpperBoundPercent(controlRuns) : null,
    };
  });
}
