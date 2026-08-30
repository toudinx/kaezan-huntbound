import { expect, test } from '@playwright/test';

import { readHuntState, selectHunt } from './support/huntDriver';

const dragonHuntId = 'hunt:tibia:dragon-lair';

test('enters Dragon Lair with the Dragon roster and faixa 4 character sheet', async ({
  page,
}) => {
  await page.goto('/');

  const dragonCard = page.locator(
    `[data-testid="hunt-place-card"][data-hunt-id="${dragonHuntId}"]`,
  );
  await expect(dragonCard).toHaveCount(1);
  await expect(
    dragonCard.locator('[data-testid="hunt-place-name"]'),
  ).toHaveText('Dragon Lair');
  await expect(
    dragonCard.locator('[data-testid="hunt-place-band"]'),
  ).toHaveText('Band 4');
  await expect(
    dragonCard.locator('[data-testid="hunt-place-level"]'),
  ).toHaveText('Level 70');
  await expect(
    dragonCard.locator('[data-testid="hunt-place-creature-name"]'),
  ).toHaveText('Dragon');
  await expect(
    dragonCard.locator('[data-testid="hunt-place-creature-health"]'),
  ).toHaveText('1,000 HP');

  await selectHunt(page, dragonHuntId);
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="combat-player-health"]'),
  ).toHaveAttribute('aria-valuemax', '1115');

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
        state.actors.some((actor) => actor.blueprintId === 'dragon')
      );
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );

  const state = await readHuntState(page);
  expect(state.player?.position).toEqual({ x: 1, y: 6, z: 5 });
  expect(state.actors.some((actor) => actor.blueprintId === 'dragon')).toBe(
    true,
  );
});
