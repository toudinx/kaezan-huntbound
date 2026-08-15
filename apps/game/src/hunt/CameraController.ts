import { centeredCameraScroll } from './CameraFraming';

export interface CameraTarget {
  readonly x: number;
  readonly y: number;
}

export interface CameraController {
  follow(target: CameraTarget): void;
  readonly scrollX: number;
  readonly scrollY: number;
}

export interface CameraControllerOptions {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly zoom: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function createCameraController(
  options: CameraControllerOptions,
): CameraController {
  let scrollX = 0;
  let scrollY = 0;

  const follow = (target: CameraTarget): void => {
    const centered = centeredCameraScroll({
      targetX: target.x,
      targetY: target.y,
      viewportWidth: options.viewportWidth,
      viewportHeight: options.viewportHeight,
      zoom: options.zoom,
    });
    scrollX = centered.scrollX;
    scrollY = centered.scrollY;
  };

  return {
    follow,
    get scrollX() {
      return scrollX;
    },
    get scrollY() {
      return scrollY;
    },
  };
}

export function interpolate(from: number, to: number, alpha: number): number {
  const normalizedAlpha = Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 0;
  return from + (to - from) * normalizedAlpha;
}
