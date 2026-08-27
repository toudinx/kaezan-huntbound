import { expect, test } from '@playwright/test';

import { readHuntState, selectHunt } from './support/huntDriver';

const heroHuntId = 'hunt:tibia:hero-cave';

test('enters Hero Cave with the Hero roster and faixa 5 character sheet', async ({
  page,
}) => {
  await page.goto('/');

  const heroCard = page.locator(
    `[data-testid="hunt-place-card"][data-hunt-id="${heroHuntId}"]`,
  );
  await expect(heroCard).toHaveCount(1);
  await expect(heroCard.locator('[data-testid="hunt-place-name"]')).toHaveText(
    'Hero Cave',
  );
  await expect(heroCard.locator('[data-testid="hunt-place-band"]')).toHaveText(
    'Band 5',
  );
  await expect(heroCard.locator('[data-testid="hunt-place-level"]')).toHaveText(
    'Level 130',
  );
  await expect(
    heroCard.locator('[data-testid="hunt-place-creature-name"]'),
  ).toHaveText('Hero');
  await expect(
    heroCard.locator('[data-testid="hunt-place-creature-health"]'),
  ).toHaveText('1,400 HP');

  await selectHunt(page, heroHuntId);
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="combat-player-health"]'),
  ).toHaveAttribute('aria-valuemax', '2015');

  await page.waitForFunction(
    () => {
      const probe = (
        globalThis as typeof globalThis & {
          __huntboundHuntProbe?: {
            state(): {
              player: unknown;
              actors: readonly { blueprintId: string }[];
            };
          };
        }
      ).__huntboundHuntProbe;
      const state = probe?.state();
      return (
        state?.player !== null &&
        state?.player !== undefined &&
        state.actors.some((actor) => actor.blueprintId === 'hero')
      );
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );

  const state = await readHuntState(page);
  expect(state.player?.position.z).toBe(9);
  expect(state.actors.some((actor) => actor.blueprintId === 'hero')).toBe(true);
});
