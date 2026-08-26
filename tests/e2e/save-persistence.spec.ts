import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from '@playwright/test';

import type { HuntboundHuntGlobal } from '../../apps/game/src/hunt/HuntProbe.ts';
import {
  type GameSave,
  type RunBagEntry,
  SAVE_SCHEMA_VERSION,
  type Seed,
} from '../../packages/contracts/src/index.ts';
import { type CombatViewport, runCombatSession } from './support/combatDriver';
import { readHuntState, selectHunt } from './support/huntDriver';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const satisfies readonly CombatViewport[];

const APP_SEED = '1a2b3c4d5e6f7a8b' as Seed;
const exportGoldenPath = fileURLToPath(
  new URL(
    '../../packages/test-fixtures/save/pb06/export.golden.txt',
    import.meta.url,
  ),
);
const screenshotDirectory = fileURLToPath(
  new URL('../../docs/playbooks/PB-06/artifacts/screenshots/', import.meta.url),
);
const writingScreenshots = process.env.HUNTBOUND_SAVE_SCREENSHOTS === 'write';

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

async function writeSaveDocument(
  page: Page,
  document: GameSave,
): Promise<void> {
  await page.evaluate(async (nextDocument) => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }
    await probe.runTransaction(() => ({
      document: nextDocument,
      result: undefined,
    }));
  }, document);
}

async function readSaveDocument(page: Page): Promise<GameSave | null> {
  return page.evaluate(async () => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }
    return (await probe.read()) as GameSave | null;
  });
}

async function waitForHuntBoot(
  page: Page,
  requirePlayer = true,
): Promise<void> {
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await page.waitForFunction(
    (shouldRequirePlayer) => {
      const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
      return (
        probe !== undefined &&
        (!shouldRequirePlayer || probe.state().player !== null)
      );
    },
    requirePlayer,
    { polling: 'raf', timeout: 15_000 },
  );
}

async function openAppPage(
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
  watch?: PageWatch,
  requirePlayer = true,
): Promise<Page> {
  const page = await createAppPage(context, viewport, watch);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForSaveProbe(page);
  await selectHunt(page);
  await waitForHuntBoot(page, requirePlayer);
  return page;
}

async function createAppPage(
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
  watch?: PageWatch,
): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  if (watch !== undefined) {
    installPageWatch(page, watch);
  }
  return page;
}

function installPageWatch(page: Page, watch: PageWatch): void {
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
}

async function openSeededAppPage(
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
  document: GameSave,
  watch?: PageWatch,
): Promise<Page> {
  const controlPage = await context.newPage();
  await controlPage.setViewportSize(viewport);
  await controlPage.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForSaveProbe(controlPage);
  await writeSaveDocument(controlPage, document);

  const page = await openAppPage(context, viewport, watch, false);
  await page.locator('[data-testid="save-status"]').waitFor();
  await controlPage.close();
  return page;
}

async function waitForActiveSaveWithLoot(page: Page): Promise<GameSave> {
  const document = (await page.evaluate(async () => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }

    const deadline = performance.now() + 30_000;
    while (performance.now() < deadline) {
      const document = await probe.read();
      if (typeof document === 'object' && document !== null) {
        const session = (document as { session?: unknown }).session;
        const snapshot =
          typeof session === 'object' && session !== null
            ? (session as { snapshot?: unknown }).snapshot
            : undefined;
        const bag =
          typeof session === 'object' && session !== null
            ? (session as { bag?: unknown }).bag
            : undefined;
        const tick =
          typeof snapshot === 'object' && snapshot !== null
            ? (snapshot as { tick?: unknown }).tick
            : undefined;
        if (
          typeof session === 'object' &&
          session !== null &&
          Array.isArray(bag) &&
          bag.length > 0 &&
          Number.isSafeInteger(tick)
        ) {
          return document;
        }
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
    }

    throw new Error('Expected an active save session with loot.');
  })) as GameSave;

  return document;
}

