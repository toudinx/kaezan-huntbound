export interface ViewportBox {
  readonly width: number;
  readonly height: number;
}

/**
 * The CSS box the canvas occupies on the page.
 *
 * This is what `shell-viewport` reports and what `tests/e2e/shell.spec.ts`
 * asserts, so it has to stay the page-facing number. It used to be readable as
 * `scale.width`, because `RESIZE` kept the backing store and the CSS box equal.
 * Once the render resolution gained a cap the two diverged, and neither
 * `scale.width` nor `scale.displaySize` is the CSS box any more: `resize()`
 * sets `displaySize` from the requested game size. The element's own rect
 * cannot drift from what the page shows.
 */
export function canvasViewportBox(
  canvas: HTMLCanvasElement,
  fallback: ViewportBox,
): ViewportBox {
  const rect = canvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return fallback;
  }

  return { width: Math.round(rect.width), height: Math.round(rect.height) };
}
