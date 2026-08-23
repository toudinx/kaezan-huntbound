import { describe, expect, it } from 'vitest';

import { createCameraController, interpolate } from './CameraController';

describe('CameraController', () => {
  it('keeps the target centered at the viewport center', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      zoom: 1,
    });

    camera.follow({ x: 160, y: 120 });

    expect([camera.scrollX, camera.scrollY]).toEqual([0, 0]);
  });

  it('does not clamp when the caller declares no ground bounds', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      zoom: 1,
    });

    camera.follow({ x: 300, y: 220 });
    expect([camera.scrollX, camera.scrollY]).toEqual([140, 100]);

    camera.follow({ x: 40, y: 20 });
    expect([camera.scrollX, camera.scrollY]).toEqual([-120, -100]);
  });

  it('keeps the centered scroll independent of zoom', () => {
    const scrolls = [1, 2, 3.4].map((zoom) => {
      const camera = createCameraController({
        viewportWidth: 320,
        viewportHeight: 240,
        zoom,
      });
      camera.follow({ x: 999, y: 999 });
      return [camera.scrollX, camera.scrollY];
    });

    for (const scroll of scrolls) {
      expect(scroll).toEqual([839, 879]);
    }
  });

  it('stops the view at the edge of the ground it was given', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      zoom: 1,
      bounds: { minX: 64, minY: 64, maxX: 768, maxY: 736 },
    });

    camera.follow({ x: 80, y: 80 });

    expect([camera.scrollX, camera.scrollY]).toEqual([64, 64]);
  });

  it('keeps a bounded follow that is already inside the ground untouched', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      zoom: 1,
      bounds: { minX: 64, minY: 64, maxX: 768, maxY: 736 },
    });

    camera.follow({ x: 400, y: 400 });

    expect([camera.scrollX, camera.scrollY]).toEqual([240, 280]);
  });

  it('clamps interpolation alpha and remains monotonic between endpoints', () => {
    expect(interpolate(10, 30, 0)).toBe(10);
    expect(interpolate(10, 30, 1)).toBe(30);
    expect(interpolate(10, 30, 0.5)).toBe(20);
    expect(interpolate(10, 30, -1)).toBe(10);
    expect(interpolate(10, 30, 2)).toBe(30);
    expect(interpolate(30, 10, 0.25)).toBe(25);
  });
});
