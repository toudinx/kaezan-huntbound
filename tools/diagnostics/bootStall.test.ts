import { describe, expect, it } from 'vitest';

import {
  aggregateMatrix,
  type ControlRunRecord,
  classifyStall,
  ruleOfThreeUpperBoundPercent,
  STALL_THRESHOLD_MS,
} from './bootStall.ts';

describe('classifyStall', () => {
  it('flags a send boundary held past the threshold', () => {
    expect(
      classifyStall({ maxSendMs: 10_010.3, maxHeaderWaitMs: 181.6 }),
    ).toEqual({
      stalled: true,
      thresholdMs: STALL_THRESHOLD_MS,
      worstMs: 10_010.3,
      worstBoundary: 'send',
    });
  });

  it('flags a header wait held past the threshold', () => {
    expect(
      classifyStall({ maxSendMs: 0.8, maxHeaderWaitMs: 10_361.7 }),
    ).toEqual({
      stalled: true,
      thresholdMs: STALL_THRESHOLD_MS,
      worstMs: 10_361.7,
      worstBoundary: 'headerWait',
    });
  });

  it('keeps a healthy run below the threshold unflagged', () => {
    expect(classifyStall({ maxSendMs: 1.4, maxHeaderWaitMs: 180.7 })).toEqual({
      stalled: false,
      thresholdMs: STALL_THRESHOLD_MS,
      worstMs: 180.7,
      worstBoundary: 'headerWait',
    });
  });

  it('treats exactly the threshold as not stalled', () => {
    expect(
      classifyStall({ maxSendMs: STALL_THRESHOLD_MS, maxHeaderWaitMs: null }),
    ).toMatchObject({ stalled: false, worstMs: STALL_THRESHOLD_MS });
  });

  it('reports no verdict boundary when nothing was measured', () => {
    expect(classifyStall({ maxSendMs: null, maxHeaderWaitMs: null })).toEqual({
      stalled: false,
      thresholdMs: STALL_THRESHOLD_MS,
      worstMs: null,
      worstBoundary: null,
    });
  });
});

describe('ruleOfThreeUpperBoundPercent', () => {
  it('bounds 30 zero-event runs at about 10 percent', () => {
    expect(ruleOfThreeUpperBoundPercent(30)).toBe(10);
  });

  it('bounds 75 zero-event runs at about 4 percent', () => {
    expect(ruleOfThreeUpperBoundPercent(75)).toBe(4);
  });

  it('has no bound without runs', () => {
    expect(ruleOfThreeUpperBoundPercent(0)).toBeNull();
  });

  it('never claims a bound above 100 percent for tiny run counts', () => {
    expect(ruleOfThreeUpperBoundPercent(1)).toBe(100);
  });
});

describe('aggregateMatrix', () => {
  const record = (
    control: string,
    index: number,
    stalled: boolean,
    worstMs: number | null,
  ): ControlRunRecord => ({ control, index, stalled, worstMs });

  it('counts runs and stalls per control in first-seen order', () => {
    const records = [
      record('A', 1, false, 180.2),
      record('B', 1, false, 12.5),
      record('A', 2, true, 10_011.1),
      record('A', 3, false, 179.4),
    ];

    expect(aggregateMatrix(records)).toEqual([
      {
        control: 'A',
        runs: 3,
        stalls: 1,
        worstMs: 10_011.1,
        upperBoundPercent: null,
      },
      {
        control: 'B',
        runs: 1,
        stalls: 0,
        worstMs: 12.5,
        upperBoundPercent: 100,
      },
    ]);
  });

  it('attaches the rule-of-three bound only to controls with zero stalls', () => {
    const records = Array.from({ length: 30 }, (_, offset) =>
      record('B', offset + 1, false, 150),
    );

    expect(aggregateMatrix(records)).toEqual([
      {
        control: 'B',
        runs: 30,
        stalls: 0,
        worstMs: 150,
        upperBoundPercent: 10,
      },
    ]);
  });

  it('reports a null worst time when no run measured a boundary', () => {
    expect(aggregateMatrix([record('D', 1, false, null)])).toEqual([
      {
        control: 'D',
        runs: 1,
        stalls: 0,
        worstMs: null,
        upperBoundPercent: 100,
      },
    ]);
  });

  it('returns nothing for an empty run set', () => {
    expect(aggregateMatrix([])).toEqual([]);
  });
});
