import { expect, test } from '@playwright/test';

import type { HuntboundHuntGlobal } from '../../apps/game/src/hunt/HuntProbe.ts';
import { readHuntState, selectHunt } from './support/huntDriver';

test('boots Orc Fortress from the hunting-place catalog', async ({ page }) => {
  await page.goto('/');

  const card = page.locator(
    '[data-testid="hunt-place-card"][data-hunt-id="hunt:tibia:orc-fortress"]',
  );
  await expect(card).toHaveCount(1);
  await expect(card.locator('[data-testid="hunt-place-name"]')).toHaveText(
    'Orc Fortress',
  );
  await expect(card.locator('[data-testid="hunt-place-band"]')).toHaveText(
    'Band 2',
  );
  await expect(
    card.locator('[data-testid="hunt-place-creature-name"]'),
  ).toHaveText(['Orc', 'Orc Shaman', 'Orc Spearman']);

  await selectHunt(page, 'hunt:tibia:orc-fortress');
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

  const state = await readHuntState(page);
  expect(state.player?.position).toEqual({ x: 2, y: 14, z: 6 });
  expect(state.actors.some((actor) => actor.blueprintId === 'orc')).toBe(true);
  expect(
    state.actors.some((actor) => actor.blueprintId === 'orc-spearman'),
  ).toBe(true);
  expect(state.actors.some((actor) => actor.blueprintId === 'orc-shaman')).toBe(
    true,
  );
});
