import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { waitForHunt } from './support/huntDriver';

/**
 * The four viewports ADR-001 makes mandatory. The images are versioned QA
 * artifacts, not Playwright baselines: the hunt has wandering creatures, so a
 * pixel comparison would be noise. Regenerate them deliberately by setting
 * `HUNTBOUND_HUNT_SCREENSHOTS=write`; every other run only checks that the
 * committed artifacts exist and match the viewport they claim. The exact
 * command is recorded in docs/playbooks/PB-04/artifacts/browser-qa.md.
 */
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const;

const screenshotDir = fileURLToPath(
  new URL('../../docs/playbooks/PB-04/artifacts/screenshots/', import.meta.url),
);

const writing = process.env.HUNTBOUND_HUNT_SCREENSHOTS === 'write';

function screenshotPath(name: string, width: number, height: number): string {
  return `${screenshotDir}hunt-${name}-${width}x${height}.png`;
}

/** Reads width and height out of the PNG IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  if (!bytes.subarray(0, 8).equals(signature)) {
    throw new Error(`${path} is not a PNG.`);
  }

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

for (const viewport of viewports) {
  test(`captures the hunt at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const badResponses: string[] = [];
    const assetRequests: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('request', (request) => {
      if (request.url().includes('/assets/')) assetRequests.push(request.url());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        badResponses.push(`${response.url()} (${response.status()})`);
      }
    });

    await page.setViewportSize(viewport);
    const state = await waitForHunt(page);

    expect(state.drawn.layers.ground).toBeGreaterThan(0);
    expect(state.player).not.toBeNull();

    console.log(
      `[hunt-screenshot] ${viewport.name} ${viewport.width}x${viewport.height} ` +
        `floor=${state.floor} sprites=${state.drawn.total} ` +
        `ground=${state.drawn.layers.ground} ` +
        `below=${state.drawn.layers.objectsBelow} ` +
        `actors=${state.drawn.layers.actors} ` +
        `above=${state.drawn.layers.objectsAbove} ` +
        `camera=${Math.round(state.camera.scrollX)},${Math.round(state.camera.scrollY)}`,
    );

    const path = screenshotPath(viewport.name, viewport.width, viewport.height);

    if (writing) {
      mkdirSync(screenshotDir, { recursive: true });
      writeFileSync(path, await page.screenshot({ fullPage: true }));
    }

    expect(pngSize(path)).toEqual({
      width: viewport.width,
      height: viewport.height,
    });

    // The captures are committed, so they must never carry `cipsoft-personal`
    // media. The test profile serves the synthetic fixture for every key; the
    // `personal` and `product` profile roots must never be touched.
    expect(
      assetRequests.filter((url) => url.includes('/assets/test/')).length,
    ).toBeGreaterThan(0);
    expect(
      assetRequests.filter(
        (url) =>
          url.includes('/assets/personal/') || url.includes('/assets/product/'),
      ),
    ).toEqual([]);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(badResponses).toEqual([]);
  });
}
