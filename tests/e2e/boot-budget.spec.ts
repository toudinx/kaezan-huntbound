import { performance as nodePerformance } from 'node:perf_hooks';

import { expect, test } from '@playwright/test';

import { readShellActionableDuration } from '../../apps/game/src/runtime/performance';
import {
  type CdpNetworkEvent,
  type CdpResponseTiming,
  criticalResources,
  summarizeCdpRequests,
  summarizeResponseTimings,
} from './support/bootMetrics';

test.describe.configure({ retries: 0 });

const eventLoopSampleMs = 50;

test('reaches the actionable shell within the Fast 4G budget', async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  // Diagnostic only: the Network domain already streams these events, so
  // listening in Node adds no browser-side work and cannot move the mark.
  const networkEvents: CdpNetworkEvent[] = [];
  const responseTimings: Array<Record<string, unknown>> = [];
  const socketTimings: CdpResponseTiming[] = [];
  let documentAnchor: { monotonicSeconds: number; wallTimeMs: number } | null =
    null;

  cdp.on('Network.requestWillBeSent', (event) => {
    networkEvents.push({
      kind: 'requestWillBeSent',
      requestId: event.requestId,
      timestamp: event.timestamp,
      url: event.request.url,
      priority: event.request.initialPriority,
    });

    if (!documentAnchor && event.type === 'Document') {
      documentAnchor = {
        monotonicSeconds: event.timestamp,
        wallTimeMs: event.wallTime * 1_000,
      };
    }
  });

  cdp.on('Network.responseReceived', (event) => {
    networkEvents.push({
      kind: 'responseReceived',
      requestId: event.requestId,
      timestamp: event.timestamp,
      url: event.response.url,
    });
    responseTimings.push({
      url: event.response.url,
      status: event.response.status,
      protocol: event.response.protocol ?? null,
      connectionId: event.response.connectionId,
      connectionReused: event.response.connectionReused,
      fromDiskCache: event.response.fromDiskCache ?? null,
      encodedDataLength: event.response.encodedDataLength,
      timing: event.response.timing ?? null,
    });

    const timing = event.response.timing;

    if (timing) {
      socketTimings.push({
        url: event.response.url,
        requestTime: timing.requestTime,
        receiveHeadersStart: timing.receiveHeadersStart,
        receiveHeadersEnd: timing.receiveHeadersEnd,
        connectStart: timing.connectStart,
        connectEnd: timing.connectEnd,
      });
    }
  });

  cdp.on('Network.dataReceived', (event) => {
    networkEvents.push({
      kind: 'dataReceived',
      requestId: event.requestId,
      timestamp: event.timestamp,
      dataLength: event.dataLength,
      encodedDataLength: event.encodedDataLength,
    });
  });

  cdp.on('Network.loadingFinished', (event) => {
    networkEvents.push({
      kind: 'loadingFinished',
      requestId: event.requestId,
      timestamp: event.timestamp,
      encodedDataLength: event.encodedDataLength,
    });
  });

  cdp.on('Network.loadingFailed', (event) => {
    networkEvents.push({
      kind: 'loadingFailed',
      requestId: event.requestId,
      timestamp: event.timestamp,
      errorText: event.errorText,
    });
  });

  // Detects starvation of the runner process itself during the same window.
  const eventLoopLags: number[] = [];
  let lastSampleAt = nodePerformance.now();
  const eventLoopSampler = setInterval(() => {
    const now = nodePerformance.now();

    eventLoopLags.push(now - lastSampleAt - eventLoopSampleMs);
    lastSampleAt = now;
  }, eventLoopSampleMs);

  try {
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 200_000,
      uploadThroughput: 93_750,
      connectionType: 'cellular4g',
    });

    await page.goto('http://127.0.0.1:4173/');
    await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);

    clearInterval(eventLoopSampler);

    const entries = await page.evaluate(() => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;

      return {
        timeOrigin: performance.timeOrigin,
        actionableMarks: performance
          .getEntriesByName('huntbound:shell-actionable')
          .map((entry) => ({
            name: entry.name,
            startTime: entry.startTime,
          })),
        navigation: navigationEntry
          ? {
              responseStart: navigationEntry.responseStart,
              responseEnd: navigationEntry.responseEnd,
              domInteractive: navigationEntry.domInteractive,
              domContentLoadedEventEnd:
                navigationEntry.domContentLoadedEventEnd,
              loadEventEnd: navigationEntry.loadEventEnd,
            }
          : null,
        resources: performance
          .getEntriesByType('resource')
          .map((entry) => entry as PerformanceResourceTiming)
          .map((entry) => ({
            name: entry.name,
            initiatorType: entry.initiatorType,
            startTime: entry.startTime,
            duration: entry.duration,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            decodedBodySize: entry.decodedBodySize,
          })),
      };
    });

    const slowestResources = criticalResources(entries.resources);
    const [firstActionableMark] = entries.actionableMarks;
    const anchor = documentAnchor as {
      monotonicSeconds: number;
      wallTimeMs: number;
    } | null;
    const timeBase = anchor
      ? {
          monotonicSeconds: anchor.monotonicSeconds,
          pageMs: anchor.wallTimeMs - entries.timeOrigin,
        }
      : null;
    const cdpRequests = timeBase
      ? summarizeCdpRequests(networkEvents, timeBase)
      : [];
    const cdpSocketTimings = timeBase
      ? summarizeResponseTimings(socketTimings, timeBase).filter(
          ({ url }) => !url.startsWith('data:'),
        )
      : [];
    const stalledRequest = [...cdpRequests].sort(
      (left, right) => right.largestGapMs - left.largestGapMs,
    )[0];
    const bootMetrics = {
      actionable: firstActionableMark?.startTime ?? null,
      actionableMarkCount: entries.actionableMarks.length,
      timeOrigin: entries.timeOrigin,
      navigation: entries.navigation,
      resources: entries.resources,
      criticalResources: slowestResources,
      cdpRequests,
      cdpSocketTimings,
      cdpResponseTimings: responseTimings,
      runnerEventLoop: {
        sampleMs: eventLoopSampleMs,
        sampleCount: eventLoopLags.length,
        maxLagMs: eventLoopLags.length > 0 ? Math.max(...eventLoopLags) : null,
        lagsOver250ms: eventLoopLags.filter((lag) => lag > 250).length,
      },
    };

    await testInfo.attach('boot-metrics', {
      body: JSON.stringify(bootMetrics, null, 2),
      contentType: 'application/json',
    });

    if (!entries.navigation) {
      throw new Error('Boot navigation timing is missing.');
    }

    const duration = readShellActionableDuration(entries.actionableMarks);
    const [slowestResource] = slowestResources;

    console.log(
      `[boot-budget] actionable=${duration.toFixed(1)}ms ` +
        `responseEnd=${entries.navigation.responseEnd.toFixed(1)}ms ` +
        `slowest=${slowestResource?.name ?? 'none'}:` +
        `${slowestResource?.duration.toFixed(1) ?? '0.0'}ms`,
    );
    console.log(
      `[boot-gap] gap=${stalledRequest?.largestGapMs.toFixed(1) ?? '0.0'}ms ` +
        `after=${stalledRequest?.largestGapAfterMs?.toFixed(1) ?? 'none'}ms ` +
        `url=${stalledRequest?.url ?? 'none'} ` +
        `runnerLagMax=${bootMetrics.runnerEventLoop.maxLagMs?.toFixed(1) ?? 'none'}ms`,
    );

    for (const timing of cdpSocketTimings) {
      console.log(
        `[boot-socket] ${timing.url.replace('http://127.0.0.1:4173', '')} ` +
          `requestTime=${timing.requestTimeMs.toFixed(1)}ms ` +
          `serverHeaders=${timing.headersStartMs?.toFixed(1) ?? 'none'}ms ` +
          `releasedHeaders=${timing.headersEndMs?.toFixed(1) ?? 'none'}ms ` +
          `throttleHold=${timing.throttleHoldMs?.toFixed(1) ?? 'none'}ms`,
      );
    }

    expect(duration).toBeLessThanOrEqual(5_000);
  } finally {
    clearInterval(eventLoopSampler);
    await cdp.detach();
    await context.close();
  }
});
