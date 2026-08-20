import { describe, expect, it } from 'vitest';

import {
  calculateCameraFraming,
  TARGET_VISIBLE_ROWS,
} from '../hunt/CameraFraming';
import {
  cappedRenderSize,
  RENDER_ZOOM_STEPS,
  renderHeightCap,
} from './RenderResolution';

const TILE_SIZE = 32;

describe('renderHeightCap', () => {
  it('lands on an exact integer camera zoom', () => {
    const cap = renderHeightCap(TILE_SIZE);
    const framing = calculateCameraFraming({
      viewportHeight: cap,
      tileSize: TILE_SIZE,
    });

    expect(framing.zoom).toBe(RENDER_ZOOM_STEPS);
    expect(Number.isInteger(framing.zoom)).toBe(true);
  });

  it('still frames the target row count', () => {
    const framing = calculateCameraFraming({
      viewportHeight: renderHeightCap(TILE_SIZE),
      tileSize: TILE_SIZE,
    });

    expect(framing.visibleRows).toBe(TARGET_VISIBLE_ROWS);
  });

  it('rejects a tile size that is not positive finite', () => {
    expect(() => renderHeightCap(0)).toThrow(/tileSize/);
    expect(() => renderHeightCap(Number.NaN)).toThrow(/tileSize/);
  });
});

describe('cappedRenderSize', () => {
  it('leaves a window shorter than the cap untouched', () => {
    const size = cappedRenderSize({
      width: 360,
      height: 640,
      tileSize: TILE_SIZE,
    });

    expect(size).toEqual({ width: 360, height: 640 });
  });

  it('caps a maximised desktop window and keeps its aspect', () => {
    const size = cappedRenderSize({
      width: 2560,
      height: 1305,
      tileSize: TILE_SIZE,
    });

    expect(size.height).toBe(renderHeightCap(TILE_SIZE));
    expect(size.width / size.height).toBeCloseTo(2560 / 1305, 2);
  });

  it('cuts the desktop pixel count by more than three times', () => {
    const uncapped = 2560 * 1305;
    const size = cappedRenderSize({
      width: 2560,
      height: 1305,
      tileSize: TILE_SIZE,
    });

    expect(size.width * size.height).toBeLessThan(1_050_000);
    expect(uncapped / (size.width * size.height)).toBeGreaterThan(3);
  });

  it('never grows a phone viewport, unlike a fixed base resolution', () => {
    const phone = { width: 390, height: 844 };
    const size = cappedRenderSize({ ...phone, tileSize: TILE_SIZE });

    expect(size.width * size.height).toBeLessThanOrEqual(
      phone.width * phone.height,
    );
  });

  it('keeps the visible column count it had before the cap', () => {
    const window = { width: 2560, height: 1305 };
    const size = cappedRenderSize({ ...window, tileSize: TILE_SIZE });
    const columnsBefore =
      window.width /
      (TILE_SIZE *
        calculateCameraFraming({
          viewportHeight: window.height,
          tileSize: TILE_SIZE,
        }).zoom);
    const columnsAfter =
      size.width /
      (TILE_SIZE *
        calculateCameraFraming({
          viewportHeight: size.height,
          tileSize: TILE_SIZE,
        }).zoom);

    expect(columnsAfter).toBeCloseTo(columnsBefore, 1);
  });

  it('rejects a viewport that is not positive finite', () => {
    expect(() =>
      cappedRenderSize({ width: 0, height: 720, tileSize: TILE_SIZE }),
    ).toThrow(/width/);
    expect(() =>
      cappedRenderSize({ width: 1280, height: -1, tileSize: TILE_SIZE }),
    ).toThrow(/height/);
  });
});
