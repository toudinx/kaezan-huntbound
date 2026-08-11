import { expect, test } from '@playwright/test';

import { readShellActionableDuration } from '../../apps/game/src/runtime/performance';
import { criticalResources } from './support/bootMetrics';

test.describe.configure({ retries: 0 });

test('reaches the actionable shell within the Fast 4G budget', async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

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

    const entries = await page.evaluate(() => {
      const navigationEntry = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming | undefined;

      return {
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
    const bootMetrics = {
      actionable: firstActionableMark?.startTime ?? null,
      actionableMarkCount: entries.actionableMarks.length,
      navigation: entries.navigation,
      resources: entries.resources,
      criticalResources: slowestResources,
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

    expect(duration).toBeLessThanOrEqual(5_000);
  } finally {
    await cdp.detach();
    await context.close();
  }
});
