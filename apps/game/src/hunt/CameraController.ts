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
  readonly deadzoneWidth: number;
  readonly deadzoneHeight: number;
  readonly worldWidth?: number;
  readonly worldHeight?: number;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function edge(
  size: number,
  innerSize: number,
): { left: number; right: number } {
  const safeSize = nonNegative(size);
  const safeInnerSize = Math.min(nonNegative(innerSize), safeSize);
  const left = (safeSize - safeInnerSize) / 2;
  return { left, right: left + safeInnerSize };
}

function maxScroll(
  worldSize: number | undefined,
  viewportSize: number,
): number {
  if (worldSize === undefined || !Number.isFinite(worldSize)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(nonNegative(worldSize) - nonNegative(viewportSize), 0);
}

export function createCameraController(
  options: CameraControllerOptions,
): CameraController {
  const horizontalDeadzone = edge(options.viewportWidth, options.deadzoneWidth);
  const verticalDeadzone = edge(options.viewportHeight, options.deadzoneHeight);
  const maximumScrollX = maxScroll(options.worldWidth, options.viewportWidth);
  const maximumScrollY = maxScroll(options.worldHeight, options.viewportHeight);
  let scrollX = 0;
  let scrollY = 0;

  const follow = (target: CameraTarget): void => {
    const targetScreenX = target.x - scrollX;
    const targetScreenY = target.y - scrollY;
    const nextScrollX =
      targetScreenX < horizontalDeadzone.left
        ? target.x - horizontalDeadzone.left
        : targetScreenX > horizontalDeadzone.right
          ? target.x - horizontalDeadzone.right
          : scrollX;
    const nextScrollY =
      targetScreenY < verticalDeadzone.left
        ? target.y - verticalDeadzone.left
        : targetScreenY > verticalDeadzone.right
          ? target.y - verticalDeadzone.right
          : scrollY;

    scrollX = clamp(nextScrollX, 0, maximumScrollX);
    scrollY = clamp(nextScrollY, 0, maximumScrollY);
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
