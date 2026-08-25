import { describe, expect, it } from 'vitest';

import { canvasViewportBox } from './ViewportBox';

const fallback = { width: 1366, height: 768 } as const;

function canvasWithRect(width: number, height: number): HTMLCanvasElement {
  return {
    getBoundingClientRect: () => ({ width, height }),
  } as unknown as HTMLCanvasElement;
}

describe('canvasViewportBox', () => {
  it('reports the rounded CSS box the canvas occupies', () => {
    expect(canvasViewportBox(canvasWithRect(1252.4, 703.6), fallback)).toEqual({
      width: 1252,
      height: 704,
    });
  });

  it('falls back when the canvas has no usable box yet', () => {
    expect(canvasViewportBox(canvasWithRect(0, 0), fallback)).toEqual(fallback);
  });

  // `game.canvas` is undefined until the renderer attaches one, and the headless
  // renderer never does. A scene publishing `ready` in that window has no
  // page-facing box to read, which is the case the fallback already exists for.
  it('falls back when there is no canvas at all', () => {
    expect(
      canvasViewportBox(undefined as unknown as HTMLCanvasElement, fallback),
    ).toEqual(fallback);
    expect(
      canvasViewportBox(null as unknown as HTMLCanvasElement, fallback),
    ).toEqual(fallback);
  });
});
