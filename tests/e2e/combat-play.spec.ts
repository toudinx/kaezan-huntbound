import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, type Page, test } from '@playwright/test';

import {
  type CombatPlayEvidence,
  runCombatSession,
} from './support/combatDriver';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const;

const screenshotRoot = fileURLToPath(
  new URL('../../docs/playbooks/PB-05/artifacts/screenshots/', import.meta.url),
);

interface PageWatch {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
}

function watchPage(page: Page): PageWatch {
  const watch: PageWatch = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') watch.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => watch.pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    watch.failedRequests.push(request.url()),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      watch.badResponses.push(`${response.url()} (${response.status()})`);
    }
  });

  return watch;
}

function expectEvidence(evidence: CombatPlayEvidence): void {
  expect(evidence.attack.targetHealthAfter).toBeLessThan(
    evidence.attack.targetHealthBefore,
  );
  expect(evidence.berserk.targetHealthAfter).toBeLessThan(
    evidence.berserk.targetHealthBefore,
  );
  expect(evidence.brutalStrike.targetHealthAfter).toBeLessThan(
    evidence.brutalStrike.targetHealthBefore,
  );
  expect(evidence.woundCleansing.playerHealthAfter).toBeGreaterThan(
    evidence.woundCleansing.playerHealthBefore,
  );
  expect(evidence.woundCleansing.playerManaAfter).toBeLessThan(
    evidence.woundCleansing.playerManaBefore,
  );
  expect(evidence.killedTargetId).toBeGreaterThan(1);
  expect(evidence.lootLog).not.toBe('');
  expect(evidence.runBag).not.toBe('');
  expect(evidence.deathOverlayVisible).toBe(true);
}

for (const viewport of viewports) {
  test(`${viewport.name} proves the directed combat session`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const watch = watchPage(page);
    const screenshotPath = `${screenshotRoot}combat-${viewport.name}-${viewport.width}x${viewport.height}.png`;
    const shouldWriteScreenshot =
      process.env.HUNTBOUND_COMBAT_SCREENSHOTS === 'write';
    const evidence = await runCombatSession(
      page,
      viewport,
      shouldWriteScreenshot
        ? {
            onCombatVisible: async () => {
              await page.screenshot({ path: screenshotPath, fullPage: true });
            },
          }
        : undefined,
    );

    expectEvidence(evidence);
    console.log(
      `[combat-boot] viewport=${viewport.name} actionable=${evidence.bootDurationMs.toFixed(1)}ms`,
    );
    expect(existsSync(screenshotPath)).toBe(true);
    expect(watch.consoleErrors).toEqual([]);
    expect(watch.pageErrors).toEqual([]);
    expect(watch.failedRequests).toEqual([]);
    expect(watch.badResponses).toEqual([]);
  });
}
