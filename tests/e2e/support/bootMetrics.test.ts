import { describe, expect, it } from 'vitest';

import {
  type CdpNetworkEvent,
  type CdpResponseTiming,
  criticalResources,
  summarizeCdpRequests,
  summarizeResponseTimings,
} from './bootMetrics';

describe('criticalResources', () => {
  it('returns the five slowest resources in descending order', () => {
    const resources = [6, 1, 5, 2, 4, 3].map((duration, index) => ({
      name: `resource-${index}`,
      initiatorType: 'script',
      startTime: index,
      duration,
      transferSize: 100,
      encodedBodySize: 90,
      decodedBodySize: 120,
    }));

    expect(
      criticalResources(resources).map(({ duration }) => duration),
    ).toEqual([6, 5, 4, 3, 2]);
  });
});

describe('summarizeCdpRequests', () => {
  const base = { monotonicSeconds: 1_000, pageMs: 0 };

  it('locates the largest gap inside a stalled request timeline', () => {
    const events: CdpNetworkEvent[] = [
      {
        kind: 'requestWillBeSent',
        requestId: 'a',
        timestamp: 1_000,
        url: 'http://127.0.0.1:4173/assets/index.js',
        priority: 'High',
      },
      { kind: 'responseReceived', requestId: 'a', timestamp: 1_000.15 },
      {
        kind: 'dataReceived',
        requestId: 'a',
        timestamp: 1_000.2,
        dataLength: 400,
        encodedDataLength: 100,
      },
      {
        kind: 'dataReceived',
        requestId: 'a',
        timestamp: 1_010.3,
        dataLength: 800,
        encodedDataLength: 200,
      },
      { kind: 'loadingFinished', requestId: 'a', timestamp: 1_010.35 },
    ];

    expect(summarizeCdpRequests(events, base)).toEqual([
      {
        requestId: 'a',
        url: 'http://127.0.0.1:4173/assets/index.js',
        priority: 'High',
        requestSentMs: 0,
        responseReceivedMs: 150,
        firstDataMs: 200,
        lastDataMs: 10_300,
        finishedMs: 10_350,
        failedMs: null,
        errorText: null,
        dataEventCount: 2,
        receivedBytes: 300,
        decodedBytes: 1_200,
        largestGapMs: 10_100,
        largestGapAfterMs: 200,
      },
    ]);
  });

  it('records loading failures and orders requests by send time', () => {
    const events: CdpNetworkEvent[] = [
      {
        kind: 'requestWillBeSent',
        requestId: 'late',
        timestamp: 1_002,
        url: 'http://127.0.0.1:4173/late.css',
      },
      {
        kind: 'requestWillBeSent',
        requestId: 'early',
        timestamp: 1_001,
        url: 'http://127.0.0.1:4173/early.css',
      },
      {
        kind: 'loadingFailed',
        requestId: 'early',
        timestamp: 1_001.5,
        errorText: 'net::ERR_CONNECTION_RESET',
      },
    ];

    const [first, second] = summarizeCdpRequests(events, base);

    expect(first?.url).toBe('http://127.0.0.1:4173/early.css');
    expect(first?.failedMs).toBe(1_500);
    expect(first?.errorText).toBe('net::ERR_CONNECTION_RESET');
    expect(first?.finishedMs).toBeNull();
    expect(second?.url).toBe('http://127.0.0.1:4173/late.css');
  });
});

describe('summarizeResponseTimings', () => {
  it('separates the real server response from the throttled release', () => {
    const timings: CdpResponseTiming[] = [
      {
        url: 'http://127.0.0.1:4173/assets/index.js',
        requestTime: 1_000.1,
        receiveHeadersStart: 7.1,
        receiveHeadersEnd: 180.7,
        connectStart: -1,
        connectEnd: -1,
      },
    ];

    expect(
      summarizeResponseTimings(timings, { monotonicSeconds: 1_000, pageMs: 0 }),
    ).toEqual([
      {
        url: 'http://127.0.0.1:4173/assets/index.js',
        requestTimeMs: 100,
        headersStartMs: 107.1,
        headersEndMs: 280.7,
        connectEndMs: null,
        throttleHoldMs: 173.6,
      },
    ]);
  });
});