async function waitForStash(
  page: Page,
  requireNoSession = true,
): Promise<GameSave> {
  const document = (await page.evaluate(async (mustHaveNoSession) => {
    const target = globalThis as typeof globalThis & {
      __huntboundSaveProbe?: SaveProbe;
    };
    const probe = target.__huntboundSaveProbe;
    if (probe === undefined) {
      throw new Error('Save probe is not installed in the test browser.');
    }

    const deadline = performance.now() + 30_000;
    while (performance.now() < deadline) {
      const document = await probe.read();
      if (typeof document === 'object' && document !== null) {
        const save = document as { session?: unknown; stash?: unknown };
        if (
          Array.isArray(save.stash) &&
          save.stash.length > 0 &&
          (!mustHaveNoSession || save.session === null)
        ) {
          return document;
        }
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
    }

    throw new Error('Expected a persisted save document with stash.');
  }, requireNoSession)) as GameSave;

  return document;
}

function loadExportGolden(): string {
  return readFileSync(exportGoldenPath, 'utf8');
}

/**
 * The stash the PB-06 export golden consolidates to, sorted by item key.
 *
 * It is the whole run bag, because the golden's stash starts empty. The value
 * moved from a bare `gold-coin × 17` on 2026-08-23: PB-08-01 made the cave
 * dense enough to box, so the frozen session now kills far more and the loot
 * table actually fires. Re-derive it from `export.golden.txt` whenever that
 * fixture is regenerated rather than copying a failure message.
 */
const FIXTURE_STASH_TEXT =
  'gold-coin × 80 | ham × 5 | legion-helmet × 1 | lump-of-dirt × 2 | meat × 2 | sword × 1';

/**
 * Renders entries the way `InventoryPanel` does: item key tail, ` × `, count,
 * joined by ` | ` in item-key order.
 */
function formatStash(entries: readonly RunBagEntry[]): string {
  return [...entries]
    .sort((left, right) =>
      left.itemKey === right.itemKey
        ? 0
        : left.itemKey < right.itemKey
          ? -1
          : 1,
    )
    .map((entry) => `${entry.itemKey.split(':').at(-1)} × ${entry.count}`)
    .join(' | ');
}

function loadActiveFixture(): GameSave {
  const document = JSON.parse(loadExportGolden()) as GameSave;
  if (document.session === null) {
    throw new Error('The PB-06 export golden must contain an active session.');
  }
  return {
    ...document,
    session: {
      ...document.session,
      seed: APP_SEED,
    },
  };
}

function loadCompletedFixture(): GameSave {
  const active = loadActiveFixture();
  if (active.session === null) {
    throw new Error('The PB-06 fixture session is missing.');
  }
  return {
    ...active,
    stash: active.session.bag,
    completedRuns: 1,
    session: null,
  };
}

async function captureInventoryScreenshot(
  page: Page,
  viewport: (typeof VIEWPORTS)[number],
): Promise<void> {
  const screenshotPath = `${screenshotDirectory}save-${viewport.name}-${viewport.width}x${viewport.height}.png`;
  if (writingScreenshots) {
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  expect(existsSync(screenshotPath)).toBe(true);
  const bytes = readFileSync(screenshotPath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.subarray(0, 8).equals(signature)).toBe(true);
  expect({
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }).toEqual({ width: viewport.width, height: viewport.height });
  await expect(
    page.locator('[data-testid="save-inventory-panel"]'),
  ).toBeVisible();
}

async function patchIndexedDbWritesToFail(page: Page): Promise<void> {
  await page.evaluate(() => {
    const prototype = IDBDatabase.prototype as unknown as {
      transaction: (...args: unknown[]) => IDBTransaction;
    };
    const original = prototype.transaction;
    prototype.transaction = function (...args: unknown[]) {
      if (args[1] === 'readwrite') {
        throw new DOMException(
          'Simulated persistence failure',
          'InvalidStateError',
        );
      }
      return Reflect.apply(original, this, args) as IDBTransaction;
    };
  });
}

async function captureFirstSaveLoad(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = globalThis as typeof globalThis & {
      __huntboundFirstSaveLoad?: { readonly document: unknown };
    };
    const prototype = IDBObjectStore.prototype as unknown as {
      get: (
        this: IDBObjectStore,
        key: IDBValidKey | IDBKeyRange,
      ) => IDBRequest<unknown>;
    };
    const original = prototype.get;
    prototype.get = function (key) {
      const request = Reflect.apply(original, this, [key]);
      if (this.name === 'save' && key === 'default') {
        request.addEventListener('success', () => {
          if (target.__huntboundFirstSaveLoad === undefined) {
            target.__huntboundFirstSaveLoad = {
              document: request.result ?? null,
            };
          }
        });
      }
      return request;
    };
  });
}

