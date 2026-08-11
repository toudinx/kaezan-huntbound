import { expect, test } from '@playwright/test';

export const shellViewports = [
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
    await expect(page).toHaveScreenshot(`shell-${viewport.name}.png`, {
      fullPage: true,
    });
  });
}

test('redraws the playfield after in-session viewport changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
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
  await expect(page).toHaveScreenshot('shell-mobile-to-desktop.png', {
    fullPage: true,
  });
});

test('recovers lifecycle changes without duplicating shell elements', async ({
  page,
}) => {
  await page.goto('/');
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
