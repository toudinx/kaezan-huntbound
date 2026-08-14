import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

interface KernelProbeResult {
  readonly canonicalSnapshot: string;
  readonly snapshotSha256: string;
  readonly eventCount: number;
  readonly finalTick: number;
}

async function fixture(name: string): Promise<string> {
  return readFile(
    new URL(
      `../../packages/test-fixtures/simulation/pb03/${name}`,
      import.meta.url,
    ),
    'utf8',
  );
}

test('matches the Node replay golden in Chromium', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.url()} (${response.status()})`);
    }
  });

  await page.goto('/');
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 5_000 });

  const [scenarioJson, logText, expectedSnapshot, expectedHash] =
    await Promise.all([
      fixture('scenario.json'),
      fixture('commands.jsonl'),
      fixture('snapshot.golden.json'),
      fixture('snapshot.golden.sha256'),
    ]);

  const actual = await page.evaluate(
    async ({ scenarioJson: scenario, logText: log }) => {
      const probe = (
        globalThis as typeof globalThis & {
          __huntboundKernelProbe?: {
            replay(
              scenarioJson: string,
              logText: string,
            ): Promise<KernelProbeResult>;
          };
        }
      ).__huntboundKernelProbe;

      if (probe === undefined) {
        throw new Error('Kernel probe is not installed in the test browser.');
      }

      return probe.replay(scenario, log);
    },
    { scenarioJson, logText },
  );

  expect(actual.canonicalSnapshot).toBe(expectedSnapshot);
  expect(actual.snapshotSha256).toBe(expectedHash.trim());
  expect(actual.eventCount).toBe(59);
  expect(actual.finalTick).toBe(200);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});