async function readFirstSaveLoad(page: Page): Promise<GameSave | null> {
  const captured = await page.waitForFunction(() => {
    const target = globalThis as typeof globalThis & {
      __huntboundFirstSaveLoad?: { readonly document: unknown };
    };
    const marker = target.__huntboundFirstSaveLoad;
    return marker === undefined ? false : JSON.stringify(marker.document);
  });
  const serialized = await captured.jsonValue<string>();
  await captured.dispose();
  return JSON.parse(serialized) as GameSave | null;
}

for (const viewport of VIEWPORTS) {
  test(`reload resumes the loot-bearing run at ${viewport.width}x${viewport.height}`, async ({
    saveBrowser,
  }) => {
    const watch: PageWatch = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      badResponses: [],
    };
    const page = await createAppPage(saveBrowser.context, viewport, watch);
    const evidence = await runCombatSession(page, viewport);
    await waitForSaveProbe(page);
    console.log(
      `[save-boot] viewport=${viewport.name} actionable=${evidence.bootDurationMs.toFixed(1)}ms`,
    );
    expect(evidence.lootLog).not.toBe('');
    expect(evidence.runBag).not.toBe('');

    const beforeReload = await waitForActiveSaveWithLoot(page);
    const savedTick = beforeReload.session?.snapshot.tick;
    if (savedTick === undefined || beforeReload.session === null) {
      throw new Error('Expected a checkpointed session before reload.');
    }

    await captureFirstSaveLoad(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await selectHunt(page);
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(
      'Run resumed',
      { timeout: 15_000 },
    );
    const resumedAtBoot = await readFirstSaveLoad(page);
    await waitForHuntBoot(page);

    expect(resumedAtBoot?.session?.snapshot.tick).toBe(savedTick);
    expect(resumedAtBoot?.session?.bag).toEqual(beforeReload.session.bag);
    await expect(page.locator('[data-testid="save-run-bag"]')).not.toHaveText(
      '',
    );
    expectQuiet(watch);
  });

  test(`keeps a completed stash exactly once after reload at ${viewport.width}x${viewport.height}`, async ({
    saveBrowser,
  }) => {
    const watch: PageWatch = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      badResponses: [],
    };
    const page = await openSeededAppPage(
      saveBrowser.context,
      viewport,
      loadCompletedFixture(),
      watch,
    );
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(
      /^(New run started|Run resumed)$/,
    );
    await expect(page.locator('[data-testid="save-stash"]')).toHaveText(
      FIXTURE_STASH_TEXT,
    );
    const first = await waitForStash(page, false);
    await captureInventoryScreenshot(page, viewport);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await selectHunt(page);
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(
      /^(New run started|Run resumed)$/,
      { timeout: 15_000 },
    );
    await waitForHuntBoot(page);
    const second = await waitForStash(page, false);
    expect(second.stash).toEqual(first.stash);
    expect(second.completedRuns).toBe(first.completedRuns);
    await expect(page.locator('[data-testid="save-stash"]')).toHaveText(
      FIXTURE_STASH_TEXT,
    );
    expectQuiet(watch);
  });

  test(`abandons the run and keeps its loot without a pending session at ${viewport.width}x${viewport.height}`, async ({
    saveBrowser,
  }) => {
    const watch: PageWatch = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      badResponses: [],
    };
    const page = await openSeededAppPage(
      saveBrowser.context,
      viewport,
      loadActiveFixture(),
      watch,
    );
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(
      'Run resumed',
    );

    await page.locator('[data-testid="combat-restart"]').dispatchEvent('click');
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(
      'Run abandoned',
      { timeout: 15_000 },
    );
    const afterAbandon = await waitForStash(page);
    expect(afterAbandon.session).toBeNull();
    expect(afterAbandon.completedRuns).toBe(0);
    await expect(page.locator('[data-testid="save-run-bag"]')).toHaveText('');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await selectHunt(page);
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(
      'New run started',
      { timeout: 15_000 },
    );
    await waitForHuntBoot(page);
    const afterReload = await waitForStash(page);
    expect(afterReload.session).toBeNull();
    expect(afterReload.stash).toEqual(afterAbandon.stash);
    // Not `FIXTURE_STASH_TEXT`: the run keeps playing between resume and the
    // restart click, and since PB-08-01 made the cave dense that window
    // actually earns loot, so the count is wall-clock dependent. What must
    // hold is that the panel renders exactly the stash the save kept, and that
    // the stash is not empty.
    expect(afterReload.stash.length).toBeGreaterThan(0);
    await expect(page.locator('[data-testid="save-stash"]')).toHaveText(
      formatStash(afterReload.stash),
    );
    expectQuiet(watch);
  });

  test(`exports the canonical save byte-for-byte in Chromium at ${viewport.width}x${viewport.height}`, async ({
    saveBrowser,
  }) => {
    const watch: PageWatch = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      badResponses: [],
    };
    const expected = loadExportGolden();
    const page = await openAppPage(saveBrowser.context, viewport, watch);
    await writeSaveDocument(page, JSON.parse(expected) as GameSave);
    const exports: string[] = [];

    for (let index = 0; index < 2; index += 1) {
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="save-export"]').click();
      const download = await downloadPromise;
      const path = await download.path();
      if (path === null) throw new Error('The save download has no path.');
      exports.push(readFileSync(path, 'utf8'));
    }

    expect(exports[0]).toBe(expected);
    expect(exports[1]).toBe(expected);
    expect(exports[1]).toBe(exports[0]);
    expectQuiet(watch);
  });

  test(`rejects a future save version without destroying the existing document at ${viewport.width}x${viewport.height}`, async ({
    saveBrowser,
  }) => {
    const watch: PageWatch = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      badResponses: [],
    };
    const page = await openSeededAppPage(
      saveBrowser.context,
      viewport,
      loadCompletedFixture(),
      watch,
    );
    const existing = await readSaveDocument(page);
    const future = JSON.stringify({
      ...loadCompletedFixture(),
      schemaVersion: SAVE_SCHEMA_VERSION + 1,
    });

    page.once('dialog', (dialog) => dialog.accept());
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="save-import"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'future-save.json',
      mimeType: 'application/json',
      buffer: Buffer.from(future, 'utf8'),
    });

    await expect(page.locator('[data-testid="save-status"]')).toHaveAttribute(
      'data-status',
      'error',
      { timeout: 15_000 },
    );
    expect(await readSaveDocument(page)).toEqual(existing);
    await expect(page.locator('[data-testid="save-status"]')).toContainText(
      'SAVE_VERSION_UNSUPPORTED',
    );
    await expect(page.locator('#game-root canvas')).toHaveCount(1);
    expectQuiet(watch);
  });

  test(`surfaces a persistence failure without losing the active run at ${viewport.width}x${viewport.height}`, async ({
    saveBrowser,
  }) => {
    const watch: PageWatch = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      badResponses: [],
    };
    const page = await openSeededAppPage(
      saveBrowser.context,
      viewport,
      loadActiveFixture(),
      watch,
    );
    const beforeFailure = await readSaveDocument(page);
    const beforeTick = (await readHuntState(page)).tick;
    await patchIndexedDbWritesToFail(page);

    await expect(page.locator('[data-testid="save-status"]')).toHaveAttribute(
      'data-status',
      'error',
      { timeout: 30_000 },
    );
    await expect(page.locator('[data-testid="save-status"]')).toContainText(
      'Save checkpoint failed',
    );
    const persistedAtFailure = await readSaveDocument(page);
    expect(persistedAtFailure?.session?.bag).toEqual(
      beforeFailure?.session?.bag,
    );
    await page.waitForTimeout(250);
    expect((await readHuntState(page)).tick).toBeGreaterThan(beforeTick);
    expect(await readSaveDocument(page)).toEqual(persistedAtFailure);
    // The run is still live here, so its bag grows while this assertion runs.
    // Pin the drops that cannot change count instead of the whole rendering.
    const runBag = page.locator('[data-testid="combat-run-bag"]');
    await expect(runBag).toContainText('gold-coin × ');
    await expect(runBag).toContainText('sword × 1');
    await expect(page.locator('#game-root canvas')).toHaveCount(1);
    expectQuiet(watch);
  });
}
