import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from '@playwright/test';

import type { HuntboundHuntGlobal } from '../../apps/game/src/hunt/HuntProbe.ts';
import type { GameSave } from '../../packages/contracts/src/index.ts';
import {
  castCombatAbility,
  engageNearestRotworm,
  readCombatState,
} from './support/combatDriver';
import { selectHunt } from './support/huntDriver';
import { readHuntDefinition } from './support/huntSession';

interface SaveProbeTransaction<T> {
  readonly document: unknown;
  readonly result: T;
}

interface SaveProbe {
  read(): Promise<unknown>;
  runTransaction<T>(
    operation: (current: unknown) => SaveProbeTransaction<T>,
  ): Promise<T>;
  clear(): Promise<void>;
}

interface PageWatch {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
}

interface SaveBrowserFixture {
  readonly context: BrowserContext;
}

const viewport = { width: 1366, height: 768 } as const;

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

async function waitForSavedPosture(
  page: Page,
  conditionIndex: 0 | 1,
): Promise<GameSave> {
  return page.evaluate(async (expectedConditionIndex) => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }

    const deadline = performance.now() + 30_000;
    while (performance.now() < deadline) {
      const document = (await probe.read()) as GameSave | null;
      const player = document?.session?.snapshot.actors.find(
        (actor) => actor.blueprintId === 'player',
      );
      if (
        player?.activeConditions.some(
          (condition) =>
            condition.conditionIndex === expectedConditionIndex &&
            condition.expiresAtTick === 0,
        ) === true
      ) {
        return document;
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
    }

    throw new Error('Expected a checkpointed active posture in the save.');
  }, conditionIndex);
}

async function waitForTargetDamage(page: Page): Promise<void> {
  const before = await readCombatState(page);
  await page.waitForFunction(
    (previousHealth) => {
      const targetName = document
        .querySelector<HTMLElement>('[data-testid="combat-target-name"]')
        ?.textContent?.trim();
      if (targetName === 'No target') return true;
      const health = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-target-health"]')
          ?.getAttribute('aria-valuenow'),
      );
      return Number.isSafeInteger(health) && health < previousHealth;
    },
    before.targetHealth,
    { polling: 'raf', timeout: 5_000 },
  );
}

async function waitForPlayerDamage(page: Page): Promise<void> {
  const maximumHealth = (await readCombatState(page)).playerHealthMaximum;
  await page.waitForFunction(
    (maximum) => {
      const health = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-health"]')
          ?.getAttribute('aria-valuenow'),
      );
      return Number.isSafeInteger(health) && health < maximum;
    },
    maximumHealth,
    { polling: 'raf', timeout: 10_000 },
  );
}

test('persists knight posture through reload, rival swap, and recast-off', async ({
  saveBrowser,
}) => {
  const page = await saveBrowser.context.newPage();
  await page.setViewportSize(viewport);
  const watch = watchPage(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForSaveProbe(page);
  await selectHunt(page);
  await waitForHuntBoot(page);
  await expect(page.locator('[data-testid="combat-hud"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="save-status"]')).toHaveText(
    'New run started',
  );

  const hunt = readHuntDefinition();
  await engageNearestRotworm(page, hunt);
  await castCombatAbility(page, 5);
  await expect(page.locator('[data-testid="combat-posture"]')).toHaveAttribute(
    'data-posture',
    'blood-rage',
  );
  await expect(
    page.locator('[data-testid="combat-ability-5"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  const bloodRageState = await readCombatState(page);
  expect(bloodRageState.postureText).toBe('Posture: Blood Rage');
  expect(bloodRageState.bloodRagePressed).toBe(true);

  await waitForTargetDamage(page);
  await waitForPlayerDamage(page);
  const checkpoint = await waitForSavedPosture(page, 0);
  expect(checkpoint.session?.snapshot.tick).toBeGreaterThan(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSaveProbe(page);
  await selectHunt(page);
  await expect(page.locator('[data-testid="save-status"]')).toHaveText(
    'Run resumed',
    { timeout: 15_000 },
  );
  await waitForHuntBoot(page);
  await expect(page.locator('[data-testid="combat-posture"]')).toHaveAttribute(
    'data-posture',
    'blood-rage',
  );

  await castCombatAbility(page, 6);
  await expect(page.locator('[data-testid="combat-posture"]')).toHaveAttribute(
    'data-posture',
    'protector',
  );
  await expect(
    page.locator('[data-testid="combat-ability-5"]'),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.locator('[data-testid="combat-ability-6"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  const protectorState = await readCombatState(page);
  expect(protectorState.playerPosture).toBe('protector');
  expect(protectorState.protectorPressed).toBe(true);

  await castCombatAbility(page, 6);
  await expect(page.locator('[data-testid="combat-posture"]')).toHaveAttribute(
    'data-posture',
    'none',
  );
  await expect(
    page.locator('[data-testid="combat-ability-6"]'),
  ).toHaveAttribute('aria-pressed', 'false');
  expectQuiet(watch);
});
