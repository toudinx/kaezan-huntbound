import { expect, test } from '@playwright/test';

import { selectHunt, waitForHunt } from './support/huntDriver';

const shellViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const;

async function expectNonZeroViewportBox(
  page: import('@playwright/test').Page,
  selector: string,
) {
  const box = await page.locator(selector).boundingBox();

  expect(box).not.toBeNull();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0,
  );
}

/** Playfield and combat HUD tick; hide them so the shell chrome can settle. */
async function hideLivePlayfield(page: import('@playwright/test').Page) {
  await page.locator('#game-root').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
  // The frame-rate readout changes every 250 ms by design, so it can never sit
  // inside a compared screenshot.
  await page.locator('[data-testid="shell-frame-rate"]').evaluate((element) => {
    // `display: none` rather than `visibility: hidden`: the readout has to
    // surrender its layout box too, or the panel around it changes size.
    (element as HTMLElement).style.display = 'none';
  });
  const combatRoot = page.locator('[data-testid="combat-root"]');
  if ((await combatRoot.count()) === 0) {
    return;
  }
  await combatRoot.evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
}

for (const viewport of shellViewports) {
  test(`${viewport.name} boots a clear ready shell`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(
      page.locator('[data-testid="hunting-places-screen"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-testid="hunt-place-card"]')).toHaveCount(
      4,
    );
    const rotwormCard = page.locator(
      '[data-testid="hunt-place-card"][data-hunt-id="hunt:tibia:venore-rotworm-cave"]',
    );
    const cyclopolisCard = page.locator(
      '[data-testid="hunt-place-card"][data-hunt-id="hunt:tibia:cyclopolis"]',
    );
    const dragonCard = page.locator(
      '[data-testid="hunt-place-card"][data-hunt-id="hunt:tibia:dragon-lair"]',
    );
    const heroCard = page.locator(
      '[data-testid="hunt-place-card"][data-hunt-id="hunt:tibia:hero-cave"]',
    );
    await expect(rotwormCard).toHaveCount(1);
    await expect(
      rotwormCard.locator('[data-testid="hunt-place-name"]'),
    ).toHaveText('Venore Rotworm Cave');
    await expect(cyclopolisCard).toHaveCount(1);
    await expect(
      cyclopolisCard.locator('[data-testid="hunt-place-name"]'),
    ).toHaveText('Cyclopolis');
    await expect(dragonCard).toHaveCount(1);
    await expect(
      dragonCard.locator('[data-testid="hunt-place-name"]'),
    ).toHaveText('Dragon Lair');
    await expect(heroCard).toHaveCount(1);
    await expect(
      heroCard.locator('[data-testid="hunt-place-name"]'),
    ).toHaveText('Hero Cave');
    await selectHunt(page);
    await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);
    await expect(page.locator('#game-root canvas')).toHaveCount(1);
    await expect(
      page.locator('#ui-root > [data-testid="app-shell"]'),
    ).toHaveCount(1);
    await expectNonZeroViewportBox(page, '#game-root canvas');
    await expectNonZeroViewportBox(page, '#ui-root');

    const layout = await page.evaluate(() => {
      const status = document.querySelector<HTMLElement>(
        '[data-testid="shell-status"]',
      );
      const statusBox = status?.getBoundingClientRect();

      return {
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        statusFontSize: status
          ? Number.parseFloat(getComputedStyle(status).fontSize)
          : 0,
        statusBottom: statusBox?.bottom ?? 0,
      };
    });

    expect(layout.documentWidth).toBe(viewport.width);
    expect(layout.documentHeight).toBe(viewport.height);
    expect(layout.statusFontSize).toBeGreaterThan(0);
    expect(layout.statusBottom).toBeLessThan(viewport.height * 0.3);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await hideLivePlayfield(page);
    await expect(page.locator('[data-testid="app-shell"]')).toHaveScreenshot(
      `shell-${viewport.name}.png`,
    );
  });
}

test('enters Cyclopolis with its authored Cyclops roster', async ({ page }) => {
  const state = await waitForHunt(page, 'Cyclopolis');

  expect(state.player?.position).toEqual({ x: 2, y: 4, z: 8 });
  await expect(
    page.locator('[data-testid="combat-player-health"]'),
  ).toHaveAttribute('aria-valuemax', '740');
  // SpawnTable.maxLiveActors is a global cap and includes the player.
  expect(
    state.actors.filter((actor) => actor.key === 'creature:tibia:cyclops'),
  ).toHaveLength(18);
});

test('redraws the playfield after in-session viewport changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await selectHunt(page);
  await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('[data-testid="shell-viewport"]')).toContainText(
    '1366 × 768',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await page.waitForTimeout(500);
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(1);
  await hideLivePlayfield(page);
  await expect(page.locator('[data-testid="app-shell"]')).toHaveScreenshot(
    'shell-mobile-to-desktop.png',
  );
});

test('recovers lifecycle changes without duplicating shell elements', async ({
  page,
}) => {
  await page.goto('/');
  await selectHunt(page);
  await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('[data-shell-phase="paused"]')).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('[data-shell-phase="paused"]')).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await expect(
    page.locator('#ui-root > [data-testid="app-shell"]'),
  ).toHaveCount(1);
});
