import { expect, test } from '@playwright/test';

import { readShellActionableDuration } from '../../apps/game/src/runtime/performance';

test.describe.configure({ retries: 0 });

test('reaches the actionable shell within the Fast 4G budget', async ({
  browser,
}) => {
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

    const duration = readShellActionableDuration(
      await page.evaluate(() =>
        performance
          .getEntriesByName('huntbound:shell-actionable')
          .map((entry) => ({
            name: entry.name,
            startTime: entry.startTime,
          })),
      ),
    );

    expect(duration).toBeLessThanOrEqual(5_000);
  } finally {
    await cdp.detach();
    await context.close();
  }
});
