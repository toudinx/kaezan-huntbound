import { TARGET_VISIBLE_ROWS } from '../hunt/CameraFraming';

/**
 * How many device pixels the renderer spends per world pixel at the cap.
 *
 * The camera zoom is `viewportHeight / (TARGET_VISIBLE_ROWS * tileSize)`, so a
 * cap that is an exact multiple of that denominator lands the zoom on a whole
 * number. That matters once `pixelArt` selects nearest-neighbour filtering: a
 * fractional zoom maps some source pixels to three device pixels and others to
 * four, which reads as uneven tiles.
 */
export const RENDER_ZOOM_STEPS = 2;

export interface RenderSize {
  readonly width: number;
  readonly height: number;
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive finite`);
  }
}

/**
 * The tallest backing store the renderer will allocate, in device pixels.
 */
export function renderHeightCap(tileSize: number): number {
  assertPositiveFinite('tileSize', tileSize);

  return TARGET_VISIBLE_ROWS * tileSize * RENDER_ZOOM_STEPS;
}

/**
 * Chooses the backing store for a window.
 *
 * The scene only ever frames `TARGET_VISIBLE_ROWS` rows, so tracking the window
 * one device pixel per CSS pixel bought no extra view — it only stretched each
 * tile further. On a maximised 2560x1305 window that meant filling 3.34 Mpx of
 * layered tiles every frame on an integrated GPU. Capping the height keeps the
 * same framing and lets the compositor stretch the finished frame in one blit.
 *
 * The cap is a ceiling, never a floor: a window already shorter than the cap
 * keeps its own size. A fixed base resolution would instead *grow* the backing
 * store on a phone, which is the opposite of the point.
 */
export function cappedRenderSize(input: {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
}): RenderSize {
  assertPositiveFinite('width', input.width);
  assertPositiveFinite('height', input.height);

  const cap = renderHeightCap(input.tileSize);

  if (input.height <= cap) {
    return { width: Math.round(input.width), height: Math.round(input.height) };
  }

  return {
    width: Math.max(1, Math.round(input.width * (cap / input.height))),
    height: cap,
  };
}
