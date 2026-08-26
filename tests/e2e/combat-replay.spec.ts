import { expect, test } from '@playwright/test';

import {
  buildCombatSession,
  PB05_COMBAT_SCENARIO_ID,
  PB05_COMBAT_TICK_COUNT,
} from './support/combatSession';
import { selectHunt } from './support/huntDriver';

interface KernelProbeResult {
  readonly canonicalSnapshot: string;
  readonly snapshotSha256: string;
  readonly eventCount: number;
  readonly finalTick: number;
}

test('replays PB-05 combat to the same SHA-256 in Chromium as in Node', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.url()} (${response.status()})`);
    }
  });

  const session = buildCombatSession();

  expect(session.scenarioId).toBe(PB05_COMBAT_SCENARIO_ID);
  expect(session.node.finalTick).toBe(PB05_COMBAT_TICK_COUNT);
  expect(session.node.eventCount).toBeGreaterThan(0);

  await page.goto('/');
  await selectHunt(page);
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 15_000 });

  const actual = await page.evaluate(
    async ({ scenarioJson, logText }) => {
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

      return probe.replay(scenarioJson, logText);
    },
    { scenarioJson: session.scenarioJson, logText: session.logText },
  );

  expect(actual.snapshotSha256).toBe(session.node.snapshotSha256);
  expect(actual.canonicalSnapshot).toBe(session.node.canonicalSnapshot);
  expect(actual.eventCount).toBe(session.node.eventCount);
  expect(actual.finalTick).toBe(session.node.finalTick);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});
