import { describe, expect, it } from 'vitest';

import {
  calculateCameraFraming,
  centeredCameraScroll,
  MAX_VISIBLE_ROWS,
  MIN_VISIBLE_ROWS,
  TARGET_VISIBLE_ROWS,
} from './CameraFraming';

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
});
