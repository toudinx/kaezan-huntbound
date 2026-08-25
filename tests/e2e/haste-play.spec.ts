import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from '@playwright/test';

import type { HuntboundHuntGlobal } from '../../apps/game/src/hunt/HuntProbe.ts';
import { castCombatAbility, readCombatState } from './support/combatDriver';
import {
  type HuntStepOutcome,
  movedEvents,
  stepKeys,
  stepWithKeyboard,
} from './support/huntDriver';

interface SaveProbe {
  read(): Promise<unknown>;
  runTransaction<T>(
    operation: (current: unknown) => {
      readonly document: unknown;
      readonly result: T;
    },
  ): Promise<T>;
  clear(): Promise<void>;
}

interface SaveBrowserFixture {
  readonly context: BrowserContext;
}

const viewport = { width: 1366, height: 768 } as const;
const walkKeys = [stepKeys.n, stepKeys.e, stepKeys.s, stepKeys.w] as const;

const test = base.extend<{ saveBrowser: SaveBrowserFixture }>({
  saveBrowser: async ({ browser }, use) => {
    const context = await browser.newContext();
    const setupPage = await context.newPage();
    await setupPage.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForSaveProbe(setupPage);
    await clearSaveDatabase(setupPage);
    await setupPage.close();

    try {
      await use({ context });
    } finally {
      for (const page of context.pages()) {
        if (!page.isClosed()) await page.close();
      }

      const cleanupPage = await context.newPage();
      await cleanupPage.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForSaveProbe(cleanupPage);
      await clearSaveDatabase(cleanupPage);
      await cleanupPage.close();
      await context.close();
    }
  },
});

test.describe.configure({ retries: 0, timeout: 120_000 });

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

function expectQuiet(watch: PageWatch): void {
  expect(watch.consoleErrors).toEqual([]);
  expect(watch.pageErrors).toEqual([]);
  expect(watch.failedRequests).toEqual([]);
  expect(watch.badResponses).toEqual([]);
}

async function waitForSaveProbe(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: unknown;
    };
    return target.__huntboundSaveProbe !== undefined;
  });
}

async function clearSaveDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }
    await probe.clear();
  });
}

async function waitForHuntBoot(page: Page): Promise<void> {
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await page.waitForFunction(
    () => {
      const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
      return probe !== undefined && probe.state().player !== null;
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );
}

async function stepUntilMoved(
  page: Page,
  key: (typeof walkKeys)[number],
): Promise<HuntStepOutcome | null> {
  let outcome = await stepWithKeyboard(page, key);
  for (let attempt = 0; attempt < 4 && movedEvents(outcome).length === 0; ) {
    attempt += 1;
    outcome = await stepWithKeyboard(page, key);
  }
  return movedEvents(outcome).length === 0 ? null : outcome;
}

function intervalBetweenMoves(
  first: HuntStepOutcome,
  second: HuntStepOutcome,
): number {
  const firstMoves = movedEvents(first);
  const secondMoves = movedEvents(second);
  return secondMoves[0].tick - firstMoves[firstMoves.length - 1].tick;
}

async function measureStepInterval(page: Page): Promise<number> {
  for (const key of walkKeys) {
    const first = await stepUntilMoved(page, key);
    if (first === null) continue;
    const second = await stepUntilMoved(page, key);
    if (second === null) continue;
    return intervalBetweenMoves(first, second);
  }
  throw new Error('The player never accepted two consecutive cardinal steps.');
}

test('shows the haste clock and shortens the knight step', async ({
  saveBrowser,
}) => {
  const page = await saveBrowser.context.newPage();
  await page.setViewportSize(viewport);
  const watch = watchPage(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForSaveProbe(page);
  await waitForHuntBoot(page);
  await expect(page.locator('[data-testid="combat-hud"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="combat-haste"]')).toHaveAttribute(
    'data-haste',
    'off',
  );
  await expect(page.locator('[data-testid="combat-haste"]')).toHaveText(
    'Haste: Off',
  );

  const idleInterval = await measureStepInterval(page);
  expect(idleInterval).toBeGreaterThanOrEqual(11);
  expect(idleInterval).toBeLessThanOrEqual(12);

  await castCombatAbility(page, 8);
  await expect(page.locator('[data-testid="combat-haste"]')).toHaveAttribute(
    'data-haste',
    'active',
  );
  await expect(
    page.locator('[data-testid="combat-ability-8"]'),
  ).toHaveAttribute('aria-pressed', 'true');

  const hasteState = await readCombatState(page);
  expect(hasteState.playerHaste).toBe('active');
  expect(hasteState.hastePressed).toBe(true);
  expect(hasteState.hasteRemainingTicks).toBeGreaterThan(500);
  expect(hasteState.hasteRemainingTicks).toBeLessThanOrEqual(600);
  expect(hasteState.hasteText).toMatch(/^Haste: 2[89]s$|^Haste: 30s$/);

  const hastedInterval = await measureStepInterval(page);
  expect(hastedInterval).toBeLessThan(idleInterval);
  expect(hastedInterval).toBeGreaterThanOrEqual(6);
  expect(hastedInterval).toBeLessThanOrEqual(7);

  expectQuiet(watch);
});
