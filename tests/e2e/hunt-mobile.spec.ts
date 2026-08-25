import { expect, test } from '@playwright/test';

import {
  movedEvents,
  requireCell,
  requireFirst,
  requirePlayer,
  stepKeys,
  stepWithDpad,
  stepWithKeyboard,
  waitForHunt,
} from './support/huntDriver';

const mobile = { width: 390, height: 844 };

/**
 * The play area the cockpit may never shrink past, on the tightest viewport
 * ADR-001 makes mandatory. `apps/game/src/hunt/playfieldViewport.ts` declares
 * the same two numbers and is the only place the frame reads them from.
 */
const MIN_FREE_WIDTH = 260;
const MIN_FREE_HEIGHT = 320;

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface OverlayBox extends Rect {
  readonly label: string;
}

function intersects(left: Rect, right: Rect): boolean {
  return (
    left.x < right.x + right.width &&
    right.x < left.x + left.width &&
    left.y < right.y + right.height &&
    right.y < left.y + left.height
  );
}

test.describe('the first hunt is playable by touch on a phone viewport', () => {
  test.use({ viewport: mobile, hasTouch: true });

  test('mounts an accessible d-pad', async ({ page }) => {
    await waitForHunt(page);

    const dpad = page.locator('[data-testid="hunt-dpad"]');

    await expect(dpad).toBeVisible();
    await expect(dpad).toHaveAttribute('aria-label', 'Movement controls');
    await expect(dpad.locator('button[data-hunt-direction]')).toHaveCount(8);

    for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
      const control = dpad.locator(`[data-hunt-direction="${direction}"]`);

      await expect(control).toBeVisible();
      await expect(control).toHaveAttribute('aria-label', /^Move /);
    }
  });

  test('takes the same step from the d-pad as from the keyboard', async ({
    page,
  }) => {
    await waitForHunt(page);

    // The cell south of `playerStart` is also the only free cell the first
    // spawn group can fall back to, so a step there can be refused on the first
    // frames. Retrying keeps the comparison about the two input devices.
    const stepSouth = async (
      take: () => Promise<Awaited<ReturnType<typeof stepWithKeyboard>>>,
    ) => {
      let outcome = await take();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (movedEvents(outcome).length > 0) break;
        outcome = await take();
      }

      const moves = movedEvents(outcome);

      expect(moves).toHaveLength(1);

      const move = requireFirst(moves, 'accepted step');
      const from = requireCell(move, 'from');
      const to = requireCell(move, 'to');

      return { dx: to.x - from.x, dy: to.y - from.y, dz: to.z - from.z };
    };

    const byKeyboard = await stepSouth(() =>
      stepWithKeyboard(page, stepKeys.s),
    );
    await stepWithKeyboard(page, stepKeys.n);
    const byDpad = await stepSouth(() => stepWithDpad(page, 's'));

    expect(byKeyboard).toEqual({ dx: 0, dy: 1, dz: 0 });
    expect(byDpad).toEqual(byKeyboard);
  });
  /**
   * ADR-001: "Centro e lower-middle do playfield permanecem livres."
   *
   * This test used to read "playfield" as the whole canvas and check that two
   * ninths of it stayed clear, with a 13 px budget for the d-pad and the
   * viewport panel grazing the bottom-middle third. Under that reading no
   * frame is possible at all, and what the shell had instead was five boxes
   * pinned to five corners -- which is what the playtest refused.
   *
   * The user reinterpreted it on 2026-08-25: the playfield is the *visible*
   * play area, and the frame is what says where it ends. So the contract is
   * stronger now, not looser. It is no longer two ninths but the whole free
   * rectangle; no longer a 13 px allowance but none at all; and the free
   * rectangle has to clear a declared minimum, so the frame cannot buy itself
   * room by shrinking the game.
   */
  test('keeps the whole play area clear of the cockpit frame', async ({
    page,
  }) => {
    await waitForHunt(page);

    const canvas = await page.locator('#game-root canvas').boundingBox();
    const free = await page
      .locator('[data-testid="cockpit-playfield"]')
      .boundingBox();

    expect(canvas).not.toBeNull();
    expect(free).not.toBeNull();
    if (canvas === null || free === null) return;

    // Declared here rather than imported, so the frame cannot widen a band and
    // move the goalposts in the same commit. `playfieldViewport.ts` holds the
    // same two numbers and this is what holds it to them.
    expect(free.width).toBeGreaterThanOrEqual(MIN_FREE_WIDTH);
    expect(free.height).toBeGreaterThanOrEqual(MIN_FREE_HEIGHT);
    expect(free.x).toBeGreaterThanOrEqual(canvas.x);
    expect(free.y).toBeGreaterThanOrEqual(canvas.y);
    expect(free.x + free.width).toBeLessThanOrEqual(canvas.x + canvas.width);
    expect(free.y + free.height).toBeLessThanOrEqual(canvas.y + canvas.height);

    // Only chrome that actually paints or captures pointers can obstruct the
    // playfield; the transparent, pointer-events:none layout containers cannot.
    const overlays: OverlayBox[] = await page.evaluate(() => {
      const boxes: OverlayBox[] = [];
      const root = document.querySelector('#ui-root');

      if (root === null) return boxes;

      for (const element of root.querySelectorAll('*')) {
        const rect = element.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) continue;

        const style = getComputedStyle(element);

        if (style.visibility === 'hidden' || style.display === 'none') continue;

        const paints =
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          style.backgroundColor !== 'transparent';
        const captures = style.pointerEvents !== 'none';

        if (!paints && !captures) continue;

        boxes.push({
          label: `${element.tagName.toLowerCase()}${
            element.getAttribute('data-testid')
              ? `[${element.getAttribute('data-testid')}]`
              : ''
          }.${element.className || 'unnamed'}`,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }

      return boxes;
    });

    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays.filter((box) => intersects(box, free))).toEqual([]);
  });

  test('centres the player in the play area while the hunt moves', async ({
    page,
  }) => {
    let state = await waitForHunt(page);
    const samples = [state];
    const directions = ['s', 'w', 'e', 's', 'w', 'e'] as const;

    for (const direction of directions) {
      const outcome = await stepWithKeyboard(page, stepKeys[direction]);
      state = outcome.after;
      if (movedEvents(outcome).length > 0) samples.push(state);
      if (samples.length >= 4) break;
    }

    expect(
      samples.length,
      'the camera test needs accepted player moves',
    ).toBeGreaterThanOrEqual(2);

    const canvas = await page.locator('#game-root canvas').boundingBox();
    const free = await page
      .locator('[data-testid="cockpit-playfield"]')
      .boundingBox();
    expect(canvas).not.toBeNull();
    expect(free).not.toBeNull();
    if (canvas === null || free === null) return;

    const freeCentreX = free.x + free.width / 2;
    const freeCentreY = free.y + free.height / 2;

    // The deck band is always taller than the telemetry band, so the free area
    // never shares the canvas centre vertically. Asserting that first is what
    // makes the rest a real check: without it, "the player is near the middle
    // of the free area" would still pass on a camera that never moved.
    expect(
      Math.abs(freeCentreY - (canvas.y + canvas.height / 2)),
      'the free area has to sit off the canvas centre for this to prove anything',
    ).toBeGreaterThan(1);

    for (const sample of samples) {
      const player = requirePlayer(sample);
      expect(player.sprite).not.toBeNull();
      if (player.sprite === null) continue;

      expect(sample.camera.visibleRows).toBeGreaterThanOrEqual(10);
      expect(sample.camera.visibleRows).toBeLessThanOrEqual(12);
      expect(sample.camera.zoom).toBeGreaterThan(1);

      // Phaser zooms around the camera midpoint, so `scroll` is in unzoomed
      // renderer units and the world point under the centre is
      // `scroll + viewport / 2`. The renderer's backing store is capped, so
      // those units are not the CSS box the frame is measured in either --
      // hence the second conversion. Skipping it hides a camera that is off by
      // exactly the cap ratio.
      const worldCentreX = sample.camera.scrollX + sample.camera.width / 2;
      const worldCentreY = sample.camera.scrollY + sample.camera.height / 2;
      const cssPerRender = {
        x: canvas.width / sample.camera.width,
        y: canvas.height / sample.camera.height,
      };
      const screenX =
        canvas.x +
        (sample.camera.width / 2 +
          (player.sprite.x - worldCentreX) * sample.camera.zoom) *
          cssPerRender.x;
      const screenY =
        canvas.y +
        (sample.camera.height / 2 +
          (player.sprite.y - worldCentreY) * sample.camera.zoom) *
          cssPerRender.y;
      const screenTile = canvas.height / sample.camera.visibleRows;

      expect(Math.abs(screenX - freeCentreX)).toBeLessThanOrEqual(screenTile);
      expect(Math.abs(screenY - freeCentreY)).toBeLessThanOrEqual(screenTile);
    }
  });
});
