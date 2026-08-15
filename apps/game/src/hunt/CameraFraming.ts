export const TARGET_VISIBLE_ROWS = 11;
export const MIN_VISIBLE_ROWS = 10;
export const MAX_VISIBLE_ROWS = 12;

export interface CameraFraming {
  readonly zoom: number;
  readonly visibleRows: number;
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive finite`);
  }
}

export function calculateCameraFraming(input: {
  readonly viewportHeight: number;
  readonly tileSize: number;
}): CameraFraming {
  assertPositiveFinite('viewportHeight', input.viewportHeight);
  assertPositiveFinite('tileSize', input.tileSize);

  const zoom = input.viewportHeight / (TARGET_VISIBLE_ROWS * input.tileSize);
  return {
    zoom,
    visibleRows: input.viewportHeight / (input.tileSize * zoom),
  };
}

export function centeredCameraScroll(input: {
  readonly targetX: number;
  readonly targetY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly zoom: number;
}): { readonly scrollX: number; readonly scrollY: number } {
  for (const [name, value] of [
    ['targetX', input.targetX],
    ['targetY', input.targetY],
    ['viewportWidth', input.viewportWidth],
    ['viewportHeight', input.viewportHeight],
    ['zoom', input.zoom],
  ] as const) {
    if (name === 'targetX' || name === 'targetY') {
      if (!Number.isFinite(value)) {
        throw new Error(`${name} must be finite`);
      }
    } else {
      assertPositiveFinite(name, value);
    }
  }

  /**
   * Phaser applies `zoom` around the camera midpoint, so `scroll` stays in
   * unzoomed viewport units and the point held under the centre is always
   * `scroll + viewport / 2`. Dividing the half-viewport by the zoom would
   * offset the camera by `viewport/2 - viewport/(2*zoom)` and push the region
   * off screen at every zoom above 1. The zoom is still validated here because
   * the framing contract only holds for a positive finite zoom.
   */
  return {
    scrollX: input.targetX - input.viewportWidth / 2,
    scrollY: input.targetY - input.viewportHeight / 2,
  };
}
