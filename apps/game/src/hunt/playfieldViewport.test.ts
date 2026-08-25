import { describe, expect, it } from 'vitest';

import {
  MIN_PLAYFIELD_HEIGHT,
  MIN_PLAYFIELD_WIDTH,
  playfieldCameraOffset,
  playfieldCentreOffset,
  playfieldInsets,
  playfieldRect,
} from './playfieldViewport';

/** The four viewports ADR-001 makes mandatory. */
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const;

describe('playfieldViewport', () => {
  it.each(viewports)(
    'leaves $name a free rect inside the cockpit chrome',
    (viewport) => {
      const insets = playfieldInsets(viewport);
      const rect = playfieldRect(viewport);

      expect(insets.top).toBeGreaterThan(0);
      expect(insets.bottom).toBeGreaterThan(0);
      expect(insets.left).toBeGreaterThan(0);
      expect(insets.right).toBeGreaterThan(0);

      expect(rect).toEqual({
        x: insets.left,
        y: insets.top,
        width: viewport.width - insets.left - insets.right,
        height: viewport.height - insets.top - insets.bottom,
      });
    },
  );

  it.each(viewports)('respects the declared minimum on $name', (viewport) => {
    const rect = playfieldRect(viewport);

    expect(rect.width).toBeGreaterThanOrEqual(MIN_PLAYFIELD_WIDTH);
    expect(rect.height).toBeGreaterThanOrEqual(MIN_PLAYFIELD_HEIGHT);
  });

  it('reserves a wider right band than left, for the rail, once there is room', () => {
    const insets = playfieldInsets({ width: 1366, height: 768 });

    expect(insets.right).toBeGreaterThan(insets.left);
  });

  it('gives the deck a taller band than the telemetry row', () => {
    for (const viewport of viewports) {
      const insets = playfieldInsets(viewport);

      expect(insets.bottom).toBeGreaterThan(insets.top);
    }
  });

  it('shrinks the chrome rather than the minimum when the viewport is small', () => {
    const cramped = { width: 320, height: 420 };
    const rect = playfieldRect(cramped);

    expect(rect.width).toBeGreaterThanOrEqual(MIN_PLAYFIELD_WIDTH);
    expect(rect.height).toBeGreaterThanOrEqual(MIN_PLAYFIELD_HEIGHT);
    expect(rect.x).toBeGreaterThan(0);
    expect(rect.y).toBeGreaterThan(0);
  });

  it('surrenders the chrome entirely rather than reporting a negative rect', () => {
    const rect = playfieldRect({ width: 200, height: 200 });

    expect(rect).toEqual({ x: 0, y: 0, width: 200, height: 200 });
  });

  it('reports the free centre as an offset from the viewport centre', () => {
    const viewport = { width: 1366, height: 768 };
    const rect = playfieldRect(viewport);
    const offset = playfieldCentreOffset(viewport);

    expect(offset.x).toBeCloseTo(
      rect.x + rect.width / 2 - viewport.width / 2,
      6,
    );
    expect(offset.y).toBeCloseTo(
      rect.y + rect.height / 2 - viewport.height / 2,
      6,
    );
    // The rail is on the right and the deck at the bottom, so the free area
    // sits left of and above the canvas centre.
    expect(offset.x).toBeLessThan(0);
    expect(offset.y).toBeLessThan(0);
  });

  it('converts the centre offset into world pixels the camera can subtract', () => {
    const viewport = { width: 1366, height: 768 };
    const offset = playfieldCentreOffset(viewport);
    const camera = playfieldCameraOffset({
      viewport,
      render: { width: 1366, height: 768 },
      zoom: 2,
    });

    expect(camera.x).toBeCloseTo(offset.x / 2, 6);
    expect(camera.y).toBeCloseTo(offset.y / 2, 6);
  });

  it('scales the camera offset by the capped render resolution', () => {
    // The renderer caps its backing store, so `scale.width` is not the CSS box.
    // An offset measured in CSS pixels and spent in render pixels would put the
    // player off the free centre by exactly the cap ratio.
    const viewport = { width: 2732, height: 1536 };
    const camera = playfieldCameraOffset({
      viewport,
      render: { width: 1366, height: 768 },
      zoom: 2,
    });
    const unscaled = playfieldCameraOffset({
      viewport,
      render: viewport,
      zoom: 2,
    });

    expect(camera.x).toBeCloseTo(unscaled.x / 2, 6);
    expect(camera.y).toBeCloseTo(unscaled.y / 2, 6);
  });

  it('rejects a non-positive viewport', () => {
    expect(() => playfieldRect({ width: 0, height: 768 })).toThrow(
      /viewportWidth/,
    );
    expect(() => playfieldRect({ width: 1366, height: -1 })).toThrow(
      /viewportHeight/,
    );
    expect(() =>
      playfieldCameraOffset({
        viewport: { width: 1366, height: 768 },
        render: { width: 1366, height: 768 },
        zoom: 0,
      }),
    ).toThrow(/zoom/);
  });
});
