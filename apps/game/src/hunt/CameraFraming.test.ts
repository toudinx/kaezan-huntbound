import { describe, expect, it } from 'vitest';

import {
  calculateCameraFraming,
  centeredCameraScroll,
  clampCameraScroll,
  MAX_VISIBLE_ROWS,
  MIN_VISIBLE_ROWS,
  TARGET_VISIBLE_ROWS,
} from './CameraFraming';

/** What the camera actually shows, in world units, at this scroll and zoom. */
function visibleRect(input: {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly zoom: number;
}) {
  const halfWidth = input.viewportWidth / (2 * input.zoom);
  const halfHeight = input.viewportHeight / (2 * input.zoom);
  const centreX = input.scrollX + input.viewportWidth / 2;
  const centreY = input.scrollY + input.viewportHeight / 2;

  return {
    left: centreX - halfWidth,
    right: centreX + halfWidth,
    top: centreY - halfHeight,
    bottom: centreY + halfHeight,
  };
}

describe('CameraFraming', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    it(`frames ${viewport.width}x${viewport.height} at 10-12 rows`, () => {
      const framing = calculateCameraFraming({
        viewportHeight: viewport.height,
        tileSize: 32,
      });

      expect(framing.visibleRows).toBeGreaterThanOrEqual(MIN_VISIBLE_ROWS);
      expect(framing.visibleRows).toBeLessThanOrEqual(MAX_VISIBLE_ROWS);
      expect(framing.visibleRows).toBeCloseTo(TARGET_VISIBLE_ROWS);
      expect(framing.zoom).toBeGreaterThan(0);
    });
  }

  it('centers a world target without map-bound clamping', () => {
    expect(
      centeredCameraScroll({
        targetX: 400,
        targetY: 300,
        viewportWidth: 800,
        viewportHeight: 600,
        zoom: 2,
      }),
    ).toEqual({ scrollX: 0, scrollY: 0 });
  });

  /**
   * Phaser applies zoom around the camera midpoint, so `scroll` stays in
   * unzoomed viewport units: the point kept under the centre is always
   * `scroll + viewport / 2`, whatever the zoom is. Dividing the half-viewport
   * by the zoom offsets the camera by `viewport/2 - viewport/(2*zoom)` and
   * pushes the whole region out of view at any zoom above 1.
   */
  for (const zoom of [1, 2.1818181818181817, 3.4]) {
    it(`keeps the target under the camera centre at zoom ${zoom}`, () => {
      const viewportWidth = 1366;
      const viewportHeight = 768;
      const scroll = centeredCameraScroll({
        targetX: 688,
        targetY: 256,
        viewportWidth,
        viewportHeight,
        zoom,
      });

      expect(scroll.scrollX + viewportWidth / 2).toBeCloseTo(688);
      expect(scroll.scrollY + viewportHeight / 2).toBeCloseTo(256);
    });
  }

  it('rejects invalid dimensions', () => {
    expect(() =>
      calculateCameraFraming({ viewportHeight: 0, tileSize: 32 }),
    ).toThrow(/positive finite/);
    expect(() =>
      calculateCameraFraming({ viewportHeight: 800, tileSize: Number.NaN }),
    ).toThrow(/positive finite/);
  });
  describe('clampCameraScroll', () => {
    // The extracted hunt: a 24x24 region whose ground only spans x 2..23 and
    // y 2..22, so the box is 704x672 world pixels inside a 768x768 rectangle.
    const bounds = { minX: 64, minY: 64, maxX: 768, maxY: 736 } as const;

    it('leaves a scroll that already shows only ground untouched', () => {
      const viewportWidth = 1366;
      const viewportHeight = 768;
      const zoom = 768 / (11 * 32);
      const scroll = centeredCameraScroll({
        targetX: 400,
        targetY: 400,
        viewportWidth,
        viewportHeight,
        zoom,
      });

      expect(
        clampCameraScroll({
          ...scroll,
          viewportWidth,
          viewportHeight,
          zoom,
          bounds,
        }),
      ).toEqual(scroll);
    });

    it('stops the view at the edge of the ground instead of past it', () => {
      const viewportWidth = 1366;
      const viewportHeight = 768;
      const zoom = 768 / (11 * 32);
      const clamped = clampCameraScroll({
        ...centeredCameraScroll({
          targetX: 80,
          targetY: 80,
          viewportWidth,
          viewportHeight,
          zoom,
        }),
        viewportWidth,
        viewportHeight,
        zoom,
        bounds,
      });
      const rect = visibleRect({
        ...clamped,
        viewportWidth,
        viewportHeight,
        zoom,
      });

      expect(rect.left).toBeCloseTo(bounds.minX);
      expect(rect.top).toBeCloseTo(bounds.minY);
      expect(rect.right).toBeLessThanOrEqual(bounds.maxX + 1e-6);
      expect(rect.bottom).toBeLessThanOrEqual(bounds.maxY + 1e-6);
    });

    /**
     * A region narrower than the view cannot fill it, so the leftover has to be
     * shared instead of dumped on one side: the box sits in the middle and the
     * treatment covers the rest.
     */
    it('centres a ground box smaller than the view', () => {
      const viewportWidth = 1366;
      const viewportHeight = 768;
      const zoom = 1;
      const small = { minX: 100, minY: 200, maxX: 300, maxY: 400 } as const;
      const clamped = clampCameraScroll({
        ...centeredCameraScroll({
          targetX: 110,
          targetY: 210,
          viewportWidth,
          viewportHeight,
          zoom,
        }),
        viewportWidth,
        viewportHeight,
        zoom,
        bounds: small,
      });
      const rect = visibleRect({
        ...clamped,
        viewportWidth,
        viewportHeight,
        zoom,
      });

      expect((rect.left + rect.right) / 2).toBeCloseTo(200);
      expect((rect.top + rect.bottom) / 2).toBeCloseTo(300);
    });

    /**
     * The clamp exists to hide the void, but a clamp that hides the player is
     * worse than the void: he would walk off screen and the hunt would become
     * unplayable at the edge. Sweeping every cell of the real ground box proves
     * it for the four corners as well as the middle, which is where a clamp
     * written against one axis at a time breaks.
     */
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      it(`keeps the player framed at every ground cell on ${viewport.width}x${viewport.height}`, () => {
        const tileSize = 32;
        const zoom = calculateCameraFraming({
          viewportHeight: viewport.height,
          tileSize,
        }).zoom;
        let checked = 0;

        for (let cellY = 2; cellY <= 22; cellY += 1) {
          for (let cellX = 2; cellX <= 23; cellX += 1) {
            const targetX = (cellX + 0.5) * tileSize;
            const targetY = (cellY + 0.5) * tileSize;
            const clamped = clampCameraScroll({
              ...centeredCameraScroll({
                targetX,
                targetY,
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                zoom,
              }),
              viewportWidth: viewport.width,
              viewportHeight: viewport.height,
              zoom,
              bounds,
            });
            const rect = visibleRect({
              ...clamped,
              viewportWidth: viewport.width,
              viewportHeight: viewport.height,
              zoom,
            });

            expect(targetX).toBeGreaterThanOrEqual(rect.left);
            expect(targetX).toBeLessThanOrEqual(rect.right);
            expect(targetY).toBeGreaterThanOrEqual(rect.top);
            expect(targetY).toBeLessThanOrEqual(rect.bottom);
            checked += 1;
          }
        }

        expect(checked).toBe(22 * 21);
      });
    }

    it('rejects invalid dimensions', () => {
      expect(() =>
        clampCameraScroll({
          scrollX: 0,
          scrollY: 0,
          viewportWidth: 1366,
          viewportHeight: 768,
          zoom: 0,
          bounds,
        }),
      ).toThrow(/positive finite/);
    });
  });
});
