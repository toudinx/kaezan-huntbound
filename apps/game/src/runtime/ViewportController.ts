import type { SceneBridge } from '../bridge/SceneBridge';
import type { DisposableController } from './RuntimeLifecycle';
import type { ShellSnapshot } from './ShellSnapshot';

export interface ViewportContainer {
  getBoundingClientRect(): { width: number; height: number };
}

export interface ViewportResizeObserver {
  observe(target: ViewportContainer): void;
  disconnect(): void;
}

export interface ViewportControllerBrowser {
  getDevicePixelRatio(): number;
  createResizeObserver(callback: () => void): ViewportResizeObserver;
  observeDevicePixelRatio(callback: () => void): () => void;
}

type Viewport = ShellSnapshot['viewport'];

function normalizeDimension(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeDevicePixelRatio(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function sameViewport(left: Viewport, right: Viewport): boolean {
  return (
    left.width === right.width &&
    left.height === right.height &&
    left.devicePixelRatio === right.devicePixelRatio
  );
}

export function createViewportController(
  container: ViewportContainer,
  bridge: SceneBridge,
  browser: ViewportControllerBrowser,
): DisposableController {
  let disposed = false;
  let started = false;
  let lastMeasurement: Viewport | undefined;
  let observer: ViewportResizeObserver | undefined;
  let stopObservingDevicePixelRatio: (() => void) | undefined;

  const publishMeasurement = () => {
    const rect = container.getBoundingClientRect();
    const viewport: Viewport = {
      width: normalizeDimension(rect.width),
      height: normalizeDimension(rect.height),
      devicePixelRatio: normalizeDevicePixelRatio(
        browser.getDevicePixelRatio(),
      ),
    };
    const current = bridge.getSnapshot();

    if (
      lastMeasurement &&
      sameViewport(lastMeasurement, viewport) &&
      sameViewport(current.viewport, viewport)
    ) {
      return;
    }

    lastMeasurement = viewport;
    bridge.publish({ ...current, viewport });
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    observer?.disconnect();
    stopObservingDevicePixelRatio?.();
  };

  return {
    start: () => {
      if (started || disposed) {
        return dispose;
      }

      started = true;
      observer = browser.createResizeObserver(publishMeasurement);
      stopObservingDevicePixelRatio =
        browser.observeDevicePixelRatio(publishMeasurement);
      publishMeasurement();
      observer.observe(container);

      return dispose;
    },
  };
}
