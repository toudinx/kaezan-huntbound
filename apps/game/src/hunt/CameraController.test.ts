import { describe, expect, it } from 'vitest';

import { createCameraController, interpolate } from './CameraController';

describe('CameraController', () => {
  it('does not scroll while the target remains inside the deadzone', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      deadzoneWidth: 160,
      deadzoneHeight: 120,
      worldWidth: 960,
      worldHeight: 720,
    });

    camera.follow({ x: 160, y: 120 });

    expect([camera.scrollX, camera.scrollY]).toEqual([0, 0]);
  });

  it('moves to the deadzone edge without overshoot in every direction', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      deadzoneWidth: 160,
      deadzoneHeight: 120,
      worldWidth: 960,
      worldHeight: 720,
    });

    camera.follow({ x: 300, y: 220 });
    expect([camera.scrollX, camera.scrollY]).toEqual([60, 40]);

    camera.follow({ x: 40, y: 20 });
    expect([camera.scrollX, camera.scrollY]).toEqual([0, 0]);

    camera.follow({ x: 700, y: 500 });
    expect([camera.scrollX, camera.scrollY]).toEqual([460, 320]);
  });

  it('clamps scroll at the far world edge', () => {
    const camera = createCameraController({
      viewportWidth: 320,
      viewportHeight: 240,
      deadzoneWidth: 160,
      deadzoneHeight: 120,
      worldWidth: 640,
      worldHeight: 480,
    });

    camera.follow({ x: 999, y: 999 });

    expect([camera.scrollX, camera.scrollY]).toEqual([320, 240]);
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
