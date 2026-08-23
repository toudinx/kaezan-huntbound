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

/** A box of world pixels the camera is allowed to show, edges included. */
export interface CameraBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function clampAxis(input: {
  readonly centre: number;
  readonly visible: number;
  readonly minimum: number;
  readonly maximum: number;
}): number {
  const span = input.maximum - input.minimum;

  // A box narrower than the view cannot fill it however it is placed, so the
  // leftover is split evenly instead of piled against one side, and the void
  // treatment covers both halves rather than a single fat band.
  if (span <= input.visible) {
    return (input.minimum + input.maximum) / 2;
  }

  const half = input.visible / 2;
  return Math.min(
    Math.max(input.centre, input.minimum + half),
    input.maximum - half,
  );
}

/**
 * Holds the view inside the ground box.
 *
 * `centeredCameraScroll` puts the player under the camera centre wherever he
 * is, which walks the view off the map at the edge and fills half the screen
 * with cells that never existed. Clamping the *centre* rather than the scroll
 * is what keeps the player on screen: the centre moves by at most half a view
 * away from him, so he can never leave the frame — including at the corners,
 * where both axes clamp at once. A clamp that could hide him would be a worse
 * bug than the void it hides.
 */
export function clampCameraScroll(input: {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly zoom: number;
  readonly bounds: CameraBounds;
}): { readonly scrollX: number; readonly scrollY: number } {
  assertPositiveFinite('viewportWidth', input.viewportWidth);
  assertPositiveFinite('viewportHeight', input.viewportHeight);
  assertPositiveFinite('zoom', input.zoom);

  const centreX = clampAxis({
    centre: input.scrollX + input.viewportWidth / 2,
    visible: input.viewportWidth / input.zoom,
    minimum: input.bounds.minX,
    maximum: input.bounds.maxX,
  });
  const centreY = clampAxis({
    centre: input.scrollY + input.viewportHeight / 2,
    visible: input.viewportHeight / input.zoom,
    minimum: input.bounds.minY,
    maximum: input.bounds.maxY,
  });

  return {
    scrollX: centreX - input.viewportWidth / 2,
    scrollY: centreY - input.viewportHeight / 2,
  };
}
