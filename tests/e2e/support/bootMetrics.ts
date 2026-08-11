export interface BootResourceMetric {
  readonly name: string;
  readonly initiatorType: string;
  readonly startTime: number;
  readonly duration: number;
  readonly transferSize: number;
  readonly encodedBodySize: number;
  readonly decodedBodySize: number;
}

export interface BootNavigationMetric {
  readonly responseStart: number;
  readonly responseEnd: number;
  readonly domInteractive: number;
  readonly domContentLoadedEventEnd: number;
  readonly loadEventEnd: number;
}

export function criticalResources(
  resources: readonly BootResourceMetric[],
): BootResourceMetric[] {
  return [...resources]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, 5);
}

export type CdpNetworkEventKind =
  | 'requestWillBeSent'
  | 'responseReceived'
  | 'dataReceived'
  | 'loadingFinished'
  | 'loadingFailed';

export interface CdpNetworkEvent {
  readonly kind: CdpNetworkEventKind;
  readonly requestId: string;
  /** CDP monotonic time, in seconds. */
  readonly timestamp: number;
  readonly url?: string;
  readonly priority?: string;
  readonly dataLength?: number;
  readonly encodedDataLength?: number;
  readonly errorText?: string;
}

/** Anchors CDP monotonic seconds onto the page performance timeline. */
export interface CdpTimeBase {
  readonly monotonicSeconds: number;
  readonly pageMs: number;
}

export interface CdpRequestSummary {
  readonly requestId: string;
  readonly url: string | null;
  readonly priority: string | null;
  readonly requestSentMs: number | null;
  readonly responseReceivedMs: number | null;
  readonly firstDataMs: number | null;
  readonly lastDataMs: number | null;
  readonly finishedMs: number | null;
  readonly failedMs: number | null;
  readonly errorText: string | null;
  readonly dataEventCount: number;
  readonly receivedBytes: number;
  readonly decodedBytes: number;
  readonly largestGapMs: number;
  readonly largestGapAfterMs: number | null;
}

export interface CdpResponseTiming {
  readonly url: string;
  /** CDP monotonic time, in seconds. */
  readonly requestTime: number;
  readonly receiveHeadersStart?: number;
  readonly receiveHeadersEnd?: number;
  readonly connectStart?: number;
  readonly connectEnd?: number;
}

export interface CdpResponseTimingSummary {
  readonly url: string;
  readonly requestTimeMs: number;
  readonly headersStartMs: number | null;
  readonly headersEndMs: number | null;
  readonly connectEndMs: number | null;
  readonly throttleHoldMs: number | null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function offsetOrNull(offset: number | undefined): number | null {
  return offset === undefined || offset < 0 ? null : offset;
}

/**
 * `receiveHeadersStart` is when the local server actually answered on the
 * socket; `receiveHeadersEnd` is when the emulated network released those
 * headers. Their distance is the hold imposed by throttling, which separates a
 * slow server from a slow emulated network.
 */
export function summarizeResponseTimings(
  timings: readonly CdpResponseTiming[],
  base: CdpTimeBase,
): CdpResponseTimingSummary[] {
  return timings.map((timing) => {
    const requestTimeMs =
      (timing.requestTime - base.monotonicSeconds) * 1_000 + base.pageMs;
    const headersStart = offsetOrNull(timing.receiveHeadersStart);
    const headersEnd = offsetOrNull(timing.receiveHeadersEnd);
    const connectEnd = offsetOrNull(timing.connectEnd);

    return {
      url: timing.url,
      requestTimeMs: round1(requestTimeMs),
      headersStartMs:
        headersStart === null ? null : round1(requestTimeMs + headersStart),
      headersEndMs:
        headersEnd === null ? null : round1(requestTimeMs + headersEnd),
      connectEndMs:
        connectEnd === null ? null : round1(requestTimeMs + connectEnd),
      throttleHoldMs:
        headersStart === null || headersEnd === null
          ? null
          : round1(headersEnd - headersStart),
    };
  });
}

/**
 * Rebuilds a per-request delivery timeline from raw CDP Network events so a
 * stall can be attributed to a concrete boundary instead of a total duration.
 */
export function summarizeCdpRequests(
  events: readonly CdpNetworkEvent[],
  base: CdpTimeBase,
): CdpRequestSummary[] {
  const toPageMs = (timestamp: number) =>
    round1((timestamp - base.monotonicSeconds) * 1_000 + base.pageMs);

  const byRequest = new Map<string, CdpNetworkEvent[]>();

  for (const event of events) {
    const bucket = byRequest.get(event.requestId);

    if (bucket) {
      bucket.push(event);
    } else {
      byRequest.set(event.requestId, [event]);
    }
  }

  const summaries: CdpRequestSummary[] = [];

  for (const [requestId, bucket] of byRequest) {
    const ordered = [...bucket].sort(
      (left, right) => left.timestamp - right.timestamp,
    );
    const milestones: number[] = [];

    let url: string | null = null;
    let priority: string | null = null;
    let requestSentMs: number | null = null;
    let responseReceivedMs: number | null = null;
    let firstDataMs: number | null = null;
    let lastDataMs: number | null = null;
    let finishedMs: number | null = null;
    let failedMs: number | null = null;
    let errorText: string | null = null;
    let dataEventCount = 0;
    let receivedBytes = 0;
    let decodedBytes = 0;

    for (const event of ordered) {
      const pageMs = toPageMs(event.timestamp);

      milestones.push(pageMs);

      switch (event.kind) {
        case 'requestWillBeSent':
          url = event.url ?? url;
          priority = event.priority ?? priority;
          requestSentMs = requestSentMs ?? pageMs;
          break;
        case 'responseReceived':
          responseReceivedMs = responseReceivedMs ?? pageMs;
          break;
        case 'dataReceived':
          dataEventCount += 1;
          receivedBytes += event.encodedDataLength ?? 0;
          decodedBytes += event.dataLength ?? 0;
          firstDataMs = firstDataMs ?? pageMs;
          lastDataMs = pageMs;
          break;
        case 'loadingFinished':
          finishedMs = pageMs;
          break;
        case 'loadingFailed':
          failedMs = pageMs;
          errorText = event.errorText ?? null;
          break;
      }
    }

    let largestGapMs = 0;
    let largestGapAfterMs: number | null = null;

    for (let index = 1; index < milestones.length; index += 1) {
      const previous = milestones[index - 1] as number;
      const gap = round1((milestones[index] as number) - previous);

      if (gap > largestGapMs) {
        largestGapMs = gap;
        largestGapAfterMs = previous;
      }
    }

    summaries.push({
      requestId,
      url,
      priority,
      requestSentMs,
      responseReceivedMs,
      firstDataMs,
      lastDataMs,
      finishedMs,
      failedMs,
      errorText,
      dataEventCount,
      receivedBytes,
      decodedBytes,
      largestGapMs,
      largestGapAfterMs,
    });
  }

  return summaries.sort(
    (left, right) =>
      (left.requestSentMs ?? Number.POSITIVE_INFINITY) -
      (right.requestSentMs ?? Number.POSITIVE_INFINITY),
  );
}
